var assert = require('chai').assert;

var StyleTokenizerFilter = require('../lib/style-tokenizer-filter');
var TreeBuilder = require('../lib/tree-builder');

describe('StyleTokenizerFilter', function() {
  it('should tokenize style attribute', function() {
    var data = [
      { t: 'n', n: 'div' },
      { t: 'a', n: 'style', v: 'width: 100%; height: 30%; background: red' },
      { t: 'a', n: 'id', v: 'test' },
      { t: '/' },
    ];

    var filter = new StyleTokenizerFilter();
    var treeBuilder = new TreeBuilder(filter);
    treeBuilder.build(data);
    treeBuilder.write(filter);

    var expectedResult = [
      { t: 'n', n: 'div' },
      { t: 's' },
      { t: 'sp', n: 'width', v: '100%' },
      { t: 'sp', n: 'height', v: '30%' },
      { t: 'sp', n: 'background', v: 'red' },
      { t: '/' },
      { t: 'a', n: 'id', v: 'test' },
      { t: '/' },
    ];

    assert.deepEqual(expectedResult, filter.recorder.log);
  });
});