var gulp = require('gulp');
var parseArgs = require('minimist');
var fs = require('fs');

var TreeBuilder = require('./lib/tree-builder');
var HTMLWriter = require('./lib/html-writer');
var JSWriter = require('./lib/js-writer');

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

});

gulp.task('js', function(cb) {
  var name = options.file;

  fs.readFile(name, 'utf8', function(err, data) {
    if (err)
      throw err;

    var data = JSON.parse(data);

    var writer = new JSWriter();
    var builder = new TreeBuilder(writer);
    builder.build(data);
    builder.write(writer);

    var output = 'result.html';

    fs.writeFile(output, writer.getHTML(), function(err) {
      if (err)
        throw err;
      console.log('written results into \"' + output + '\".');
      cb();
    })
  });

});
