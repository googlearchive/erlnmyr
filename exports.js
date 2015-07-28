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

'use strict';
module.exports.phase = require('./core/register').phase;
module.exports.alias = require('./core/register').alias;
module.exports.types = require('./core/types');
module.exports.run = function(file, loader) {
  var path = require('path');
  var stageLoader = require('./core/stage-loader');

  file = path.resolve(file);
  var phases = [
    {name: 'input', options: {data: file}},
    'fileToBuffer',
    'bufferToString',
    {name: 'doExperiment', options: {require: loader}},
  ].map(stageLoader.stageSpecificationToStage);

  process.on('exit', function() { require('./core/trace').dump() });
  stageLoader.processStages(phases, function() {
  }, function(e) {
    throw e;
  }, loader);
};
