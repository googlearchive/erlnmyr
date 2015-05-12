function TracePrettyPrint(data) {
  this.data = data;
}

TracePrettyPrint.prototype.print = function(event, indent, s) {
  s += indent + event.name + ': ' + event.tdur + ' (' + event.ts + ')\n';
  for (var i = 0; i < event.children.length; i++) {
    s = this.print(event.children[i], indent + '  ', s);
  }
  return s;
}

TracePrettyPrint.prototype.filter = function() {
  var result = '';
  for (var i = 0; i < this.data.traceEvents.length; i++) {
    result = this.print(this.data.traceEvents[i], '', result);  
  }
  return result;
}

module.exports = TracePrettyPrint;
