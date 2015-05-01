var Filter = require('./filter');
var CSSModel = require('./css-model');

function StyleFilter() {
  Filter.call(this);
  this.parentStyleStack = [CSSModel.propertyDefaults];
  this.hadLocalStyleStack = [];
}

StyleFilter.prototype = Object.create(Filter.prototype);
StyleFilter.prototype.constructor = StyleFilter;

StyleFilter.prototype.parentStyle = function() {
  return this.parentStyleStack[this.parentStyleStack.length - 2];
}

StyleFilter.prototype.myStyle = function() {
  return this.parentStyleStack[this.parentStyleStack.length - 1];
}

StyleFilter.prototype.pushStyle = function() {
  this.hadLocalStyleStack[this.hadLocalStyleStack.length - 1] = true;
  this.parentStyleStack.push({});
}


StyleFilter.prototype.popStyle = function() {
  var hadLocalStyle = this.hadLocalStyleStack[this.hadLocalStyleStack.length - 1];
  this.hadLocalStyleStack = this.hadLocalStyleStack.slice(0, this.hadLocalStyleStack.length - 1);
  if (hadLocalStyle)
    this.parentStyleStack = this.parentStyleStack.slice(0, this.parentStyleStack.length - 1);
}

StyleFilter.prototype.beginOpenElement = function(name) {
  this.hadLocalStyleStack.push(false);
  this.elementName = name;
  Filter.prototype.beginOpenElement.call(this, name);
}


StyleFilter.prototype.styleAttribute = function() {
  this.pushStyle();
  this.deferredProperties = {};
  Filter.prototype.styleAttribute.call(this);
}

StyleFilter.prototype.pop = function() {
  var style = this.myStyle();
  for (var i = 0; i < this.deferredProperties.length; i++) {
    if (this.deferredProperties[i].fn(style) == deferredProperties[i].value)
      continue;
    style[deferredProperties[i].name] = deferredProperties[i].value;
    Filter.prototype.StyleFilter.call(this, name, value);
  }

  this.popStyle();
  Filter.prototype.pop.apply();
  
}

StyleFilter.prototype.styleProperty = function(name, value) {
  var style = this.myStyle();

  // If a property's value matches the inherited value, then
  // we don't need to emit it.
  if (CSSModel.inheritedPropertyNames.indexOf(name) !== -1) {
    if (this.parentStyle()[name] == value) {
      style[name] = value;
      return;
    }
  } else {
    // If a UA rule would force this property to the provided
    // value, then we don't need to emit it.
    var uaOverrides = CSSModel.userAgentOverrides[this.elementName];
    var uaDidOverride = false;
    if (uaOverrides !== undefined) {
      var uaOverride = uaOverrides[name];
      if (uaOverride !== undefined) {
        if (uaOverride == value)
          return;
        else
          uaDidOverride = true;
      }
    }

    // If a UA rule forces this property to a different value
    // than the provided one, then we *must* emit the provided value.
    // Otherwise...
    if (!uaDidOverride) {
      // Most property defaults are fixed.
      if (typeof CSSModel.propertyDefaults[name] == "string" && CSSModel.propertyDefaults[name] == value)
        return;
      // Some property defaults depend on other style values.
      if (typeof CSSModel.propertyDefaults[name] == "function") {
        deferredProperties.push({name: name, value: value, fn: CSSModel.propertyDefaults[name]});
        return;
      }
    }
  }

  Filter.prototype.StyleFilter.call(this, name, value);
  style[name] = value;
}

module.exports = StyleFilter;
