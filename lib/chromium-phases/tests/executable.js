var assert = require('chai').assert;
var proxyquire = require('proxyquire');
var EventEmitter = require('events').EventEmitter;

function ChildProcessMock(cmd, args, path) {
  this.cmd = cmd;
  this.args = args;
  this.path = path;
  this.stdout = new EventEmitter();
  this.stderr = new EventEmitter();
}

ChildProcessMock.prototype = Object.create(EventEmitter.prototype);

ChildProcessMock.instance = null;

var Executable = proxyquire('../executable', {
  'child_process': {
    spawn: function(cmd, args, options) {
      var path = options.cwd;
      return ChildProcessMock.instance = new ChildProcessMock(cmd, args, path);
    }
  }
});

describe('Executable', function() {
  it('should take and set path, cmd, and args', function() {
    var executable = new Executable('path', 'cmd', 'args');
    assert.equal(executable.path, 'path');
    assert.equal(executable.cmd, 'cmd');
    assert.equal(executable.args, 'args');
  });

  it('should be able to handle empty args', function() {
    var executable = new Executable('path', 'cmd');
    assert.deepEqual(executable.args, []);
  });

  it('should have a nice string serialization', function() {
    var executable = new Executable('path', 'cmd', [ 'arg1', 'arg2' ]);
    assert.equal(executable.toString(), 'cmd arg1 arg2');
    assert.equal(executable + ' y', 'cmd arg1 arg2 y');

    executable = new Executable('path', 'cmd', []);
    assert.equal(executable.toString(), 'cmd');

    executable = new Executable('path', 'cmd');
    assert.equal(executable.toString(), 'cmd');
  });

  it('should correctly pass arguments to child_process.spawn', function() {
    var executable = new Executable('path', 'cmd', 'args');
    executable.run();
    assert.equal(ChildProcessMock.instance.cmd, 'cmd');
    assert.equal(ChildProcessMock.instance.path, 'path');
    assert.equal(ChildProcessMock.instance.args, 'args');
  });

  it('should resolve promise when \'close\' event is received', function(done) {
    var executable = new Executable('path', 'cmd');
    executable.run().then(function() {
      done();
    });
    ChildProcessMock.instance.emit('close');
  });

  it('should throw when unable to execute', function() {
    var executable = new Executable('path', 'cmd');
    assert.throws(function() {
      executable.run();
      ChildProcessMock.instance.emit('error');
    }, 'Unable to execute "[object Object]"\nIs your path correct?');
  });

  it('should accumulate data from stdout/stderr', function(done) {
    var executable = new Executable('path', 'cmd');
    executable.run().then(function() {
      done();
    });
    ChildProcessMock.instance.stdout.emit('data', 'a');
    ChildProcessMock.instance.stdout.emit('data', 'b');
    ChildProcessMock.instance.stderr.emit('data', 'c');
    ChildProcessMock.instance.stderr.emit('data', 'd');
    assert.equal(executable.stdout, 'ab');
    assert.equal(executable.stderr, 'cd');
    ChildProcessMock.instance.emit('close');
  })

});
