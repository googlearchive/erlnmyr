var fs = require('fs');
var path = require('path');
var types = require('./types');
var stream = require('./stream');

// TODO: Export register from somewhere else.
function register(conf, fn) {
  module.exports[conf.name] = function(options) {
    var wrapped = function() {
      var target = {options: JSON.parse(JSON.stringify(conf.options || {}))};
      for (var key in options) {
        if (!(key in conf.options)) {
          throw 'Option ' + key + ' not declared';
        }
        try {
          target.options[key] = JSON.parse(options[key]);
        } catch (e) {
          target.options[key] = options[key];
        }
      }
      fn.apply(target, arguments);
    }
    // TODO: Support other arities.
    // TODO: Don't require iteration inside fn. Call once for each data+tags.
    return new stream.CoreStream(wrapped, conf.name, undefined, conf.input, conf.output);
  };
}

register({
  name: 'readDir',
  input: types.string,
  output: types.string,
}, function (items, cb) {
  cb(items.map(function(item) {
    var dirname = item.data;
    return fs.readdirSync(dirname).map(function(filename) {
      filename = path.join(dirname, filename);
      var tags = stream.cloneTags(item.tags);
      tags.filename = filename;
      return {data: filename, tags: tags};
    });
  }).reduce(function(a, b) {
    return a.concat(b);
  }, []));
});

register({
  name: 'log',
  input: types.string,
  output: types.string,
  options: {tags: []},
}, function (items, cb) {
  cb(items.map(function(item) {
    this.options.tags.forEach(function(tag) {
      console.log(tag, item.tags[tag]);
    });
    console.log(item.data);
    return item;
  }.bind(this)));
});

function toTag(options) {
  function impl(items, cb) {
    cb(items.map(function(item) {
      return {data: item.tags[options.tag], tags: item.tags};
    }));
  };
  return new stream.CoreStream(impl, 'toTag', undefined, types.string, types.string);
}

function dummy(options) {
  function impl(items, cb) {
    return items;
  };
  return new stream.CoreStream(impl, 'dummy', undefined, types.string, types.string);
}

module.exports.toTag = toTag;
module.exports.dummy = dummy;
