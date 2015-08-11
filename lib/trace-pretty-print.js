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

function TracePrettyPrint(data, options) {
  this.data = data;
  this.buckets = {};
  this.categories = {};
  this.options = options;
}

TracePrettyPrint.prototype.print = function(event, indent, s) {
  s += indent + event.name + ': ' + event.tdur + ' (' + event.ts + ') [' + event.pid + '/' + event.tid + ']\n';
  if (this.buckets[event.name] == undefined) {
    this.buckets[event.name] = 0;
    this.categories[event.name] = event.cat;
  }
  this.buckets[event.name] += event.tdur;
  for (var i = 0; i < event.children.length; i++) {
    this.buckets[event.name] -= event.children[i].tdur;
    s = this.print(event.children[i], indent + '  ', s);
  }
  return s;
}

TracePrettyPrint.prototype.filter = function() {
  var result = '';
  for (var i = 0; i < this.data.traceEvents.length; i++) {
    result = this.print(this.data.traceEvents[i], '', result);
  }

  result += '\n';
  if (!(this.options.showTrace === true)) {
    result = '';
  }

  if (this.options.showSummary) {
    for (name in this.buckets)
      result += name + ' (' + this.categories[name] +'): ' + (this.buckets[name]/1000) + 'ms\n';
  }

  return result;
}

module.exports = TracePrettyPrint;
module.exports.defaults = {
  showTrace: true,
  showSummary: true
};
