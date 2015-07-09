// TODO: Fix the cyclic dependency so this isn't needed.
require('./core/stage-loader');
module.exports.phase = require('./core/phase-register');
module.exports.types = require('./core/types');
