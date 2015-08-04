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

function StatsWriter() {
  this.result = {
    element: 0,
    text: 0,
    attribute: 0,
    elements: {},
    maxDepth: 0,
    leaf: 0,
    inlineStyle: 0,
    classAttr: 0,
    idAttr: 0
  };
  this.currentDepth = 1;
  this.depths = 0;
  this.leafDepths = 0;
  this.pendingLeafDepth = 0;

}

StatsWriter.prototype.beginOpenElement = function(name) {
  if (name == 'base')
    return;
  this.result.element += 1;
  if (!(name in this.result.elements)) {
    this.result.elements[name] = 0;
  }
  this.result.elements[name] += 1;
  this.currentDepth += 1;
  if (this.currentDepth > this.result.maxDepth) {
    this.result.maxDepth = this.currentDepth;
  }
  this.depths += this.currentDepth;
  this.pendingLeafDepth = this.currentDepth;
}

StatsWriter.prototype.attribute = function(name, value) {
  this.result.attribute += 1;
  if (name == 'style') {
    this.result.inlineStyle += 1;
  }
  else if (name == 'class')
    this.result.classAttr += 1;
  else
    this.result.idAttr += 1;
}

StatsWriter.prototype.endOpenElement = function() {
}

StatsWriter.prototype.closeElement = function(name) {
  this.currentDepth -= 1;
  if (this.pendingLeafDepth > 0) {
    this.leafDepths += this.pendingLeafDepth;
    this.result.leaf += 1;
    this.pendingLeafDepth = 0;
  }
}

StatsWriter.prototype.text = function(text) {
  this.result.text += 1;
}

StatsWriter.prototype.comment = function(comment) {
}

StatsWriter.prototype.getHTML = function() {
  var result = "elements: " + this.result.element + "\n";
  result += "leaf elements: " + this.result.leaf + "\n";
  for (var element in this.result.elements) {
    result += '\t' + element + ': ' + this.result.elements[element] + '\n';
  }
  result += "text segments: " + this.result.text + "\nattributes: " + this.result.attribute + "\n";
  result += "  inline styles: " + this.result.inlineStyle + "\n";
  result += "  class attributes: " + this.result.classAttr + "\n";
  result += "  id attributes: " + this.result.idAttr + "\n";
  result += "max depth: " + this.result.maxDepth + "\n";
  result += "average depth: " + (this.depths / this.result.element) + "\n";
  result += "average leaf depth: " + (this.leafDepths / this.result.leaf) + "\n";

  return result;
}

module.exports = StatsWriter;
