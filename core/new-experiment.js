var dot = require('graphlib-dot');
var types = require('./types');
var graph = require('./graph');
var linearize = require('./linearize');

function doExperiment() {
  return {
    impl: function(data, cb) {
      var inGraph = dot.read(data);
      var nodes = inGraph.nodes();
      for (var i = 0; i < nodes.length; i++)
        console.log(nodes[i], inGraph.node(nodes[i]));
      console.log(inGraph.edges());
      var edges = inGraph.edges();
      var pipes = {};
      for (var i = 0; i < edges.length; i++) {
        var edge = edges[i];
        if (!pipes[edge.v])
          pipes[edge.v] = new graph.Pipe(edge.v);
        if (!pipes[edge.w])
          pipes[edge.w] = new graph.Pipe(edge.w);
        graph.connect(pipes[edge.v], pipes[edge.w]);
      }
      pipes[edges[0].v].graph.dump();
      var linear = linearize(pipes[edges[0].v].graph);
      console.log(linear.map(function(x) { return x.map(function(a) { return a.stageName; })}));
    },
    name: 'doExperiment',
    input: types.string,
    output: types.unit
  };
}

module.exports.doExperiment = doExperiment;
