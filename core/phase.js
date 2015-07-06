var types = require('./types');
var streamLib = require('./stream');

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
  switch(info.arity) {
    case '0:1':
      this.impl = this.impl0To1;
      break;
    case '1:1':
    default:
      this.impl = this.impl1To1;
      break;
    case '1:N':
      this.impl = this.impl1ToN;
      break;
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

PhaseBase.prototype.impl0To1 = function(stream, mycb) {
  this.runtime.stream = stream || new streamLib.Stream();
  this.runtime.setTags({});
  var result = this.runtime.impl(this.runtime.tags);
  this.runtime.tags.tag(this.outputKey, this.outputValue);
  this.runtime.put(result);
  mycb(this.runtime.stream);
};

PhaseBase.prototype.impl1To1 = function(stream, mycb) {
  this.runtime.stream = stream;
  stream.get(this.inputKey, this.inputValue, function(item) {
    this.runtime.setTags(item.tags);
    var result = this.runtime.impl(item.data, this.runtime.tags);
    this.runtime.tags.tag(this.outputKey, this.outputValue);
    return {data: result, tags: this.runtime.tags.tags};
  }.bind(this));
  mycb(stream);
}

PhaseBase.prototype.impl1ToN = function(stream, mycb) {
  this.runtime.stream = stream;
  stream.get(this.inputKey, this.inputValue, function(item) {
    this.runtime.setTags(item.tags);
    this.runtime.impl(item.data, this.runtime.tags);
  }.bind(this));
  mycb(stream);
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
  this.impl = impl.bind(this);
}

PhaseBaseRuntime.prototype.setTags = function(tags) {
  this.baseTags = new Tags(tags);
  this.tags = this.baseTags;
}

PhaseBaseRuntime.prototype.put = function(data) {
  this.tags = this.baseTags.clone();
  this.tags.tag(this.outputKey, this.outputValue);
  this.stream.put(data, this.tags.tags);
  return this.tags;
}

module.exports.PhaseBase = PhaseBase;
