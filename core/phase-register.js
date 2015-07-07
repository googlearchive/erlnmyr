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
    var infoClone = {name: info.name, arity: info.arity, async: info.async};
    var v = {};
    if (typeof info.input == 'function')
      infoClone.input = info.input(v);
    else
      infoClone.input = info.input;
    if (typeof info.output == 'function')
      infoClone.output = info.output(v);
    else
      infoClone.output = info.output;
    var options = override(defaults, options);
    return new phase.PhaseBase(infoClone, impl, options);
  }
}

module.exports = register;
module.exports.phases = phases;
