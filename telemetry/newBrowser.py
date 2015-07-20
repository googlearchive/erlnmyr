 # Copyright 2015 Google Inc. All rights reserved.
 #
 # Licensed under the Apache License, Version 2.0 (the "License");
 # you may not use this file except in compliance with the License.
 # You may obtain a copy of the License at
 #
 #   http://www.apache.org/licenses/LICENSE-2.0
 #
 # Unless required by applicable law or agreed to in writing, software
 # distributed under the License is distributed on an "AS IS" BASIS,
 # WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 # See the License for the specific language governing permissions and
 # limitations under the License

import sys

import telemetry.core
from telemetry.internal.browser import browser_options
from telemetry.internal.browser import browser_finder

from telemetry.timeline import tracing_category_filter
from telemetry.timeline import tracing_options

from json import dumps

import tempfile

options = browser_options.BrowserFinderOptions();
parser = options.CreateParser();
(_, args) = parser.parse_args();

browserFactory = browser_finder.FindBrowser(options);


with browserFactory.Create(options) as browser:
  tab = browser.tabs.New();
  tab.Activate();
  for i in browser.tabs:
    if i == tab:
      continue
    i.Close()

  while True:
    command = sys.stdin.readline()[:-1];
    if command == 'exit':
      break
    elif command.startswith('load:'):
      url = command[5:]
      tab.Navigate(url);
      tab.WaitForDocumentReadyStateToBeComplete();
      sys.stdout.write('OK');
      sys.stdout.flush();
    elif command.startswith('startTracing'):
      category_filter = tracing_category_filter.TracingCategoryFilter()
      options = tracing_options.TracingOptions()
      options.enable_chrome_trace = True
      browser.platform.tracing_controller.Start(options, category_filter);
      sys.stdout.write('OK');
      sys.stdout.flush();
    elif command.startswith('endTracing'):
      data = browser.platform.tracing_controller.Stop();
      f = tempfile.NamedTemporaryFile();
      data.Serialize(f);
      f.flush();
      sys.stdout.write(f.name + '\n');
      sys.stdout.flush();
      command = sys.stdin.readline()[:-1];
      assert command == 'done';
      f.close();
    elif command.startswith('exec:'):
      length = int(command[5:]);
      js = sys.stdin.read(length);
      result = tab.EvaluateJavaScript(js);
      f = tempfile.NamedTemporaryFile();
      f.write(dumps(result));
      f.flush();
      sys.stdout.write(f.name + '\n');
      sys.stdout.flush();
      command = sys.stdin.readline()[:-1];
      assert command == 'done';
      f.close();
