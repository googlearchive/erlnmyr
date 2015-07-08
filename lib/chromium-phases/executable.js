var Promise = require('bluebird');
var spawn = require('child_process').spawn;

function Executable(path, cmd, args) {
  this.path = path;
  this.cmd = cmd;
  this.args = args || [];
  this.stdout = '';
  this.stderr = '';
}

Executable.prototype.toString = function() {
  return [].concat(this.cmd, this.args).join(' ');
}

Executable.prototype.run = function() {
  var child = spawn(this.cmd, this.args, {
    cwd: this.path,
  });

  child.on('error', function(err) {
    var errorMessage = 'Unable to execute "' + this.toString() + '"\nIs your path correct?';
    throw new Error(errorMessage);
  }.bind(this));

  child.stdout.on('data', function(data) {
    this.stdout += data;
  }.bind(this));

  child.stderr.on('data', function(data) {
    this.stderr += data;
  }.bind(this));

  return new Promise(function(resolve) {
    child.on('close', function(code) {
      resolve(code);
    });
  });
}

module.exports = Executable;
