var phase = require('../core/register').phase;
var types = require('../core/types');

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

function CaptureController() {
  this.invocations = [];
}

CaptureController.prototype = {
  phaseInvoked: function(phaseRuntime, input, tags) {
    this.invocations.push(new InvocationEvent(phaseRuntime, input, tags));
  },
  getInvocations: function() {
    var result = this.invocations;
    this.invocations = [];
    return result;
  },
  dumpInvocations: function() {
    var events = this.getInvocations();
    events.forEach(function(event) {
      var log = 'phaseName: ' + event.phase.name + ' dataName: ' + event.input + ' trace: ' + JSON.stringify(event.tags.trace);
      if (event.tags.traceHistory !== undefined)
        log += ' traceHistory: ' + JSON.stringify(event.tags.traceHistory);
      console.log(log);
    });
  }
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

module.exports.t1To1 = phase({input: typeVar('a'), output: typeVar('a'), arity: '1:1'},
  function(input) {
    var trace = clone(this.tags.read('trace'));
    trace.push(new TraceDataItem(this, input));
    this.tags.tag('trace', trace);
    return input;
  });

module.exports.tNTo1 = phase({input: types.string, output: types.string, arity: 'N:1'},
  {
    onStart: function() {
      this.traces = [];
    },
    impl: function(input) {
      var trace = clone(this.tags.read('trace'));
      trace.push(new TraceDataItem(this, input));
      this.traces.push(trace);
    },
    onCompletion: function() {
      var name = dataName();
      this.tags.tag('trace', [new TraceDataItem(this, name)]);
      this.tags.tag('traceHistory', this.traces);
      return name;
    }
  });

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

module.exports.capture = phase({input: typeVar('a'), output: typeVar('a'), arity: '1:1'},
  function(input, tags) {
    controller.phaseInvoked(this, clone(input), clone(tags.tags));
    return input;
  });

