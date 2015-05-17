var assert = require('chai').assert;

var primitives = {'string': true, 'JSON': true, 'experiment': true};
function isPrimitive(type) {
  return primitives[type] == true || isTypeVar(type);
}

var typeVarID = 0;

function newTypeVar() {
  return "'" + (typeVarID++);
}

function isTypeVar(type) {
  return type[0] == "'";
}

function isList(type) {
  return type[0] == '[' && type[type.length - 1] == ']';
}

function delist(type) {
  assert.isTrue(isList(type));
  return type.slice(1, type.length - 1);
}

function isTuple(type) {
  return /\(([^,].*),([^,].*)\)/.exec(type) !== null;
}

function leftType(type) {
  assert.isTrue(isTuple(type));
  return /\(([^,].*),([^,].*)\)/.exec(type)[1];
}

function rightType(type) {
  assert.isTrue(isTuple(type));
  return /\(([^,].*),([^,].*)\)/.exec(type)[2];
}

function substitute(type, coersion) {
  assert.isTrue(isPrimitive(type) && isTypeVar(type), type + ' is a primitive type var');
  var subs = {};
  subs.value = coersion[type];
  subs.coersion = {};
  for (key in coersion) {
    if (key == type)
      continue;
    subs.coersion[key] = coersion[key];
  }
  return subs;
}

// TODO complete this, deal with multiple type vars if they ever arise.
function coerce(left, right, coersion) {
  // 'a -> 'a, string -> string, JSON -> JSON, etc.
  if (left == right)
    return coersion;

  if (isList(left) && isList(right)) {
    return coerce(delist(left), delist(right), coersion);
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

  if (!isPrimitive(left) || !isPrimitive(right))
    return undefined;

  assert.equal(isPrimitive(left), true, left + ' is a primitive type');
  assert.equal(isPrimitive(right), true, right + ' is a primitive type');

  // 'a -> 'b

  if (isTypeVar(left) && isTypeVar(right)) {
    var result = left;
    while (isTypeVar(result) && coersion[result] !== undefined)
      result = coersion[result];
    left = result;
  }

  // 'a -> string
  if (isTypeVar(left)) {
    var subs = substitute(left, coersion);
    if (subs.value == right)
      return subs.coersion;
    if (subs.value == undefined) {
      coersion[left] = right;
      return coersion;
    }
  }

  // string -> 'a
  if (isTypeVar(right)) {
    coersion[right] = left;
    return coersion;
  }

  return undefined;
}

module.exports.newTypeVar = newTypeVar;
module.exports.coerce = coerce;
