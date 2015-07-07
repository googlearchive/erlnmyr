var assert = require('chai').assert;

var experiment = require('../core/experiment');

describe('PhaseName', function() {
  it('should be the node name if nothing special', function() {
    assert.equal('boringName', experiment.getPhaseName('boringName', {}));
  });
  
  it('should be the label name if there is a label', function() {
    var options = {
      'label': 'someLabel'
    };
    assert.equal('someLabel', experiment.getPhaseName('nodeName', options));
  });

  it('should be the phase name if phase name is provided', function() {
    // This should be 'phase' rather than 'stage' once the underlying code has changed.
    var options = {
      'stage': 'phaseName'
    };
    assert.equal('phaseName', experiment.getPhaseName('nodeName', options));
  });

  it('should be the first part of the node name if it contains an "_"', function() {
    assert.equal('nodeName', experiment.getPhaseName('nodeName_1', {}));
  });

  it('should be the first part of the node name if no options are supplied', function() {
    assert.equal('nodeName', experiment.getPhaseName('nodeName_1', undefined));
  });
});
