function TraceFilter(data) {
  this.data = data;
}

TraceFilter.prototype.filter = function() {
  var output = {traceEvents: []};
  for (var i = 0; i < this.data.traceEvents.length; i++) {
    var name = this.data.traceEvents[i].name;
    if (["HTMLDocumentParser::processParsedChunkFromBackgroundParser", "Document::updateRenderTree", "Document::updateStyle", "FrameView::layout"].indexOf(name) !== -1) {
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
