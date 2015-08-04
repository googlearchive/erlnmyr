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
var proxyquire = require('proxyquire').noCallThru();

var types = require('../../../core/types');

function FakeTreeBuilder() {
  this.data = null;
}

FakeTreeBuilder.prototype.build = function(data) {
  this.data = data;
}

FakeTreeBuilder.prototype.write = function(writer) {
  writer.data = this.data;
}

function FakeCppWriter() {
  this.data = null;
}

FakeCppWriter.prototype.getCode = function() {
  return this.data;
}

var writeCppFunction = proxyquire('../write-cpp-function', {
  '../../core/register': {
      'phase': function(options, func) {
        return { options: options, func: func };
      }
  },
  '../tree-builder': FakeTreeBuilder,
  './cpp-writer': FakeCppWriter
}).writeCppFunction;

describe('writeCppFunction', function() {
  it('should initalize as a JSON->string, 1:1, synchronous phase', function() {
    assert.equal(types.JSON, writeCppFunction.options.input);
    assert.equal(types.string, writeCppFunction.options.output);
    assert.equal('1:1', writeCppFunction.options.arity);
    assert.notOk(writeCppFunction.options.async);
  });

  it('should invoke CppWriter and TreeBuilder', function() {
    var result = writeCppFunction.func('a');
    assert.equal('a', result);
  })
});
