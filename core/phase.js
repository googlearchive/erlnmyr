var types = require('./types');
var streamLib = require('./stream');
var trace = require('./trace');
var stageLoader = require('./stage-loader');
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
  var t = trace.start(this.runtime);
  var result = this.runtime.impl(this.runtime.tags);
  this.runtime.put(result);
  t.end();
  return Promise.resolve(this.runtime.stream);
};

function flowItemGet(runtime, tags) {
  var args = {tags: {}};
  for (var k in tags) {
    if (k != 'flow')
      args.tags[k] = tags[k];
  }
  var t = trace.start({cat: 'phase', name: 'get:' + runtime.phaseBase.name, args: args});
  if (tags.flow) {
    tags.flow.step();
  }
  t.end();
}

function flowItemPut(runtime, tags) {
  var args = {tags: {}};
  for (var k in tags) {
    if (k != 'flow')
      args.tags[k] = tags[k];
  }
  var t = trace.start({cat: 'phase', name: 'put:' + runtime.phaseBase.name, args: args});
  if (tags.flow) {
    tags.flow.step();
  }
  tags.flow = trace.flow(runtime).start();
  t.end();
}

PhaseBase.prototype.impl1To1 = function(stream) {
  this.runtime.stream = stream;
  stream.get(this.inputKey, this.inputValue, function(item) {
    var t = trace.start(this.runtime); flowItemGet(this.runtime, item.tags);
    this.runtime.setTags(item.tags);
    var result = this.runtime.impl(item.data, this.runtime.tags);
    this.runtime.tags.tag(this.outputKey, this.outputValue);
    this.runtime.put(result);
    t.end();
  }.bind(this));
  return Promise.resolve(stream);
}

PhaseBase.prototype.impl1To1Async = function(stream) {
  this.runtime.stream = stream;
  var items = [];
  stream.get(this.inputKey, this.inputValue, function(item) {
    items.push(item);
  });

  // TODO: Consider a way to specify batching to avoid starting all tasks
  //       at the same time.
  var phase = this;
  return Promise.all(items.map(function(item) {
    // TODO: Simplify runtime so that we can share it across invocations.
    var runtime = new PhaseBaseRuntime(phase, phase.runtime.impl);
    runtime.stream = stream;
    runtime.setTags(item.tags);
    var t = trace.start(runtime); flowItemGet(runtime, item.tags);
    var result = runtime.impl(item.data, runtime.tags);
    t.end();
    return result.then(trace.wrap(trace.enabled && {cat: 'phase', name: 'finish:' + phase.name}, function(result) {
      runtime.put(result);
    }));
  })).then(function() {
    return stream;
  });
}

PhaseBase.prototype.impl1ToN = function(stream) {
  this.runtime.stream = stream;
  stream.get(this.inputKey, this.inputValue, function(item) {
    var t = trace.start(this.runtime); flowItemGet(this.runtime, item.tags);
    this.runtime.setTags(item.tags);
    this.runtime.impl(item.data, this.runtime.tags);
    t.end();
  }.bind(this));
  return Promise.resolve(stream);
}

PhaseBase.prototype.impl1ToNAsync = function(stream) {
  this.runtime.stream = stream;
  var items = [];
  stream.get(this.inputKey, this.inputValue, function(item) {
    items.push(item);
  });

  var phase = this;
  return Promise.all(items.map(function(item) {
    var runtime = new PhaseBaseRuntime(phase, phase.runtime.impl);
    runtime.stream = stream;
    runtime.setTags(item.tags);
    var t = trace.start(runtime); flowItemGet(runtime, item.tags);
    var result = runtime.impl(item.data, runtime.tags);
    var flow = trace.flow({cat: 'phase', name: phase.name}).start();
    t.end();
    return result.then(function(result) {
      flow.end();
    });
  })).then(function() {
    return stream;
  });
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
  this.impl = impl;
}

PhaseBaseRuntime.prototype.toTraceInfo = function() {
  return {cat: 'phase', name: this.phaseBase.name};
};

PhaseBaseRuntime.prototype.setTags = function(tags) {
  this.baseTags = new Tags(tags);
  this.tags = this.baseTags;
}

PhaseBaseRuntime.prototype.put = function(data, tags) {
  if (tags) {
    this.tags = new Tags(tags);
  } else {
    this.tags = this.baseTags.clone();
  }
  // TODO: This misses tags when they are set after calling put().
  trace.enabled && flowItemPut(this, this.tags.tags);
  this.tags.tag(this.phaseBase.outputKey, this.phaseBase.outputValue);
  this.stream.put(data, this.tags.tags);
  return this.tags;
}

function pipeline(phases) {
  return new PhaseBase({
    name: 'pipeline',
    // TODO: OMG FIX THIS
    input: phases[0].inputType, //.tags[0].type,
    output: phases[phases.length - 1].outputType, //.tags[0].type,
    arity: '1:N',
    async: true,
  }, function(data, tags) {
    var runtime = this;
    return new Promise(function(resolve, reject) {
      var stream = new streamLib.Stream();
      stream.put(data, tags.tags);
      stageLoader.processStagesWithInput(stream, phases, function(stream) {
        for (var i = 0; i < stream.data.length; i++) {
          runtime.put(stream.data[i].data, stream.data[i].tags);
        }
        resolve();
      }, reject);
    });
  },
  {});
}

module.exports.PhaseBase = PhaseBase;
module.exports.pipeline = pipeline;
