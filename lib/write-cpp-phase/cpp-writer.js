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


function CppWriter() {
  this.current = 0;
  this.stack = [ 0 ];
  this.results = [];
}

CppWriter.templates = {
  preamble: [
    '#include "config.h"',
    '#include "core/dom/Experiment.h"',
    '',
    '#include "core/dom/Comment.h"',
    '#include "core/dom/Document.h"',
    '#include "core/dom/Element.h"',
    '#include "core/dom/Text.h"',
    '',
    'namespace blink {',
    '',
    'void runExperiment(Document& document)',
    '{',
    '    NonThrowableExceptionState exceptionState;',
    '    Element* element0 = document.documentElement();',
    '    element0->removeChildren(OmitSubtreeModifiedEvent);',
  ],
  beginOpenElement: [
    '    RefPtr<Element> element', 1, ' = document.createElement("', 3, '", exceptionState);\n',
    '    element', 6, '->appendChild(element', 8, ');'
  ],
  attribute: [
    '    element', 1, '->setAttribute("', 3, '", "', 5, '", exceptionState);'
  ],
  text: [
    '    RefPtr<Text> text', 1, ' = document.createTextNode("', 3, '");\n',
    '    element', 6, '->appendChild(text', 8, ');'
  ],
  comment: [
    '    RefPtr<Comment> comment', 1, ' = document.createComment("', 3, '");\n',
    '    element', 6, '->appendChild(comment', 8, ');'
  ],
  postamble: [
    '}',
    '',
    '}',
    '',
  ],
};

CppWriter.prototype.generateCodeForElement = function(name) {
  var template = CppWriter.templates.beginOpenElement;
  template[1] = this.current;
  template[3] = this.quote(name);
  template[6] = this.top();
  template[8] = this.current;
  return template.join('');
}

CppWriter.prototype.generateCodeForAttribute = function(name, value) {
  var template = CppWriter.templates.attribute;
  template[1] = this.current;
  template[3] = this.quote(name);
  template[5] = this.quote(value);
  return template.join('');
}

CppWriter.prototype.generateCodeForText = function(text) {
  var template = CppWriter.templates.text;
  template[1] = this.current;
  template[3] = this.quote(text);
  template[6] = this.top();
  template[8] = this.current;
  return template.join('');
}

CppWriter.prototype.generateCodeForComment = function(comment) {
  var template = CppWriter.templates.comment;
  template[1] = this.current;
  template[3] = this.quote(comment);
  template[6] = this.top();
  template[8] = this.current;
  return template.join('');
}

CppWriter.prototype.quote = function(s) {
  return s.replace(/\\/gm, '\\\\').replace(/"/gm, '\\"').replace(/\n/gm, '\\n');
}

CppWriter.prototype.top = function() {
  return this.stack[this.stack.length - 1];
}

CppWriter.prototype.beginOpenElement = function(name) {
  this.current++;
  this.results.push(this.generateCodeForElement(name));
  this.stack.push(this.current);
}

CppWriter.prototype.attribute = function(name, value) {
  this.results.push(this.generateCodeForAttribute(name, value));
}

CppWriter.prototype.endOpenElement = function() {
}

CppWriter.prototype.closeElement = function(name) {
  this.stack.pop();
}

CppWriter.prototype.text = function(text) {
  this.current++;
  this.results.push(this.generateCodeForText(text));
}

CppWriter.prototype.comment = function(comment) {
  this.current++;
  this.results.push(this.generateCodeForComment(comment));
}

CppWriter.prototype.getHTML = function() {
  this.results = [].concat(CppWriter.templates.preamble, this.results, CppWriter.templates.postamble);
  return this.results.join('\n');
}

module.exports = CppWriter;
