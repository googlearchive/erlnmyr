/*
  Copyright 2015 Google Inc. All Rights Reserved.
  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at
      http://www.apache.org/licenses/LICENSE-2.0
  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

var devicePhase = require("./device-phase-register");
var types = require("../core/types");

module.exports.inlineStylify = devicePhase({input: 'a', output: 'a'},
  function() {
    function toComputedStyle(element) {
      element.setAttribute('style', getComputedStyle(element).cssText);
      var child = element.firstChild;
      while (child) {
        if (child.nodeType == Node.ELEMENT_NODE)
          toComputedStyle(child);
        child = child.nextSibling;
      }
    }
    toComputedStyle(document.documentElement);
  });

module.exports.onlyPseudoElementStyles = devicePhase({input: 'a', output: 'a'},
  function() {
    function capturePseudoElementStyles(out) {
      for (var i = 0; i < document.styleSheets.length; i++) {
        var pseudoStyles = '';
        var styleSheet = document.styleSheets[i];
        if (styleSheet.rules == undefined)
          continue;
        for (var j = 0; j < styleSheet.rules.length; j++) {
          var rule = styleSheet.rules[j];
          if (rule.selectorText && rule.selectorText.indexOf('::') !== -1) {
            pseudoStyles += rule.cssText;
          }
        }
        styleSheet.textContent = pseudoStyles;
      }
    }
  });

module.exports.save = devicePhase({input: 'a', output: types.JSON},
  function() {
    function descend(node, out) {
      if (node.nodeType == Node.ELEMENT_NODE) {
        if (node.nodeName == 'SCRIPT')
          return;
        out.push(node);

        for (var i = 0; i < node.attributes.length; ++i)
          out.attribute(node.attributes[i]);

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

    var recorder = new Recorder();

    recorder.base(String(window.location));
    descend(document.documentElement, recorder);
    return recorder.log;
  });

