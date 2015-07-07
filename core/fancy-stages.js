var fs = require('fs');
var assert = require('chai').assert;

var types = require('./types');

// TODO: Work out the right way to deal with this sort of thing.
module.exports.fileInputs = function(inputSpec) {
  return {
    impl: function(unused, cb) {
      var pieces = inputSpec.split('/');
      var dir = pieces.slice(0, pieces.length - 1).join('/');
      var file = pieces[pieces.length - 1];
      var re = new RegExp('^' + file + '$');
      if (dir == '')
        var files = fs.readdirSync('.');
      else
        var files = fs.readdirSync(dir);
      cb(files.filter(re.exec.bind(re)).map(function(file) { return dir == '' ? file : dir + '/' + file; }));
    },
    name: 'fileInputs: ' + inputSpec,
    input: types.unit,
    output: types.List(types.string)
  }
}

module.exports.immediate = function(x, type) {
  type = type || types.string;
  return {
    impl: function(unused, cb) { cb(x); },
    name: 'immediate',
    input: types.unit,
    output: type
  };
}

module.exports.valueMap = function(stage) {
  return {
    impl: function(input, incb) {
      var output = {};
      cb = function() { incb(output); };
      for (key in input) {
        cb = (function(cb, key) { return function() { stage.impl(input[key], function(data) { output[key] = data; cb(); }); }})(cb, key);
      }
      cb();
    },
    name: 'valueMap(' + stage.name + ')',
    input: types.Map(stage.input),
    output: types.Map(stage.output)
  };
}
