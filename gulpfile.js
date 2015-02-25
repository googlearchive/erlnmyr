var gulp = require('gulp');
var parseArgs = require('minimist');

var options = parseArgs(process.argv.slice(2));

gulp.task('default', function() {
  console.log('Hello world!', options);
});
