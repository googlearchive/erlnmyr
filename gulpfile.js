var gulp = require('gulp');
var parseArgs = require('minimist');
var fs = require('fs');
var mocha = require('gulp-mocha');

var TreeBuilder = require('./lib/tree-builder');
var HTMLWriter = require('./lib/html-writer');
var JSWriter = require('./lib/js-writer');
var StatsWriter = require('./lib/stats-writer');
var StyleFilter = require('./lib/style-filter');
var StyleMinimizationFilter = require('./lib/style-minimization-filter');
var StyleTokenizerFilter = require('./lib/style-tokenizer-filter');
var SchemaBasedFabricator = require('./lib/schema-based-fabricator');
var NukeIFrameFilter = require('./lib/nuke-iframe-filter');

var options = parseArgs(process.argv.slice(2));

function writeFile(output, data, cb) {
  fs.writeFile(output, data, function(err) {
    if (err)
      throw err;
    console.log('written results into \"' + output + '\".');
    cb();
  });
}

function readFile(filename, cb) {
  fs.readFile(filename, 'utf8', function(err, data) {
    if (err)
      throw err;
    var data = JSON.parse(data);
    cb(data);
  });
}

/*
 * Pipeline Stages
 *
 * Each stage accepts a data object and a callback, and is responsible for
 * calling the callback with the result of processing the data.
 */

function fileReader(filename) {
  return function(_, cb) { readFile(filename, cb); };
}

function nullFilter() {
  return function(data, cb) { cb(data); }
}

function filter(FilterType) {
  return treeBuilderWriter(FilterType);
}

function fabricator(FabType) {
  return function(data, cb) {
    var fab = new FabType(data);
    cb(fab.fabricate());
  }
}

function treeBuilderWriter(WriterType) {
  return function(data, cb) {
    var writer = new WriterType();
    var builder = new TreeBuilder(writer);
    builder.build(data);
    builder.write(writer);
    cb(writer.getHTML());
  }
};

function fileOutput(filename) {
  return function(data, cb) { writeFile(filename, data, cb); };
}

function consoleOutput() {
  return function(data, cb) { console.log(data); cb(); };
}

gulp.task('test', function() {
  return gulp.src('tests/*.js', {read: false})
      .pipe(mocha({
        ui: 'bdd',
        ignoreLeaks: true,
        reporter: 'nyan'
    }));
});

/*
 * Constructing a pipeline
 *
 * Sorry for potato quality.
 */
function processStages(stages, cb) {
  for (var i = stages.length - 1; i >= 0; i--) {
    cb = (function(i, cb) { return function(data) { stages[i](data, cb); } })(i, cb);
  }
  cb(null);
};

function buildTask(name, stages) {
  gulp.task(name, function(cb) {
    processStages(stages, cb);
  });
};

/*
 * Some example pipelines.
 */
buildTask('html', [fileReader(options.file), treeBuilderWriter(HTMLWriter), fileOutput('result.html.html')]);
buildTask('js', [fileReader(options.file), treeBuilderWriter(JSWriter), fileOutput('result.js.html')]);
buildTask('stats', [fileReader(options.file), treeBuilderWriter(StatsWriter), consoleOutput()]);
buildTask('compactComputedStyle', [fileReader(options.file), filter(StyleFilter), fileOutput(options.file + '.filter')]);
buildTask('extractStyle', [fileReader(options.file), filter(StyleMinimizationFilter), fileOutput(options.file + '.filter')]);
buildTask('generate', [fileReader(options.file), fabricator(SchemaBasedFabricator), fileOutput(options.file + '.gen')]);
buildTask('tokenStyles', [fileReader(options.file), filter(StyleTokenizerFilter), fileOutput(options.file + '.filter')]);
buildTask('nukeIFrame', [fileReader(options.file), filter(NukeIFrameFilter), fileOutput(options.file + '.filter')]);

/*
 * experiments
 */

function collectInputs(inputSpec) {
  var files = fs.readdirSync('.');
  return files.filter(inputSpec.exec.bind(inputSpec));
}

function outputForInput(inputSpec, input, output) {
  var re = new RegExp(inputSpec);
  return input.replace(re, output);
}

function appendEdges(experiment, stages, edges) {
  var newList = [];
  for (var j = 0; j < edges.length; j++) {
    var newStages = stages.concat(edges[j].stages);
    if (edges[j].output in experiment.tree)
      newList = newList.concat(appendEdges(experiment, newStages, experiment.tree[edges[j].output]));
    else
      newList.push({stages: newStages, output: edges[j].output});
  }
  return newList;
}

function runExperiment(name, experiment) {
  gulp.task(name, function(cb) {
    var pipelines = [];
    for (var i = 0; i < experiment.inputs.length; i++) {
      var inputs = collectInputs(new RegExp(experiment.inputs[i]));
      var edges = experiment.tree[experiment.inputs[i]];
      var stagesList = [];
      stagesList = appendEdges(experiment, stagesList, edges);
      for (var j = 0; j < inputs.length; j++) {
        for (var k = 0; k < stagesList.length; k++) {
          var pl = [fileReader(inputs[j])].concat(stagesList[k].stages);
          pl.push(fileOutput(outputForInput(experiment.inputs[i], inputs[j], stagesList[k].output)));
          pipelines.push(pl);
        }
      }
    }
    console.log(pipelines);
  });
}

runExperiment('experiment', 
  { inputs: ["inbox-(.*).json", "inbox.nostyle-(.*).json"],
    tree: {
      "inbox-(.*).json": [ { stages: [treeBuilderWriter(HTMLWriter)], output: "inbox-$1-[nuked].html" } ],
      "inbox.nostyle-(.*).json": [ { stages: [treeBuilderWriter(HTMLWriter)], output: "inbox-$1-[nuked, nostyle].html" },
                                   { stages: [filter(StyleFilter)], output: "reduced" } ],
      "reduced": [ { stages: [filter(StyleMinimizationFilter), treeBuilderWriter(HTMLWriter)], 
                     output: "inbox-$1-[nuked, extracted].html" },
                   { stages: [treeBuilderWriter(HTMLWriter)], output: "inbox-$1-[nuked, compressed, nostyle].html" } ]
    }
  });
