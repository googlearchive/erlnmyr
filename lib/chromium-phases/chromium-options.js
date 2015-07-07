
var options = require('../../core/options')

var chromiumPath = options.chromium;
if (!chromiumPath)
  throw new Error('Path to Chromium repo (--chromium=[path/to/cr/src]) is required.');

module.exports = {
  path: chromiumPath,
  buildConfig: options.chromiumBuildConfig || 'Release',
  buildTarget: options.chromiumBuildTarget || 'chrome'
}
