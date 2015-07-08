var types = require('./types');
var assert = require('chai').assert;
var stages = require('./stages');
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
