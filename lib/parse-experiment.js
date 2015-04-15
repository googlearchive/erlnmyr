function ParseExperiment() {
}

ParseExperiment.prototype.parse = function(data) {
  var lines = data.split('\n');
  var pos = 0;
  var experiment = {inputs: [], tree: {}};
  while (lines[pos].trim().length !== 0) {
    var pipelet = lines[pos].split(' ');
    var input = pipelet[0];
    if (input[input.length - 1] !== '*' && experiment.inputs.indexOf(input) == -1)
      experiment.inputs.push(input);
    var output = pipelet[pipelet.length - 1];
    var stages = [];
    for (var i = 1; i < pipelet.length - 1; i++) {
      if (pipelet[i].substring(0, 1) == '-' && pipelet[i].substring(pipelet[i].length - 2) == '->') {
	stages.push(pipelet[i].substring(1, pipelet[i].length - 2));
      } else {
	if (experiment.tree[input] == undefined)
	  experiment.tree[input] = []
	experiment.tree[input].push({stages: stages, output: pipelet[i]});
	input = pipelet[i];
	if (input[input.length - 1] !== '*' && experiment.inputs.indexOf(input) == -1)
	  experiment.inputs.push(input);
	stages = [];
      }
    }
    if (experiment.tree[input] == undefined)
      experiment.tree[input] = []
    experiment.tree[input].push({stages: stages, output: output});

    pos += 1;
  }

  while (lines[pos].trim().length == 0)
    pos += 1;

  while (pos < lines.length) {
    var kv = lines[pos].split(':').map(function(a) { return a.trim(); });
    var key = kv[0];
    var value = kv[1];
    for (var i = 0; i < experiment.inputs.length; i++) {
      if (experiment.inputs[i] == key)
	experiment.inputs[i] = value;
    }
    for (var input in experiment.tree) {
      for (var i = 0; i < experiment.tree[input].length; i++) {
	if (experiment.tree[input][i].output == key)
	  experiment.tree[input][i].output = value;
      }
      if (input == key) {
	experiment.tree[value] = experiment.tree[key];
	delete experiment.tree[key];
      }
    }
    pos += 1;
  }

  return experiment;
}

module.exports = ParseExperiment;
