# Chromium Phases

This is a collection of phases that interact with the Chromium checkout.

### buildChromium

A **1:1**, **async** phase that kicks off the Chromium build in the local checkout and passes through any data it receives as input. Command-line arguments:

* `chromium` (required) -- must point to the Chromium checkout's `src` directory.

* `chromiumBuildTarget` -- specifies the build target for Chromium. Default value is `chrome`.

* `chromiumBuildConfig` -- specifies the build configuration. Default value is 'Release'.

