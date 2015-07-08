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
});
