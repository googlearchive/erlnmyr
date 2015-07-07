var assert = require('chai').assert;

var Executable = require('../executable');

describe('Executable', function() {
  it('should take and set path, cmd, and args', function() {
    var executable = new Executable({ path: 'path' }, 'cmd', 'args');
    assert.equal(executable.path, 'path');
    assert.equal(executable.cmd, 'cmd');
    assert.equal(executable.args, 'args');
  });
});
