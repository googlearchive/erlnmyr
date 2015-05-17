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
