var Promise = require('bluebird');
var options = require('../../core/options');
var spawn = require('child_process').spawn;

var chromiumPath = options.chromium;
if (!chromiumPath)
  throw new Error('Path to Chromium repo (--chromium=[path/to/cr/src]) is required.');

function Executable(cmd, args) {
  this.cmd = cmd;
  this.args = args;
}

Executable.prototype.toString = function() {
  return this.cmd + ' ' + this.args.join(' ');
}

Executable.prototype.run = function() {
  var child = spawn(this.cmd, this.args, {
    cwd: chromiumPath,
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
