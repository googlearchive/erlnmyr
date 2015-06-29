var gulp = require('gulp');
var parseArgs = require('minimist');
var fs = require('fs');
var mocha = require('gulp-mocha');

// TODO: device and experiment are only loaded so that they can be initialized with options.
// There must be a nicer way to set options across a project.
var device = require('./core/device');
var experiment = require('./core/experiment');
var stageLoader = require('./core/stage-loader');

var fancyStages = require('./core/fancy-stages');
var streams = require('./core/streams');

var options = parseArgs(process.argv.slice(2));
device.init(options);
experiment.init(options);

var tasks = {};

gulp.task('test', function() {
  return gulp.src(['tests/*.js', 'tests/pipeline/*.js'], {read: false})
      .pipe(mocha({
        ui: 'bdd',
        ignoreLeaks: true,
        reporter: 'nyan'
    }));
});

function buildTask(name, stageList) {
  tasks[name] = stageList;
  gulp.task(name, function(incb) {
    var cb = function(data) { incb(); };
    stageList = stageList.map(stageLoader.stageSpecificationToStage);
    stageLoader.processStages(stageList, cb, function(e) { throw e; });
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
buildTask('get', ['immediate:' + options.url, 'telemetrySave', 'output:result.json']);
buildTask('perf', ['immediate:' + options.url, 'telemetryPerf', 'output:trace.json']);
buildTask('endToEnd', ['immediate:' + options.url, 'telemetrySave', 'HTMLWriter', 'simplePerfer', 'output:trace.json']);

/*
 * running an experiment
 */
buildTask('runExperiment', ['file:' + options.file, 'parseExperiment', 'experimentPhase']);

/*
 * ejs fabrication
 */
gulp.task('ejs', function(incb) {
  var cb = function(data) { incb(); };
  stageLoader.processStages(
    [
      stageLoader.stageSpecificationToStage('file:' + options.file),
      stageLoader.stageSpecificationToStage('ejs:' + options.outputPrefix),
      fancyStages.mapToTuples(),
      fancyStages.map(stageLoader.stageSpecificationToStage('toFile'))
    ], cb, function(e) { throw e; });
});

/*
 * TODO: Refactor stage-loader so it can load fancy stages too.
 *
 * example of using stages directly
 */
gulp.task('mhtml', function(incb) {
  var cb = function(data) { incb(); };
  stageLoader.processStages(
    [
      fancyStages.fileInputs(options.inputSpec),
      fancyStages.map(fancyStages.tee()),
      fancyStages.map(fancyStages.left(stageLoader.stageSpecificationToStage('fileToJSON'))),
      fancyStages.map(fancyStages.left(stageLoader.stageSpecificationToStage('HTMLWriter'))),
      fancyStages.map(fancyStages.right(fancyStages.outputName(options.inputSpec, options.outputSpec))),
      fancyStages.map(stageLoader.stageSpecificationToStage('toFile'))
    ], cb, function(e) { throw e; });
});



gulp.task('mhtml2', function(incb) {
  var cb = function(data) { incb(); };
  var a = new streams.StreamedStage(fancyStages.fileInputs(options.inputSpec));
  var b = new streams.StreamTagger(function(data, tags) { return {key: 'filename', value: data} }, 'from', streams.stageSpec(a));
  var c = new streams.StreamedStage(stageLoader.stageSpecificationToStage('fileToJSON'), streams.stageSpec(b));
  var d = new streams.StreamedStage(stageLoader.stageSpecificationToStage('HTMLWriter'), streams.stageSpec(c));
  var e = new streams.StreamTagger(function(data, tags) {
    var re = new RegExp(options.inputSpec);
    var filename = tags['filename'].replace(re, options.outputSpec);
    return {key: 'filename', value: filename}
  }, 'from', streams.stageSpec(d)),
  var f = 
  stageLoader.processStages(
      [
        streams.clone(

module.exports.tasks = tasks;
