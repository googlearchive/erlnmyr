// This is where all phases, related to Chromium checkout and build should live.
// Interfacing with ninja, gclient, git cl? This is gthe spot.

var register = require('../../core/phase-register.js');
var types = require('../../core/types');

var options = require('./chromium-options');
var Executable = require('./executable');

register({name: 'buildChromium', input: types.string, output: types.string, arity: '1:1', async: true},
  function(data, tags, cb) {
    var ninja = new Executable('ninja', [ '-C', 'out/' + options.buildConfig, options.buildTarget ]);
    return ninja.run().then(function(code) {
      if (code) {
        var errorMessage = '"' + ninja + '" returned a non-zero exit code "' + code + '".\nThis is likely a Chromium build error.';
        throw new Error(errorMessage);
      }
      return data;
    });
  });

