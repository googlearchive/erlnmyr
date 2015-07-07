var register = require('../core/phase-register.js');
var types = require('../core/types');
var TraceFilter = require('./trace-filter');
var TraceTree = require('../lib/trace-tree');
var TraceTreeSplitter = require('../lib/trace-tree-splitter');

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

