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

var CppWriter = require('../cpp-writer');

describe('CppWriter', function() {
  it('should generate code for elements', function() {
    var writer = new CppWriter();
    writer.current++;
    var code = writer.generateCodeForElement('div');
    assert.equal(code, '    RefPtr<Element> element1 = document.createElement("div", exceptionState);\n    element0->appendChild(element1);');
  });

  it('should generate code for attributes', function() {
    var writer = new CppWriter();
    var code = writer.generateCodeForAttribute('foo', 'bar');
    assert.equal(code, '    element0->setAttribute("foo", "bar", exceptionState);');

    var code = writer.generateCodeForAttribute('foo', 'bar\"');
    assert.equal(code, '    element0->setAttribute("foo", "bar\\"", exceptionState);');
  });

  it('should generate code for text nodes', function() {
    var writer = new CppWriter();
    writer.current++;
    var code = writer.generateCodeForText('text');
    assert.equal(code, '    RefPtr<Text> text1 = document.createTextNode("text");\n    element0->appendChild(text1);');
  });

  it('should generate code for comment nodes', function() {
    var writer = new CppWriter();
    writer.current++;
    var code = writer.generateCodeForComment('comment');
    assert.equal(code, '    RefPtr<Comment> comment1 = document.createComment("comment");\n    element0->appendChild(comment1);');
  });

  it('should correctly put together a preamble and postamble', function() {
    var writer = new CppWriter();
    var code = writer.getHTML();
    var expected = [].concat(CppWriter.templates.preamble, CppWriter.templates.postamble).join('\n');
    assert.equal(code, expected);
  });
});
