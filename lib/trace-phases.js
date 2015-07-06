var register = require('../core/phase-register.js');
var types = require('../core/types');
var TraceFilter = require('./trace-filter');

register({name: 'traceFilter', input: types.JSON, output: types.JSON, arity: '1:1'},
    function(data) {
      return new TraceFilter(data, this.options).filter();
    },
    TraceFilter.defaults);

