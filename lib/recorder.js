function Recorder() {
  this.log = [];
}

Recorder.prototype.base = function(url) {
  this.log.push({ 't': 'b', 'v': url });
}

Recorder.prototype.attribute = function(attribute) {
  this.log.push({ 't': 'a', 'n': attribute.name, 'v': attribute.value });
}

Recorder.prototype.rule = function(rule, type) {
  this.log.push({ 't': 'r', 'v': rule , 'tt': type });
}

Recorder.prototype.prop = function(prop) {
  this.log.push({ 't': 'p', 'n': prop.name, 'v': prop.value });
}

Recorder.prototype.push = function(node) {
  this.log.push({ 't': 'n', 'n': node.nodeName });
}

Recorder.prototype.pop = function() {
  this.log.push({ 't': '/' });
}

Recorder.prototype.text = function(text) {
  this.log.push({ 't': 't', 'v': text })
}

Recorder.prototype.comment = function(comment) {
  this.log.push({ 't': 'c', 'v': comment })
}

Recorder.prototype.save = function() {
  return JSON.stringify(this.log);
}

module.exports = Recorder;
