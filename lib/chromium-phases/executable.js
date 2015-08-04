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

var Promise = require('bluebird');
var spawn = require('child_process').spawn;

function Executable(path, cmd, args) {
  this.path = path;
  this.cmd = cmd;
  this.args = args || [];
  this.stdout = '';
  this.stderr = '';
}

Executable.prototype.toString = function() {
  return [].concat(this.cmd, this.args).join(' ');
}

Executable.prototype.run = function() {
  var child = spawn(this.cmd, this.args, {
    cwd: this.path,
  });

  child.on('error', function(err) {
    var errorMessage = 'Unable to execute "' + this.toString() + '"\nIs your path correct?';
    throw new Error(errorMessage);
  }.bind(this));

  child.stdout.on('data', function(data) {
    this.stdout += data;
  }.bind(this));

  child.stderr.on('data', function(data) {
    this.stderr += data;
  }.bind(this));

  return new Promise(function(resolve) {
    child.on('close', function(code) {
      resolve(code);
    });
  });
}

module.exports = Executable;
