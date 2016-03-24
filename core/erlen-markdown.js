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

function Processor() {
  this.scope = {};
  this.exp = {
    options: {},
    imports: [],
    aliases: {},
  };
  this.experiments = 0;
}

Processor.process = function(file) {
  var input = fs.readFileSync(file, {encoding: 'utf8'});
  var processor = new Processor();
  // Would be nice if there was a markdown parser that had sufficient
  // schema to round trip. But I couldn't find one. So...
  var result = input.replace(/```\{(js|dot)\s+(!!?)}\n([\w\W]*?)\n```(\n?)/g, (_, lang, exec, code, tail) => {
    return processor.format(exec, tail, lang == 'js' ?
        processor.processJs(code) :
        processor.processDot(code, file));
  }); 
  var outFile = file + '.out.md';
  if (/\.erln.md$/.test(file)) {
    outFile = file.replace(/\.erln\.md$/, '.md');
  }
  fs.writeFileSync(outFile, result);
  console.log(md(result));
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
            join('\n') + '\n';
  }

  var imports = '';
  if (this.exp.imports && this.exp.imports.length > 0) {
    imports = JSON.stringify(this.exp.imports) + '\n';
  }
  var indented = (imports + options + code).replace(/(?:^|\n)(?!$)/g, '$&  ');
  var graph = `digraph G {\n${indented}\n}\n`;
  var outFile = file + `.${this.experiments++}.erlnmyr`;
  fs.writeFileSync(outFile, graph);

  var erlnmyr = path.join(__dirname, '../erlnmyr');
  var cmd = `${erlnmyr} ${file} `;
  var args = [outFile].concat(process.argv.slice(2));
  var result = child_process.spawnSync(erlnmyr, args, {encoding: 'utf8'});
  this.stdout = result.stdout;
  this.stderr = result.stderr;
  var output = result.stdout;
  return result.stdout + result.stderr;
};

Processor.prototype.format = function(exec, tail, result) {
  if (exec == '!!') {
    return '';
  }
  if (typeof result != 'string') {
    // TODO: Need to escape nested ```
    result = JSON.stringify(result);
  }
  return '```\n' + result + '\n```' + tail;
};

module.exports = Processor.process;
