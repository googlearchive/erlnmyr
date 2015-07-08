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

function HTMLWriter() {
  this.result = [ '<!DOCTYPE html>' ];
  this.selfClosingElements = [ 'area', 'base', 'br', 'col', 'command', 'embed', 'hr', 'img', 'input', 'keygen', 'link', 'meta', 'param', 'source', 'track', 'wbr' ];
}

HTMLWriter.prototype.beginOpenElement = function(name) {
  this.result.push('<', name.toLowerCase());
}

HTMLWriter.prototype.attribute = function(name, value) {
  this.result.push(' ', name, '="', value, '"');
}

HTMLWriter.prototype.endOpenElement = function() {
  this.result.push('>');
}

HTMLWriter.prototype.closeElement = function(name) {
  var printedName = name.toLowerCase();
  if (this.selfClosingElements.indexOf(printedName) >= 0)
    return;

  this.result.push('</', printedName, '>');
}

HTMLWriter.prototype.text = function(text) {
  this.result.push(text);
}

HTMLWriter.prototype.comment = function(comment) {
  this.result.push('<!--', comment, '-->');
}

HTMLWriter.prototype.getHTML = function() {
  return this.result.join('');
}

module.exports = HTMLWriter;