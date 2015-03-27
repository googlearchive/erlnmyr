var gulp = require('gulp');
var parseArgs = require('minimist');
var fs = require('fs');
var mocha = require('gulp-mocha');

var TreeBuilder = require('./lib/tree-builder');
var HTMLWriter = require('./lib/html-writer');
var JSWriter = require('./lib/js-writer');
var StatsWriter = require('./lib/stats-writer');
var StyleFilter = require('./lib/style-filter');
var StyleMinimizationFilter = require('./lib/style-minimization-filter');
var StyleTokenizerFilter = require('./lib/style-tokenizer-filter');
var SchemaBasedFabricator = require('./lib/schema-based-fabricator');

var options = parseArgs(process.argv.slice(2));

function writeFile(output, data, cb) {
  fs.writeFile(output, data, function(err) {
    if (err)
      throw err;
    console.log('written results into \"' + output + '\".');
    cb();
  });
}

function readFile(filename, cb) {
  fs.readFile(filename, 'utf8', function(err, data) {
    if (err)
      throw err;
    var data = JSON.parse(data);
    cb(data);
  });
}

/*
 * Pipeline Stages
 *
 * Each stage accepts a data object and a callback, and is responsible for
 * calling the callback with the result of processing the data.
 */

function fileReader(filename) {
  return function(_, cb) { readFile(filename, cb); };
}

function nullFilter() {
  return function(data, cb) { cb(data); }
}

function filter(FilterType) {
  return treeBuilderWriter(FilterType);
}

function fabricator(FabType) {
  return function(data, cb) {
    var fab = new FabType(data);
    cb(fab.fabricate());
  }
}

function treeBuilderWriter(WriterType) {
  return function(data, cb) {
    var writer = new WriterType();
    var builder = new TreeBuilder(writer);
    builder.build(data);
    builder.write(writer);
    cb(writer.getHTML());
  }
};

function fileOutput(filename) {
  return function(data, cb) { writeFile(filename, data, cb); };
}

function consoleOutput() {
  return function(data, cb) { console.log(data); cb(); };
}

gulp.task('test', function() {
  return gulp.src('tests/*.js', {read: false})
      .pipe(mocha({
        ui: 'bdd',
        ignoreLeaks: true,
        reporter: 'nyan'
    }));
});

/*
 * Constructing a pipeline
 *
 * Sorry for potato quality.
 */
function buildTask(name, stages) {
  gulp.task(name, function(cb) {
    for (var i = stages.length - 1; i >= 0; i--) {
      cb = (function(i, cb) { return function(data) { stages[i](data, cb); } })(i, cb);
    }
    cb(null);
  });
};

/*
 * Some example pipelines.
 */
buildTask('html', [fileReader(options.file), treeBuilderWriter(HTMLWriter), fileOutput('result.html.html')]);
buildTask('js', [fileReader(options.file), treeBuilderWriter(JSWriter), fileOutput('result.js.html')]);
buildTask('stats', [fileReader(options.file), treeBuilderWriter(StatsWriter), consoleOutput()]);
buildTask('compactComputedStyle', [fileReader(options.file), filter(StyleFilter), fileOutput(options.file + '.filter')]);
buildTask('extractStyle', [fileReader(options.file), filter(StyleMinimizationFilter), fileOutput(options.file + '.filter')]);
buildTask('generate', [fileReader(options.file), fabricator(SchemaBasedFabricator), fileOutput(options.file + '.gen')]);
buildTask('tokenStyles', [fileReader(options.file), filter(StyleTokenizerFilter), fileOutput(options.file + '.filter')]);
