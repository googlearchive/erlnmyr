var gulp = require('gulp');
var fs = require('fs');
var coveralls = require('gulp-coveralls');
var istanbul = require('gulp-istanbul');
var mocha = require('gulp-mocha');

var stageLoader = require('./core/stage-loader');
var fancyStages = require('./core/fancy-stages');
// TODO: Where is the correct place to trigger loading of core phases?
var phaseLib = require('./core/phase-lib');
var stream = require('./core/stream');
var options = require('./core/options');
var trace = require('./core/trace');

var tasks = {};

function buildTestTask(name, mochaReporter, istanbulReporters) {
  gulp.task(name, function(cb) {
    gulp.src(['core/*.js', 'lib/*.js'])
    .pipe(istanbul())
    .pipe(istanbul.hookRequire())
    .on('finish', function() {
      gulp.src(['tests/*.js', 'tests/pipeline/*.js'])
      .pipe(mocha({
        ui: 'bdd',
        ignoreLeaks: true,
        reporter: mochaReporter,
      }))
      .pipe(istanbul.writeReports({
        reporters: istanbulReporters,
      }))
      .on('end', function() {
        if (istanbulReporters.indexOf('html') !== -1) {
          process.stdout.write('Detailed coverage report at file://' + fs.realpathSync('coverage/index.html') + '\n');
        }
        if (istanbulReporters.indexOf('lcov') !== -1) {
          gulp.src('coverage/lcov.info')
          .pipe(coveralls())
          .on('error', function(err) {
            console.warn(err);
            console.warn('Failed to upload LCOV data to Coveralls.')
            console.warn('Has this repository been enabled for Coveralls tracking? https://coveralls.io/repos/new');
          });
        }
        cb();
      });
    });
  });
}

buildTestTask('test', 'nyan', ['html', 'text-summary']);
buildTestTask('travis-test', 'spec', ['lcov', 'text', 'text-summary']);

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
