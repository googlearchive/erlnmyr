// This is where all phases, related to Chromium checkout and build should live.
// Interfacing with ninja, gclient, git cl? This is gthe spot.

var phase = require('../../core/phase-register.js');
var types = require('../../core/types');

var options = require('./chromium-options');
var Executable = require('./executable');

module.exports.buildChromium = phase({input: types.string, output: types.string, arity: '1:1', async: true},
  function(data, tags, cb) {
    var ninja = new Executable(options, 'ninja', [ '-C', 'out/' + options.buildConfig, options.buildTarget ]);
    return ninja.run().then(function(code) {
      if (code) {
        var errorMessage = '"' + ninja + '" returned a non-zero exit code "' + code + '".\nThis is likely a Chromium build error.';
        throw new Error(errorMessage);
      }
      return data;
    });
  });

register({name: 'chromeBinary', input: types.string, output: types.string, arity: '1:1', async: true},
    function(data, tags, cb) {
      var opts = this.phaseBase.runtime.options;
      opts.path =  __dirname;
      var args = ['chrome-binary.py', '-v', opts.version, '-d', opts.chromium, '-a', opts.platform];
      var chromeBinary = new Executable(opts, 'python', args);

      return chromeBinary.run().then(function(code) {
        if (code)
          throw new Error('ChromeBinary returned a non-zero exit code' + chromeBinary.stderr);
        tags.tag('chromeBinary', chromeBinary.stdout);
        console.log('chromeBinary unzipped at ' + chromeBinary.stdout);
        return data;
      })

    }, {
      version: "323860",
      chromium: "~/chromium/src",
      platform: "linux"
    });
