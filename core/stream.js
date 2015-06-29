var types = require('./types');

var _instanceID = 0;
function newInstanceID() {
  return (_instanceID++) + '';

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
    for (item of this.data) {
      if (item.tags[tagKey] == match)
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

function StreamedStage(stage, fromSpec, id) {
  this.name = '<<' + stage.name + '>>';
  this.id = id || newInstanceID();
  this.impl = function(stream, incb) {
    var inputs = stream.get('from', fromSpec);
    var cb = function() {
      incb(stream);
    }
    for (var i = inputs.length - 1; i >= 0; i--) {
      cb = (function(cb, i) {
        return function() {
          stage.impl(input[i].data, function(data) {
            var tags = input[i].tags;
            tags.from = stageSpec(this);
            tags.fromList = tags.fromList || [];
            tags.fromList.push(tags.from);
            stream.put(input[i].data, tags);
            cb();
          });
        }
      })(cb, i);
    }
    cb();
  };
  this.input = Stream([{key: "from", value: fromSpec, type: stage.input}]);
  this.output = Stream([{key: "from", value: stageSpec(this), type: stage.output}]);
};

function cloneTags(tag) {
  var result = {};
  for (key in tag)
    result[key] = tag[key];
  return result;
}

function StreamCloner(fromKey, fromValue, toKey, toValue, id) {
  var typeVar = types.newTypeVar();
  this.name = 'clone';
  this.id = id || newInstanceID();
  this.impl = function(stream, cb) {
    var data = stream.get(fromKey, fromValue);
    for (var i = 0; i < data.length; i++) {
      data[i].tags.fromList = data[i].tags.fromList || [];
      data[i].tags.fromList.push(stageSpec(this));
      var fromTag = cloneTags(data[i].tags);
      fromTag[fromKey] = fromValue;
      stream.put(data[i].data, fromTag);
      data[i].tags[toKey] = toValue;
      stream.put(data[i].data, data[i].tags);
    }
    cb(stream);
  }
  this.input = Stream([{key: fromKey, value: fromValue, type: typeVar}]);
  this.output = Stream([{key: fromKey, value: fromValue, type: typeVar},
                        {key: toKey, value: toValue, type: typeVar}]);
}

function StreamTagger(fn, fromKey, fromValue, id) {
  var typeVar = types.newTypeVar();
  this.name = 'tag';
  this.id = id || newInstanceID();
  this.impl = function(stream, cb) {
    var data = stream.get(fromKey, fromValue);
    for (var i = 0; i < data.length; i++) {
      var tag = fn(data[i].data, data[i].tags);
      data[i].tags[tag.key] = tag.value;
      data[i].tags.from = stageSpec(this);
      data[i].tags.fromList = data[i].tags.fromList || [];
      data[i].tags.fromList.push(data[i].tags.from);
      stream.put(data[i].data, data[i].tags);
    }
    cb(stream);
  };
  this.input = Stream([{key: fromKey, value: fromValue, type: stage.input}]);
  this.output = Stream([{key: "from", value: stageSpec(this), type: stage.output}]);
}

module.exports.clone = clone;
module.exports.stageSpec = stageSpec;
module.exports.StreamedStage = StreamedStage;

