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

import telemetry.core
import sys;
from telemetry.internal.browser import browser_options
from telemetry.internal.browser import browser_finder

# Initialize the dependency manager
from telemetry.internal.util import binary_manager
from chrome_telemetry_build import chromium_config
binary_manager.InitDependencyManager(chromium_config.ChromiumConfig().client_config)

from telemetry.timeline import tracing_category_filter
from telemetry.timeline import tracing_options

from json import dumps

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

  category_filter = tracing_category_filter.TracingCategoryFilter()
  options = tracing_options.TracingOptions()
  options.enable_chrome_trace = True
  tab.Navigate(args[0]);
  tab.WaitForDocumentReadyStateToBeComplete();
  tab.EvaluateJavaScript("(function() { document.documentElement.style.display = 'none'; return document.body.offsetTop; })()");
  browser.platform.tracing_controller.Start(options, category_filter);
  tab.EvaluateJavaScript("(function() { document.documentElement.style.display = 'block'; return document.body.offsetTop; })()");
  browser.platform.tracing_controller.Stop().Serialize(sys.stdout);
