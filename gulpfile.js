var gulp = require('gulp');
var parseArgs = require('minimist');
var fs = require('fs');
var mocha = require('gulp-mocha');
var http = require('http');

var device = require('./gulp-device');
var experiment = require('./gulp-experiment');
var stageLoader = require('./gulp-stage-loader');

var fancyStages = require('./gulp-fancy-stages');

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

function buildTask(name, stageList) {
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
buildTask('get', ['save:' + options.url, 'output:result.json']);
buildTask('perf', ['perf:' + options.url, 'output:trace.json']);
buildTask('endToEnd', ['save:' + options.url, 'HTMLWriter', 'simplePerfer', 'output:trace.json']);

/*
 * running an experiment
 */
buildTask('runExperiment', ['file:' + options.file, 'parseExperiment', 'experimentPhase']);

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
