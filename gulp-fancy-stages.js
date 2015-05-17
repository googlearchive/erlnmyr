var fs = require('fs');
var assert = require('chai').assert;

var types = require('./gulp-types');

function collectInputs(inputSpec) {
  if (inputSpec.substring(0, 7) == 'http://')
    return [inputSpec];
  var re = new RegExp('^' + inputSpec + '$');
  var files = fs.readdirSync('.');
  return files.filter(re.exec.bind(re));
}

function readerForInput(name) {
  if (name.substring(0, 7) == 'http://')
    return telemetrySave(options.saveBrowser, name)
  return JSONReader(name);
}

module.exports.fileInputs = function(inputSpec) {
  return {
    impl: function(unused, cb) {
      var re = new RegExp('^' + inputSpec + '$');
      var files = fs.readdirSync('.');
      cb(files.filter(re.exec.bind(re)));
    },
    name: 'fileInputs: ' + inputSpec,
    input: 'unit',
    output: '[string]'
  }
}

module.exports.map = function(stage) {
  assert.isDefined(stage.input, stage + ' has no input type');
  assert.isDefined(stage.output + ' has no output type');
  var input = '[' + stage.input + ']';
  var output = '[' + stage.output + ']';

  return {
    impl: function(input, incb) {
      var results = [];
      var cb = function() { incb(results); };
      for (var i = input.length - 1; i >= 0; i--) {
        cb = (function(cb, i) {
          return function() {
            stage.impl(input[i], function(data) { results.push(data); cb(); });
          }})(cb, i);
      }
      cb();
    },
    name: 'map(' + stage.name + ')',
    input: input,
    output: output
  };
}

module.exports.tee = function() {
  var typeVar = types.newTypeVar();
  return {
    impl: function(input, cb) { cb({left: input, right: input}); },
    name: 'tee',
    input: typeVar,
    output: "(" + typeVar + "," + typeVar + ")",
  }
}

module.exports.left = function(stage) {
  var typeVar = types.newTypeVar();
  return {
    impl: function(input, cb) {
      stage.impl(input.left, function(data) {
        cb({left: data, right: input.right});
      });
    },
    name: 'left(' + stage.name + ')',
    input: "(" + stage.input + "," + typeVar + ")",
    output: "(" + stage.output + "," + typeVar + ")"
  }
}

module.exports.justLeft = function() {
  var typeVar1 = types.newTypeVar();
  var typeVar2 = types.newTypeVar();
  return {
    name: 'justLeft',
    impl: function(input, cb) { cb(input.left); },
    input: "(" + typeVar1 + "," + typeVar2 + ")",
    output: typeVar1
  };
}

module.exports.right = function(stage) {
  var typeVar = types.newTypeVar();
  return {
    impl: function(input, cb) {
      stage.impl(input.right, function(data) {
        cb({right: data, left: input.left});
      });
    },
    name: 'right(' + stage.name + ')',
    input: "(" + typeVar + "," + stage.input + ")",
    output: "(" + typeVar + "," + stage.output + ")"
  }
}

function outputForInput(inputSpec, input, output) {
  var re = new RegExp(inputSpec);
  return input.replace(re, output);
}

module.exports.outputName = function(inputSpec, output) {
  return {
    impl: function(input, cb) {
      cb(outputForInput(inputSpec, input, output));
    },
    name: 'outputName',
    input: 'string',
    output: 'string'
  };
}

module.exports.concat = function() {
  var typeVar = types.newTypeVar();
  return {
    impl: function(input, cb) {
      return input.reduce(function(a, b) { return a.concat(b); }, []);
    },
    name: 'concat',
    input: '[[' + typeVar + ']]',
    output: '[' + typeVar + ']'
  }
}

 // [ {left: [{left: file, right: ejsPrefix}], right: input} ]
module.exports.unejs = function() {
  return {
    impl: function(input, cb) {
      var output = []
      input.forEach(function(inputItem) {
	for (var i = 0; i < inputItem.left.length; i++)
	  output.push({left: inputItem.left[i].left, right: inputItem.right + inputItem.left[i].right});
      });
      cb(output);
    },
    name: 'unejs',
    input: '[([(string,string)],string)]',
    output: '[(string,string)]'
  }
}

module.exports.listify = function() {
  var typeVar = types.newTypeVar();
  return {
    impl: function(input, cb) { cb([input]); },
    name: 'listify',
    input: typeVar,
    output: '[' + typeVar + ']'
  };
}

module.exports.immediate = function(x) {
  return {
    impl: function(unused, cb) { cb(x); },
    name: 'immediate',
    input: 'unit',
    output: 'string'
  };
}
