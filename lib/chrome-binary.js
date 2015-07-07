var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var Promise = require('bluebird');

var ChromeBinary = function(data, options) {
  if (!options.version || !options.chromium) return;
  this.version = options.version;
  this.chromium = options.chromium;
  this.platform = options.platform;
  this.data = data;
  this.options = options;
}

ChromeBinary.prototype.run = function() {
  var args = ['lib/chrome-binary.py', '-v', this.version, '-d', this.chromium, '-a', this.platform];
  var child = spawn('python', args);
  var filename = '';
  var version = this.version;

  child.stderr.on('data', function(data) { console.log('ChromeBinary Error: ' + data); });
  child.stdout.on('data', function(data) { 
    filename = data.toString();
  });

  return new Promise(function(resolve, reject) {
    child.on('close', function(code) { 
      console.log('Chrome binary ' + version + ' saved to ' + filename);
      resolve(filename);
    });
  });
}

module.exports = ChromeBinary;
