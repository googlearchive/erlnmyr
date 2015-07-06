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
var stream = require('./core/stream');

var options = parseArgs(process.argv.slice(2));
device.init(options);

var tasks = {};

function buildTestTask(reporter) {
  return function() {
    return gulp.src(['tests/*.js', 'tests/pipeline/*.js'], {read: false})
        .pipe(mocha({
          ui: 'bdd',
          ignoreLeaks: true,
          reporter: reporter
      }));
  };
}

gulp.task('test', buildTestTask('nyan'));
gulp.task('travis-test', buildTestTask('spec'));

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
buildTask('runExperiment', ['file:' + options.file, 'doExperiment']);

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
      fancyStages.map(fancyStages.right(stageLoader.stageSpecificationToStage('fileToJSON'))),
      fancyStages.map(fancyStages.right(stageLoader.stageSpecificationToStage('HTMLWriter'))),
      fancyStages.map(fancyStages.left(fancyStages.outputName(options.inputSpec, options.outputSpec))),
      fancyStages.map(stageLoader.stageSpecificationToStage('toFile'))
    ], cb, function(e) { throw e; });
});

function tagFilename() {
  return stream.tag(function(data, tags) { return {key: 'filename', value: data} });
}

function genFilename() {
  return stream.tag(function(data, tags) {
    var filename = tags['filename'].replace(new RegExp(options.inputSpec), options.outputSpec);
    return {key: 'filename', value: filename} });
}


gulp.task('mhtml2', function(incb) {
  var cb = function(data) { incb(); };
  stageLoader.processStages(
      [
        stream.streamedStage(fancyStages.fileInputs(options.inputSpec)),
        tagFilename(),
        stream.streamedStage(stageLoader.stageSpecificationToStage('fileToJSON')),
        stream.streamedStage(stageLoader.stageSpecificationToStage('HTMLWriter')),
        genFilename(),
        stream.write()
      ], cb, function(e) { throw e; });
});

gulp.task('processLogs', function(incb) {
  var cb = function(data) { incb(); };
  stageLoader.processStages(
      [
        stream.streamedStage(fancyStages.fileInputs(options.inputSpec)),
        stream.streamedStage(stageLoader.stage(
            [
              stageLoader.stageSpecificationToStage('fileToJSON'),
              stageLoader.stageSpecificationToStage('traceFilter'),
              stageLoader.stageSpecificationToStage('tracePIDSplitter'),
              fancyStages.valueMap(stageLoader.stageSpecificationToStage('traceTree')),
              fancyStages.valueMap(stageLoader.stageSpecificationToStage('tracePrettyPrint')),
            ])),
        stream.streamedStage(fancyStages.valueMap(stageLoader.stageSpecificationToStage('consoleOutput')))
      ], cb, function(e) { throw e; });
});

module.exports.tasks = tasks;
