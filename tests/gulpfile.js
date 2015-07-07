var assert = require('chai').assert;

require('../core/phase-lib'); // Ensure phases are registered in an instrumented environment.
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
      stream.streamedStage(fancyStages.fileInputs('dummy')),
      stream.tag(function() {}),
      stageLoader.stageSpecificationToStage('fileToJSON'),
      stageLoader.stageSpecificationToStage('HTMLWriter'),
      stream.tag(function() {}),
      stream.write()
    ]);
  });
});
