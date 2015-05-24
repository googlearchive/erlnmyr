import telemetry.core
import sys;
from telemetry.core import browser_options
from telemetry.core import browser_finder

from telemetry.core.platform import tracing_category_filter
from telemetry.core.platform import tracing_options

from json import dumps

options = browser_options.BrowserFinderOptions();
parser = options.CreateParser();
(_, args) = parser.parse_args();

browserFactory = browser_finder.FindBrowser(options);

with browserFactory.Create(options) as browser:
  tab = browser.tabs.New();
  tab.Activate();
  for i in browser.tabs:
    if i == tab.id:
      continue
    browser.tabs.GetTabById(i).Close()

  category_filter = tracing_category_filter.TracingCategoryFilter()
  options = tracing_options.TracingOptions()
  options.enable_chrome_trace = True
  tab.Navigate(args[0]);
  tab.WaitForDocumentReadyStateToBeComplete();
  oldDisplay = tab.EvaluateJavaScript("document.documentElement.style.display");
  browser.platform.tracing_controller.Start(options, category_filter);
  iterations = 1
  if len(args) == 2:
    iterations = int(args[1])
  for i in range(iterations):
    tab.EvaluateJavaScript("(function() { document.documentElement.style.display = 'none'; return document.documentElement.offsetTop; })()");
    tab.EvaluateJavaScript("(function() { document.documentElement.style.display = '" + oldDisplay + "'; console.time('iteration" + str(i) + 
      "'); var x = document.documentElement.offsetTop; console.timeEnd('iteration" + str(i) + "'); })()");
  browser.platform.tracing_controller.Stop().Serialize(sys.stdout);
