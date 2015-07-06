var types = require('./types');
var streamLib = require('./stream');
var trace = require('./trace');
var Promise = require('bluebird');

var _instanceID = 0;
function newInstanceID() {
  return (_instanceID++) + '';
}

function phaseSpec(phase) {
  return {name: phase.name, id: phase.id};
}

function PhaseBase(info, impl, options) {
  this.name = info.name;
  this.id = info.id || newInstanceID();
  this.inputType = info.input;
  this.outputType = info.output;
  this.async = info.async || false;
  this.inputArity = 1;
  if (this.async) {
    switch(info.arity) {
      case '0:1':
        this.impl = this.impl0To1Async;
        this.inputArity = 0;
        break;
      case '1:1':
      default:
        this.impl = this.impl1To1Async;
        break;
      case '1:N':
        this.impl = this.impl1ToNAsync;
        break;
    }
  } else {
    switch(info.arity) {
      case '0:1':
        this.impl = this.impl0To1;
        this.inputArity = 0;
        break;
      case '1:1':
      default:
        this.impl = this.impl1To1;
        break;
      case '1:N':
        this.impl = this.impl1ToN;
        break;
    }
  }
  this.runtime = new PhaseBaseRuntime(this, impl);
  this.runtime.options = options;
  // default I/O
  this.inputKey = 'from';
  this.outputKey = 'from';
  this.outputValue = phaseSpec(this);
  this.makeInputList();
  this.makeOutputList();
}

// TODO: remove me once stage loading doesn't need to detect
// whether we're already in a phase.
PhaseBase.prototype.isStream = true;

PhaseBase.prototype.setInput = function(name, value) {
  this.inputKey = name;
  this.inputValue = value;
  this.makeInputList();
}

PhaseBase.prototype.setOutput = function(name, value) {
  this.outputKey = name;
  this.outputValue = value;
  this.makeOutputList();
}

PhaseBase.prototype.makeInputList = function() {
  this.input = types.Stream([{key: this.inputKey, value: this.inputValue, type: this.inputType}]);
}

PhaseBase.prototype.makeOutputList = function() {
  this.output = types.Stream([{key: this.outputKey, value: this.outputValue, type: this.outputType}]);
}

function Tags(tags) {
  this.tags = tags;
}

PhaseBase.prototype.impl0To1 = function(stream) {
  this.runtime.stream = stream || new streamLib.Stream();
  this.runtime.setTags({});
  var result = this.runtime.impl(this.runtime.tags);
  this.runtime.put(result);
  return Promise.resolve(this.runtime.stream);
};

PhaseBase.prototype.impl1To1 = function(stream) {
  this.runtime.stream = stream;
  stream.get(this.inputKey, this.inputValue, function(item) {
    this.runtime.setTags(item.tags);
    var result = this.runtime.impl(item.data, this.runtime.tags);
    this.runtime.tags.tag(this.outputKey, this.outputValue);
    return {data: result, tags: this.runtime.tags.tags};
  }.bind(this));
  return Promise.resolve(stream);
}

PhaseBase.prototype.impl1To1Async = function(stream) {
  this.runtime.stream = stream;
  var items = [];
  stream.get(this.inputKey, this.inputValue, function(item) {
    items.push(item);
  });

  var runtime = this.runtime;
  function process() {
    if (!items.length) {
      return Promise.resolve(stream);
    }
    var item = items.pop();
    runtime.setTags(item.tags);
    return runtime.impl(item.data, runtime.tags).then(function(result) {
      runtime.put(result);
      return process();
    });
  }
  return process();
}

PhaseBase.prototype.impl1ToN = function(stream) {
  this.runtime.stream = stream;
  stream.get(this.inputKey, this.inputValue, function(item) {
    this.runtime.setTags(item.tags);
    this.runtime.impl(item.data, this.runtime.tags);
  }.bind(this));
  return Promise.resolve(stream);
}

Tags.prototype.clone = function() {
  var result = {};
  for (var key in this.tags)
    result[key] = this.tags[key];
  return new Tags(result);
}

Tags.prototype.tag = function(key, value) {
  this.tags[key] = value;
  return this;
}

Tags.prototype.read = function(key) {
  return this.tags[key];
}

function PhaseBaseRuntime(base, impl) {
  this.phaseBase = base;
  this.impl = trace.wrap(function() {
    var args = base.inputArity >= 1 ? {tags: {}} : null;
    if (args) {
      // Clone to exclude updates.
      for (var k in this.tags.tags) {
        args.tags[k] = this.tags.tags[k];
      }
    }
    return {cat: 'core', name: base.name, args: args};
  }, impl.bind(this));
}

PhaseBaseRuntime.prototype.setTags = function(tags) {
  this.baseTags = new Tags(tags);
  this.tags = this.baseTags;
}

PhaseBaseRuntime.prototype.put = function(data) {
  this.tags = this.baseTags.clone();
  this.tags.tag(this.phaseBase.outputKey, this.phaseBase.outputValue);
  this.stream.put(data, this.tags.tags);
  return this.tags;
}

module.exports.PhaseBase = PhaseBase;
