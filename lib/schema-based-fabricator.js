/*
  Copyright 2015 Google Inc. All Rights Reserved.
  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at
      http://www.apache.org/licenses/LICENSE-2.0
  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

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

/*
 * A distribution can either be:
 *  - a single number. The result will always be this value.
 *  - a list of numbers. The result will select randomly from the list.
 *  - a dictionary representation of a PDF. The result will be selected
 *    randomly from the keys, scaled by the values.
 */
SchemaBasedFabricator.prototype.getInDistribution = function(distribution) {
  if (distribution == undefined)
    return 0;

  if (typeof distribution == 'number')
    return distribution;

  if (typeof distribution.length == 'number') {
    var r = Math.floor(Math.random() * distribution.length);
    return distribution[r];
  }

  var total = 0;
  for (var value in distribution) {
    total += distribution[value];
  }
  var r = Math.random() * total;
  for (var value in distribution) {
    r -= distribution[value];
    if (r <= 0)
      return value;
  }
  return 0;
}

SchemaBasedFabricator.prototype.generateText = function(minLength, maxLength) {
  var length = Math.round(Math.random() * (maxLength - minLength) + minLength + 0.5);
  var str = '';
  for (var i = 0; i < length; i++)
    str += this.spaceWeightedText[Math.round(Math.random() * this.spaceWeightedText.length - 0.5)];

  return str;
}

SchemaBasedFabricator.prototype.generateThisLevel = function(idx, parentElement) {
  if (parentElement === undefined) {
    var element = "BASE";
    this.base();
  } else {
    var elementSpec = this.elements[parentElement].elementsPermitted;
    var r = Math.round(elementSpec.length * Math.random() - 0.5);
    var element = elementSpec[r];
    var width = Math.floor(Math.random() * 500 + 500);
    this.element(element, {'style': 'width: ' + width + 'px;'});
  }

  var childCount = this.getInDistribution(this.branchiness[idx]);

  if (element !== undefined && this.elements[element].textPermitted)
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

  for (var i = 0; i < childTextList.length; i++) {
    if (childTextList[i] == 'child')
      this.generateThisLevel(idx + 1, element);
    else
      this.text(this.generateText(this.textiness[idx][1], this.textiness[idx][2]));
  }

  if (element !== undefined)
    this.pop();
}

SchemaBasedFabricator.prototype.fabricate = function() {
  this.generateThisLevel(0);
  return Fabricator.prototype.fabricate.call(this);
}

module.exports = SchemaBasedFabricator;
