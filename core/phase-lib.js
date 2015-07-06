var fs = require('fs');
var path = require('path');
var types = require('./types');
var stream = require('./stream');
var phase = require('./phase');
var register = require('./phase-register.js');

var TreeBuilder = require('../lib/tree-builder');
var EjsFabricator = require('../lib/ejs-fabricator');
var TraceFilter = require('../lib/trace-filter');

register({name: 'readDir', input: types.string, output: types.string, arity: '1:N'},
  function(dirName, tags) {
    fs.readdirSync(dirName).forEach(function(filename) {
      this.put(path.join(dirName, filename)).tag('filename', filename);
    }.bind(this));
  });


register({name: 'log', input: types.string, output: types.string, arity: '1:1'},
  function(data, tags) {
    this.options.tags.forEach(function(tag) {
      console.log(tag, tags.read(tag));
    });
    console.log(data);
    return data;
  },
  { tags: [] });

register({name: 'jsonParse', input: types.string, output: types.JSON, arity: '1:1'},
  function(string) { return JSON.parse(string); });

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
for (WriterType in writers) {
  register({name: WriterType, input: types.JSON, output: types.string, arity: '1:1'},
    treeBuilder(writers[WriterType]));
}
for (FilterType in filters) {
  register({name: FilterType, input: types.JSON, output: types.JSON, arity: '1:1'},
    treeBuilder(filters[FilterType]));
}
for (FabType in fabricators) {
  register({name: FabType, input: types.JSON, output: types.JSON, arity: '1:1'},
    function(data) {
      var fab = new (fabricators[FabType])(data);
      return fab.fabricate();
    });
}

register({name: 'ejsFabricator', input: types.string, output: types.string, arity: '1:N'},
    function(data) { return new EjsFabricator(data, '').fabricate(); });

register({name: 'traceFilter', input: types.JSON, output: types.JSON, arity: '1:1'},
    function(data) {
      return new TraceFilter(data, this.options).filter();
    },
    TraceFilter.defaults);

register({name: 'writeStringFile', input: types.string, output: types.string, arity: '1:1'},
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

register({name: 'input', output: types.string, arity: '0:1'},
    function(tags) {
      if (this.options.tag)
        tags.tag('data', this.options.data);
      return this.options.data;
    },
    { data: '', tag: true});

register({name: 'retag', input: types.string, output: types.string, arity: '1:1'},
  function(data, tags) {
    var input = tags.read(this.options.tag);
    if (input !== undefined)
      tags.tag(this.options.tag, input.replace(new RegExp(this.options.in), this.options.out));
    return data;
  },
  { tag: '', in: '', out: ''});

register({name: 'dummy', input: types.string, output: types.string, arity: '1:1'},
  function(data) { return data; });

// TODO: This is for testing. Does it belong here?
register({name: 'compare', input: types.string, output: types.string, arity: '1:1'},
  function(data, tags) {
    var input = tags.read(this.options.tag);
    var inFile = fs.readFileSync(input, 'utf8');
    if (!(inFile == data)) {
      throw new Error(input + " file doesn't match provided data");
    }
  },
  { tag: ''});
