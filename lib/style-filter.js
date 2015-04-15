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
  return this.parentStyleStack[this.parentStyleStack.length - 1];
}

StyleFilter.prototype.pushStyle = function(style) {
  this.parentStyleStack.push(style);
  this.hadLocalStyleStack[this.hadLocalStyleStack.length - 1] = true;
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

StyleFilter.prototype.attribute = function(name, value) {
  if (name == 'style') {
    var style = {};
    var localStyle = [];
    var rawProperties = value.split(';');
    var properties = [];
    var propertyOffset = 0;
    for (var i = 0; i < rawProperties.length; i++) {
      var str = rawProperties[i];
      if (properties[propertyOffset]) {
	properties[propertyOffset] += ';' + str;
      } else {
	properties[propertyOffset] = str;
      }
      if (properties[propertyOffset].split('(').length == properties[propertyOffset].split(')').length) {
	propertyOffset += 1;
      }
    }
    
    var deferredProperties = [];

    for (var i = 0; i < properties.length; i++) {
      var kv = properties[i].split(':');
      if (kv.length < 2) {
        continue;
      }
      var key = kv[0].trim();
      var value = kv.slice(1, kv.length).join(':').trim();

      if (CSSModel.inheritedPropertyNames.indexOf(key) !== -1) {
        if (this.parentStyle()[key] == value) {
          style[key] = value;
          continue;
        }
      } else {
        var uaOverrides = CSSModel.userAgentOverrides[this.elementName];
        var uaDidOverride = false;
        if (uaOverrides !== undefined) {
          var uaOverride = uaOverrides[key];
          if (uaOverride !== undefined) {
            if (uaOverride == value)
              continue;
            else
              uaDidOverride = true;
          }
        }

        if (!uaDidOverride) {
	  if (typeof CSSModel.propertyDefaults[key] == "string" && CSSModel.propertyDefaults[key] == value)
	    continue;
	  if (typeof CSSModel.propertyDefaults[key] == "function") {
	    deferredProperties.push({key: key, value: value, fn: CSSModel.propertyDefaults[key]});
	    continue;
	  }
	}
      }

      style[key] = value;
      localStyle.push(key + ': ' + value);
    }

    for (var i = 0; i < deferredProperties.length; i++) {
      if (deferredProperties[i].fn(style) == deferredProperties[i].value)
	continue;
      style[deferredProperties[i].key] = deferredProperties[i].value;
      localStyle.push(deferredProperties[i].key + ': ' + deferredProperties[i].value);
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
