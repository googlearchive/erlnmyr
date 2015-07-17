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

var assert = require('chai').assert;

var unit = 'unit';
var string = 'string';
var JSON = 'JSON';
var experiment = 'experiment';
var buffer = 'buffer';
var number = 'number';

var primitives = {unit: true, string: true, JSON: true, experiment: true, buffer: true, number: true};

function isPrimitive(type) {
  return primitives[type] == true || isTypeVar(type);
}

var typeVarID = 0;

function newTypeVar() {
  return {tVar: typeVarID++};
}

function isTypeVar(type) {
  return typeof type == 'object' && type.tVar !== undefined;
}

function Tagged(type, tag) {
  return {base: type, tag: tag};
}

function isTagged(type) {
  return typeof type == 'object' && type.tag !== undefined;
}

function getTag(type) {
  assert.isTrue(isTagged(type));
  return type.tag;
}

function deTag(type, tag) {
  assert.isTrue(isTagged(type));
  assert.isTrue(getTag(type) == tag);
  return type.base;
}

function List(type) {
  return Tagged(type, 'list');
}

function Tuple(left, right) {
  return {left: left, right: right};
}

function isTuple(type) {
  return typeof type == 'object' && type.left !== undefined && type.right !== undefined;
}

function leftType(type) {
  assert.isTrue(isTuple(type));
  return type.left;
}

function rightType(type) {
  assert.isTrue(isTuple(type));
  return type.right;
}

// string-keyed maps
function Map(type) {
  return {value: type};
}

function isMap(type) {
  return typeof type == 'object' && type.value !== undefined;
}

function deMap(type) {
  assert.isTrue(isMap(type));
  return type.value;
}

function substitute(type, coersion) {
  assert.isTrue(isPrimitive(type) && isTypeVar(type), type + ' is a primitive type var');
  var subs = {};
  subs.value = coersion[type.tVar];
  subs.coersion = {};
  for (key in coersion) {
    if (key == type.tVar)
      continue;
    subs.coersion[key] = coersion[key];
  }
  return subs;
}

function Stream(tags) {
  return {tags: tags};
}

function isStream(type) {
  return typeof type == 'object' && type.tags !== undefined;
}

// TODO complete this, deal with multiple type vars if they ever arise.
function coerce(left, right, coersion, visited) {
  visited = visited || [];
  // 'a -> 'a, string -> string, JSON -> JSON, etc.
  if (left == right)
    return coersion;

  if (isTagged(left) && isTagged(right) && getTag(left) == getTag(right)) {
    var tag = getTag(left);
    return coerce(deTag(left, tag), deTag(right, tag), coersion);
  }

  if (isTuple(left) && isTuple(right)) {
    var leftCoerce = coerce(leftType(left), leftType(right), coersion);
    var rightCoerce = coerce(rightType(left), rightType(right), coersion);
    if (leftCoerce == undefined || rightCoerce == undefined)
      return undefined;
    for (key in rightCoerce)
      leftCoerce[key] = rightCoerce[key];
    return leftCoerce;
  }

  if (isMap(left) && isMap(right)) {
    return coerce(deMap(left), deMap(right), coersion);
  }

  if (isStream(left) && isStream(right)) {
    for (var i = 0; i < left.tags.length; i++) {
      var leftTag = left.tags[i];
      for (var j = 0; j < right.tags.length; j++) {
        var rightTag = right.tags[j];
        if (leftTag.key == rightTag.key && (leftTag.value == rightTag.value || leftTag.value == undefined || rightTag.value == undefined)) {
          var coersion = coerce(leftTag.type, rightTag.type, coersion);
          if (coersion == undefined)
            return undefined;
        }
      }
    }
    return coersion;
  }

  // 'a -> 'b
  if (isTypeVar(left) && isTypeVar(right)) {
    var result = left;
    while (isTypeVar(result) && coersion[result.tVar] !== undefined)
      result = coersion[result.tVar];
    left = result;
  }

  // 'a -> string
  // In this instance, 'a has already been introduced,
  // so we must actually check that it type-matches the RHS.
  if (isTypeVar(left)) {
    var subs = substitute(left, coersion);
    if (subs.value == undefined) {
      coersion[left.tVar] = right;
      return coersion;
    }
    if (isTypeVar(subs.value) && visited.indexOf(subs.value.tVar) !== -1)
      return undefined;
    visited.push(subs.value.tVar);
    var coersion = coerce(subs.value, right, coersion, visited);
    return coersion;
  }

  // string -> 'a
  if (isTypeVar(right)) {
    coersion[right.tVar] = left;
    return coersion;
  }

  return undefined;
}

for (primitive in primitives)
  module.exports[primitive] = primitive;
module.exports.newTypeVar = newTypeVar;
module.exports.List = List;
module.exports.Tuple = Tuple;
module.exports.Map = Map;
module.exports.isMap = isMap;
module.exports.deMap = deMap;
module.exports.Stream = Stream;
module.exports.coerce = coerce;
