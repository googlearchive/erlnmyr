var fs = require('fs');
var TreeBuilder = require('./tree-builder');

function HTMLWriter() {
  this.result = [];
  this.selfClosingElements = [ 'area', 'base', 'br', 'col', 'command', 'embed', 'hr', 'img', 'input', 'keygen', 'link', 'meta', 'param', 'source', 'track', 'wbr' ];
}

HTMLWriter.prototype.beginOpenElement = function(name) {
  this.result.push('<', name.toLowerCase());
}

HTMLWriter.prototype.attribute = function(name, value) {
  this.result.push(' ', name, '="', value, '"');
}

HTMLWriter.prototype.endOpenElement = function() {
  this.result.push('>');
}

HTMLWriter.prototype.closeElement = function(name) {
  var printedName = name.toLowerCase();
  if (this.selfClosingElements.indexOf(printedName) >= 0)
    return;

  this.result.push('</', printedName, '>');
}

HTMLWriter.prototype.text = function(text) {
  this.result.push(text);
}

HTMLWriter.prototype.comment = function(comment) {
  this.result.push('<!--', comment, '-->');
}

HTMLWriter.prototype.getHTML = function() {
  return this.result.join('');
}

var name = 'document.ds.json';

fs.readFile(name, 'utf8', function(err, data) {
  if (err)
    throw err;

  var data = JSON.parse(data);

  var writer = new HTMLWriter();
  var builder = new TreeBuilder(writer);
  builder.build(data);
  builder.write(writer);

  console.log(writer.getHTML());
});