var ejs = require('ejs');

function EjsFabricator(data, prefix) {
  this.data = data;
  this.repeat = function(n, f) { for (var i = 0; i < n; i++) { f(); } },
  this.random = function(min, max) { return Math.floor(Math.random() * (max + 0.5 - min) + min); },
  this.permutation = function(list) {
    if (this.templateMode) {
      if (this.permutations[this.permutations.length - 1] == ']')
        this.permutations += ',';
      this.permutations += "[[";
      for (var i = 0; i < list.length; i++) {
        if (i > 0)
          this.permutations += "],[";
	list[i]();
      }
      this.permutations += "]]";
    } else {
      var pos = this.permutationContext[0];
      this.permutationContext = this.permutationContext.slice(1);
      list[pos]();
    }
  }
  this.alphabet = "abcdefghijklmnopqrstuvwzyzABCDEFGHIJKLMNOPQRSTUVWXYZ      ";
  this.randomText = function(min, max) {
    var result = "";
    var length = this.random(min, max);
    for (var i = 0; i < length; i++)
      result += this.alphabet[this.random(0, this.alphabet.length - 1)];
    return result;
  };
  this.context = this;
  this.prefix = prefix;

  // generate template
  this.templateMode = true;
  this.permutations = "[";
  ejs.render(this.data, this);
  this.permutations += "]";
  this.templateMode = false;

  this.permutations = eval(this.permutations);

  this.localChoices = function(options, results) {
    var newResults = [];
    for (var i = 0; i < results.length; i++) {
      for (var j = 0; j < options.length; j++) {
        var thisResult = results[i].slice();
        thisResult.push(j);
        var permResults = this.generatePermutations(options[j], [thisResult]);
        newResults = newResults.concat(permResults);
      }
    }
    return newResults;
  }

  this.generatePermutations = function(permutations, results) {
    if (permutations.length == 0)
      return results;

    for (var i = 0; i < permutations.length; i++) {
      results = this.localChoices(permutations[i], results);
    }
    return results;

    var thisLevel = permutations.map(function(a) { return a.length; });
    var total = thisLevel.reduce(function(a, b) { return a * b }, 1);

    var permutationList = [];
    for (var i = 0; i < total; i++) {
      var value = i;
      var result = thisLevel.map(function(a) { var me = value % a; value = Math.floor(value / a); return me; });
      var position = 0;
      for (var j = 0; j < thisLevel.length; j++) {
        position += 1;
        var subPerms = this.generatePermutations(permutations[j][result[j]]);
      }
      permutationList.push(result);
    }
    return permutationList;
  }

  this.permutationList = this.generatePermutations(this.permutations, [[]]);

}

EjsFabricator.prototype.fabricate = function() {
  var results = {};
  for (var i = 0; i < this.permutationList.length; i++) {
    this.permutationContext = this.permutationList[i].slice();
    results[this.prefix + this.permutationList[i].join('')] = ejs.render(this.data, this);
  }
  return results;
}

module.exports = EjsFabricator;
