var ParseExperiment = require('./lib/parse-experiment');

var stageLoader = require('./gulp-stage-loader');
var fancyStages = require('./gulp-fancy-stages');
var stages = require('./gulp-stages');
var device = require('./gulp-device');

// Returns a list of {stages: [pipeline-element], output: result}
function appendEdges(experiment, stages, edges) {
  var newList = [];
  for (var j = 0; j < edges.length; j++) {
    var newStages = stages.concat(edges[j].stages);
    if (edges[j].output in experiment.tree) {
      if (edges[j].output.substring(edges[j].output.length - 1) !== '*'){
        newStages.push('output:' + edges[j].output);
      }
      newList = newList.concat(appendEdges(experiment, newStages, experiment.tree[edges[j].output]));
    } else {
      newList.push({stages: newStages, output: edges[j].output});
    }
  }
  return newList;
}

function experimentTask(name, experiment) {
  gulp.task(name, function(cb) { runExperiment(experiment, cb); });
}

function stageFor(stageName, inputSpec, input) {
  // override output definition to deal with output name generation
  if (stageName.substring(0, 7) == 'output:') {
    return stageLoader.stage([
      fancyStages.tee(),
      fancyStages.right(fancyStages.map(fancyStages.right(fancyStages.outputName(inputSpec, stageName.substring(7))))),
      fancyStages.right(fancyStages.map(stages.toFile())),
      fancyStages.justLeft()
    ]);
  }

  if (stageName == 'ejs') {
    return stageLoader.stage([
      fancyStages.map(fancyStages.left(stageLoader.stageSpecificationToStage('ejs:'))), // [ {left: [{left: file, right: ejsPrefix}], right: input} ]
      fancyStages.unejs()
    ]);
  }

  return fancyStages.map(fancyStages.left(stageLoader.stageSpecificationToStage(stageName)));
/*
  if (stageName[0].toLowerCase() == stageName[0])
    return fancyStages.map(fancyStages.left(stages[stageName]()));
  if (stageName.indexOf('Fabricator') !== -1)
    return fancyStages.map(fancyStages.left(fabricators[stageName]));
  // FIXME: This relies on the fact that filters and writers are both the same thing
  // fancyStages.right now (i.e. filter and treeBuilderWriter are the same function).
  // This could well become a problem in the future.
  // Also, eval: ew. If there was a local var dict I could look up the constructor name directly.
  console.log(stageName, stageName in filters);
  if (stageName in filters)
    return fancyStages.map(fancyStages.left(stages.filter(filters[stageName])));
  if (stageName in writers)
    return fancyStages.map(fancyStages.left(stages.treeBuilderWriter(writers[stageName])));
*/
}

function updateOptions(optionsDict) {
  for (key in optionsDict) {
    if (key in options) {
      console.warn('Overriding option ' + key + ' from commandline value ' + options[key] + ' to ' + optionsDict[key]);
    }
    options[key] = optionsDict[key];
  }
  if (optionsDict.chromium)
    device.init(options);
}

var options = undefined;
function init(parsedOptions) {
  options = parsedOptions;
}

function runExperiment(experiment, incb) {
  updateOptions(experiment.flags);
  var pipelines = [];
  for (var i = 0; i < experiment.inputs.length; i++) {
    var edges = experiment.tree[experiment.inputs[i]];
    var stagesList = [];
    stagesList = appendEdges(experiment, stagesList, edges);

    for (var j = 0; j < stagesList.length; j++) {
      if (experiment.inputs[i].substring(0, 7) == 'http://') {
	var input = experiment.inputs[i];
	var inputStages = [fancyStages.immediate(input), fancyStages.tee(), fancyStages.left(device.telemetrySave(input)), fancyStages.listify()];
      } else if (experiment.inputs[i].substring(0, 8) == '!http://') {
	var input = experiment.inputs[i].slice(1);
	var inputStages = [fancyStages.immediate(input), fancyStages.tee(), fancyStages.left(device.telemetrySaveNoStyle(input)), fancyStages.listify()];
      }else {
	if (experiment.inputs[i][0] == '!') {
	  var fileToJSON = stageFor("fileToString");
	  var input = experiment.inputs[i].slice(1);
	} else {
	  var fileToJSON = stageFor("fileToJSON");
	  var input = experiment.inputs[i];
	}
	var inputStages = [fancyStages.fileInputs(input), fancyStages.map(fancyStages.tee()), fileToJSON];
      }
      var pl = inputStages.concat(
          stagesList[j].stages.map(function(a) { return stageFor(a, input); }));
      if (stagesList[j].output == 'console') {
	pl.push(fancyStages.map(stages.taggedConsoleOutput()));
      } else {
	pl.push(fancyStages.map(fancyStages.right(fancyStages.outputName(input, stagesList[j].output))));
	pl.push(fancyStages.map(stages.toFile()));
      }
      pipelines.push(pl);
    }
  }
  var cb = function() { incb(); }
  for (var i = 0; i < pipelines.length; i++) {
    var cb = (function(i, cb) {
      return function() {
        stageLoader.processStages(pipelines[i], cb, function(e) {
          console.log('failed pipeline', e, '\n', e.stack); cb(null);
        });
      }
    })(i, cb);
  }
  cb(null);
}

function experimentPhase() {
  return {
    impl: runExperiment,
    name: 'experimentPhase',
    input: 'experiment',
    output: 'unit'
  };
}

function parseExperiment() {
  return {
    impl: function(data, cb) { cb(new ParseExperiment().parse(data)); },
    name: 'parseExperiment',
    input: 'string',
    output: 'experiment'
  };
}

module.exports.init = init;
module.exports.experimentPhase = experimentPhase;
module.exports.parseExperiment = parseExperiment;
