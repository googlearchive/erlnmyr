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

var stageLoader = require('../core/stage-loader');
var captureController = require('../lib/test-phases').controller;
var assert = require('chai').assert;

// TODO: Make command line options a parameter to running an experiment so we can test them in isolation.
var options = require('../core/options');

function runExperiment(experiment, cb) {
  var stageList = [{name: 'input', options: {data: experiment}}, 'doExperiment'].map(stageLoader.stageSpecificationToStage);
  stageLoader.processStages(stageList).then(cb);
};

describe('Experiment command line options', function() {
  it('should be able to target node IDs', function(done) {
    options.targetNodeID = {data: 'test input'};
    var experiment =
        'digraph experiment {' +
        '  capture_withData;' +
        '  capture_withoutData;' +
        '  input_targetNodeID -> capture_withData;' +
        '  input_untargeted -> capture_withoutData;' +
        '}';
    runExperiment(experiment, function() {
      var events = captureController.getInvocations();
      assert(events.length == 2);
      assert(events[0].phase.id == 'withData');
      assert(events[0].input == 'test input');
      assert(events[1].phase.id == 'withoutData');
      assert(events[1].input == '');
      done();
    });
  });
  it('should be able to target phases', function(done) {
    var oldInput = options.input;
    options.input = {data: 'test input'};
    var experiment =
        'digraph experiment {' +
        '  input_a -> capture;' +
        '  input_b -> capture;' +
        '}';
    runExperiment(experiment, function() {
      options.input = oldInput;
      var events = captureController.getInvocations();
      assert(events.length == 2);
      assert(events[0].input == 'test input');
      assert(events[1].input == 'test input');
      assert(events[0].tags.eto !== events[1].tags.eto);
      done();
    });
  });
  it('should support node ID aliasing', function(done) {
    options.testNodeIDAlias = 'test input';
    var experiment =
        'digraph experiment {' +
        '  optionAliases="testNodeIDAlias=nodeID.data";' +
        '  input_nodeID -> capture;' +
        '}';
    runExperiment(experiment, function() {
      var events = captureController.getInvocations();
      assert(events.length == 1);
      assert(events[0].input == 'test input');
      done();
    });
  });
  it('should support phase aliasing', function(done) {
    options.testPhaseAlias = 'test input';
    var experiment =
        'digraph experiment {' +
        '  optionAliases="testPhaseAlias=input.data";' +
        '  input -> capture;' +
        '}';
    runExperiment(experiment, function() {
      var events = captureController.getInvocations();
      assert(events.length == 1);
      assert(events[0].input == 'test input');
      done();
    });
  });
  it('should support multiple aliases', function(done) {
    options.testAliasA = 'test input A';
    options.testAliasB = 'test input B';
    var experiment =
        'digraph experiment {' +
        '  optionAliases="testAliasA=nodeA.data, testAliasB=nodeB.data";' +
        '  input_nodeA -> capture_a;' +
        '  input_nodeB -> capture_b;' +
        '}';
    runExperiment(experiment, function() {
      var events = captureController.getInvocations();
      assert(events.length == 2);
      assert(events[0].input == 'test input A');
      assert(events[0].phase.id == 'a');
      assert(events[1].input == 'test input B');
      assert(events[1].phase.id == 'b');
      done();
    });
  });
});

