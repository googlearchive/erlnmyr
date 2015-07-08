var phase = require('./phase');

function PhaseDefinition(info, impl, defaults) {
  this.info = info;
  this.impl = impl;
  this.defaults = defaults;
}

PhaseDefinition.prototype.build = function() {
  var defaults = this.defaults;
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

  var info = this.info;
  var impl = this.impl;
  return function(options) {
    var infoClone = {name: info.name, arity: info.arity, async: info.async, parallel: info.parallel};
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

var phases = {};

// TODO: Move load to a new 'module-loader' module.
function load(module) {
  for (var k in module) {
    var item = module[k];
    if (item instanceof PhaseDefinition) {
      item.info.name = k;
      phases[k] = item.build();
    }
  }
}

module.exports = function(info, impl, defaults) {
  return new PhaseDefinition(info, impl, defaults);
};
module.exports.phases = phases;
module.exports.load = load;
