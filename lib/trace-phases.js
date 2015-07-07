var register = require('../core/phase-register.js');
var types = require('../core/types');
var TraceFilter = require('./trace-filter');
var TraceTree = require('./trace-tree');
var TraceTreeSplitter = require('./trace-tree-splitter');
var TracePrettyPrint = require('./trace-pretty-print');
var TracePIDSplitter = require('./trace-pid-splitter');
var TraceTIDSplitter = require('./trace-tid-splitter');

register({name: 'traceFilter', input: types.JSON, output: types.JSON, arity: '1:1'},
    function(data) {
      return new TraceFilter(data, this.options).filter();
    },
    TraceFilter.defaults);

register({name: 'traceTree', input: types.JSON, output: types.JSON, arity: '1:1'},
  function(data) {
    return new TraceTree(data).filter();
  });

register({name: 'traceTreeSplitter', input: types.JSON, output: types.JSON, arity: '1:N'},
  function(data) {
    var result = new TraceTreeSplitter(data, this.options).filter();
    for (key in result) {
      this.put(result[key]);
      this.tags.tag('traceTreeSplitter', key);
    }
  },
  TraceTreeSplitter.defaults);

register({name: 'tracePrettyPrint', input: types.JSON, output: types.string, arity: '1:1'},
  function(data) {
    return new TracePrettyPrint(data, this.options).filter();
  },
  TracePrettyPrint.defaults);

register({name: 'tracePIDSplitter', input: types.JSON, output: types.JSON, arity: '1:N'},
  function(data) {
    var result = new TracePIDSplitter(data).split();
    for (key in result) {
      this.put(result[key]);
      this.tags.tag('tracePIDSplitter', key);
    }
  });

register({name: 'traceTIDSplitter', input: types.JSON, output: types.JSON, arity: '1:N'},
  function(data) {
    var result = new TraceTIDSplitter(data).split();
    for (key in result) {
      this.put(result[key]);
      this.tags.tag('traceTIDSplitter', key);
    }
  });
