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

function TraceTree(data) {
  this.data = data;
}

function clone(input) {
  var result = {};
  for (var key in input)
    result[key] = input[key];
  return result;
}

function merge(a, b) {
  if (!a) return b;
  if (!b) return a;
  var result = clone(a);
  for (var key in b) {
    result[key] = b[key];
  }
  return result;
}

TraceTree.prototype.filter = function() {
  var output = {traceEvents: []};
  var baseTime = this.data.traceEvents[0].ts;
  var pendingTiming = [];
  var pid = this.data.traceEvents[0].pid;
  var capturePoints = [output.traceEvents];
  var spans = [undefined];

  for (var i = 0; i < this.data.traceEvents.length; i++) {
    var event = clone(this.data.traceEvents[i]);
    if (event.ph == 'B' || event.ph == 'X' || event.ph == 'S') {
      var span = spans[spans.length - 1];
      while (span !== undefined && event.ts >= span) {
        capturePoints.pop();
        spans.pop();
        span = spans[spans.length - 1];
      }
      capturePoints[capturePoints.length - 1].push(event);
      if (event.ph == 'X') {
        spans.push(event.ts + event.dur);
      } else {
        spans.push(undefined);
        pendingTiming.push(event);
      }
      event.ts -= baseTime;
      event.children = [];
      capturePoints.push(event.children);
    } else if (event.ph == 'E' || event.ph == 'F') {
      while (spans[spans.length - 1] !== undefined) {
        spans.pop();
        capturePoints.pop();
      }
      var begin = pendingTiming.pop();
      if (begin) {
        spans.pop();
        capturePoints.pop();
        begin.tdur = event.tts - begin.tts;
        var args = merge(begin.args, event.args);
        if (args) {
          begin.args = args;
        }
      }
    }
  }
  return output;
}

module.exports = TraceTree;

/*
{"name":"Document::updateRenderTree","tts":160519,"args":{},"pid":34835,"ts":41621046290,"cat":"blink","tid":1299,"ph":"B"},
{"tdur":672,"name":"Document::updateStyle","tts":160524,"args":{},"pid":34835,"ts":41621046306,"cat":"blink","tid":1299,"ph":"X","dur":739}
{"name":"Document::updateRenderTree","tts":161198,"args":{"elementCount":122},"pid":34835,"ts":41621047046,"cat":"blink","tid":1299,"ph":"E"}

name                       tts          dur  tdur  ts                       ph
Document::updateRenderTree 160519                  41621046290 ( 919)       B
Document::updateStyle      160524       739  672   41621046306 ( 935)       X
Document::updateRenderTree 161198 +679             41621047046 (1675) +756  E

dur = wall duration (us)
tdur = CPU duration (us)
ts = start (us from .. something)

if (159788 == 0) then 160519 == 731
if (41621045371 == 0) then 41621046290 == 919

*/

