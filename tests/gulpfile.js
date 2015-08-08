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

var assert = require('chai').assert;

var tasks = require('../gulpfile').tasks;
var stageLoader = require('../core/stage-loader');
var stream = require('../core/stream');

describe('basicTargetCoverage', function() {
  it('should be possible to at least type check the targets listed in gulpfile', function() {
    for (var name in tasks) {
      var stageList = stageLoader.loadPipeline(tasks[name]);
      stageLoader.typeCheck(stageList);
    }
  });

  it('should be possible to at least type check the tasks.erlnmyr file', function(done) {
    var stageList = [
      {name: 'input', options: {data: 'tasks.erlnmyr'}},
      'fileToBuffer',
      'bufferToString',
      'typeCheckExperiment',
    ];
    stageLoader.startPipeline(stageList).then(done);
  });
});
