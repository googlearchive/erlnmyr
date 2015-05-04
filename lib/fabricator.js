var Recorder = require('./recorder');

function Fabricator() {
  this.recorder = new Recorder();
}

Fabricator.prototype.element = function(name, args) {
  this.recorder.push({nodeName: name});
  for (var arg in args)
    this.recorder.attribute({name: arg, value: args[arg]});
}

Fabricator.prototype.base = function() {
  this.recorder.base('');
}

Fabricator.prototype.text = function(text) {
  this.recorder.text(text);
}

Fabricator.prototype.pop = function() {
  this.recorder.pop();
}

Fabricator.prototype.fabricate = function() {
  return this.recorder.saveJSON();
}

module.exports = Fabricator;
