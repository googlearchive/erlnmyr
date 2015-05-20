var assert = require('chai').assert;
var stageLoader = require('../../gulp-stage-loader');
var fancyStages = require('../../gulp-fancy-stages');
var types = require('../../gulp-types');
var experiment = require('../../gulp-experiment');

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
    output: types.unit
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
    input: types.Tuple(typeVar, typeVar),
    output: types.unit
  }
}

function fileComparisonPipeline(jsonFile, htmlFile) {
  return [
    fancyStages.immediate(undefined, types.unit),
    fancyStages.tee(),
    fancyStages.left(stageLoader.stageSpecificationToStage("JSON:" + jsonFile)),
    fancyStages.right(stageLoader.stageSpecificationToStage("file:" + htmlFile)),
    fancyStages.left(stageLoader.stageSpecificationToStage("HTMLWriter")),
    testMatch(),
  ];
}

function tokenizeDetokenizePipeline(jsonFile) {
  return [
    stageLoader.stageSpecificationToStage("JSON:" + jsonFile),
    fancyStages.tee(),
    fancyStages.left(stageLoader.stageSpecificationToStage("StyleTokenizerFilter")),
    fancyStages.left(stageLoader.stageSpecificationToStage("StyleDetokenizerFilter")),
    testMatch()
  ]
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

  it('simple json dumps should match prerendered html', function(done) {
    testPipeline(fileComparisonPipeline("tests/pipeline/simple.json", "tests/pipeline/simple.html"), done);
  });

  it('slightly more complicated json dumps should match prerendered html', function(done) {
    testPipeline(fileComparisonPipeline("tests/pipeline/inline-style.json", "tests/pipeline/inline-style.html"), done);
  });
});

describe('Style Tokenizer / Detokenizer', function() {
  it('should be idempotent in the absence of inline style', function(done) {
    testPipeline(tokenizeDetokenizePipeline("tests/pipeline/simple.json"), done);
  });

  it('should be idempotent in the presence of inline style', function(done) {
    testPipeline(tokenizeDetokenizePipeline("tests/pipeline/inline-style.json"), done);
  });
});

describe('experiment', function() {
  it('should be able to run', function(done) {
    testPipeline(['file:tests/pipeline/simple.exp', 'parseExperiment', 'experimentPhase'].map(stageLoader.stageSpecificationToStage), done);
  });
});
    
