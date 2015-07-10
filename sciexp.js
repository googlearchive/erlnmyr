#!/usr/bin/env node

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

// This craziness basically just makes sure that imports inside experiments
// are sane. When we run an experiment we do so as if the experiment were a
// node module in the same location.

var path = require('path');
var spawn = require('child_process').spawn;
var file = process.argv[2];
if (!path.isAbsolute(file)) {
  file = path.join(process.cwd(), file);
}
process.chdir(path.dirname(file));

function run(exports, target) {
  var run;
  try {
    // If there's a local tree-builder-builder, use that.
    run = require('tree-builder-builder').run;
  } catch (e) {
    // Otherwise fall back on the one alongside this binary.
    run = require(exports).run;
  }
  run(target, function(name) {
    return require(name);
  });
}

var exports = JSON.stringify(path.join(__dirname, 'exports.js'));
var target = JSON.stringify(file);

spawn('/usr/bin/env', [
  'node',
  '-e',
  '(' + String(run) + ')(' + exports + ', ' + target + ');',
], {stdio: 'inherit'});
