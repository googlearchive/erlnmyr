var Recorder = require('./recorder');

function Filter() {
  this.recorder = new Recorder();
}

Filter.prototype.beginOpenElement = function(name) {
  if (name == 'base') {
    this.baseElement = true;
    return;
  }
  this.baseElement = false;
  this.recorder.push({nodeName: name});
}

Filter.prototype.attribute = function(name, value) {
  if (this.baseElement && name == 'href') {
    this.recorder.base(value);
    return;
  }
  this.recorder.attribute({name: name, value: value});
}

Filter.prototype.endOpenElement = function() {
}

Filter.prototype.closeElement = function(name) {
  if (this.baseElement)
    return;
  this.recorder.pop();
}

Filter.prototype.text = function(text) {
  this.recorder.text(text);
}

Filter.prototype.comment = function(comment) {
  this.recorder.comment(comment);
}

Filter.prototype.getHTML = function() {
  return this.recorder.save();
}

module.exports = Filter;
