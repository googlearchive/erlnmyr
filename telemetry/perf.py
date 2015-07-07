import telemetry.core
import sys;
from telemetry.internal.browser import browser_options
from telemetry.internal.browser import browser_finder

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
    if i == tab:
      continue
    i.Close()

  category_filter = tracing_category_filter.TracingCategoryFilter()
  options = tracing_options.TracingOptions()
  options.enable_chrome_trace = True
  browser.platform.tracing_controller.Start(options, category_filter);
  tab.Navigate(args[0]);
  tab.WaitForDocumentReadyStateToBeComplete();
  browser.platform.tracing_controller.Stop().Serialize(sys.stdout);
