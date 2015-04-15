function Recorder() {
  this.log = [];
}

Recorder.prototype.base = function(url) {
  this.log.push({ 't': 'b', 'v': url });
}

Recorder.prototype.attribute = function(attribute) {
  this.log.push({ 't': 'a', 'n': attribute.name, 'v': attribute.value });
}

Recorder.prototype.styleAttribute = function() {
  this.log.push({ 't': 's' });
}

Recorder.prototype.styleRule = function(rule, type) {
  this.log.push({ 't': 'sr', 'v': rule , 'tt': type });
}

Recorder.prototype.styleProperty = function(name, value) {
  this.log.push({ 't': 'sp', 'n': name, 'v': value });
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

Recorder.prototype.saveJSON = function() {
  return this.log;
}

module.exports = Recorder;
