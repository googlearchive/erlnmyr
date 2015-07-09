#!/usr/bin/env node


'use strict';
var path = require('path');
var stageLoader = require('./core/stage-loader');

var file = process.argv[2];
if (!path.isAbsolute(file)) {
  file = path.join(process.cwd(), file);
}
var phases = [
  {name: 'input', options: {data: file}},
  'fileToBuffer',
  'bufferToString',
  'doExperiment',
].map(stageLoader.stageSpecificationToStage);

stageLoader.processStages(phases, function() {
  require('./core/trace').dump();
}, function(e) {
  throw e;
});
