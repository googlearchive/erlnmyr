function StatsWriter() {
  this.result = {
    element: 0,
    text: 0,
    attribute: 0,
    elements: {}
  };
}

StatsWriter.prototype.beginOpenElement = function(name) {
  this.result.element += 1;
  if (!(name in this.result.elements)) {
    this.result.elements[name] = 0;
  }
  this.result.elements[name] += 1;
}

StatsWriter.prototype.attribute = function(name, value) {
  this.result.attribute += 1;
}

StatsWriter.prototype.endOpenElement = function() {
}

StatsWriter.prototype.closeElement = function(name) {
}

StatsWriter.prototype.text = function(text) {
  this.result.text += 1;
}

StatsWriter.prototype.comment = function(comment) {
}

StatsWriter.prototype.getHTML = function() {
  var result = "elements: " + this.result.element + "\n"
  for (var element in this.result.elements) {
    result += '\t' + element + ': ' + this.result.elements[element] + '\n';
  }
  result += "text segments: " + this.result.text + "\nattributes: " + this.result.attribute + "\n";
  return result;
}

module.exports = StatsWriter;
