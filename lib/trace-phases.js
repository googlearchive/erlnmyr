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

var phase = require('../core/phase-register.js');
var types = require('../core/types');
var TraceFilter = require('./trace-filter');
var TraceTree = require('./trace-tree');
var TraceTreeSplitter = require('./trace-tree-splitter');
var TracePrettyPrint = require('./trace-pretty-print');
var TracePIDSplitter = require('./trace-pid-splitter');
var TraceTIDSplitter = require('./trace-tid-splitter');

module.exports.traceFilter = phase({input: types.JSON, output: types.JSON, arity: '1:1'},
  function(data) {
    return new TraceFilter(data, this.options).filter();
  },
  TraceFilter.defaults);

module.exports.traceTree = phase({input: types.JSON, output: types.JSON, arity: '1:1'},
  function(data) {
    return new TraceTree(data).filter();
  });

module.exports.traceTreeSplitter = phase({input: types.JSON, output: types.JSON, arity: '1:N'},
  function(data) {
    var result = new TraceTreeSplitter(data, this.options).filter();
    for (key in result) {
      this.put(result[key]);
      this.tags.tag('traceTreeSplitter', key);
    }
  },
  TraceTreeSplitter.defaults);

module.exports.tracePrettyPrint = phase({input: types.JSON, output: types.string, arity: '1:1'},
  function(data) {
    return new TracePrettyPrint(data, this.options).filter();
  },
  TracePrettyPrint.defaults);

module.exports.tracePIDSplitter = phase({input: types.JSON, output: types.JSON, arity: '1:N'},
  function(data) {
    var result = new TracePIDSplitter(data).split();
    for (key in result) {
      this.put(result[key]);
      this.tags.tag('tracePIDSplitter', key);
    }
  });

module.exports.traceTIDSplitter = phase({input: types.JSON, output: types.JSON, arity: '1:N'},
  function(data) {
    var result = new TraceTIDSplitter(data).split();
    for (key in result) {
      this.put(result[key]);
      this.tags.tag('traceTIDSplitter', key);
    }
  });

// Produces a summed total of the input events.
module.exports.traceAnalyser = phase({input: types.JSON, output: types.number, arity: '1:N'},
  function(data) {
    var buckets = {};
    for (var i = 0; i < data.traceEvents.length; i++) {
      var event = data.traceEvents[i];
      if (buckets[event.name] == undefined) {
        buckets[event.name] = 0;
      }
      buckets[event.name] += event.tdur;
    }
    for (var name in buckets) {
      this.put(buckets[name]).tag('eventName', name);
    }
  });
