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

function TraceFilter(data, options) {
  this.data = data;
  this.options = options;
}

TraceFilter.prototype.filter = function() {
  var output = {traceEvents: []};
  for (var i = 0; i < this.data.traceEvents.length; i++) {
    var name = this.data.traceEvents[i].name;
    var cats = this.data.traceEvents[i].cat.split(',');
    var whitelisted = false;
    for (var j = 0; j < cats.length; j++)
      if (this.options.traceCategories.indexOf(cats[j]) !== -1)
        whitelisted = true;
    if ((this.options.traceEvents.indexOf(name) !== -1) || whitelisted) {
      output.traceEvents.push(this.data.traceEvents[i]);
    }
  }
  return output;
}


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
module.exports = TraceFilter;
module.exports.defaults = {
  traceEvents: ["HTMLDocumentParser::processParsedChunkFromBackgroundParser", "Document::updateRenderTree", "Document::updateStyle", "FrameView::layout"],
  traceCategories: []
};
