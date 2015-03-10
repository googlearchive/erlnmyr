var Filter = require('./filter');
var CSSModel = require('./css-model');

function StyleFilter() {
  Filter.call(this);
  this.parentStyleStack = [CSSModel.propertyDefaults, undefined];
}

StyleFilter.prototype = Object.create(Filter.prototype);
StyleFilter.prototype.constructor = StyleFilter;

StyleFilter.prototype.parentStyle = function() {
  return this.parentStyleStack[this.parentStyleStack.length - 1];
}

StyleFilter.prototype.pushStyle = function(style) {
  this.parentStyleStack.push(style);
}

StyleFilter.prototype.popStyle = function() {
  this.parentStyleStack = this.parentStyleStack.slice(0, this.parentStyleStack.length - 1);
}

StyleFilter.prototype.attribute = function(name, value) {
  if (name == 'style') {
    var style = {};
    var localStyle = [];
    var properties = value.split(';');
    for (var i = 0; i < properties.length; i++) {
      var kv = properties[i].split(':');
      if (kv.length !== 2) {
        continue;
      }
      var key = kv[0].trim();
      var value = kv[1].trim();

      if (CSSModel.inheritedPropertyNames.indexOf(key) !== -1) {
        if (this.parentStyle()[key] == value) {
          style[key] = value;
          continue;
        }
      } else {
        if (CSSModel.propertyDefaults[key] == value)
          continue;
      }

      style[key] = value;
      localStyle.push(key + ': ' + value);
    }
    this.pushStyle(style);

    value = localStyle.join('; ');
  }

  Filter.prototype.attribute.call(this, name, value);
}

StyleFilter.prototype.closeElement = function() {
  this.popStyle();
  Filter.prototype.closeElement.call(this);
}

module.exports = StyleFilter;
