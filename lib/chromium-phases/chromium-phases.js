/*
  Copyright 2015 Google Inc. All Rights Reserved.
  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at
      http://www.apache.org/licenses/LICENSE-2.0
  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

// This is where all phases, related to Chromium checkout and build should live.
// Interfacing with ninja, gclient, git cl? This is gthe spot.

var phase = require('../../core/register').phase;
var types = require('../../core/types');

var options = require('./chromium-options');
var Executable = require('./executable');

module.exports.buildChromium = phase({input: types.string, output: types.string, arity: '1:1', async: true},
  function(data, tags, cb) {
    var ninja = new Executable(options.path, 'ninja', [ '-C', 'out/' + options.buildConfig, options.buildTarget ]);
    return ninja.run().then(function(code) {
      if (code) {
        var errorMessage = '"' + ninja + '" returned a non-zero exit code "' + code + '".\nThis is likely a Chromium build error.';
        throw new Error(errorMessage);
      }
      return data;
    });
  });

module.exports.chromeBinary = phase({input: types.string, output: types.string, arity: '1:1', async: true},
    function(data, tags, cb) {
      var opts = this.phaseBase.runtime.options;
      var args = ['chrome-binary.py', '-v', opts.version, '-d', opts.chromium, '-a', opts.platform];
      var chromeBinary = new Executable(__dirname, 'python', args);

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
