var spawn = require('child_process').spawn;
var exec = require('child_process').exec;
var http = require('http');

// update PYTHONPATH for all telemetry invocations
function updatePYTHONPATH() {
  if (options.chromium !== undefined)
    process.env.PYTHONPATH += ':' + options.chromium + '/tools/telemetry';
}

var options = undefined;
function init(parsedOptions) {
  options = parsedOptions;
  updatePYTHONPATH();
}

function telemetryTask(pyScript, pyArgs) {
  return function(unused, cb) {
    var result = "";
    var task = spawn('python', ['telemetry/' + pyScript].concat(pyArgs));
    task.stdout.on('data', function(data) { result += data; });
    task.stderr.on('data', function(data) { console.log('stderr: ' + data); });
    task.on('close', function(code) { cb(result); });
  };
}

function telemetrySave(url) {
  return {
    impl: function(unused, cb) {
      telemetryTask('save.py', ['--browser='+options.saveBrowser, '--', url])(unused, function(data) { cb(JSON.parse(data)); });
    },
    name:'telemetrySave: ' + url,
    input: 'unit',
    output: 'JSON'
  };
}

function telemetrySaveNoStyle(url) {
  return {
    impl: function(unused, cb) {
      telemetryTask('save-no-style.py', ['--browser='+options.saveBrowser, '--', url])(unused, function(data) { cb(JSON.parse(data)); });
    },
    name:'telemetrySaveNoStyle: ' + url,
    input: 'unit',
    output: 'JSON'
  };
}

function startADBForwarding(then) {
  exec(options.adb + ' reverse tcp:8000 tcp:8000', then);
}

function stopADBForwarding(then) {
  exec(options.adb + ' reverse --remove tcp:8000', then);
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
function telemetryPerf(url) {
  return {
    impl: function(unused, cb) {
      telemetryTask('perf.py', ['--browser='+options.perfBrowser, '--', url])(unused, function(data) { cb(JSON.parse(data)); });
    },
    name: 'telemetryPerf: ' + url,
    input: 'unit',
    output: 'JSON'
  };
}

// start a local server and perf test pipeline-provided data
function simplePerfer() {
  var telemetryStep = telemetryPerf('http://localhost:8000');
  return {
    impl: function(data, cb) {
      startADBForwarding(function() {
        var server = startServing(data);
        telemetryStep.impl(undefined, function(result) {
          stopServing(server);
          stopADBForwarding(function() {
            cb(result);
          });
        });
      });
    },
    name: 'simplePerfer',
    input: 'string',
    output: 'JSON'
  };
}

module.exports.init = init;
module.exports.telemetrySave = telemetrySave;
module.exports.telemetrySaveNoStyle = telemetrySaveNoStyle;
module.exports.telemetryPerf = telemetryPerf;
module.exports.simplePerfer = simplePerfer;
