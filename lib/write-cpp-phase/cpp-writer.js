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
var CppCodeGenerator = require('./cpp-code-generator');

function StackItem(id) {
  this.id = id;
  this.preceeding = [];
  this.result = [];
  this.children = [];
}

function CppWriter() {
  this.current = 0;
  this.stack = [ new StackItem(0) ];
  this.generator = new CppCodeGenerator();
}

CppWriter.prototype.top = function() {
  return this.stack[this.stack.length - 1];
}

CppWriter.prototype.beginOpenElement = function(name) {
  var parentStackItem = this.top();
  var stackItem = new StackItem(++this.current);
  parentStackItem.children.push(stackItem);
  this.stack.push(stackItem);
  stackItem.result.push(this.generator.beginOpenElement(stackItem.id, name));
}

CppWriter.prototype.attribute = function(name, value) {
  this.top().result.push(this.generator.attribute(name, value));
}

CppWriter.prototype.endOpenElement = function() {
}

CppWriter.prototype.closeElement = function(name) {
  var stackItem = this.stack.pop();
  var parentStackItem = this.top();
  parentStackItem.preceeding = parentStackItem.preceeding.concat(
    this.elementFunctionBody(stackItem));
}

CppWriter.prototype.elementFunctionBody = function(stackItem, noReturnValue) {
  var callsites = stackItem.children.map(function(child) {
    return this.generator.elementFunctionCallsite(child.id);
  }, this);

  return [].concat(
    stackItem.preceeding,
    stackItem.result,
    callsites,
    this.generator.closeElement(noReturnValue));
}

CppWriter.prototype.text = function(text) {
  this.current++;
  this.top().result.push(this.generator.text(text));
}

CppWriter.prototype.comment = function(comment) {
  this.current++;
  this.top().result.push(this.generator.comment(comment));
}

CppWriter.prototype.getHTML = function() {
  var stackItem = this.top();
  stackItem.result = CppCodeGenerator.templates.runExperiment;
  var results = [].concat(
    CppCodeGenerator.templates.preamble,
    this.elementFunctionBody(stackItem, true),
    CppCodeGenerator.templates.postamble);
  return results.join('\n');
}

module.exports = CppWriter;
