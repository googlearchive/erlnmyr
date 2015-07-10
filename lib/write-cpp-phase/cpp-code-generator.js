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

function CppCodeGenerator() {}

CppCodeGenerator.templates = {
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
  ],
  beginOpenElement: [
    'static inline PassRefPtr<Element> makeElement', 1, '(Document& document, ExceptionState& exceptionState)\n',
    '{\n',
    '    RefPtr<Element> element = document.createElement("', 5, '", exceptionState);\n',
  ],
  closeElement: [
    '    return element;\n',
    '}\n',
    '',
  ],
  elementFunctionCallsite: [
    '    element->appendChild(makeElement', 1, '(document, exceptionState));'
  ],
  attribute: [
    '    element->setAttribute("', 1, '", "', 3, '", exceptionState);'
  ],
  text: [
    '    element->appendChild(document.createTextNode("', 1, '"));'
  ],
  comment: [
    '    element->appendChild(document.createComment("', 1, '"));'
  ],
  runExperiment: [
    'void runExperiment(Document& document)',
    '{',
    '    NonThrowableExceptionState exceptionState;',
    '    Element* element = document.documentElement();',
    '    element->removeChildren(OmitSubtreeModifiedEvent);',
  ],
  postamble: [
    '}',
    '',
  ],
};

CppCodeGenerator.prototype.beginOpenElement = function(id, name) {
  var template = CppCodeGenerator.templates.beginOpenElement;
  template[1] = id;
  template[5] = this.quote(name);
  return template.join('');
}

CppCodeGenerator.prototype.closeElement = function(noReturnValue) {
  var template = CppCodeGenerator.templates.closeElement;
  if (noReturnValue)
    template = template.slice(1);
  return template.join('');
}

CppCodeGenerator.prototype.elementFunctionCallsite = function(id) {
  var template = CppCodeGenerator.templates.elementFunctionCallsite;
  template[1] = id;
  return template.join('');
}

CppCodeGenerator.prototype.attribute = function(name, value) {
  var template = CppCodeGenerator.templates.attribute;
  template[1] = this.quote(name);
  template[3] = this.quote(value);
  return template.join('');
}

CppCodeGenerator.prototype.text = function(text) {
  var template = CppCodeGenerator.templates.text;
  template[1] = this.quote(text);
  return template.join('');
}

CppCodeGenerator.prototype.comment = function(comment) {
  var template = CppCodeGenerator.templates.comment;
  template[1] = this.quote(comment);
  return template.join('');
}

CppCodeGenerator.prototype.quote = function(s) {
  return s.replace(/\\/gm, '\\\\').replace(/"/gm, '\\"').replace(/\n/gm, '\\n');
}

module.exports = CppCodeGenerator;
