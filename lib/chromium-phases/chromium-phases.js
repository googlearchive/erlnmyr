// This is where all phases, related to Chromium checkout and build should live.
// Interfacing with ninja, gclient, git cl? This is gthe spot.

var Promise = require('bluebird');
var register = require('../core/phase-register.js');
var types = require('../core/types');

var spawn = require('child_process').spawn;
var options = require('../core/options');

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
  return new Promise(function(resolve, reject) {
    child.on('close', resolve);
  })
}

register({name: 'buildChromium', input: types.string, output: types.string, arity: '1:1', async: true},
  function(data, tags, cb) {
    var chromiumBuildConfig = options.chromiumBuildConfig || 'Release';
    var chromiumBuildTarget = options.chromiumBuildTarget || 'chrome';
    // TODO(dglazkov): Support building for android as well #127.
    var ninja = new Executable('ninja', [ '-C', 'out/' + chromiumBuildConfig, chromiumBuildTarget ]);
    return ninja.run().then(function(code) {
      if (code) {
        var errorMessage = '"' + ninja + '" returned a non-zero exit code "' + code + '".\nThis is likely a Chromium build error.';
        throw new Error(errorMessage);
      }
      return data;
    });
  });

