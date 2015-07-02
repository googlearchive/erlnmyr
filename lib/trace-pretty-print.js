function TracePrettyPrint(data, options) {
  this.data = data;
  this.buckets = {};
  this.options = options;
}

TracePrettyPrint.prototype.print = function(event, indent, s) {
  s += indent + event.name + ': ' + event.tdur + ' (' + event.ts + ') [' + event.pid + '/' + event.tid + ']\n';
  if (this.buckets[event.name] == undefined)
    this.buckets[event.name] = 0;
  this.buckets[event.name] += event.tdur;
  for (var i = 0; i < event.children.length; i++) {
    this.buckets[event.name] -= event.children[i].tdur;
    s = this.print(event.children[i], indent + '  ', s);
  }
  return s;
}

TracePrettyPrint.prototype.filter = function() {
  var result = '';
  for (var i = 0; i < this.data.traceEvents.length; i++) {
    result = this.print(this.data.traceEvents[i], '', result);
  }

  result += '\n';
  if (!(this.options.showTrace === true)) {
    result = '';
  }

  if (this.options.showSummary) {
    for (name in this.buckets)
      result += name +': ' + (this.buckets[name]/1000) + 'ms\n';
  }

  return result;
}

module.exports = TracePrettyPrint;
module.exports.defaults = {
  showTrace: true,
  showSummary: true
};
