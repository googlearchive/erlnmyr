var types = require('./types');
var assert = require('chai').assert;
var stages = require('./stages');

var _instanceID = 0;
function newInstanceID() {
  return (_instanceID++) + '';
}

function Stream() {
  this.data = [];
}

Stream.prototype = {
  put: function(data, tags) {
    this.data.push({tags: tags, data: data});
  },
  get: function(key, match, fn) {
    var newData = [];
    for (var i = 0; i < this.data.length; i++) {
      var item = this.data[i];
      if (item.tags[key] == match || (item.tags[key] !== undefined && match == undefined)) {
        var result = fn(item);
        if (result !== undefined)
          newData.push(result);
      } else {
        newData.push(item);
      }
    }
    this.data = newData;
  }
}

function stageSpec(stage) {
  return {name: stage.name, id: stage.id};
}

function CoreStreamBase(name, id, fromType, toType, fromKey, fromValue, inputList, outputList) {
  this.name = name;
  this.id = id || newInstanceID();
  fromKey = fromKey || 'from';
  var inputList = inputList || [];
  inputList.push({key: fromKey, value: fromValue, type: fromType});
  var outputList = outputList || [];
  outputList.push({key: 'from', value: stageSpec(this), type: toType});
  this.input = types.Stream(inputList);
  this.output = types.Stream(outputList);
}

CoreStreamBase.prototype.tag = function(result) {
  var tags = result.tags;
  tags.from = stageSpec(this);
  tags.fromList = tags.fromList || [];
  tags.fromList.push(tags.from);
}


/**
 * CoreStream's implementation function takes lists of tagged data and returns
 * lists of tagged data.
 */
function CoreStream(fn, name, id, fromType, toType, fromKey, fromValue, inputList, outputList) {
  CoreStreamBase.call(this, name, id, fromType, toType, fromKey, fromValue, inputList, outputList);
  this.fn = fn;
  this.fromKey = fromKey;
  this.fromValue = fromValue;
};

CoreStream.prototype = Object.create(CoreStreamBase.prototype);
CoreStream.prototype.impl = function(stream, incb) {
  // TODO: should stream be constructed as input instead?
  if (stream == null) {
    stream = new Stream();
  }
  var inputs = [];
  stream.get(this.fromKey, this.fromValue, function(result) {
    inputs.push(result);
  });
  this.fn(inputs, function(results) {
    for (var i = 0; i < results.length; i++) {
      this.tag(results[i]);
      stream.put(results[i].data, results[i].tags);
    }
    incb(stream);
  }.bind(this), stream);
}

/**
 * coreStreamAsync's implementation function takes a tagged data item and
 * returns a tagged data item.
 */
function coreStreamAsync(fn, name, id, input, output, fromKey, fromValue) {
  return new CoreStream(function(data, incb) {
      var results = [];
      var cb = function() { incb(results); }
      for (var i = data.length - 1; i >= 0; i--) {
        cb = (function(cb, i) {
          return function() {
            fn(data[i], function(data) { results.push(data); cb(); });
          }
        })(cb, i);
      }
      cb();
    }, name, id, input, output, fromKey, fromValue);
}

function streamedStage0ToN(stage, id, fromKey, fromValue) {
  assert(stage.input == types.unit);
  assert(types.isList(stage.output));
  return new CoreStream(function(data, incb) {
    stage.impl([], function(dataOut) {
      dataOut = dataOut.map(function(data) { return {data: data, tags: {} }; });
      incb(dataOut);
    });
  }, '<<' + stage.name + '>>', id, stage.input, types.deList(stage.output), fromKey, fromValue);
}

function streamedStage1To1(stage, id, fromKey, fromValue) {
  return coreStreamAsync(function(data, cb) {
      stage.impl(data.data, function(dataOut) { dataOut = {data: dataOut, tags: data.tags} ; cb(dataOut); });
    }, '<<' + stage.name + '>>', id, stage.input, stage.output, fromKey, fromValue);
}

function cloneTags(tag) {
  var result = {};
  for (key in tag)
    result[key] = tag[key];
  return result;
}

function clone(toKey, value1, value2, id) {
  var typeVar = types.newTypeVar();
  return new CoreStream(function(data, incb, stream) {
      for (var i = 0; i < data.length; i++) {
        var newTags = cloneTags(data[i].tags);
        data[i].tags[toKey] = value1;
        stream.put(data[i].data, data[i].tags);
        data[i].tags = newTags;
        data[i].tags[toKey] = value2;
        stream.put(data[i].data, data[i].tags);
      }
      incb(data);
    }, 'clone', id, typeVar, typeVar, fromKey, fromValue, [],
    [{key: toKey, value: value1, type: typeVar}, {key: toKey, value: value2, type: typeVar}]);
}

function tag(fn, id, fromKey, fromValue) {
  var typeVar = types.newTypeVar();
  return new CoreStream(function(data, incb) {
      for (var i = 0; i < data.length; i++) {
        var tag = fn(data[i].data, data[i].tags);
        data[i].tags[tag.key] = tag.value;
      }
      incb(data);
    }, 'tag', id, typeVar, typeVar, fromKey, fromValue);
}

function write(id) {
  var typeVar = types.newTypeVar();
  return coreStreamAsync(function(data, incb) {
      stages.writeFile(data.tags['filename'], data.data, function() { incb(data); });
    }, 'write', typeVar, typeVar, 'filename');
}

module.exports.clone = clone;
module.exports.stageSpec = stageSpec;
module.exports.streamedStage1To1 = streamedStage1To1;
module.exports.streamedStage0ToN = streamedStage0ToN;
module.exports.tag = tag;
module.exports.write = write;
