var Fabricator = require('./fabricator');

function SchemaBasedFabricator(schema) {
  Fabricator.call(this);
  this.elements = schema.elements;
  this.branchiness = schema.branchiness;
  this.textiness = schema.textiness;
  this.spaceWeightedText = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.,?!          ';
}

SchemaBasedFabricator.prototype = Object.create(Fabricator.prototype);
SchemaBasedFabricator.prototype.constructor = SchemaBasedFabricator;

SchemaBasedFabricator.prototype.getInDistribution = function(distribution) {
  distribution = distribution || [1];
  var r = 1 - Math.random();
  var cumulativePD = 0;
  for (i = 0; i < distribution.length; i++) {
    cumulativePD += distribution[i];
    if (r < cumulativePD)
      return i;
  }
  return distribution.length;
}

SchemaBasedFabricator.prototype.generateText = function(minLength, maxLength) {
  var length = Math.round(Math.random() * (maxLength - minLength) + minLength + 0.5);
  var str = '';
  for (var i = 0; i < length; i++)
    str += this.spaceWeightedText[Math.round(Math.random() * this.spaceWeightedText.length - 0.5)];
    
  return str;
}

SchemaBasedFabricator.prototype.generateThisLevel = function(idx, element) {
  var childCount = this.getInDistribution(this.branchiness[idx]);
  if (this.elements[element].textPermitted)
    var textCount = this.getInDistribution(this.textiness[idx][0]);
  else
    var textCount = 0;

  var childTextList = [];
  for (var i = 0; i < childCount; i++)
    childTextList.push('child');

  var textInsertionList = [];
  for (var i = 0; i < textCount; i++)
    textInsertionList.push(Math.round(childTextList.length * Math.random() - 0.5));

  textInsertionList.sort();
  for (var i = 0; i < textInsertionList.length; i++)
    childTextList.splice(textInsertionList[i] + i, 0, 'text');


  var elementSpec = this.elements[element].elementsPermitted;
  var r = Math.round(elementSpec.length * Math.random() - 0.5);
  var element = elementSpec[r];

  this.element(element, {});
  for (var i = 0; i < childTextList.length; i++) {
    if (childTextList[i] == 'child')
      this.generateThisLevel(idx + 1, element);
    else
      this.text(this.generateText(this.textiness[idx][1], this.textiness[idx][2]));
  }

  this.pop();
}

SchemaBasedFabricator.prototype.fabricate = function() {
  this.generateThisLevel(0, "BASE");
  return Fabricator.prototype.fabricate.call(this);
}

module.exports = SchemaBasedFabricator;
