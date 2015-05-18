var assert = require('chai').assert;

var types = require('../gulp-types');

function coersion(a, b, existing) {
  existing = existing || {};
  existing[a] = b;
  return existing;
} 

describe('coerce', function() {
  it('should match simple types without coersion', function() {
    assert.deepEqual({}, types.coerce('unit', 'unit', {}));
    assert.deepEqual({}, types.coerce('JSON', 'JSON', {}));
    assert.deepEqual({}, types.coerce('string', 'string', {}));
  });
  
  it('should match identical type vars without coersion', function() {
    var typeVar = types.newTypeVar();
    assert.deepEqual({}, types.coerce(typeVar, typeVar, {}));
  });

  it('should match identical composite types without coersion', function() {
    var typeVar1 = types.newTypeVar();
    var typeVar2 = types.newTypeVar();
    assert.deepEqual({}, types.coerce('[unit]', '[unit]', {}));
    assert.deepEqual({}, types.coerce('(JSON,string)', '(JSON,string)', {}));
    assert.deepEqual({}, types.coerce('([' + typeVar1 + '],(' + typeVar2 + ',[string]))', '([' + typeVar1 + '],(' + typeVar2 + ',[string]))', {}));
  });

  it('should not match mismatched types', function() {
    var typeVar = types.newTypeVar();
    assert.deepEqual(undefined, types.coerce('unit', 'JSON', {}));
    assert.deepEqual(undefined, types.coerce('(unit,string)', '(unit,JSON)', {}));
    assert.deepEqual(undefined, types.coerce('(unit,string)', '(unit,JSON)', {}));
    assert.deepEqual(undefined, types.coerce('('+typeVar+',JSON)', '('+typeVar+',string)', {}));
  });

  it('should coerce typeVars to simple types', function() {
    var typeVar = types.newTypeVar();
    assert.deepEqual(coersion(typeVar, 'string'), types.coerce(typeVar, 'string', {}));
    assert.deepEqual(coersion(typeVar, 'JSON'), types.coerce('JSON', typeVar, {}));
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
    var chain = coersion(typeVar1, 'string');
    assert.deepEqual({}, types.coerce(typeVar1, 'string', chain));
  });

  /**
   * currently failing = pls fix!
  it('should follow long typeVar coersion chains', function() {
    var typeVar1 = types.newTypeVar();
    var typeVar2 = types.newTypeVar();
    var typeVar3 = types.newTypeVar();
    var chain = coersion(typeVar1, typeVar2, coersion(typeVar2, typeVar3, coersion(typeVar3, 'string')));
    assert.deepEqual(chain, types.coerce(typeVar1, 'string', chain));
  });
   */

  it('should not infinitely recurse through coersion chains', function() {
    var typeVar1 = types.newTypeVar();
    var typeVar2 = types.newTypeVar();
    var typeVar3 = types.newTypeVar();
    var chain = coersion(typeVar1, typeVar2, coersion(typeVar2, typeVar3, coersion(typeVar3, typeVar1)));
    assert.deepEqual(undefined, types.coerce(typeVar1, 'string', chain));
  });

});

