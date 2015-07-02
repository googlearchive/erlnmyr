function TraceTIDSplitter(data) {
  this.data = data;
  this.tidData = {};
}

TraceTIDSplitter.prototype.split = function() {
  for (var i = 0; i < this.data.traceEvents.length; i++) {
    var event = this.data.traceEvents[i];
    if (this.tidData[event.tid] == undefined)
      this.tidData[event.tid] = {traceEvents: []};
    this.tidData[event.tid].traceEvents.push(event);
  }
  return this.tidData;
}

module.exports = TraceTIDSplitter;
