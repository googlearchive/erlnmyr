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

  function Variables() {
  }

  phases[info.name] = function(options) {
    var implClone = {name: impl.name, arity: impl.arity};
    var v = new Variables();
    if (typeof impl.input == 'function')
      implClone.input = impl.input(v);
    else
      implClone.input = impl.input;
    if (typeof impl.output == 'function')
      implClone.output = impl.output(v);
    else
      implClone.output = impl.output;
    var options = override(defaults, options);
    return new phase.PhaseBase(info, implClone, options);
  }
}

module.exports = register;
module.exports.phases = phases;
