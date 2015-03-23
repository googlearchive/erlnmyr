var Filter = require('./filter');
var CSSModel = require('./css-model');

function NukeIFrameFilter() {
  Filter.call(this);
}

NukeIFrameFilter.prototype = Object.create(Filter.prototype);
NukeIFrameFilter.prototype.constructor = NukeIFrameFilter;

NukeIFrameFilter.prototype.beginOpenElement = function(name) {
  if (name == 'IFRAME') {
    this.inIFrame = true;
    return;
  }
  this.inIFrame = false;
  Filter.prototype.beginOpenElement.call(this, name);
}

NukeIFrameFilter.prototype.endOpenElement = function() {
  if (this.inIFrame)
    return;
  Filter.prototype.endOpenElement.call(this);
}

NukeIFrameFilter.prototype.closeElement = function() {
  if (this.inIFrame) {
    this.inIFrame = false;
    return;
  }
  Filter.prototype.closeElement.call(this);
}

NukeIFrameFilter.prototype.attribute = function(name, value) {
  if (this.inIFrame)
    return;
  Filter.prototype.attribute.call(this, name, value);
}

module.exports = NukeIFrameFilter;
