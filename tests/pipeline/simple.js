var assert = require('chai').assert;
var stageLoader = require('../../gulp-stage-loader');
var fancyStages = require('../../gulp-fancy-stages');
var types = require('../../gulp-types');

function testPipeline(stageList, incb) {
  var cb = function(data) { incb(); };
  stageLoader.processStages(stageList, cb, function(e) { throw e; });
};

function testOutput(expectedResult) {
  return {
    impl: function(data, cb) {
      assert.deepEqual(expectedResult, data);
      cb();
    },
    name: 'testOutput',
    input: types.newTypeVar(),
    output: 'unit'
  }
}

function testMatch() {
  var typeVar = types.newTypeVar();
  return {
    impl: function(data, cb) {
      assert.deepEqual(data.right, data.left);
      cb();
    },
    name: 'testMatch',
    input: '(' + typeVar + ',' + typeVar + ')',
    output: 'unit'
  }
}

// TODO: glob these so we can automatically test lots of inputs/outputs.

describe('Simple Pipeline', function() {
  it('should generate valid html', function(done) {
    var output = testOutput('<!DOCTYPE html><base href="http://localhost:8000/simple.html"><html><head>\n<style>\n.a {\n  background: red;\n  width: 100px;\n  height: 100px;\n}\n</style>\n</head><body><div class="a">This is some text in a div</div>\n</body></html>');
    var pipeline = ["JSON:tests/pipeline/simple.json", "HTMLWriter"];
    pipeline = pipeline.map(stageLoader.stageSpecificationToStage);
    pipeline.push(output);
    testPipeline(pipeline, done);
  });

  it('should match prerendered html', function(done) {
    testPipeline([
      fancyStages.immediate(''),
      fancyStages.tee(),
      fancyStages.left(stageLoader.stageSpecificationToStage("JSON:tests/pipeline/simple.json")),
      fancyStages.right(stageLoader.stageSpecificationToStage("file:tests/pipeline/simple.html")),
      fancyStages.left(stageLoader.stageSpecificationToStage("HTMLWriter")),
      testMatch(),
    ], done);
  });
});

