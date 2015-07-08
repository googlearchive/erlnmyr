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

function r(root, children) {
  root.textContent = '';
  children.forEach(function(child) {
    root.appendChild(child);
  });
}

function e(name, attributes, children) {
  var element = document.createElement(name);
  attributes.forEach(function(attribute) {
    element.setAttribute(attribute.name, attribute.value);
  });
  children.forEach(function(child) {
    element.appendChild(child);
  });
  return element;
}

function t(value) {
  return document.createTextNode(value);
}

function c(value) {
  return document.createComment(value);
}


function quote(s) {
  return s.replace(/\\/gm, '\\\\').replace(/"/gm, '\\"').replace(/\n/gm, '\\n').replace(/\<\/script/gm, '</sc\" + \"ript');
}

function JSWriter() {
  this.result = ['<!DOCTYPE html><body><script>\n', String(r), '\n', String(e), '\n', String(t), '\n', String(c), '\n', 'r(document.documentElement, ['];
}

JSWriter.prototype.beginOpenElement = function(name) {
  this.result.push('e("', name, '", [\n');
}

JSWriter.prototype.attribute = function(name, value) {
  this.result.push('{ name: "', quote(name), '", value: "', quote(value), '"},\n');
}

JSWriter.prototype.endOpenElement = function() {
  this.result.push('], [\n');
}

JSWriter.prototype.closeElement = function(name) {
  this.result.push(']),\n');
}

JSWriter.prototype.text = function(text) {
  this.result.push('t("', quote(text), '"),\n');
}

JSWriter.prototype.comment = function(comment) {
  this.result.push('c("', quote(comment), '"),\n');
}

JSWriter.prototype.getHTML = function() {
  this.result.push(']);\n</script></body>');
  return this.result.join('');
}

module.exports = JSWriter;