var assert = require('chai').assert;

var tasks = require('../gulpfile').tasks;
var stageLoader = require('../core/stage-loader');
var stream = require('../core/stream');

describe('basicTargetCoverage', function() {
  it('should be possible to at least type check the targets listed in gulpfile', function() {
    for (name in tasks) {
      var stageList = tasks[name].map(stageLoader.stageSpecificationToStage);
      stageLoader.typeCheck(stageList);
    }
  });

  // TODO: Once stage-loader has string names for all the fancy stages, roll the special gulpfile targets
  // into the standard ones and remove these two tests.
  it('should be possible to type check the ejs stage list', function() {
    stageLoader.typeCheck([
      stageLoader.stageSpecificationToStage({name: 'input', options: {data: 'dummy'}}),
      stageLoader.stageSpecificationToStage('fileToBuffer'),
      stageLoader.stageSpecificationToStage('bufferToString'),
      stageLoader.stageSpecificationToStage('ejsFabricator'),
      stageLoader.stageSpecificationToStage('writeStringFile')
    ]);
  });
  it('should be possible to type check the mhtml stage list', function() {
    stageLoader.typeCheck([
      stageLoader.stageSpecificationToStage('input'),
      stageLoader.stageSpecificationToStage('readDir'),
      stageLoader.stageSpecificationToStage('filter'),
      stream.tag(function() {}),
      stageLoader.stageSpecificationToStage('fileToJSON'),
      stageLoader.stageSpecificationToStage('HTMLWriter'),
      stream.tag(function() {}),
      stream.write()
    ]);
  });
});
