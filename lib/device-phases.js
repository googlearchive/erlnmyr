var Promise = require('bluebird');
var spawn = require('child_process').spawn;
var exec = Promise.promisify(require('child_process').exec);
var http = require('http');
var path = require('path');

var types = require('../core/types');
var options = require('../core/options');

var phase = require('../core/phase-register');

// update PYTHONPATH for all telemetry invocations
if (options.chromium !== undefined)
  process.env.PYTHONPATH += path.delimiter + path.normalize(options.chromium) + '/tools/telemetry';

// TODO can probably unwrap this now.
function telemetryTask(pyScript, pyArgs) {
  return new Promise(function(resolve, reject) {
    var result = "";
    var task = spawn('python', ['telemetry/' + pyScript].concat(pyArgs));
    task.stdout.on('data', function(data) { result += data; });
    task.stderr.on('data', function(data) { console.log('stderr: ' + data); });
    task.on('close', function(code) { resolve(JSON.parse(result)); });
  });
}

function adbPath() {
  var adb = options.adb || 'adb';
  return path.normalize(adb);
}

function startADBForwarding() {
  return exec(adbPath() + ' reverse tcp:8000 tcp:8000');
}

function stopADBForwarding() {
  return exec(adbPath() + ' reverse --remove tcp:8000');
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

function hostedTelemetryTask(data, pyScript, pyArgs) {
  return startADBForwarding().then(function() {
      var server = startServing(data);
      return telemetryTask(pyScript, pyArgs).then(function(data) {
        stopServing(server);
        return stopADBForwarding().then(function() {
          return Promise.resolve(data);
        });
      });
    });
}

module.exports.fetch = phase({input: types.string, output: types.JSON, arity: '1:1', async: true, parallel: false},
  function(url) {
    return telemetryTask('save.py', ['--browser=' + this.options.browser, '--', url]);
  },
  {browser: 'system'});

module.exports.fetchWithInlineStyyle = phase({input: types.string, output: types.JSON, arity: '1:1', async: true, parallel: false},
  function(url) {
    return telemetryTask('save-no-style.py', ['--browser=' + this.options.browser, '--', url]);
  },
  {browser: 'system'});

module.exports.traceURL = phase({input: types.string, output: types.JSON, arity: "1:1", async: true, parallel: false},
  function(url) {
    return telemetryTask('perf.py', ['--browser=' + this.options.browser, '--', url]);
  },
  {browser: 'system'});

module.exports.trace = phase({input: types.string, output: types.JSON, arity: "1:1", async: true, parallel: false},
    function(html) {
      return hostedTelemetryTask(html, 'perf.py', ['--browser=' + this.options.browser, '--', 'http://localhost:8000']);
    },
    {browser: 'system'});

module.exports.traceLayout = phase({input: types.string, output: types.JSON, arity: "1:1", async: true, parallel: false},
    function(html) {
      return hostedTelemetryTask(html, 'perf.py', ['--browser=' + this.options.browser, '--', 'http://localhost:8000', this.options.iterations]);
    },
    {browser: 'system', iterations: 1});

