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

var Recorder = require('./recorder');

function Fabricator() {
  this.recorder = new Recorder();
}

Fabricator.prototype.element = function(name, args) {
  this.recorder.push({nodeName: name});
  for (var arg in args)
    this.recorder.attribute({name: arg, value: args[arg]});
}

Fabricator.prototype.base = function() {
  this.recorder.base('');
}

Fabricator.prototype.text = function(text) {
  this.recorder.text(text);
}

Fabricator.prototype.pop = function() {
  this.recorder.pop();
}

Fabricator.prototype.fabricate = function() {
  return this.recorder.saveJSON();
}

module.exports = Fabricator;
