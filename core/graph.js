var assert = require('chai').assert;

var _id = 0;

function newID(type) {
  return type + (_id++);
}

function Connection() {
  this.graph = undefined;
  this.fromPipes = [];
  this.toPipes = [];
  this.id = newID('n');
}

Connection.prototype.intoPipe = function(pipe) {
  assert(pipe.in == undefined);
  mergeGraphs(this, pipe);
  this.toPipes.push(pipe);
  pipe.in = this;
}

Connection.prototype.fromPipe = function(pipe) {
  assert(pipe.out == undefined);
  mergeGraphs(this, pipe);
  this.fromPipes.push(pipe);
  pipe.out = this;
}

Connection.prototype.isPipe = function() { return false; }
Connection.prototype.isConnection = function() { return true; }


function Pipe(stageName, options) {
  this.stageName = stageName;
  this.options = options || {};
  this.in = undefined;
  this.out = undefined;
  this.graph = undefined;
  this.id = newID('e');
}

Pipe.prototype.isPipe = function() { return true; }
Pipe.prototype.isConnection = function() { return false; }

Pipe.prototype.from = function(connections) {
  if (typeof(connections.length) !== 'number')
    connections = [connections];

  var directConnection = false;
  var connected = {};
  for (var i = 0; i < connections.length; i++) {
    if (connections[i].toPipes.length == 0) {
      connect(connections[i], this);
      directConnection = true;
      connected[i] = i;
    }
  }

  if (!directConnection) {
    var connection = new Connection();
    connect(connections[0], connection);
    connect(connection, this);
    connected[0] = 0;
  }

  for (var i = 0; i < connections.length; i++) {
    if (connected[i] !== undefined) {
      continue;
    }
    connect(connections[i], this);
  }

  if (this.out == undefined) {
    var connection = new Connection();
    connect(this, connection);
  }
  return this.out;
}

function Graph() {
  this.nodes = {};
  this.edges = {};
}

Graph.prototype.addEdge = function(edge) {
  if (edge == undefined || this.edges[edge.id] == edge)
    return;
  assert(this.edges[edge.id] == undefined);
  this.edges[edge.id] = edge;
  edge.graph = this;
}

Graph.prototype.addNode = function(node) {
  if (node == undefined || this.nodes[node.id] == node)
    return;
  assert(this.nodes[node.id] == undefined);
  this.nodes[node.id] = node;
  node.graph = this;
}

Graph.prototype.merge = function(graph) {
  for (node in graph.nodes) {
    assert(this.nodes[node] == undefined);
    this.nodes[node] = graph.nodes[node];
    this.nodes[node].graph = this;
  }
  for (edge in graph.edges) {
    assert(this.edges[edge] == undefined);
    this.edges[edge] = graph.edges[edge];
    this.edges[edge].graph = this;
  }
  graph.nodes = {};
  graph.edges = {};
}

Graph.prototype.contains = function(a) {
  if (a.isConnection())
    return this.nodes[a.id] == a;
  else
    return this.edges[a.id] == a;
}

Graph.prototype._filterBy = function(f, list) {
  return Object.keys(list).map(function(id) { return list[id]; }).filter(f);
}

Graph.prototype.inputs = function() {
  return this._filterBy(function(edge) { return edge.in == undefined; }, this.edges).concat(
    this._filterBy(function(node) { return node.fromPipes.length == 0; }, this.nodes));
}

Graph.prototype.outputs = function() {
  return this._filterBy(function(edge) { return edge.out == undefined; }, this.edges).concat(
    this._filterBy(function(node) { return node.toPipes.length == 0; }, this.nodes));
}

Graph.prototype.edgesCount = function() {
  return Object.keys(this.edges).length;
}

Graph.prototype.dump = function() {
  for (var e in this.edges) {
    var edge = this.edges[e];
    console.log(edge.in == undefined ? '_' : edge.in.id, '-' + edge.stageName + '->', 
                edge.out == undefined ? '_' : edge.out.id);
  }
}

function mergeGraphs(a, b) {
  if (a.graph == b.graph && a.graph !== undefined)
    return;

  var updateBothSides = false;
  if (a.graph == undefined && b.graph == undefined) {
    a.graph = new Graph();
    b.graph = a.graph;
    updateBothSides = true;
  } else if (a.graph != undefined && b.graph != undefined && a.graph != b.graph) {
    a.graph.merge(b.graph);
  }

  if (a.graph == undefined || updateBothSides) {
    if (a.isPipe())
      b.graph.addEdge(a);
    else
      b.graph.addNode(a);
  }
  if (b.graph == undefined || updateBothSides) {
    if (b.isPipe())
      a.graph.addEdge(b);
    else
      a.graph.addNode(b);
  }
}

function connectPipes(pipeWithOut, pipeWithIn) {
  assert(pipeWithIn.isPipe());
  assert(pipeWithOut.isPipe());

  mergeGraphs(pipeWithOut, pipeWithIn);
  if (pipeWithOut.out == undefined && pipeWithIn.in == undefined) {
    var connection = new Connection();
    connection.fromPipe(pipeWithOut);
    connection.intoPipe(pipeWithIn);
  } else if (pipeWithOut.out == undefined) {
    pipeWithIn.in.fromPipe(pipeWithOut);
  } else if (pipeWithIn.in == undefined) {
    pipeWithOut.out.intoPipe(pipeWithIn);
  } else if (pipeWithOut.out !== pipeWithIn.in) {
    var edge = new Pipe();
    connectPipes(pipeWithOut, edge);
    connectPipes(edge, pipeWithIn);
  }
}

function connectToPipe(connection, pipeWithIn) {
  assert(connection.isConnection());
  assert(pipeWithIn.isPipe());

  mergeGraphs(connection, pipeWithIn);
  if (pipeWithIn.in == undefined) {
    connection.intoPipe(pipeWithIn);
  } else {
    var edge = new Pipe();
    connection.intoPipe(edge);
    connectPipes(edge, pipeWithIn);
  }
}

function connectFromPipe(pipeWithOut, connection) {
  assert(connection.isConnection());
  assert(pipeWithOut.isPipe());

  mergeGraphs(pipeWithOut, connection);
  if (pipeWithOut.out == undefined) {
    connection.fromPipe(pipeWithOut);
  } else {
    var edge = new Pipe();
    connectPipes(pipeWithOut, edge);
    connection.fromPipe(edge);
  }
}

function connect(a, b) {
  if (a.isPipe() && b.isPipe()) {
    connectPipes(a, b);
  } else if (a.isPipe() && b.isConnection()) {
    connectFromPipe(a, b);
  } else if (a.isConnection() && b.isPipe()) {
    connectToPipe(a, b);
  } else {
    var edge = new Pipe();
    connectToPipe(a, edge);
    connectFromPipe(edge, b);
  }
}

module.exports.Pipe = Pipe;
module.exports.Connection = Connection;
module.exports.connect = connect;
