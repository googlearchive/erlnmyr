var assert = require('chai').assert;

var tasks = require('../gulpfile').tasks;
var stageLoader = require('../core/stage-loader');
var fancyStages = require('../core/fancy-stages');
var stream = require('../core/stream');

describe('basicTargetCoverage', function() {
  it('should be possible to at least type check the targets listed in gulpfile', function() {
    for (name in tasks) {
      stageList = tasks[name].map(stageLoader.stageSpecificationToStage);
      stageLoader.typeCheck(stageList);
    }
  });

  // TODO: Once stage-loader has string names for all the fancy stages, roll the special gulpfile targets
  // into the standard ones and remove these two tests.
  it('should be possible to type check the ejs stage list', function() {
    stageLoader.typeCheck([
      stageLoader.stageSpecificationToStage('file:dummy'),
      stageLoader.stageSpecificationToStage('ejsFabricator'),
      stageLoader.stageSpecificationToStage('writeStringFile')
    ]);
  });
  it('should be possible to type check the mhtml stage list', function() {
    stageLoader.typeCheck([
      fancyStages.fileInputs('dummy'),
      fancyStages.map(fancyStages.tee()),
      fancyStages.map(fancyStages.left(stageLoader.stageSpecificationToStage('fileToJSON'))),
      fancyStages.map(fancyStages.left(stageLoader.stageSpecificationToStage('HTMLWriter'))),
      fancyStages.map(fancyStages.right(fancyStages.outputName('dummy', 'dummy'))),
      fancyStages.map(stageLoader.stageSpecificationToStage('toFile'))
    ]);
  });
});
