function StatsWriter() {
  this.result = {
    element: 0,
    text: 0,
    attribute: 0
  };
}

StatsWriter.prototype.beginOpenElement = function(name) {
  this.result.element += 1;
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
  return "elements: " + this.result.element + "\ntext segments: " + this.result.text + "\nattributes: " + this.result.attribute + "\n";
}

module.exports = StatsWriter;
