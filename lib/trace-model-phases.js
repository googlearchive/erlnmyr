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

var phase = require('../core/register.js').phase;
var types = require('../core/types');
var tr = require('../third_party/tracing/tracing');
var traceModel = 'trace-model';
var traceProcess = 'trace-process';
var traceMemoryDump = 'trace-memory-dump';
var traceMemoryAllocatorDump = 'trace-memory-allocator-dump';
var object = 'object';

module.exports.traceModel = phase({
  input: types.string,
  output: traceModel,
  arity: '1:1',
}, function(data) {
  var model = new tr.Model()
  new tr.importer.Import(model).importTraces([data]);
  return model;
});

module.exports.modelProcesses = phase({
  input: traceModel,
  output: traceProcess,
  arity: '1:N',
}, function(data) {
  data.getAllProcesses().forEach(function(process) {
    if (this.options.filter.length > 0 && this.options.filter.indexOf(process.name) == -1)
      return;
    this.put(process);
  }.bind(this));
}, {
  filter: []
});

module.exports.processMemoryDumps = phase({
  input: traceProcess,
  output: traceMemoryDump,
  arity: '1:N',
}, function(data) {
  data.memoryDumps.forEach(function(dump) {
    this.put(dump).tag('startTime', dump.start);
  }.bind(this));
});

module.exports.memoryAllocatorDumps = phase({
  input: traceMemoryDump,
  output: traceMemoryAllocatorDump,
  arity: '1:N',
}, function(data) {
  data.memoryAllocatorDumps.forEach(function(dump) {
    this.put(dump);
  }.bind(this));
});

module.exports.allocatorInfo = phase({
  input: traceMemoryAllocatorDump,
  output: object,
  arity: '1:1',
}, function(data) {
  var result = {};
  result[data.name] = {};
  if (data.attributes.size) { result[data.name].size = data.attributes.size.value; }
  if (data.attributes.effective_size) { result[data.name].effectiveSize = data.attributes.effective_size.value; }
  return result;
});

module.exports.objectJoin = phase({
  input: object,
  output: object,
  arity: 'N:1',
}, {
  onStart: function() {
    this.object = {};
    this.capturedTags = {};
  },
  impl: function(input, tags) {
    for (var k in input) {
      this.object[k] = input[k];
    }
    this.options.tags.forEach(function(tag) {
      this.capturedTags[tag] = tags.read(tag);
    }.bind(this));
  },
  onCompletion: function() {
    this.options.tags.forEach(function(tag) {
      this.tags.tag(tag, this.capturedTags[tag]);
    }.bind(this));
    return this.object;
  }
}, {
  tags: []
});

module.exports.tagsToData = phase({
  input: object,
  output: object,
  arity: '1:1'
}, function(input, tags) {
  this.options.tags.forEach(function(tag) {
    input[tag] = tags.read(tag);
  });
  return input;
}, {
  tags: []
});

module.exports.collectToList = phase({
  input: object,
  output: object,
  arity: 'N:1',
}, {
  onStart: function() {
    this.list = [];
  },
  impl: function(data) {
    this.list.push(data);
  },
  onCompletion: function() {
    return this.list;
  }
})
