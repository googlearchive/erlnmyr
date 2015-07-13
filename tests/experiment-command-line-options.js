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
// TODO: Make command line options a parameter to running an experiment so we can test them in isolation.
var options = require('../core/options');

function runExperiment(experiment, cb) {
  var stageList = [{name: 'input', options: {data: experiment}}, 'doExperiment'].map(stageLoader.stageSpecificationToStage);
  stageLoader.processStages(stageList, cb, function(e) { throw e; });
};

describe('Experiment command line options', function() {
  it('should be able to target node IDs', function(done) {
    options.targetNodeID = {data: 'test input'};
    var experiment =
        'digraph experiment {' +
        '  compareString_withData [data="test input"];' +
        '  compareString_withoutData [data=""];' +
        '  input_targetNodeID -> compareString_withData;' +
        '  input_untargeted -> compareString_withoutData;' +
        '}';
    runExperiment(experiment, done);
  });
  it('should be able to target phases', function(done) {
    var oldInput = options.input;
    options.input = {data: 'test input'};
    var experiment =
        'digraph experiment {' +
        '  compareString [data="test input"];' +
        '  input_a -> compareString;' +
        '  input_b -> compareString;' +
        '}';
    runExperiment(experiment, function() {
      options.input = oldInput;
      done();
    });
  });
});

