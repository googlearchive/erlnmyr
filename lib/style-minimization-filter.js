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

var Filter = require('./filter');
var CSSModel = require('./css-model');

function StyleMinimizationFilter() {
  Filter.call(this);
  this.styles = {};
  this.classID = 0;
}

StyleMinimizationFilter.prototype = Object.create(Filter.prototype);
StyleMinimizationFilter.prototype.constructor = StyleMinimizationFilter;

StyleMinimizationFilter.prototype.newClass = function() {
  var id = this.classID;
  this.classID += 1;
  return "__style_min_" + id;
  this.classes = [];
}

StyleMinimizationFilter.prototype.beginOpenElement = function(name) {
  this.classes = [];
  Filter.prototype.beginOpenElement.call(this, name);
}

StyleMinimizationFilter.prototype.attribute = function(name, value) {
  if (name == 'style') {
    var className = this.styles[value];
    if (className == undefined) {
      className = this.newClass();
      this.styles[value] = className;
    }
    this.classes.push(className);
    return;
  }
  if (name == 'class') {
    this.classes.push(value);
    return;
  }

  Filter.prototype.attribute.call(this, name, value);
}

StyleMinimizationFilter.prototype.endOpenElement = function() {
  Filter.prototype.attribute.call(this, 'class', this.classes.join(' '));
  Filter.prototype.endOpenElement.call(this);
}

StyleMinimizationFilter.prototype.getHTML = function() {
  var log = this.recorder.log;
  this.recorder.log = [log[0]];
  log = log.slice(1, log.length);

  this.beginOpenElement('STYLE');
  this.endOpenElement();
  var text = "";
  for (var style in this.styles) {
    text += '.' + this.styles[style] + " {" + style + "}\n";
  }
  this.text(text);
  this.closeElement();
  this.recorder.log = this.recorder.log.concat(log);
  return Filter.prototype.getHTML.call(this);
}

module.exports = StyleMinimizationFilter;
