var fs = require('fs');
var zlib = require('zlib');
var options = require('./options');

var events = [];
var now = function() {
  var t = process.hrtime();
  return t[0] * 1000000 + t[1] / 1000;
}

var asyncId = 0;
var flowId = 0;

function parseInfo(info) {
  if (!info)
    return info;
  if (typeof info == 'function')
    return info();
  if (info.toTraceInfo)
    return info.toTraceInfo();
  return info;
}

if (options.traceFile) {
  module.exports = {
    enabled: true,
    wrap: function(info, fn) {
      return function() {
        var t = module.exports.start(info);
        try {
          return fn.apply(this, arguments);
        } finally {
          t.end();
        }
      };
    },
    start: function(info) {
      info = parseInfo(info);
      var begin = now();
      return {
        end: function(endInfo) {
          var end = now();
          if (endInfo && endInfo.args) {
            for (var k in endInfo.args) {
              info.args[k] = endInfo.args[k]
            }
          }
          events.push({
            ph: 'X',
            ts: begin,
            dur: end - begin,
            cat: info.cat,
            name: info.name,
            args: info.args,
          });
        },
      };
    },
    async: function(info) {
      info = parseInfo(info);
      var id = asyncId++;
      var begin = now();
      events.push({
        ph: 'b',
        ts: begin,
        cat: info.cat,
        name: info.name,
        args: info.args,
        id: id,
      });
      return {
        end: function(endInfo) {
          var end = now();
          endInfo = parseInfo(endInfo);
          events.push({
            ph: 'e',
            ts: end,
            cat: info.cat,
            name: info.name,
            args: endInfo && endInfo.args,
            id: id,
          });
        },
        endWrap: function(fn) {
          var self = this;
          return function() {
            self.end();
            fn.apply(this, arguments);
          }
        }
      };
    },
    flow: function(info) {
      info = parseInfo(info);
      var id = flowId++;
      var started = false;
      return {
        start: function() {
          var begin = now();
          started = true;
          events.push({
            ph: 's',
            ts: begin,
            cat: info.cat,
            name: info.name,
            args: info.args,
            id: id,
          });
          return this;
        },
        end: function(endInfo) {
          if (!started) return;
          var end = now();
          endInfo = parseInfo(endInfo);
          events.push({
            ph: 'f',
            ts: end,
            cat: info.cat,
            name: info.name,
            args: endInfo && endInfo.args,
            id: id,
          });
          return this;
        },
        step: function(stepInfo) {
          if (!started) return;
          var step = now();
          stepInfo = parseInfo(stepInfo);
          events.push({
            ph: 't',
            ts: step,
            cat: info.cat,
            name: info.name,
            args: stepInfo && stepInfo.args,
            id: id,
          });
          return this;
        },
      };
    },
    dump: function() {
      events.forEach(function(event) {
        event.pid = 0;
        event.tid = 0;
        if (!event.args) {
          delete event.args;
        }
        if (!event.cat) {
          event.cat = '';
        }
      });
      zlib.gzip(JSON.stringify({
        traceEvents: events,
      }), function(_, buffer) {
        fs.writeFileSync(options.traceFile, buffer, 0, buffer.length);
      });
    },
  };
} else {
  var result = {
    start: function() {
      return this;
    },
    end: function() {
      return this;
    },
    step: function() {
      return this;
    },
    endWrap: function(fn) {
      return fn;
    },
  };
  module.exports = {
    enabled: false,
    wrap: function(info, fn) {
      return fn;
    },
    start: function(info, fn) {
      return result;
    },
    async: function(info, fn) {
      return result;
    },
    flow: function(info, fn) {
      return result;
    },
    dump: function() {
    },
  };
}
