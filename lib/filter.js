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

function Filter() {
  this.recorder = new Recorder();
}

Filter.prototype.beginOpenElement = function(name) {
  if (name == 'base') {
    this.baseElement = true;
    return;
  }
  this.baseElement = false;
  this.recorder.push({nodeName: name});
}

Filter.prototype.attribute = function(name, value) {
  if (this.baseElement && name == 'href') {
    this.recorder.base(value);
    return;
  }
  this.recorder.attribute({name: name, value: value});
}


Filter.prototype.styleAttribute = function() {
  this.recorder.styleAttribute();
}

Filter.prototype.styleProperty = function(name, value) {
  this.recorder.styleProperty(name, value);
}

Filter.prototype.endOpenElement = function() {
}

Filter.prototype.closeElement = function(name) {
  if (this.baseElement)
    return;
  this.recorder.pop();
}

Filter.prototype.text = function(text) {
  this.recorder.text(text);
}

Filter.prototype.comment = function(comment) {
  this.recorder.comment(comment);
}

Filter.prototype.getHTML = function() {
  return this.recorder.saveJSON();
}

module.exports = Filter;
