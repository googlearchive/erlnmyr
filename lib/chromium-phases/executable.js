var Promise = require('bluebird');
var spawn = require('child_process').spawn;

function Executable(options, cmd, args) {
  this.path = options.path;
  this.cmd = cmd;
  this.args = args;
}

Executable.prototype.toString = function() {
  return this.cmd + ' ' + this.args.join(' ');
}

Executable.prototype.run = function() {
  var child = spawn(this.cmd, this.args, {
    cwd: this.path,
    stdio: 'ignore',
  });
  child.on('error', function(err) {
    console.log('Unable to execute "' + this.toString() + '"');
    console.log('Is your path correct?');
  });
  return new Promise(function(resolve) {
    child.on('close', resolve);
  })
}

module.exports = Executable;
