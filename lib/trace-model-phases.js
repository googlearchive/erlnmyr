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

var phase = require('../core/register.js').phase;
var types = require('../core/types');
var tr = require('../third_party/tracing/tracing');
var traceModel = 'trace-model';

module.exports.traceModel = phase({
  input: types.string,
  output: traceModel,
  arity: '1:1',
}, function(data) {
  var model = new tr.Model()
  new tr.importer.Import(model).importTraces([data]);
  return model;
});
