var spawn = require('child_process').spawn;
var exec = require('child_process').exec;
var http = require('http');
var path = require('path');

var types = require('./types');
var options = require('./options');

// update PYTHONPATH for all telemetry invocations
if (options.chromium !== undefined)
  process.env.PYTHONPATH += path.delimiter + path.normalize(options.chromium) + '/tools/telemetry';

// TODO can probably unwrap this now.
function telemetryTask(pyScript, pyArgs) {
  return function(unused, cb) {
    var result = "";
    var task = spawn('python', ['telemetry/' + pyScript].concat(pyArgs));
    task.stdout.on('data', function(data) { result += data; });
    task.stderr.on('data', function(data) { console.log('stderr: ' + data); });
    task.on('close', function(code) { cb(result); });
  };
}

function telemetrySave() {
  return {
    impl: function(url, cb) {
      telemetryTask('save.py', ['--browser='+options.saveBrowser, '--', url])(undefined, function(data) { cb(JSON.parse(data)); });
    },
    name:'telemetrySave',
    input: types.string,
    output: types.JSON
  };
}

function telemetrySaveNoStyle() {
  return {
    impl: function(url, cb) {
      telemetryTask('save-no-style.py', ['--browser='+options.saveBrowser, '--', url])(undefined, function(data) { cb(JSON.parse(data)); });
    },
    name:'telemetrySaveNoStyle',
    input: types.string,
    output: types.JSON
  };
}

function adbPath() {
  var adb = options.adb || 'adb';
  return path.normalize(adb);
}

function startADBForwarding(then) {
  exec(adbPath() + ' reverse tcp:8000 tcp:8000', then);
}

function stopADBForwarding(then) {
  exec(adbPath() + ' reverse --remove tcp:8000', then);
}

function startServing(data) {
  return http.createServer(function(req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end(data);
  }).listen(8000, '127.0.0.1');
}

function stopServing(server) {
  server.close();
}

// perform perf testing of the provided url
function telemetryPerfStep(pythonScript, extraOptions) {
  return {
    impl: function(url, cb) {
      telemetryTask(pythonScript, ['--browser='+options.perfBrowser, '--', url].concat(extraOptions))(undefined, function(data) { cb(JSON.parse(data)); });
    },
    name: 'telemetryPerf',
    input: types.string,
    output: types.JSON
  };
}

function telemetryPerf() {
  return telemetryPerfStep('perf.py');
}

// start a local server and perf test pipeline-provided data
function simplePerfer() {
  return perfer(telemetryPerf());
}

function layoutPerfer(options) {
  if (options.iterations)
    options = [options.iterations];
  else
    options = [];
  return perfer(telemetryPerfStep('layout-perf.py', options));
}

function perfer(telemetryStep) {
  return {
    impl: function(data, cb) {
      startADBForwarding(function() {
        var server = startServing(data);
        telemetryStep.impl('http://localhost:8000', function(result) {
          stopServing(server);
          stopADBForwarding(function() {
            cb(result);
          });
        });
      });
    },
    name: 'simplePerfer',
    input: types.string,
    output: types.JSON
  };
}

module.exports.telemetrySave = telemetrySave;
module.exports.telemetrySaveNoStyle = telemetrySaveNoStyle;
module.exports.telemetryPerf = telemetryPerf;
module.exports.simplePerfer = simplePerfer;
module.exports.layoutPerfer = layoutPerfer;
