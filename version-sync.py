#!/usr/bin/env python
import optparse
import sys
import os

CHROMIUM_BASE_URL = ('http://commondatastorage.googleapis.com'
                     '/chromium-browser-snapshots')
WEBKIT_BASE_URL = ('http://commondatastorage.googleapis.com'
                   '/chromium-webkit-snapshots')

def main():
    parser = optparse.OptionParser()
    choices = ['mac', 'mac64', 'win', 'win64', 'linux', 'linux64', 'linux-arm', 'chromeos']
    parser.add_option('-a', '--archive', choices=choices, help='The platform archive to pull')
    parser.add_option('-v', '--version', type='str', help='A version you want to get')
    parser.add_option('-d', '--directory', type='str', help='Directory of your chromium checkout')
    parser.add_option('-l', '--blink',
                      action='store_true',
                      help='Use Blink instead of Chromium. ')

    (opts, args) = parser.parse_args()

    os.chdir(opts.directory)
    from "bisect-builds" import *

    if opts.blink:
        base_url = WEBKIT_BASE_URL
    else:
        base_url = CHROMIUM_BASE_URL

    # Create the context. Initialize 0 for the revisions as they are set below.
    context = PathContext(base_url, opts.archive, None, None,
                          True, None, False,
                          None, opts.pdf_path)


if __name__ == '__main__':
    sys.exit(main())
