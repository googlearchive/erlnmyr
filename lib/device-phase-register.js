var phase = require('../core/phase-register');
var types = require('../core/types');

function typeVar(s) { return function(v) {
  if (!v[s]) {
    v[s] = types.newTypeVar();
  }
  return v[s];
}; }

function browserTypeVar(s) {
  return function(v) {
    return types.Browser(typeVar(s)(v));
  }; }

module.exports = function(defaults, impl) {
  if (typeof defaults.input == 'string')
    defaults.input = browserTypeVar(defaults.input);
  else
    defaults.input = types.Browser(defaults.input);
  if (typeof defaults.output == 'string')
    defaults.output = browserTypeVar(defaults.output);
  else
    defaults.output = types.Browser(defaults.output);

  defaults.arity = "1:1";
  defaults.async = true;
  defaults.parallel = 1;

  return phase(defaults,
    function(browser) {
      return browser.execJS(String(impl));
    });
}
