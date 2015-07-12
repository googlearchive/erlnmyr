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
  it('should know the top of the stack', function() {
    var writer = new CppWriter();
    assert.isNotNull(writer.top());
    assert.equal(writer.top().id, 0);

    writer.stack.push(2);
    assert.isNotNull(writer.top());
    assert.equal(writer.top(), 2);
  });

  describe('beinOpenElement', function() {
    it('should allocate a new stack item and add it to parent\'s children', function() {
      var writer = new CppWriter();
      writer.beginOpenElement('a');
      assert.equal(writer.stack.length, 2);
      assert.equal(writer.stack[0].children.length, 1);
      assert.equal(writer.stack[1].id, 1);
    });

    it('should increase current count', function() {
      var writer = new CppWriter();
      writer.beginOpenElement('a');
      assert.equal(writer.current, 1);
    });

    it('should invoke generator.beginOpenElement', function() {
      var writer = new CppWriter();
      writer.generator.beginOpenElement = function() { return 'b'; };
      writer.beginOpenElement('a');
      assert.deepEqual(writer.stack[1].result, [ 'b' ]);
    });
  });

  describe('attribute' , function() {
    it('should invoke generator.attribute', function() {
      var writer = new CppWriter();
      writer.generator.attribute = function() { return 'c'; }
      writer.attribute('a', 'b');
      assert.deepEqual(writer.stack[0].result, [ 'c' ]);
    });
  });

  describe('endOpenElement', function() {
    it('should do nothing', function() {
      var writer = new CppWriter();
      var resultBefore = writer.stack[0].result.slice(0);
      writer.endOpenElement();
      var resultAfter = writer.stack[0].result.slice(0);
      assert.deepEqual(resultBefore, resultAfter);
    });
  });

  describe('closeElement', function() {
    it('should pop the stack', function() {
      var writer = new CppWriter();
      writer.stack.push(null);
      writer.elementFunctionBody = function(value) {
        return value;
      }
      writer.closeElement();
      assert.equal(writer.stack.length, 1);
    });

    it('should invoke elementFunctionBody and append to parent stack item preceeding list', function() {
      var writer = new CppWriter();
      writer.stack[0].preceeding.push('a');
      writer.stack.push('b');
      writer.elementFunctionBody = function(value) {
        return value;
      }
      writer.closeElement();
      assert.deepEqual(writer.stack[0].preceeding, [ 'a', 'b' ]);
    });
  });

  describe('elementFunctionBody', function() {
    it('should assemble stack item into a function body', function() {
      var writer = new CppWriter();
      writer.generator.elementFunctionCallsite = function(value) {
        return value;
      }
      writer.generator.closeElement = function() {
        return 'r';
      }
      var result = writer.elementFunctionBody({
        children: [ { id: 'm'}, { id: 'y' }],
        preceeding: [ 'e', 'r' ],
        result: [ 'l', 'n' ],
      });
      assert.deepEqual([ 'e', 'r', 'l', 'n', 'm', 'y', 'r' ], result);
    });

    it('should know pass noReturnValue arg', function() {
      var writer = new CppWriter();
      writer.generator.elementFunctionCallsite = function() {
        return [];
      }
      writer.generator.closeElement = function(value) {
        return value;
      }
      var result = writer.elementFunctionBody({
        children: [],
        preceeding: [],
        result: [],
      }, true);
      assert.deepEqual([ true ], result);
    });
  });

  describe('text', function() {
    it('should invoke generator.text', function() {
      var writer = new CppWriter();
      writer.generator.text = function(value) {
        return value;
      }
      writer.text('a');
      assert.deepEqual([ 'a' ], writer.stack[0].result);
    });
  });

  describe('comment', function() {
    it('should invoke generator.comment', function() {
      var writer = new CppWriter();
      writer.generator.comment = function(value) {
        return value;
      }
      writer.comment('a');
      assert.deepEqual([ 'a' ], writer.stack[0].result);
    });
  });

  describe('getCode', function() {
    it('should assemble all results into code', function() {
      var writer = new CppWriter();
      writer.elementFunctionBody = function(item, mustBeTrue) {
        assert.isTrue(mustBeTrue);
        return 'body';
      }
      var result = writer.getCode();
      assert.equal('#include "config.h"\n#include "core/dom/Experiment.h"\n\n#include "core/dom/Comment.h"\n#include "core/dom/Document.h"\n#include "core/dom/Element.h"\n#include "core/dom/Text.h"\n\nnamespace blink {\n\nbody\n}\n', result);
    });
  });
});
