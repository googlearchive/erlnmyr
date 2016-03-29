/*
  Copyright 2016 Google Inc. All Rights Reserved.
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

'use strict';

const child_process = require('child_process');
const path = require('path');
const fs = require('fs');
const md = require('cli-md');
const tempfile = require('tempfile');

function Processor() {
  this.scope = {};
  this.exp = {
    options: {},
    imports: [],
    aliases: {},
  };
  this.experiments = 0;
  this.resources = {};
  this.resourceFiles = {};
}

Processor.process = function(file) {
  var input = fs.readFileSync(file, {encoding: 'utf8'});
  var processor = new Processor();
  // Would be nice if there was a markdown parser that had sufficient
  // schema to round trip. But I couldn't find one. So...
  var re = /```\{(\w+)\s+(!!?|>>?)([-\w]*)}\n([\w\W]*?)\n```(\n?)/g;
  var result = input.replace(re, (_, lang, exec, name, code, tail) => {
    var result = code;
    if (exec[0] == '!') {
      if (lang == 'js') {
        result = processor.processJs(code);
      } else if (lang == 'dot') {
        processor.processDot(code, file);
        result = processor.stdout;
        if (processor.stderr != '') {
          if (exec == '!' && processor.stdout != '') {
            result = processor.stdout + '\n' + processor.stderr;
          } else {
            result = processor.stderr;
          }
          // If there's an error, display it regardless of exec mode.
          exec = '!';
        }
      }
    } else if (exec == '>' && name.length > 0) {
      processor.setResource(name, code);
      result = '';
    }
    return processor.format(exec, tail, result);
  }); 
  var outFile = file + '.out.md';
  if (/\.erln.md$/.test(file)) {
    outFile = file.replace(/\.erln\.md$/, '.md');
  }
  fs.writeFileSync(outFile, result);
  console.log(md(result));
};

Processor.prototype.setResource = function(name, code) {
  var file = this.resourceFiles[name] || tempfile();
  fs.writeFileSync(file, code);
  this.resources[name] = code;
  this.resourceFiles[name] = file;
};

Processor.prototype.processJs = function(code) {
  var scope = this.scope;
  var exp = this.exp;
  var stdout = this.stdout;
  var stderr = this.stderr;
  var result = eval(code);
  this.scope = scope;
  this.exp = exp;
  return result;
};

Processor.prototype.processDot = function(code, file) {
  // TODO: Pass aliases.
  var options = '';
  if (this.exp.options && Object.keys(this.exp.options).length > 0) {
    options = Object.keys(this.exp.options).map(key => 
        key + ' [' + Object.keys(this.exp.options[key]).map(option =>
            option + '=' + JSON.stringify(this.exp.options[key][option])).join(', ') + '];').
            join('\n');
  }

  var imports = '';
  if (this.exp.imports && this.exp.imports.length > 0) {
    imports = JSON.stringify(this.exp.imports) + '\n';
  }
  var resources = Object.keys(this.resourceFiles).map(name =>
      `${name} [file="${this.resourceFiles[name]}", stage="fileInput"];`).join('\n');
  var indented = (imports + options + resources + code).replace(/(?:^|\n)(?!$)/g, '$&  ');
  var graph = `digraph G {\n${indented}\n}\n`;
  var outFile = file + `.${this.experiments++}.erlnmyr`;
  fs.writeFileSync(outFile, graph);

  var erlnmyr = path.join(__dirname, '../erlnmyr');
  var cmd = `${erlnmyr} ${file} `;
  var args = [outFile].concat(process.argv.slice(2));
  var result = child_process.spawnSync(erlnmyr, args, {encoding: 'utf8'});
  this.stdout = result.stdout;
  this.stderr = result.stderr;
  return result.stdout + result.stderr;
};

Processor.prototype.format = function(exec, tail, result) {
  if (exec == '!!' || result == '') {
    return '';
  }
  if (typeof result != 'string') {
    // TODO: Need to escape nested ```
    result = JSON.stringify(result);
  }
  return '```\n' + result + '\n```' + tail;
};

module.exports = Processor.process;
