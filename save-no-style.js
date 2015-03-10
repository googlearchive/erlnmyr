~function() {

function descend(node, out) {
  if (node.nodeType == Node.ELEMENT_NODE) {
    if (node.nodeName == 'STYLE' || node.nodeName == 'SCRIPT')
      return;

    out.push(node);

    for (var i = 0; i < node.attributes.length; ++i) {
      if (node.attributes[i].name == 'style')
        continue;
      out.attribute(node.attributes[i]);
    }

    var style = getComputedStyle(node);
    out.attribute({name: 'style', value: style.cssText});

    var child = node.firstChild;
    while (child) {
      descend(child, out);
      child = child.nextSibling;
    }

    out.pop();
  } else if (node.nodeType == Node.COMMENT_NODE) {
    out.comment(node.textContent);
  } else if (node.nodeType == Node.TEXT_NODE) {
    out.text(node.textContent);
  }
}

function capturePseudoElementStyles(out) {
  var pseudoStyles = '';
  for (var i = 0; i < document.styleSheets.length; i++) {
    var styleSheet = document.styleSheets[i];
    for (var j = 0; j < styleSheet.rules.length; j++) {
      var rule = styleSheet.rules[j];
      if (rule.selectorText && rule.selectorText.indexOf('::') !== -1) {
        pseudoStyles += rule.cssText;
      }
    }
  }
  if (pseudoStyles.length > 0) {
    out.push({nodeName: 'STYLE'});
    out.text(pseudoStyles);
    out.pop();
  }
}

function Recorder() {
  this.log = [];
}

Recorder.prototype.base = function(url) {
  this.log.push({ 't': 'b', 'v': url });
}

Recorder.prototype.attribute = function(attribute) {
  this.log.push({ 't': 'a', 'n': attribute.name, 'v': attribute.value });
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
  var blob = new Blob([JSON.stringify(this.log)], { type: 'application/octet-binary' });
  var blobURL = window.webkitURL.createObjectURL(blob);
  var link = document.createElement('a');
  link.href = blobURL;
  link.download = encodeURIComponent(window.location).replace(/\./g, '-').replace(/\%[0-9A-F]{2}/g, '-') + '.ds.json';
  link.click();
}

var recorder = new Recorder();

recorder.base(String(window.location));
capturePseudoElementStyles(recorder);
descend(document.documentElement, recorder);


recorder.save();

}();
