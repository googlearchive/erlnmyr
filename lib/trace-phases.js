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
