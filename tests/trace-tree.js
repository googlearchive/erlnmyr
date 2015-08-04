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

var TraceTree = require('../lib/trace-tree');

function interval(name, start, duration, threadDuration, children) {
  return {name: name, ts: start, dur: duration, tdur: threadDuration, ph: 'X', children: children};
}

function constructedInterval(name, start, threadStart, threadDuration, children) {
  return {name: name, ts: start, tts: threadStart, tdur: threadDuration, ph: 'B', children: children};
}

function begin(name, start, threadStart) {
  return {name: name, ts: start, tts: threadStart, ph: 'B'};
}

function end(name, start, threadStart) {
  return {name: name, ts: start, tts: threadStart, ph: 'E'};
}

function test(data, expectedResult) {
  var result = new TraceTree({traceEvents: data}).filter();
  assert.deepEqual({traceEvents: expectedResult}, result);
}

describe('filter', function() {
  it('should extract a single trace interval', function() {
    var data = [interval('A', 100, 300, 200)];
    var expectedResult = [interval('A', 0, 300, 200, [])];
    test(data, expectedResult);
  });

  it('should extract a single begin/end pair', function() {
    var data = [begin('A', 100, 200), end('A', 400, 300)];
    var expectedResult = [constructedInterval('A', 0, 200, 100, [])];
    test(data, expectedResult); 
  });

  it('should extract nested trace intervals', function() {
    var data = [interval('A', 100, 500, 100), interval('B', 150, 400, 300)];
    var expectedResult = [interval('A', 0, 500, 100, [interval('B', 50, 400, 300, [])])];
    test(data, expectedResult);
  });

  it('should not nest adjacent trace intervals', function() {
    var data = [interval('A', 100, 500, 100), interval('B', 601, 400, 300)];
    var expectedResult = [interval('A', 0, 500, 100, []), interval('B', 501, 400, 300, [])];
    test(data, expectedResult);
  });

  it ('should extract a begin/end pair nested inside an interval', function() {
    var data = [interval('A', 100, 500, 100), begin('B', 150, 1000), end('B', 550, 1300)];
    var expectedResult = [interval('A', 0, 500, 100, [constructedInterval('B', 50, 1000, 300, [])])];
    test(data, expectedResult);
  });

  it('should extract an interval nested inside a begin/end pair', function() {
    var data = [begin('A', 100, 600), interval('B', 150, 400, 300), end('A', 600, 1000)];
    var expectedResult = [constructedInterval('A', 0, 600, 400, [interval('B', 50, 400, 300, [])])];
    test(data, expectedResult);
  });

  it('should not nest a begin/end pair adjacent to an interval', function() {
    var data = [begin('A', 100, 600), end('A', 600, 1000), interval('B', 601, 400, 300)];
    var expectedResult = [constructedInterval('A', 0, 600, 400, []), interval('B', 501, 400, 300, [])];
    test(data, expectedResult);
  });

  it('should nest begin/end pairs that overlap', function() {
    var data = [begin('A', 100, 600), begin('B', 150, 700), end('B', 550, 1100), end('A', 600, 1200)];
    var expectedResult = [constructedInterval('A', 0, 600, 600, [constructedInterval('B', 50, 700, 400, [])])];
    test(data, expectedResult);
  });

  it('should pop out of deeply nested intervals', function() {
    var data = [interval('A', 0, 1000, 1000), interval('B', 100, 800, 800), interval('C', 200, 600, 600), interval('D', 300, 400, 400), interval('E', 1100, 100, 100)];
    var expectedResult = [
      interval('A', 0, 1000, 1000, [
        interval('B', 100, 800, 800, [
          interval('C', 200, 600, 600, [
            interval('D', 300, 400, 400, [])])])]),
      interval('E', 1100, 100, 100, [])
    ];
    test(data, expectedResult);
  });

  it('should pop out of deeply nested begin/end pairs', function() {
    var data = [begin('A', 0, 0), begin('B', 100, 100), begin('C', 200, 200), begin('D', 300, 300), end('D', 700, 700), end('C', 800, 800), end('B', 900, 900), end('A', 1000, 1000),
                interval('E', 1100, 100, 100)];
    var expectedResult = [
      constructedInterval('A', 0, 0, 1000, [
        constructedInterval('B', 100, 100, 800, [
          constructedInterval('C', 200, 200, 600, [
            constructedInterval('D', 300, 300, 400, [])])])]),
      interval('E', 1100, 100, 100, [])
    ];
    test(data, expectedResult);
  });

  it('should pop out of a deeply nested combination of intervals and begin/end pairs', function() {
    var data = [begin('A', 0, 0), interval('B', 100, 800, 800), begin('C', 200, 200), interval('D', 300, 400, 400), end('C', 800, 800), end('A', 1000, 1000),
                interval('E', 1100, 100, 100)];
    var expectedResult = [
      constructedInterval('A', 0, 0, 1000, [
        interval('B', 100, 800, 800, [
          constructedInterval('C', 200, 200, 600, [
            interval('D', 300, 400, 400, [])])])]),
      interval('E', 1100, 100, 100, [])
    ];
  });
});

