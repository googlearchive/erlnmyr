var assert = require('chai').assert;
var Promise = require('bluebird');
var proxyquire = require('proxyquire').noCallThru();

var types = require('../../../core/types');

function ExecutableMock(path, cmd, args) {
  this.path = path;
  this.cmd = cmd;
  this.args = args;
  ExecutableMock.instance = this;
}

ExecutableMock.exitCode = 0;

ExecutableMock.prototype.run = function() {
  var code = ExecutableMock.exitCode;
  return new Promise(function(resolve) {
    resolve(code);
  });
}

ExecutableMock.prototype.toString = function() {
  return 'ExecutableMock';
}

var ChromiumPhases = proxyquire('../chromium-phases', {
  '../../core/phase-register': function(options, func) {
    return { options: options, func: func };
  },
  './executable': ExecutableMock,
  './chromium-options': {
    path: 'path',
    buildConfig: 'config',
    buildTarget: 'target',
  },
});

describe('buildChromium', function() {
  it('should initialize as a string-based, 1:1, async phase', function() {
    var phase = ChromiumPhases.buildChromium;
    assert.equal(phase.options.input, types.string);
    assert.equal(phase.options.output, types.string);
    assert.equal(phase.options.arity, '1:1');
    assert.equal(phase.options.async, true);
  });

  it('should create a ninja executable', function(done) {
    var phase = ChromiumPhases.buildChromium;
    phase.func().then(function() {
      assert.equal(ExecutableMock.instance.path, 'path');
      assert.equal(ExecutableMock.instance.cmd, 'ninja');
      assert.deepEqual(ExecutableMock.instance.args, [
        '-C',
        'out/config',
        'target'
      ]);
      done();
    });
  });

  it('should throw when executable returns non-zero exit code', function(done) {
    var phase = ChromiumPhases.buildChromium;
    ExecutableMock.exitCode = 42;
    phase.func().catch(function(err) {
      assert.equal(err.message, '"ExecutableMock" returned a non-zero exit code "42".\nThis is likely a Chromium build error.');
      ExecutableMock.exitCode = 0;
      done();
    });
  });

  it('should pass data along', function() {
    var phase = ChromiumPhases.buildChromium;
    phase.func('data').then(function(data) {
      assert.equal(data, 'data');
    });
  });
});
