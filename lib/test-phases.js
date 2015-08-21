var phase = require('../core/register').phase;
var types = require('../core/types');
var Promise = require('bluebird');

function typeVar(s) { return (function(v) {
  if (!v[s]) {
    v[s] = types.newTypeVar();
  }
  return v[s];
}); }

function TraceDataItem(phase, name) {
  this.name = name;
  this.phase = {name: phase.phaseBase.name, id: phase.phaseBase.id};
}

function InvocationEvent(runtime, input, tags) {
  this.phase = runtime.phaseBase;
  this.input = input;
  this.tags = tags;
}

function StartEvent(runtime) {
  this.phase = runtime.phaseBase;
}

function EndEvent(runtime) {
  this.phase = runtime.phaseBase;
}

function CaptureController() {
  this.invocations = [];
}

CaptureController.prototype = {
  phaseInvoked: function(phaseRuntime, input, tags) {
    this.invocations.push(new InvocationEvent(phaseRuntime, input, tags));
  }, 
  phaseStarted: function(phaseRuntime) {
    this.invocations.push(new StartEvent(phaseRuntime));
  },
  phaseEnded: function(phaseRuntime) {
    this.invocations.push(new EndEvent(phaseRuntime));
  },
  getInvocations: function() {
    var result = this.invocations;
    this.invocations = [];
    return result;
  },
  dumpInvocations: function() {
    var events = this.getInvocations();
    events.forEach(function(event) {
      if (event instanceof InvocationEvent) {
        var log = 'phaseName: ' + event.phase.name + ':' + event.phase.id + ' dataName: ' + event.input + ' trace: ' + JSON.stringify(event.tags.trace);
        if (event.tags.traceHistory !== undefined)
          log += ' traceHistory: ' + JSON.stringify(event.tags.traceHistory);
      } else if (event instanceof StartEvent) {
	var log = 'START phaseName: ' + event.phase.name + ':' + event.phase.id;
      } else if (event instanceof EndEvent) {
	var log = 'END phaseName: ' + event.phase.name + ':' + event.phase.id;
      }
      console.log(log);
    });
  },
  StartEvent: StartEvent,
  EndEvent: EndEvent,
  InvocationEvent: InvocationEvent
}

var controller = new CaptureController();
module.exports.controller = controller;

var lastID_ = 0;
function dataName() {
  return 'd' + (lastID_++);
}

module.exports.t0ToN = phase({input: types.unit, output: types.string, arity: '0:N'},
  function() {
    for (var i = 0; i < this.options.items; i++) {
      var name = dataName();
      this.tags.tag('trace', [new TraceDataItem(this, name)]);
      this.sendData(name);
    }
  },
  { items: 1 });

module.exports.t1ToN = phase({input: types.string, output: types.string, arity: '1:N'},
  function(input, tags) {
    for (var i = 0; i < this.options.items; i++) {
      var name = dataName();
      var trace = clone(tags.read('trace')) || [];
      trace.push(new TraceDataItem(this, name));
      this.put(name).tag('trace', trace);
    }
  },
  { items: 1 });

module.exports.t1To1 = phase({input: typeVar('a'), output: typeVar('a'), arity: '1:1'},
  function(input, tags) {
    if (this.options.capture)
      controller.phaseInvoked(this, clone(input), clone(tags.tags));
    var trace = clone(tags.read('trace')) || [];
    trace.push(new TraceDataItem(this, input));
    tags.tag('trace', trace);
    return input;
  },
  { capture: false });

module.exports.t1To1Async = phase({input: typeVar('a'), output: typeVar('a'), arity: '1:1', async: true},
  function(input, tags) {
    if (this.options.capture) {
      var phase = this;
      var result = new Promise(function(resolve, reject) {
	controller.asyncPhaseInvoked(phase, clone(input), clone(tags.tags),
	  function() {
	    var trace = clone(tags.read('trace')) || [];
	    trace.push(new TraceDataItem(phase, input));
	    tags.tag('trace', trace)
	    resolve(input);
	  }, reject);
      });
      return result;
    }
    var trace = clone(tags.read('trace')) || [];
    trace.push(new TraceDataItem(phase, input));
    tags.tag('trace', trace)
    return Promise.resolve(input);
  },
  { capture: false; });
      

module.exports.tNTo1 = phase({input: types.string, output: types.string, arity: 'N:1'},
  {
    onStart: function() {
      if (this.options.capture)
	controller.phaseStarted(this);
      this.traces = [];
    },
    impl: function(input, tags) {
      if (this.options.capture)
	controller.phaseInvoked(this, clone(input), clone(tags.tags));
      var trace = clone(this.tags.read('trace'));
      trace.push(new TraceDataItem(this, input));
      this.traces.push(trace);
    },
    onCompletion: function() {
      if (this.options.capture)
	controller.phaseEnded(this);
      var name = dataName();
      this.tags.tag('trace', [new TraceDataItem(this, name)]);
      this.tags.tag('traceHistory', this.traces);
      return name;
    }
  },
  {capture: false});

function clone(x) {
  if (typeof x == 'object') {
    if (x instanceof Array) {
      return x.map(clone);
    }
    var r = {};
    for (var k in x) {
      r[k] = clone(x[k]);
    }
    return r;
  }
  return x;
}

