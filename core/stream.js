var types = require('./types');

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
    var results = [];
    var newData = [];
    for (var i = 0; i < this.data.length; i++) {
      var item = this.data[i];
      if (item.tags[key] == match || (item.tags[key] !== undefined && match == undefined))
        results.push(item);
      else
        newData.push(item);
    }
    this.data = newData;
    return results;
  }
}

function stageSpec(stage) {
  return {name: stage.name, id: stage.id};
}

function CoreStream(fn, name, id, fromType, toType, fromKey, fromValue, inputList, outputList) {
  this.name = name;
  this.id = id || newInstanceID();
  this.impl = function(stream, incb) {
    // TODO: should stream be constructed as input instead?
    if (stream == null) {
      stream = new Stream();
    }
    fn(stream.get(fromKey, fromValue), function(results) {
      for (var i = 0; i < results.length; i++) {
        var data = results[i].data;
        var tags = results[i].tags;
        tags.from = stageSpec(this);
        tags.fromList = tags.fromList || [];
        tags.fromList.push(tags.from);
        stream.put(data, tags);
      }
      incb(stream);
    }, stream);
  };
  fromKey = fromKey || 'from';
  var inputList = inputList || [];
  inputList.push({key: fromKey, value: fromValue, type: fromType});
  var outputList = outputList || [];
  outputList.push({key: 'from', value: stageSpec(this), type: toType});
  this.input = types.Stream(inputList);
  this.output = types.Stream(outputList);
} 

function coreStreamAsync(fn, name, id, input, output, fromKey, fromValue) {
  return new CoreStream(function(data, incb) {
      var results = [];
      var cb = function() { incb(results); }
      // TODO: this is probably wrong. Actually, fancyStages.fileInputs 
      // isn't a standard streamedStage as it takes nothing and produces lists.
      if (data.length == 0 && input == types.unit) {
        fn({data: undefined, tags: {}}, function(data) { results.push(data); cb(); });
      }
      for (var i = data.length - 1; i >= 0; i--) {
        cb = (function(cb, i) {
          return function() {
            fn(data[i], function(data) { results.push(data); cb(); });
          }
        })(cb, i);
      }
    }, name, id, input, output, fromKey, fromValue);
}

function streamedStage(stage, id, fromKey, fromValue) {
  return coreStreamAsync(function(data, cb) {
      stage.impl(data.data, function(dataOut) { console.log(dataOut); dataOut.tags = data.tags; cb(dataOut); });
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

function write(id, fromKey, fromValue) {
  var typeVar = types.newTypeVar();
  return coreStreamAsync(function(data, incb) {
      writeFile(data.tags['filename'], data.data, function() { incb(data); });
    }, 'write', typeVar, typeVar, fromKey, fromValue);
}

module.exports.clone = clone;
module.exports.stageSpec = stageSpec;
module.exports.streamedStage = streamedStage;
module.exports.tag = tag;
module.exports.write = write;
