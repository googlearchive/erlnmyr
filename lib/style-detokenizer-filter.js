// Tokenizes style element and style attributes into style-specific tokens.
var Filter = require('./filter');
var CSSModel = require('./css-model');

function StyleDetokenizerFilter() {
  Filter.call(this);
}

StyleDetokenizerFilter.prototype = Object.create(Filter.prototype);

StyleDetokenizerFilter.prototype.styleAttribute = function() {
  this.processingStyleAttribute = "";
}

StyleDetokenizerFilter.prototype.styleProperty = function(name, value) {
  this.processingStyleAttribute += name + ': ' + value + ';'
}

StyleDetokenizerFilter.prototype.pop = function() {
  if (this.processingStyleAttribute !== undefined) {
    Filter.prototype.attribute.call(this, 'style', this.processingStyleAttribute);
    this.processingStyleAttribute = undefined;
  } else {
    Filter.prototype.pop.call(this);
  }
}

module.exports = StyleDetokenizerFilter;
