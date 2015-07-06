var types = require('./types');
var assert = require('chai').assert;
var stages = require('./stages');
var stageLoader = require('./stage-loader');

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
    var oldData = this.data;
    this.data = [];
    for (var i = 0; i < oldData.length; i++) {
      var item = oldData[i];
      if (item.tags[key] == match || (item.tags[key] !== undefined && match == undefined)) {
        var result = fn(item);
        if (result !== undefined)
          newData.push(result);
      } else {
        newData.push(item);
      }
    }
    this.data = this.data.concat(newData);
  }
}

function stageSpec(stage) {
  return {name: stage.name, id: stage.id};
}

function CoreStreamBase(name, id, fromType, toType, fromKey, fromValue, inputList, outputList) {
  this.name = name;
  this.id = id || newInstanceID();
  this.fromType = fromType;
  this.toType = toType;
  this.fromKey = fromKey || 'from';
  this.fromValue = fromValue;
  this.inputList = inputList || [];
  this.inputList.push({key: this.fromKey, value: this.fromValue, type: this.fromType});
  this.outputList = outputList || [];
  this.outputList.push({key: 'from', value: stageSpec(this), type: this.toType});
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
  this.inputList = [{key: this.fromKey, value: this.fromValue, type: this.fromType}];
  this.input = types.Stream(this.inputList);
}
CoreStreamBase.prototype.setOutput = function(name, value) {
  // TODO: Make this work when setOutput is called again
  assert(this.outputName == undefined);
  this.outputName = name;
  this.outputValue = value;
  this.outputList.push({key: name, value: value, type: this.toType});
  this.output = types.Stream(this.outputList);
}

function RoutingStage(inRoutes, outRoutes) {
  assert(inRoutes.length == outRoutes.length);
  this.name = 'routing';
  this.id = inRoutes + ' : ' + outRoutes;
  this.impl = function(stream, cb) {
    for (var i = 0; i < inRoutes.length; i++) {
      var ins = inRoutes[i];
      var outs = outRoutes[i];
      for (var j = 0; j < ins.length; j++) {
        stream.get('eto', ins[j] + '', function(result) {
          for (var k = 0; k < outs.length; k++) {
            var tags = cloneTags(result.tags);
            tags.efrom = outs[k] + '';
            stream.put(result.data, tags);
          }
        }.bind(this));
      }
    }
    cb(stream);
  }
  var inputs = [];
  var outputs = [];
  for (var i = 0; i < inRoutes.length; i++) {
    var typeVar = types.newTypeVar();
    for (var j = 0; j < inRoutes[i].length; j++)
      inputs.push({key: 'eto', value: inRoutes[i][j] + '', type: typeVar});
    for (var k = 0; k < outRoutes[i].length; k++)
      outputs.push({key: 'efrom', value: outRoutes[i][k] + '', type: typeVar});
  }
  this.input = types.Stream(inputs);
  this.output = types.Stream(outputs);
}

function stageWrapper(stageList, id) {
  var first = stageList[0];
  var last = stageList[stageList.length - 1];
  var name = '<<[' + stageList.map(function(stage) { return stage.name; }).join() + ']>>';

  var streamStage = new CoreStreamBase(name, id, first.fromType, last.toType, first.fromKey, first.fromValue);

  streamStage.impl = function(stream, incb) {
    var inputs = [];
    stream.get(this.fromKey, this.fromValue, function(result) {
      inputs.push(result);
    });
    var cb = function(outStream) { incb(outStream); };
    if (inputs.length > 0)
      stream.put(inputs[0].data, inputs[0].tags);
    stageLoader.processStagesWithInput(stream, stageList, function(outStream) {
      for (var i = inputs.length - 1; i >= 1; i--) {
        cb = (function(cb, i) {
          return function() {
            var smallStream = new Stream();
            smallStream.put(inputs[i].data, inputs[i].tags);
            stageLoader.processStagesWithInput(smallStream, stageList, function(result) {
              outStream.data = outStream.data.concat(result.data);
              cb(outStream);
            }, function(e) { throw e; });
          }
        })(cb, i);
      }
      cb();
    }, function(e) { throw e; });
  };
  // TODO: inputList/outputList??
  if (last.outputName !== undefined) {
    streamStage.setOutput(last.outputName, last.outputValue);
  }
  return streamStage;
}


/**
 * CoreStream's implementation function takes lists of tagged data and returns
 * lists of tagged data.
 */
function CoreStream(fn, name, id, fromType, toType, fromKey, fromValue, inputList, outputList) {
  CoreStreamBase.call(this, name, id, fromType, toType, fromKey, fromValue, inputList, outputList);
  this.fn = fn;
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

function streamedStage0To1(stage, id, fromKey, fromValue) {
  assert(stage.input == types.unit);
  return new CoreStream(function(data, incb) {
    stage.impl(undefined, function(dataOut) {
      incb([{data: dataOut, tags: {}}]);
    });
  }, '<0<' + stage.name + '>1>', id, stage.input, stage.output, fromKey, fromValue);
}

function streamedStageList0ToN(stage, id, fromKey, fromValue) {
  assert(stage.input == types.unit);
  assert(types.isList(stage.output));
  return new CoreStream(function(data, incb) {
    stage.impl(undefined, function(dataOut) {
      dataOut = dataOut.map(function(data) { return {data: data, tags: {} }; });
      incb(dataOut);
    });
  }, '<0<' + stage.name + '>N>', id, stage.input, types.deList(stage.output), fromKey, fromValue);
}

function streamedStage1To1(stage, id, fromKey, fromValue) {
  return coreStreamAsync(function(data, cb) {
      stage.impl(data.data, function(dataOut) { dataOut = {data: dataOut, tags: data.tags} ; cb(dataOut); });
    }, '<1<' + stage.name + '>1>', id, stage.input, stage.output, fromKey, fromValue);
}

function streamedStageMap1ToN(stage, id, fromKey, fromValue) {
  assert(types.isMap(stage.output));
  return new CoreStream(function(data, incb) {
    var result = [];
    var cb = function() {incb(result); }
    for (var i = data.length - 1; i >= 0; i--) {
      cb = (function(cb, i) {
        return function() {
          stage.impl(data[i].data, function(dataOut) {
            for (key in dataOut) {
              var tags = cloneTags(data[i].tags);
              tags[id == undefined ? stage.name : id] = key;
              result.push({data: dataOut[key], tags: tags});
            }
            cb();
          });
        }
      })(cb, i);
    }
    cb();
  }, '<1<' + stage.name + '>N>', id, stage.input, types.deMap(stage.output), fromKey, fromValue);
}

function streamedStage(stage, id, fromKey, fromValue) {
  if (stage.input == 'unit' && types.isList(stage.output))
    return streamedStageList0ToN(stage, id, fromKey, fromValue);
  if (stage.input == 'unit')
    return streamedStage0To1(stage, id, fromKey, fromValue);
  if (types.isMap(stage.output) && !(types.isMap(stage.input)))
    return streamedStageMap1ToN(stage, id, fromKey, fromValue);
  return streamedStage1To1(stage, id, fromKey, fromValue);
}

function cloneTags(tag) {
  var result = {};
  for (var key in tag)
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

module.exports.cloneTags = cloneTags;
module.exports.stageSpec = stageSpec;
module.exports.streamedStage = streamedStage;
module.exports.tag = tag;
module.exports.write = write;
module.exports.RoutingStage = RoutingStage;
module.exports.stageWrapper = stageWrapper;
module.exports.CoreStream = CoreStream;
module.exports.Stream = Stream;
