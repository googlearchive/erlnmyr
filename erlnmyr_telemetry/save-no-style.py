 # Copyright 2015 Google Inc. All rights reserved.
 #
 # Licensed under the Apache License, Version 2.0 (the "License");
 # you may not use this file except in compliance with the License.
 # You may obtain a copy of the License at
 #
 #   http://www.apache.org/licenses/LICENSE-2.0
 #
 # Unless required by applicable law or agreed to in writing, software
 # distributed under the License is distributed on an "AS IS" BASIS,
 # WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 # See the License for the specific language governing permissions and
 # limitations under the License

import telemetry.core
from telemetry.internal.browser import browser_options
from telemetry.internal.browser import browser_finder

# Initialize the dependency manager
from telemetry.internal.util import binary_manager
from chrome_telemetry_build import chromium_config
binary_manager.InitDependencyManager(chromium_config.ChromiumConfig().client_config)

from json import dumps

options = browser_options.BrowserFinderOptions();
parser = options.CreateParser();
(_, args) = parser.parse_args();

browserFactory = browser_finder.FindBrowser(options);

with browserFactory.Create(options) as browser:
  tab = browser.tabs.New();
  tab.Activate();
  for i in browser.tabs:
    if i == tab:
      continue
    i.Close()
  tab.Navigate(args[0]);
  tab.WaitForDocumentReadyStateToBeComplete();
  json = tab.EvaluateJavaScript(
      """(function() {
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
    if (styleSheet.rules == undefined)
      continue;
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

var recorder = new Recorder();

recorder.base(String(window.location));
capturePseudoElementStyles(recorder);
descend(document.documentElement, recorder);
return recorder.log;
})();
    """);
  print dumps(json);

