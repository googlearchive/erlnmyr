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
var CppCodeGenerator = require('../cpp-code-generator');

describe('CppCodeGenerator', function() {
  it('should generate code for elements', function() {
    var generator = new CppCodeGenerator();
    var code;
    code = generator.beginOpenElement(1, 'div');
    assert.equal(code, 'static inline PassRefPtr<Element> makeElement1(Document& document, ExceptionState& exceptionState)\n{\n    RefPtr<Element> element = document.createElement("div", exceptionState);\n');
    code = generator.closeElement();
    assert.equal(code, '    return element;\n}\n');
    code = generator.closeElement(true);
    assert.equal(code, '}\n');
    code = generator.elementFunctionCallsite(1);
    assert.equal(code, '    element->appendChild(makeElement1(document, exceptionState));');
  });

  it('should generate code for attributes', function() {
    var generator = new CppCodeGenerator();
    var code = generator.attribute('foo', 'bar');
    assert.equal(code, '    element->setAttribute("foo", "bar", exceptionState);');

    var code = generator.attribute('foo', 'bar\"');
    assert.equal(code, '    element->setAttribute("foo", "bar\\"", exceptionState);');
  });

  it('should generate code for text nodes', function() {
    var generator = new CppCodeGenerator();
    generator.current++;
    var code = generator.text('text');
    assert.equal(code, '    element->appendChild(document.createTextNode("text"));');
  });

  it('should generate code for comment nodes', function() {
    var generator = new CppCodeGenerator();
    generator.current++;
    var code = generator.comment('comment');
    assert.equal(code, '    element->appendChild(document.createComment("comment"));');
  });

  it('should correctly put together a preamble and postamble', function() {
    var generator = new CppCodeGenerator();
    // var code = generator.getHTML();
    // var expected = [].concat(CppCodeGenerator.templates.preamble, CppCodeGenerator.templates.postamble).join('\n');
    // assert.equal(code, expected);
  });
});
