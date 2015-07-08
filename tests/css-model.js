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

var CSSModel = require('../lib/css-model');
var Recorder = require('../lib/recorder');

function stylePV(property, value) {
  return {t: 'sp', n: property, v: value};
}

describe('parseStyleDeclaration', function() {
  it('should extract a single declaration, with or without semicolon', function() {
    var recorder = new Recorder();
    CSSModel.parseStyleDeclaration("background-color: red", recorder);
    assert.deepEqual([stylePV('background-color', 'red')], recorder.log);

    recorder = new Recorder();
    CSSModel.parseStyleDeclaration("border: solid 1px black;", recorder);
    assert.deepEqual([stylePV('border', 'solid 1px black')], recorder.log);
  });

  it('should extract multiple declarations, with and without terminating semicolon', function() {
    var recorder = new Recorder();
    CSSModel.parseStyleDeclaration("background-color: red; border: solid 1px black", recorder);
    assert.deepEqual([stylePV('background-color', 'red'), stylePV('border', 'solid 1px black')], recorder.log);

    recorder = new Recorder();
    CSSModel.parseStyleDeclaration("border: solid 1px black; background-color: red;", recorder);
    assert.deepEqual([stylePV('border', 'solid 1px black'), stylePV('background-color', 'red')], recorder.log);
  }); 

  it('should not treat semicolons inside functions as delimiters', function() {
    var recorder = new Recorder();
    CSSModel.parseStyleDeclaration("background: url(http://example.com/foo;bar); color: green;", recorder);
    assert.deepEqual([stylePV('background', 'url(http://example.com/foo;bar)'), stylePV('color', 'green')], recorder.log);
  });

  it('should leap tall spaces in a single bound', function() {
    var recorder = new Recorder();
    CSSModel.parseStyleDeclaration("font:       times new roman 16px          ;   color          :   green     ;", recorder);
    assert.deepEqual([stylePV('font', 'times new roman 16px'), stylePV('color', 'green')], recorder.log);
  });
});
