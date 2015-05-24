function TraceTreeSplitter(data, options) {
  this.data = data;
  this.options = options;
}

TraceTreeSplitter.prototype.filter = function() {
  var output = {};
  for (var i = 0; i < this.data.traceEvents.length; i++)
    this.filterToOutput(output, this.data.traceEvents[i]);
  return output;
}

TraceTreeSplitter.prototype.filterToOutput = function(output, event) {
  if (this.options.match.exec(event.name)) {
    output[event.name] = {traceEvents: event.children};
  } else {
    for (var i = 0; i < event.children.length; i++)
      this.filterToOutput(output, event.children[i]);
  }
}

module.exports = TraceTreeSplitter;
module.exports.defaults = {
  match: /iteration.*/
}
