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
    for (name in tasks) {
      var stageList = tasks[name].map(stageLoader.stageSpecificationToStage);
      stageLoader.typeCheck(stageList);
    }
  });

  // TODO: Once stage-loader has string names for all the fancy stages, roll the special gulpfile targets
  // into the standard ones and remove these two tests.
  it('should be possible to type check the ejs stage list', function() {
    stageLoader.typeCheck([
      stageLoader.stageSpecificationToStage({name: 'input', options: {data: 'dummy'}}),
      stageLoader.stageSpecificationToStage('fileToBuffer'),
      stageLoader.stageSpecificationToStage('bufferToString'),
      stageLoader.stageSpecificationToStage('ejsFabricator'),
      stageLoader.stageSpecificationToStage('writeStringFile')
    ]);
  });
  it('should be possible to type check the mhtml stage list', function() {
    stageLoader.typeCheck([
      stageLoader.stageSpecificationToStage('input'),
      stageLoader.stageSpecificationToStage('readDir'),
      stageLoader.stageSpecificationToStage('filter'),
      stageLoader.stageSpecificationToStage('fileToBuffer'),
      stageLoader.stageSpecificationToStage('bufferToString'),
      stageLoader.stageSpecificationToStage('jsonParse'),
      stageLoader.stageSpecificationToStage('HTMLWriter'),
      stageLoader.stageSpecificationToStage('regexReplace'),
      stageLoader.stageSpecificationToStage({name: 'writeStringFile', options: {tag: 'filename'}})
    ]);
  });
});
