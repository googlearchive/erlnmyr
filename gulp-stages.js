var fs = require('fs');

var assert = require('chai').assert;

var TreeBuilder = require('./lib/tree-builder');
var types = require('./gulp-types.js');

function writeFile(output, data, cb) {
  if (typeof data !== 'string')
    stringData = JSON.stringify(data);
  else
    stringData = data;
  fs.writeFile(output, stringData, function(err) {
    if (err)
      throw err;
    console.log('written results into \"' + output + '\".');
    // passthrough data
    cb(data);
  });
}

function readJSONFile(filename, cb) {
  fs.readFile(filename, 'utf8', function(err, data) {
    if (err)
      throw err;
    var data = JSON.parse(data);
    cb(data);
  });
}

function readFile(filename, cb) {
  fs.readFile(filename, 'utf8', function(err, data) {
    if (err)
      throw err;
    cb(data);
  });
}

/*
 * Pipeline Stages
 *
 * Each stage has an implementation function, 'impl'.
 * This function accepts a data object and a callback, and is responsible for
 * calling the callback with the result of processing the data.
 *
 * Each stage also provides a human-readable 'name',
 * an 'input' type, and an 'output' type.
 */

module.exports.JSONReader = function(filename) {
  return { 
    impl: function(_, cb) { readJSONFile(filename, cb); },
    name: 'JSONReader: ' + filename,
    input: 'unit',
    output: 'JSON'
  };
}

module.exports.fileToJSON = function() {
  return {
    impl: readJSONFile,
    name: 'fileToJSON',
    input: 'string',
    output: 'JSON'
  };
}

module.exports.fileReader = function(filename) {
  return {
    impl: function(_, cb) { readFile(filename, cb); },
    name: 'fileReader: ' + filename,
    input: 'unit',
    output: 'string'
  };
}

module.exports.filter = function(FilterType) {
  return {
    impl: treeBuilder(FilterType),
    name: 'filter: ' + FilterType.name,
    input: 'JSON',
    output: 'JSON',
  };
}

module.exports.fabricator = function(FabType, input) {
  input = input || 'JSON';
  return {
    impl: function(data, cb) {
      var fab = new FabType(data);
      cb(fab.fabricate());
    },
    name: 'fabricator: ' + FabType,
    input: input,
    output: 'JSON'
  };
}

var treeBuilder = function(WriterType) {
  return function(data, cb) {
    var writer = new WriterType();
    var builder = new TreeBuilder();
    builder.build(data);
    builder.write(writer);
    cb(writer.getHTML());
  };
};

module.exports.treeBuilderWriter = function(WriterType) {
  return {
    impl: treeBuilder(WriterType),
    name: 'treeBuilderWriter: ' + WriterType,
    input: 'JSON',
    output: 'string'
  };
}

module.exports.fileOutput = function(filename) {
  var typeVar = types.newTypeVar();
  return {
    impl: function(data, cb) { writeFile(filename, data, cb); },
    name: 'fileOutput: ' + filename,
    input: typeVar,
    output: typeVar 
  };
}

module.exports.toFile = function() {
  var typeVar = types.newTypeVar();
  return {
    impl: function(data, cb) { writeFile(data.right, data.left, cb); },
    name: 'toFile',
    input: "(" + typeVar + ",string)",
    output: typeVar
  };
}

module.exports.consoleOutput = function() {
  var typeVar = types.newTypeVar();
  return {
    impl: function(data, cb) { console.log(data); cb(data); },
    name: 'consoleOutput',
    input: typeVar,
    output: typeVar 
  };
}

function processStages(stages, cb, fail) {
  processStagesWithInput(null, stages, cb, fail);
}

/*
 * Constructing a pipeline
 *
 * Sorry for potato quality.
 */
function processStagesWithInput(input, stages, cb, fail) {
  assert.equal(stages[0].input, 'unit');
  var coersion = {};
  for (var i = 0; i < stages.length - 1; i++) {
    coersion = types.coerce(stages[i].output, stages[i + 1].input, coersion);
    assert.isDefined(coersion, "Type checking failed for " + stages[i].output + " -> " + stages[i + 1].input);
  }
  for (var i = stages.length - 1; i >= 0; i--) {
    cb = (function(i, cb) { return function(data) {
      try {
        stages[i].impl(data, cb);
      } catch (e) {
        fail(e);
      }
    } })(i, cb);
  }
  cb(input);
};

module.exports.processStages = processStages;
module.exports.processStagesWithInput = processStagesWithInput;
