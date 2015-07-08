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
var fs = Promise.promisifyAll(require('fs'));
var zlib = Promise.promisifyAll(require('zlib'));
var path = require('path');
var types = require('./types');
var stream = require('./stream');
var phase = require('./phase-register.js');

var StringDecoder = require('string_decoder').StringDecoder;
var TreeBuilder = require('../lib/tree-builder');
var EjsFabricator = require('../lib/ejs-fabricator');

module.exports.readDir = phase({input: types.string, output: types.string, arity: '1:N'},
  function(dirName, tags) {
    fs.readdirSync(dirName).forEach(function(filename) {
      this.put(path.join(dirName, filename)).tag('filename', filename);
    }.bind(this));
  });

function typeVar(s) { return (function(v) {
  if (!v[s]) {
    v[s] = types.newTypeVar();
  }
  return v[s];
}); }

module.exports.filter = phase({input: types.string, output: types.string, arity: '1:N'},
  function(value) {
    if (this.options.regExp.test(value)) {
      this.put(value);
    }
  },
  { regExp: /.?/ });

module.exports.log = phase({input: typeVar('a'), output: typeVar('a'), arity: '1:1'},
  function(data, tags) {
    this.options.tags.forEach(function(tag) {
      console.log(tag, tags.read(tag));
    });
    console.log(data);
    return data;
  },
  { tags: [] });

module.exports.jsonParse = phase({input: types.string, output: types.JSON, arity: '1:1'}, JSON.parse);

module.exports.jsonStringify = phase({input: types.JSON, output: types.string, arity: '1:1'}, JSON.stringify);

var treeBuilder = function(Type) {
  return function(data) {
    var writer = new Type();
    var builder = new TreeBuilder();
    builder.build(data);
    builder.write(writer);
    return writer.getHTML();
  };
};
var writers = {
  HTMLWriter: require('../lib/html-writer'),
  JSWriter: require('../lib/js-writer'),
  StatsWriter: require('../lib/stats-writer')
};
var filters = {
  StyleFilter: require('../lib/style-filter'),
  StyleMinimizationFilter: require('../lib/style-minimization-filter'),
  StyleTokenizerFilter: require('../lib/style-tokenizer-filter'),
  NukeIFrameFilter: require('../lib/nuke-iframe-filter'),
  StyleDetokenizerFilter: require('../lib/style-detokenizer-filter')
};
var fabricators = {
  SchemaBasedFabricator: require('../lib/schema-based-fabricator'),
};
for (var writer in writers) {
  module.exports[writer] = phase({input: types.JSON, output: types.string, arity: ':1'},
    treeBuilder(writers[writer]));
}
for (var filter in filters) {
  module.exports[filter] = phase({input: types.JSON, output: types.JSON, arity: '1:1'},
    treeBuilder(filters[filter]));
}
for (var fab in fabricators) {
  module.exports[fab] = phase({input: types.JSON, output: types.JSON, arity: '1:1'},
    function(data) {
      var fab = new (fabricators[fab])(data);
      return fab.fabricate();
    });
}

module.exports.ejsFabricator = phase({input: types.string, output: types.string, arity: '1:N'},
    function(data) {
      var result = new EjsFabricator(data, '').fabricate();
      for (key in result) {
        this.put(result[key]);
        this.tags.tag('ejsFabricator', key);
      }
    });

module.exports.writeStringFile = phase({input: types.string, output: types.string, arity: '1:1'},
    function(data, tags) {
      if (this.options.tag == '') {
        var filename = this.options.filename;
      } else {
        var filename = tags.read(this.options.tag);
      }
      fs.writeFileSync(filename, data);
      return data;
    },
    { tag: '', filename: 'result' });

module.exports.input = phase({output: types.string, arity: '0:1'},
    function(tags) {
      if (this.options.tag)
        tags.tag('data', this.options.data);
      return this.options.data;
    },
    { data: '', tag: true});

module.exports.retag = phase({input: typeVar('a'), output: typeVar('a'), arity: '1:1'},
  function(data, tags) {
    var input = tags.read(this.options.tag);
    if (input !== undefined)
      tags.tag(this.options.tag, input.replace(new RegExp(this.options.in), this.options.out));
    return data;
  },
  { tag: '', in: '', out: ''});

module.exports.dummy = phase({input: typeVar('a'), output: typeVar('a'), arity: '1:1'},
  function(data) { return data; });

// TODO: This is for testing. Does it belong here?
module.exports.compare = phase({input: typeVar('a'), output: typeVar('a'), arity: '1:1'},
  function(data, tags) {
    var input = tags.read(this.options.tag);
    var inFile = fs.readFileSync(input, 'utf8');
    if (typeof data != 'string') {
      inFile = JSON.parse(inFile);
    }
    var assert = require('chai').assert;
    assert.deepEqual(inFile, data);
    return data;
  },
  { tag: ''});

module.exports.fileToBuffer = phase({input: types.string, output: types.buffer, arity: '1:1', async: true},
  function(filename) {
    console.log('reading', filename, 'raw');
    return fs.readFileAsync(filename);
  });

module.exports.gunzipAndDecode = phase({
  input: types.buffer,
  output: types.string,
  arity: '1:1',
  async: true,
}, function(buffer) {
  var data;
  function unzipRecursive(buffer) {
    data = buffer;
    return zlib.gunzipAsync(buffer).then(unzipRecursive);
  }
  return unzipRecursive(buffer).catch(function(e) {
    return new StringDecoder('utf8').write(data);
  });
});

module.exports.bufferToString = phase({input: types.buffer, output: types.string, arity: '1:1'}, String);

module.exports.regexReplace = phase({
  name: 'regexReplace',
  input: types.string,
  output: types.string,
  arity: '1:1'
}, function(data) {
  if (this.options.pattern && this.options.pattern !== '') {
    this.tags.tag('regexReplace', this.options.pattern + ' -> ' + this.options.replace);
    return data.replace(new RegExp(this.options.pattern, this.options.flags), this.options.replace);
  }
  this.tags.tag('regexReplace', this.options.match + ' -> ' + this.options.replace);
  return data.replace(this.options.match, this.options.replace);
}, { match: '', replace: '', pattern: '', flags: '' });

module.exports.updateTag = phase({input: typeVar('a'), output: typeVar('a'), arity: '1:1'},
    function(data) {
      var newValue = this.tags.read(this.options.tag).replace(this.options.in, this.options.out);
      this.tags.tag(this.options.tag, newValue);
      return data;
    },
    {tag: '', in: /.?/, out: ""});
