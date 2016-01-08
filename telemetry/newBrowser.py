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

# To run erlnmyr
# ./erlnmyr test.erlnmyr --chromium=~/chromium-android/src
import sys
import os
import subprocess

import telemetry.core
from telemetry.internal.browser import browser_options
from telemetry.internal.browser import browser_finder

# Initialize the dependency manager
from telemetry.internal.util import binary_manager
from chrome_telemetry_build import chromium_config
binary_manager.InitDependencyManager(chromium_config.ChromiumConfig().client_config)

from telemetry.timeline import tracing_category_filter
from telemetry.timeline import tracing_options

from profile_chrome import trace_packager
from telemetry.internal.platform import device_finder

from json import dumps

import tempfile

options = browser_options.BrowserFinderOptions();
parser = options.CreateParser();
parser.add_option('-c', '--chromium', help='Directory for chromium src folder to use for binaries')
parser.add_option('-p', '--perf', help='Collect perf traces', action='store_true')
(_, args) = parser.parse_args();
cwd = os.getcwd()

if options.perf:
  options.AppendExtraBrowserArgs([
    '--no-sandbox',
    '--allow-sandbox-debugging',
    '--single-process'
  ])
  os.chdir(options.chromium)
  options.profiler = 'perf';

browserFactory = browser_finder.FindBrowser(options);

def convertPerfProfileToJSON(perf_profile):
  sys.stderr.write('Writing ' + perf_profile + ' to json\n')
  perfhost_path = os.path.join(options.chromium, 'tools', 'telemetry', 'bin', 'linux', 'x86_64', 'perfhost_trusty')
  perf_script_path = os.path.join(options.chromium, 'tools', 'profile_chrome', 'third_party', 'perf_to_tracing.py')

  symfs_dir = '/tmp/erlnmyr-perf/'
  kallsyms = '/tmp/erlnmyr-perf/kallsyms'
  json_file_name = os.path.basename(perf_profile)
  with open(os.devnull, 'w') as dev_null, open(json_file_name, 'w') as json_file:
    cmd = [perfhost_path, 'script', '-s', perf_script_path, '-i',
           perf_profile, '--symfs', symfs_dir, '--kallsyms', kallsyms]

    if subprocess.call(cmd, stdout=json_file, stderr=dev_null):
      sys.stderr.write('Perf data to JSON conversion failed. The result will '
                      'not contain any perf samples.')
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
      sys.stderr.write('Close Browser\n');
      break
    elif command.startswith('load:'):
      url = command[5:]
      tab.Navigate(url);
      tab.WaitForDocumentReadyStateToBeComplete();
      sys.stdout.write('OK');
      sys.stdout.flush();
    elif command.startswith('startTracing'):
      commandBits = command.split(' ')
      filter_string = None
      if len(commandBits) > 1 and commandBits[1].startswith('filter:'):
        filter_string = commandBits[1][7:]
      category_filter = tracing_category_filter.TracingCategoryFilter(filter_string=filter_string)
      tracing_options = tracing_options.TracingOptions()
      tracing_options.enable_chrome_trace = True
      browser.platform.tracing_controller.Start(tracing_options, category_filter);
      if options.perf:
        browser.profiling_controller.Start('perf', '/tmp/erlnmyr-perf/profiling-results');
      sys.stdout.write('OK');
      sys.stdout.flush();
    elif command.startswith('endTracing'):
      sys.stderr.write('EndTrace');
      data = browser.platform.tracing_controller.Stop();
      f = tempfile.NamedTemporaryFile();
      data.Serialize(f);
      f.flush();
      sys.stderr.write('flushed');

      if options.perf:
        sys.stderr.write('Downloading perf data and symbols from device...')
        perf_data = browser.profiling_controller.Stop();
        sys.stderr.write('Converting perf data to JSON\n')
        json_perf_data = [convertPerfProfileToJSON(i) for i in perf_data]
        json_perf_data = [i for i in json_perf_data if i is not None]

        json_perf_data.append(f.name)

        merged_profile = tempfile.NamedTemporaryFile();
        output = os.path.join(tempfile.tempdir, merged_profile.name)
        sys.stderr.write('Merging Traces\n')
        combined = trace_packager.PackageTraces(json_perf_data, output=output, compress=False, write_json=False)
        sys.stderr.write("Trace written to file://%s" % os.path.abspath(combined))

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
