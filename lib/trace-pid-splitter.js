function TracePIDSplitter(data) {
  this.data = data;
  this.pidData = {};
}

TracePIDSplitter.prototype.split = function() {
  for (var i = 0; i < this.data.traceEvents.length; i++) {
    var event = this.data.traceEvents[i];
    if (this.pidData[event.pid] == undefined)
      this.pidData[event.pid] = {traceEvents: []};
    this.pidData[event.pid].traceEvents.push(event);
  }
  return this.pidData;
}

module.exports = TracePIDSplitter;
