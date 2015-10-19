This is a compiled version of https://github.com/catapult-project/catapult/tree/master/tracing
built using the following steps:

1. Create `entry.html` in `catapult/`

    ```
    <!DOCTYPE html>
    <script>
    var glmatrix = require('gl-matrix');
    global.vec2 = glmatrix.vec2;
    global.vec3 = glmatrix.vec3;
    global.vec4 = glmatrix.vec4;
    global.mat2d = glmatrix.mat2d;
    global.mat4 = glmatrix.mat4;
    // (function() {
    this.isVinn = true;
    </script>
    <link rel="import" href="/tracing/base/base.html">
    <link rel="import" href="/tracing/extras/lean_config.html">
    <link rel="import" href="/tracing/importer/import.html">
    <script>
    // }).call(global);
    module.exports = global.tr;
    </script>
    ```

2. `npm install -g vulcanize && npm install -g cripser`
3. Execute `vulcanize --redirect "/tracing|tracing/tracing" --redirect "/gl-matrix-min.js|tracing/third_party/gl-matrix/dist/gl-matrix-min.js" entry.html |  crisper -h build.html -j build.js`
4. Edit `build.js` and uncomment the two lines from above.
