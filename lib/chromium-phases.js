var register = require('../core/phase-register.js');
var types = require('../core/types');

var spawn = require('child_process').spawn;
var options = require('../core/options');

register({name: 'buildChromium', input: types.string, output: types.string, arity: '1:1', async: true},
  function(data, tags, cb) {
    var chromiumPath = options.chromium;
    if (!chromiumPath)
      throw new Error('Path to Chromium repo (--chromium=[path/to/cr/src]) is required.');
    // TODO(dglazkov): Release/Debug and Target should be configurable #127.
    // TODO(dglazkov): Support building for android as well #127.
    var command = {
      cmd: 'ninja',
      args: [ '-C', 'out/Release', 'chrome' ],
      toString: function() {
        return this.cmd + ' ' + this.args.join(' ');
      }
    };
    var child = spawn(command.cmd, command.args, {
      cwd: chromiumPath,
      stdio: 'ignore',
    });
    child.on('error', function(err) {
      console.log('Unable to execute "' + command + '"');
      console.log('Is your path correct?');
    });
    // TODO(dglazkov): Report build success/failure #127.
    child.on('close', function(code) {
      if (code) {
        console.log('"' + command + '" returned a non-zero exit code.');
        console.log('This is likely a Chromium build error.');
      }
      cb();
    });
    return data;
  });

