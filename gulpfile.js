/*
 *
 *  Copyright 2015 Google Inc. All rights reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License
 *
 */

var gulp = require('gulp');
var fs = require('fs');
var coveralls = require('gulp-coveralls');
var istanbul = require('gulp-istanbul');
var mocha = require('gulp-mocha');

var stageLoader = require('./core/stage-loader');
var stream = require('./core/stream');
var options = require('./core/options');
var trace = require('./core/trace');

var tasks = {};

function runTests(mochaReporter) {
  return gulp.src(['tests/*.js', 'tests/pipeline/*.js', 'lib/*/tests/*.js'])
      .pipe(mocha({
        ui: 'bdd',
        ignoreLeaks: true,
        reporter: mochaReporter,
      }));
}

function buildTestTask(name, mochaReporter, istanbulReporters) {
  gulp.task(name, function(cb) {
    if (!options.coverage && typeof options.coverage !== 'undefined') {
      runTests(mochaReporter).on('end', cb);
      return;
    }
    gulp.src(['core/*.js', 'lib/*.js', 'lib/chromium-phases/*.js', 'lib/write-cpp-phase/*.js'])
    .pipe(istanbul())
    .pipe(istanbul.hookRequire())
    .on('finish', function() {
      require('./core/trace').enable();
      runTests(mochaReporter)
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
          })
          .on('finish', function() {
            process.stdout.write('Uploaded LCOV data to Coveralls.\n');
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
    stageLoader.startPipeline(stageList, cb, function(e) { throw e; });
  });
};

/*
 * Some example pipelines.
 */
buildTask('html', [{name: 'input', options: {data: 'tasks.erlnmyr'}}, 'fileToString', 'doExperiment']);
buildTask('js', [{name: 'input', options: {data: options.file}}, 'fileToJSON', 'JSWriter', {name: 'writeStringFile', options: {filename: 'result.js.html'}}]);
buildTask('stats', [{name: 'input', options: {data: options.file}}, 'fileToJSON', 'StatsWriter', 'log']);

/*
 * examples using filters
 */
buildTask('compactComputedStyle', [{name: 'input', options: {data: options.file}}, 'fileToJSON', 'StyleFilter', 'jsonStringify', {name: 'writeStringFile', options: {filename: options.file + '.filter'}}]);
buildTask('extractStyle', [{name: 'input', options: {data: options.file}}, 'fileToJSON', 'StyleMinimizationFilter', 'jsonStringify', {name: 'writeStringFile', options: {filename: options.file + '.filter'}}]);
buildTask('tokenStyles', [{name: 'input', options: {data: options.file}}, 'fileToJSON', 'StyleTokenizerFilter', 'jsonStringify', {name: 'writeStringFile', options: {filename: options.file + '.filter'}}]);
buildTask('nukeIFrame', [{name: 'input', options: {data: options.file}}, 'fileToJSON', 'NukeIFrameFilter', 'jsonStringify', {name: 'writeStringFile', options: {filename: options.file + '.filter'}}]);

/*
 * example of fabrication
 */
buildTask('generate', [{name: 'input', options: {data: options.file}}, 'fileToBuffer', 'bufferToString', 'jsonParse', 'SchemaBasedFabricator', 'jsonStringify', {name: 'writeStringFile', options: {filename: options.file + '.gen'}}]);

/*
 * examples using device telemetry
 */
buildTask('get', [{name: 'input', options: {data: options.url}}, {name: 'fetch', options: {browser: options.saveBrowser}}, 'jsonStringify', {name: 'writeStringFile', options: {filename: 'result.json'}}]);
buildTask('perf', [{name: 'input', options: {data: options.url}}, 'trace', 'jsonStringify', {name: 'writeStringFile', options: {filename: 'trace.json'}}]);
buildTask('endToEnd', [{name: 'input', options: {data: options.url}}, {name: 'fetch', options: {browser: options.saveBrowser}}, 'HTMLWriter', 
                       {name: 'trace', options: {browser: options.perfBrowser}}, 'jsonStringify', {name: 'writeStringFile', options: {filename: 'trace.json'}}]);

/*
 * running an experiment
 */
buildTask('runExperiment', [{name: 'input', options: {data: options.file}}, 'fileToString', 'doExperiment']);

/*
 * ejs fabrication
 */
buildTask('ejs', [{name: 'input', options: {data: options.file}}, 'fileToString', 'ejsFabricator',
                  {name: 'writeStringFile', options: {tag: 'ejsFabricator'}}]);

buildTask('mhtml', [{name: 'input', options: {data: '.'}}, 'readDir',
          {name: 'filter', options: {regExp: new RegExp(options.inputSpec)}}, 'fileToJSON', 'HTMLWriter',
          {name: 'regexReplace',
            options: {tag: 'filename', inputSpec: new RegExp(options.inputSpec), outputSpec: options.outputSpec}},
          {name: 'writeStringFile', options: {tag: 'filename'}}]);

buildTask('processLogs', [{name: 'input', options: {data: options.dir}}, 'readDir', 'fork', 'fileToJSON', 'traceFilter',
          'tracePIDSplitter', 'traceTree', {name: 'tracePrettyPrint', options: {showTrace: 'false'}},
          {name: 'log', options: {tags: ['filename']}}]);

module.exports.tasks = tasks;
