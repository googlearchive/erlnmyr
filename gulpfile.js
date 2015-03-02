var gulp = require('gulp');
var parseArgs = require('minimist');
var fs = require('fs');

var TreeBuilder = require('./lib/tree-builder');
var HTMLWriter = require('./lib/html-writer');
var JSWriter = require('./lib/js-writer');
var StatsWriter = require('./lib/stats-writer');

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

gulp.task('default', function() {
  console.log('Hello world!');
});

gulp.task('html', function(cb) {
  var name = options.file;

  readFile(name, function(data) {
    var writer = new HTMLWriter();
    var builder = new TreeBuilder(writer);
    builder.build(data);
    builder.write(writer);

    var output = 'result.html.html';
    writeFile(output, writer.getHTML(), cb);
  });
});

gulp.task('js', function(cb) {
  var name = options.file;

  readFile(name, function( data) {
    var writer = new JSWriter();
    var builder = new TreeBuilder(writer);
    builder.build(data);
    builder.write(writer);

    var output = 'result.js.html';
    writeFile(output, writer.getHTML(), cb);
  });

});

gulp.task('stats', function(cb) {
  var name = options.file;

  readFile(name, function(data) {
    var writer = new StatsWriter();
    var builder = new TreeBuilder(writer);
    builder.build(data);
    builder.write(writer);

    console.log(writer.getHTML());
    cb();
  });

});
