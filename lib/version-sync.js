var exec = require('child_process').exec;
var spawn = require('child_process').spawn;

var VersionSync = function(options, data, cb) {
  if (!options.version || !options.chromium) return;

  var args = ['lib/version-sync.py', '-v', options.version, '-d', options.chromium, '-a', options.platform];
  var child = spawn('python', args);
  var filename = '';

  child.stderr.on('data', function(data) { console.log('Version Sync Error: ' + data); });
  child.stdout.on('data', function(data) { 
    filename = data.toString();
  });

  child.on('close', function(code) { 
    console.log('Chrome binary ' + options.version + ' saved to ' + filename);
    options.specificBrowser = filename;
    console.log('data from here', data);
    cb(data);
  });
}

module.exports = VersionSync;
