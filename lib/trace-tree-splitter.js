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

function TraceTreeSplitter(data, options) {
  this.data = data;
  this.options = options;
}

TraceTreeSplitter.prototype.filter = function() {
  var output = {};
  for (var i = 0; i < this.data.traceEvents.length; i++)
    this.filterToOutput(output, this.data.traceEvents[i]);
  return output;
}

TraceTreeSplitter.prototype.filterToOutput = function(output, event) {
  if (this.options.match.exec(event.name)) {
    output[event.name] = {traceEvents: event.children};
  } else {
    for (var i = 0; i < event.children.length; i++)
      this.filterToOutput(output, event.children[i]);
  }
}

module.exports = TraceTreeSplitter;
module.exports.defaults = {
  match: /iteration.*/
}
