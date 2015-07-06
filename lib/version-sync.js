var exec = require('child_process').exec;
var spawn = require('child_process').spawn;

var VersionSync = function(options, cb) {
  if (!options.version || !options.chromium) return;

  /*
  var blinkPath = options.chromium + '/third_party/WebKit';

  var gitCheckout = 'git -C ' + blinkPath + ' checkout origin/master';
  var gitClPatch = 'git -C ' + blinkPath + ' cl patch ' + options.version;
  var buildChrome = ['-C', options.chromium + '/out/Release', 'chrome'];

  var buildFunction = function() {
    console.log('Building Chrome');
    var child = spawn('ninja', buildChrome);
    child.stdout.on('data', function(data) { console.log(''+data); });
    child.stderr.on('data', function(data) { console.log('Build Chrome : ' + data); });
    child.on('close', function(data) { return cb(); });
  }

  var patchFunction = function() {
    console.log('VersionSync', 'Applying patch ' + options.version);
    exec(gitClPatch, function(err, stdout, stderr) {
      if (!err)
        return buildFunction();
      console.log(err);
    });
  }

  var checkoutFunction = function() {
    exec(gitCheckout, function(err, stdout, stderr) {
      if (!err)
        return patchFunction();
      console.log(err);
    });
  }

  checkoutFunction();
  */

  // V2
  var args = ['version-sync.py', '-v', options.version, '-d', options.chromium, '-a', options.platform];
  var child = spawn('python', args);
  child.stderr.on('data', function(data) { console.log('' + data); });
  child.stdout.on('data', function(data) { console.log('Version Sync : ' + data); });
  child.on('close', function(data) { return cb(); });
}

module.exports = VersionSync;
