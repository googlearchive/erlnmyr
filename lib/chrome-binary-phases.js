var register = require('../core/phase-register.js');
var types = require('../core/types');
var ChromeBinary = require('./chrome-binary');

register({name: 'chromeBinary', input: types.string, output: types.string, arity: '1:1', async: true},
    function(data) {
      var tags = this.tags;
      return new ChromeBinary(data, this.options).run().then(function(filename) {
        if (!filename)
          throw new Error('ChromeBinary returned a non-zero exit code');
        tags.tag('chromeBinary', filename);
        return data;
      });
    }, {
      version: "323860",
      chromium: "~/chromium/src",
      platform: "linux"
    });
