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

var tid = 0;

var traceScheduler = undefined;

function Task(phases, index, stream, resolve) {
  this.id = tid++;
  this.phases = phases;
  this.index = index;
  this.stream = stream;
  this.dependencies = [];
  this.executingDependencies = 0;
  this.resolve = resolve;
  this.waitingFor = [];
  this.finished = false;
  this.checkpointList = [];
}

Task.prototype = {
  dependenciesRemain: function() {
    return this.dependencies.length + this.executingDependencies > 0;
  },
  /**
   * A task waits for another task by recording the waitee in the waitingFor
   * list.
   */
  waitFor: function(task) {
    this.waitingFor = this.waitingFor.concat(task.waitingFor);
    task.waitingFor = [];
    task.waitee = true;
    task.resolve = undefined;
    this.waitingFor.push(task);
  },
  /**
   * When a task is finished, it checks to see if all the tasks it is waiting
   * for are finished too. If they are, it can call resolve.
   *
   * If not, rather than busy looping, the task transfers its resolve method
   * and waitingFor list to one of the unfinished tasks.
   *
   * Note: only one task in any set of related tasks can have a resolve method -
   * this is the task that must have the list of waitingFor tasks too.
   * Transferring one requires transferring both.
   */
  resolveTask: function() {
    this.finished = true;
    this.waitingFor = this.waitingFor.filter(function(task) { return !task.finished; });
    traceScheduler && traceScheduler('+ resolve', this.id + ':', (this.waitingFor.length > 0 ? 'still waiting for ' + this.waitingFor.map(function(t) { return t.id; } ): ''));
    if (this.waitingFor.length == 0) {
      traceScheduler && traceScheduler('  --> ', this.resolve);
      this.resolve && this.resolve();
      return;
    }
    this.transferWaitingList();
  },
  transferWaitingList: function() {
    var newWaitingTask = this.waitingFor.pop();
    newWaitingTask.waitingFor = this.waitingFor;
    newWaitingTask.resolve = this.resolve;
    newWaitingTask.waitee = false;
    this.resolve = undefined;
    this.waitingFor = [];
  },
  /**
   * Make a new task that duplicates a phase that this task has just executed.
   * That duplicate task will need to take this task's stream, so cloning
   * requires a new stream for this task to continue executing with.
   *
   * Cloning implies a relationship, so the new task will need to wait for this
   * task to complete at some points in the future execution of phases.
   */
  clone: function(clonedIndex, newData) {
    var newTask = new Task(this.phases, clonedIndex, this.stream, this.resolve);
    this.stream = newData;
    newTask.waitFor(this);
    taskQueue.push(newTask);
    return newTask;
  },
  isSchedulable: function() {
    if (this.phases[this.index - 1].arity !== 'N:1')
      return true;
    this.waitingFor = this.waitingFor.filter(function(task) { return task.index !== this.index; }.bind(this));
    if (this.waitee)
      return false;
    if (this.waitingFor.length == 0) {
      this.stream = this.phases[this.index - 1].groupCompleted();
      return true;
    }
    this.transferWaitingList();
    return false;
  }
}

function runPhases(phases) {
  traceScheduler && traceScheduler("Phases are", phases.map(function(phase) { return phase.name; }));

  var initPhases = phases
      .map(function(phase, idx) { return {phase: phase, idx: idx} })
      .filter(function(phase) { return phase.phase.init !== undefined; });

  var finishedPromiseList = [];

  var firstTask = undefined;

  traceScheduler && traceScheduler("Initial phases at", initPhases.map(function(phase) { return phase.idx; }));

  var resolver = undefined;
  var firstTaskPromise = new Promise(function(resolve, reject) { resolver = resolve; });

  return Promise.all(initPhases.map(function(phase) {
    return phase.phase.init(function(stream) {

      var i = 0;
      if (firstTask == undefined) {
        // TODO: Is there a cleaner way to do this??
        assert(stream.data.length > 0);
        stream.data[0].tags.start = [true];
        i++;
      }
      for (; i < stream.data.length; i++)
        stream.data[i].tags.start = [false];

      var task = schedule(phases, phase.idx + 1, stream, resolver, firstTask);
      traceScheduler && traceScheduler("Phase", phase.idx, "is task", task.id, firstTask == undefined ? "" : "(awaited by task " + firstTask.id + ")");

      if (firstTask == undefined) {
        firstTask = task;
        resolver = undefined;
      }
    });
  })).then(function() {
    traceScheduler && traceScheduler('All initial phases started');
    return firstTaskPromise.then(function() {
      traceScheduler && traceScheduler('All tasks completed');
    })
  });
}

function schedule(phases, index, stream, resolve, waitFor) {
  var task = new Task(phases, index, stream, resolve);
  if (waitFor !== undefined)
    waitFor.waitFor(task);
  taskQueue.push(task);
  startTasks();
  return task;
}

function startTasks() {
  traceScheduler && traceScheduler('----');
  traceScheduler && traceScheduler('task queue has', waitCount, 'in flight and sees');
  traceScheduler && taskQueue.forEach(function(task) {
    traceScheduler(' ',
                task.id, '@' + task.index,
                '(' + (task.index >= task.phases.length ? '-' : task.phases[task.index].name) + ')' +
                (task.waitingFor.length > 0 ? ': waiting for ' + task.waitingFor.map(function(t) { return t.id; }) : ':'),
                (task.dependenciesRemain() ? 'dependencies: ' + task.dependencies.length + '/' + task.executingDependencies : '')
                 );
  });
  var deferred = [];
  while (taskQueue.length && waitCount < maxWaiting) {
    var task = taskQueue.pop();
    if (task.index == task.phases.length && !task.dependenciesRemain()) {
      task.resolveTask();
      continue;
    }
    if (runDependency(task) || runPhase(task)) {
      traceScheduler && traceScheduler('+ waiting on', task.id);
      waitCount++;
    } else {
      traceScheduler && traceScheduler('+ task', task.id, 'deferred');
      deferred.push(task);
    }
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
    traceScheduler && traceScheduler('+ task', task.id, 'starting dependency');
    dependency().then(function() {
      task.executingDependencies--;
      traceScheduler && traceScheduler('+ task', task.id, 'dependency finished');
      done();
    });
    if (task.dependenciesRemain()) {
      traceScheduler && traceScheduler('+ task', task.id, 'returned to queue');
      taskQueue.push(task);
    }
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
  traceScheduler && traceScheduler('+ task', task.id, 'starting');
  task.phases[task.index].impl(task.stream).then(function(op) {
    if (op.command == parCmd) {
      task.dependencies = op.dependencies.reverse();
    } else if (op.command == yieldCmd) {
      task.clone(oldIndex, op.stream);
    } else {
      task.stream = op.stream;
    }
    task.index++;
    // if the next phase is N:1 then we don't push here unless
    // we aren't waiting for any other tasks.
    if (task.isSchedulable())
      taskQueue.push(task);
    traceScheduler && traceScheduler('+ task', task.id, 'returned', op.command);
    done();
  });
  return true;
}

module.exports.runPhases = runPhases;
