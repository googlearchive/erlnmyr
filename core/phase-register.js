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

var phase = require('./phase');
var options = require('./options'); // For eval to access.

function PhaseDefinition(info, impl, defaults) {
  this.info = info;
  this.impl = impl;
  this.defaults = defaults;
}

PhaseDefinition.prototype.build = function() {
  var defaults = this.defaults;
  function override(defaults, experimentOptions) {
    var result = {};
    for (key in defaults) {
      if (key in experimentOptions) {
        try {
          result[key] = eval(experimentOptions[key]);
        } catch (e) {
          result[key] = experimentOptions[key];
        }
      } else {
        result[key] = defaults[key];
      }
    }
    return result;
  }

  var info = this.info;
  var impl = this.impl;
  return function(experimentOptions) {
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
    var experimentOptions = override(defaults, experimentOptions);
    return new phase.PhaseBase(infoClone, impl, experimentOptions);
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
