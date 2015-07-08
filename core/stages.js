var fs = require('fs');

var types = require('./types.js');

function writeFile(output, data, cb) {
  if (typeof data !== types.string)
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

module.exports.writeFile = writeFile;

function readJSONFile(filename, cb) {
  console.log('reading', filename, 'as JSON');
  fs.readFile(filename, 'utf8', function(err, data) {
    if (err)
      throw err;
    cb(JSON.parse(data));
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

module.exports.fileToJSON = function() {
  return {
    impl: readJSONFile,
    name: 'fileToJSON',
    input: types.string,
    output: types.JSON
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

module.exports.taggedConsoleOutput = function() {
  var typeVar = types.newTypeVar();
  return {
    impl: function(data, cb) {
      for (key in data) {
        console.log(key);
        console.log('----------------'),
        console.log(data[key]);
        console.log();
      }
      cb(data);
    },
    name: 'taggedConsoleOutput',
    input: types.Map(types.string),
    output: types.Map(types.string)
  };
}
