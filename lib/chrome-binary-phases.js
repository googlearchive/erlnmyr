var register = require('../core/phase-register.js');
var types = require('../core/types');
var ChromeBinary = require('chrome-binary');

register({name: 'chromeBinary', input: types.string, output: types.string, arity: '1:1'},
    function(data) {
      return new ChromeBinary(options, data);
    }, {});
