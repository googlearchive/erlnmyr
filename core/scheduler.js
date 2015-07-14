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

var Promise = require('bluebird');
var assert = require('chai').assert;

var taskQueue = [];
var maxWaiting = 32;
var waitCount = 0;

function startPhaseList(phases) {
  var initPhases = phases
      .map(function(phase, idx) { return {phase: phase, idx: idx} })
      .filter(function(phase) { return phase.phase.init !== undefined; });

  var finishedPromiseList = [];

  return Promise.all(initPhases.map(function(phase) {
    return phase.phase.init(function(stream) {
      console.log('schedule!');
      var promise = new Promise(function(resolve, reject) {
        schedule(phases, phase.idx + 1, stream, resolve);
      });
      finishedPromiseList.push(promise);
    });
  })).then(function() { console.log(finishedPromiseList.length); return Promise.all(finishedPromiseList).then(function() {console.log("FINISHED"); })});

}

function schedule(phases, index, stream, resolve) {
  taskQueue.push({phases: phases, index: index, stream: stream, dependencies: [], executingDependencies: 0, resolve: resolve});
  startTasks();
}

function startTasks() {
  console.log('-> startTasks', waitCount, taskQueue.length);
  var deferred = [];
  while (taskQueue.length && waitCount < maxWaiting) {
    var task = taskQueue.pop();
    if (startDependency(task) || startPhase(task))
      waitCount++;
    else
      deferred.push(task);
  }
  deferred.forEach(function(task) { taskQueue.push(task); });
  console.log('<- startTasks', waitCount, taskQueue.length);
}

function done() {
  waitCount--;
  startTasks();
}

function dependenciesRemain(task) {
  return task.dependencies.length + task.executingDependencies > 0;
}

function startDependency(task) {
  if (task.dependencies.length > 0) {
    var dependency = task.dependencies.pop();
    task.executingDependencies++;
    dependency().then(function() {
      task.executingDependencies--;
      done();
    });
    if (dependenciesRemain(task))
      taskQueue.push(task);
    return true;
  }
  return false;
}

var doneCmd = 'done';
var parCmd = 'par';
var yieldCmd = 'yield';

function startPhase(task) {
  if (dependenciesRemain(task))
    return false;
  task.phases[task.index].impl(task.stream).then(function(op) {
    if (op.command == parCmd) {
      task.dependencies = op.dependencies;
    } else if (op.command == yieldCmd) {
      taskQueue.push({phases: task.phases, index: task.index, stream: task.stream, dependencies: [], executingDependencies: 0, resolve: task.resolve});
      task.resolve = undefined;
      task.stream = op.stream;
    }
    task.index++;
    if (task.index < task.phases.length)
      taskQueue.push(task);
    else if (task.resolve)
      task.resolve();
    done();
  });
  return true;
}

module.exports.startPhaseList = startPhaseList;
