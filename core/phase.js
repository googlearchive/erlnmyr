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
  this.parallel = info.parallel || Infinity;
  if (this.async) {
    switch(info.arity) {
      case '0:1':
        this.impl = this.impl0To1Async;
        assert(this.inputType !== undefined);
        assert(this.outputType !== undefined);
        break;
      case '1:1':
      default:
        this.impl = this.impl1To1Async;
        assert(this.inputType !== undefined);
        assert(this.outputType !== undefined);
        break;
      case '1:N':
        this.impl = this.impl1ToNAsync;
        assert(this.inputType !== undefined);
        break;
    }
  } else {
    switch(info.arity) {
      case 'N:N':
        this.impl = this.implNToN;
        break;
      case '0:1':
        this.impl = this.impl0To1;
        assert(this.inputType !== undefined);
        assert(this.outputType !== undefined);
        break;
      case '1:1':
      default:
        this.impl = this.impl1To1;
        assert(this.inputType !== undefined);
        assert(this.outputType !== undefined);
        break;
      case '1:N':
        this.impl = this.impl1ToN;
        assert(this.inputType !== undefined);
        break;
    }
  }

  // default I/O
  this.inputKey = 'from';
  this.outputKey = 'from';
  this.outputValue = phaseSpec(this);
  this.makeInputList();
  this.makeOutputList();

  this.runtime = new PhaseBaseRuntime(this, impl, options);
}

// TODO: remove me once stage loading doesn't need to detect
// whether we're already in a phase.
PhaseBase.prototype.isStream = true;

PhaseBase.prototype.setInput = function(name, value) {
  assert(this.inputType !== undefined);
  this.inputKey = name;
  this.inputValue = value;
  this.makeInputList();
  this.runtime = new PhaseBaseRuntime(this, this.runtime.impl, this.runtime.options);
}

PhaseBase.prototype.setOutput = function(name, value) {
  assert(this.outputType !== undefined);
  this.outputKey = name;
  this.outputValue = value;
  this.makeOutputList();
  this.runtime = new PhaseBaseRuntime(this, this.runtime.impl, this.runtime.options);
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
  this.runtime.get = function(key, value, f) {
    this.stream.get(key, value, function(data) {
      this.setTags(data.tags);
      f(data.data);
    }.bind(this));
  }.bind(this.runtime);
  var t = trace.start(this.runtime);
  this.runtime.impl();
  t.end();
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
  var phase = this;
  function process() {
    if (items.length == 0) {
      return Promise.resolve();
    }
    var item = items.pop();
    // TODO: Simplify runtime so that we can share it across invocations.
    var runtime = new PhaseBaseRuntime(phase, phase.runtime.impl, phase.runtime.options);
    runtime.stream = stream;
    runtime.setTags(item.tags);
    var t = trace.start(runtime); flowItemGet(runtime, item.tags);
    var result = runtime.impl(item.data, runtime.tags);
    t.end();
    return result.then(trace.wrap(trace.enabled && {cat: 'phase', name: 'finish:' + phase.name}, function(result) {
      runtime.put(result);
      return process();
    }));
  }
  var spawn = Math.min(this.parallel, items.length);
  var tasks = [];
  for (var i = 0; i < spawn; i++) {
    tasks.push(process());
  }
  return Promise.all(tasks).then(function() {
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
  function process() {
    if (items.length == 0) {
      return Promise.resolve();
    }
    var item = items.pop();
    var runtime = new PhaseBaseRuntime(phase, phase.runtime.impl, phase.runtime.options);
    runtime.stream = stream;
    runtime.setTags(item.tags);
    var t = trace.start(runtime); flowItemGet(runtime, item.tags);
    var result = runtime.impl(item.data, runtime.tags);
    var flow = trace.flow({cat: 'phase', name: phase.name}).start();
    t.end();
    return result.then(function(result) {
      flow.end();
      return process();
    });
  }
  var spawn = Math.min(this.parallel, items.length);
  var tasks = [];
  for (var i = 0; i < spawn; i++) {
    tasks.push(process());
  }
  return Promise.all(tasks).then(function() {
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

function getFunction(type) {
  return function(f) {
    this.stream.get(type.key, type.value).forEach(function(data) {
      flowItemGet(this, data.tags);
      this.setTags(data.tags);
      f(data.data);
    }.bind(this));
  }
}

function putFunction(type) {
  return function(data, tags) {
    if (tags) {
      this.tags = new Tags(tags);
    } else {
      this.tags = this.baseTags.clone();
    }
    // TODO: This misses tags when they are set after calling put().
    flowItemPut(this, this.tags.tags);
    this.tags.tag(type.key, type.value);
    this.stream.put(data, this.tags.tags);
    return this.tags;
  }
}

function PhaseBaseRuntime(base, impl, options) {
  this.phaseBase = base;
  this.options = options;

  // setup put/get
  // TODO: Check against type constraints / add to type constraints
  // TODO: use these for base get/put in arity 1 cases?
  // TODO: don't install get/put in arity 1 cases
  if (this.phaseBase.inputTypes !== undefined) {
    this.inputs = [];
    for (var i = 0; i < this.phaseBase.inputTypes.length; i++)
      this.inputs.push({get: getFunction(this.phaseBase.inputTypes[i]).bind(this)});
  } else {
    this.get = getFunction({key: this.phaseBase.inputKey, value: this.phaseBase.inputValue});
  }
  if (this.phaseBase.outputTypes !== undefined) {
    this.outputs = [];
    for (var i = 0; i < this.phaseBase.outputTypes.length; i++)
      this.outputs.push({put: putFunction(this.phaseBase.outputTypes[i]).bind(this)});
  } else {
    this.put = putFunction({key: this.phaseBase.outputKey, value: this.phaseBase.outputValue});
  }
  this.impl = impl;
}

PhaseBaseRuntime.prototype.toTraceInfo = function() {
  return {cat: 'phase', name: this.phaseBase.name};
};

PhaseBaseRuntime.prototype.setTags = function(tags) {
  this.baseTags = new Tags(tags);
  this.tags = this.baseTags;
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
  var inputDict = {};
  var outputDict = {};
  for (var i = 0; i < inRoutes.length; i++) {
    var typeVar = types.newTypeVar();
    for (var j = 0; j < inRoutes[i].length; j++)
      inputDict[inRoutes[i][j]] = {key: 'eto', value: inRoutes[i][j] + '', type: typeVar};
    for (var k = 0; k < outRoutes[i].length; k++)
      outputDict[outRoutes[i][k]] = {key: 'efrom', value: outRoutes[i][k] + '', type: typeVar};
  }
  var inputs = [];
  var outputs = [];
  for (var i = 0; i < Object.keys(inputDict).length; i++)
    inputs.push(inputDict[i]);
  for (var i = 0; i < Object.keys(outputDict).length; i++)
    outputs.push(outputDict[i]);

  var phase = new PhaseBase({
    name: 'routing',
    arity: 'N:N',
    inputs: inputs,
    outputs: outputs,
  }, function(stream) {
    for (var i = 0; i < inRoutes.length; i++) {
      var ins = inRoutes[i];
      var outs = outRoutes[i];
      for (var j = 0; j < ins.length; j++) {
        this.inputs[ins[j]].get(function(data) {
          for (var k = 0; k < outs.length; k++) {
            this.outputs[outs[k]].put(data);
          }
        }.bind(this));
      }
    }
  });
  return phase;
}

module.exports.PhaseBase = PhaseBase;
module.exports.pipeline = pipeline;
module.exports.routingPhase = routingPhase;
