var fs = require('fs');
var zlib = require('zlib');
var options = require('./options');

var events = [];
var now = function() {
  var t = process.hrtime();
  return t[0] * 1000000 + t[1] / 1000;
}

var asyncId = 0;

if (options.traceFile) {
  module.exports = {
    wrap: function(info, fn) {
      return function() {
        var localInfo = info;
        if (typeof info == 'function') {
          localInfo = info.call(this);
        }
        var t = module.exports.start(localInfo);
        try {
          return fn.apply(this, arguments);
        } finally {
          t.end();
        }
      };
    },
    start: function(info) {
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
  module.exports = {
    wrap: function(info, fn) {
      return fn;
    },
    start: function(info, fn) {
      return {
        end: function() {
        },
      };
    },
    async: function(info, fn) {
      return {
        end: function() {
        },
        endWrap: function(fn) {
          return fn;
        },
      };
    },
    dump: function() {
    },
  };
}
