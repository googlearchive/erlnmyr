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

var assert = require('chai').assert;
var stageLoader = require('../../core/stage-loader');
var types = require('../../core/types');
var experiment = require('../../core/experiment');
var stream = require('../../core/stream');
var Promise = require('bluebird');
var captureController = require('../../lib/test-phases').controller;
var fs = require('fs');

function testPipeline(stageList, incb) {
  stageLoader.startPipeline(stageList).then(incb);
};

function outputMatchesFile(filename, done) {
  return function() {
    var events = captureController.getInvocations();
    assert(events.length == 1);
    assert(events[0].input == fs.readFileSync(filename));
    done();
  };
}

describe('Pipeline', function() {
  before(function() {
    process.chdir('tests/pipeline');
  });
  beforeEach(function() {
    captureController.getInvocations();
  });
  after(function() {
    process.chdir('../..');
  });

  it('should generate html from json', function(done) {
    testPipeline([{name: 'input', options: {data: 'simple.json'}}, 'fileToJSON', 'HTMLWriter', 'capture'],
        outputMatchesFile('simple.html', function() {
      testPipeline([{name: 'input', options: {data: 'inline-style.json'}}, 'fileToJSON', 'HTMLWriter', 'capture'],
          outputMatchesFile('inline-style.html', done));
    }));
  });

  it('should load an experiment that generates html from json', function(done) {
    var experiment = 'digraph experiment {' +
      'imports="[\'test-phases\']";' +
      'input -> fileToJSON -> HTMLWriter -> capture;' +
      'input [data="simple.json"]' +
    '}';
    testPipeline([{name: 'input', options: {data: experiment}}, 'doExperiment'], outputMatchesFile('simple.html', done));
  });

  it('should be idempotent in when style is tokenized and detokenized', function(done) {
    testPipeline([{name: 'input', options: {data: 'simple.json'}}, 'fileToJSON',
        'StyleTokenizerFilter', 'StyleDetokenizerFilter', 'HTMLWriter', 'capture'],
        outputMatchesFile('simple.html', function() {
      testPipeline([{name: 'input', options: {data: 'inline-style.json'}}, 'fileToJSON',
          'StyleTokenizerFilter', 'StyleDetokenizerFilter', 'HTMLWriter', 'capture'],
          outputMatchesFile('inline-style.html', done));
    }));
  });

  it('should be able to run an external experiment', function(done) {
    testPipeline([{name: 'input', options: {data: 'simple.exp'}}, 'fileToString', 'doExperiment'],
      function() {
        var events = captureController.getInvocations();
        assert(events.length == 4);
        function findEventFor(filename) {
          for (var i = 0; i < events.length; i++)
            if (events[i].tags.filename == filename)
              return events[i];
        }
        assert.equal(findEventFor('simple.trace').input, fs.readFileSync('simple.dump'));
        assert.equal(findEventFor('simple-reduced.trace').input, fs.readFileSync('simple-reduced.dump'));
        assert.equal(findEventFor('simple-minimized.trace').input, fs.readFileSync('simple-minimized.dump'));
        assert.equal(findEventFor('simple-nostyle.trace').input, fs.readFileSync('simple-nostyle.dump'));
        done();
      });
  });
});

