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
import os
import subprocess

import telemetry.core
from telemetry.internal.browser import browser_options
from telemetry.internal.browser import browser_finder

from telemetry.timeline import tracing_category_filter
from telemetry.timeline import tracing_options

from profile_chrome import trace_packager

from json import dumps

import tempfile

# import optionParser

options = browser_options.BrowserFinderOptions();
options.extra_browser_args_as_string = '--single-process --no-sandbox'
parser = options.CreateParser();
(_, args) = parser.parse_args();
cwd = os.getcwd()
import os
os.chdir('/usr/local/google/home/soonm/chromium-android/src')

browserFactory = browser_finder.FindBrowser(options);

def convertPerfProfileToJSON(perf_profile):
    sys.stderr.write('writing ' + perf_profile + ' to json\n')
    perfhost_path = '/usr/local/google/home/soonm/chromium-android/src/tools/telemetry/bin/linux/x86_64/perfhost_trusty'
    perf_script_path = '/usr/local/google/home/soonm/chromium-android/src/tools/profile_chrome/third_party/perf_to_tracing.py'
    symfs_dir = '/tmp/erlnmyr-perf/'
    kallsyms = '/tmp/erlnmyr-perf/kallsyms'
    json_file_name = os.path.basename(perf_profile)
    sys.stderr.write(json_file_name)
    with open(os.devnull, 'w') as dev_null, \
        open(json_file_name, 'w') as json_file:
      cmd = [perfhost_path, 'script', '-s', perf_script_path, '-i',
             perf_profile, '--symfs', symfs_dir, '--kallsyms', kallsyms]

      if subprocess.call(cmd, stdout=json_file, stderr=sys.stderr):
        sys.stderr.write('Perf data to JSON conversion failed. The result will '
                        'not contain any perf samples. You can still view the '
                        'perf data manually as shown above.')
        return None
    return json_file_name

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
      browser.profiling_controller.Start('perf', '/tmp/erlnmyr-perf/profiling-results');
      sys.stdout.write('OK');
      sys.stdout.flush();
    elif command.startswith('endTracing'):
      sys.stderr.write('EndTrace\n');
      data = browser.platform.tracing_controller.Stop();
      result = browser.profiling_controller.Stop();
      sys.stderr.write('Results : ' + str(result));
      json_result = [convertPerfProfileToJSON(i) for i in result]
      f = tempfile.NamedTemporaryFile();
      data.Serialize(f);
      f.flush();
      sys.stderr.write('final files : ' + str(json_result))
      sys.stdout.write(f.name + '\n');
      sys.stdout.flush();
      json_result.append(f.name)
      combined = trace_packager.PackageTraces(json_result, output=cwd+'/final-form', compress=False, write_json=False)
      sys.stderr.write("Trace written to file://%s" % os.path.abspath(combined))
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
