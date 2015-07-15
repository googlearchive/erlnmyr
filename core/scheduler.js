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

function Task(phases, index, stream, resolve, dependencies) {
  this.phases = phases;
  this.index = index;
  this.stream = stream;
  this.dependencies = dependencies || [];
  this.executingDependencies = 0;
  this.resolve = resolve;
}

Task.prototype = {
  dependenciesRemain: function() {
    return this.dependencies.length + this.executingDependencies > 0;
  }
}

function runPhases(phases) {
  var initPhases = phases
      .map(function(phase, idx) { return {phase: phase, idx: idx} })
      .filter(function(phase) { return phase.phase.init !== undefined; });

  var finishedPromiseList = [];

  return Promise.all(initPhases.map(function(phase) {
    return phase.phase.init(function(stream) {
      var promise = new Promise(function(resolve, reject) {
        schedule(phases, phase.idx + 1, stream, resolve);
      });
      finishedPromiseList.push(promise);
    });
  })).then(function() { return Promise.all(finishedPromiseList).then(function() { })});

}

function schedule(phases, index, stream, resolve) {
  taskQueue.push(new Task(phases, index, stream, resolve));
  startTasks();
}

function startTasks() {
  var deferred = [];
  while (taskQueue.length && waitCount < maxWaiting) {
    var task = taskQueue.pop();
    if (task.index == task.phases.length && !task.dependenciesRemain()) {
      if (task.resolve)
        task.resolve();
      continue;
    }
    if (runDependency(task) || runPhase(task))
      waitCount++;
    else
      deferred.push(task);
  }
  deferred.forEach(function(task) { taskQueue.push(task); });
}

function done() {
  waitCount--;
  startTasks();
}

function runDependency(task) {
  if (task.dependencies.length > 0) {
    var dependency = task.dependencies.pop();
    task.executingDependencies++;
    dependency().then(function() {
      task.executingDependencies--;
      done();
    });
    if (task.dependenciesRemain())
      taskQueue.push(task);
    return true;
  }
  return false;
}

var doneCmd = 'done';
var parCmd = 'par';
var yieldCmd = 'yield';

function runPhase(task) {
  if (task.dependenciesRemain())
    return false;
  var oldIndex = task.index;
  task.phases[task.index].impl(task.stream).then(function(op) {
    if (op.command == parCmd) {
      task.dependencies = op.dependencies;
    } else if (op.command == yieldCmd) {
      taskQueue.push(new Task(task.phases, oldIndex, task.stream, task.resolve));
      task.resolve = undefined;
      task.stream = op.stream;
    }
    task.index++;
    taskQueue.push(task);
    done();
  });
  return true;
}

module.exports.runPhases = runPhases;
