var gulp = require('gulp');
var parseArgs = require('minimist');
var fs = require('fs');

var TreeBuilder = require('./lib/tree-builder.js');
var HTMLWriter = require('./lib/html-writer.js');

var options = parseArgs(process.argv.slice(2));

gulp.task('default', function() {
  console.log('Hello world!');
});

gulp.task('html', function(cb) {
  var name = options.file;

  fs.readFile(name, 'utf8', function(err, data) {
    if (err)
      throw err;

    var data = JSON.parse(data);

    var writer = new HTMLWriter();
    var builder = new TreeBuilder(writer);
    builder.build(data);
    builder.write(writer);

    console.log(writer.getHTML());
    cb();
  });

})