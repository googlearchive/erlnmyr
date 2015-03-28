// Tokenizes style element and style attributes into style-specific tokens.
var Filter = require('./filter');
var CSSModel = require('./css-model');

function StyleTokenizerFilter() {
  Filter.call(this);
}

StyleTokenizerFilter.prototype = Object.create(Filter.prototype);

StyleTokenizerFilter.prototype.attribute = function(name, value) {
  if (name != 'style') {
    Filter.prototype.attribute.call(this, name, value);
    return;
  }

  this.recorder.styleAttribute();

  CSSModel.parseStyleDeclaration(value, this.recorder);

  this.recorder.pop();
}

module.exports = StyleTokenizerFilter;