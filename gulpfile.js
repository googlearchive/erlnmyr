/*
  Copyright 2015 Google Inc. All Rights Reserved.
  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at
      http://www.apache.org/licenses/LICENSE-2.0
  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
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

var experimentFilesForTesting = [];

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
          });
        }
        cb();
      });
    });
  });
}

buildTestTask('test', 'nyan', ['html', 'text-summary']);
buildTestTask('travis-test', 'spec', ['lcov', 'text', 'text-summary']);

function buildExperimentTask(name, experimentFile) {
  var stageList = [
    {name: 'input', options: {data: experimentFile}},
    'fileToBuffer',
    'bufferToString',
    'doExperiment',
  ];
  gulp.task(name, function(incb) {
    var cb = function(data) {
      trace.dump();
      incb();
    };
    stageLoader.processStages(stageList.map(stageLoader.stageSpecificationToStage), cb, function(e) { throw e; });
  });
}

fs.readdirSync('tasks').forEach(function(experimentFile) {
  var filePath = 'tasks/' + experimentFile;
  var taskName = /(.*)\.exp/.exec(experimentFile)[1];
  buildExperimentTask(taskName, filePath);
  experimentFilesForTesting.push(filePath);
});

buildExperimentTask('runExperiment', options.file);

module.exports.experimentFilesForTesting = experimentFilesForTesting;
