var ParseExperiment = require('./lib/parse-experiment');

// TODO: Avoid having to do all this twice - load all the basic
// stages in gulp-stages maybe?
var writers = {
  HTMLWriter: require('./lib/html-writer'),
  JSWriter: require('./lib/js-writer'),
  StatsWriter: require('./lib/stats-writer')
};

var filters = {
  StyleFilter: require('./lib/style-filter'),
  StyleMinimizationFilter: require('./lib/style-minimization-filter'),
  StyleTokenizerFilter: require('./lib/style-tokenizer-filter'),
  NukeIFrameFilter: require('./lib/nuke-iframe-filter'),
  StyleDetokenizerFilter: require('./lib/style-detokenizer-filter')
};

var fabricators = {
  SchemaBasedFabricator: require('./lib/schema-based-fabricator'),
};



var stages = require('./gulp-stages');
var fancyStages = require('./gulp-fancy-stages');

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
  if (stageName.substring(0, 7) == 'output:') {
    return fancyStages.stage([
      fancyStages.tee(),
      fancyStages.right(fancyStages.map(fancyStages.right(fancyStages.outputName(inputSpec, stageName.substring(7))))),
      fancyStages.right(fancyStages.map(toFile())),
      fancyStages.justLeft()
    ]);
  }
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
      var pl = [fancyStages.fileInputs(experiment.inputs[i]), fancyStages.map(fancyStages.tee()), fancyStages.map(fancyStages.left(stages.fileToJSON()))].concat(
          stagesList[j].stages.map(function(a) { return stageFor(a, experiment.inputs[i]); }));
      pl.push(fancyStages.map(fancyStages.right(fancyStages.outputName(experiment.inputs[i], stagesList[j].output))));
      pl.push(fancyStages.map(stages.toFile()));
      pipelines.push(pl);
    }
  }
  var cb = function() { incb(); }
  for (var i = 0; i < pipelines.length; i++) {
    var cb = (function(i, cb) {
      return function() {
        stages.processStages(pipelines[i], cb, function(e) {
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
