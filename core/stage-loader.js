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
var stream = require('./stream');
var trace = require('./trace');

var stages = require('./stages');
var types = require('./types');

var register = require('./phase-register');
register.load(require('./phase-lib'));
register.load(require('./experiment'));
register.load(require('../lib/device-phases'));

var byName = [register.phases, stages];

function _stageSpecificationToStage(stage, options) {
  options = options || {};
  for (var i = 0; i < byName.length; i++) {
    if (stage in byName[i])
      return byName[i][stage](options);
  }

  assert(false, "No stage found for specification " + stage);
}

// TODO once everything is a phase, this can be removed.
function stageSpecificationToStage(stage) {
  if (typeof stage == 'string')
    stage = _stageSpecificationToStage(stage);
  else
    stage = _stageSpecificationToStage(stage.name, stage.options);
  return stage;
}

function processStages(stages, cb, fail) {
  // TODO: Put this back when I work out what it means for stages.
  // assert.equal(stages[0].input, 'unit');
  processStagesWithInput(null, stages, cb, fail);
}

function typeCheck(stages) {
  var coersion = {};
  for (var i = 0; i < stages.length - 1; i++) {
    var inputCoersion = coersion;
    //console.log('checking ' + stages[i].name + ' ' + JSON.stringify(stages[i].output) + ' : ' + stages[i + 1].name + ' ' + JSON.stringify(stages[i + 1].input));
    //console.log(' --> ' + JSON.stringify(coersion));
    coersion = types.coerce(stages[i].output, stages[i + 1].input, coersion);
    assert.isDefined(coersion, "Type checking failed for\n  " + stages[i].name + ': ' + JSON.stringify(stages[i].output) + 
      "\n  ->\n  " + stages[i + 1].name + ': ' + JSON.stringify(stages[i + 1].input) + "\n    " + JSON.stringify(inputCoersion));
  }
}

/*
 * Constructing a pipeline
 *
 * Sorry for potato quality.
 */

var done = 'done';
var yieldData = 'yield';


function processStagesWithInput(input, stages, cb, fail) {
  typeCheck(stages);
  stages = stages.concat().reverse();
  var stageStack = [stages];
  var process = trace.wrap({cat: 'core', name: 'process'}, function(streamCommand) {
    if (streamCommand.command == yieldData)
      stageStack.push(stages.slice());

    do {
      stages = stageStack.pop();
    } while (stages.length == 0 && stageStack.length > 0);
    if (stages.length == 0 && stageStack.length == 0) {
      cb(streamCommand.stream);
      return;
    }
    var stage = stages.pop();
    stageStack.push(stages);
    var result = stage.impl(streamCommand.stream);
    // TODO: Cleanup and propagate promises once all phases return them.
    result.then(process, fail);
  });
  process({command: done, stream: input});
};

module.exports.typeCheck = typeCheck;
module.exports.processStages = processStages;
module.exports.processStagesWithInput = processStagesWithInput;
module.exports.stageSpecificationToStage = stageSpecificationToStage;
