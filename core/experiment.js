/*
  Copyright 2015 Google Inc. All Rights Reserved.
  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at
      http://www.apache.org/licenses/LICENSE-2.0
  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

var dot = require('graphlib-dot');
var types = require('./types');
var graph = require('./graph');
var linearize = require('./linearize');
var stream = require('./stream');
var phase = require('./phase');
var stageLoader = require('./stage-loader');
var assert = require('chai').assert;
var Promise = require('bluebird');
var definePhase = require('./phase-register');
var path = require('path');
var commandLineOptions = require('./options');

function getPhaseName(nodeName, options) {
  var phaseName = nodeName;
  var splits = phaseName.split('_');
  if (options.stage) {
      phaseName = options.stage;
  } else if (options.label) {
      phaseName = options.label;
  } else if (splits.length > 1) {
      phaseName = splits[0];
  }
  return phaseName;
}

function getNodeID(nodeName) {
  var i = nodeName.indexOf('_');
  if (i === -1)
    return null;
  return nodeName.slice(i + 1);
}

function parseOptionAliases(optionAliases) {
  var aliases = [];
  if (typeof optionAliases !== 'string' || optionAliases === '')
    return aliases;
  var regex = /(\w+)=(\w+)\.(\w+)/g;
  var match = null;
  while (match = regex.exec(optionAliases)) {
    aliases.push({
      alias: match[1],
      selector: match[2],
      option: match[3],
    });
  }
  return aliases;
}

function addCommandLineOptions(phaseName, nodeID, optionAliases, resultOptions) {
  function addIfKeyPresent(key, options) {
    if (key in commandLineOptions && typeof commandLineOptions[key] === 'object') {
      for (var innerKey in commandLineOptions[key])
        resultOptions[innerKey] = commandLineOptions[key][innerKey];
    }
  }
  addIfKeyPresent(phaseName, commandLineOptions);
  addIfKeyPresent(nodeID, commandLineOptions);
  // TODO: Just parse optionAliases once per experiment.
  parseOptionAliases(optionAliases).forEach(function(optionAlias) {
    if (optionAlias.alias in commandLineOptions && (optionAlias.selector === phaseName || optionAlias.selector === nodeID))
      resultOptions[optionAlias.option] = commandLineOptions[optionAlias.alias];
  })
}

function mkPhase(nodeName, inGraph) {
  var options = inGraph.node(nodeName) || {};
  options.id = nodeName;
  var phaseName = getPhaseName(nodeName, options);
  var nodeID = getNodeID(nodeName);
  addCommandLineOptions(phaseName, nodeID, inGraph.graph().optionAliases, options);
  var result = new graph.Pipe(phaseName, options);
  result.nodeName = nodeName;
  return result;
}

function linearConnectEdges(inGraph) {
  var edges = inGraph.edges();
  var pipes = {};
  for (var i = 0; i < edges.length; i++) {
    var edge = edges[i];
    if (!pipes[edge.v])
      pipes[edge.v] = mkPhase(edge.v, inGraph);
    if (!pipes[edge.w])
      pipes[edge.w] = mkPhase(edge.w, inGraph);
    graph.connect(pipes[edge.v], pipes[edge.w]);
  }
  return linearize(pipes[edges[0].v].graph);
}

var bundled = {
  'trace-phases': path.join(__dirname, '../lib/trace-phases'),
  'chromium-phases': path.join(__dirname, '../lib/chromium-phases/chromium-phases'),
  'device-phases': path.join(__dirname, '../lib/device-phases'),
  'browser-phases': path.join(__dirname, '../lib/browser-phases')
};

function buildstageList(graphData, tags, require) {
  var inGraph = dot.read(graphData);
  // TODO: Perhaps create instance of stage-loader and ask it to load these
  //       to avoid polluting other experiments.
  if (inGraph.graph().imports) {
    var imports = eval(inGraph.graph().imports);
    imports.forEach(function(lib) {
      // TODO: Are we passing the wrong tags object?
      if (bundled[lib]) {
        lib = bundled[lib];
      } else if (tags.tags.filename && lib[0] == '.') {
        lib = path.join(path.dirname(tags.tags.filename), lib);
      }
      definePhase.load(require(lib));
    });
  }
  var linear = linearConnectEdges(inGraph);
  var linearNames = linear.map(function(x) { return x.map(function(a) { return a.nodeName; })});

  // Find the {strategy:pipeline} groups that each phase participates in.
  var linearGroups = linearNames.map(function(a) { return a.map(function(x) {
    var result = [];
    var parent = inGraph.parent(x);
    while (parent !== undefined) {
      if (inGraph.node(parent).strategy == 'pipeline')
        result.push(parent);
      parent = inGraph.parent(parent);
    }
    return result;
  }); });

  // For each set of phases at the same linear level, find the groups
  // that every element of the set is part of.
  linearGroups = linearGroups.map(function(x) {
    var result = [];
    for (var i = 0; i < x[0].length; i++) {
      for (var j = 1; j < x.length; j++) {
        if (x[j].indexOf(x[0][i]) == -1)
          break;
      }
      if (j == x.length)
        result.push(x[0][i]);
    }
    return result;
  });

  // Phases being constructed, contains sublists for pipeline phases.
  var phaseStack = [[]];
  // Names of the current groups.
  var groupStack = [];

  for (var i = 0; i < linear.length; i++) {
     for (var j = 0; j < linearGroups[i].length; j++) {
      if (groupStack.indexOf(linearGroups[i][j]) == -1) {
        // Enter a new group and start a new phase list.
        groupStack.push(linearGroups[i][j]);
        phaseStack.push([]);
      }
    }

    var streams = linear[i].map(function(pipe, idx) {
      if (pipe.stageName == undefined)
        pipe.stageName = 'passthrough';
      var thisStream = stageLoader.stageSpecificationToStage({name: pipe.stageName, options: pipe.options});
      //thisStream.setInput('efrom', idx + '');
      //thisStream.setOutput('eto', idx + '');
      thisStream.setInput('efrom', pipe.id);
      thisStream.setOutput('eto', pipe.id);
      return thisStream;
    });
    phaseStack[phaseStack.length - 1] = phaseStack[phaseStack.length - 1].concat(streams);

    while (groupStack.length > 0 && (linearGroups.length <= i + 1 || linearGroups[i + 1].indexOf(groupStack[groupStack.length - 1]) == -1)) {
      // we've reached the end of this group stack
      groupStack.pop();
      var phases = phaseStack.pop(); // do wrapping here
      var consolidated = phase.pipeline(phases);
      phaseStack[phaseStack.length - 1].push(consolidated);
    }

    if (i == linear.length - 1)
      break;

    // Unique output connections.
    var outgoing = linear[i].map(function(pipe) { return pipe.out; }).filter(function(v, i, s) { return s.indexOf(v) == i; });
    var thisPhaseOutgoing = outgoing.filter(function(con) {
      for (var j = 0; j < con.toPipes.length; j++) {
        if (linearNames[i + 1].indexOf(con.toPipes[j].nodeName) == -1)
          return false;
      }
      return true;
    });
    var thisPhaseIns = thisPhaseOutgoing.map(function(con) { return con.fromPipes.map(function(pipe) { return pipe.id; }) });
    var thisPhaseOuts = thisPhaseOutgoing.map(function(con) { return con.toPipes.map(function(pipe) { return pipe.id; }) });
    

    // Indexes of from/to to construct the routing stage.
    var ins = outgoing.map(function(con) { return con.fromPipes; });
    ins = ins.map(function(a) { return a.map(function(b) { return linearNames[i].indexOf(b.nodeName); })});
    var outs = outgoing.map(function(con) { return con.toPipes; });
    outs = outs.map(function(a) { return a.map(function(b) { return linearNames[i + 1].indexOf(b.nodeName); })});
    // var routingStage = phase.routingPhase(ins, outs);

    var routingStage = phase.routingPhase(thisPhaseIns, thisPhaseOuts);
    phaseStack[phaseStack.length - 1].push(routingStage);
  }

  assert(phaseStack.length == 1);
  return phaseStack[0];
}

module.exports.doExperiment = definePhase({
  input: types.string,
  output: types.unit,
  arity: '1:N',
  async: true,
}, function(data, tags) {
  var require = this.options.require;
  return new Promise(function(resolve, reject) {
    stageLoader.processStages(buildstageList(data, tags, require), resolve, reject);
  });
}, {
  require: require,
});

module.exports.typeCheckExperiment = definePhase({
  input: types.string,
  output: types.unit,
  arity: '1:N',
}, function(data, tags) {
  stageLoader.typeCheck(buildstageList(data, tags, require));
});

module.exports.getPhaseName = getPhaseName;
