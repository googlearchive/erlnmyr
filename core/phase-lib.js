var fs = require('fs');
var path = require('path');
var types = require('./types');
var stream = require('./stream');
var phase = require('./phase');

function register(info, impl, defaults) {
  function override(defaults, options) {
    var result = {};
    for (key in defaults) {
      if (key in options)
        result[key] = options[key];
      else
        result[key] = defaults[key];
    }
    return result;
  }
  module.exports[info.name] = function(options) {
    var options = override(defaults, options);
    return new phase.PhaseBase(info, impl, options);
  }
}

register({name: 'readDir', input: types.string, output: types.string, arity: '1:N'},
  function(dirName, tags) {
    fs.readdirSync(dirName).forEach(function(filename) {
      this.put(path.join(dirName, filename)).tag('filename', filename);
    }.bind(this));
  });


register({name: 'log', input: types.string, output: types.string, arity: '1:1'},
  function(data, tags) {
    // TODO: well defined default.
    var tagsToPrint = (this.options.tags && this.options.tags.split(', ')) || [];
    tagsToPrint.forEach(function(tag) {
      console.log(tag, tags.read(tag));
    });
    console.log(data);
    return data;
  },
  { tags: '' });

register({name: 'dummy', input: types.string, output: types.string, arity: '1:1'},
  function(data) { return data; });

