# tree-builder-builder
Builder of Tree Builders

## Recorder Format

Base format is JSON of an array: `[]`.

Every item in this array is an object: `[{}, {}, ...]`.

Every object needs to have a property `t`, which represents the type of the object:
`[{'t': ...}, {'t': ...}, ...]`.

Other properties of the object depend on the value of `t`.

`[{'t':'n', 'v':'img'}, {'t':'a', 'n':'src', 'v':'foo.jpg'}, ...]`.

Here are all known values of `t`:

* `b` -- URL base for the stream of tokens. Expected other properties: 
  * `v` -- the base url
* `a` -- element attribute. Expected other properties:
  * `n` -- name of the attribute
  * `v` -- value of the attribute
* `n` -- opening tag
  * `n` -- name of the element
* `/` -- closing tag
* `t` -- text node. Expected other properties:
  * `v` -- text node value
* `c` -- comment node. Expected other properties:
  * `v` -- comment node value
