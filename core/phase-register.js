var phase = require('./phase');

var phases = {};

function register(info, impl, defaults) {
  function override(defaults, options) {
    var result = {};
    for (key in defaults) {
      if (key in options) {
        try {
          result[key] = eval(options[key]);
        } catch (e) {
          result[key] = options[key];
        }
      } else {
        result[key] = defaults[key];
      }
    }
    return result;
  }
  phases[info.name] = function(options) {
    var options = override(defaults, options);
    return new phase.PhaseBase(info, impl, options);
  }
}

module.exports = register;
module.exports.phases = phases;
