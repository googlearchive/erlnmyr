var assert = require('chai').assert;
var stageLoader = require('../../core/stage-loader');
var stages = require('../../core/stages');
var types = require('../../core/types');
var experiment = require('../../core/experiment');
var stream = require('../../core/stream');

function testPipeline(stageList, incb) {
  var cb = function(data) { incb(); };
  stageLoader.processStages(stageList, cb, function(e) { throw e; });
};

function testOutput(expectedResult) {
  return {
    impl: function(data, cb) {
      assert.deepEqual(expectedResult, data.data[0].data);
      cb();
    },
    name: 'testOutput',
    input: types.newTypeVar(),
    output: types.unit
  }
}

function fileComparisonPipeline(jsonFile, htmlFile) {
  return [
    stageLoader.stageSpecificationToStage({name: 'input', options: {data: jsonFile}}),
    stageLoader.stageSpecificationToStage('fileToBuffer'),
    stageLoader.stageSpecificationToStage('bufferToString'),
    stageLoader.stageSpecificationToStage('jsonParse'),
    stageLoader.stageSpecificationToStage("HTMLWriter"),
    stageLoader.stageSpecificationToStage({name: 'updateTag', options: {tag: 'data', in: /.*/, out: htmlFile}}),
    stageLoader.stageSpecificationToStage({name: 'compare', options: {tag: 'data'}})
  ];
}

function tokenizeDetokenizePipeline(jsonFile) {
  return [
    stageLoader.stageSpecificationToStage({name: 'input', options: {data: jsonFile}}),
    stageLoader.stageSpecificationToStage('fileToBuffer'),
    stageLoader.stageSpecificationToStage('bufferToString'),
    stageLoader.stageSpecificationToStage('jsonParse'),
    stageLoader.stageSpecificationToStage("StyleTokenizerFilter"),
    stageLoader.stageSpecificationToStage("StyleDetokenizerFilter"),
    stageLoader.stageSpecificationToStage({name: 'compare', options: {tag: 'data'}})
  ]
}

// TODO: glob these so we can automatically test lots of inputs/outputs.

describe('Simple Pipeline', function() {
  it('should generate valid html', function(done) {
    var output = testOutput('<!DOCTYPE html><base href="http://localhost:8000/simple.html"><html><head>\n<style>\n.a {\n  background: red;\n  width: 100px;\n  height: 100px;\n}\n</style>\n</head><body><div class="a">This is some text in a div</div>\n</body></html>');
    var pipeline = [{name: 'input', options: {data: 'tests/pipeline/simple.json'}}, 'fileToBuffer', 'bufferToString', 'jsonParse', "HTMLWriter"];
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
    testPipeline([{name: 'input', options: {data: 'tests/pipeline/simple.exp'}}, 'fileToBuffer', 'bufferToString', 'doExperiment'].map(stageLoader.stageSpecificationToStage), done);
  });
});

