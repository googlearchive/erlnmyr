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

var StyleDetokenizerFilter = require('../lib/style-detokenizer-filter');
var TreeBuilder = require('../lib/tree-builder');

describe('StyleDetokenizerFilter', function() {
  it('should detokenize style tokens', function() {

    var data = [
      { t: 'n', n: 'div' },
      { t: 's' },
      { t: 'sp', n: 'width', v: '100%' },
      { t: 'sp', n: 'height', v: '30%' },
      { t: 'sp', n: 'background', v: 'red' },
      { t: '/' },
      { t: 'a', n: 'id', v: 'test' },
      { t: '/' },
    ];

    var filter = new StyleDetokenizerFilter();
    var treeBuilder = new TreeBuilder(filter);
    treeBuilder.build(data);
    treeBuilder.write(filter);

    var expectedResult = [
      { t: 'n', n: 'div' },
      { t: 'a', n: 'id', v: 'test' },
      { t: 'a', n: 'style', v: 'width: 100%;height: 30%;background: red;' },
      { t: '/' },
    ];

    assert.deepEqual(expectedResult, filter.recorder.log);
  });
});
