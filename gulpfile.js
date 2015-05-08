var gulp = require('gulp');
var parseArgs = require('minimist');
var fs = require('fs');
// TODO: remove assert usage here.
var assert = require('chai').assert;
var mocha = require('gulp-mocha');
var http = require('http');

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
var types = require('./gulp-types');
var device = require('./gulp-device');
var experiment = require('./gulp-experiment');

var options = parseArgs(process.argv.slice(2));
device.init(options);
experiment.init(options);

gulp.task('test', function() {
  return gulp.src('tests/*.js', {read: false})
      .pipe(mocha({
        ui: 'bdd',
        ignoreLeaks: true,
        reporter: 'nyan'
    }));
});

// TODO: Try to unify this with the experiment stageFor function if possible.
// TODO: Deprecate tagged input/output (i.e. JSON:, output:, save:, perf:, etc.) by replacing with no-args filter stages.
function stageSpecificationToStage(stage) {
  if (stage.substring(0, 5) == 'JSON:')
    return stages.JSONReader(stage.substring(5));
  if (stage.substring(0, 5) == 'file:')
    return stages.fileReader(stage.substring(5));
  if (stage.substring(0, 7) == 'output:')
    return stages.fileOutput(stage.substring(7));
  if (stage.substring(0, 5) == 'save:')
    return device.telemetrySave(options.saveBrowser, stage.substring(5));
  if (stage.substring(0, 5) == 'perf:')
    return device.telemetryPerf(options.perfBrowser, stage.substring(5));

  if (stage in writers)
    return stages.treeBuilderWriter(writers[stage]);
  if (stage in filters)
    return stages.filter(filters[stage]);
  if (stage in fabricators)
    return stages.fabricator(fabricators[stage]);

  if (stage in device)
    return device[stage]();
  if (stage in experiment)
    return experiment[stage]();
  if (stage in stages)
    return stages[stage]();
}

function buildTask(name, stageList) {
  gulp.task(name, function(incb) {
    var cb = function(data) { incb(); };
    stageList = stageList.map(stageSpecificationToStage);
    stages.processStages(stageList, cb, function(e) { throw e; });
  });
};

/*
 * Some example pipelines.
 */
buildTask('html', ['JSON:' + options.file, 'HTMLWriter', 'output:result.html.html']);
buildTask('js', ['JSON:' + options.file, 'JSWriter', 'output:result.js.html']);
buildTask('stats', ['JSON:' + options.file, 'StatsWriter', 'consoleOutput']);

/*
 * examples using filters
 */
buildTask('compactComputedStyle', ['JSON:' + options.file, 'StyleFilter', 'output:' + options.file + '.filter']);
buildTask('extractStyle', ['JSON:' + options.file, 'StyleMinimizationFilter', 'output:' + options.file + '.filter']);
buildTask('tokenStyles', ['JSON:' + options.file, 'StyleTokenizerFilter', 'output:' + options.file + '.filter']);
buildTask('nukeIFrame', ['JSON:' + options.file, 'NukeIFrameFilter', 'output:' + options.file + '.filter']);

/*
 * example of fabrication
 */
buildTask('generate', ['JSON:' + options.file, 'SchemaBasedFabricator', 'output:' + options.file + '.gen']);

/*
 * examples using device telemetry
 */
buildTask('get', ['save:' + options.url, 'output:result.json']);
buildTask('perf', ['perf:' + options.url, 'output:trace.json']);
buildTask('endToEnd', ['save:' + options.url, 'HTMLWriter', 'simplePerfer', 'output:trace.json']);

/*
 * running an experiment
 */
buildTask('runExperiment', ['file:' + options.file, 'parseExperiment', 'experimentPhase']);

/*
// TODO: Refactor fancy-stages so this can work here too.
buildTask('mhtml', [fileInputs(options.inputSpec), map(tee()), map(left(fileToJSON())), map(left(treeBuilderWriter(HTMLWriter))), 
                    map(right(outputName(options.inputSpec, options.outputSpec))), map(toFile())]);
*/

