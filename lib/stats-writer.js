function StatsWriter() {
  this.result = {
    element: 0,
    text: 0,
    attribute: 0,
    elements: {},
    maxDepth: 0,
    leaf: 0
  };
  this.currentDepth = 0;
  this.depths = 0;
  this.leafDepths = 0;
  this.pendingLeafDepth = 0;

}

StatsWriter.prototype.beginOpenElement = function(name) {
  this.result.element += 1;
  if (!(name in this.result.elements)) {
    this.result.elements[name] = 0;
  }
  this.result.elements[name] += 1;
  this.currentDepth += 1;
  if (this.currentDepth > this.result.maxDepth) {
    this.result.maxDepth = this.currentDepth;
  }
  this.depths += this.currentDepth;
  this.pendingLeafDepth = this.currentDepth;
}

StatsWriter.prototype.attribute = function(name, value) {
  this.result.attribute += 1;
}

StatsWriter.prototype.endOpenElement = function() {
}

StatsWriter.prototype.closeElement = function(name) {
  this.currentDepth -= 1;
  if (this.pendingLeafDepth > 0) {
    this.leafDepths += this.pendingLeafDepth;
    this.result.leaf += 1;
    this.pendingLeafDepth = 0;
  }
}

StatsWriter.prototype.text = function(text) {
  this.result.text += 1;
}

StatsWriter.prototype.comment = function(comment) {
}

StatsWriter.prototype.getHTML = function() {
  var result = "elements: " + this.result.element + "\n";
  result += "leaf elements: " + this.result.leaf + "\n";
  for (var element in this.result.elements) {
    result += '\t' + element + ': ' + this.result.elements[element] + '\n';
  }
  result += "text segments: " + this.result.text + "\nattributes: " + this.result.attribute + "\n";
  result += "max depth: " + this.result.maxDepth + "\n";
  result += "average depth: " + (this.depths / this.result.element) + "\n";
  result += "average leaf depth: " + (this.leafDepths / this.result.leaf) + "\n";

  return result;
}

module.exports = StatsWriter;
