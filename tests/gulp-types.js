var assert = require('chai').assert;

var types = require('../gulp-types');

function coersion(a, b, existing) {
  existing = existing || {};
  existing[a.tVar] = b;
  return existing;
} 

describe('coerce', function() {
  it('should match simple types without coersion', function() {
    assert.deepEqual({}, types.coerce(types.unit, types.unit, {}));
    assert.deepEqual({}, types.coerce(types.JSON, types.JSON, {}));
    assert.deepEqual({}, types.coerce(types.string, types.string, {}));
  });
  
  it('should match identical type vars without coersion', function() {
    var typeVar = types.newTypeVar();
    assert.deepEqual({}, types.coerce(typeVar, typeVar, {}));
  });

  it('should match identical composite types without coersion', function() {
    var typeVar1 = types.newTypeVar();
    var typeVar2 = types.newTypeVar();
    assert.deepEqual({}, types.coerce(types.List(types.unit), types.List(types.unit), {}));
    assert.deepEqual({}, types.coerce(types.Tuple(types.JSON, types.string), types.Tuple(types.JSON, types.string), {}));
    assert.deepEqual({}, types.coerce(
      types.Tuple(types.List(typeVar1), types.Tuple(typeVar2, types.List(types.string))),
      types.Tuple(types.List(typeVar1), types.Tuple(typeVar2, types.List(types.string))),
      {}));
  });

  it('should not match mismatched types', function() {
    var typeVar = types.newTypeVar();
    assert.deepEqual(undefined, types.coerce(types.unit, types.JSON, {}));
    assert.deepEqual(undefined, types.coerce(types.Tuple(types.unit, types.string), types.Tuple(types.unit, types.JSON), {}));
    assert.deepEqual(undefined, types.coerce(types.Tuple(types.unit, types.string), types.Tuple(types.unit, types.JSON), {}));
    assert.deepEqual(undefined, types.coerce(types.Tuple(typeVar, types.JSON), types.Tuple(typeVar, types.string), {}));
  });

  it('should coerce typeVars to simple types', function() {
    var typeVar = types.newTypeVar();
    assert.deepEqual(coersion(typeVar, types.string), types.coerce(typeVar, types.string, {}));
    assert.deepEqual(coersion(typeVar, types.JSON), types.coerce(types.JSON, typeVar, {}));
  });

  /**
   * currently failing - pls fix!
  it('should coerce typeVars to complex types', function() {
    var typeVar = types.newTypeVar();
    assert.deepEqual(coersion(typeVar, '[string]'), types.coerce(typeVar, '[string]', {}));
    assert.deepEqual(coersion(typeVar, '(JSON,string)'), types.coerce('(JSON,string)', typeVar, {}));
  });
   */

  it('should coerce typeVars to typeVars', function() {
    var typeVar1 = types.newTypeVar();
    var typeVar2 = types.newTypeVar();
    assert.deepEqual(coersion(typeVar1, typeVar2), types.coerce(typeVar1, typeVar2, {}));
  });

  /**
   * NOTE: I'm not sure it's right to perform the reduction here.
   * should type information be carried through the coersions until the
   * entire branch is type checked?
   */
  it('should follow and reduce typeVar coersion chains', function() {
    var typeVar1 = types.newTypeVar();
    var chain = coersion(typeVar1, types.string);
    assert.deepEqual({}, types.coerce(typeVar1, types.string, chain));
  });

  /**
   * currently failing = pls fix!
  it('should follow long typeVar coersion chains', function() {
    var typeVar1 = types.newTypeVar();
    var typeVar2 = types.newTypeVar();
    var typeVar3 = types.newTypeVar();
    var chain = coersion(typeVar1, typeVar2, coersion(typeVar2, typeVar3, coersion(typeVar3, types.string)));
    assert.deepEqual(chain, types.coerce(typeVar1, types.string, chain));
  });
   */

  it('should not infinitely recurse through coersion chains', function() {
    var typeVar1 = types.newTypeVar();
    var typeVar2 = types.newTypeVar();
    var typeVar3 = types.newTypeVar();
    var chain = coersion(typeVar1, typeVar2, coersion(typeVar2, typeVar3, coersion(typeVar3, typeVar1)));
    assert.deepEqual(undefined, types.coerce(typeVar1, types.string, chain));
  });

  it('should resolve more complex expressions correctly', function() {
    var typeVar1 = types.newTypeVar();
    var typeVar2 = types.newTypeVar();
    assert.deepEqual(types.coerce(typeVar1, 'unit', types.coerce(typeVar2, 'unit')), types.coerce(types.Tuple(typeVar1, typeVar1), types.Tuple(types.unit, typeVar2), {}));
  });
});

