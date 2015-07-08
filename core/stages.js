var fs = require('fs');

var types = require('./types.js');

function writeFile(output, data, cb) {
  if (typeof data !== types.string)
    stringData = JSON.stringify(data);
  else
    stringData = data;
  fs.writeFile(output, stringData, function(err) {
    if (err)
      throw err;
    console.log('written results into \"' + output + '\".');
    // passthrough data
    cb(data);
  });
}

module.exports.writeFile = writeFile;
