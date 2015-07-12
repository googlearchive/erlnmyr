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

var types = require('./types');
var assert = require('chai').assert;
var stageLoader = require('./stage-loader');
var Promise = require('bluebird');

var _instanceID = 0;
function newInstanceID() {
  return (_instanceID++) + '';
}

function Stream() {
  this.data = [];
}

Stream.prototype = {
  put: function(data, tags) {
    this.data.push({tags: tags, data: data});
  },
  get: function(key, match) {
    var result = [];
    var newData = [];
    for (var i = 0; i < this.data.length; i++) {
      var item = this.data[i];
      if (item.tags[key] == match || (item.tags[key] !== undefined && match == undefined)) {
        result.push(item);
      } else {
        newData.push(item);
      }
    }
    this.data = newData;
    return result;
  }
}

module.exports.Stream = Stream;
