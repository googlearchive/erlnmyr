var fs = require('fs');
var path = require('path');
var types = require('./types');
var stream = require('./stream');

function readDir() {
  function impl(items, cb) {
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
  };
  return new stream.CoreStream(impl, 'readDir', undefined, types.string, types.string);
}

function log(options) {
  var tags = (options.tags && options.tags.split(', ')) || [];
  function impl(items, cb) {
    cb(items.map(function(item) {
      tags.forEach(function(tag) {
        console.log(tag, item.tags[tag]);
      });
      console.log(item.data);
      return item;
    }));
  };
  return new stream.CoreStream(impl, 'log', undefined, types.string, types.string);
}

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

module.exports.readDir = readDir;
module.exports.toTag = toTag;
module.exports.log = log;
module.exports.dummy = dummy;
