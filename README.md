# tree-builder-builder
Builder of Tree Builders

[![Build Status](https://travis-ci.org/dglazkov/tree-builder-builder.svg?branch=master)](https://travis-ci.org/dglazkov/tree-builder-builder)
[![Coverage Status](https://coveralls.io/repos/dglazkov/tree-builder-builder/badge.svg)](https://coveralls.io/r/dglazkov/tree-builder-builder)

## Quick Start Guide

### Installing all the bits

1.  Install git
2.  Grab the source code:
    `git clone https://github.com/dglazkov/tree-builder-builder.git`
3.  Install node.js from https://nodejs.org/download/
4.  `cd tree-builder-builder`
5.  `npm install`
6.  (optional) Install gulp globally so it'll be on your path:
    `sudo npm install -g gulp`
7.  (optional) if you want to be able to run automated perf tests or easily
    extract DOM from URLs, check out a chromium tree 
    (http://dev.chromium.org/developers/how-tos/get-the-code). Note that you
    don't need to build chromium, just check it out.

### Saving the DOM of web pages

If you have a local chromium checkout, and assuming that it's installed at /path/to/chromium:

`gulp get --url="http://example.com/my-super-exciting-DOM.html" --chromium=/path/to/chromium --saveBrowser=system`

This will save the DOM content of the provided url in a result.json file.

If you don't have a local chromium checkout, you can still save pages by
navigating to them in Chrome, opening dev tools, and dumping the contents
of `save.js` into the console.

### Converting DOM to HTML or JS

To save an HTML file (result.html.html)

`gulp html --file=result.json`

To save a JS file (result.js.html)

`gulp js --file=result.json`

### Dumping Stats about DOM

`gulp stats --file=result.json`

### Measuring DOM performance

You'll ned a local chromium checkout. You'll also need adb if you want to run perf tests on a rooted Android device.

`gulp perf --url=http://example.com --chromium=/path/to/chromium --perfBrowser=system`

or

`gulp perf --url=http://example.com --chromium=/path/to/chromium --adb=/path/to/adb --perfBrowser=android-jb-system-chrome`

Note that this will measure load performance of the live page. If you want to dump just the DOM content
and measure that instead, use:

`gulp endToEnd --url=http://example.com --chromium=/path/to/chromium --perfBrowser=system --saveBrowser=system`

or, to perf test on Android:

`gulp endToEnd --url=http://example.com --chromium=/path/to/chromium --adb=/path/to/adb --perfBrowser=android-jb-system-chrome --saveBrowser=system`

## Recorder Format

Base format is JSON of an array: `[]`.

Every item in this array is an object: `[{}, {}, ...]`.

Every object needs to have a property `t`, which represents the type of the object:
`[{'t': ...}, {'t': ...}, ...]`.

Other properties of the object depend on the value of `t`:

`[{'t':'n', 'v':'img'}, {'t':'a', 'n':'src', 'v':'foo.jpg'}, ...]`.

Here are all known values of `t`:

* `b` -- URL base for the stream of tokens. Expected other properties: 
  * `v` -- the base url
* `a` -- tag attribute. Expected other properties:
  * `n` -- name of the attribute
  * `v` -- value of the attribute
* `n` -- opening tag. Expected other properties: 
  * `n` -- name of the tag
* `/` -- closing tag
* `t` -- text. Expected other properties:
  * `v` -- text value
* `c` -- comment. Expected other properties:
  * `v` -- comment value

## Experiments

Using an experiment, you can set up a tree of filters and writers, along with
filename regular expressions to control input and output.  This lets you
perform complicated processing steps in the same way across a large number of
files.

Experiments can be used in two ways: via an experiment file (and the prerolled
gulp runExperiment target), or by using the experimentTask function in
gulpfile.js to directly register an experiment data structure.

### Experiment Files

example.exp contains an example experiment. An experiment consists of two
parts, with a blank line between them:

```
input -NukeIFrameFilter-> -HTMLWriter-> case-1
input-nostyle -NukeIFrameFilter-> -HTMLWriter-> case-2
input-nostyle -StyleFilter-> reduced* -NukeIFrameFilter-> -HTMLWriter-> case-3
reduced* -StyleMinimizationFilter-> -NukeIFrameFilter-> -HTMLWriter-> case-4

input: mobile-([^-]*).json
input-nostyle: mobile-([^-]*)-nostyle.json
case-1: mobile-$1-[nuked].html
case-2: mobile-$1-[nuked, nostyle].html
case-3: mobile-$1-[nuked, compressed, nostyle].html
case-4: mobile-$1-[nuked, extracted].html
```

The first part defines a tree of filters. Each line is a single processing
pathway, starting with an input name, then one or more filters or writers, then
an output name. Filters and writers are surrounded by an arrow (`-FilterName->`).
It's also possible to include additional intermediate targets (like `reduced*` above).

The second part defines regular expression matches for inputs, and replace
strings for outputs.  Names that are marked with a terminating asterix won't
generate final output and therefore don't need to be included in the list of
regular expression matches.

The example experiment therefore takes each file with a name matched by the
input regexp (`mobile-([^-]*).json`)
runs NukeIFrameFilter, then HTMLWriter, and stores the result in an output file name that is
generated by using inputFileName.replace(inputRE, case-1RE).

It also takes input-nostyle files,
and:
* runs them through NukeIFrameFilter then HTMLWriter
* runs them through StyleFilter (storing the intermediate result `reduced`),
  NukeIFrameFilter and HTMLWriter
* runs `reduced` through StyleMinimizationFilter, NukeIFrameFilter and
  HTMLWriter

So for example, if I started with the following two files:
* `mobile-mail.json`
* `mobile-mail-nostyle.json`

and ran
`gulp --file example.exp runExperiment`

then I would end up with
* `mobile-mail-[nuked].html`
* `mobile-mail-[nuked, nostyle].html`
* `mobile-mail-[nuked, compressed, nostyle].html`
* `mobile-mail-[nuked, extracted].html`

### Experiment data structure

Adding the following invokation to gruntfile.js will directly register an
experiment with a build target:

```
experimentTask('experiment', 
  { inputs: ["mobile-([^-]*).json", "mobile-([^-]*)-nostyle.json"],
    tree: {
      "mobile-([^-]*).json": [
        { stages: ['NukeIFrameFilter', 'HTMLWriter'], output: "mobile-$1-[nuked].html" }
      ],
      "mobile-([^-]*)-nostyle.json": [
        { stages: ['NukeIFrameFilter', 'HTMLWriter'], output: "mobile-$1-[nuked, nostyle].html" },
        { stages: ['StyleFilter'], output: "reduced" }
      ],
      "reduced": [
        { stages: ['StyleMinimizationFilter', 'NUkeIFrameFilter', 'HTMLWriter'],
          output: "mobile-$1-[nuked, extracted].html" },
        { stages: ['NukeIFrameFilter', 'HTMLWriter'],
          output: "mobile-$1-[nuked, compressed, nostyle].html" }
      ]
    }
  });
```

This defines the same experiment as the experiment file example.exp does. Note
that intermediate targets are not exposed in the data structure, and instead
branching is handled by lists of stage/output pairs for each input name.
