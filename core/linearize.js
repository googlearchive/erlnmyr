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

/**
 * I think this can just be the edges of a graph, teased out into a list
 * of concurrent stages.
 */

function linearize(graph) {
  var reached = {};
  var reachedCount = 0;
  var edges = graph.edgesCount();

  var current = graph.inputs();
  var firstStage = [];

  for (var i = 0; i < current.length; i++) {
    if (current[i].isPipe()) {
      reached[current[i].id] = current[i];
      reachedCount += 1;
      firstStage.push(current[i]);
    }
  }

  if (reachedCount > 0) {
    var result = [firstStage];
  } else {
    var result = [];
  }

  while (reachedCount < edges) {
    var next = [];
    var nDict = {};
    for (var i = 0; i < current.length; i++) {
      var outNode = current[i].isConnection() ? current[i] : current[i].out;
      if (outNode == undefined)
        continue;

      var allInputsLinearized = true;
      for (var j = 0; j < outNode.fromPipes.length; j++) {
        if (!(outNode.fromPipes[j].id in reached)) {
          allInputsLinearized = false;
          break;
        }
      }
      /**
       * nDict is needed to capture those pipes that are newly reached
       * in this stage, without adding them to the global reached list
       * so that other last-stage inputs don't also see them as reached.
       */
      if (allInputsLinearized) {
        for (var j = 0; j < outNode.toPipes.length; j++) {
          if (!(outNode.toPipes[j].id in reached) && !(outNode.toPipes[j].id in nDict)) {
            next.push(outNode.toPipes[j]);
            nDict[outNode.toPipes[j].id] = outNode.toPipes[j];
          }
        }
      }
    }


    for (var i = 0; i < next.length; i++)
      reached[next[i].id] = next[i];

    reachedCount += next.length;
    result.push(next);

    current = next;
  }


  return result;
}

module.exports = linearize;
