#!/usr/bin/env node

'use strict';
var stageLoader = require('./core/stage-loader');

var file = process.argv[2];
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
