var gulp = require('gulp');
var fs = require('fs');
var mocha = require('gulp-mocha');

var stageLoader = require('./core/stage-loader');
var fancyStages = require('./core/fancy-stages');
var stream = require('./core/stream');
var options = require('./core/options');
var trace = require('./core/trace');

var tasks = {};

function buildTestTask(name, reporter) {
  gulp.task(name, function() {
    return gulp.src(['tests/*.js', 'tests/pipeline/*.js'], {read: false})
        .pipe(mocha({
          ui: 'bdd',
          ignoreLeaks: true,
          reporter: reporter
      }));
  });
}

buildTestTask('test', 'nyan');
buildTestTask('travis-test', 'spec');

function buildTask(name, stageList) {
  tasks[name] = stageList;
  gulp.task(name, function(incb) {
    var cb = function(data) {
      trace.dump();
      incb();
    };
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
      stageLoader.stageSpecificationToStage('ejsFabricator'),
      stageLoader.stageSpecificationToStage('writeStringFile', {tag: 'ejsFabricator'})
    ], cb, function(e) { throw e; });
});

/*
 * TODO: Refactor stage-loader so it can load fancy stages too.
 *
 * example of using stages directly
 */

function tagFilename() {
  return stream.tag(function(data, tags) { return {key: 'filename', value: data} });
}

function genFilename() {
  return stream.tag(function(data, tags) {
    var filename = tags['filename'].replace(new RegExp(options.inputSpec), options.outputSpec);
    return {key: 'filename', value: filename} });
}

gulp.task('mhtml', function(incb) {
  var cb = function(data) { incb(); };
  stageLoader.processStages(
      [
        stream.streamedStage(fancyStages.fileInputs(options.inputSpec)),
        tagFilename(),
        stageLoader.stageSpecificationToStage('fileToJSON'),
        stageLoader.stageSpecificationToStage('HTMLWriter'),
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
