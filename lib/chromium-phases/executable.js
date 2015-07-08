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

function Executable(options, cmd, args) {
  this.path = options.path;
  this.cmd = cmd;
  this.args = args;
  this.stdout = '';
  this.stderr = '';
}

Executable.prototype.toString = function() {
  return this.cmd + ' ' + this.args.join(' ');
}

Executable.prototype.run = function() {
  var child = spawn(this.cmd, this.args, {
    cwd: this.path,
  });

  child.on('error', function(err) {
    console.log('Unable to execute "' + this.toString() + '"');
    console.log('Is your path correct?');
  });

  var that = this;
  child.stdout.on('data', function(data) {
    that.stdout += data;
  });

  child.stderr.on('data', function(data) {
    that.stderr += data;
  });

  return new Promise(function(resolve) {
    child.on('close', function(code) {
      resolve(code);
    });
  });
}

module.exports = Executable;
