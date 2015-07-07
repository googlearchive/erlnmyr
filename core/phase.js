var types = require('./types');
var streamLib = require('./stream');
var trace = require('./trace');
var stageLoader = require('./stage-loader');
var Promise = require('bluebird');
var assert = require('chai').assert;

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
  if (info.inputs !== undefined) {
    this.inputTypes = info.inputs || [];
  } else {
    this.inputType = info.input || types.unit;
  }
  if (info.outputs !== undefined) {
    this.outputTypes = info.outputs || [];
  } else {
    this.outputType = info.output || types.unit;
  }
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
      case 'N:N':
        this.impl = this.implNToN;
        break;
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
  assert(this.inputType !== undefined);
  this.inputKey = name;
  this.inputValue = value;
  this.makeInputList();
}

PhaseBase.prototype.setOutput = function(name, value) {
  assert(this.outputType !== undefined);
  this.outputKey = name;
  this.outputValue = value;
  this.makeOutputList();
}

PhaseBase.prototype.makeInputList = function() {
  if (this.inputType !== undefined) {
    this.input = types.Stream([{key: this.inputKey, value: this.inputValue, type: this.inputType}]);
  } else {
    this.input = types.Stream(this.inputTypes);
  }
}

PhaseBase.prototype.makeOutputList = function() {
  if (this.outputType !== undefined) {
    this.output = types.Stream([{key: this.outputKey, value: this.outputValue, type: this.outputType}]);
  } else {
    this.output = types.Stream(this.outputTypes);
  }
}

function Tags(tags) {
  this.tags = tags;
}

PhaseBase.prototype.implNToN = function(stream) {
  this.runtime.stream = stream;
  // TODO: Check against type constraints / add to type constraints
  this.runtime.get = function(key, value, f) {
    this.stream.get(key, value, function(data) {
      this.setTags(data.tags);
      f(data.data);
    }.bind(this));
  }.bind(this.runtime);
  this.runtime.impl();
  return Promise.resolve(stream);
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
  if (!trace.enabled) return;
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
  if (!trace.enabled) return;
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
  stream.get(this.inputKey, this.inputValue).forEach(function(item) {
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
  var items = stream.get(this.inputKey, this.inputValue);
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
  stream.get(this.inputKey, this.inputValue).forEach(function(item) {
    var t = trace.start(this.runtime); flowItemGet(this.runtime, item.tags);
    this.runtime.setTags(item.tags);
    this.runtime.impl(item.data, this.runtime.tags);
    t.end();
  }.bind(this));
  return Promise.resolve(stream);
}

PhaseBase.prototype.impl1ToNAsync = function(stream) {
  this.runtime.stream = stream;
  var items = stream.get(this.inputKey, this.inputValue);

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
  flowItemPut(this, this.tags.tags);
  this.tags.tag(this.phaseBase.outputKey, this.phaseBase.outputValue);
  this.stream.put(data, this.tags.tags);
  return this.tags;
}

function pipeline(phases) {
  return new PhaseBase({
    name: 'pipeline',
    input: phases[0].inputType,
    output: phases[phases.length - 1].outputType,
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

function routingPhase(inRoutes, outRoutes) {
  assert(inRoutes.length == outRoutes.length);
  var typeVars = inRoutes.map(function() { return types.newTypeVar(); });
  var phase = new PhaseBase({
    name: 'routing',
    arity: 'N:N',
    inputs: inRoutes.map(function(routes, i) { return routes.map(function(route) { return {key: 'eto', value: route + '', type: typeVars[i]} }) }),
    outputs: outRoutes.map(function(routes, i) { return routes.map(function(route) { return {key: 'eto', value: route + '', type: typeVars[i]} }) }),
  }, function(stream) {
    for (var i = 0; i < inRoutes.length; i++) {
      var ins = inRoutes[i];
      var outs = outRoutes[i];
      for (var j = 0; j < ins.length; j++) {
        this.get('eto', ins[j] + '', function(data) {
          for (var k = 0; k < outs.length; k++)
            this.put(data).tag('efrom', outs[k] + '');
        }.bind(this));
      }
    }
  });
  return phase;
}

module.exports.PhaseBase = PhaseBase;
module.exports.pipeline = pipeline;
module.exports.routingPhase = routingPhase;
