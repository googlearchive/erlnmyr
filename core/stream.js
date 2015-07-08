var types = require('./types');
var assert = require('chai').assert;
var stages = require('./stages');
var stageLoader = require('./stage-loader');
var Promise = require('bluebird');

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
  get: function(key, match) {
    var result = [];
    var newData = [];
    for (var i = 0; i < this.data.length; i++) {
      var item = this.data[i];
      if (item.tags[key] == match || (item.tags[key] !== undefined && match == undefined)) {
        result.push(item);
      } else {
        newData.push(item);
      }
    }
    this.data = newData;
    return result;
  }
}

function stageSpec(stage) {
  return {name: stage.name, id: stage.id};
}

function CoreStreamBase(name, id, inputType, outputType, fromKey, fromValue, inputList, outputList) {
  this.name = name;
  this.id = id || newInstanceID();
  this.inputType = inputType;
  this.outputType = outputType;
  this.fromKey = fromKey || 'from';
  this.fromValue = fromValue;
  this.inputList = inputList || [];
  this.inputList.push({key: this.fromKey, value: this.fromValue, type: this.inputType});
  this.outputList = outputList || [];
  this.outputList.push({key: 'from', value: stageSpec(this), type: this.outputType});
  this.input = types.Stream(this.inputList);
  this.output = types.Stream(this.outputList);
}

CoreStreamBase.prototype.isStream = true;

CoreStreamBase.prototype.tag = function(result) {
  var tags = result.tags;
  tags.from = stageSpec(this);
  // TODO: make this work
  // tags.fromList = tags.fromList || [];
  // tags.fromList.push(tags.from);
  if (this.outputName !== undefined)
    tags[this.outputName] = this.outputValue;
}

CoreStreamBase.prototype.setInput = function(name, value) {
  this.fromKey = name;
  this.fromValue = value;
  // TODO: this wont work for stages with multiple inputs
  this.inputList = [{key: this.fromKey, value: this.fromValue, type: this.inputType}];
  this.input = types.Stream(this.inputList);
}
CoreStreamBase.prototype.setOutput = function(name, value) {
  // TODO: Make this work when setOutput is called again
  assert(this.outputName == undefined);
  this.outputName = name;
  this.outputValue = value;
  this.outputList.push({key: name, value: value, type: this.outputType});
  this.output = types.Stream(this.outputList);
}

/**
 * CoreStream's implementation function takes lists of tagged data and returns
 * lists of tagged data.
 */
function CoreStream(fn, name, id, inputType, outputType, fromKey, fromValue, inputList, outputList) {
  CoreStreamBase.call(this, name, id, inputType, outputType, fromKey, fromValue, inputList, outputList);
  this.fn = fn;
};

CoreStream.prototype = Object.create(CoreStreamBase.prototype);
CoreStream.prototype.impl = function(stream, incb) {
  // TODO: should stream be constructed as input instead?
  if (stream == null) {
    stream = new Stream();
  }
  var inputs = stream.get(this.fromKey, this.fromValue);
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

function streamedStage1To1(stage, id, fromKey, fromValue) {
  return coreStreamAsync(function(data, cb) {
      stage.impl(data.data, function(dataOut) { dataOut = {data: dataOut, tags: data.tags} ; cb(dataOut); });
    }, '<1<' + stage.name + '>1>', id, stage.input, stage.output, fromKey, fromValue);
}

function streamedStage(stage, id, fromKey, fromValue) {
  return streamedStage1To1(stage, id, fromKey, fromValue);
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
module.exports.stageSpec = stageSpec;
module.exports.streamedStage = streamedStage;
module.exports.tag = tag;
module.exports.CoreStream = CoreStream;
module.exports.Stream = Stream;
