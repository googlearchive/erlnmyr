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
var types = require('./types');
var scheduler = require('./scheduler');

var Promise = require('bluebird');

var register;

function stageSpecificationToStage(stage) {
  var name = stage;
  var options = {};
  if (typeof name != 'string') {
    name = stage.name;
    options = stage.options;
  }
  if (!register) {
    // TODO: Fix the cyclic dependency to avoid this lazy loading.
    register = require('./register');
    register.load(require('./phase-lib'));
    register.load(require('./experiment'));
    register.load(require('../lib/device-phases'));
    register.load(require('../lib/browser-phases'));
    register.load(require('../lib/test-phases'));
    register.load(require('../lib/trace-phases'));
  }
  assert(register.phases[name] || register.aliases[name], "Can't find phase: " + name);
  if (register.phases[name])
    return register.phases[name](options || {});
  return register.aliases[name]();
}

function startPipeline(stageNames, cb, fail) {
  return processStages(loadPipeline(stageNames), cb, fail);
}

function loadPipeline(stageNames) {
  var stages = [];
  stageNames.forEach(function(name) {
    var stage = stageSpecificationToStage(name);
    if (stage instanceof Array)
      stages = stages.concat(stage);
    else
      stages.push(stage);
  });
  return stages;
}

function processStages(stages) {
  // TODO: Put this back when I work out what it means for stages.
  // assert.equal(stages[0].input, 'unit');
  return processStagesWithInput(null, stages);
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

var done = 'done';
var par = 'par';
var yieldData = 'yield';

function TaskQueue() {
  this.tasks = [];
  this.deferred = [];
}

TaskQueue.prototype.take = function() {
  return this.tasks.pop();
}

TaskQueue.prototype.put = function(task) {
  this.tasks.push(task);
}

TaskQueue.prototype.empty = function() {
  return this.tasks.length == 0;
}

// TODO: Fix this! It's not currently feeding the input in anywhere.
function processStagesWithInput(input, stages) {
  typeCheck(stages);
  return scheduler.runPhases(stages);
}

module.exports.typeCheck = typeCheck;
module.exports.processStages = processStages;
module.exports.startPipeline = startPipeline;
module.exports.loadPipeline = loadPipeline;
module.exports.processStagesWithInput = processStagesWithInput;
module.exports.stageSpecificationToStage = stageSpecificationToStage;
