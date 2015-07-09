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

function processStagesWithInput(input, stages, cb, fail) {
  typeCheck(stages);

  var queue = new TaskQueue();
  stages = stages.concat().reverse();
  queue.put({phases: stages, stream: input});
  var executingTasks = 0;
  var maxTasks = 32;

  function executeDependency(dep, task) {
    dep().then(function() {
      executingTasks--;
      task.executingDependencies--;
      process();
    }, fail);
  }

  function executePhase(phase, task) {
    phase.impl(task.stream).then(function(op) {
      executingTasks--;
      if (op.command == par) {
        console.error('incoming: ', op.dependencies.length);
        queue.put({
          phases: task.phases,
          stream: task.stream,
          dependencies: op.dependencies,
          executingDependencies: 0,
        });
        process();
        return;
      }
      if (op.command == yieldData)
        queue.put({phases: task.phases.concat([phase]), stream: task.stream});

      task.stream = op.stream;
      queue.put(task);

      process();
    }, fail);
  }

  var x = 0;
  var process = trace.wrap({cat: 'core', name: 'process'}, function() {
    console.error('process called');
    var deferred = [];
    while (!queue.empty() && executingTasks < maxTasks) {
      var task = queue.take();
      console.error(task.phases.length, task.dependencies && task.dependencies.length, task.executingDependencies);
      if (task.dependencies && task.dependencies.length) {
        executingTasks++;
        task.executingDependencies++;
        executeDependency(task.dependencies.pop(), task);
        queue.put(task);
      } else if (!task.dependencies || task.dependencies && task.dependencies.length == 0 && task.executingDependencies == 0) {
        if (task.phases.length == 0)
          continue;
        var phase = task.phases.pop();
        executingTasks++;
        executePhase(phase, task);
      } else if (task.dependencies && task.executingDependencies > 0) {
        deferred.push(task);
      }
    }
    x = Math.max(x, executingTasks);
    deferred.forEach(queue.put.bind(queue));
    if (executingTasks == 0) {
      console.log('XXXXX', x);
      cb(input);
      return;
    }
  });
  process();
};

module.exports.typeCheck = typeCheck;
module.exports.processStages = processStages;
module.exports.processStagesWithInput = processStagesWithInput;
module.exports.stageSpecificationToStage = stageSpecificationToStage;
