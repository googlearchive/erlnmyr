var fs = require('fs');
var assert = require('chai').assert;

var types = require('./types');

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

module.exports.map = function(stage) {
  assert.isDefined(stage.input, stage + ' has no input type');
  assert.isDefined(stage.output + ' has no output type');

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
    input: types.List(stage.input),
    output: types.List(stage.output)
  };
}

// TODO: Remove me, this should be replaced with a suitably generic stream
// routing component.
module.exports.tee = function() {
  var typeVar = types.newTypeVar();
  return {
    impl: function(input, cb) { cb({left: input, right: input}); },
    name: 'tee',
    input: typeVar,
    output: types.Tuple(typeVar, typeVar),
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
    input: types.Tuple(stage.input, typeVar),
    output: types.Tuple(stage.output, typeVar),
  }
}

module.exports.justLeft = function() {
  var typeVar1 = types.newTypeVar();
  var typeVar2 = types.newTypeVar();
  return {
    name: 'justLeft',
    impl: function(input, cb) { cb(input.left); },
    input: types.Tuple(typeVar1, typeVar2),
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
    input: types.Tuple(typeVar, stage.input),
    output: types.Tuple(typeVar, stage.output)
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
    input: types.string,
    output: types.string
  };
}

module.exports.concat = function() {
  var typeVar = types.newTypeVar();
  return {
    impl: function(input, cb) {
      return input.reduce(function(a, b) { return a.concat(b); }, []);
    },
    name: 'concat',
    input: types.List(types.List(typeVar)),
    output: types.List(typeVar)
  }
}

module.exports.listify = function() {
  var typeVar = types.newTypeVar();
  return {
    impl: function(input, cb) { cb([input]); },
    name: 'listify',
    input: typeVar,
    output: types.List(typeVar)
  };
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

module.exports.keyMap = function(stage) {
  assert.equal(stage.input, types.string);
  assert.equal(stage.output, types.string);
  var typeVar = types.newTypeVar();
  return {
    impl: function(input, incb) {
      var output = {};
      cb = function() { incb(output); };
      for (key in input) {
        cb = (function(cb, key) { return function() { stage.impl(key, function(data) { output[data] = input[key]; cb(); }); }})(cb, key);
      }
      cb();
    },
    name: 'valueMap(' + stage.name + ')',
    input: types.Map(typeVar),
    output: types.Map(typeVar)
  };
}

module.exports.mapToTuples = function() {
  var typeVar = types.newTypeVar();
  return {
    impl: function(input, cb) {
      var output = [];
      for (var key in input) {
        output.push({left: key, right: input[key]});
      }
      cb(output);
    },
    name: 'mapToTuples',
    input: types.Map(typeVar),
    output: types.List(types.Tuple(types.string, typeVar))
  };
}

module.exports.deMap = function() {
  var typeVar = types.newTypeVar();
  return {
    impl: function(input, cb) {
      var output = {};
      for (key in input) {
        for (key2 in input[key]) {
          output[key + '~' + key2] = input[key][key2];
        }
      }
      cb(output);
    },
    name: 'deMap',
    input: types.Map(types.Map(typeVar)),
    output: types.Map(typeVar)
  };
}

module.exports.asKeys = function() {
  return {
    impl: function(input, cb) {
      var output = {};
      for (var i = 0; i < input.length; i++) {
        output[input[i]] = input[i];
      }
      cb(output);
    },
    name: 'asKeys',
    input: types.List(types.string),
    output: types.Map(types.string)
  };
}
