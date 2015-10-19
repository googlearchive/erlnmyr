var glmatrix = require('gl-matrix');
global.vec2 = glmatrix.vec2;
global.vec3 = glmatrix.vec3;
global.vec4 = glmatrix.vec4;
global.mat2d = glmatrix.mat2d;
global.mat4 = glmatrix.mat4;
(function() {
this.isVinn = true;
'use strict';

/**
 * The global object.
 * @type {!Object}
 * @const
 */
var global = this;

/** Platform, package, object property, and Event support. */
this.tr = (function() {
  if (global.tr) {
    console.warn('Base was multiply initialized. First init wins.');
    return global.tr;
  }

  /**
   * Builds an object structure for the provided namespace path,
   * ensuring that names that already exist are not overwritten. For
   * example:
   * 'a.b.c' -> a = {};a.b={};a.b.c={};
   * @param {string} name Name of the object that this file defines.
   * @private
   */
  function exportPath(name) {
    var parts = name.split('.');
    var cur = global;

    for (var part; parts.length && (part = parts.shift());) {
      if (part in cur) {
        cur = cur[part];
      } else {
        cur = cur[part] = {};
      }
    }
    return cur;
  };

  function isExported(name) {
    var parts = name.split('.');
    var cur = global;

    for (var part; parts.length && (part = parts.shift());) {
      if (part in cur) {
        cur = cur[part];
      } else {
        return false;
      }
    }
    return true;
  }

  function isDefined(name) {
    var parts = name.split('.');

    var curObject = global;

    for (var i = 0; i < parts.length; i++) {
      var partName = parts[i];
      var nextObject = curObject[partName];
      if (nextObject === undefined)
        return false;
      curObject = nextObject;
    }
    return true;
  }

  var panicElement = undefined;
  var rawPanicMessages = [];
  function showPanicElementIfNeeded() {
    if (panicElement)
      return;

    var panicOverlay = document.createElement('div');
    panicOverlay.style.backgroundColor = 'white';
    panicOverlay.style.border = '3px solid red';
    panicOverlay.style.boxSizing = 'border-box';
    panicOverlay.style.color = 'black';
    panicOverlay.style.display = '-webkit-flex';
    panicOverlay.style.height = '100%';
    panicOverlay.style.left = 0;
    panicOverlay.style.padding = '8px';
    panicOverlay.style.position = 'fixed';
    panicOverlay.style.top = 0;
    panicOverlay.style.webkitFlexDirection = 'column';
    panicOverlay.style.width = '100%';

    panicElement = document.createElement('div');
    panicElement.style.webkitFlex = '1 1 auto';
    panicElement.style.overflow = 'auto';
    panicOverlay.appendChild(panicElement);

    if (!document.body) {
      setTimeout(function() {
        document.body.appendChild(panicOverlay);
      }, 150);
    } else {
      document.body.appendChild(panicOverlay);
    }
  }

  function showPanic(panicTitle, panicDetails) {
    if (tr.isHeadless) {
      if (panicDetails instanceof Error)
        throw panicDetails;
      throw new Error('Panic: ' + panicTitle + ':\n' + panicDetails);
    }

    if (panicDetails instanceof Error)
      panicDetails = panicDetails.stack;

    showPanicElementIfNeeded();
    var panicMessageEl = document.createElement('div');
    panicMessageEl.innerHTML =
        '<h2 id="message"></h2>' +
        '<pre id="details"></pre>';
    panicMessageEl.querySelector('#message').textContent = panicTitle;
    panicMessageEl.querySelector('#details').textContent = panicDetails;
    panicElement.appendChild(panicMessageEl);

    rawPanicMessages.push({
      title: panicTitle,
      details: panicDetails
    });
  }

  function hasPanic() {
    return rawPanicMessages.length !== 0;
  }
  function getPanicText() {
    return rawPanicMessages.map(function(msg) {
      return msg.title;
    }).join(', ');
  }

  function exportTo(namespace, fn) {
    var obj = exportPath(namespace);
    var exports = fn();

    for (var propertyName in exports) {
      // Maybe we should check the prototype chain here? The current usage
      // pattern is always using an object literal so we only care about own
      // properties.
      var propertyDescriptor = Object.getOwnPropertyDescriptor(exports,
                                                               propertyName);
      if (propertyDescriptor)
        Object.defineProperty(obj, propertyName, propertyDescriptor);
    }
  };

  /**
   * Initialization which must be deferred until run-time.
   */
  function initialize() {
    if (global.isVinn) {
      tr.isVinn = true;
    } else if (global.process && global.process.versions.node) {
      tr.isNode = true;
    } else {
      tr.isVinn = false;
      tr.isNode = false;
      tr.doc = document;

      tr.isMac = /Mac/.test(navigator.platform);
      tr.isWindows = /Win/.test(navigator.platform);
      tr.isChromeOS = /CrOS/.test(navigator.userAgent);
      tr.isLinux = /Linux/.test(navigator.userAgent);
    }
    tr.isHeadless = tr.isVinn || tr.isNode;
  }

  return {
    initialize: initialize,

    exportTo: exportTo,
    isExported: isExported,
    isDefined: isDefined,

    showPanic: showPanic,
    hasPanic: hasPanic,
    getPanicText: getPanicText
  };
})();

tr.initialize();
'use strict';

/**
 * @fileoverview This contains an implementation of the EventTarget interface
 * as defined by DOM Level 2 Events.
 */
tr.exportTo('tr.b', function() {

  /**
   * Creates a new EventTarget. This class implements the DOM level 2
   * EventTarget interface and can be used wherever those are used.
   * @constructor
   */
  function EventTarget() {
  }
  EventTarget.decorate = function(target) {
    for (var k in EventTarget.prototype) {
      if (k == 'decorate')
        continue;
      var v = EventTarget.prototype[k];
      if (typeof v !== 'function')
        continue;
      target[k] = v;
    }
  };

  EventTarget.prototype = {

    /**
     * Adds an event listener to the target.
     * @param {string} type The name of the event.
     * @param {!Function|{handleEvent:Function}} handler The handler for the
     *     event. This is called when the event is dispatched.
     */
    addEventListener: function(type, handler) {
      if (!this.listeners_)
        this.listeners_ = Object.create(null);
      if (!(type in this.listeners_)) {
        this.listeners_[type] = [handler];
      } else {
        var handlers = this.listeners_[type];
        if (handlers.indexOf(handler) < 0)
          handlers.push(handler);
      }
    },

    /**
     * Removes an event listener from the target.
     * @param {string} type The name of the event.
     * @param {!Function|{handleEvent:Function}} handler The handler for the
     *     event.
     */
    removeEventListener: function(type, handler) {
      if (!this.listeners_)
        return;
      if (type in this.listeners_) {
        var handlers = this.listeners_[type];
        var index = handlers.indexOf(handler);
        if (index >= 0) {
          // Clean up if this was the last listener.
          if (handlers.length == 1)
            delete this.listeners_[type];
          else
            handlers.splice(index, 1);
        }
      }
    },

    /**
     * Dispatches an event and calls all the listeners that are listening to
     * the type of the event.
     * @param {!cr.event.Event} event The event to dispatch.
     * @return {boolean} Whether the default action was prevented. If someone
     *     calls preventDefault on the event object then this returns false.
     */
    dispatchEvent: function(event) {
      if (!this.listeners_)
        return true;

      // Since we are using DOM Event objects we need to override some of the
      // properties and methods so that we can emulate this correctly.
      var self = this;
      event.__defineGetter__('target', function() {
        return self;
      });
      var realPreventDefault = event.preventDefault;
      event.preventDefault = function() {
        realPreventDefault.call(this);
        this.rawReturnValue = false;
      };

      var type = event.type;
      var prevented = 0;
      if (type in this.listeners_) {
        // Clone to prevent removal during dispatch
        var handlers = this.listeners_[type].concat();
        for (var i = 0, handler; handler = handlers[i]; i++) {
          if (handler.handleEvent)
            prevented |= handler.handleEvent.call(handler, event) === false;
          else
            prevented |= handler.call(this, event) === false;
        }
      }

      return !prevented && event.rawReturnValue;
    },

    hasEventListener: function(type) {
      return this.listeners_[type] !== undefined;
    }
  };

  var EventTargetHelper = {
    decorate: function(target) {
      for (var k in EventTargetHelper) {
        if (k == 'decorate')
          continue;
        var v = EventTargetHelper[k];
        if (typeof v !== 'function')
          continue;
        target[k] = v;
      }
      target.listenerCounts_ = {};
    },

    addEventListener: function(type, listener, useCapture) {
      this.__proto__.addEventListener.call(
          this, type, listener, useCapture);
      if (this.listenerCounts_[type] === undefined)
        this.listenerCounts_[type] = 0;
      this.listenerCounts_[type]++;
    },

    removeEventListener: function(type, listener, useCapture) {
      this.__proto__.removeEventListener.call(
          this, type, listener, useCapture);
      this.listenerCounts_[type]--;
    },

    hasEventListener: function(type) {
      return this.listenerCounts_[type] > 0;
    }
  };

  // Export
  return {
    EventTarget: EventTarget,
    EventTargetHelper: EventTargetHelper
  };
});
'use strict';

tr.exportTo('tr.b', function() {
  var Event;
  if (tr.isHeadless) {
    /**
     * Creates a new event to be used with tr.b.EventTarget or DOM EventTarget
     * objects.
     * @param {string} type The name of the event.
     * @param {boolean=} opt_bubbles Whether the event bubbles.
     *     Default is false.
     * @param {boolean=} opt_preventable Whether the default action of the event
     *     can be prevented.
     * @constructor
     * @extends {Event}
     */
    function HeadlessEvent(type, opt_bubbles, opt_preventable) {
      this.type = type;
      this.bubbles = (opt_bubbles !== undefined ?
          !!opt_bubbles : false);
      this.cancelable = (opt_preventable !== undefined ?
          !!opt_preventable : false);

      this.defaultPrevented = false;
      this.cancelBubble = false;
    };

    HeadlessEvent.prototype = {
      preventDefault: function() {
        this.defaultPrevented = true;
      },

      stopPropagation: function() {
        this.cancelBubble = true;
      }
    };
    Event = HeadlessEvent;
  } else {
    /**
     * Creates a new event to be used with tr.b.EventTarget or DOM EventTarget
     * objects.
     * @param {string} type The name of the event.
     * @param {boolean=} opt_bubbles Whether the event bubbles.
     *     Default is false.
     * @param {boolean=} opt_preventable Whether the default action of the event
     *     can be prevented.
     * @constructor
     * @extends {Event}
     */
    function TrEvent(type, opt_bubbles, opt_preventable) {
      var e = tr.doc.createEvent('Event');
      e.initEvent(type, !!opt_bubbles, !!opt_preventable);
      e.__proto__ = global.Event.prototype;
      return e;
    };

    TrEvent.prototype = {
      __proto__: global.Event.prototype
    };
    Event = TrEvent;
  }

  /**
   * Dispatches a simple event on an event target.
   * @param {!EventTarget} target The event target to dispatch the event on.
   * @param {string} type The type of the event.
   * @param {boolean=} opt_bubbles Whether the event bubbles or not.
   * @param {boolean=} opt_cancelable Whether the default action of the event
   *     can be prevented.
   * @return {boolean} If any of the listeners called {@code preventDefault}
   *     during the dispatch this will return false.
   */
  function dispatchSimpleEvent(target, type, opt_bubbles, opt_cancelable) {
    var e = new tr.b.Event(type, opt_bubbles, opt_cancelable);
    return target.dispatchEvent(e);
  }

  return {
    Event: Event,
    dispatchSimpleEvent: dispatchSimpleEvent
  };
});
'use strict';

tr.exportTo('tr.b', function() {
  function max(a, b) {
    if (a === undefined)
      return b;
    if (b === undefined)
      return a;
    return Math.max(a, b);
  }

  /**
   * This class implements an interval tree.
   *    See: http://wikipedia.org/wiki/Interval_tree
   *
   * Internally the tree is a Red-Black tree. The insertion/colour is done using
   * the Left-leaning Red-Black Trees algorithm as described in:
   *       http://www.cs.princeton.edu/~rs/talks/LLRB/LLRB.pdf
   *
   * @param {function} beginPositionCb Callback to retrieve the begin position.
   * @param {function} endPositionCb Callback to retrieve the end position.
   *
   * @constructor
   */
  function IntervalTree(beginPositionCb, endPositionCb) {
    this.beginPositionCb_ = beginPositionCb;
    this.endPositionCb_ = endPositionCb;

    this.root_ = undefined;
    this.size_ = 0;
  }

  IntervalTree.prototype = {
    /**
     * Insert events into the interval tree.
     *
     * @param {Object} datum The object to insert.
     */
    insert: function(datum) {
      var startPosition = this.beginPositionCb_(datum);
      var endPosition = this.endPositionCb_(datum);

      var node = new IntervalTreeNode(datum,
                                      startPosition, endPosition);
      this.size_++;

      this.root_ = this.insertNode_(this.root_, node);
      this.root_.colour = Colour.BLACK;
      return datum;
    },

    insertNode_: function(root, node) {
      if (root === undefined)
        return node;

      if (root.leftNode && root.leftNode.isRed &&
          root.rightNode && root.rightNode.isRed)
        this.flipNodeColour_(root);

      if (node.key < root.key)
        root.leftNode = this.insertNode_(root.leftNode, node);
      else if (node.key === root.key)
        root.merge(node);
      else
        root.rightNode = this.insertNode_(root.rightNode, node);

      if (root.rightNode && root.rightNode.isRed &&
          (root.leftNode === undefined || !root.leftNode.isRed))
        root = this.rotateLeft_(root);

      if (root.leftNode && root.leftNode.isRed &&
          root.leftNode.leftNode && root.leftNode.leftNode.isRed)
        root = this.rotateRight_(root);

      return root;
    },

    rotateRight_: function(node) {
      var sibling = node.leftNode;
      node.leftNode = sibling.rightNode;
      sibling.rightNode = node;
      sibling.colour = node.colour;
      node.colour = Colour.RED;
      return sibling;
    },

    rotateLeft_: function(node) {
      var sibling = node.rightNode;
      node.rightNode = sibling.leftNode;
      sibling.leftNode = node;
      sibling.colour = node.colour;
      node.colour = Colour.RED;
      return sibling;
    },

    flipNodeColour_: function(node) {
      node.colour = this.flipColour_(node.colour);
      node.leftNode.colour = this.flipColour_(node.leftNode.colour);
      node.rightNode.colour = this.flipColour_(node.rightNode.colour);
    },

    flipColour_: function(colour) {
      return colour === Colour.RED ? Colour.BLACK : Colour.RED;
    },

    /* The high values are used to find intersection. It should be called after
     * all of the nodes are inserted. Doing it each insert is _slow_. */
    updateHighValues: function() {
      this.updateHighValues_(this.root_);
    },

    /* There is probably a smarter way to do this by starting from the inserted
     * node, but need to handle the rotations correctly. Went the easy route
     * for now. */
    updateHighValues_: function(node) {
      if (node === undefined)
        return undefined;

      node.maxHighLeft = this.updateHighValues_(node.leftNode);
      node.maxHighRight = this.updateHighValues_(node.rightNode);

      return max(max(node.maxHighLeft, node.highValue), node.maxHighRight);
    },

    validateFindArguments_: function(queryLow, queryHigh) {
      if (queryLow === undefined || queryHigh === undefined)
        throw new Error('queryLow and queryHigh must be defined');
      if ((typeof queryLow !== 'number') || (typeof queryHigh !== 'number'))
        throw new Error('queryLow and queryHigh must be numbers');
    },

    /**
     * Retrieve all overlapping intervals.
     *
     * @param {number} queryLow The low value for the intersection interval.
     * @param {number} queryHigh The high value for the intersection interval.
     * @return {Array} All [begin, end] pairs inside intersecting intervals.
     */
    findIntersection: function(queryLow, queryHigh) {
      this.validateFindArguments_(queryLow, queryHigh);
      if (this.root_ === undefined)
        return [];

      var ret = [];
      this.root_.appendIntersectionsInto_(ret, queryLow, queryHigh);
      return ret;
    },

    /**
     * Returns the number of nodes in the tree.
     */
    get size() {
      return this.size_;
    },

    /**
     * Returns the root node in the tree.
     */
    get root() {
      return this.root_;
    },

    /**
     * Dumps out the [lowValue, highValue] pairs for each node in depth-first
     * order.
     */
    dump_: function() {
      if (this.root_ === undefined)
        return [];
      return this.root_.dump();
    }
  };

  var Colour = {
    RED: 'red',
    BLACK: 'black'
  };

  function IntervalTreeNode(datum, lowValue, highValue) {
    this.lowValue_ = lowValue;

    this.data_ = [{
      datum: datum,
      high: highValue,
      low: lowValue
    }];

    this.colour_ = Colour.RED;

    this.parentNode_ = undefined;
    this.leftNode_ = undefined;
    this.rightNode_ = undefined;

    this.maxHighLeft_ = undefined;
    this.maxHighRight_ = undefined;
  }

  IntervalTreeNode.prototype = {
    appendIntersectionsInto_: function(ret, queryLow, queryHigh) {
      /* This node starts has a start point at or further right then queryHigh
       * so we know this node is out and all right children are out. Just need
       * to check left */
      if (this.lowValue_ >= queryHigh) {
        if (!this.leftNode_)
          return;
        return this.leftNode_.appendIntersectionsInto_(
            ret, queryLow, queryHigh);
      }

      /* If we have a maximum left high value that is bigger then queryLow we
       * need to check left for matches */
      if (this.maxHighLeft_ > queryLow) {
        this.leftNode_.appendIntersectionsInto_(ret, queryLow, queryHigh);
      }

      /* We know that this node starts before queryHigh, if any of it's data
       * ends after queryLow we need to add those nodes */
      if (this.highValue > queryLow) {
        for (var i = (this.data.length - 1); i >= 0; --i) {
          /* data nodes are sorted by high value, so as soon as we see one
           * before low value we're done. */
          if (this.data[i].high < queryLow)
            break;

          ret.push(this.data[i].datum);
        }
      }

      /* check for matches in the right tree */
      if (this.rightNode_) {
        this.rightNode_.appendIntersectionsInto_(ret, queryLow, queryHigh);
      }
    },

    get colour() {
      return this.colour_;
    },

    set colour(colour) {
      this.colour_ = colour;
    },

    get key() {
      return this.lowValue_;
    },

    get lowValue() {
      return this.lowValue_;
    },

    get highValue() {
      return this.data_[this.data_.length - 1].high;
    },

    set leftNode(left) {
      this.leftNode_ = left;
    },

    get leftNode() {
      return this.leftNode_;
    },

    get hasLeftNode() {
      return this.leftNode_ !== undefined;
    },

    set rightNode(right) {
      this.rightNode_ = right;
    },

    get rightNode() {
      return this.rightNode_;
    },

    get hasRightNode() {
      return this.rightNode_ !== undefined;
    },

    set parentNode(parent) {
      this.parentNode_ = parent;
    },

    get parentNode() {
      return this.parentNode_;
    },

    get isRootNode() {
      return this.parentNode_ === undefined;
    },

    set maxHighLeft(high) {
      this.maxHighLeft_ = high;
    },

    get maxHighLeft() {
      return this.maxHighLeft_;
    },

    set maxHighRight(high) {
      this.maxHighRight_ = high;
    },

    get maxHighRight() {
      return this.maxHighRight_;
    },

    get data() {
      return this.data_;
    },

    get isRed() {
      return this.colour_ === Colour.RED;
    },

    merge: function(node) {
      for (var i = 0; i < node.data.length; i++)
        this.data_.push(node.data[i]);
      this.data_.sort(function(a, b) {
        return a.high - b.high;
      });
    },

    dump: function() {
      var ret = {};
      if (this.leftNode_)
        ret['left'] = this.leftNode_.dump();

      ret['data'] = this.data_.map(function(d) { return [d.low, d.high]; });

      if (this.rightNode_)
        ret['right'] = this.rightNode_.dump();

      return ret;
    }
  };

  return {
    IntervalTree: IntervalTree
  };
});
'use strict';

tr.exportTo('tr.b', function() {
  function asArray(arrayish) {
    var values = [];
    for (var i = 0; i < arrayish.length; i++)
      values.push(arrayish[i]);
    return values;
  }

  function compareArrays(x, y, elementCmp) {
    var minLength = Math.min(x.length, y.length);
    for (var i = 0; i < minLength; i++) {
      var tmp = elementCmp(x[i], y[i]);
      if (tmp)
        return tmp;
    }
    if (x.length == y.length)
      return 0;

    if (x[i] === undefined)
      return -1;

    return 1;
  }

  /**
   * Compares two values when one or both might be undefined. Undefined
   * values are sorted after defined.
   */
  function comparePossiblyUndefinedValues(x, y, cmp, opt_this) {
    if (x !== undefined && y !== undefined)
      return cmp.call(opt_this, x, y);
    if (x !== undefined)
      return -1;
    if (y !== undefined)
      return 1;
    return 0;
  }

  /**
   * Compares two numeric values when one or both might be undefined or NaNs.
   * Undefined / NaN values are sorted after others.
   */
  function compareNumericWithNaNs(x, y) {
    if (!isNaN(x) && !isNaN(y))
      return x - y;
    if (isNaN(x))
      return 1;
    if (isNaN(y))
      return -1;
    return 0;
  }

  function concatenateArrays(/*arguments*/) {
    var values = [];
    for (var i = 0; i < arguments.length; i++) {
      if (!(arguments[i] instanceof Array))
        throw new Error('Arguments ' + i + 'is not an array');
      values.push.apply(values, arguments[i]);
    }
    return values;
  }

  function concatenateObjects(/*arguments*/) {
    var result = {};
    for (var i = 0; i < arguments.length; i++) {
      var object = arguments[i];
      for (var j in object) {
        result[j] = object[j];
      }
    }
    return result;
  }

  function dictionaryKeys(dict) {
    var keys = [];
    for (var key in dict)
      keys.push(key);
    return keys;
  }

  function dictionaryValues(dict) {
    var values = [];
    for (var key in dict)
      values.push(dict[key]);
    return values;
  }

  function dictionaryLength(dict) {
    var n = 0;
    for (var key in dict)
      n++;
    return n;
  }

  function dictionaryContainsValue(dict, value) {
    for (var key in dict)
      if (dict[key] === value)
        return true;
    return false;
  }

  /**
   * Returns a new dictionary with items grouped by the return value of the
   * specified function being called on each item.
   * @param {!Array.<Object>} ary The array being iterated through
   * @param {!Function} fn The mapping function between the array value and the
   * map key.
   */
  function group(ary, fn) {
    return ary.reduce(function(accumulator, curr) {
      var key = fn(curr);

      if (key in accumulator)
        accumulator[key].push(curr);
      else
        accumulator[key] = [curr];

      return accumulator;
    }, {});
  }

  function iterItems(dict, fn, opt_this) {
    opt_this = opt_this || this;
    var keys = Object.keys(dict);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      fn.call(opt_this, key, dict[key]);
    }
  }

  /**
   * Create a new dictionary with the same keys as the original dictionary
   * mapped to the results of the provided function called on the corresponding
   * entries in the original dictionary, i.e. result[key] = fn(key, dict[key])
   * for all keys in dict (own enumerable properties only).
   *
   * Example:
   *   var srcDict = {a: 10, b: 15};
   *   var dstDict = mapItems(srcDict, function(k, v) { return 2 * v; });
   *   // srcDict is unmodified and dstDict is now equal to {a: 20, b: 30}.
   */
  function mapItems(dict, fn, opt_this) {
    opt_this = opt_this || this;
    var result = {};
    var keys = Object.keys(dict);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      result[key] = fn.call(opt_this, key, dict[key]);
    }
    return result;
  }

  function filterItems(dict, predicate, opt_this) {
    opt_this = opt_this || this;
    var result = {};
    var keys = Object.keys(dict);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var value = dict[key];
      if (predicate.call(opt_this, key, value))
        result[key] = value;
    }
    return result;
  }

  function iterObjectFieldsRecursively(object, func) {
    if (!(object instanceof Object))
      return;

    if (object instanceof Array) {
      for (var i = 0; i < object.length; i++) {
        func(object, i, object[i]);
        iterObjectFieldsRecursively(object[i], func);
      }
      return;
    }

    for (var key in object) {
      var value = object[key];
      func(object, key, value);
      iterObjectFieldsRecursively(value, func);
    }
  }

  /**
   * Convert an array of dictionaries to a dictionary of arrays.
   *
   * The keys of the resulting dictionary are a union of the keys of all
   * dictionaries in the provided array. Each array in the resulting dictionary
   * has the same length as the provided array and contains the values of its
   * key in the dictionaries in the provided array. Example:
   *
   *   INPUT:
   *
   *     [
   *       {a: 6, b: 5      },
   *       undefined,
   *       {a: 4, b: 3, c: 2},
   *       {      b: 1, c: 0}
   *     ]
   *
   *   OUTPUT:
   *
   *     {
   *       a: [6,         undefined, 4, undefined],
   *       b: [5,         undefined, 3, 1        ],
   *       c: [undefined, undefined, 2, 0        ]
   *     }
   *
   * @param {!Array} array Array of items to be inverted. If opt_dictGetter
   *     is not provided, all elements of the array must be either undefined,
   *     or dictionaries.
   * @param {?(function(*): (!Object|undefined))=} opt_dictGetter Optional
   *     function mapping defined elements of array to dictionaries.
   * @param {*=} opt_this Optional 'this' context for opt_dictGetter.
   */
  function invertArrayOfDicts(array, opt_dictGetter, opt_this) {
    opt_this = opt_this || this;
    var result = {};
    for (var i = 0; i < array.length; i++) {
      var item = array[i];
      if (item === undefined)
        continue;
      var dict = opt_dictGetter ? opt_dictGetter.call(opt_this, item) : item;
      if (dict === undefined)
        continue;
      for (var key in dict) {
        var valueList = result[key];
        if (valueList === undefined)
          result[key] = valueList = new Array(array.length);
        valueList[i] = dict[key];
      }
    }
    return result;
  }

  /**
   * Convert an array to a dictionary.
   *
   * Every element in the array is mapped in the dictionary to the key returned
   * by the provided function:
   *
   *   dictionary[valueToKeyFn(element)] = element;
   *
   * @param {!Array} array Arbitrary array.
   * @param {function(*): string} valueToKeyFn Function mapping array elements
   *     to dictionary keys.
   * @param {*=} opt_this Optional 'this' context for valueToKeyFn.
   */
  function arrayToDict(array, valueToKeyFn, opt_this) {
    opt_this = opt_this || this;
    var result = {};
    var length = array.length;
    for (var i = 0; i < length; i++) {
      var value = array[i];
      var key = valueToKeyFn.call(opt_this, value);
      result[key] = value;
    }
    return result;
  }

  function identity(d) {
    return d;
  }

  function findFirstIndexInArray(ary, opt_func, opt_this) {
    var func = opt_func || identity;
    for (var i = 0; i < ary.length; i++) {
      if (func.call(opt_this, ary[i], i))
        return i;
    }
    return -1;
  }

  function findFirstInArray(ary, opt_func, opt_this) {
    var i = findFirstIndexInArray(ary, opt_func, opt_func);
    if (i === -1)
      return undefined;
    return ary[i];
  }

  function findFirstKeyInDictMatching(dict, opt_func, opt_this) {
    var func = opt_func || identity;
    for (var key in dict) {
      if (func.call(opt_this, key, dict[key]))
        return key;
    }
    return undefined;
  }

  return {
    asArray: asArray,
    concatenateArrays: concatenateArrays,
    concatenateObjects: concatenateObjects,
    compareArrays: compareArrays,
    comparePossiblyUndefinedValues: comparePossiblyUndefinedValues,
    compareNumericWithNaNs: compareNumericWithNaNs,
    dictionaryLength: dictionaryLength,
    dictionaryKeys: dictionaryKeys,
    dictionaryValues: dictionaryValues,
    dictionaryContainsValue: dictionaryContainsValue,
    group: group,
    iterItems: iterItems,
    mapItems: mapItems,
    filterItems: filterItems,
    iterObjectFieldsRecursively: iterObjectFieldsRecursively,
    invertArrayOfDicts: invertArrayOfDicts,
    arrayToDict: arrayToDict,
    identity: identity,
    findFirstIndexInArray: findFirstIndexInArray,
    findFirstInArray: findFirstInArray,
    findFirstKeyInDictMatching: findFirstKeyInDictMatching
  };
});
'use strict';

/**
 * @fileoverview Quick range computations.
 */
tr.exportTo('tr.b', function() {

  function Range() {
    this.isEmpty_ = true;
    this.min_ = undefined;
    this.max_ = undefined;
  };

  Range.prototype = {
    __proto__: Object.prototype,

    reset: function() {
      this.isEmpty_ = true;
      this.min_ = undefined;
      this.max_ = undefined;
    },

    get isEmpty() {
      return this.isEmpty_;
    },

    addRange: function(range) {
      if (range.isEmpty)
        return;
      this.addValue(range.min);
      this.addValue(range.max);
    },

    addValue: function(value) {
      if (this.isEmpty_) {
        this.max_ = value;
        this.min_ = value;
        this.isEmpty_ = false;
        return;
      }
      this.max_ = Math.max(this.max_, value);
      this.min_ = Math.min(this.min_, value);
    },

    set min(min) {
      this.isEmpty_ = false;
      this.min_ = min;
    },

    get min() {
      if (this.isEmpty_)
        return undefined;
      return this.min_;
    },

    get max() {
      if (this.isEmpty_)
        return undefined;
      return this.max_;
    },

    set max(max) {
      this.isEmpty_ = false;
      this.max_ = max;
    },

    get range() {
      if (this.isEmpty_)
        return undefined;
      return this.max_ - this.min_;
    },

    get center() {
      return (this.min_ + this.max_) * 0.5;
    },

    get duration() {
      if (this.isEmpty_)
        return 0;
      return this.max_ - this.min_;
    },

    equals: function(that) {
      if (this.isEmpty && that.isEmpty)
        return true;
      if (this.isEmpty != that.isEmpty)
        return false;
      return this.min === that.min &&
          this.max === that.max;
    },

    containsRange: function(range) {
      if (this.isEmpty || range.isEmpty)
        return false;

      return this.findIntersection(range).duration == range.duration;
    },

    containsExplicitRange: function(min, max) {
      return this.containsRange(Range.fromExplicitRange(min, max));
    },

    intersectsRange: function(range) {
      if (this.isEmpty || range.isEmpty)
        return false;

      return !this.findIntersection(range).isEmpty;
    },

    intersectsExplicitRange: function(min, max) {
      return this.intersectsRange(Range.fromExplicitRange(min, max));
    },

    findIntersection: function(range) {
      if (this.isEmpty || range.isEmpty)
        return new Range();

      var min = Math.max(this.min, range.min);
      var max = Math.min(this.max, range.max);

      if (max < min)
        return new Range();

      return Range.fromExplicitRange(min, max);
    },

    toJSON: function() {
      if (this.isEmpty_)
        return {isEmpty: true};
      return {
        isEmpty: false,
        max: this.max,
        min: this.min
      };
    },

    /**
     * Returns a slice of the input array that intersects with this range. If
     * the range does not have a min, it is treated as unbounded from below.
     * Similarly, if max is undefined, the range is unbounded from above.
     *
     * @param {Array} array The array of elements to be filtered.
     * @param {Funcation=} opt_keyFunc A function that extracts a numeric value,
     *        to be used in comparisons, from an element of the array. If not
     *        specified, array elements themselves will be used.
     * @param {Object=} opt_this An optional this argument to be passed to
     *        opt_keyFunc.
     */
    filterArray: function(array, opt_keyFunc, opt_this) {
      if (this.isEmpty_)
        return [];
      // Binary search. |test| is a function that should return true when we
      // need to explore the left branch and false to explore the right branch.
      function binSearch(test) {
        var i0 = 0;
        var i1 = array.length;
        while (i0 < i1 - 1) {
          var i = Math.trunc((i0 + i1) / 2);
          if (test(i))
            i1 = i;  // Explore the left branch.
          else
            i0 = i;  // Explore the right branch.
        }
        return i1;
      }

      var keyFunc = opt_keyFunc || tr.b.identity;
      function getValue(index) {
        return keyFunc.call(opt_this, array[index]);
      }

      var first = binSearch(function(i) {
        return this.min_ === undefined || this.min_ <= getValue(i);
      }.bind(this));
      var last = binSearch(function(i) {
        return this.max_ !== undefined && this.max_ < getValue(i);
      }.bind(this));
      return array.slice(first, last);
    }
  };

  Range.fromDict = function(d) {
    if (d.isEmpty === true) {
      return new Range();
    } else if (d.isEmpty === false) {
      var range = new Range();
      range.min = d.min;
      range.max = d.max;
      return range;
    } else {
      throw new Error('Not a range');
    }
  };

  Range.fromExplicitRange = function(min, max) {
    var range = new Range();
    range.min = min;
    range.max = max;
    return range;
  };

  Range.compareByMinTimes = function(a, b) {
    if (!a.isEmpty && !b.isEmpty)
      return a.min_ - b.min_;

    if (a.isEmpty && !b.isEmpty)
      return -1;

    if (!a.isEmpty && b.isEmpty)
      return 1;

    return 0;
  };

  return {
    Range: Range
  };
});
'use strict';

tr.exportTo('tr.b', function() {
  /**
   * Adds a {@code getInstance} static method that always return the same
   * instance object.
   * @param {!Function} ctor The constructor for the class to add the static
   *     method to.
   */
  function addSingletonGetter(ctor) {
    ctor.getInstance = function() {
      return ctor.instance_ || (ctor.instance_ = new ctor());
    };
  }

  function deepCopy(value) {
    if (!(value instanceof Object)) {
      if (value === undefined || value === null)
        return value;
      if (typeof value == 'string')
        return value.substring();
      if (typeof value == 'boolean')
        return value;
      if (typeof value == 'number')
        return value;
      throw new Error('Unrecognized: ' + typeof value);
    }

    var object = value;
    if (object instanceof Array) {
      var res = new Array(object.length);
      for (var i = 0; i < object.length; i++)
        res[i] = deepCopy(object[i]);
      return res;
    }

    if (object.__proto__ != Object.prototype)
      throw new Error('Can only clone simple types');
    var res = {};
    for (var key in object) {
      res[key] = deepCopy(object[key]);
    }
    return res;
  }

  function normalizeException(e) {
    if (e === undefined || e === null) {
      return {
        typeName: 'UndefinedError',
        message: 'Unknown: null or undefined exception',
        stack: 'Unknown'
      };
    }

    if (typeof(e) == 'string') {
      return {
        typeName: 'StringError',
        message: e,
        stack: [e]
      };
    }

    var typeName;
    if (e.name) {
      typeName = e.name;
    } else if (e.constructor) {
      if (e.constructor.name) {
        typeName = e.constructor.name;
      } else {
        typeName = 'AnonymousError';
      }
    } else {
      typeName = 'ErrorWithNoConstructor';
    }

    var msg = e.message ? e.message : 'Unknown';
    return {
      typeName: typeName,
      message: msg,
      stack: e.stack ? e.stack : [msg]
    };
  }

  function stackTraceAsString() {
    return new Error().stack + '';
  }
  function stackTrace() {
    var stack = stackTraceAsString();
    stack = stack.split('\n');
    return stack.slice(2);
  }

  function getUsingPath(path, from_dict) {
    var parts = path.split('.');
    var cur = from_dict;

    for (var part; parts.length && (part = parts.shift());) {
      if (!parts.length) {
        return cur[part];
      } else if (part in cur) {
        cur = cur[part];
      } else {
        return undefined;
      }
    }
    return undefined;
  }

  return {
    addSingletonGetter: addSingletonGetter,

    deepCopy: deepCopy,

    normalizeException: normalizeException,
    stackTrace: stackTrace,
    stackTraceAsString: stackTraceAsString,

    getUsingPath: getUsingPath
  };
});
'use strict';

tr.exportTo('tr.b', function() {
  // Setting this to true will cause stack traces to get dumped into the
  // tasks. When an exception happens the original stack will be printed.
  //
  // NOTE: This should never be set committed as true.
  var recordRAFStacks = false;

  var pendingPreAFs = [];
  var pendingRAFs = [];
  var pendingIdleCallbacks = [];
  var currentRAFDispatchList = undefined;

  var rafScheduled = false;
  var idleWorkScheduled = false;

  function scheduleRAF() {
    if (rafScheduled)
      return;
    rafScheduled = true;
    if (tr.isHeadless) {
      Promise.resolve().then(function() {
        processRequests(0);
      }, function(e) {
        console.log(e.stack);
        throw e;
      });
    } else {
      if (window.requestAnimationFrame) {
        window.requestAnimationFrame(processRequests);
      } else {
        var delta = Date.now() - window.performance.now();
        window.webkitRequestAnimationFrame(function(domTimeStamp) {
          processRequests(domTimeStamp - delta);
        });
      }
    }
  }

  function scheduleIdleWork() {
    if (idleWorkScheduled)
      return;
    if (tr.isHeadless || !window.requestIdleCallback) {
      scheduleRAF();
      return;
    }
    idleWorkScheduled = true;
    window.requestIdleCallback(processIdleWork);
  }

  function onAnimationFrameError(e, opt_stack) {
    console.log(e.stack);
    if (tr.isHeadless)
      throw e;

    if (opt_stack)
      console.log(opt_stack);

    if (e.message)
      console.error(e.message, e.stack);
    else
      console.error(e);
  }

  function runTask(task, frameBeginTime) {
    try {
      task.callback.call(task.context, frameBeginTime);
    } catch (e) {
      tr.b.onAnimationFrameError(e, task.stack);
    }
  }

  function processRequests(frameBeginTime) {
    // We assume that we want to do a maximum of 10ms optional work per frame.
    // Hopefully rAF will eventually pass this in for us.
    var rafCompletionDeadline = frameBeginTime + 10;

    rafScheduled = false;


    var currentPreAFs = pendingPreAFs;
    currentRAFDispatchList = pendingRAFs;
    pendingPreAFs = [];
    pendingRAFs = [];
    var hasRAFTasks = currentPreAFs.length || currentRAFDispatchList.length;

    for (var i = 0; i < currentPreAFs.length; i++)
      runTask(currentPreAFs[i], frameBeginTime);

    while (currentRAFDispatchList.length > 0)
      runTask(currentRAFDispatchList.shift(), frameBeginTime);
    currentRAFDispatchList = undefined;

    if (!hasRAFTasks && !idleWorkScheduled) {
      processIdleWork({
        timeRemaining: function() {
          return rafCompletionDeadline - window.performance.now();
        }
      });
    }

    if (pendingIdleCallbacks.length > 0)
      scheduleIdleWork();
  }

  function processIdleWork(deadline) {
    idleWorkScheduled = false;
    while (pendingIdleCallbacks.length > 0) {
      runTask(pendingIdleCallbacks.shift());
      // Check timer after running at least one idle task to avoid buggy
      // window.performance.now() on some platforms from blocking the idle
      // task queue.
      if (tr.isHeadless || deadline.timeRemaining() <= 0)
        break;
    }

    if (pendingIdleCallbacks.length > 0)
      scheduleIdleWork();
  }

  function getStack_() {
    if (!recordRAFStacks)
      return '';

    var stackLines = tr.b.stackTrace();
    // Strip off getStack_.
    stackLines.shift();
    return stackLines.join('\n');
  }

  function requestPreAnimationFrame(callback, opt_this) {
    pendingPreAFs.push({
      callback: callback,
      context: opt_this || window,
      stack: getStack_()});
    scheduleRAF();
  }

  function requestAnimationFrameInThisFrameIfPossible(callback, opt_this) {
    if (!currentRAFDispatchList) {
      requestAnimationFrame(callback, opt_this);
      return;
    }
    currentRAFDispatchList.push({
      callback: callback,
      context: opt_this || window,
      stack: getStack_()});
    return;
  }

  function requestAnimationFrame(callback, opt_this) {
    pendingRAFs.push({
      callback: callback,
      context: opt_this || window,
      stack: getStack_()});
    scheduleRAF();
  }

  function requestIdleCallback(callback, opt_this) {
    pendingIdleCallbacks.push({
      callback: callback,
      context: opt_this || window,
      stack: getStack_()});
    scheduleIdleWork();
  }

  function forcePendingRAFTasksToRun(frameBeginTime) {
    if (!rafScheduled)
      return;
    processRequests(frameBeginTime);
  }

  return {
    onAnimationFrameError: onAnimationFrameError,
    requestPreAnimationFrame: requestPreAnimationFrame,
    requestAnimationFrame: requestAnimationFrame,
    requestAnimationFrameInThisFrameIfPossible:
        requestAnimationFrameInThisFrameIfPossible,
    requestIdleCallback: requestIdleCallback,
    forcePendingRAFTasksToRun: forcePendingRAFTasksToRun
  };
});
'use strict';

tr.exportTo('tr.b', function() {
  /**
   * A task is a combination of a run callback, a set of subtasks, and an after
   * task.
   *
   * When executed, a task does the following things:
   * 1. Runs its callback
   * 2. Runs its subtasks
   * 3. Runs its after callback.
   *
   * The list of subtasks and after task can be mutated inside step #1 but as
   * soon as the task's callback returns, the subtask list and after task is
   * fixed and cannot be changed again.
   *
   * Use task.after().after().after() to describe the toplevel passes that make
   * up your computation. Then, use subTasks to add detail to each subtask as it
   * runs. For example:
   *    var pieces = [];
   *    taskA = new Task(function() { pieces = getPieces(); });
   *    taskA.after(function(taskA) {
   *      pieces.forEach(function(piece) {
   *        taskA.subTask(function(taskB) { piece.process(); }, this);
   *      });
   *    });
   *
   * @constructor
   */
  function Task(runCb, thisArg) {
    if (runCb !== undefined && thisArg === undefined)
      throw new Error('Almost certainly, you meant to pass a thisArg.');
    this.runCb_ = runCb;
    this.thisArg_ = thisArg;
    this.afterTask_ = undefined;
    this.subTasks_ = [];
  }

  Task.prototype = {
    /*
     * See constructor documentation on semantics of subtasks.
     */
    subTask: function(cb, thisArg) {
      if (cb instanceof Task)
        this.subTasks_.push(cb);
      else
        this.subTasks_.push(new Task(cb, thisArg));
      return this.subTasks_[this.subTasks_.length - 1];
    },

    /**
     * Runs the current task and returns the task that should be executed next.
     */
    run: function() {
      if (this.runCb_ !== undefined)
        this.runCb_.call(this.thisArg_, this);
      var subTasks = this.subTasks_;
      this.subTasks_ = undefined; // Prevent more subTasks from being posted.

      if (!subTasks.length)
        return this.afterTask_;

      // If there are subtasks, then we want to execute all the subtasks and
      // then this task's afterTask. To make this happen, we update the
      // afterTask of all the subtasks so the point upward to each other, e.g.
      // subTask[0].afterTask to subTask[1] and so on. Then, the last subTask's
      // afterTask points at this task's afterTask.
      for (var i = 1; i < subTasks.length; i++)
        subTasks[i - 1].afterTask_ = subTasks[i];
      subTasks[subTasks.length - 1].afterTask_ = this.afterTask_;
      return subTasks[0];
    },

    /*
     * See constructor documentation on semantics of after tasks.
     */
    after: function(cb, thisArg) {
      if (this.afterTask_)
        throw new Error('Has an after task already');
      if (cb instanceof Task)
        this.afterTask_ = cb;
      else
        this.afterTask_ = new Task(cb, thisArg);
      return this.afterTask_;
    },

    /*
     * Adds a task after the chain of tasks.
     */
    enqueue: function(cb, thisArg) {
      var lastTask = this;
      while (lastTask.afterTask_)
        lastTask = lastTask.afterTask_;
      return lastTask.after(cb, thisArg);
    }
  };

  Task.RunSynchronously = function(task) {
    var curTask = task;
    while (curTask)
      curTask = curTask.run();
  }

  /**
   * Runs a task using raf.requestIdleCallback, returning
   * a promise for its completion.
   */
  Task.RunWhenIdle = function(task) {
    return new Promise(function(resolve, reject) {
      var curTask = task;
      function runAnother() {
        try {
          curTask = curTask.run();
        } catch (e) {
          reject(e);
          console.error(e.stack);
          return;
        }

        if (curTask) {
          tr.b.requestIdleCallback(runAnother);
          return;
        }

        resolve();
      }
      tr.b.requestIdleCallback(runAnother);
    });
  }

  return {
    Task: Task
  };
});
'use strict';

tr.exportTo('tr.b', function() {
  function _iterateElementDeeplyImpl(element, cb, thisArg, includeElement) {
    if (includeElement) {
      if (cb.call(thisArg, element))
        return true;
    }

    if (element.shadowRoot) {
      if (_iterateElementDeeplyImpl(element.shadowRoot, cb, thisArg, false))
        return true;
    }
    for (var i = 0; i < element.children.length; i++) {
      if (_iterateElementDeeplyImpl(element.children[i], cb, thisArg, true))
        return true;
    }
  }
  function iterateElementDeeply(element, cb, thisArg) {
    _iterateElementDeeplyImpl(element, cb, thisArg, false);
  }

  function findDeepElementMatchingPredicate(element, predicate) {
    var foundElement = undefined;
    function matches(element) {
      var match = predicate(element);
      if (!match)
        return false;
      foundElement = element;
      return true;
    }
    iterateElementDeeply(element, matches);
    return foundElement;
  }

  function findDeepElementsMatchingPredicate(element, predicate) {
    var foundElements = [];
    function matches(element) {
      var match = predicate(element);
      if (match) {
        foundElements.push(element);
      }
      return false;
    }
    iterateElementDeeply(element, matches);
    return foundElements;
  }

  function findDeepElementMatching(element, selector) {
    return findDeepElementMatchingPredicate(element, function(element) {
      return element.matches(selector);
    });
  }
  function findDeepElementsMatching(element, selector) {
    return findDeepElementsMatchingPredicate(element, function(element) {
      return element.matches(selector);
    });
  }
  function findDeepElementWithTextContent(element, re) {
    return findDeepElementMatchingPredicate(element, function(element) {
      if (element.children.length !== 0)
        return false;
      return re.test(element.textContent);
    });
  }
  return {
    iterateElementDeeply: iterateElementDeeply,
    findDeepElementMatching: findDeepElementMatching,
    findDeepElementsMatching: findDeepElementsMatching,
    findDeepElementMatchingPredicate: findDeepElementMatchingPredicate,
    findDeepElementsMatchingPredicate: findDeepElementsMatchingPredicate,
    findDeepElementWithTextContent: findDeepElementWithTextContent
  };
});
'use strict';

/**
 * @fileoverview Time currentDisplayUnit
 */
tr.exportTo('tr.b.u', function() {
  var msDisplayMode = {
    scale: 1e-3,
    suffix: 'ms',
    // Compares a < b with adjustments to precision errors.
    roundedLess: function(a, b) {
      return Math.round(a * 1000) < Math.round(b * 1000);
    },
    format: function(ts) {
      return new Number(ts)
          .toLocaleString(undefined, { minimumFractionDigits: 3 }) + ' ms';
    }
  };

  var nsDisplayMode = {
    scale: 1e-9,
    suffix: 'ns',
    // Compares a < b with adjustments to precision errors.
    roundedLess: function(a, b) {
      return Math.round(a * 1000000) < Math.round(b * 1000000);
    },
    format: function(ts) {
      return new Number(ts * 1000000)
          .toLocaleString(undefined, { maximumFractionDigits: 0 }) + ' ns';
    }
  };

  var TimeDisplayModes = {
    ns: nsDisplayMode,
    ms: msDisplayMode
  };

  return {
    TimeDisplayModes: TimeDisplayModes
  };
});
'use strict';

tr.exportTo('tr.b.u', function() {
  var TimeDisplayModes = tr.b.u.TimeDisplayModes;

  function max(a, b) {
    if (a === undefined)
      return b;
    if (b === undefined)
      return a;
    return a.scale > b.scale ? a : b;
  }

  var Units = {
    reset: function() {
      this.currentTimeDisplayMode = TimeDisplayModes.ms;
    },

    timestampFromUs: function(us) {
      return us / 1000;
    },

    maybeTimestampFromUs: function(us) {
      return us === undefined ? undefined : us / 1000;
    },

    get currentTimeDisplayMode() {
      return this.currentTimeDisplayMode_;
    },

    // Use tr-ui-u-preferred-display-unit element instead of directly setting.
    set currentTimeDisplayMode(value) {
      if (this.currentTimeDisplayMode_ == value)
        return;

      this.currentTimeDisplayMode_ = value;
      this.dispatchEvent(new tr.b.Event('display-mode-changed'));
    },

    didPreferredTimeDisplayUnitChange: function() {
      var largest = undefined;
      var els = tr.b.findDeepElementsMatching(document.body,
          'tr-ui-u-preferred-display-unit');
      els.forEach(function(el) {
        largest = max(largest, el.preferredTimeDisplayMode);
      });

      this.currentDisplayUnit = largest === undefined ?
          TimeDisplayModes.ms : largest;
    },

    unitsByJSONName: {},

    fromJSON: function(object) {
      var u = this.unitsByJSONName[object];
      if (u) {
        return u;
      }
      throw new Error('Unrecognized unit');
    }
  };

  tr.b.EventTarget.decorate(Units);
  Units.reset();

  // Known display units follow.
  //////////////////////////////////////////////////////////////////////////////
  Units.timeDurationInMs = {
    asJSON: function() { return 'ms'; },
    format: function(value) {
      return Units.currentTimeDisplayMode_.format(value);
    }
  };
  Units.unitsByJSONName['ms'] = Units.timeDurationInMs;

  Units.timeStampInMs = {
    asJSON: function() { return 'tsMs'; },
    format: function(value) {
      return Units.currentTimeDisplayMode_.format(value);
    }
  };
  Units.unitsByJSONName['tsMs'] = Units.timeStampInMs;

  Units.normalizedPercentage = {
    asJSON: function() { return 'n%'; },
    format: function(value) {
      var tmp = new Number(Math.round(value * 100000) / 1000);
      return tmp.toLocaleString(undefined, {minimumFractionDigits: 3}) + '%';
    }
  };
  Units.unitsByJSONName['n%'] = Units.normalizedPercentage;

  var SIZE_UNIT_PREFIXES = ['', 'Ki', 'Mi', 'Gi', 'Ti'];
  Units.sizeInBytes = {
    asJSON: function() { return 'sizeInBytes'; },
    format: function(value) {
      var signPrefix = '';
      if (value < 0) {
        signPrefix = '-';
        value = -value;
      }

      var i = 0;
      while (value >= 1024 && i < SIZE_UNIT_PREFIXES.length - 1) {
        value /= 1024;
        i++;
      }

      return signPrefix + value.toFixed(1) + ' ' + SIZE_UNIT_PREFIXES[i] + 'B';
    }
  };
  Units.unitsByJSONName['sizeInBytes'] = Units.sizeInBytes;

  Units.energyInJoules = {
    asJSON: function() { return 'J'; },
    format: function(value) {
      return value
          .toLocaleString(undefined, { minimumFractionDigits: 3 }) + ' J';
    }
  };
  Units.unitsByJSONName['J'] = Units.energyInJoules;

  Units.powerInWatts = {
    asJSON: function() { return 'W'; },
    format: function(value) {
      return (value * 1000.0)
          .toLocaleString(undefined, { minimumFractionDigits: 3 }) + ' mW';
    }
  };
  Units.unitsByJSONName['W'] = Units.powerInWatts;

  Units.unitlessNumber = {
    asJSON: function() { return 'unitless'; },
    format: function(value) {
      return value.toLocaleString(
          undefined, {
            minimumFractionDigits: 3,
            maximumFractionDigits: 3});
    }
  };
  Units.unitsByJSONName['unitless'] = Units.unitlessNumber;

  return {
    Units: Units
  };
});
'use strict';

tr.exportTo('tr.b', function() {
  function RegisteredTypeInfo(constructor, metadata) {
    this.constructor = constructor;
    this.metadata = metadata;
  };

  var BASIC_REGISTRY_MODE = 'BASIC_REGISTRY_MODE';
  var TYPE_BASED_REGISTRY_MODE = 'TYPE_BASED_REGISTRY_MODE';
  var ALL_MODES = {BASIC_REGISTRY_MODE: true, TYPE_BASED_REGISTRY_MODE: true};

  function ExtensionRegistryOptions(mode) {
    if (mode === undefined)
      throw new Error('Mode is required');
    if (!ALL_MODES[mode])
      throw new Error('Not a mode.');

    this.mode_ = mode;
    this.defaultMetadata_ = {};
    this.defaultConstructor_ = undefined;
    this.mandatoryBaseClass_ = undefined;
    this.defaultTypeInfo_ = undefined;
    this.frozen_ = false;
  }
  ExtensionRegistryOptions.prototype = {
    freeze: function() {
      if (this.frozen_)
        throw new Error('Frozen');
      this.frozen_ = true;
    },

    get mode() {
      return this.mode_;
    },

    get defaultMetadata() {
      return this.defaultMetadata_;
    },

    set defaultMetadata(defaultMetadata) {
      if (this.frozen_)
        throw new Error('Frozen');
      this.defaultMetadata_ = defaultMetadata;
      this.defaultTypeInfo_ = undefined;
    },

    get defaultConstructor() {
      return this.defaultConstructor_;
    },

    set defaultConstructor(defaultConstructor) {
      if (this.frozen_)
        throw new Error('Frozen');
      this.defaultConstructor_ = defaultConstructor;
      this.defaultTypeInfo_ = undefined;
    },

    get defaultTypeInfo() {
      if (this.defaultTypeInfo_ === undefined && this.defaultConstructor_) {
        this.defaultTypeInfo_ = new RegisteredTypeInfo(
            this.defaultConstructor,
            this.defaultMetadata);
      }
      return this.defaultTypeInfo_;
    },

    validateConstructor: function(constructor) {
      if (!this.mandatoryBaseClass)
        return;
      var curProto = constructor.prototype.__proto__;
      var ok = false;
      while (curProto) {
        if (curProto === this.mandatoryBaseClass.prototype) {
          ok = true;
          break;
        }
        curProto = curProto.__proto__;
      }
      if (!ok)
        throw new Error(constructor + 'must be subclass of ' + registry);
    }
  };

  return {
    BASIC_REGISTRY_MODE: BASIC_REGISTRY_MODE,
    TYPE_BASED_REGISTRY_MODE: TYPE_BASED_REGISTRY_MODE,

    ExtensionRegistryOptions: ExtensionRegistryOptions,
    RegisteredTypeInfo: RegisteredTypeInfo
  };
});
'use strict';

tr.exportTo('tr.b', function() {

  var RegisteredTypeInfo = tr.b.RegisteredTypeInfo;
  var ExtensionRegistryOptions = tr.b.ExtensionRegistryOptions;

  function decorateBasicExtensionRegistry(registry, extensionRegistryOptions) {
    var savedStateStack = [];
    registry.registeredTypeInfos_ = [];

    registry.register = function(constructor,
                                 opt_metadata) {
      if (registry.findIndexOfRegisteredConstructor(
          constructor) !== undefined)
        throw new Error('Handler already registered for ' + constructor);

      extensionRegistryOptions.validateConstructor(constructor);

      var metadata = {};
      for (var k in extensionRegistryOptions.defaultMetadata)
        metadata[k] = extensionRegistryOptions.defaultMetadata[k];
      if (opt_metadata) {
        for (var k in opt_metadata)
          metadata[k] = opt_metadata[k];
      }

      var typeInfo = new RegisteredTypeInfo(
          constructor,
          metadata);

      var e = new tr.b.Event('will-register');
      e.typeInfo = typeInfo;
      registry.dispatchEvent(e);

      registry.registeredTypeInfos_.push(typeInfo);

      e = new tr.b.Event('registry-changed');
      registry.dispatchEvent(e);
    };

    registry.pushCleanStateBeforeTest = function() {
      savedStateStack.push(registry.registeredTypeInfos_);
      registry.registeredTypeInfos_ = [];

      var e = new tr.b.Event('registry-changed');
      registry.dispatchEvent(e);
    };
    registry.popCleanStateAfterTest = function() {
      registry.registeredTypeInfos_ = savedStateStack[0];
      savedStateStack.splice(0, 1);

      var e = new tr.b.Event('registry-changed');
      registry.dispatchEvent(e);
    };

    registry.findIndexOfRegisteredConstructor = function(constructor) {
      for (var i = 0; i < registry.registeredTypeInfos_.length; i++)
        if (registry.registeredTypeInfos_[i].constructor == constructor)
          return i;
      return undefined;
    };

    registry.unregister = function(constructor) {
      var foundIndex = registry.findIndexOfRegisteredConstructor(constructor);
      if (foundIndex === undefined)
        throw new Error(constructor + ' not registered');
      registry.registeredTypeInfos_.splice(foundIndex, 1);

      var e = new tr.b.Event('registry-changed');
      registry.dispatchEvent(e);
    };

    registry.getAllRegisteredTypeInfos = function() {
      return registry.registeredTypeInfos_;
    };

    registry.findTypeInfo = function(constructor) {
      var foundIndex = this.findIndexOfRegisteredConstructor(constructor);
      if (foundIndex !== undefined)
        return this.registeredTypeInfos_[foundIndex];
      return undefined;
    };

    registry.findTypeInfoMatching = function(predicate, opt_this) {
      opt_this = opt_this ? opt_this : undefined;
      for (var i = 0; i < registry.registeredTypeInfos_.length; ++i) {
        var typeInfo = registry.registeredTypeInfos_[i];
        if (predicate.call(opt_this, typeInfo))
          return typeInfo;
      }
      return extensionRegistryOptions.defaultTypeInfo;
    };
  }

  return {
    _decorateBasicExtensionRegistry: decorateBasicExtensionRegistry
  };
});
'use strict';

/**
 * @fileoverview Helper code for working with tracing categories.
 *
 */
tr.exportTo('tr.b', function() {

  // Cached values for getCategoryParts.
  var categoryPartsFor = {};

  /**
   * Categories are stored in comma-separated form, e.g: 'a,b' meaning
   * that the event is part of the a and b category.
   *
   * This function returns the category split by string, caching the
   * array for performance.
   *
   * Do not mutate the returned array!!!!
   */
  function getCategoryParts(category) {
    var parts = categoryPartsFor[category];
    if (parts !== undefined)
      return parts;
    parts = category.split(',');
    categoryPartsFor[category] = parts;
    return parts;
  }

  return {
    getCategoryParts: getCategoryParts
  };
});
'use strict';

tr.exportTo('tr.b', function() {
  var getCategoryParts = tr.b.getCategoryParts;

  var RegisteredTypeInfo = tr.b.RegisteredTypeInfo;
  var ExtensionRegistryOptions = tr.b.ExtensionRegistryOptions;


  function decorateTypeBasedExtensionRegistry(registry,
                                              extensionRegistryOptions) {
    var savedStateStack = [];

    registry.registeredTypeInfos_ = [];

    registry.categoryPartToTypeInfoMap_ = {};
    registry.typeNameToTypeInfoMap_ = {};

    registry.register = function(constructor,
                                 metadata) {

      extensionRegistryOptions.validateConstructor(constructor);

      var typeInfo = new RegisteredTypeInfo(
          constructor,
          metadata || extensionRegistryOptions.defaultMetadata);

      typeInfo.typeNames = [];
      typeInfo.categoryParts = [];
      if (metadata && metadata.typeName)
        typeInfo.typeNames.push(metadata.typeName);
      if (metadata && metadata.typeNames) {
        typeInfo.typeNames.push.apply(
          typeInfo.typeNames, metadata.typeNames);
      }
      if (metadata && metadata.categoryParts) {
        typeInfo.categoryParts.push.apply(
          typeInfo.categoryParts, metadata.categoryParts);
      }

      if (typeInfo.typeNames.length === 0 &&
          typeInfo.categoryParts.length === 0)
        throw new Error('typeName or typeNames must be provided');

      // Sanity checks...
      typeInfo.typeNames.forEach(function(typeName) {
        if (registry.typeNameToTypeInfoMap_[typeName])
          throw new Error('typeName ' + typeName + ' already registered');
      });
      typeInfo.categoryParts.forEach(function(categoryPart) {
        if (registry.categoryPartToTypeInfoMap_[categoryPart]) {
          throw new Error('categoryPart ' + categoryPart +
                          ' already registered');
        }
      });

      var e = new tr.b.Event('will-register');
      e.typeInfo = typeInfo;
      registry.dispatchEvent(e);

      // Actual registration.
      typeInfo.typeNames.forEach(function(typeName) {
        registry.typeNameToTypeInfoMap_[typeName] = typeInfo;
      });
      typeInfo.categoryParts.forEach(function(categoryPart) {
        registry.categoryPartToTypeInfoMap_[categoryPart] = typeInfo;
      });
      registry.registeredTypeInfos_.push(typeInfo);

      var e = new tr.b.Event('registry-changed');
      registry.dispatchEvent(e);
    };

    registry.pushCleanStateBeforeTest = function() {
      savedStateStack.push({
        registeredTypeInfos: registry.registeredTypeInfos_,
        typeNameToTypeInfoMap: registry.typeNameToTypeInfoMap_,
        categoryPartToTypeInfoMap: registry.categoryPartToTypeInfoMap_
      });
      registry.registeredTypeInfos_ = [];
      registry.typeNameToTypeInfoMap_ = {};
      registry.categoryPartToTypeInfoMap_ = {};
      var e = new tr.b.Event('registry-changed');
      registry.dispatchEvent(e);
    };

    registry.popCleanStateAfterTest = function() {
      var state = savedStateStack[0];
      savedStateStack.splice(0, 1);

      registry.registeredTypeInfos_ = state.registeredTypeInfos;
      registry.typeNameToTypeInfoMap_ = state.typeNameToTypeInfoMap;
      registry.categoryPartToTypeInfoMap_ = state.categoryPartToTypeInfoMap;
      var e = new tr.b.Event('registry-changed');
      registry.dispatchEvent(e);
    };

    registry.unregister = function(constructor) {
      var typeInfoIndex = -1;
      for (var i = 0; i < registry.registeredTypeInfos_.length; i++) {
        if (registry.registeredTypeInfos_[i].constructor == constructor) {
          typeInfoIndex = i;
          break;
        }
      }
      if (typeInfoIndex === -1)
        throw new Error(constructor + ' not registered');

      var typeInfo = registry.registeredTypeInfos_[typeInfoIndex];
      registry.registeredTypeInfos_.splice(typeInfoIndex, 1);
      typeInfo.typeNames.forEach(function(typeName) {
        delete registry.typeNameToTypeInfoMap_[typeName];
      });
      typeInfo.categoryParts.forEach(function(categoryPart) {
        delete registry.categoryPartToTypeInfoMap_[categoryPart];
      });
      var e = new tr.b.Event('registry-changed');
      registry.dispatchEvent(e);
    };

    registry.getTypeInfo = function(category, typeName) {
      if (category) {
        var categoryParts = getCategoryParts(category);
        for (var i = 0; i < categoryParts.length; i++) {
          var categoryPart = categoryParts[i];
          if (registry.categoryPartToTypeInfoMap_[categoryPart])
            return registry.categoryPartToTypeInfoMap_[categoryPart];
        }
      }
      if (registry.typeNameToTypeInfoMap_[typeName])
        return registry.typeNameToTypeInfoMap_[typeName];

      return extensionRegistryOptions.defaultTypeInfo;
    };

    // TODO(nduca): Remove or rename.
    registry.getConstructor = function(category, typeName) {
      var typeInfo = registry.getTypeInfo(category, typeName);
      if (typeInfo)
        return typeInfo.constructor;
      return undefined;
    };
  }

  return {
    _decorateTypeBasedExtensionRegistry: decorateTypeBasedExtensionRegistry
  };
});
'use strict';

/**
 * @fileoverview Helper code for defining extension registries, which can be
 * used to make a part of trace-viewer extensible.
 *
 * This file provides two basic types of extension registries:
 * - Generic: register a type with metadata, query for those types based on
 *            a predicate
 *
 * - TypeName-based: register a type that handles some combination
 *                   of tracing categories or typeNames, then query
 *                   for it based on a category, typeName or both.
 *
 * Use these for pure-JS classes or ui.define'd classes. For polymer element
 * related registries, consult base/polymer_utils.html.
 *
 * When you register subtypes, you pass the constructor for the
 * subtype, and any metadata you want associated with the subtype. Use metadata
 * instead of stuffing fields onto the constructor. E.g.:
 *     registry.register(MySubclass, {titleWhenShownInTabStrip: 'MySub'})
 *
 * Some registries want a default object that is returned when a more precise
 * subtype has been registered. To provide one, set the defaultConstructor
 * option on the registry options.
 *
 * TODO: Extension registry used to make reference to mandatoryBaseType but it
 * was never enforced. We may want to add it back in the future in order to
 * enforce the types that can be put into a given registry.
 */
tr.exportTo('tr.b', function() {

  function decorateExtensionRegistry(registry, registryOptions) {
    if (registry.register)
      throw new Error('Already has registry');

    registryOptions.freeze();
    if (registryOptions.mode == tr.b.BASIC_REGISTRY_MODE) {
      tr.b._decorateBasicExtensionRegistry(registry, registryOptions);
    } else if (registryOptions.mode == tr.b.TYPE_BASED_REGISTRY_MODE) {
      tr.b._decorateTypeBasedExtensionRegistry(registry, registryOptions);
    } else {
      throw new Error('Unrecognized mode');
    }

    // Make it an event target.
    if (registry.addEventListener === undefined)
      tr.b.EventTarget.decorate(registry);
  }

  return {
    decorateExtensionRegistry: decorateExtensionRegistry
  };
});
'use strict';

/**
 * @fileoverview Base class for auditors.
 */
tr.exportTo('tr.c', function() {
  function Auditor(model) {
    this.model_ = model;
  }

  Auditor.prototype = {
    __proto__: Object.prototype,

    get model() {
      return this.model_;
    },

    /**
     * Called by the Model after baking slices. May modify model.
     */
    runAnnotate: function() {
    },

    /**
     * Called by the Model after importing. Should not modify model, except
     * for adding interaction ranges and audits.
     */
    runAudit: function() {
    }
  };

  var options = new tr.b.ExtensionRegistryOptions(tr.b.BASIC_REGISTRY_MODE);
  options.defaultMetadata = {};
  options.mandatoryBaseClass = Auditor;
  tr.b.decorateExtensionRegistry(Auditor, options);

  return {
    Auditor: Auditor
  };
});
'use strict';

tr.exportTo('tr.c', function() {
  function makeCaseInsensitiveRegex(pattern) {
    // See https://developer.mozilla.org/en/docs/Web/JavaScript/Guide/
    // Regular_Expressions.
    pattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(pattern, 'i');
  }

  /**
   * @constructor The generic base class for filtering a Model based on
   * various rules. The base class returns true for everything.
   */
  function Filter() { }

  Filter.prototype = {
    __proto__: Object.prototype,

    matchCounter: function(counter) {
      return true;
    },

    matchCpu: function(cpu) {
      return true;
    },

    matchProcess: function(process) {
      return true;
    },

    matchSlice: function(slice) {
      return true;
    },

    matchThread: function(thread) {
      return true;
    }
  };

  /**
   * @constructor A filter that matches objects by their name or category
   * case insensitive.
   * .findAllObjectsMatchingFilter
   */
  function TitleOrCategoryFilter(text) {
    Filter.call(this);
    this.regex_ = makeCaseInsensitiveRegex(text);

    if (!text.length)
      throw new Error('Filter text is empty.');
  }
  TitleOrCategoryFilter.prototype = {
    __proto__: Filter.prototype,

    matchSlice: function(slice) {
      if (slice.title === undefined && slice.category === undefined)
        return false;

      return this.regex_.test(slice.title) ||
          (!!slice.category && this.regex_.test(slice.category));
    }
  };

  /**
   * @constructor A filter that matches objects with the exact given title.
   */
  function ExactTitleFilter(text) {
    Filter.call(this);
    this.text_ = text;

    if (!text.length)
      throw new Error('Filter text is empty.');
  }
  ExactTitleFilter.prototype = {
    __proto__: Filter.prototype,

    matchSlice: function(slice) {
      return slice.title === this.text_;
    }
  };

  /**
   * @constructor A filter that matches objects by their full text contents
   * (title, category, args). Note that for performance this filter applies a
   * regex against all the keys of the slice arguments instead of recursing
   * through any embedded sub-objects.
   */
  function FullTextFilter(text) {
    Filter.call(this);
    this.regex_ = makeCaseInsensitiveRegex(text);
    this.titleOrCategoryFilter_ = new TitleOrCategoryFilter(text);
  }
  FullTextFilter.prototype = {
    __proto__: Filter.prototype,

    matchObject_: function(obj) {
      for (var key in obj) {
        if (!obj.hasOwnProperty(key))
          continue;
        if (this.regex_.test(key))
          return true;
        if (this.regex_.test(obj[key]))
          return true;
      }
      return false;
    },

    matchSlice: function(slice) {
      if (this.titleOrCategoryFilter_.matchSlice(slice))
        return true;
      return this.matchObject_(slice.args);
    }
  };

  return {
    Filter: Filter,
    TitleOrCategoryFilter: TitleOrCategoryFilter,
    ExactTitleFilter: ExactTitleFilter,
    FullTextFilter: FullTextFilter
  };
});
'use strict';

tr.exportTo('tr.b.u', function() {
  /**
   * Scalar wrapper, representing a scalar value and its unit.
   */
  function Scalar(value, unit) {
    this.value = value;
    this.unit = unit;
  };

  Scalar.prototype = {
    toString: function() {
      return this.unit.format(this.value);
    }
  };

  return {
    Scalar: Scalar
  };
});
'use strict';

tr.exportTo('tr.b.u', function() {
  /**
   * Float wrapper, representing a time stamp, capable of pretty-printing.
   */
  function TimeStamp(timestamp) {
    tr.b.u.Scalar.call(this, timestamp, tr.b.u.Units.timeStampInMs);
  };

  TimeStamp.prototype = {
    __proto__: tr.b.u.Scalar.prototype,

    get timestamp() {
      return this.value;
    }
  };

  TimeStamp.format = function(timestamp) {
    return tr.b.u.Units.timeStampInMs.format(timestamp);
  };

  return {
    TimeStamp: TimeStamp
  };
});
'use strict';

/**
 * @fileoverview Provides color scheme related functions.
 */
tr.exportTo('tr.ui.b', function() {

  function boundChannel(v) {
    return Math.min(255, Math.max(0, Math.floor(v)));
  }

  function brightenColor(c) {
    var k;
    if (c.r >= 240 && c.g >= 240 && c.b >= 240)
      k = 0.80;
    else
      k = 1.45;

    return {
      r: boundChannel(c.r * k),
      g: boundChannel(c.g * k),
      b: boundChannel(c.b * k)
    };
  }
  function desaturateColor(c) {
    var value = boundChannel((c.r + c.g + c.b) / 3);
    return { r: value, g: value, b: value };
  }
  function colorToRGBString(c) {
    return 'rgb(' + c.r + ',' + c.g + ',' + c.b + ')';
  }
  function colorToRGBAString(c, a) {
    return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + a + ')';
  }

  return {
    brightenColor: brightenColor,
    desaturateColor: desaturateColor,
    colorToRGBString: colorToRGBString,
    colorToRGBAString: colorToRGBAString
  };
});
'use strict';

/**
 * @fileoverview Provides color scheme related functions.
 */
tr.exportTo('tr.ui.b', function() {
  var colorToRGBString = tr.ui.b.colorToRGBString;
  var colorToRGBAString = tr.ui.b.colorToRGBAString;

  // Basic constants...

  var generalPurposeColors = [
    {r: 138, g: 113, b: 152},
    {r: 175, g: 112, b: 133},
    {r: 127, g: 135, b: 225},
    {r: 93, g: 81, b: 137},
    {r: 116, g: 143, b: 119},
    {r: 178, g: 214, b: 122},
    {r: 87, g: 109, b: 147},
    {r: 119, g: 155, b: 95},
    {r: 114, g: 180, b: 160},
    {r: 132, g: 85, b: 103},
    {r: 157, g: 210, b: 150},
    {r: 148, g: 94, b: 86},
    {r: 164, g: 108, b: 138},
    {r: 139, g: 191, b: 150},
    {r: 110, g: 99, b: 145},
    {r: 80, g: 129, b: 109},
    {r: 125, g: 140, b: 149},
    {r: 93, g: 124, b: 132},
    {r: 140, g: 85, b: 140},
    {r: 104, g: 163, b: 162},
    {r: 132, g: 141, b: 178},
    {r: 131, g: 105, b: 147},
    {r: 135, g: 183, b: 98},
    {r: 152, g: 134, b: 177},
    {r: 141, g: 188, b: 141},
    {r: 133, g: 160, b: 210},
    {r: 126, g: 186, b: 148},
    {r: 112, g: 198, b: 205},
    {r: 180, g: 122, b: 195},
    {r: 203, g: 144, b: 152}];

  var reservedColorsByName = {
    thread_state_iowait: {r: 182, g: 125, b: 143},
    thread_state_running: {r: 126, g: 200, b: 148},
    thread_state_runnable: {r: 133, g: 160, b: 210},
    thread_state_sleeping: {r: 240, g: 240, b: 240},
    thread_state_unknown: {r: 199, g: 155, b: 125},

    light_memory_dump: {r: 0, g: 0, b: 180},
    detailed_memory_dump: {r: 180, g: 0, b: 180},

    generic_work: {r: 125, g: 125, b: 125},

    good: {r: 0, g: 125, b: 0},
    bad: {r: 180, g: 125, b: 0},
    terrible: {r: 180, g: 0, b: 0},

    black: {r: 0, g: 0, b: 0},

    rail_response: {r: 67, g: 135, b: 253},
    rail_animate: {r: 244, g: 74, b: 63},
    rail_idle: {r: 238, g: 142, b: 0},
    rail_load: {r: 13, g: 168, b: 97},

    used_memory_column: {r: 0, g: 0, b: 255},
    older_used_memory_column: {r: 153, g: 204, b: 255},
    tracing_memory_column: {r: 153, g: 153, b: 153},

    cq_build_running: {r: 255, g: 255, b: 119},
    cq_build_passed: {r: 153, g: 238, b: 102},
    cq_build_failed: {r: 238, g: 136, b: 136},
    cq_build_abandoned: {r: 187, g: 187, b: 187},

    cq_build_attempt_running: {r: 222, g: 222, b: 75},
    cq_build_attempt_passed: {r: 103, g: 218, b: 35},
    cq_build_attempt_failed: {r: 197, g: 81, b: 81}
  };

  // Some constants we'll need for later lookups.
  var numGeneralPurposeColorIds = generalPurposeColors.length;
  var numReservedColorIds = tr.b.dictionaryLength(reservedColorsByName);

  // The color palette is split in half, with the upper
  // half of the palette being the "highlighted" verison
  // of the base color. So, color 7's highlighted form is
  // 7 + (palette.length / 2).
  //
  // These bright versions of colors are automatically generated
  // from the base colors.
  //
  // Within the color palette, there are "general purpose" colors,
  // which can be used for random color selection, and
  // reserved colors, which are used when specific colors
  // need to be used, e.g. where red is desired.
  var paletteRaw = (function() {
    var paletteBase = [];
    paletteBase.push.apply(paletteBase, generalPurposeColors);
    paletteBase.push.apply(paletteBase,
                           tr.b.dictionaryValues(reservedColorsByName));
    return paletteBase.concat(paletteBase.map(tr.ui.b.brightenColor),
                              paletteBase.map(tr.ui.b.desaturateColor));
  })();
  var palette = paletteRaw.map(colorToRGBString);

  var highlightIdBoost = paletteRaw.length / 3;
  var desaturateIdBoost = (paletteRaw.length / 3) * 2;

  // Build reservedColorNameToIdMap.
  var reservedColorNameToIdMap = (function() {
    var m = {};
    var i = generalPurposeColors.length;
    tr.b.iterItems(reservedColorsByName, function(key, value) {
      m[key] = i++;
    });
    return m;
  })();

  /**
   * Computes a simplistic hashcode of the provide name. Used to chose colors
   * for slices.
   * @param {string} name The string to hash.
   */
  function getStringHash(name) {
    var hash = 0;
    for (var i = 0; i < name.length; ++i)
      hash = (hash + 37 * hash + 11 * name.charCodeAt(i)) % 0xFFFFFFFF;
    return hash;
  }

  /**
   * Gets the color palette.
   */
  function getColorPalette() {
    return palette;
  }

  /**
   * Gets the raw color palette, where entries are still objects.
   */
  function getRawColorPalette() {
    return paletteRaw;
  }

  /**
   * @return {Number} The value to add to a color ID to get its highlighted
   * color ID. E.g. 7 + getPaletteHighlightIdBoost() yields a brightened form
   * of 7's base color.
   */
  function getColorPaletteHighlightIdBoost() {
    return highlightIdBoost;
  }
  /**
   * @return {Number} The value to add to a color ID to get its desaturated
   * color ID. E.g. 7 + getPaletteDesaturateIdBoost() yields a desaturate form
   * of 7's base color.
   */
  function getColorPaletteDesaturateIdBoost() {
    return desaturateIdBoost;
  }

  /**
   * @param {String} name The color name.
   * @return {Number} The color ID for the given color name.
   */
  function getColorIdForReservedName(name) {
    var id = reservedColorNameToIdMap[name];
    if (id === undefined)
      throw new Error('Unrecognized color ') + name;
    return id;
  }

  // Previously computed string color IDs. They are based on a stable hash, so
  // it is safe to save them throughout the program time.
  var stringColorIdCache = {};

  /**
   * @return {Number} A color ID that is stably associated to the provided via
   * the getStringHash method. The color ID will be chosen from the general
   * purpose ID space only, e.g. no reserved ID will be used.
   */
  function getColorIdForGeneralPurposeString(string) {
    if (stringColorIdCache[string] === undefined) {
      var hash = getStringHash(string);
      stringColorIdCache[string] = hash % numGeneralPurposeColorIds;
    }
    return stringColorIdCache[string];
  }

  var paletteProperties = {
    numGeneralPurposeColorIds: numGeneralPurposeColorIds,
    highlightIdBoost: highlightIdBoost,
    desaturateIdBoost: desaturateIdBoost
  };

  return {
    getRawColorPalette: getRawColorPalette,
    getColorPalette: getColorPalette,
    paletteProperties: paletteProperties,
    getColorPaletteHighlightIdBoost: getColorPaletteHighlightIdBoost,
    getColorPaletteDesaturateIdBoost: getColorPaletteDesaturateIdBoost,
    getColorIdForReservedName: getColorIdForReservedName,
    getStringHash: getStringHash,
    getColorIdForGeneralPurposeString: getColorIdForGeneralPurposeString
  };
});
'use strict';

tr.exportTo('tr.model', function() {

  /**
   * EventInfo is an annotation added to Events in order to document
   * what they represent, and override their title/colorId values.
   *
   * TODO(ccraik): eventually support more complex structure/paragraphs.
   *
   * @param {string} title A user-visible title for the event.
   * @param {string} description A user-visible description of the event.
   * @param {Array} docLinks A list of Objects, each of the form
   * {label: str, textContent: str, href: str}
   *
   * @constructor
   */
  function EventInfo(title, description, docLinks) {
    this.title = title;
    this.description = description;
    this.docLinks = docLinks;
    this.colorId = tr.ui.b.getColorIdForGeneralPurposeString(title);
  }

  return {
    EventInfo: EventInfo
  };
});
'use strict';

tr.exportTo('tr.b', function() {
  var nextGUID = 1;
  var GUID = {
    allocate: function() {
      return nextGUID++;
    },

    getLastGuid: function() {
      return nextGUID - 1;
    }
  };

  return {
    GUID: GUID
  };
});
'use strict';

/**
 * @fileoverview Provides the EventRegistry class.
 */
tr.exportTo('tr.model', function() {
  // Create the type registry.
  function EventRegistry() {
  }

  var options = new tr.b.ExtensionRegistryOptions(tr.b.BASIC_REGISTRY_MODE);
  tr.b.decorateExtensionRegistry(EventRegistry, options);

  // Enforce all options objects have the right fields.
  EventRegistry.addEventListener('will-register', function(e) {
    var metadata = e.typeInfo.metadata;

    if (metadata.name === undefined)
      throw new Error('Registered events must provide name metadata');
    var i = tr.b.findFirstInArray(
      EventRegistry.getAllRegisteredTypeInfos(),
      function(x) { return x.metadata.name === metadata.name; });
    if (i !== undefined)
      throw new Error('Event type with that name already registered');

    if (metadata.pluralName === undefined)
      throw new Error('Registered events must provide pluralName metadata');
    if (metadata.singleViewElementName === undefined) {
      throw new Error('Registered events must provide ' +
                      'singleViewElementName metadata');
    }
    if (metadata.multiViewElementName === undefined) {
      throw new Error('Registered events must provide ' +
                      'multiViewElementName metadata');
    }
  });

  // Helper: lookup Events indexed by type name.
  var eventsByTypeName = undefined;
  EventRegistry.getEventTypeInfoByTypeName = function(typeName) {
    if (eventsByTypeName === undefined) {
      eventsByTypeName = {};
      EventRegistry.getAllRegisteredTypeInfos().forEach(function(typeInfo) {
        eventsByTypeName[typeInfo.metadata.name] = typeInfo;
      });
    }
    return eventsByTypeName[typeName];
  }

  // Ensure eventsByTypeName stays current.
  EventRegistry.addEventListener('registry-changed', function() {
    eventsByTypeName = undefined;
  });

  function convertCamelCaseToTitleCase(name) {
    var result = name.replace(/[A-Z]/g, ' $&');
    result = result.charAt(0).toUpperCase() + result.slice(1);
    return result;
  }

  EventRegistry.getUserFriendlySingularName = function(typeName) {
    var typeInfo = EventRegistry.getEventTypeInfoByTypeName(typeName);
    var str = typeInfo.metadata.name;
    return convertCamelCaseToTitleCase(str);
  };

  EventRegistry.getUserFriendlyPluralName = function(typeName) {
    var typeInfo = EventRegistry.getEventTypeInfoByTypeName(typeName);
    var str = typeInfo.metadata.pluralName;
    return convertCamelCaseToTitleCase(str);
  };

  return {
    EventRegistry: EventRegistry
  };
});
'use strict';

tr.exportTo('tr.model', function() {

  var EventRegistry = tr.model.EventRegistry;

  var RequestSelectionChangeEvent = tr.b.Event.bind(
      undefined, 'requestSelectionChange', true, false);

  /**
   * Represents a event set within a  and its associated set of tracks.
   * @constructor
   */
  function EventSet(opt_events) {
    this.bounds_dirty_ = true;
    this.bounds_ = new tr.b.Range();
    this.length_ = 0;
    this.guid_ = tr.b.GUID.allocate();
    this.pushed_guids_ = {};

    if (opt_events) {
      if (opt_events instanceof Array) {
        for (var i = 0; i < opt_events.length; i++)
          this.push(opt_events[i]);
      } else if (opt_events instanceof EventSet) {
        this.addEventSet(opt_events);
      } else {
        this.push(opt_events);
      }
    }
  }
  EventSet.prototype = {
    __proto__: Object.prototype,

    get bounds() {
      if (this.bounds_dirty_) {
        this.bounds_.reset();
        for (var i = 0; i < this.length_; i++)
          this[i].addBoundsToRange(this.bounds_);
        this.bounds_dirty_ = false;
      }
      return this.bounds_;
    },

    get duration() {
      if (this.bounds_.isEmpty)
        return 0;
      return this.bounds_.max - this.bounds_.min;
    },

    get length() {
      return this.length_;
    },

    get guid() {
      return this.guid_;
    },

    clear: function() {
      for (var i = 0; i < this.length_; ++i)
        delete this[i];
      this.length_ = 0;
      this.bounds_dirty_ = true;
    },

    // push pushes only unique events.
    // If an event has been already pushed, do nothing.
    push: function(event) {
      if (event.guid == undefined)
        throw new Error('Event must have a GUID');

      if (this.contains(event))
        return event;

      this.pushed_guids_[event.guid] = true;
      this[this.length_++] = event;
      this.bounds_dirty_ = true;
      return event;
    },

    contains: function(event) {
      return this.pushed_guids_[event.guid];
    },

    addEventSet: function(eventSet) {
      for (var i = 0; i < eventSet.length; i++)
        this.push(eventSet[i]);
    },

    subEventSet: function(index, count) {
      count = count || 1;

      var eventSet = new EventSet();
      eventSet.bounds_dirty_ = true;
      if (index < 0 || index + count > this.length_)
        throw new Error('Index out of bounds');

      for (var i = index; i < index + count; i++)
        eventSet.push(this[i]);

      return eventSet;
    },

    intersectionIsEmpty: function(otherEventSet) {
      return !this.some(function(event) {
        return otherEventSet.contains(event);
      });
    },

    equals: function(that) {
      if (this.length !== that.length)
        return false;
      for (var i = 0; i < this.length; i++) {
        var event = this[i];
        if (that.pushed_guids_[event.guid] === undefined)
          return false;
      }
      return true;
    },

    getEventsOrganizedByBaseType: function(opt_pruneEmpty) {
      var allTypeInfos = EventRegistry.getAllRegisteredTypeInfos();

      var events = this.getEventsOrganizedByCallback(function(event) {
        var maxEventIndex = -1;
        var maxEventTypeInfo = undefined;

        allTypeInfos.forEach(function(eventTypeInfo, eventIndex) {
          if (!(event instanceof eventTypeInfo.constructor))
            return;
          if (eventIndex > maxEventIndex) {
            maxEventIndex = eventIndex;
            maxEventTypeInfo = eventTypeInfo;
          }
        });

        if (maxEventIndex == -1) {
          console.log(event);
          throw new Error('Unrecognized event type');
        }

        return maxEventTypeInfo.metadata.name;
      });

      if (!opt_pruneEmpty) {
        allTypeInfos.forEach(function(eventTypeInfo) {
          if (events[eventTypeInfo.metadata.name] === undefined)
            events[eventTypeInfo.metadata.name] = new EventSet();
        });
      }

      return events;
    },

    getEventsOrganizedByTitle: function() {
      return this.getEventsOrganizedByCallback(function(event) {
        if (event.title === undefined)
          throw new Error('An event didn\'t have a title!');
        return event.title;
      });
    },

    getEventsOrganizedByCallback: function(cb) {
      var eventsByCallback = {};
      for (var i = 0; i < this.length; i++) {
        var event = this[i];
        var key = cb(event);

        if (key === undefined)
          throw new Error('An event could not be organized');

        if (eventsByCallback[key] === undefined)
          eventsByCallback[key] = new EventSet();

        eventsByCallback[key].push(event);
      }
      return eventsByCallback;
    },

    enumEventsOfType: function(type, func) {
      for (var i = 0; i < this.length_; i++)
        if (this[i] instanceof type)
          func(this[i]);
    },

    get userFriendlyName() {
      if (this.length === 0) {
        throw new Error('Empty event set');
      }

      var eventsByBaseType = this.getEventsOrganizedByBaseType(true);
      var eventTypeName = tr.b.dictionaryKeys(eventsByBaseType)[0];

      if (this.length === 1) {
        var tmp = EventRegistry.getUserFriendlySingularName(eventTypeName);
        return this[0].userFriendlyName;
      }

      var numEventTypes = tr.b.dictionaryLength(eventsByBaseType);
      if (numEventTypes !== 1) {
        return this.length + ' events of various types';
      }

      var tmp = EventRegistry.getUserFriendlyPluralName(eventTypeName);
      return this.length + ' ' + tmp;
    },

    filter: function(fn, opt_this) {
      var res = new EventSet();

      this.forEach(function(slice) {
        if (fn.call(this, slice))
          res.push(slice);
      }, opt_this);

      return res;
    },

    toArray: function() {
      var ary = [];
      for (var i = 0; i < this.length; i++)
        ary.push(this[i]);
      return ary;
    },

    forEach: function(fn, opt_this) {
      for (var i = 0; i < this.length; i++)
        fn.call(opt_this, this[i], i);
    },

    map: function(fn, opt_this) {
      var res = [];
      for (var i = 0; i < this.length; i++)
        res.push(fn.call(opt_this, this[i], i));
      return res;
    },

    every: function(fn, opt_this) {
      for (var i = 0; i < this.length; i++)
        if (!fn.call(opt_this, this[i], i))
          return false;
      return true;
    },

    some: function(fn, opt_this) {
      for (var i = 0; i < this.length; i++)
        if (fn.call(opt_this, this[i], i))
          return true;
      return false;
    }
  };

  return {
    EventSet: EventSet,
    RequestSelectionChangeEvent: RequestSelectionChangeEvent
  };
});
'use strict';

/**
 * @fileoverview Provides the SelectionState class.
 */
tr.exportTo('tr.model', function() {

  /**
   * The SelectionState enum defines how selectable items are displayed in the
   * view.
   */
  var SelectionState = {
    NONE: 0,
    SELECTED: 1,
    HIGHLIGHTED: 2,
    DIMMED: 3
  };

  return {
    SelectionState: SelectionState
  };
});
'use strict';

/**
 * @fileoverview Provides the SelectableItem class.
 */
tr.exportTo('tr.model', function() {
  var SelectionState = tr.model.SelectionState;

  /**
   * A SelectableItem is the abstract base class for any non-container data that
   * has an associated model item in the trace model (possibly itself).
   *
   * Subclasses must provide a selectionState property (or getter).
   *
   * @constructor
   */
  function SelectableItem(modelItem) {
    this.modelItem_ = modelItem;
  }

  SelectableItem.prototype = {
    get modelItem() {
      return this.modelItem_;
    },

    get selected() {
      return this.selectionState === SelectionState.SELECTED;
    },

    addToSelection: function(selection) {
      var modelItem = this.modelItem_;
      if (!modelItem)
        return;
      selection.push(modelItem);
    },

    addToTrackMap: function(eventToTrackMap, track) {
      var modelItem = this.modelItem_;
      if (!modelItem)
        return;
      eventToTrackMap.addEvent(modelItem, track);
    }
  };

  return {
    SelectableItem: SelectableItem
  };
});
'use strict';

/**
 * @fileoverview Provides the Event class.
 */
tr.exportTo('tr.model', function() {
  var SelectableItem = tr.model.SelectableItem;
  var SelectionState = tr.model.SelectionState;

  /**
   * An Event is the base type for any non-container, selectable piece
   * of data in the trace model.
   *
   * @constructor
   * @extends {SelectableItem}
   */
  function Event() {
    SelectableItem.call(this, this /* modelItem */);
    this.guid_ = tr.b.GUID.allocate();
    this.selectionState = SelectionState.NONE;
    this.associatedAlerts = new tr.model.EventSet();
    this.info = undefined;
  }

  Event.prototype = {
    __proto__: SelectableItem.prototype,

    get guid() {
      return this.guid_;
    },

    get stableId() {
      return undefined;
    },

    /** Adds the range of timestamps for this event to the specified range. */
    addBoundsToRange: function(range) {
      throw new Error('Not implemented');
    }
  };

  return {
    Event: Event
  };
});
'use strict';

/**
 * @fileoverview Provides the TimedEvent class.
 */
tr.exportTo('tr.model', function() {
  /**
   * A TimedEvent is the base type for any piece of data in the trace model with
   * a specific start and duration.
   *
   * @constructor
   */
  function TimedEvent(start) {
    tr.model.Event.call(this);
    this.start = start;
    this.duration = 0;
    this.cpuStart = undefined;
    this.cpuDuration = undefined;
  }

  TimedEvent.prototype = {
    __proto__: tr.model.Event.prototype,

    get end() {
      return this.start + this.duration;
    },

    addBoundsToRange: function(range) {
      range.addValue(this.start);
      range.addValue(this.end);
    },

    // bounds returns whether that TimedEvent happens within this timed event
    bounds: function(that, precisionUnit) {
      if (precisionUnit === undefined) {
        precisionUnit = tr.b.u.TimeDisplayModes.ms;
      }
      var startsBefore = precisionUnit.roundedLess(that.start, this.start);
      var endsAfter = precisionUnit.roundedLess(this.end, that.end);
      return !startsBefore && !endsAfter;
    }
  };

  return {
    TimedEvent: TimedEvent
  };
});
'use strict';

tr.exportTo('tr.model', function() {

  function Alert(info, start, opt_associatedEvents, opt_args) {
    tr.model.TimedEvent.call(this, start);
    this.info = info;
    this.args = opt_args || {};
    this.associatedEvents = new tr.model.EventSet(opt_associatedEvents);
    this.associatedEvents.forEach(function(event) {
      event.associatedAlerts.push(this);
    }, this);
  }

  Alert.prototype = {
    __proto__: tr.model.TimedEvent.prototype,

    get title() {
      return this.info.title;
    },

    get colorId() {
      return this.info.colorId;
    },

    get userFriendlyName() {
      return 'Alert ' + this.title + ' at ' +
          tr.b.u.TimeStamp.format(this.start);
    }
  };

  tr.model.EventRegistry.register(
      Alert,
      {
        name: 'alert',
        pluralName: 'alerts',
        singleViewElementName: 'tr-ui-a-alert-sub-view',
        multiViewElementName: 'tr-ui-a-alert-sub-view'
      });

  return {
    Alert: Alert
  };
});
'use strict';

tr.exportTo('tr.model', function() {

  /**
   * EventContainer is a base class for any class in the trace model that
   * contains child events or child EventContainers.
   *
   * For all EventContainers, updateBounds() must be called after modifying the
   * container's events if an up-to-date bounds is expected.
   *
   * @constructor
   */
  function EventContainer() {
    this.guid_ = tr.b.GUID.allocate();
    this.important = true;
    this.bounds_ = new tr.b.Range();
  }

  EventContainer.prototype = {
    get guid() {
      return this.guid_;
    },

    /**
     * @return {String} A stable and unique identifier that describes this
     * container's position in the event tree relative to the root. If an event
     * container 'B' is a child to another event container 'A', then container
     * B's stable ID would be 'A.B'.
     */
    get stableId() {
      throw new Error('Not implemented');
    },

    /**
     * Returns the bounds of the event container, which describe the range
     * of timestamps for all ancestor events.
     */
    get bounds() {
      return this.bounds_;
    },

    // TODO(charliea): A default implementation of this method could likely be
    // provided that uses 'iterateAllEvents'.
    /**
     * Updates the bounds of the event container. After updating, this.bounds
     * will describe the range of timestamps of all ancestor events.
     */
    updateBounds: function() {
      throw new Error('Not implemented');
    },

    // TODO(charliea): A default implementation of this method could likely be
    // provided that uses 'iterateAllEvents'.
    /**
     * Shifts the timestamps for ancestor events by 'amount' milliseconds.
     */
    shiftTimestampsForward: function(amount) {
      throw new Error('Not implemented');
    },

    /**
     * Iterates over all child events.
     */
    iterateAllEventsInThisContainer: function(eventTypePredicate,
                                              callback, opt_this) {
      throw new Error('Not implemented');
    },

    /**
     * Iterates over all child containers.
     */
    iterateAllChildEventContainers: function(callback, opt_this) {
      throw new Error('Not implemented');
    },

    /**
     * Iterates over all ancestor events.
     */
    iterateAllEvents: function(callback, opt_this) {
      this.iterateAllEventContainers(function(ec) {
        ec.iterateAllEventsInThisContainer(
            function(eventType) { return true; },
            callback, opt_this);
      });
    },

    /**
     * Iterates over this container and all ancestor containers.
     */
    iterateAllEventContainers: function(callback, opt_this) {
      function visit(ec) {
        callback.call(opt_this, ec);
        ec.iterateAllChildEventContainers(visit);
      }
      visit(this);
    }
  };

  return {
    EventContainer: EventContainer
  };
});
'use strict';

tr.exportTo('tr.model', function() {

  var Event = tr.model.Event;
  var EventRegistry = tr.model.EventRegistry;

  /**
   * A sample that contains a power measurement (in mW).
   *
   * @constructor
   * @extends {Event}
   */
  function PowerSample(series, start, power) {
    Event.call(this);

    this.series_ = series;
    this.start_ = start;
    this.power_ = power;
  }

  PowerSample.prototype = {
    __proto__: Event.prototype,

    get series() {
      return this.series_;
    },

    get start() {
      return this.start_;
    },

    set start(value) {
      this.start_ = value;
    },

    get power() {
      return this.power_;
    },

    set power(value) {
      this.power_ = value;
    },

    addBoundsToRange: function(range) {
      range.addValue(this.start);
    }
  };

  EventRegistry.register(
      PowerSample,
      {
        name: 'powerSample',
        pluralName: 'powerSamples',
        singleViewElementName: 'tr-ui-a-single-power-sample-sub-view',
        multiViewElementName: 'tr-ui-a-multi-power-sample-sub-view'
      });

  return {
    PowerSample: PowerSample
  };
});
'use strict';

tr.exportTo('tr.model', function() {

  var PowerSample = tr.model.PowerSample;

  /**
   * A container holding a time series of power samples.
   *
   * @constructor
   * @extends {EventContainer}
   */
  function PowerSeries(device) {
    tr.model.EventContainer.call(this);

    this.device_ = device;
    this.samples_ = [];
  }

  PowerSeries.prototype = {
    __proto__: tr.model.EventContainer.prototype,

    get device() {
      return this.device_;
    },

    get samples() {
      return this.samples_;
    },

    get stableId() {
      return this.device_.stableId + '.PowerSeries';
    },

    /**
     * Adds a power sample to the series and returns it.
     *
     * Note: Samples must be added in chronological order.
     */
    addPowerSample: function(ts, val) {
      var sample = new PowerSample(this, ts, val);
      this.samples_.push(sample);
      return sample;
    },

    /**
     * Returns the total energy (in Joules) consumed between the specified
     * start and end timestamps (in milliseconds).
     */
    getEnergyConsumed: function(start, end) {
      var measurementRange = tr.b.Range.fromExplicitRange(start, end);

      var energyConsumed = 0;
      for (var i = 0; i < this.samples.length; i++) {
        var sample = this.samples[i];
        var nextSample = this.samples[i + 1];

        var sampleRange = new tr.b.Range();
        sampleRange.addValue(sample.start);
        sampleRange.addValue(nextSample ? nextSample.start : Infinity);

        var timeIntersection = measurementRange.findIntersection(sampleRange);

        // Divide by 1000 to convert milliseconds to seconds.
        energyConsumed += timeIntersection.duration / 1000 * sample.power;
      }

      return energyConsumed;
    },

    shiftTimestampsForward: function(amount) {
      for (var i = 0; i < this.samples_.length; ++i)
        this.samples_[i].start += amount;
    },

    updateBounds: function() {
      this.bounds.reset();

      if (this.samples_.length === 0)
        return;

      this.bounds.addValue(this.samples_[0].start);
      this.bounds.addValue(this.samples_[this.samples_.length - 1].start);
    },

    iterateAllEventsInThisContainer: function(eventTypePredicate, callback,
                                              opt_this) {
      if (eventTypePredicate.call(opt_this, PowerSample))
        this.samples_.forEach(callback, opt_this);
    },

    iterateAllChildEventContainers: function(callback, opt_this) {
    }
  };

  return {
    PowerSeries: PowerSeries
  };
});
'use strict';

/**
 * @fileoverview Provides the Device class.
 */
tr.exportTo('tr.model', function() {

  /**
   * Device represents the device-level objects in the model.
   * @constructor
   * @extends {tr.model.EventContainer}
   */
  function Device(model) {
    if (!model)
      throw new Error('Must provide a model.');

    tr.model.EventContainer.call(this);

    this.powerSeries_ = undefined;
    this.vSyncTimestamps_ = [];
  };

  Device.compare = function(x, y) {
    return x.guid - y.guid;
  };

  Device.prototype = {
    __proto__: tr.model.EventContainer.prototype,

    compareTo: function(that) {
      return Device.compare(this, that);
    },

    get userFriendlyName() {
      return 'Device';
    },

    get userFriendlyDetails() {
      return 'Device';
    },

    get stableId() {
      return 'Device';
    },

    getSettingsKey: function() {
      return 'device';
    },

    get powerSeries() {
      return this.powerSeries_;
    },

    set powerSeries(powerSeries) {
      this.powerSeries_ = powerSeries;
    },

    get vSyncTimestamps() {
      return this.vSyncTimestamps_;
    },

    set vSyncTimestamps(value) {
      this.vSyncTimestamps_ = value;
    },

    updateBounds: function() {
      this.bounds.reset();

      this.iterateAllChildEventContainers(function(child) {
        child.updateBounds();
        this.bounds.addRange(child.bounds);
      }, this);
    },

    shiftTimestampsForward: function(amount) {
      this.iterateAllChildEventContainers(function(child) {
        child.shiftTimestampsForward(amount);
      });

      for (var i = 0; i < this.vSyncTimestamps_.length; i++)
        this.vSyncTimestamps_[i] += amount;
    },

    addCategoriesToDict: function(categoriesDict) {
    },

    iterateAllEventsInThisContainer: function(eventTypePredicate,
                                              callback, opt_this) {
    },

    iterateAllChildEventContainers: function(callback, opt_this) {
      if (this.powerSeries_)
        callback.call(opt_this, this.powerSeries_);
    }
  };

  return {
    Device: Device
  };
});
'use strict';

/**
 * @fileoverview Provides the Flow class.
 */
tr.exportTo('tr.model', function() {
  /**
   * A Flow represents an interval of time plus parameters associated
   * with that interval.
   *
   * @constructor
   */
  function FlowEvent(category, id, title, colorId, start, args, opt_duration) {
    tr.model.TimedEvent.call(this, start);

    this.category = category || '';
    this.title = title;
    this.colorId = colorId;
    this.start = start;
    this.args = args;

    this.id = id;

    this.startSlice = undefined;
    this.endSlice = undefined;

    this.startStackFrame = undefined;
    this.endStackFrame = undefined;

    if (opt_duration !== undefined)
      this.duration = opt_duration;
  }

  FlowEvent.prototype = {
    __proto__: tr.model.TimedEvent.prototype,

    get userFriendlyName() {
      return 'Flow event named ' + this.title + ' at ' +
          tr.b.u.TimeStamp.format(this.timestamp);
    }
  };

  tr.model.EventRegistry.register(
      FlowEvent,
      {
        name: 'flowEvent',
        pluralName: 'flowEvents',
        singleViewElementName: 'tr-ui-a-single-flow-event-sub-view',
        multiViewElementName: 'tr-ui-a-multi-flow-event-sub-view'
      });

  return {
    FlowEvent: FlowEvent
  };
});
'use strict';

tr.exportTo('tr.b', function() {

  function identity(d) {
    return d;
  }

  function Statistics() {
  }

  /* Returns the quotient, or zero if the denominator is zero.*/
  Statistics.divideIfPossibleOrZero = function(numerator, denominator) {
    if (denominator === 0)
      return 0;
    return numerator / denominator;
  }

  Statistics.sum = function(ary, opt_func, opt_this) {
    var func = opt_func || identity;
    var ret = 0;
    for (var i = 0; i < ary.length; i++)
      ret += func.call(opt_this, ary[i], i);
    return ret;
  };

  Statistics.mean = function(ary, opt_func, opt_this) {
    return Statistics.sum(ary, opt_func, opt_this) / ary.length;
  };

  Statistics.variance = function(ary, opt_func, opt_this) {
    var func = opt_func || identity;
    var mean = Statistics.mean(ary, func, opt_this);
    var sumOfSquaredDistances = Statistics.sum(
        ary,
        function(d, i) {
          var v = func.call(this, d, i) - mean;
          return v * v;
        },
        opt_this);
    return sumOfSquaredDistances / (ary.length - 1);
  };

  Statistics.stddev = function(ary, opt_func, opt_this) {
    return Math.sqrt(
        Statistics.variance(ary, opt_func, opt_this));
  };

  Statistics.max = function(ary, opt_func, opt_this) {
    var func = opt_func || identity;
    var ret = -Infinity;
    for (var i = 0; i < ary.length; i++)
      ret = Math.max(ret, func.call(opt_this, ary[i], i));
    return ret;
  };

  Statistics.min = function(ary, opt_func, opt_this) {
    var func = opt_func || identity;
    var ret = Infinity;
    for (var i = 0; i < ary.length; i++)
      ret = Math.min(ret, func.call(opt_this, ary[i], i));
    return ret;
  };

  Statistics.range = function(ary, opt_func, opt_this) {
    var func = opt_func || identity;
    var ret = new tr.b.Range();
    for (var i = 0; i < ary.length; i++)
      ret.addValue(func.call(opt_this, ary[i], i));
    return ret;
  }

  Statistics.percentile = function(ary, percent, opt_func, opt_this) {
    if (!(percent >= 0 && percent <= 1))
      throw new Error('percent must be [0,1]');

    var func = opt_func || identity;
    var tmp = new Array(ary.length);
    for (var i = 0; i < ary.length; i++)
      tmp[i] = func.call(opt_this, ary[i], i);
    tmp.sort();
    var idx = Math.floor((ary.length - 1) * percent);
    return tmp[idx];
  };

  /* Clamp a value between some low and high value. */
  Statistics.clamp = function(value, opt_low, opt_high) {
    opt_low = opt_low || 0.0;
    opt_high = opt_high || 1.0;
    return Math.min(Math.max(value, opt_low), opt_high);
  }

  /**
   * Sorts the samples, and map them linearly to the range [0,1].
   *
   * They're mapped such that for the N samples, the first sample is 0.5/N and
   * the last sample is (N-0.5)/N.
   *
   * Background: The discrepancy of the sample set i/(N-1); i=0, ..., N-1 is
   * 2/N, twice the discrepancy of the sample set (i+1/2)/N; i=0, ..., N-1. In
   * our case we don't want to distinguish between these two cases, as our
   * original domain is not bounded (it is for Monte Carlo integration, where
   * discrepancy was first used).
   **/
  Statistics.normalizeSamples = function(samples) {
    if (samples.length === 0) {
      return {
        normalized_samples: samples,
        scale: 1.0
      };
    }
    // Create a copy to make sure that we don't mutate original |samples| input.
    samples = samples.slice().sort(
      function(a, b) {
        return a - b;
      }
    );
    var low = Math.min.apply(null, samples);
    var high = Math.max.apply(null, samples);
    var new_low = 0.5 / samples.length;
    var new_high = (samples.length - 0.5) / samples.length;
    if (high - low === 0.0) {
      // Samples is an array of 0.5 in this case.
      samples = Array.apply(null, new Array(samples.length)).map(
        function() { return 0.5;});
      return {
        normalized_samples: samples,
        scale: 1.0
      };
    }
    var scale = (new_high - new_low) / (high - low);
    for (var i = 0; i < samples.length; i++) {
      samples[i] = (samples[i] - low) * scale + new_low;
    }
    return {
      normalized_samples: samples,
      scale: scale
    };
  }

  /**
   * Computes the discrepancy of a set of 1D samples from the interval [0,1].
   *
   * The samples must be sorted. We define the discrepancy of an empty set
   * of samples to be zero.
   *
   * http://en.wikipedia.org/wiki/Low-discrepancy_sequence
   * http://mathworld.wolfram.com/Discrepancy.html
   */
  Statistics.discrepancy = function(samples, opt_location_count) {
    if (samples.length === 0)
      return 0.0;

    var max_local_discrepancy = 0;
    var inv_sample_count = 1.0 / samples.length;
    var locations = [];
    // For each location, stores the number of samples less than that location.
    var count_less = [];
    // For each location, stores the number of samples less than or equal to
    // that location.
    var count_less_equal = [];

    if (opt_location_count !== undefined) {
      // Generate list of equally spaced locations.
      var sample_index = 0;
      for (var i = 0; i < opt_location_count; i++) {
        var location = i / (opt_location_count - 1);
        locations.push(location);
        while (sample_index < samples.length &&
          samples[sample_index] < location) {
          sample_index += 1;
        }
        count_less.push(sample_index);
        while (sample_index < samples.length &&
            samples[sample_index] <= location) {
          sample_index += 1;
        }
        count_less_equal.push(sample_index);
      }
    } else {
      // Populate locations with sample positions. Append 0 and 1 if necessary.
      if (samples[0] > 0.0) {
        locations.push(0.0);
        count_less.push(0);
        count_less_equal.push(0);
      }
      for (var i = 0; i < samples.length; i++) {
        locations.push(samples[i]);
        count_less.push(i);
        count_less_equal.push(i + 1);
      }
      if (samples[-1] < 1.0) {
        locations.push(1.0);
        count_less.push(samples.length);
        count_less_equal.push(samples.length);
      }
    }
    // Iterate over the intervals defined by any pair of locations.
    for (var i = 0; i < locations.length; i++) {
      for (var j = i + 1; j < locations.length; j++) {
        // Length of interval
        var length = locations[j] - locations[i];

        // Local discrepancy for closed interval
        var count_closed = count_less_equal[j] - count_less[i];
        var local_discrepancy_closed = Math.abs(
          count_closed * inv_sample_count - length);
        var max_local_discrepancy = Math.max(
          local_discrepancy_closed, max_local_discrepancy);

        // Local discrepancy for open interval
        var count_open = count_less[j] - count_less_equal[i];
        var local_discrepancy_open = Math.abs(
          count_open * inv_sample_count - length);
        var max_local_discrepancy = Math.max(
          local_discrepancy_open, max_local_discrepancy);
      }
    }
    return max_local_discrepancy;
  };

  /**
   * A discrepancy based metric for measuring timestamp jank.
   *
   * timestampsDiscrepancy quantifies the largest area of jank observed in a
   * series of timestamps.  Note that this is different from metrics based on
   * the max_time_interval. For example, the time stamp series A = [0,1,2,3,5,6]
   *  and B = [0,1,2,3,5,7] have the same max_time_interval = 2, but
   * Discrepancy(B) > Discrepancy(A).
   *
   * Two variants of discrepancy can be computed:
   *
   * Relative discrepancy is following the original definition of
   * discrepancy. It characterized the largest area of jank, relative to the
   * duration of the entire time stamp series.  We normalize the raw results,
   * because the best case discrepancy for a set of N samples is 1/N (for
   * equally spaced samples), and we want our metric to report 0.0 in that
   * case.
   *
   * Absolute discrepancy also characterizes the largest area of jank, but its
   * value wouldn't change (except for imprecisions due to a low
   * |interval_multiplier|) if additional 'good' intervals were added to an
   * exisiting list of time stamps.  Its range is [0,inf] and the unit is
   * milliseconds.
   *
   * The time stamp series C = [0,2,3,4] and D = [0,2,3,4,5] have the same
   * absolute discrepancy, but D has lower relative discrepancy than C.
   *
   * |timestamps| may be a list of lists S = [S_1, S_2, ..., S_N], where each
   * S_i is a time stamp series. In that case, the discrepancy D(S) is:
   * D(S) = max(D(S_1), D(S_2), ..., D(S_N))
   **/
  Statistics.timestampsDiscrepancy = function(timestamps, opt_absolute,
                            opt_location_count) {
    if (timestamps.length === 0)
      return 0.0;

    if (opt_absolute === undefined)
      opt_absolute = true;

    if (Array.isArray(timestamps[0])) {
      var range_discrepancies = timestamps.map(function(r) {
        return Statistics.timestampsDiscrepancy(r);
      });
      return Math.max.apply(null, range_discrepancies);
    }

    var s = Statistics.normalizeSamples(timestamps);
    var samples = s.normalized_samples;
    var sample_scale = s.scale;
    var discrepancy = Statistics.discrepancy(samples, opt_location_count);
    var inv_sample_count = 1.0 / samples.length;
    if (opt_absolute === true) {
      // Compute absolute discrepancy
      discrepancy /= sample_scale;
    } else {
      // Compute relative discrepancy
      discrepancy = Statistics.clamp(
        (discrepancy - inv_sample_count) / (1.0 - inv_sample_count));
    }
    return discrepancy;
  };

  /**
   * A discrepancy based metric for measuring duration jank.
   *
   * DurationsDiscrepancy computes a jank metric which measures how irregular a
   * given sequence of intervals is. In order to minimize jank, each duration
   * should be equally long. This is similar to how timestamp jank works,
   * and we therefore reuse the timestamp discrepancy function above to compute
   * a similar duration discrepancy number.
   *
   * Because timestamp discrepancy is defined in terms of timestamps, we first
   * convert the list of durations to monotonically increasing timestamps.
   *
   * Args:
   *  durations: List of interval lengths in milliseconds.
   *  absolute: See TimestampsDiscrepancy.
   *  opt_location_count: See TimestampsDiscrepancy.
   **/
  Statistics.durationsDiscrepancy = function(
      durations, opt_absolute, opt_location_count) {
    if (durations.length === 0)
      return 0.0;

    var timestamps = durations.reduce(function(prev, curr, index, array) {
      prev.push(prev[prev.length - 1] + curr);
      return prev;
    }, [0]);
    return Statistics.timestampsDiscrepancy(
      timestamps, opt_absolute, opt_location_count);
  };


  /**
   * A mechanism to uniformly sample elements from an arbitrary long stream.
   *
   * Call this method every time a new element is obtained from the stream,
   * passing always the same |samples| array and the |numSamples| you desire.
   * Also pass in the current |streamLength|, which is the same as the index of
   * |newElement| within that stream.
   *
   * The |samples| array will possibly be updated, replacing one of its element
   * with |newElements|. The length of |samples| will not be more than
   * |numSamples|.
   *
   * This method guarantees that after |streamLength| elements have been
   * processed each one has equal probability of being in |samples|. The order
   * of samples is not preserved though.
   *
   * Args:
   *  samples: Array of elements that have already been selected. Start with [].
   *  streamLength: The current length of the stream, up to |newElement|.
   *  newElement: The element that was just extracted from the stream.
   *  numSamples: The total number of samples desired.
   **/
  Statistics.uniformlySampleStream = function(samples, streamLength, newElement,
                                              numSamples) {
    if (streamLength <= numSamples) {
      if (samples.length >= streamLength)
        samples[streamLength - 1] = newElement;
      else
        samples.push(newElement);
      return;
    }

    var probToKeep = numSamples / streamLength;
    if (Math.random() > probToKeep)
      return;  // New sample was rejected.

    // Keeping it, replace an alement randomly.
    var index = Math.floor(Math.random() * numSamples);
    samples[index] = newElement;
  };

  /**
   * A mechanism to merge two arrays of uniformly sampled elements in a way that
   * ensures elements in the final array are still sampled uniformly.
   *
   * This works similarly to sampleStreamUniform. The |samplesA| array will be
   * updated, some of its elements replaced by elements from |samplesB| in a
   * way that ensure that elements will be sampled uniformly.
   *
   * Args:
   *  samplesA: Array of uniformly sampled elements, will be updated.
   *  streamLengthA: The length of the stream from which |samplesA| was sampled.
   *  samplesB: Other array of uniformly sampled elements, will NOT be updated.
   *  streamLengthB: The length of the stream from which |samplesB| was sampled.
   *  numSamples: The total number of samples desired, both in |samplesA| and
   *      |samplesB|.
   **/
  Statistics.mergeSampledStreams = function(
      samplesA, streamLengthA,
      samplesB, streamLengthB, numSamples) {
    if (streamLengthB < numSamples) {
      // samplesB has not reached max capacity so every sample of stream B were
      // chosen with certainty. Add them one by one into samplesA.
      var nbElements = Math.min(streamLengthB, samplesB.length);
      for (var i = 0; i < nbElements; ++i) {
        Statistics.uniformlySampleStream(samplesA, streamLengthA + i + 1,
            samplesB[i], numSamples);
      }
      return;
    }
    if (streamLengthA < numSamples) {
      // samplesA has not reached max capacity so every sample of stream A were
      // chosen with certainty. Add them one by one into samplesB.
      var nbElements = Math.min(streamLengthA, samplesA.length);
      var tempSamples = samplesB.slice();
      for (var i = 0; i < nbElements; ++i) {
        Statistics.uniformlySampleStream(tempSamples, streamLengthB + i + 1,
            samplesA[i], numSamples);
      }
      // Copy that back into the first vector.
      for (var i = 0; i < tempSamples.length; ++i) {
        samplesA[i] = tempSamples[i];
      }
      return;
    }

    // Both sample arrays are at max capacity, use the power of maths!
    // Elements in samplesA have been selected with probability
    // numSamples / streamLengthA. Same for samplesB. For each index of the
    // array we keep samplesA[i] with probability
    //   P = streamLengthA / (streamLengthA + streamLengthB)
    // and replace it with samplesB[i] with probability 1-P.
    // The total probability of keeping it is therefore
    //   numSamples / streamLengthA *
    //                      streamLengthA / (streamLengthA + streamLengthB)
    //   = numSamples / (streamLengthA + streamLengthB)
    // A similar computation shows we have the same probability of keeping any
    // element in samplesB. Magic!
    var nbElements = Math.min(numSamples, samplesB.length);
    var probOfSwapping = streamLengthB / (streamLengthA + streamLengthB);
    for (var i = 0; i < nbElements; ++i) {
      if (Math.random() < probOfSwapping) {
        samplesA[i] = samplesB[i];
      }
    }
  }

  return {
    Statistics: Statistics
  };
});
'use strict';

/**
 * @fileoverview Class describing rendered frames.
 *
 * Because a frame is produced by multiple threads, it does not inherit from
 * TimedEvent, and has no duration.
 */
tr.exportTo('tr.model', function() {
  var Statistics = tr.b.Statistics;

  var FRAME_PERF_CLASS = {
    GOOD: 'good',
    BAD: 'bad',
    TERRIBLE: 'terrible',
    NEUTRAL: 'generic_work'
  };

  /**
   * @constructor
   * @param {Array} associatedEvents Selection of events composing the frame.
   * @param {Array} threadTimeRanges Array of {thread, start, end}
   * for each thread, describing the critical path of the frame.
   */
  function Frame(associatedEvents, threadTimeRanges, opt_args) {
    tr.model.Event.call(this);

    this.threadTimeRanges = threadTimeRanges;
    this.associatedEvents = new tr.model.EventSet(associatedEvents);
    this.args = opt_args || {};

    this.title = 'Frame';
    this.start = Statistics.min(
        threadTimeRanges, function(x) { return x.start; });
    this.end = Statistics.max(
        threadTimeRanges, function(x) { return x.end; });
    this.totalDuration = Statistics.sum(
        threadTimeRanges, function(x) { return x.end - x.start; });

    this.perfClass = FRAME_PERF_CLASS.NEUTRAL;
  };

  Frame.prototype = {
    __proto__: tr.model.Event.prototype,

    set perfClass(perfClass) {
      this.colorId = tr.ui.b.getColorIdForReservedName(perfClass);
      this.perfClass_ = perfClass;
    },

    get perfClass() {
      return this.perfClass_;
    },

    shiftTimestampsForward: function(amount) {
      this.start += amount;
      this.end += amount;

      for (var i = 0; i < this.threadTimeRanges.length; i++) {
        this.threadTimeRanges[i].start += amount;
        this.threadTimeRanges[i].end += amount;
      }
    },

    addBoundsToRange: function(range) {
      range.addValue(this.start);
      range.addValue(this.end);
    }
  };

  tr.model.EventRegistry.register(
      Frame,
      {
        name: 'frame',
        pluralName: 'frames',
        singleViewElementName: 'tr-ui-a-single-frame-sub-view',
        multiViewElementName: 'tr-ui-a-multi-frame-sub-view'
      });

  return {
    Frame: Frame,
    FRAME_PERF_CLASS: FRAME_PERF_CLASS
  };
});
'use strict';

/**
 * @fileoverview Provides the Attribute class.
 */
tr.exportTo('tr.model', function() {

  /**
   * @constructor
   */
  function Attribute(units) {
    this.units = units;

    // AttributeInfo(s) about the attribute (e.g. information about how it was
    // calculated).
    this.infos = [];
  }

  Attribute.fromDictIfPossible = function(dict, opt_model) {
    var typeInfo = Attribute.findTypeInfoMatching(function(typeInfo) {
      return typeInfo.metadata.type === dict.type;
    });

    if (typeInfo === undefined) {
      if (opt_model) {
        opt_model.importWarning({
          type: 'attribute_parse_error',
          message: 'Unknown attribute type \'' + dict.type + '\'.'
        });
      }
      return UnknownAttribute.fromDict(dict, opt_model);
    }

    return typeInfo.constructor.fromDict(dict, opt_model);
  };

  /**
   * Find the common constructor and units of a list of attribute values. If
   * they have different types (e.g. ScalarAttribute and UnknownAttribute) or
   * units (e.g. 'ms' and 'Hz'), the common constructor will be
   * UnknownAttribute and the common units will be undefined.
   *
   * Undefined attribute values are skipped. This function will return undefined
   * if the list of attribute values contains no defined attribute values.
   */
  Attribute.findCommonTraits = function(attributes, opt_model) {
    var commonTraits;
    for (var i = 0; i < attributes.length; i++) {
      var attribute = attributes[i];
      if (attribute === undefined)
        continue;

      var attributeConstructor = attribute.constructor;
      var attributeUnits = attribute.units;

      if (commonTraits === undefined) {
        commonTraits = {
          constructor: attributeConstructor,
          units: attributeUnits
        };
      } else if (attributeConstructor !== commonTraits.constructor) {
        if (opt_model) {
          opt_model.importWarning({
            type: 'attribute_parse_error',
            message: 'Attribute with different types: ' +
                commonTraits.constructor + ' and ' + attributeConstructor + '.'
          });
        }
        commonTraits = {
          constructor: UnknownAttribute,
          units: undefined
        };
        break;
      } else if (attributeUnits !== commonTraits.units) {
        if (opt_model) {
          opt_model.importWarning({
            type: 'attribute_parse_error',
            message: 'Attribute with different units: ' + commonTraits.units +
                ' and ' + attributeUnits + '.'
          });
        }
        commonTraits = {
          constructor: UnknownAttribute,
          units: undefined
        };
        break;
      }
    }
    return commonTraits;
  };

  /**
   * Aggregate a list of child attribute values with an existing attribute
   * value. The individual values can be undefined, in which case they are
   * ignored.
   */
  Attribute.aggregate = function(childAttributes, existingParentAttribute,
                                 opt_model) {
    var definedChildAttributes = childAttributes.filter(
        function(childAttribute) {
      return childAttribute !== undefined;
    });

    // If all child attribute values were undefined, return the existing parent
    // attribute value (possibly undefined).
    var traits = Attribute.findCommonTraits(definedChildAttributes, opt_model);
    if (traits === undefined)
      return existingParentAttribute;

    var constructor = traits.constructor;

    // If the common type does not support merging child attribute values,
    // return the existing parent attribute value (possibly undefined).
    if (constructor.merge === undefined)
      return existingParentAttribute;

    var mergedAttribute = constructor.merge(
        definedChildAttributes, traits.units, opt_model);

    // If there is no existing parent attribute value, use the merged value
    // (possibly undefined).
    if (existingParentAttribute === undefined)
      return mergedAttribute;

    // Leave it up to the existing parent attribute value to decide if/how it
    // will use the merged value (e.g. generate an import warning if the
    // existing and merged attribute value types differ).
    existingParentAttribute.useMergedAttribute(mergedAttribute, opt_model);

    return existingParentAttribute;
  }

  Attribute.fromTraceValue = function(dict, opt_model) {
    throw new Error('Not implemented');
  };

  Attribute.prototype.useMergedAttribute = function(mergedAttribute,
                                                    opt_model) {
    if (mergedAttribute.constructor !== this.constructor) {
      if (opt_model) {
        opt_model.importWarning({
          type: 'attribute_parse_error',
          message: 'Attribute with different types: ' + this.constructor +
              ' and ' + mergedAttribute.constructor + '.'
        });
      }
    } else if (mergedAttribute.units !== this.units) {
      if (opt_model) {
        opt_model.importWarning({
          type: 'attribute_parse_error',
          message: 'Attribute with different units: ' + this.units +
              ' and ' + mergedAttribute.units + '.'
        });
      }
    }
  };

  var options = new tr.b.ExtensionRegistryOptions(tr.b.BASIC_REGISTRY_MODE);
  tr.b.decorateExtensionRegistry(Attribute, options);

  Attribute.addEventListener('will-register', function(e) {
    if (!e.typeInfo.constructor.hasOwnProperty('fromDict'))
      throw new Error('Attributes must have fromDict method');

    if (!e.typeInfo.metadata.type)
      throw new Error('Attributes must provide type');

    if (e.typeInfo.constructor.prototype.constructor !== e.typeInfo.constructor)
      throw new Error('Attribute prototypes must provide constructor.');
  });

  /**
   * @constructor
   */
  function ScalarAttribute(units, value) {
    Attribute.call(this, units);
    this.value = value;
  }

  ScalarAttribute.fromDict = function(dict) {
    return new ScalarAttribute(dict.units, parseInt(dict.value, 16));
  };

  ScalarAttribute.merge = function(childAttributes, units) {
    var sum = 0;
    childAttributes.forEach(function(childAttribute) {
      sum += childAttribute.value;
    });
    return new ScalarAttribute(units, sum);
  }

  ScalarAttribute.prototype.__proto__ = Attribute.prototype;

  Attribute.register(ScalarAttribute, {type: 'scalar'});

  /**
   * @constructor
   */
  function StringAttribute(units, value) {
    Attribute.call(this, units);
    this.value = value;
  }

  StringAttribute.fromDict = function(dict) {
    return new StringAttribute(dict.units, dict.value);
  };

  Attribute.register(StringAttribute, {type: 'string'});

  /**
   * @constructor
   */
  function UnknownAttribute(units, opt_value) {
    Attribute.call(this, units, opt_value);
    this.value = opt_value;
  }

  UnknownAttribute.fromDict = function(dict) {
    return new UnknownAttribute(dict.units);
  };

  UnknownAttribute.prototype.__proto__ = Attribute.prototype;

  /**
   * @constructor
   */
  function AttributeInfo(type, message) {
    this.type = type;
    this.message = message;
  }

  /**
   * The type of AttributeInfo.
   * @enum
   */
  var AttributeInfoType = {
    // Generic information (e.g. how the attribute was calculated).
    INFORMATION: 0,

    // Warning (e.g. inconsistent attribute values provided).
    WARNING: 1,

    // Attribute source (e.g. attribute refers to an older dump's attribute).
    LINK: 2,

    // Corresponding memory allocator dump owns another MAD.
    // TODO(petrcermak): Figure out if there's a better place to store this.
    MEMORY_OWNER: 3,

    // Corresponding memory allocator dump is owned by another MAD.
    // TODO(petrcermak): Figure out if there's a better place to store this.
    MEMORY_OWNED: 4,

    // Overall value (e.g. peak value since start process).
    OVERALL_VALUE: 5,

    // Recent value (e.g. peak value since the previous memory dump).
    RECENT_VALUE: 6
  };

  return {
    Attribute: Attribute,
    ScalarAttribute: ScalarAttribute,
    StringAttribute: StringAttribute,
    UnknownAttribute: UnknownAttribute,
    AttributeInfo: AttributeInfo,
    AttributeInfoType: AttributeInfoType
  };
});
'use strict';

/**
 * @fileoverview Provides the ContainerMemoryDump class.
 */
tr.exportTo('tr.model', function() {
  /**
   * The ContainerMemoryDump represents an abstract container memory dump.
   * @constructor
   */
  function ContainerMemoryDump(start) {
    tr.model.TimedEvent.call(this, start);

    // 'light' or 'detailed' memory dump. See
    // base::trace_event::MemoryDumpLevelOfDetail in the Chromium
    // repository.
    this.levelOfDetail = undefined;

    this.memoryAllocatorDumps_ = undefined;
    this.memoryAllocatorDumpsByFullName_ = undefined;
  };

  ContainerMemoryDump.prototype = {
    __proto__: tr.model.TimedEvent.prototype,

    shiftTimestampsForward: function(amount) {
      this.start += amount;
    },

    get memoryAllocatorDumps() {
      return this.memoryAllocatorDumps_;
    },

    set memoryAllocatorDumps(memoryAllocatorDumps) {
      this.memoryAllocatorDumps_ = memoryAllocatorDumps;

      // Clear the index and generate it lazily.
      this.memoryAllocatorDumpsByFullName_ = undefined;
    },

    getMemoryAllocatorDumpByFullName: function(fullName) {
      if (this.memoryAllocatorDumps_ === undefined)
        return undefined;

      // Lazily generate the index if necessary.
      if (this.memoryAllocatorDumpsByFullName_ === undefined) {
        var index = {};
        function addDumpsToIndex(dumps) {
          dumps.forEach(function(dump) {
            index[dump.fullName] = dump;
            addDumpsToIndex(dump.children);
          });
        };
        addDumpsToIndex(this.memoryAllocatorDumps_);
        this.memoryAllocatorDumpsByFullName_ = index;
      }

      return this.memoryAllocatorDumpsByFullName_[fullName];
    },

    iterateRootAllocatorDumps: function(fn, opt_this) {
      if (this.memoryAllocatorDumps === undefined)
        return;
      this.memoryAllocatorDumps.forEach(fn, opt_this || this);
    }
  };

  return {
    ContainerMemoryDump: ContainerMemoryDump
  };
});
'use strict';

/**
 * @fileoverview Provides the MemoryAllocatorDump class.
 */
tr.exportTo('tr.model', function() {
  /**
   * @constructor
   */
  function MemoryAllocatorDump(containerMemoryDump, fullName, opt_guid) {
    this.fullName = fullName;
    this.parent = undefined;
    this.children = [];
    this.attributes = {};

    // The associated container memory dump.
    this.containerMemoryDump = containerMemoryDump;

    // Ownership relationship between memory allocator dumps.
    this.owns = undefined;
    this.ownedBy = [];

    // Retention relationship between memory allocator dumps.
    this.retains = [];
    this.retainedBy = [];

    // For debugging purposes.
    this.guid = opt_guid;
  };

  /**
   * Size attribute names. Please refer to the Memory Dump Graph Metric
   * Calculation design document for more details (https://goo.gl/fKg0dt).
   */
  MemoryAllocatorDump.SIZE_ATTRIBUTE_NAME = 'size';
  MemoryAllocatorDump.EFFECTIVE_SIZE_ATTRIBUTE_NAME = 'effective_size';
  MemoryAllocatorDump.DISPLAYED_SIZE_ATTRIBUTE_NAME =
      MemoryAllocatorDump.EFFECTIVE_SIZE_ATTRIBUTE_NAME;

  MemoryAllocatorDump.prototype = {
    get name() {
      return this.fullName.substring(this.fullName.lastIndexOf('/') + 1);
    },

    get quantifiedName() {
      return '\'' + this.fullName + '\' in ' +
          this.containerMemoryDump.containerName;
    },

    isDescendantOf: function(otherDump) {
      var dump = this;
      while (dump !== undefined) {
        if (dump === otherDump)
          return true;
        dump = dump.parent;
      }
      return false;
    },

    addAttribute: function(name, value) {
      if (name in this.attributes)
        throw new Error('Duplicate attribute name: ' + name + '.');
      this.attributes[name] = value;
    },

    aggregateAttributes: function(opt_model) {
      var attributes = {};

      this.children.forEach(function(child) {
        child.aggregateAttributes(opt_model);
        tr.b.iterItems(child.attributes, function(name) {
          attributes[name] = true;
        }, this);
      }, this);

      tr.b.iterItems(attributes, function(name) {
        var childAttributes = this.children.map(function(child) {
          return child.attributes[name];
        }, this);
        var currentAttribute = this.attributes[name];
        this.attributes[name] = tr.model.Attribute.aggregate(
            childAttributes, currentAttribute, opt_model);
      }, this);
    },

    getValidSizeAttributeOrUndefined: function(sizeAttrName, opt_model) {
      var sizeAttr = this.attributes[sizeAttrName];
      if (sizeAttr === undefined)
        return undefined;

      if (!(sizeAttr instanceof tr.model.ScalarAttribute)) {
        if (opt_model !== undefined) {
          opt_model.importWarning({
            type: 'memory_dump_parse_error',
            message: '\'' + sizeAttrName + '\' attribute of memory allocator ' +
                'dump \'' + memoryAllocatorDump.fullName + '\' is not a scalar.'
          });
        }
        return undefined;
      }

      return sizeAttr;
    }
  };

  /**
   * @constructor
   */
  function MemoryAllocatorDumpLink(source, target, opt_importance) {
    this.source = source;
    this.target = target;
    this.importance = opt_importance;
  }

  return {
    MemoryAllocatorDump: MemoryAllocatorDump,
    MemoryAllocatorDumpLink: MemoryAllocatorDumpLink
  };
});
'use strict';

/**
 * @fileoverview Provides the GlobalMemoryDump class.
 */
tr.exportTo('tr.model', function() {
  /**
   * The GlobalMemoryDump represents a simultaneous memory dump of all
   * processes.
   * @constructor
   */
  function GlobalMemoryDump(model, start) {
    tr.model.ContainerMemoryDump.call(this, start);
    this.model = model;
    this.processMemoryDumps = {};
  }

  var SIZE_ATTRIBUTE_NAME = tr.model.MemoryAllocatorDump.SIZE_ATTRIBUTE_NAME;
  var EFFECTIVE_SIZE_ATTRIBUTE_NAME =
      tr.model.MemoryAllocatorDump.EFFECTIVE_SIZE_ATTRIBUTE_NAME;

  function getSize(dump) {
    var attr = dump.attributes[SIZE_ATTRIBUTE_NAME];
    if (attr === undefined)
      return 0;
    return attr.value;
  }

  function hasSize(dump) {
    return dump.attributes[SIZE_ATTRIBUTE_NAME] !== undefined;
  }

  function optional(value, defaultValue) {
    if (value === undefined)
      return defaultValue;
    return value;
  }

  function ownershipToUserFriendlyString(dump, importance) {
    return dump.quantifiedName + ' (importance: ' +
        optional(importance, 0) + ')';
  }

  GlobalMemoryDump.prototype = {
    __proto__: tr.model.ContainerMemoryDump.prototype,

    get userFriendlyName() {
      return 'Global memory dump at ' + tr.b.u.TimeStamp.format(this.start);
    },

    get containerName() {
      return 'global space';
    },

    calculateGraphAttributes: function() {
      // 1. Calculate the sizes of all memory allocator dumps (MADs).
      this.calculateSizes();

      // 2. Calculate the effective sizes of all MADs. This step requires that
      // the sizes of all MADs have already been calculated (step 1).
      this.calculateEffectiveSizes();

      // 3. Aggregate all other attributes of all MADs. This step must be
      // carried out after the sizes of all MADs were calculated (step 1).
      // Otherwise, the sizes of all MADs would be aggregated as direct sums
      // of their children, which would most likely lead to double-counting.
      this.aggregateAttributes();

      // 4. Discount tracing from VM regions stats and malloc or winheap
      // allocator stats. This steps requires that the sizes (step 1),
      // effective sizes (step 2), and resident sizes (step 3) of the relevant
      // MADs have already been calculated.
      this.discountTracingOverhead();
    },

    /**
     * Calculate the size of all memory allocator dumps in the dump graph.
     *
     * The size refers to the allocated size of a (sub)component. It is a
     * natural extension of the optional size attribute provided by
     * MemoryAllocatorDump(s):
     *
     *   - If a MAD provides a size attribute, then its size is assumed to be
     *     equal to it.
     *   - If a MAD does not provide a size attribute, then its size is assumed
     *     to be the maximum of (1) the size of the largest owner of the MAD
     *     and (2) the aggregated size of the MAD's children.
     *
     * Metric motivation: "How big is a (sub)system?"
     *
     * Please refer to the Memory Dump Graph Metric Calculation design document
     * for more details (https://goo.gl/fKg0dt).
     */
    calculateSizes: function() {
      this.traverseAllocatorDumpsInDepthFirstPostOrder(
          this.calculateMemoryAllocatorDumpSize_.bind(this));
    },

    /**
     * Calculate the size of the given MemoryAllocatorDump. This method assumes
     * that the size of both the children and owners of the dump has already
     * been calculated.
     */
    calculateMemoryAllocatorDumpSize_: function(dump) {
      // This flag becomes true if the size attribute of the current dump
      // should be defined, i.e. if (1) the current dump's size attribute is
      // defined, (2) the size of at least one of its children is defined or
      // (3) the size of at least one of its owners is defined.
      var shouldDefineSize = false;

      // This helper function returns the numeric value of the size attribute
      // of the given dependent memory allocator dump. If the attribute is
      // defined, the shouldDefineSize flag above is also set to true (because
      // condition (2) or (3) is satisfied). Otherwise, zero is returned (and
      // the flag is left unchanged).
      function getDependencySize(dependencyDump) {
        var attr = dependencyDump.attributes[SIZE_ATTRIBUTE_NAME];
        if (attr === undefined)
          return 0;
        shouldDefineSize = true;
        return attr.value;
      }

      // 1. Get the size provided by the dump. If present, define a function
      // for checking dependent size consistency (a dump must always be bigger
      // than all its children aggregated together and/or its largest owner).
      var sizeAttribute = dump.getValidSizeAttributeOrUndefined(
          SIZE_ATTRIBUTE_NAME, this.model);
      var size = 0;
      var infos = [];
      var checkDependentSizeIsConsistent = function() { /* no-op */ };
      if (sizeAttribute !== undefined) {
        size = sizeAttribute.value;
        shouldDefineSize = true;
        checkDependentSizeIsConsistent = function(dependentSize,
            dependentName) {
          if (size >= dependentSize)
            return;
          var messageSuffix = ' (' + tr.b.u.Units.sizeInBytes.format(size) +
              ') is less than ' + dependentName + ' (' +
                tr.b.u.Units.sizeInBytes.format(dependentSize) + ').';
          this.model.importWarning({
            type: 'memory_dump_parse_error',
            message: 'Size provided by memory allocator dump \'' +
                dump.fullName + '\'' + messageSuffix
          });
          infos.push(new tr.model.AttributeInfo(
              tr.model.AttributeInfoType.WARNING,
              'Size provided by this memory allocator dump' + messageSuffix));
        }.bind(this);
      }

      // 2. Aggregate size of children. The recursive function traverses all
      // descendants and ensures that double-counting due to ownership within a
      // subsystem is avoided.
      var aggregatedChildrenSize = 0;
      // Owned child dump name -> (Owner child dump name -> overlapping size).
      var allOverlaps = {};
      dump.children.forEach(function(childDump) {
        function aggregateDescendantDump(descendantDump) {
          // Don't count this descendant dump if it owns another descendant of
          // the current dump (would cause double-counting).
          var ownedDumpLink = descendantDump.owns;
          if (ownedDumpLink !== undefined &&
              ownedDumpLink.target.isDescendantOf(dump)) {
            // If the target owned dump is a descendant of a *different* child
            // of the the current dump (i.e. not childDump), then we remember
            // the ownership so that we could explain why the size of the
            // current dump is not equal to the sum of its children.
            var ownedDescendantDump = ownedDumpLink.target;
            var ownedChildDump = ownedDescendantDump;
            while (ownedChildDump.parent !== dump)
              ownedChildDump = ownedChildDump.parent;
            if (childDump !== ownedChildDump) {
              var overlap = getDependencySize(descendantDump);
              if (overlap > 0) {
                // Owner child dump -> total overlapping size.
                var ownedChildOverlaps = allOverlaps[ownedChildDump.name];
                if (ownedChildOverlaps === undefined)
                  allOverlaps[ownedChildDump.name] = ownedChildOverlaps = {};
                var previousTotalOverlap =
                    ownedChildOverlaps[childDump.name] || 0;
                var updatedTotalOverlap = previousTotalOverlap + overlap;
                ownedChildOverlaps[childDump.name] = updatedTotalOverlap;
              }
            }
            return;
          }

          // If this descendant dump is a leaf node, add its size to the
          // aggregated size.
          if (descendantDump.children.length === 0) {
            aggregatedChildrenSize += getDependencySize(descendantDump);
            return;
          }

          // If this descendant dump is an intermediate node, recurse down into
          // its children. Note that the dump's size is NOT added because it is
          // an aggregate of its children (would cause double-counting).
          descendantDump.children.forEach(aggregateDescendantDump);
        }
        aggregateDescendantDump(childDump);
      });
      // If the size of the dump is not equal to the sum of its children, add
      // infos to its children explaining the difference.
      dump.children.forEach(function(childDump) {
        var childOverlaps = allOverlaps[childDump.name];
        if (childOverlaps === undefined)
          return;

        var message = tr.b.dictionaryValues(tr.b.mapItems(childOverlaps,
            function(ownerChildName, overlap) {
          return 'overlaps with its sibling \'' + ownerChildName + '\' (' +
              tr.b.u.Units.sizeInBytes.format(overlap) + ')';
        })).join(' ');

        childDump.attributes[SIZE_ATTRIBUTE_NAME].infos.push(
            new tr.model.AttributeInfo(
                tr.model.AttributeInfoType.INFORMATION, message));
      });
      checkDependentSizeIsConsistent(
          aggregatedChildrenSize, 'the aggregated size of its children');

      // 3. Calculate the largest owner size.
      var largestOwnerSize = 0;
      dump.ownedBy.forEach(function(ownershipLink) {
        var owner = ownershipLink.source;
        var ownerSize = getDependencySize(owner);
        largestOwnerSize = Math.max(largestOwnerSize, ownerSize);
      });
      checkDependentSizeIsConsistent(
          largestOwnerSize, 'the size of its largest owner');

      // If neither the dump nor any of its dependencies (children and owners)
      // provide a size, do NOT add a zero size attribute.
      if (!shouldDefineSize) {
        // The rest of the pipeline relies on size being either a valid
        // ScalarAttribute, or undefined.
        dump.attributes[SIZE_ATTRIBUTE_NAME] = undefined;
        return;
      }

      // A dump must always be bigger than all its children aggregated
      // together and/or its largest owner.
      size = Math.max(size, aggregatedChildrenSize, largestOwnerSize);

      var sizeAttribute = new tr.model.ScalarAttribute('bytes', size);
      sizeAttribute.infos = infos;
      dump.attributes[SIZE_ATTRIBUTE_NAME] = sizeAttribute;

      // Add a virtual child to make up for extra size of the dump with
      // respect to its children (if applicable).
      if (aggregatedChildrenSize < size &&
          dump.children !== undefined && dump.children.length > 0) {
        var virtualChild = new tr.model.MemoryAllocatorDump(
            dump.containerMemoryDump, dump.fullName + '/<unspecified>');
        virtualChild.parent = dump;
        dump.children.unshift(virtualChild);
        virtualChild.attributes[SIZE_ATTRIBUTE_NAME] =
            new tr.model.ScalarAttribute(
                'bytes', size - aggregatedChildrenSize);
      }
    },

    /**
     * Calculate the effective size of all memory allocator dumps in the dump
     * graph.
     *
     * The effective size refers to the amount of memory a particular component
     * is using/consuming. In other words, every (reported) byte of used memory
     * is uniquely attributed to exactly one component. Consequently, unlike
     * size, effective size is cumulative, i.e. the sum of the effective sizes
     * of (top-level) components is equal to the total amount of (reported)
     * used memory.
     *
     * Metric motivation: "How much memory does a (sub)system use?" or "For how
     * much memory should a (sub)system be 'charged'?"
     *
     * Please refer to the Memory Dump Graph Metric Calculation design document
     * for more details (https://goo.gl/fKg0dt).
     *
     * This method assumes that the size of all contained memory allocator
     * dumps has already been calculated [see calculateSizes()].
     */
    calculateEffectiveSizes: function() {
      // 1. Calculate not-owned and not-owning sub-sizes of all MADs
      // (depth-first post-order traversal).
      this.traverseAllocatorDumpsInDepthFirstPostOrder(
          this.calculateDumpSubSizes_.bind(this));

      // 2. Calculate owned and owning coefficients of owned and owner MADs
      // respectively (arbitrary traversal).
      this.traverseAllocatorDumpsInDepthFirstPostOrder(
          this.calculateDumpOwnershipCoefficient_.bind(this));

      // 3. Calculate cumulative owned and owning coefficients of all MADs
      // (depth-first pre-order traversal).
      this.traverseAllocatorDumpsInDepthFirstPreOrder(
          this.calculateDumpCumulativeOwnershipCoefficient_.bind(this));

      // 4. Calculate the effective sizes of all MADs (depth-first post-order
      // traversal).
      this.traverseAllocatorDumpsInDepthFirstPostOrder(
          this.calculateDumpEffectiveSize_.bind(this));
    },

    /**
     * Calculate not-owned and not-owning sub-sizes of a memory allocator dump
     * from its children's (sub-)sizes.
     *
     * Not-owned sub-size refers to the aggregated memory of all children which
     * is not owned by other MADs. Conversely, not-owning sub-size is the
     * aggregated memory of all children which do not own another MAD. The
     * diagram below illustrates these two concepts:
     *
     *     ROOT 1                         ROOT 2
     *     size: 4                        size: 5
     *     not-owned sub-size: 4          not-owned sub-size: 1 (!)
     *     not-owning sub-size: 0 (!)     not-owning sub-size: 5
     *
     *      ^                              ^
     *      |                              |
     *
     *     PARENT 1   ===== owns =====>   PARENT 2
     *     size: 4                        size: 5
     *     not-owned sub-size: 4          not-owned sub-size: 5
     *     not-owning sub-size: 4         not-owning sub-size: 5
     *
     *      ^                              ^
     *      |                              |
     *
     *     CHILD 1                        CHILD 2
     *     size [given]: 4                size [given]: 5
     *     not-owned sub-size: 4          not-owned sub-size: 5
     *     not-owning sub-size: 4         not-owning sub-size: 5
     *
     * This method assumes that (1) the size of the dump, its children, and its
     * owners [see calculateSizes()] and (2) the not-owned and not-owning
     * sub-sizes of both the children and owners of the dump have already been
     * calculated [depth-first post-order traversal].
     */
    calculateDumpSubSizes_: function(dump) {
      // Completely skip dumps with undefined size.
      if (!hasSize(dump))
        return;

      // If the dump is a leaf node, then both sub-sizes are equal to the size.
      if (dump.children === undefined || dump.children.length === 0) {
        var size = getSize(dump);
        dump.notOwningSubSize_ = size;
        dump.notOwnedSubSize_ = size;
        return;
      }

      // Calculate this dump's not-owning sub-size by summing up the not-owning
      // sub-sizes of children MADs which do not own another MAD.
      var notOwningSubSize = 0;
      dump.children.forEach(function(childDump) {
        if (childDump.owns !== undefined)
          return;
        notOwningSubSize += optional(childDump.notOwningSubSize_, 0);
      });
      dump.notOwningSubSize_ = notOwningSubSize;

      // Calculate this dump's not-owned sub-size.
      var notOwnedSubSize = 0;
      dump.children.forEach(function(childDump) {
        // If the child dump is not owned, then add its not-owned sub-size.
        if (childDump.ownedBy.length === 0) {
          notOwnedSubSize += optional(childDump.notOwnedSubSize_, 0);
          return;
        }
        // If the child dump is owned, then add the difference between its size
        // and the largest owner.
        var largestChildOwnerSize = 0;
        childDump.ownedBy.forEach(function(ownershipLink) {
          largestChildOwnerSize = Math.max(
              largestChildOwnerSize, getSize(ownershipLink.source));
        });
        notOwnedSubSize += getSize(childDump) - largestChildOwnerSize;
      });
      dump.notOwnedSubSize_ = notOwnedSubSize;
    },

    /**
     * Calculate owned and owning coefficients of a memory allocator dump and
     * its owners.
     *
     * The owning coefficient refers to the proportion of a dump's not-owning
     * sub-size which is attributed to the dump (only relevant to owning MADs).
     * Conversely, the owned coefficient is the proportion of a dump's
     * not-owned sub-size, which is attributed to it (only relevant to owned
     * MADs).
     *
     * The not-owned size of the owned dump is split among its owners in the
     * order of the ownership importance as demonstrated by the following
     * example:
     *
     *                                          memory allocator dumps
     *                                   OWNED  OWNER1  OWNER2  OWNER3  OWNER4
     *       not-owned sub-size [given]     10       -       -       -       -
     *      not-owning sub-size [given]      -       6       7       5       8
     *               importance [given]      -       2       2       1       0
     *    attributed not-owned sub-size      2       -       -       -       -
     *   attributed not-owning sub-size      -       3       4       0       1
     *                owned coefficient   2/10       -       -       -       -
     *               owning coefficient      -     3/6     4/7     0/5     1/8
     *
     * Explanation: Firstly, 6 bytes are split equally among OWNER1 and OWNER2
     * (highest importance). OWNER2 owns one more byte, so its attributed
     * not-owning sub-size is 6/2 + 1 = 4 bytes. OWNER3 is attributed no size
     * because it is smaller than the owners with higher priority. However,
     * OWNER4 is larger, so it's attributed the difference 8 - 7 = 1 byte.
     * Finally, 2 bytes remain unattributed and are hence kept in the OWNED
     * dump as attributed not-owned sub-size. The coefficients are then
     * directly calculated as fractions of the sub-sizes and corresponding
     * attributed sub-sizes.
     *
     * Note that we always assume that all ownerships of a dump overlap (e.g.
     * OWNER3 is subsumed by both OWNER1 and OWNER2). Hence, the table could
     * be alternatively represented as follows:
     *
     *                                 owned memory range
     *              0   1   2    3    4    5    6        7        8   9  10
     *   Priority 2 |  OWNER1 + OWNER2 (split)  | OWNER2 |
     *   Priority 1 | (already attributed) |
     *   Priority 0 | - - -  (already attributed)  - - - | OWNER4 |
     *    Remainder | - - - - - (already attributed) - - - - - -  | OWNED |
     *
     * This method assumes that (1) the size of the dump [see calculateSizes()]
     * and (2) the not-owned size of the dump and not-owning sub-sizes of its
     * owners [see the first step of calculateEffectiveSizes()] have already
     * been calculated. Note that the method doesn't make any assumptions about
     * the order in which dumps are visited.
     */
    calculateDumpOwnershipCoefficient_: function(dump) {
      // Completely skip dumps with undefined size.
      if (!hasSize(dump))
        return;

      // We only need to consider owned dumps.
      if (dump.ownedBy.length === 0)
        return;

      // Sort the owners in decreasing order of ownership importance and
      // increasing order of not-owning sub-size (in case of equal importance).
      var owners = dump.ownedBy.map(function(ownershipLink) {
        return {
          dump: ownershipLink.source,
          importance: optional(ownershipLink.importance, 0),
          notOwningSubSize: optional(ownershipLink.source.notOwningSubSize_, 0)
        };
      });
      owners.sort(function(a, b) {
        if (a.importance === b.importance)
          return a.notOwningSubSize - b.notOwningSubSize;
        return b.importance - a.importance;
      });

      // Loop over the list of owners and distribute the owned dump's not-owned
      // sub-size among them according to their ownership importance and
      // not-owning sub-size.
      var currentImportanceStartPos = 0;
      var alreadyAttributedSubSize = 0;
      while (currentImportanceStartPos < owners.length) {
        var currentImportance = owners[currentImportanceStartPos].importance;

        // Find the position of the first owner with lower priority.
        var nextImportanceStartPos = currentImportanceStartPos + 1;
        while (nextImportanceStartPos < owners.length &&
               owners[nextImportanceStartPos].importance ===
                  currentImportance) {
          nextImportanceStartPos++;
        }

        // Visit the owners with the same importance in increasing order of
        // not-owned sub-size, split the owned memory among them appropriately,
        // and calculate their owning coefficients.
        var attributedNotOwningSubSize = 0;
        for (var pos = currentImportanceStartPos; pos < nextImportanceStartPos;
             pos++) {
          var owner = owners[pos];
          var notOwningSubSize = owner.notOwningSubSize;
          if (notOwningSubSize > alreadyAttributedSubSize) {
            attributedNotOwningSubSize +=
                (notOwningSubSize - alreadyAttributedSubSize) /
                (nextImportanceStartPos - pos);
            alreadyAttributedSubSize = notOwningSubSize;
          }

          var owningCoefficient = 0;
          if (notOwningSubSize !== 0)
            owningCoefficient = attributedNotOwningSubSize / notOwningSubSize;
          owner.dump.owningCoefficient_ = owningCoefficient;
        }

        currentImportanceStartPos = nextImportanceStartPos;
      }

      // Attribute the remainder of the owned dump's not-owned sub-size to
      // the dump itself and calculate its owned coefficient.
      var notOwnedSubSize = optional(dump.notOwnedSubSize_, 0);
      var remainderSubSize = notOwnedSubSize - alreadyAttributedSubSize;
      var ownedCoefficient = 0;
      if (notOwnedSubSize !== 0)
        ownedCoefficient = remainderSubSize / notOwnedSubSize;
      dump.ownedCoefficient_ = ownedCoefficient;
    },

    /**
     * Calculate cumulative owned and owning coefficients of a memory allocator
     * dump from its (non-cumulative) owned and owning coefficients and the
     * cumulative coefficients of its parent and/or owned dump.
     *
     * The cumulative coefficients represent the total effect of all
     * (non-strict) ancestor ownerships on a memory allocator dump. The
     * cumulative owned coefficient of a MAD can be calculated simply as:
     *
     *   cumulativeOwnedC(M) = ownedC(M) * cumulativeOwnedC(parent(M))
     *
     * This reflects the assumption that if a parent of a child MAD is
     * (partially) owned, then the parent's owner also indirectly owns (a part
     * of) the child MAD.
     *
     * The cumulative owning coefficient of a MAD depends on whether the MAD
     * owns another dump:
     *
     *                           [if M doesn't own another MAD]
     *                         / cumulativeOwningC(parent(M))
     *   cumulativeOwningC(M) =
     *                         \ [if M owns another MAD]
     *                           owningC(M) * cumulativeOwningC(owned(M))
     *
     * The reasoning behind the first case is similar to the one for cumulative
     * owned coefficient above. The only difference is that we don't need to
     * include the dump's (non-cumulative) owning coefficient because it is
     * implicitly 1.
     *
     * The formula for the second case is derived as follows: Since the MAD
     * owns another dump, its memory is not included in its parent's not-owning
     * sub-size and hence shouldn't be affected by the parent's corresponding
     * cumulative coefficient. Instead, the MAD indirectly owns everything
     * owned by its owned dump (and so it should be affected by the
     * corresponding coefficient).
     *
     * Note that undefined coefficients (and coefficients of non-existent
     * dumps) are implicitly assumed to be 1.
     *
     * This method assumes that (1) the size of the dump [see calculateSizes()],
     * (2) the (non-cumulative) owned and owning coefficients of the dump [see
     * the second step of calculateEffectiveSizes()], and (3) the cumulative
     * coefficients of the dump's parent and owned MADs (if present)
     * [depth-first pre-order traversal] have already been calculated.
     */
    calculateDumpCumulativeOwnershipCoefficient_: function(dump) {
      // Completely skip dumps with undefined size.
      if (!hasSize(dump))
        return;

      var cumulativeOwnedCoefficient = optional(dump.ownedCoefficient_, 1);
      var parent = dump.parent;
      if (dump.parent !== undefined)
        cumulativeOwnedCoefficient *= dump.parent.cumulativeOwnedCoefficient_;
      dump.cumulativeOwnedCoefficient_ = cumulativeOwnedCoefficient;

      var cumulativeOwningCoefficient;
      if (dump.owns !== undefined) {
        cumulativeOwningCoefficient = dump.owningCoefficient_ *
            dump.owns.target.cumulativeOwningCoefficient_;
      } else if (dump.parent !== undefined) {
        cumulativeOwningCoefficient = dump.parent.cumulativeOwningCoefficient_;
      } else {
        cumulativeOwningCoefficient = 1;
      }
      dump.cumulativeOwningCoefficient_ = cumulativeOwningCoefficient;
    },

    /**
     * Calculate the effective size of a memory allocator dump.
     *
     * In order to simplify the (already complex) calculation, we use the fact
     * that effective size is cumulative (unlike regular size), i.e. the
     * effective size of a non-leaf node is equal to the sum of effective sizes
     * of its children. The effective size of a leaf MAD is calculated as:
     *
     *   effectiveSize(M) = size(M) * cumulativeOwningC(M) * cumulativeOwnedC(M)
     *
     * This method assumes that (1) the size of the dump and its children [see
     * calculateSizes()] and (2) the cumulative owning and owned coefficients
     * of the dump (if it's a leaf node) [see the third step of
     * calculateEffectiveSizes()] or the effective sizes of its children (if
     * it's a non-leaf node) [depth-first post-order traversal] have already
     * been calculated.
     */
    calculateDumpEffectiveSize_: function(dump) {
      // Completely skip dumps with undefined size. As a result, each dump will
      // have defined effective size if and only if it has defined size.
      if (!hasSize(dump)) {
        // The rest of the pipeline relies on effective size being either a
        // valid ScalarAttribute, or undefined.
        dump.attributes[EFFECTIVE_SIZE_ATTRIBUTE_NAME] = undefined;
        return;
      }

      var effectiveSize;
      if (dump.children === undefined || dump.children.length === 0) {
        // Leaf dump.
        effectiveSize = getSize(dump) * dump.cumulativeOwningCoefficient_ *
            dump.cumulativeOwnedCoefficient_;
      } else {
        // Non-leaf dump.
        effectiveSize = 0;
        dump.children.forEach(function(childDump) {
          if (!hasSize(childDump))
            return;
          effectiveSize +=
              childDump.attributes[EFFECTIVE_SIZE_ATTRIBUTE_NAME].value;
        });
      }
      var attribute = new tr.model.ScalarAttribute('bytes', effectiveSize);
      dump.attributes[EFFECTIVE_SIZE_ATTRIBUTE_NAME] = attribute;

      // Add attribute infos regarding ownership (if applicable).
      // TODO(petrcermak): This belongs to the corresponding analysis UI code.
      if (dump.ownedBy.length > 0) {
        var message = 'shared by:' +
            dump.ownedBy.map(function(ownershipLink) {
              return '\n  - ' + ownershipToUserFriendlyString(
                  ownershipLink.source, ownershipLink.importance);
            }).join();
        attribute.infos.push(new tr.model.AttributeInfo(
            tr.model.AttributeInfoType.MEMORY_OWNED, message));
      }
      if (dump.owns !== undefined) {
        var target = dump.owns.target;
        var message = 'shares ' +
            ownershipToUserFriendlyString(target, dump.owns.importance) +
            ' with';

        var otherOwnershipLinks = target.ownedBy.filter(
            function(ownershipLink) {
          return ownershipLink.source !== dump;
        });
        if (otherOwnershipLinks.length > 0) {
          message += ':';
          message += otherOwnershipLinks.map(function(ownershipLink) {
            return '\n  - ' + ownershipToUserFriendlyString(
                ownershipLink.source, ownershipLink.importance);
          }).join();
        } else {
          message += ' no other dumps';
        }

        attribute.infos.push(new tr.model.AttributeInfo(
            tr.model.AttributeInfoType.MEMORY_OWNER, message));
      }
    },

    aggregateAttributes: function() {
      // 1. Aggregate attributes in this global memory dump.
      this.iterateRootAllocatorDumps(function(dump) {
        dump.aggregateAttributes(this.model);
      });

      // 2. Propagate attributes from global memory allocator dumps to their
      // owners.
      this.iterateRootAllocatorDumps(this.propagateAttributesRecursively);

      // 3. Aggregate attributes in the associated process memory dumps.
      tr.b.iterItems(this.processMemoryDumps, function(pid, processMemoryDump) {
        processMemoryDump.iterateRootAllocatorDumps(function(dump) {
          dump.aggregateAttributes(this.model);
        }, this);
      }, this);
    },

    propagateAttributesRecursively: function(globalAllocatorDump) {
      tr.b.iterItems(globalAllocatorDump.attributes, function(attrName, attr) {
        if (attrName === SIZE_ATTRIBUTE_NAME ||
            attrName === EFFECTIVE_SIZE_ATTRIBUTE_NAME) {
          // We cannot propagate size and effective_size attributes because it
          // would break the complex maths [see calculateSizes() and
          // calculateEffectiveSizes()].
          return;
        }
        globalAllocatorDump.ownedBy.forEach(function(ownershipLink) {
          var processAllocatorDump = ownershipLink.source;
          if (processAllocatorDump.attributes[attrName] !== undefined) {
            // Attributes provided by process memory allocator dumps themselves
            // have precedence over attributes propagated from global memory
            // allocator dumps.
            return;
          }
          processAllocatorDump.attributes[attrName] = attr;
        });
      });
      // Recursively propagate attributes from all child memory allocator dumps.
      globalAllocatorDump.children.forEach(
          this.propagateAttributesRecursively, this);
    },

    discountTracingOverhead: function() {
      // TODO(petrcermak): Consider factoring out all the finalization code and
      // constants to a single file.
      tr.b.iterItems(this.processMemoryDumps, function(pid, dump) {
        dump.discountTracingOverhead(this.model);
      }, this);
    },

    iterateContainerDumps: function(fn) {
      fn.call(this, this);
      tr.b.iterItems(this.processMemoryDumps, function(pid, processDump) {
        fn.call(this, processDump);
      }, this);
    },

    iterateAllRootAllocatorDumps: function(fn) {
      this.iterateContainerDumps(function(containerDump) {
        containerDump.iterateRootAllocatorDumps(fn, this);
      });
    },

    /**
     * Traverse the memory dump graph in a depth first post-order, i.e.
     * children and owners of a memory allocator dump are visited before the
     * dump itself. This method will throw an exception if the graph contains
     * a cycle.
     */
    traverseAllocatorDumpsInDepthFirstPostOrder: function(fn) {
      var visitedDumps = new WeakSet();
      var openDumps = new WeakSet();

      function visit(dump) {
        if (visitedDumps.has(dump))
          return;

        if (openDumps.has(dump))
          throw new Error(dump.userFriendlyName + ' contains a cycle');
        openDumps.add(dump);

        // Visit owners before the dumps they own.
        dump.ownedBy.forEach(function(ownershipLink) {
          visit.call(this, ownershipLink.source);
        }, this);

        // Visit children before parents.
        dump.children.forEach(visit, this);

        // Actually visit the current memory allocator dump.
        fn.call(this, dump);
        visitedDumps.add(dump);

        openDumps.delete(dump);
      }

      this.iterateAllRootAllocatorDumps(visit);
    },

    /**
     * Traverse the memory dump graph in a depth first pre-order, i.e.
     * children and owners of a memory allocator dump are visited after the
     * dump itself. This method will not visit some dumps if the graph contains
     * a cycle.
     */
    traverseAllocatorDumpsInDepthFirstPreOrder: function(fn) {
      var visitedDumps = new WeakSet();

      function visit(dump) {
        if (visitedDumps.has(dump))
          return;

        // If this dumps owns another dump which hasn't been visited yet, then
        // wait for this dump to be visited later.
        if (dump.owns !== undefined && !visitedDumps.has(dump.owns.target))
          return;

        // If this dump's parent hasn't been visited yet, then wait for this
        // dump to be visited later.
        if (dump.parent !== undefined && !visitedDumps.has(dump.parent))
          return;

        // Actually visit the current memory allocator dump.
        fn.call(this, dump);
        visitedDumps.add(dump);

        // Visit owners after the dumps they own.
        dump.ownedBy.forEach(function(ownershipLink) {
          visit.call(this, ownershipLink.source);
        }, this);

        // Visit children after parents.
        dump.children.forEach(visit, this);
      }

      this.iterateAllRootAllocatorDumps(visit);
    }
  };

  tr.model.EventRegistry.register(
      GlobalMemoryDump,
      {
        name: 'globalMemoryDump',
        pluralName: 'globalMemoryDumps',
        singleViewElementName: 'tr-ui-a-container-memory-dump-sub-view',
        multiViewElementName: 'tr-ui-a-container-memory-dump-sub-view'
      });

  return {
    GlobalMemoryDump: GlobalMemoryDump
  };
});
'use strict';

/**
 * @fileoverview Provides the InstantEvent class.
 */
tr.exportTo('tr.model', function() {
  var InstantEventType = {
    GLOBAL: 1,
    PROCESS: 2
  };

  function InstantEvent(category, title, colorId, start, args) {
    tr.model.TimedEvent.call(this);

    this.category = category || '';
    this.title = title;
    this.colorId = colorId;
    this.start = start;
    this.args = args;

    this.type = undefined;
  };

  InstantEvent.prototype = {
    __proto__: tr.model.TimedEvent.prototype
  };

  function GlobalInstantEvent(category, title, colorId, start, args) {
    InstantEvent.apply(this, arguments);
    this.type = InstantEventType.GLOBAL;
  };

  GlobalInstantEvent.prototype = {
    __proto__: InstantEvent.prototype,
    get userFriendlyName() {
      return 'Global instant event ' + this.title + ' @ ' +
          tr.b.u.TimeStamp.format(start);
    }
  };

  function ProcessInstantEvent(category, title, colorId, start, args) {
    InstantEvent.apply(this, arguments);
    this.type = InstantEventType.PROCESS;
  };

  ProcessInstantEvent.prototype = {
    __proto__: InstantEvent.prototype,

    get userFriendlyName() {
      return 'Process-level instant event ' + this.title + ' @ ' +
          tr.b.u.TimeStamp.format(start);
    }
  };

  tr.model.EventRegistry.register(
      InstantEvent,
      {
        name: 'instantEvent',
        pluralName: 'instantEvents',
        singleViewElementName: 'tr-ui-a-single-instant-event-sub-view',
        multiViewElementName: 'tr-ui-a-multi-instant-event-sub-view'
      });

  return {
    GlobalInstantEvent: GlobalInstantEvent,
    ProcessInstantEvent: ProcessInstantEvent,

    InstantEventType: InstantEventType,
    InstantEvent: InstantEvent
  };
});
'use strict';

tr.exportTo('tr.model', function() {

  /**
   * Indicates how much of a compound-event is selected [if any].
   *
   * The CompoundEventSelectionState enum is used with events that are
   * directly selectable, but also have associated events, too, that can be
   * selected. In this situation, there are a variety of different
   * selected states other than just "yes, no". This enum encodes those
   * various possible states.
   */
  var CompoundEventSelectionState = {
    // Basic bit states.
    NOT_SELECTED: 0,
    EVENT_SELECTED: 0x1,
    SOME_ASSOCIATED_EVENTS_SELECTED: 0x2,
    ALL_ASSOCIATED_EVENTS_SELECTED: 0x4,

    // Common combinations.
    EVENT_AND_SOME_ASSOCIATED_SELECTED: 0x1 | 0x2,
    EVENT_AND_ALL_ASSOCIATED_SELECTED: 0x1 | 0x4
  };

  return {
    CompoundEventSelectionState: CompoundEventSelectionState
  };
});
'use strict';

tr.exportTo('tr.model', function() {
  var CompoundEventSelectionState = tr.model.CompoundEventSelectionState;

  function InteractionRecord(title, colorId, start, duration) {
    tr.model.TimedEvent.call(this, start);
    this.title = title;
    this.colorId = colorId;
    this.duration = duration;
    this.args = {};
    this.associatedEvents = new tr.model.EventSet();

    // sourceEvents are the ones that caused the IR Finder to create this IR.
    this.sourceEvents = new tr.model.EventSet();
  }

  InteractionRecord.prototype = {
    __proto__: tr.model.TimedEvent.prototype,

    get subSlices() {
      return [];
    },

    get userFriendlyName() {
      return this.title + ' interaction at ' +
          tr.b.u.TimeStamp.format(this.start);
    },

    computeCompoundEvenSelectionState: function(selection) {
      var cess = CompoundEventSelectionState.NOT_SELECTED;
      if (selection.contains(this))
        cess |= CompoundEventSelectionState.EVENT_SELECTED;

      if (this.associatedEvents.intersectionIsEmpty(selection))
        return cess;

      var allContained = this.associatedEvents.every(function(event) {
        return selection.contains(event);
      });

      if (allContained)
        cess |= CompoundEventSelectionState.ALL_ASSOCIATED_EVENTS_SELECTED;
      else
        cess |= CompoundEventSelectionState.SOME_ASSOCIATED_EVENTS_SELECTED;
      return cess;
    }
  };

  tr.model.EventRegistry.register(
      InteractionRecord,
      {
        name: 'interaction',
        pluralName: 'interactions',
        singleViewElementName: 'tr-ui-a-single-interaction-record-sub-view',
        multiViewElementName: 'tr-ui-a-multi-interaction-record-sub-view'
      });

  return {
    InteractionRecord: InteractionRecord
  };
});
'use strict';

/**
 * @fileoverview Helper functions for doing intersections and iteration
 * over sorted arrays and intervals.
 *
 */
tr.exportTo('tr.b', function() {
  /**
   * Finds the first index in the array whose value is >= loVal.
   *
   * The key for the search is defined by the mapFn. This array must
   * be prearranged such that ary.map(mapFn) would also be sorted in
   * ascending order.
   *
   * @param {Array} ary An array of arbitrary objects.
   * @param {function():*} mapFn Callback that produces a key value
   *     from an element in ary.
   * @param {number} loVal Value for which to search.
   * @return {Number} Offset o into ary where all ary[i] for i <= o
   *     are < loVal, or ary.length if loVal is greater than all elements in
   *     the array.
   */
  function findLowIndexInSortedArray(ary, mapFn, loVal) {
    if (ary.length == 0)
      return 1;

    var low = 0;
    var high = ary.length - 1;
    var i, comparison;
    var hitPos = -1;
    while (low <= high) {
      i = Math.floor((low + high) / 2);
      comparison = mapFn(ary[i]) - loVal;
      if (comparison < 0) {
        low = i + 1; continue;
      } else if (comparison > 0) {
        high = i - 1; continue;
      } else {
        hitPos = i;
        high = i - 1;
      }
    }
    // return where we hit, or failing that the low pos
    return hitPos != -1 ? hitPos : low;
  }

  // From devtools/front_end/platform/utilities.js upperBound
  function findHighIndexInSortedArray(ary, mapFn, loVal, hiVal) {
    var lo = loVal || 0;
    var hi = hiVal !== undefined ? hiVal : ary.length;
    while (lo < hi) {
      var mid = (lo + hi) >> 1;
      if (mapFn(ary[mid]) >= 0)
        lo = mid + 1;
      else
        hi = mid;
    }
    return hi;
  }

  /**
   * Finds an index in an array of intervals that either intersects
   * the provided loVal, or if no intersection is found, -1 or ary.length.
   *
   * The array of intervals is defined implicitly via two mapping functions
   * over the provided ary. mapLoFn determines the lower value of the interval,
   * mapWidthFn the width. Intersection is lower-inclusive, e.g. [lo,lo+w).
   *
   * The array of intervals formed by this mapping must be non-overlapping and
   * sorted in ascending order by loVal.
   *
   * @param {Array} ary An array of objects that can be converted into sorted
   *     nonoverlapping ranges [x,y) using the mapLoFn and mapWidth.
   * @param {function():*} mapLoFn Callback that produces the low value for the
   *     interval represented by an  element in the array.
   * @param {function():*} mapWidthFn Callback that produces the width for the
   *     interval represented by an  element in the array.
   * @param {number} loVal The low value for the search.
   * @return {Number} An index in the array that intersects or is first-above
   *     loVal, -1 if none found and loVal is below than all the intervals,
   *     ary.length if loVal is greater than all the intervals.
   */
  function findIndexInSortedIntervals(ary, mapLoFn, mapWidthFn, loVal) {
    var first = findLowIndexInSortedArray(ary, mapLoFn, loVal);
    if (first == 0) {
      if (loVal >= mapLoFn(ary[0]) &&
          loVal < mapLoFn(ary[0]) + mapWidthFn(ary[0], 0)) {
        return 0;
      } else {
        return -1;
      }
    } else if (first < ary.length) {
      if (loVal >= mapLoFn(ary[first]) &&
          loVal < mapLoFn(ary[first]) + mapWidthFn(ary[first], first)) {
        return first;
      } else if (loVal >= mapLoFn(ary[first - 1]) &&
                 loVal < mapLoFn(ary[first - 1]) +
                 mapWidthFn(ary[first - 1], first - 1)) {
        return first - 1;
      } else {
        return ary.length;
      }
    } else if (first == ary.length) {
      if (loVal >= mapLoFn(ary[first - 1]) &&
          loVal < mapLoFn(ary[first - 1]) +
          mapWidthFn(ary[first - 1], first - 1)) {
        return first - 1;
      } else {
        return ary.length;
      }
    } else {
      return ary.length;
    }
  }

  /**
   * Finds an index in an array of sorted closed intervals that either
   * intersects the provided val, or if no intersection is found, -1 or
   *  ary.length.
   *
   * The array of intervals is defined implicitly via two mapping functions
   * over the provided ary. mapLoFn determines the lower value of the interval,
   * mapHiFn the high. Intersection is closed, e.g. [lo,hi], unlike with
   * findIndexInSortedIntervals, which is right-open.
   *
   * The array of intervals formed by this mapping must be non-overlapping, and
   * sorted in ascending order by val.
   *
   * @param {Array} ary An array of objects that can be converted into sorted
   *     nonoverlapping ranges [x,y) using the mapLoFn and mapWidth.
   * @param {function():*} mapLoFn Callback that produces the low value for the
   *     interval represented by an  element in the array.
   * @param {function():*} mapHiFn Callback that produces the high for the
   *     interval represented by an  element in the array.
   * @param {number} val The value for the search.
   * @return {Number} An index in the array that intersects or is first-above
   *     val, -1 if none found and val is below than all the intervals,
   *     ary.length if val is greater than all the intervals.
   */
  function findIndexInSortedClosedIntervals(ary, mapLoFn, mapHiFn, val) {
    var i = findLowIndexInSortedArray(ary, mapLoFn, val);
    if (i === 0) {
      if (val >= mapLoFn(ary[0], 0) &&
          val <= mapHiFn(ary[0], 0)) {
        return 0;
      } else {
        return -1;
    }
    } else if (i < ary.length) {
      if (val >= mapLoFn(ary[i - 1], i - 1) &&
          val <= mapHiFn(ary[i - 1], i - 1)) {
        return i - 1;
      } else if (val >= mapLoFn(ary[i], i) &&
          val <= mapHiFn(ary[i], i)) {
        return i;
      } else {
        return ary.length;
      }
    } else if (i == ary.length) {
      if (val >= mapLoFn(ary[i - 1], i - 1) &&
          val <= mapHiFn(ary[i - 1], i - 1)) {
        return i - 1;
      } else {
        return ary.length;
      }
    } else {
      return ary.length;
    }
  }

  /**
   * Calls cb for all intervals in the implicit array of intervals
   * defnied by ary, mapLoFn and mapHiFn that intersect the range
   * [loVal,hiVal)
   *
   * This function uses the same scheme as findLowIndexInSortedArray
   * to define the intervals. The same restrictions on sortedness and
   * non-overlappingness apply.
   *
   * @param {Array} ary An array of objects that can be converted into sorted
   * nonoverlapping ranges [x,y) using the mapLoFn and mapWidth.
   * @param {function():*} mapLoFn Callback that produces the low value for the
   * interval represented by an element in the array.
   * @param {function():*} mapWidthFn Callback that produces the width for the
   * interval represented by an element in the array.
   * @param {number} loVal The low value for the search, inclusive.
   * @param {number} hiVal The high value for the search, non inclusive.
   * @param {function():*} cb The function to run for intersecting intervals.
   */
  function iterateOverIntersectingIntervals(ary, mapLoFn, mapWidthFn, loVal,
                                            hiVal, cb) {
    if (ary.length == 0)
      return;

    if (loVal > hiVal) return;

    var i = findLowIndexInSortedArray(ary, mapLoFn, loVal);
    if (i == -1) {
      return;
    }
    if (i > 0) {
      var hi = mapLoFn(ary[i - 1]) + mapWidthFn(ary[i - 1], i - 1);
      if (hi >= loVal) {
        cb(ary[i - 1], i - 1);
      }
    }
    if (i == ary.length) {
      return;
    }

    for (var n = ary.length; i < n; i++) {
      var lo = mapLoFn(ary[i]);
      if (lo >= hiVal)
        break;
      cb(ary[i], i);
    }
  }

  /**
   * Non iterative version of iterateOverIntersectingIntervals.
   *
   * @return {Array} Array of elements in ary that intersect loVal, hiVal.
   */
  function getIntersectingIntervals(ary, mapLoFn, mapWidthFn, loVal, hiVal) {
    var tmp = [];
    iterateOverIntersectingIntervals(ary, mapLoFn, mapWidthFn, loVal, hiVal,
                                     function(d) {
                                       tmp.push(d);
                                     });
    return tmp;
  }

  /**
   * Finds the element in the array whose value is closest to |val|.
   *
   * The same restrictions on sortedness as for findLowIndexInSortedArray apply.
   *
   * @param {Array} ary An array of arbitrary objects.
   * @param {function():*} mapFn Callback that produces a key value
   *     from an element in ary.
   * @param {number} val Value for which to search.
   * @param {number} maxDiff Maximum allowed difference in value between |val|
   *     and an element's value.
   * @return {object} Object in the array whose value is closest to |val|, or
   *     null if no object is within range.
   */
  function findClosestElementInSortedArray(ary, mapFn, val, maxDiff) {
    if (ary.length === 0)
      return null;

    var aftIdx = findLowIndexInSortedArray(ary, mapFn, val);
    var befIdx = aftIdx > 0 ? aftIdx - 1 : 0;

    if (aftIdx === ary.length)
      aftIdx -= 1;

    var befDiff = Math.abs(val - mapFn(ary[befIdx]));
    var aftDiff = Math.abs(val - mapFn(ary[aftIdx]));

    if (befDiff > maxDiff && aftDiff > maxDiff)
      return null;

    var idx = befDiff < aftDiff ? befIdx : aftIdx;
    return ary[idx];
  }

  /**
   * Finds the closest interval in the implicit array of intervals
   * defined by ary, mapLoFn and mapHiFn.
   *
   * This function uses the same scheme as findLowIndexInSortedArray
   * to define the intervals. The same restrictions on sortedness and
   * non-overlappingness apply.
   *
   * @param {Array} ary An array of objects that can be converted into sorted
   *     nonoverlapping ranges [x,y) using the mapLoFn and mapHiFn.
   * @param {function():*} mapLoFn Callback that produces the low value for the
   *     interval represented by an element in the array.
   * @param {function():*} mapHiFn Callback that produces the high for the
   *     interval represented by an element in the array.
   * @param {number} val The value for the search.
   * @param {number} maxDiff Maximum allowed difference in value between |val|
   *     and an interval's low or high value.
   * @return {interval} Interval in the array whose high or low value is closest
   *     to |val|, or null if no interval is within range.
   */
  function findClosestIntervalInSortedIntervals(ary, mapLoFn, mapHiFn, val,
                                                maxDiff) {
    if (ary.length === 0)
      return null;

    var idx = findLowIndexInSortedArray(ary, mapLoFn, val);
    if (idx > 0)
      idx -= 1;

    var hiInt = ary[idx];
    var loInt = hiInt;

    if (val > mapHiFn(hiInt) && idx + 1 < ary.length)
      loInt = ary[idx + 1];

    var loDiff = Math.abs(val - mapLoFn(loInt));
    var hiDiff = Math.abs(val - mapHiFn(hiInt));

    if (loDiff > maxDiff && hiDiff > maxDiff)
      return null;

    if (loDiff < hiDiff)
      return loInt;
    else
      return hiInt;
  }

  return {
    findLowIndexInSortedArray: findLowIndexInSortedArray,
    findHighIndexInSortedArray: findHighIndexInSortedArray,
    findIndexInSortedIntervals: findIndexInSortedIntervals,
    findIndexInSortedClosedIntervals: findIndexInSortedClosedIntervals,
    iterateOverIntersectingIntervals: iterateOverIntersectingIntervals,
    getIntersectingIntervals: getIntersectingIntervals,
    findClosestElementInSortedArray: findClosestElementInSortedArray,
    findClosestIntervalInSortedIntervals: findClosestIntervalInSortedIntervals
  };
});
'use strict';

tr.exportTo('tr.model', function() {

  /**
   * The value of a given measurement at a given time.
   *
   * As an example, if we're measuring the throughput of data sent over a USB
   * connection, each counter sample might represent the instantaneous
   * throughput of the connection at a given time.
   *
   * @constructor
   * @extends {Event}
   */
  function CounterSample(series, timestamp, value) {
    tr.model.Event.call(this);
    this.series_ = series;
    this.timestamp_ = timestamp;
    this.value_ = value;
  }

  CounterSample.groupByTimestamp = function(samples) {
    var samplesByTimestamp = tr.b.group(samples, function(sample) {
      return sample.timestamp;
    });

    var timestamps = tr.b.dictionaryKeys(samplesByTimestamp);
    timestamps.sort();
    var groups = [];
    for (var i = 0; i < timestamps.length; i++) {
      var ts = timestamps[i];
      var group = samplesByTimestamp[ts];
      group.sort(function(x, y) {
        return x.series.seriesIndex - y.series.seriesIndex;
      });
      groups.push(group);
    }
    return groups;
  }

  CounterSample.prototype = {
    __proto__: tr.model.Event.prototype,

    get series() {
      return this.series_;
    },

    get timestamp() {
      return this.timestamp_;
    },

    get value() {
      return this.value_;
    },

    set timestamp(timestamp) {
      this.timestamp_ = timestamp;
    },

    addBoundsToRange: function(range) {
      range.addValue(this.timestamp);
    },

    getSampleIndex: function() {
      return tr.b.findLowIndexInSortedArray(
          this.series.timestamps,
          function(x) { return x; },
          this.timestamp_);
    },

    get userFriendlyName() {
      return 'Counter sample from ' + this.series_.title + ' at ' +
          tr.b.u.TimeStamp.format(this.timestamp);
    }
  };


  tr.model.EventRegistry.register(
      CounterSample,
      {
        name: 'counterSample',
        pluralName: 'counterSamples',
        singleViewElementName: 'tr-ui-a-counter-sample-sub-view',
        multiViewElementName: 'tr-ui-a-counter-sample-sub-view'
      });

  return {
    CounterSample: CounterSample
  };
});
'use strict';

tr.exportTo('tr.model', function() {
  var CounterSample = tr.model.CounterSample;

  /**
   * A container holding all samples of a given measurement over time.
   *
   * As an example, a counter series might measure the throughput of data sent
   * over a USB connection, with each sample representing the instantaneous
   * throughput of the connection.
   *
   * @constructor
   * @extends {EventContainer}
   */
  function CounterSeries(name, color) {
    tr.model.EventContainer.call(this);

    this.name_ = name;
    this.color_ = color;

    this.timestamps_ = [];
    this.samples_ = [];

    // Set by counter.addSeries
    this.counter = undefined;
    this.seriesIndex = undefined;
  }

  CounterSeries.prototype = {
    __proto__: tr.model.EventContainer.prototype,

    get length() {
      return this.timestamps_.length;
    },

    get name() {
      return this.name_;
    },

    get color() {
      return this.color_;
    },

    get samples() {
      return this.samples_;
    },

    get timestamps() {
      return this.timestamps_;
    },

    getSample: function(idx) {
      return this.samples_[idx];
    },

    getTimestamp: function(idx) {
      return this.timestamps_[idx];
    },

    addCounterSample: function(ts, val) {
      var sample = new CounterSample(this, ts, val);
      this.addSample(sample);
      return sample;
    },

    addSample: function(sample) {
      this.timestamps_.push(sample.timestamp);
      this.samples_.push(sample);
    },

    getStatistics: function(sampleIndices) {
      var sum = 0;
      var min = Number.MAX_VALUE;
      var max = -Number.MAX_VALUE;

      for (var i = 0; i < sampleIndices.length; ++i) {
        var sample = this.getSample(sampleIndices[i]).value;

        sum += sample;
        min = Math.min(sample, min);
        max = Math.max(sample, max);
      }

      return {
        min: min,
        max: max,
        avg: (sum / sampleIndices.length),
        start: this.getSample(sampleIndices[0]).value,
        end: this.getSample(sampleIndices.length - 1).value
      };
    },

    shiftTimestampsForward: function(amount) {
      for (var i = 0; i < this.timestamps_.length; ++i) {
        this.timestamps_[i] += amount;
        this.samples_[i].timestamp = this.timestamps_[i];
      }
    },

    iterateAllEventsInThisContainer: function(eventTypePredicate,
                                              callback, opt_this) {
      if (eventTypePredicate.call(opt_this, tr.model.CounterSample)) {
        this.samples_.forEach(callback, opt_this);
      }
    },

    iterateAllChildEventContainers: function(callback, opt_this) {
    }
  };

  return {
    CounterSeries: CounterSeries
  };
});
'use strict';

tr.exportTo('tr.model', function() {

  /**
   * A container holding all series of a given type of measurement.
   *
   * As an example, if we're measuring the throughput of data sent over several
   * USB connections, the throughput of each cable might be added as a separate
   * series to a single counter.
   *
   * @constructor
   * @extends {EventContainer}
   */
  function Counter(parent, id, category, name) {
    tr.model.EventContainer.call(this);

    this.parent_ = parent;
    this.id_ = id;
    this.category_ = category || '';
    this.name_ = name;

    this.series_ = [];
    this.totals = [];
  }

  Counter.prototype = {
    __proto__: tr.model.EventContainer.prototype,

    get parent() {
      return this.parent_;
    },

    get id() {
      return this.id_;
    },

    get category() {
      return this.category_;
    },

    get name() {
      return this.name_;
    },

    iterateAllEventsInThisContainer: function(eventTypePredicate,
                                              callback, opt_this) {
    },

    iterateAllChildEventContainers: function(callback, opt_this) {
      for (var i = 0; i < this.series_.length; i++)
        callback.call(opt_this, this.series_[i]);
    },

    set timestamps(arg) {
      throw new Error('Bad counter API. No cookie.');
    },

    set seriesNames(arg) {
      throw new Error('Bad counter API. No cookie.');
    },

    set seriesColors(arg) {
      throw new Error('Bad counter API. No cookie.');
    },

    set samples(arg) {
      throw new Error('Bad counter API. No cookie.');
    },

    addSeries: function(series) {
      series.counter = this;
      series.seriesIndex = this.series_.length;
      this.series_.push(series);
      return series;
    },

    getSeries: function(idx) {
      return this.series_[idx];
    },

    get series() {
      return this.series_;
    },

    get numSeries() {
      return this.series_.length;
    },

    get numSamples() {
      if (this.series_.length === 0)
        return 0;
      return this.series_[0].length;
    },

    get timestamps() {
      if (this.series_.length === 0)
        return [];
      return this.series_[0].timestamps;
    },

    /**
     * Obtains min, max, avg, values, start, and end for different series for
     * a given counter
     *     getSampleStatistics([0,1])
     * The statistics objects that this returns are an array of objects, one
     * object for each series for the counter in the form:
     * {min: minVal, max: maxVal, avg: avgVal, start: startVal, end: endVal}
     *
     * @param {Array.<Number>} Indices to summarize.
     * @return {Object} An array of statistics. Each element in the array
     * has data for one of the series in the selected counter.
     */
    getSampleStatistics: function(sampleIndices) {
      sampleIndices.sort();

      var ret = [];
      this.series_.forEach(function(series) {
        ret.push(series.getStatistics(sampleIndices));
      });
      return ret;
    },

    /**
     * Shifts all the timestamps inside this counter forward by the amount
     * specified.
     */
    shiftTimestampsForward: function(amount) {
      for (var i = 0; i < this.series_.length; ++i)
        this.series_[i].shiftTimestampsForward(amount);
    },

    /**
     * Updates the bounds for this counter based on the samples it contains.
     */
    updateBounds: function() {
      this.totals = [];
      this.maxTotal = 0;
      this.bounds.reset();

      if (this.series_.length === 0)
        return;

      var firstSeries = this.series_[0];
      var lastSeries = this.series_[this.series_.length - 1];

      this.bounds.addValue(firstSeries.getTimestamp(0));
      this.bounds.addValue(lastSeries.getTimestamp(lastSeries.length - 1));

      var numSeries = this.numSeries;
      this.maxTotal = -Infinity;

      // Sum the samples at each timestamp.
      // Note, this assumes that all series have all timestamps.
      for (var i = 0; i < firstSeries.length; ++i) {
        var total = 0;
        this.series_.forEach(function(series) {
          total += series.getSample(i).value;
          this.totals.push(total);
        }.bind(this));

        this.maxTotal = Math.max(total, this.maxTotal);
      }
    }
  };

  /**
   * Comparison between counters that orders by parent.compareTo, then name.
   */
  Counter.compare = function(x, y) {
    var tmp = x.parent.compareTo(y);
    if (tmp != 0)
      return tmp;
    var tmp = x.name.localeCompare(y.name);
    if (tmp == 0)
      return x.tid - y.tid;
    return tmp;
  };

  return {
    Counter: Counter
  };
});
'use strict';

/**
 * @fileoverview Provides the Slice class.
 */
tr.exportTo('tr.model', function() {
  /**
   * A Slice represents an interval of time plus parameters associated
   * with that interval.
   *
   * @constructor
   */
  function Slice(category, title, colorId, start, args, opt_duration,
                 opt_cpuStart, opt_cpuDuration, opt_argsStripped,
                 opt_bind_id) {
    tr.model.TimedEvent.call(this, start);

    this.category = category || '';
    this.title = title;
    this.colorId = colorId;
    this.args = args;
    this.startStackFrame = undefined;
    this.endStackFrame = undefined;
    this.didNotFinish = false;
    this.inFlowEvents = [];
    this.outFlowEvents = [];
    this.subSlices = [];
    this.selfTime = undefined;
    this.cpuSelfTime = undefined;
    this.important = false;
    this.parentContainer = undefined;
    this.argsStripped = false;

    this.bind_id_ = opt_bind_id;

    // parentSlice and isTopLevel will be set by SliceGroup.
    this.parentSlice = undefined;
    this.isTopLevel = false;
    // After SliceGroup processes Slices, isTopLevel should be equivalent to
    // !parentSlice.

    if (opt_duration !== undefined)
      this.duration = opt_duration;

    if (opt_cpuStart !== undefined)
      this.cpuStart = opt_cpuStart;

    if (opt_cpuDuration !== undefined)
      this.cpuDuration = opt_cpuDuration;

    if (opt_argsStripped !== undefined)
      this.argsStripped = true;
  }

  Slice.prototype = {
    __proto__: tr.model.TimedEvent.prototype,


    get analysisTypeName() {
      return this.title;
    },

    get userFriendlyName() {
      return 'Slice ' + this.title + ' at ' +
          tr.b.u.TimeStamp.format(this.start);
    },

    get stableId() {
      var parentSliceGroup = this.parentContainer.sliceGroup;
      return parentSliceGroup.stableId + '.' +
          parentSliceGroup.slices.indexOf(this);
    },

    findDescendentSlice: function(targetTitle) {
      if (!this.subSlices)
        return undefined;

      for (var i = 0; i < this.subSlices.length; i++) {
        if (this.subSlices[i].title == targetTitle)
          return this.subSlices[i];
        var slice = this.subSlices[i].findDescendentSlice(targetTitle);
        if (slice) return slice;
      }
      return undefined;
    },

    get mostTopLevelSlice() {
      var curSlice = this;
      while (curSlice.parentSlice)
        curSlice = curSlice.parentSlice;

      return curSlice;
    },

    /**
     * Obtains all subsequent slices of this slice.
     *
     * Subsequent slices are slices that get executed after a particular
     * slice, i.e., all the functions that are called after the current one.
     *
     * For instance, E.iterateAllSubsequentSlices() in the following example:
     * [     A          ]
     * [ B][  D   ][ G  ]
     *  [C] [E][F]  [H]
     * will pass F, G, then H to the provided callback.
     *
     * The reason we need subsequent slices of a particular slice is that
     * when there is flow event goes into, e.g., E, we only want to highlight
     * E's subsequent slices to indicate the execution order.
     *
     * The idea to calculate the subsequent slices of slice E is to view
     * the slice group as a tree where the top-level slice A is the root node.
     * The preorder depth-first-search (DFS) order is naturally equivalent
     * to the function call order. We just need to perform a DFS, and start
     * recording the slices after we see the occurance of E.
     */
    iterateAllSubsequentSlices: function(callback, opt_this) {
      var parentStack = [];
      var started = false;

      // get the root node and push it to the DFS stack
      var topmostSlice = this.mostTopLevelSlice;
      parentStack.push(topmostSlice);

      // Using the stack to perform DFS
      while (parentStack.length !== 0) {
        var curSlice = parentStack.pop();

        if (started)
          callback.call(opt_this, curSlice);
        else
          started = (curSlice.guid === this.guid);

        for (var i = curSlice.subSlices.length - 1; i >= 0; i--) {
          parentStack.push(curSlice.subSlices[i]);
        }
      }
    },

    get subsequentSlices() {
      var res = [];

      this.iterateAllSubsequentSlices(function(subseqSlice) {
        res.push(subseqSlice);
      });

      return res;
    },

    /**
     * Obtains the parents of a slice, from the most immediate to the root.
     *
     * For instance, E.iterateAllAncestors() in the following example:
     * [     A          ]
     * [ B][  D   ][ G  ]
     *  [C] [E][F]  [H]
     * will pass D, then A to the provided callback, in the order from the
     * leaves to the root.
     */
    iterateAllAncestors: function(callback, opt_this) {
      var curSlice = this;

      while (curSlice.parentSlice) {
        curSlice = curSlice.parentSlice;
        callback.call(opt_this, curSlice);
      }
    },

    get ancestorSlices() {
      var res = [];

      this.iterateAllAncestors(function(ancestor) {
        res.push(ancestor);
      });

      return res;
    },

    iterateEntireHierarchy: function(callback, opt_this) {
      var mostTopLevelSlice = this.mostTopLevelSlice;
      callback.call(opt_this, mostTopLevelSlice);
      mostTopLevelSlice.iterateAllSubsequentSlices(callback, opt_this);
    },

    get entireHierarchy() {
      var res = [];

      this.iterateEntireHierarchy(function(slice) {
        res.push(slice);
      });

      return res;
    },

    /**
     * Returns this slice, and its ancestor and subsequent slices.
     *
     * For instance, E.ancestorAndSubsequentSlices in the following example:
     * [     A          ]
     * [ B][  D   ][ G  ]
     *  [C] [E][F]  [H]
     * will return E, D, A, F, G, and H, where E is itself, D and A are
     * E's ancestors, and F, G, and H are subsequent slices of E
     */
    get ancestorAndSubsequentSlices() {
      var res = [];

      res.push(this);

      this.iterateAllAncestors(function(aSlice) {
        res.push(aSlice);
      });

      this.iterateAllSubsequentSlices(function(sSlice) {
        res.push(sSlice);
      });

      return res;
    },

    iterateAllDescendents: function(callback, opt_this) {
      this.subSlices.forEach(callback, opt_this);
      this.subSlices.forEach(function(subSlice) {
        subSlice.iterateAllDescendents(callback, opt_this);
      }, opt_this);
    },

    get descendentSlices() {
      var res = [];

      this.iterateAllDescendents(function(des) {
        res.push(des);
      });

      return res;
    }

  };

  return {
    Slice: Slice
  };
});
'use strict';

tr.exportTo('tr.model', function() {
  var Slice = tr.model.Slice;


  var SCHEDULING_STATE = {
    DEBUG: 'Debug',
    EXIT_DEAD: 'Exit Dead',
    RUNNABLE: 'Runnable',
    RUNNING: 'Running',
    SLEEPING: 'Sleeping',
    STOPPED: 'Stopped',
    TASK_DEAD: 'Task Dead',
    UNINTR_SLEEP: 'Uninterruptible Sleep',
    UNINTR_SLEEP_WAKE_KILL: 'Uninterruptible Sleep | WakeKill',
    UNINTR_SLEEP_WAKING: 'Uninterruptible Sleep | Waking',
    UNKNOWN: 'UNKNOWN',
    WAKE_KILL: 'Wakekill',
    WAKING: 'Waking',
    ZOMBIE: 'Zombie'
  };

  /**
   * A ThreadTimeSlice is a slice of time on a specific thread where that thread
   * was running on a specific CPU, or in a specific sleep state.
   *
   * As a thread switches moves through its life, it sometimes goes to sleep and
   * can't run. Other times, its runnable but isn't actually assigned to a CPU.
   * Finally, sometimes it gets put on a CPU to actually execute. Each of these
   * states is represented by a ThreadTimeSlice:
   *
   *   Sleeping or runnable: cpuOnWhichThreadWasRunning is undefined
   *   Running:  cpuOnWhichThreadWasRunning is set.
   *
   * @constructor
   */
  function ThreadTimeSlice(thread, schedulingState, cat,
                           start, args, opt_duration) {
    Slice.call(this, cat, schedulingState,
               this.getColorForState_(schedulingState),
        start, args, opt_duration);
    this.thread = thread;
    this.schedulingState = schedulingState;
    this.cpuOnWhichThreadWasRunning = undefined;
  }

  ThreadTimeSlice.prototype = {
    __proto__: Slice.prototype,

    getColorForState_: function(state) {
      var getColorIdForReservedName = tr.ui.b.getColorIdForReservedName;
      switch (state) {
        case SCHEDULING_STATE.RUNNABLE:
          return getColorIdForReservedName('thread_state_runnable');
        case SCHEDULING_STATE.RUNNING:
          return getColorIdForReservedName('thread_state_running');
        case SCHEDULING_STATE.SLEEPING:
          return getColorIdForReservedName('thread_state_sleeping');
        case SCHEDULING_STATE.DEBUG:
        case SCHEDULING_STATE.EXIT_DEAD:
        case SCHEDULING_STATE.STOPPED:
        case SCHEDULING_STATE.TASK_DEAD:
        case SCHEDULING_STATE.UNINTR_SLEEP:
        case SCHEDULING_STATE.UNINTR_SLEEP_WAKE_KILL:
        case SCHEDULING_STATE.UNINTR_SLEEP_WAKING:
        case SCHEDULING_STATE.UNKNOWN:
        case SCHEDULING_STATE.WAKE_KILL:
        case SCHEDULING_STATE.WAKING:
        case SCHEDULING_STATE.ZOMBIE:
          return getColorIdForReservedName('thread_state_iowait');
        default:
          return getColorIdForReservedName('thread_state_unknown');
      }
    },

    get analysisTypeName() {
      return 'tr.ui.analysis.ThreadTimeSlice';
    },

    getAssociatedCpuSlice: function() {
      if (!this.cpuOnWhichThreadWasRunning)
        return undefined;
      var cpuSlices = this.cpuOnWhichThreadWasRunning.slices;
      for (var i = 0; i < cpuSlices.length; i++) {
        var cpuSlice = cpuSlices[i];
        if (cpuSlice.start !== this.start)
          continue;
        if (cpuSlice.duration !== this.duration)
          continue;
        return cpuSlice;
      }
      return undefined;
    },

    getCpuSliceThatTookCpu: function() {
      if (this.cpuOnWhichThreadWasRunning)
        return undefined;
      var curIndex = this.thread.indexOfTimeSlice(this);
      var cpuSliceWhenLastRunning;
      while (curIndex >= 0) {
        var curSlice = this.thread.timeSlices[curIndex];
        if (!curSlice.cpuOnWhichThreadWasRunning) {
          curIndex--;
          continue;
        }
        cpuSliceWhenLastRunning = curSlice.getAssociatedCpuSlice();
        break;
      }
      if (!cpuSliceWhenLastRunning)
        return undefined;

      var cpu = cpuSliceWhenLastRunning.cpu;
      var indexOfSliceOnCpuWhenLastRunning =
          cpu.indexOf(cpuSliceWhenLastRunning);
      var nextRunningSlice = cpu.slices[indexOfSliceOnCpuWhenLastRunning + 1];
      if (!nextRunningSlice)
        return undefined;
      if (Math.abs(nextRunningSlice.start - cpuSliceWhenLastRunning.end) <
          0.00001)
        return nextRunningSlice;
      return undefined;
    }
  };

  tr.model.EventRegistry.register(
      ThreadTimeSlice,
      {
        name: 'threadTimeSlice',
        pluralName: 'threadTimeSlices',
        singleViewElementName: 'tr-ui-a-single-thread-time-slice-sub-view',
        multiViewElementName: 'tr-ui-a-multi-thread-time-slice-sub-view'
      });


  return {
    ThreadTimeSlice: ThreadTimeSlice,
    SCHEDULING_STATE: SCHEDULING_STATE
  };
});
'use strict';

/**
 * @fileoverview Provides the CpuSlice class.
 */
tr.exportTo('tr.model', function() {

  var Slice = tr.model.Slice;

  /**
   * A CpuSlice represents a slice of time on a CPU.
   *
   * @constructor
   */
  function CpuSlice(cat, title, colorId, start, args, opt_duration) {
    Slice.apply(this, arguments);
    this.threadThatWasRunning = undefined;
    this.cpu = undefined;
  }

  CpuSlice.prototype = {
    __proto__: Slice.prototype,

    get analysisTypeName() {
      return 'tr.ui.analysis.CpuSlice';
    },

    getAssociatedTimeslice: function() {
      if (!this.threadThatWasRunning)
        return undefined;
      var timeSlices = this.threadThatWasRunning.timeSlices;
      for (var i = 0; i < timeSlices.length; i++) {
        var timeSlice = timeSlices[i];
        if (timeSlice.start !== this.start)
          continue;
        if (timeSlice.duration !== this.duration)
          continue;
        return timeSlice;
      }
      return undefined;
    }
  };

  tr.model.EventRegistry.register(
      CpuSlice,
      {
        name: 'cpuSlice',
        pluralName: 'cpuSlices',
        singleViewElementName: 'tr-ui-a-single-cpu-slice-sub-view',
        multiViewElementName: 'tr-ui-a-multi-cpu-slice-sub-view'
      });

  return {
    CpuSlice: CpuSlice
  };
});
'use strict';

/**
 * @fileoverview Provides the Cpu class.
 */
tr.exportTo('tr.model', function() {

  var Counter = tr.model.Counter;
  var Slice = tr.model.Slice;
  var CpuSlice = tr.model.CpuSlice;

  /**
   * The Cpu represents a Cpu from the kernel's point of view.
   * @constructor
   */
  function Cpu(kernel, number) {
    if (kernel === undefined || number === undefined)
      throw new Error('Missing arguments');
    this.kernel = kernel;
    this.cpuNumber = number;
    this.slices = [];
    this.counters = {};
    this.bounds = new tr.b.Range();
    this.samples_ = undefined; // Set during createSubSlices

    // Start timestamp of the last active thread.
    this.lastActiveTimestamp_ = undefined;

    // Identifier of the last active thread. On Linux, it's a pid while on
    // Windows it's a thread id.
    this.lastActiveThread_ = undefined;

    // Name and arguments of the last active thread.
    this.lastActiveName_ = undefined;
    this.lastActiveArgs_ = undefined;
  };

  Cpu.prototype = {
    get samples() {
      return this.samples_;
    },

    get userFriendlyName() {
      return 'CPU ' + this.cpuNumber;
    },

    iterateAllEventsInThisContainer: function(eventTypePredicate,
                                              callback, opt_this) {
      if (eventTypePredicate.call(opt_this, tr.model.CpuSlice))
        this.slices.forEach(callback, opt_this);

      if (this.samples_) {
        if (eventTypePredicate.call(opt_this, tr.model.Sample))
          this.samples_.forEach(callback, opt_this);
      }
    },

    iterateAllChildEventContainers: function(callback, opt_this) {
      for (var id in this.counters)
        callback.call(opt_this, this.counters[id]);
    },

    /**
     * @return {Counter} The counter on this CPU with the given category/name
     * combination, creating it if it doesn't exist.
     */
    getOrCreateCounter: function(cat, name) {
      var id = cat + '.' + name;
      if (!this.counters[id])
        this.counters[id] = new Counter(this, id, cat, name);
      return this.counters[id];
    },

    /**
     * @return {Counter} the counter on this CPU with the given category/name
     * combination, or undefined if it doesn't exist.
     */
    getCounter: function(cat, name) {
      var id = cat + '.' + name;
      if (!this.counters[id])
        return undefined;
      return this.counters[id];
    },

    /**
     * Shifts all the timestamps inside this CPU forward by the amount
     * specified.
     */
    shiftTimestampsForward: function(amount) {
      for (var sI = 0; sI < this.slices.length; sI++)
        this.slices[sI].start = (this.slices[sI].start + amount);
      for (var id in this.counters)
        this.counters[id].shiftTimestampsForward(amount);
    },

    /**
     * Updates the range based on the current slices attached to the cpu.
     */
    updateBounds: function() {
      this.bounds.reset();
      if (this.slices.length) {
        this.bounds.addValue(this.slices[0].start);
        this.bounds.addValue(this.slices[this.slices.length - 1].end);
      }
      for (var id in this.counters) {
        this.counters[id].updateBounds();
        this.bounds.addRange(this.counters[id].bounds);
      }
      if (this.samples_ && this.samples_.length) {
        this.bounds.addValue(this.samples_[0].start);
        this.bounds.addValue(
            this.samples_[this.samples_.length - 1].end);
      }
    },

    createSubSlices: function() {
      this.samples_ = this.kernel.model.samples.filter(function(sample) {
        return sample.cpu == this;
      }, this);
    },

    addCategoriesToDict: function(categoriesDict) {
      for (var i = 0; i < this.slices.length; i++)
        categoriesDict[this.slices[i].category] = true;
      for (var id in this.counters)
        categoriesDict[this.counters[id].category] = true;
      for (var i = 0; i < this.samples_.length; i++)
        categoriesDict[this.samples_[i].category] = true;
    },



    /*
     * Returns the index of the slice in the CPU's slices, or undefined.
     */
    indexOf: function(cpuSlice) {
      var i = tr.b.findLowIndexInSortedArray(
          this.slices,
          function(slice) { return slice.start; },
          cpuSlice.start);
      if (this.slices[i] !== cpuSlice)
        return undefined;
      return i;
    },

    /**
     * Closes the thread running on the CPU. |end_timestamp| is the timestamp
     * at which the thread was unscheduled. |args| is merged with the arguments
     * specified when the thread was initially scheduled.
     */
    closeActiveThread: function(end_timestamp, args) {
      // Don't generate a slice if the last active thread is the idle task.
      if (this.lastActiveThread_ == undefined || this.lastActiveThread_ == 0)
        return;

      if (end_timestamp < this.lastActiveTimestamp_) {
        throw new Error('The end timestamp of a thread running on CPU ' +
                        this.cpuNumber + ' is before its start timestamp.');
      }

      // Merge |args| with |this.lastActiveArgs_|. If a key is in both
      // dictionaries, the value from |args| is used.
      for (var key in args) {
        this.lastActiveArgs_[key] = args[key];
      }

      var duration = end_timestamp - this.lastActiveTimestamp_;
      var slice = new tr.model.CpuSlice(
          '', this.lastActiveName_,
          tr.ui.b.getColorIdForGeneralPurposeString(this.lastActiveName_),
          this.lastActiveTimestamp_,
          this.lastActiveArgs_,
          duration);
      slice.cpu = this;
      this.slices.push(slice);

      // Clear the last state.
      this.lastActiveTimestamp_ = undefined;
      this.lastActiveThread_ = undefined;
      this.lastActiveName_ = undefined;
      this.lastActiveArgs_ = undefined;
    },

    switchActiveThread: function(timestamp, old_thread_args, new_thread_id,
                                 new_thread_name, new_thread_args) {
      // Close the previous active thread and generate a slice.
      this.closeActiveThread(timestamp, old_thread_args);

      // Keep track of the new thread.
      this.lastActiveTimestamp_ = timestamp;
      this.lastActiveThread_ = new_thread_id;
      this.lastActiveName_ = new_thread_name;
      this.lastActiveArgs_ = new_thread_args;
    },

    /**
     * Returns the frequency statistics for this CPU;
     * the returned object contains the frequencies as keys,
     * and the duration at this frequency in milliseconds as the value,
     * for the range that was specified.
     */
    getFreqStatsForRange: function(range) {
      var stats = {};

      function addStatsForFreq(freqSample, index) {
        // Counters don't have an explicit end or duration;
        // calculate the end by looking at the starting point
        // of the next value in the series, or if that doesn't
        // exist, assume this frequency is held until the end.
        var freqEnd = (index < freqSample.series_.length - 1) ?
            freqSample.series_.samples_[index + 1].timestamp : range.max;

        var freqRange = tr.b.Range.fromExplicitRange(freqSample.timestamp,
            freqEnd);
        var intersection = freqRange.findIntersection(range);
        if (!(freqSample.value in stats))
          stats[freqSample.value] = 0;
        stats[freqSample.value] += intersection.duration;
      }

      var freqCounter = this.getCounter('', 'Clock Frequency');
      if (freqCounter !== undefined) {
        var freqSeries = freqCounter.getSeries(0);
        if (!freqSeries)
          return;

        tr.b.iterateOverIntersectingIntervals(freqSeries.samples_,
            function(x) { return x.timestamp; },
            function(x, index) { return index < freqSeries.length - 1 ?
                                     freqSeries.samples_[index + 1].timestamp :
                                     range.max; },
            range.min,
            range.max,
            addStatsForFreq);
      }

      return stats;
    }
  };

  /**
   * Comparison between processes that orders by cpuNumber.
   */
  Cpu.compare = function(x, y) {
    return x.cpuNumber - y.cpuNumber;
  };


  return {
    Cpu: Cpu
  };
});
'use strict';

tr.exportTo('tr.model', function() {
  /**
   * A snapshot of an object instance, at a given moment in time.
   *
   * Initialization of snapshots and instances is three phased:
   *
   * 1. Instances and snapshots are constructed. This happens during event
   *    importing. Little should be done here, because the object's data
   *    are still being used by the importer to reconstruct object references.
   *
   * 2. Instances and snapshtos are preinitialized. This happens after implicit
   *    objects have been found, but before any references have been found and
   *    switched to direct references. Thus, every snapshot stands on its own.
   *    This is a good time to do global field renaming and type conversion,
   *    e.g. recognizing domain-specific types and converting from C++ naming
   *    convention to JS.
   *
   * 3. Instances and snapshtos are initialized. At this point, {id_ref:
   *    '0x1000'} fields have been converted to snapshot references. This is a
   *    good time to generic initialization steps and argument verification.
   *
   * @constructor
   */
  function ObjectSnapshot(objectInstance, ts, args) {
    tr.model.Event.call(this);
    this.objectInstance = objectInstance;
    this.ts = ts;
    this.args = args;
  }

  ObjectSnapshot.prototype = {
    __proto__: tr.model.Event.prototype,

    /**
     * See ObjectSnapshot constructor notes on object initialization.
     */
    preInitialize: function() {
    },

    /**
     * See ObjectSnapshot constructor notes on object initialization.
     */
    initialize: function() {
    },

    addBoundsToRange: function(range) {
      range.addValue(this.ts);
    },

    get userFriendlyName() {
      return 'Snapshot of ' +
             this.objectInstance.typeName + ' ' +
             this.objectInstance.id + ' @ ' +
             tr.b.u.TimeStamp.format(this.ts);
    }
  };

  tr.model.EventRegistry.register(
      ObjectSnapshot,
      {
        name: 'objectSnapshot',
        pluralName: 'objectSnapshots',
        singleViewElementName: 'tr-ui-a-single-object-snapshot-sub-view',
        multiViewElementName: 'tr-ui-a-multi-object-sub-view'
      });

  var options = new tr.b.ExtensionRegistryOptions(
      tr.b.TYPE_BASED_REGISTRY_MODE);
  options.mandatoryBaseClass = ObjectSnapshot;
  options.defaultConstructor = ObjectSnapshot;
  tr.b.decorateExtensionRegistry(ObjectSnapshot, options);

  return {
    ObjectSnapshot: ObjectSnapshot
  };
});
'use strict';

/**
 * @fileoverview Provides the ObjectSnapshot and ObjectHistory classes.
 */
tr.exportTo('tr.model', function() {
  var ObjectSnapshot = tr.model.ObjectSnapshot;

  /**
   * An object with a specific id, whose state has been snapshotted several
   * times.
   *
   * @constructor
   */
  function ObjectInstance(
      parent, id, category, name, creationTs, opt_baseTypeName) {
    tr.model.Event.call(this);
    this.parent = parent;
    this.id = id;
    this.category = category;
    this.baseTypeName = opt_baseTypeName ? opt_baseTypeName : name;
    this.name = name;
    this.creationTs = creationTs;
    this.creationTsWasExplicit = false;
    this.deletionTs = Number.MAX_VALUE;
    this.deletionTsWasExplicit = false;
    this.colorId = 0;
    this.bounds = new tr.b.Range();
    this.snapshots = [];
    this.hasImplicitSnapshots = false;
  }

  ObjectInstance.prototype = {
    __proto__: tr.model.Event.prototype,

    get typeName() {
      return this.name;
    },

    addBoundsToRange: function(range) {
      range.addRange(this.bounds);
    },

    addSnapshot: function(ts, args, opt_name, opt_baseTypeName) {
      if (ts < this.creationTs)
        throw new Error('Snapshots must be >= instance.creationTs');
      if (ts >= this.deletionTs)
        throw new Error('Snapshots cannot be added after ' +
                        'an objects deletion timestamp.');

      var lastSnapshot;
      if (this.snapshots.length > 0) {
        lastSnapshot = this.snapshots[this.snapshots.length - 1];
        if (lastSnapshot.ts == ts)
          throw new Error('Snapshots already exists at this time!');
        if (ts < lastSnapshot.ts) {
          throw new Error(
              'Snapshots must be added in increasing timestamp order');
        }
      }

      // Update baseTypeName if needed.
      if (opt_name &&
          (this.name != opt_name)) {
        if (!opt_baseTypeName)
          throw new Error('Must provide base type name for name update');
        if (this.baseTypeName != opt_baseTypeName)
          throw new Error('Cannot update type name: base types dont match');
        this.name = opt_name;
      }

      var snapshotConstructor =
          tr.model.ObjectSnapshot.getConstructor(
              this.category, this.name);
      var snapshot = new snapshotConstructor(this, ts, args);
      this.snapshots.push(snapshot);
      return snapshot;
    },

    wasDeleted: function(ts) {
      var lastSnapshot;
      if (this.snapshots.length > 0) {
        lastSnapshot = this.snapshots[this.snapshots.length - 1];
        if (lastSnapshot.ts > ts)
          throw new Error(
              'Instance cannot be deleted at ts=' +
              ts + '. A snapshot exists that is older.');
      }
      this.deletionTs = ts;
      this.deletionTsWasExplicit = true;
    },

    /**
     * See ObjectSnapshot constructor notes on object initialization.
     */
    preInitialize: function() {
      for (var i = 0; i < this.snapshots.length; i++)
        this.snapshots[i].preInitialize();
    },

    /**
     * See ObjectSnapshot constructor notes on object initialization.
     */
    initialize: function() {
      for (var i = 0; i < this.snapshots.length; i++)
        this.snapshots[i].initialize();
    },

    getSnapshotAt: function(ts) {
      if (ts < this.creationTs) {
        if (this.creationTsWasExplicit)
          throw new Error('ts must be within lifetime of this instance');
        return this.snapshots[0];
      }
      if (ts > this.deletionTs)
        throw new Error('ts must be within lifetime of this instance');

      var snapshots = this.snapshots;
      var i = tr.b.findIndexInSortedIntervals(
          snapshots,
          function(snapshot) { return snapshot.ts; },
          function(snapshot, i) {
            if (i == snapshots.length - 1)
              return snapshots[i].objectInstance.deletionTs;
            return snapshots[i + 1].ts - snapshots[i].ts;
          },
          ts);
      if (i < 0) {
        // Note, this is a little bit sketchy: this lets early ts point at the
        // first snapshot, even before it is taken. We do this because raster
        // tasks usually post before their tile snapshots are dumped. This may
        // be a good line of code to re-visit if we start seeing strange and
        // confusing object references showing up in the traces.
        return this.snapshots[0];
      }
      if (i >= this.snapshots.length)
        return this.snapshots[this.snapshots.length - 1];
      return this.snapshots[i];
    },

    updateBounds: function() {
      this.bounds.reset();
      this.bounds.addValue(this.creationTs);
      if (this.deletionTs != Number.MAX_VALUE)
        this.bounds.addValue(this.deletionTs);
      else if (this.snapshots.length > 0)
        this.bounds.addValue(this.snapshots[this.snapshots.length - 1].ts);
    },

    shiftTimestampsForward: function(amount) {
      this.creationTs += amount;
      if (this.deletionTs != Number.MAX_VALUE)
        this.deletionTs += amount;
      this.snapshots.forEach(function(snapshot) {
        snapshot.ts += amount;
      });
    },

    get userFriendlyName() {
      return this.typeName + ' object ' + this.id;
    }
  };

  tr.model.EventRegistry.register(
    ObjectInstance,
    {
      name: 'objectInstance',
      pluralName: 'objectInstances',
      singleViewElementName: 'tr-ui-a-single-object-instance-sub-view',
      multiViewElementName: 'tr-ui-a-multi-object-sub-view'
    });

  var options = new tr.b.ExtensionRegistryOptions(
      tr.b.TYPE_BASED_REGISTRY_MODE);
  options.mandatoryBaseClass = ObjectInstance;
  options.defaultConstructor = ObjectInstance;
  tr.b.decorateExtensionRegistry(ObjectInstance, options);

  return {
    ObjectInstance: ObjectInstance
  };
});
'use strict';

/**
 * @fileoverview Provides the TimeToObjectInstanceMap class.
 */
tr.exportTo('tr.model', function() {
  /**
   * Tracks all the instances associated with a given ID over its lifetime.
   *
   * An id can be used multiple times throughout a trace, referring to different
   * objects at different times. This data structure does the bookkeeping to
   * figure out what ObjectInstance is referred to at a given timestamp.
   *
   * @constructor
   */
  function TimeToObjectInstanceMap(createObjectInstanceFunction, parent, id) {
    this.createObjectInstanceFunction_ = createObjectInstanceFunction;
    this.parent = parent;
    this.id = id;
    this.instances = [];
  }

  TimeToObjectInstanceMap.prototype = {
    idWasCreated: function(category, name, ts) {
      if (this.instances.length == 0) {
        this.instances.push(this.createObjectInstanceFunction_(
            this.parent, this.id, category, name, ts));
        this.instances[0].creationTsWasExplicit = true;
        return this.instances[0];
      }

      var lastInstance = this.instances[this.instances.length - 1];
      if (ts < lastInstance.deletionTs) {
        throw new Error('Mutation of the TimeToObjectInstanceMap must be ' +
                        'done in ascending timestamp order.');
      }
      lastInstance = this.createObjectInstanceFunction_(
          this.parent, this.id, category, name, ts);
      lastInstance.creationTsWasExplicit = true;
      this.instances.push(lastInstance);
      return lastInstance;
    },

    addSnapshot: function(category, name, ts, args, opt_baseTypeName) {
      if (this.instances.length == 0) {
        this.instances.push(this.createObjectInstanceFunction_(
            this.parent, this.id, category, name, ts, opt_baseTypeName));
      }

      var i = tr.b.findIndexInSortedIntervals(
          this.instances,
          function(inst) { return inst.creationTs; },
          function(inst) { return inst.deletionTs - inst.creationTs; },
          ts);

      var instance;
      if (i < 0) {
        instance = this.instances[0];
        if (ts > instance.deletionTs ||
            instance.creationTsWasExplicit) {
          throw new Error(
              'At the provided timestamp, no instance was still alive');
        }

        if (instance.snapshots.length != 0) {
          throw new Error(
              'Cannot shift creationTs forward, ' +
              'snapshots have been added. First snap was at ts=' +
              instance.snapshots[0].ts + ' and creationTs was ' +
              instance.creationTs);
        }
        instance.creationTs = ts;
      } else if (i >= this.instances.length) {
        instance = this.instances[this.instances.length - 1];
        if (ts >= instance.deletionTs) {
          // The snap is added after our oldest and deleted instance. This means
          // that this is a new implicit instance.
          instance = this.createObjectInstanceFunction_(
              this.parent, this.id, category, name, ts, opt_baseTypeName);
          this.instances.push(instance);
        } else {
          // If the ts is before the last objects deletion time, then the caller
          // is trying to add a snapshot when there may have been an instance
          // alive. In that case, try to move an instance's creationTs to
          // include this ts, provided that it has an implicit creationTs.

          // Search backward from the right for an instance that was definitely
          // deleted before this ts. Any time an instance is found that has a
          // moveable creationTs
          var lastValidIndex;
          for (var i = this.instances.length - 1; i >= 0; i--) {
            var tmp = this.instances[i];
            if (ts >= tmp.deletionTs)
              break;
            if (tmp.creationTsWasExplicit == false && tmp.snapshots.length == 0)
              lastValidIndex = i;
          }
          if (lastValidIndex === undefined) {
            throw new Error(
                'Cannot add snapshot. No instance was alive that was mutable.');
          }
          instance = this.instances[lastValidIndex];
          instance.creationTs = ts;
        }
      } else {
        instance = this.instances[i];
      }

      return instance.addSnapshot(ts, args, name, opt_baseTypeName);
    },

    get lastInstance() {
      if (this.instances.length == 0)
        return undefined;
      return this.instances[this.instances.length - 1];
    },

    idWasDeleted: function(category, name, ts) {
      if (this.instances.length == 0) {
        this.instances.push(this.createObjectInstanceFunction_(
            this.parent, this.id, category, name, ts));
      }
      var lastInstance = this.instances[this.instances.length - 1];
      if (ts < lastInstance.creationTs)
        throw new Error('Cannot delete a id before it was crated');
      if (lastInstance.deletionTs == Number.MAX_VALUE) {
        lastInstance.wasDeleted(ts);
        return lastInstance;
      }

      if (ts < lastInstance.deletionTs)
        throw new Error('id was already deleted earlier.');

      // A new instance was deleted with no snapshots in-between.
      // Create an instance then kill it.
      lastInstance = this.createObjectInstanceFunction_(
          this.parent, this.id, category, name, ts);
      this.instances.push(lastInstance);
      lastInstance.wasDeleted(ts);
      return lastInstance;
    },

    getInstanceAt: function(ts) {
      var i = tr.b.findIndexInSortedIntervals(
          this.instances,
          function(inst) { return inst.creationTs; },
          function(inst) { return inst.deletionTs - inst.creationTs; },
          ts);
      if (i < 0) {
        if (this.instances[0].creationTsWasExplicit)
          return undefined;
        return this.instances[0];
      } else if (i >= this.instances.length) {
        return undefined;
      }
      return this.instances[i];
    },

    logToConsole: function() {
      for (var i = 0; i < this.instances.length; i++) {
        var instance = this.instances[i];
        var cEF = '';
        var dEF = '';
        if (instance.creationTsWasExplicit)
          cEF = '(explicitC)';
        if (instance.deletionTsWasExplicit)
          dEF = '(explicit)';
        console.log(instance.creationTs, cEF,
                    instance.deletionTs, dEF,
                    instance.category,
                    instance.name,
                    instance.snapshots.length + ' snapshots');
      }
    }
  };

  return {
    TimeToObjectInstanceMap: TimeToObjectInstanceMap
  };
});
'use strict';

/**
 * @fileoverview Provides the ObjectCollection class.
 */
tr.exportTo('tr.model', function() {
  var ObjectInstance = tr.model.ObjectInstance;
  var ObjectSnapshot = tr.model.ObjectSnapshot;

  /**
   * A collection of object instances and their snapshots, accessible by id and
   * time, or by object name.
   *
   * @constructor
   */
  function ObjectCollection(parent) {
    tr.model.EventContainer.call(this);
    this.parent = parent;
    this.instanceMapsById_ = {}; // id -> TimeToObjectInstanceMap
    this.instancesByTypeName_ = {};
    this.createObjectInstance_ = this.createObjectInstance_.bind(this);
  }

  ObjectCollection.prototype = {
    __proto__: tr.model.EventContainer.prototype,

    iterateAllChildEventContainers: function(callback, opt_this) {
    },

    iterateAllEventsInThisContainer: function(eventTypePredicate,
                                              callback, opt_this) {
      var bI = !!eventTypePredicate.call(opt_this, ObjectInstance);
      var bS = !!eventTypePredicate.call(opt_this, ObjectSnapshot);
      if (bI === false && bS === false)
        return;
      this.iterObjectInstances(function(instance) {
        if (bI)
          callback.call(opt_this, instance);
        if (bS)
          instance.snapshots.forEach(callback, opt_this);
      }, opt_this);
    },

    createObjectInstance_: function(
        parent, id, category, name, creationTs, opt_baseTypeName) {
      var constructor = tr.model.ObjectInstance.getConstructor(
          category, name);
      var instance = new constructor(
          parent, id, category, name, creationTs, opt_baseTypeName);
      var typeName = instance.typeName;
      var instancesOfTypeName = this.instancesByTypeName_[typeName];
      if (!instancesOfTypeName) {
        instancesOfTypeName = [];
        this.instancesByTypeName_[typeName] = instancesOfTypeName;
      }
      instancesOfTypeName.push(instance);
      return instance;
    },

    getOrCreateInstanceMap_: function(id) {
      var instanceMap = this.instanceMapsById_[id];
      if (instanceMap)
        return instanceMap;
      instanceMap = new tr.model.TimeToObjectInstanceMap(
          this.createObjectInstance_, this.parent, id);
      this.instanceMapsById_[id] = instanceMap;
      return instanceMap;
    },

    idWasCreated: function(id, category, name, ts) {
      var instanceMap = this.getOrCreateInstanceMap_(id);
      return instanceMap.idWasCreated(category, name, ts);
    },

    addSnapshot: function(id, category, name, ts, args, opt_baseTypeName) {
      var instanceMap = this.getOrCreateInstanceMap_(id);
      var snapshot = instanceMap.addSnapshot(
          category, name, ts, args, opt_baseTypeName);
      if (snapshot.objectInstance.category != category) {
        var msg = 'Added snapshot name=' + name + ' with cat=' + category +
            ' impossible. It instance was created/snapshotted with cat=' +
            snapshot.objectInstance.category + ' name=' +
            snapshot.objectInstance.name;
        throw new Error(msg);
      }
      if (opt_baseTypeName &&
          snapshot.objectInstance.baseTypeName != opt_baseTypeName) {
        throw new Error('Could not add snapshot with baseTypeName=' +
                        opt_baseTypeName + '. It ' +
                        'was previously created with name=' +
                        snapshot.objectInstance.baseTypeName);
      }
      if (snapshot.objectInstance.name != name) {
        throw new Error('Could not add snapshot with name=' + name + '. It ' +
                        'was previously created with name=' +
                        snapshot.objectInstance.name);
      }
      return snapshot;
    },

    idWasDeleted: function(id, category, name, ts) {
      var instanceMap = this.getOrCreateInstanceMap_(id);
      var deletedInstance = instanceMap.idWasDeleted(category, name, ts);
      if (!deletedInstance)
        return;
      if (deletedInstance.category != category) {
        var msg = 'Deleting object ' + deletedInstance.name +
            ' with a different category ' +
            'than when it was created. It previous had cat=' +
            deletedInstance.category + ' but the delete command ' +
            'had cat=' + category;
        throw new Error(msg);
      }
      if (deletedInstance.baseTypeName != name) {
        throw new Error('Deletion requested for name=' +
                        name + ' could not proceed: ' +
                        'An existing object with baseTypeName=' +
                        deletedInstance.baseTypeName + ' existed.');
      }
    },

    autoDeleteObjects: function(maxTimestamp) {
      tr.b.iterItems(this.instanceMapsById_, function(id, i2imap) {
        var lastInstance = i2imap.lastInstance;
        if (lastInstance.deletionTs != Number.MAX_VALUE)
          return;
        i2imap.idWasDeleted(
            lastInstance.category, lastInstance.name, maxTimestamp);
        // idWasDeleted will cause lastInstance.deletionTsWasExplicit to be set
        // to true. Unset it here.
        lastInstance.deletionTsWasExplicit = false;
      });
    },

    getObjectInstanceAt: function(id, ts) {
      var instanceMap = this.instanceMapsById_[id];
      if (!instanceMap)
        return undefined;
      return instanceMap.getInstanceAt(ts);
    },

    getSnapshotAt: function(id, ts) {
      var instance = this.getObjectInstanceAt(id, ts);
      if (!instance)
        return undefined;
      return instance.getSnapshotAt(ts);
    },

    iterObjectInstances: function(iter, opt_this) {
      opt_this = opt_this || this;
      tr.b.iterItems(this.instanceMapsById_, function(id, i2imap) {
        i2imap.instances.forEach(iter, opt_this);
      });
    },

    getAllObjectInstances: function() {
      var instances = [];
      this.iterObjectInstances(function(i) { instances.push(i); });
      return instances;
    },

    getAllInstancesNamed: function(name) {
      return this.instancesByTypeName_[name];
    },

    getAllInstancesByTypeName: function() {
      return this.instancesByTypeName_;
    },

    preInitializeAllObjects: function() {
      this.iterObjectInstances(function(instance) {
        instance.preInitialize();
      });
    },

    initializeAllObjects: function() {
      this.iterObjectInstances(function(instance) {
        instance.initialize();
      });
    },

    initializeInstances: function() {
      this.iterObjectInstances(function(instance) {
        instance.initialize();
      });
    },

    updateBounds: function() {
      this.bounds.reset();
      this.iterObjectInstances(function(instance) {
        instance.updateBounds();
        this.bounds.addRange(instance.bounds);
      }, this);
    },

    shiftTimestampsForward: function(amount) {
      this.iterObjectInstances(function(instance) {
        instance.shiftTimestampsForward(amount);
      });
    },

    addCategoriesToDict: function(categoriesDict) {
      this.iterObjectInstances(function(instance) {
        categoriesDict[instance.category] = true;
      });
    }
  };

  return {
    ObjectCollection: ObjectCollection
  };
});
'use strict';

/**
 * @fileoverview Provides the AsyncSlice class.
 */
tr.exportTo('tr.model', function() {
  /**
   * A AsyncSlice represents an interval of time during which an
   * asynchronous operation is in progress. An AsyncSlice consumes no CPU time
   * itself and so is only associated with Threads at its start and end point.
   *
   * @constructor
   */
  function AsyncSlice(category, title, colorId, start, args, duration,
                      opt_isTopLevel, opt_cpuStart, opt_cpuDuration,
                      opt_argsStripped) {
    tr.model.TimedEvent.call(this, start);

    this.category = category || '';
    this.title = title;
    this.colorId = colorId;
    this.args = args;
    this.startStackFrame = undefined;
    this.endStackFrame = undefined;
    this.didNotFinish = false;
    this.important = false;
    this.subSlices = [];
    this.parentContainer = undefined;

    this.id = undefined;
    this.startThread = undefined;
    this.endThread = undefined;
    this.cpuStart = undefined;
    this.cpuDuration = undefined;
    this.argsStripped = false;

    this.startStackFrame = undefined;
    this.endStackFrame = undefined;

    this.duration = duration;


    // TODO(nduca): Forgive me for what I must do.
    this.isTopLevel = (opt_isTopLevel === true);

    if (opt_cpuStart !== undefined)
      this.cpuStart = opt_cpuStart;

    if (opt_cpuDuration !== undefined)
      this.cpuDuration = opt_cpuDuration;

    if (opt_argsStripped !== undefined)
      this.argsStripped = opt_argsStripped;
  };

  AsyncSlice.prototype = {
    __proto__: tr.model.TimedEvent.prototype,

    get analysisTypeName() {
      return this.title;
    },

    get viewSubGroupTitle() {
      return this.title;
    },

    get userFriendlyName() {
      return 'Async slice ' + this.title + ' at ' +
          tr.b.u.TimeStamp.format(this.start);
    },

    get stableId() {
      var parentAsyncSliceGroup = this.parentContainer.asyncSliceGroup;
      return parentAsyncSliceGroup.stableId + '.' +
          parentAsyncSliceGroup.slices.indexOf(this);
    },

    findDescendentSlice: function(targetTitle) {
      if (!this.subSlices)
        return undefined;

      for (var i = 0; i < this.subSlices.length; i++) {
        if (this.subSlices[i].title == targetTitle)
          return this.subSlices[i];
        var slice = this.subSlices[i].findDescendentSlice(targetTitle);
        if (slice) return slice;
      }
      return undefined;
    },

    iterateAllDescendents: function(callback, opt_this) {
      this.subSlices.forEach(callback, opt_this);
      this.subSlices.forEach(function(subSlice) {
        subSlice.iterateAllDescendents(callback, opt_this);
      }, opt_this);
    },

    compareTo: function(that) {
      return this.title.localeCompare(that.title);
    }
  };

  tr.model.EventRegistry.register(
      AsyncSlice,
      {
        name: 'asyncSlice',
        pluralName: 'asyncSlices',
        singleViewElementName: 'tr-ui-a-single-async-slice-sub-view',
        multiViewElementName: 'tr-ui-a-multi-async-slice-sub-view'
      });


  var options = new tr.b.ExtensionRegistryOptions(
      tr.b.TYPE_BASED_REGISTRY_MODE);
  options.mandatoryBaseClass = AsyncSlice;
  options.defaultConstructor = AsyncSlice;
  tr.b.decorateExtensionRegistry(AsyncSlice, options);

  return {
    AsyncSlice: AsyncSlice
  };
});
'use strict';

/**
 * @fileoverview Provides the AsyncSliceGroup class.
 */
tr.exportTo('tr.model', function() {
  /**
   * A group of AsyncSlices associated with a thread.
   * @constructor
   * @extends {tr.model.EventContainer}
   */
  function AsyncSliceGroup(parentContainer, opt_name) {
    tr.model.EventContainer.call(this);
    this.parentContainer_ = parentContainer;
    this.slices = [];
    this.name_ = opt_name;
    this.viewSubGroups_ = undefined;
  }

  AsyncSliceGroup.prototype = {
    __proto__: tr.model.EventContainer.prototype,

    get parentContainer() {
      return this.parentContainer_;
    },

    get model() {
      return this.parentContainer_.parent.model;
    },

    get stableId() {
      return this.parentContainer_.stableId + '.AsyncSliceGroup';
    },

    getSettingsKey: function() {
      if (!this.name_)
        return undefined;
      var parentKey = this.parentContainer_.getSettingsKey();
      if (!parentKey)
        return undefined;
      return parentKey + '.' + this.name_;
    },

    /**
     * Helper function that pushes the provided slice onto the slices array.
     */
    push: function(slice) {
      slice.parentContainer = this.parentContainer;
      this.slices.push(slice);
      return slice;
    },

    /**
     * @return {Number} The number of slices in this group.
     */
    get length() {
      return this.slices.length;
    },

    /**
     * Shifts all the timestamps inside this group forward by the amount
     * specified, including all nested subSlices if there are any.
     */
    shiftTimestampsForward: function(amount) {
      for (var sI = 0; sI < this.slices.length; sI++) {
        var slice = this.slices[sI];
        slice.start = (slice.start + amount);
        // Shift all nested subSlices recursively.
        var shiftSubSlices = function(subSlices) {
          if (subSlices === undefined || subSlices.length === 0)
            return;
          for (var sJ = 0; sJ < subSlices.length; sJ++) {
            subSlices[sJ].start += amount;
            shiftSubSlices(subSlices[sJ].subSlices);
          }
        };
        shiftSubSlices(slice.subSlices);
      }
    },

    /**
     * Updates the bounds for this group based on the slices it contains.
     */
    updateBounds: function() {
      this.bounds.reset();
      for (var i = 0; i < this.slices.length; i++) {
        this.bounds.addValue(this.slices[i].start);
        this.bounds.addValue(this.slices[i].end);
      }
    },

    /**
     * Gets the sub-groups in this A-S-G defined by the group titles.
     *
     * @return {Array} An array of AsyncSliceGroups where each group has
     * slices that started on the same thread.
     */
    get viewSubGroups() {
      if (this.viewSubGroups_ === undefined) {
        var prefix = '';
        if (this.name !== undefined)
          prefix = this.name + '.';
        else
          prefix = '';

        var subGroupsByTitle = {};
        for (var i = 0; i < this.slices.length; ++i) {
          var slice = this.slices[i];
          var subGroupTitle = slice.viewSubGroupTitle;
          if (!subGroupsByTitle[subGroupTitle]) {
            subGroupsByTitle[subGroupTitle] = new AsyncSliceGroup(
                this.parentContainer_, prefix + subGroupTitle);
          }
          subGroupsByTitle[subGroupTitle].push(slice);
        }
        this.viewSubGroups_ = tr.b.dictionaryValues(subGroupsByTitle);
        this.viewSubGroups_.sort(function(a, b) {
          return a.slices[0].compareTo(b.slices[0]);
        });
      }
      return this.viewSubGroups_;
    },

    iterateAllEventsInThisContainer: function(eventTypePredicate,
                                              callback, opt_this) {
      if (eventTypePredicate.call(opt_this, tr.model.AsyncSlice)) {
        for (var i = 0; i < this.slices.length; i++) {
          var slice = this.slices[i];
          callback.call(opt_this, slice);
          if (slice.subSlices)
            slice.subSlices.forEach(callback, opt_this);
        }
      }
    },

    iterateAllChildEventContainers: function(callback, opt_this) {
    }
  };

  return {
    AsyncSliceGroup: AsyncSliceGroup
  };
});
'use strict';

/**
 * @fileoverview Provides the SliceGroup class.
 */
tr.exportTo('tr.model', function() {
  var Slice = tr.model.Slice;

  function getSliceLo(s) {
    return s.start;
  }

  function getSliceHi(s) {
    return s.end;
  }

  /**
   * A group of Slices, plus code to create them from B/E events, as
   * well as arrange them into subRows.
   *
   * Do not mutate the slices array directly. Modify it only by
   * SliceGroup mutation methods.
   *
   * @constructor
   * @param {function(new:Slice, category, title, colorId, start, args)=}
   *     opt_sliceConstructor The constructor to use when creating slices.
   * @extends {tr.model.EventContainer}
   */
  function SliceGroup(parentContainer, opt_sliceConstructor, opt_name) {
    tr.model.EventContainer.call(this);

    this.parentContainer_ = parentContainer;

    var sliceConstructor = opt_sliceConstructor || Slice;
    this.sliceConstructor = sliceConstructor;

    this.openPartialSlices_ = [];

    this.slices = [];
    this.topLevelSlices = [];
    this.haveTopLevelSlicesBeenBuilt = false;
    this.name_ = opt_name;

    if (this.model === undefined)
      throw new Error('SliceGroup must have model defined.');
  }

  SliceGroup.prototype = {
    __proto__: tr.model.EventContainer.prototype,

    get parentContainer() {
      return this.parentContainer_;
    },

    get model() {
      return this.parentContainer_.model;
    },

    get stableId() {
      return this.parentContainer_.stableId + '.SliceGroup';
    },

    getSettingsKey: function() {
      if (!this.name_)
        return undefined;
      var parentKey = this.parentContainer_.getSettingsKey();
      if (!parentKey)
        return undefined;
      return parentKey + '.' + this.name;
    },

    /**
     * @return {Number} The number of slices in this group.
     */
    get length() {
      return this.slices.length;
    },

    /**
     * Helper function that pushes the provided slice onto the slices array.
     * @param {Slice} slice The slice to be added to the slices array.
     */
    pushSlice: function(slice) {
      this.haveTopLevelSlicesBeenBuilt = false;
      slice.parentContainer = this.parentContainer_;
      this.slices.push(slice);
      return slice;
    },

    /**
     * Helper function that pushes the provided slices onto the slices array.
     * @param {Array.<Slice>} slices An array of slices to be added.
     */
    pushSlices: function(slices) {
      this.haveTopLevelSlicesBeenBuilt = false;
      slices.forEach(function(slice) {
        slice.parentContainer = this.parentContainer_;
        this.slices.push(slice);
      }, this);
    },

    /**
     * Opens a new slice in the group's slices.
     *
     * Calls to beginSlice and
     * endSlice must be made with non-monotonically-decreasing timestamps.
     *
     * @param {String} category Category name of the slice to add.
     * @param {String} title Title of the slice to add.
     * @param {Number} ts The timetsamp of the slice, in milliseconds.
     * @param {Object.<string, Object>=} opt_args Arguments associated with
     * the slice.
     * @param {Number=} opt_colorId The color of the slice, defined by
     * its palette id (see ui/base/color_scheme.html).
     */
    beginSlice: function(category, title, ts, opt_args, opt_tts,
                         opt_argsStripped, opt_colorId) {
      if (this.openPartialSlices_.length) {
        var prevSlice = this.openPartialSlices_[
            this.openPartialSlices_.length - 1];
        if (ts < prevSlice.start)
          throw new Error('Slices must be added in increasing timestamp order');
      }

      var colorId = opt_colorId ||
          tr.ui.b.getColorIdForGeneralPurposeString(title);
      var slice = new this.sliceConstructor(category, title, colorId, ts,
                                            opt_args ? opt_args : {}, null,
                                            opt_tts, undefined,
                                            opt_argsStripped);
      this.openPartialSlices_.push(slice);
      slice.didNotFinish = true;
      this.pushSlice(slice);

      return slice;
    },

    isTimestampValidForBeginOrEnd: function(ts) {
      if (!this.openPartialSlices_.length)
        return true;
      var top = this.openPartialSlices_[this.openPartialSlices_.length - 1];
      return ts >= top.start;
    },

    /**
     * @return {Number} The number of beginSlices for which an endSlice has not
     * been issued.
     */
    get openSliceCount() {
      return this.openPartialSlices_.length;
    },

    get mostRecentlyOpenedPartialSlice() {
      if (!this.openPartialSlices_.length)
        return undefined;
      return this.openPartialSlices_[this.openPartialSlices_.length - 1];
    },

    /**
     * Ends the last begun slice in this group and pushes it onto the slice
     * array.
     *
     * @param {Number} ts Timestamp when the slice ended
     * @param {Number=} opt_colorId The color of the slice, defined by
     * its palette id (see ui/base/color_scheme.html).
     * @return {Slice} slice.
     */
    endSlice: function(ts, opt_tts, opt_colorId) {
      if (!this.openSliceCount)
        throw new Error('endSlice called without an open slice');

      var slice = this.openPartialSlices_[this.openSliceCount - 1];
      this.openPartialSlices_.splice(this.openSliceCount - 1, 1);
      if (ts < slice.start)
        throw new Error('Slice ' + slice.title +
                        ' end time is before its start.');

      slice.duration = ts - slice.start;
      slice.didNotFinish = false;
      slice.colorId = opt_colorId || slice.colorId;

      if (opt_tts && slice.cpuStart !== undefined)
        slice.cpuDuration = opt_tts - slice.cpuStart;

      return slice;
    },

    /**
     * Push a complete event as a Slice into the slice list.
     * The timestamp can be in any order.
     *
     * @param {String} category Category name of the slice to add.
     * @param {String} title Title of the slice to add.
     * @param {Number} ts The timetsamp of the slice, in milliseconds.
     * @param {Number} duration The duration of the slice, in milliseconds.
     * @param {Object.<string, Object>=} opt_args Arguments associated with
     * the slice.
     * @param {Number=} opt_colorId The color of the slice, as defined by
     * its palette id (see ui/base/color_scheme.html).
     */
    pushCompleteSlice: function(category, title, ts, duration, tts,
                                cpuDuration, opt_args, opt_argsStripped,
                                opt_colorId, opt_bind_id) {
      var colorId = opt_colorId ||
          tr.ui.b.getColorIdForGeneralPurposeString(title);
      var slice = new this.sliceConstructor(category, title, colorId, ts,
                                            opt_args ? opt_args : {},
                                            duration, tts, cpuDuration,
                                            opt_argsStripped, opt_bind_id);
      if (duration === undefined)
        slice.didNotFinish = true;
      this.pushSlice(slice);
      return slice;
    },

    /**
     * Closes any open slices.
     * @param {Number=} opt_maxTimestamp The end time to use for the closed
     * slices. If not provided,
     * the max timestamp for this slice is provided.
     */
    autoCloseOpenSlices: function(opt_maxTimestamp) {
      if (!opt_maxTimestamp) {
        this.updateBounds();
        opt_maxTimestamp = this.bounds.max;
      }
      for (var sI = 0; sI < this.slices.length; sI++) {
        var slice = this.slices[sI];
        if (slice.didNotFinish)
          slice.duration = opt_maxTimestamp - slice.start;
      }
      this.openPartialSlices_ = [];
    },

    /**
     * Shifts all the timestamps inside this group forward by the amount
     * specified.
     */
    shiftTimestampsForward: function(amount) {
      for (var sI = 0; sI < this.slices.length; sI++) {
        var slice = this.slices[sI];
        slice.start = (slice.start + amount);
      }
    },

    /**
     * Updates the bounds for this group based on the slices it contains.
     */
    updateBounds: function() {
      this.bounds.reset();
      for (var i = 0; i < this.slices.length; i++) {
        this.bounds.addValue(this.slices[i].start);
        this.bounds.addValue(this.slices[i].end);
      }
    },

    copySlice: function(slice) {
      var newSlice = new this.sliceConstructor(slice.category, slice.title,
          slice.colorId, slice.start,
          slice.args, slice.duration, slice.cpuStart, slice.cpuDuration);
      newSlice.didNotFinish = slice.didNotFinish;
      return newSlice;
    },

    iterateAllEventsInThisContainer: function(eventTypePredicate,
                                              callback, opt_this) {
      if (eventTypePredicate.call(opt_this, this.sliceConstructor))
        this.slices.forEach(callback, opt_this);
    },

    iterateAllChildEventContainers: function(callback, opt_this) {
    },

    getSlicesOfName: function(title) {
      var slices = [];
      for (var i = 0; i < this.slices.length; i++) {
        if (this.slices[i].title == title) {
          slices.push(this.slices[i]);
        }
      }
      return slices;
    },

    iterSlicesInTimeRange: function(callback, start, end) {
      var ret = [];
      tr.b.iterateOverIntersectingIntervals(
        this.topLevelSlices,
        function(s) { return s.start; },
        function(s) { return s.duration; },
        start,
        end,
        function(topLevelSlice) {
          callback(topLevelSlice);
          topLevelSlice.iterateAllDescendents(callback);
        });
      return ret;
    },

    findFirstSlice: function() {
      if (!this.haveTopLevelSlicesBeenBuilt)
        throw new Error('Nope');
      if (0 === this.slices.length)
        return undefined;
      return this.slices[0];
    },

    findSliceAtTs: function(ts) {
      if (!this.haveTopLevelSlicesBeenBuilt)
        throw new Error('Nope');
      var i = tr.b.findIndexInSortedClosedIntervals(
          this.topLevelSlices,
          getSliceLo, getSliceHi,
          ts);
      if (i == -1 || i == this.topLevelSlices.length)
        return undefined;

      var curSlice = this.topLevelSlices[i];

      // Now recurse on slice looking for subSlice of given ts.
      while (true) {
        var i = tr.b.findIndexInSortedClosedIntervals(
            curSlice.subSlices,
            getSliceLo, getSliceHi,
            ts);
        if (i == -1 || i == curSlice.subSlices.length)
          return curSlice;
        curSlice = curSlice.subSlices[i];
      }
    },

    findNextSliceAfter: function(ts, refGuid) {
      var i = tr.b.findLowIndexInSortedArray(
          this.slices, getSliceLo, ts);
      if (i === this.slices.length)
        return undefined;
      for (; i < this.slices.length; i++) {
        var slice = this.slices[i];
        if (slice.start > ts)
          return slice;
        if (slice.guid <= refGuid)
          continue;
        return slice;
      }
      return undefined;
    },

    /**
     * Construct subSlices for this group.
     * Populate the group topLevelSlices, parent slices get a subSlices[],
     * a selfThreadTime and a selfTime, child slices get a parentSlice
     * reference.
     */
    createSubSlices: function() {
      this.haveTopLevelSlicesBeenBuilt = true;
      this.createSubSlicesImpl_();
      if (this.parentContainer.timeSlices)
        this.addCpuTimeToSubslices_(this.parentContainer.timeSlices);
      this.slices.forEach(function(slice) {
        var selfTime = slice.duration;
        for (var i = 0; i < slice.subSlices.length; i++)
          selfTime -= slice.subSlices[i].duration;
        slice.selfTime = selfTime;

        if (slice.cpuDuration === undefined)
          return;

        var cpuSelfTime = slice.cpuDuration;
        for (var i = 0; i < slice.subSlices.length; i++) {
          if (slice.subSlices[i].cpuDuration !== undefined)
            cpuSelfTime -= slice.subSlices[i].cpuDuration;
        }
        slice.cpuSelfTime = cpuSelfTime;
      });
    },
    createSubSlicesImpl_: function() {
      var precisionUnit = this.model.intrinsicTimeUnit;

      function addSliceIfBounds(root, child) {
        // Because we know that the start time of child is >= the start time
        // of all other slices seen so far, we can just check the last slice
        // of each row for bounding.
        if (root.bounds(child, precisionUnit)) {
          if (root.subSlices && root.subSlices.length > 0) {
            if (addSliceIfBounds(root.subSlices[root.subSlices.length - 1],
                                 child))
              return true;
          }
          child.parentSlice = root;
          if (root.subSlices === undefined)
            root.subSlices = [];
          root.subSlices.push(child);
          return true;
        }
        return false;
      }

      if (!this.slices.length)
        return;

      var ops = [];
      for (var i = 0; i < this.slices.length; i++) {
        if (this.slices[i].subSlices)
          this.slices[i].subSlices.splice(0,
                                          this.slices[i].subSlices.length);
        ops.push(i);
      }

      var originalSlices = this.slices;
      ops.sort(function(ix, iy) {
        var x = originalSlices[ix];
        var y = originalSlices[iy];
        if (x.start != y.start)
          return x.start - y.start;

        // Elements get inserted into the slices array in order of when the
        // slices start. Because slices must be properly nested, we break
        // start-time ties by assuming that the elements appearing earlier
        // in the slices array (and thus ending earlier) start earlier.
        return ix - iy;
      });

      var slices = new Array(this.slices.length);
      for (var i = 0; i < ops.length; i++) {
        slices[i] = originalSlices[ops[i]];
      }

      // Actually build the subrows.
      var rootSlice = slices[0];
      this.topLevelSlices = [];
      this.topLevelSlices.push(rootSlice);
      rootSlice.isTopLevel = true;
      for (var i = 1; i < slices.length; i++) {
        var slice = slices[i];
        if (!addSliceIfBounds(rootSlice, slice)) {
          rootSlice = slice;
          rootSlice.isTopLevel = true;
          this.topLevelSlices.push(rootSlice);
        }
      }

      // Keep the slices in sorted form.
      this.slices = slices;
    },
    addCpuTimeToSubslices_: function(timeSlices) {
      var SCHEDULING_STATE = tr.model.SCHEDULING_STATE;
      var sliceIdx = 0;
      timeSlices.forEach(function(timeSlice) {
        if (timeSlice.schedulingState == SCHEDULING_STATE.RUNNING) {
          while (sliceIdx < this.topLevelSlices.length) {
            if (this.addCpuTimeToSubslice_(this.topLevelSlices[sliceIdx],
                timeSlice)) {
              // The current top-level slice and children are fully
              // accounted for, proceed to next top-level slice.
              sliceIdx++;
            } else {
              // The current top-level runs beyond the time slice, break out
              // so we can potentially add more time slices to it
              break;
            }
          }
        }
      }, this);
    },
    /* Add run-time of this timeSlice to the passed in slice
     * and all of it's children (recursively).
     * Returns whether the slice ends before or at the end of the
     * time slice, signaling we are done with this slice.
     */
    addCpuTimeToSubslice_: function(slice, timeSlice) {
      // Make sure they overlap
      if (slice.start > timeSlice.end || slice.end < timeSlice.start)
        return slice.end <= timeSlice.end;

      // Compute actual overlap
      var duration = timeSlice.duration;
      if (slice.start > timeSlice.start)
        duration -= slice.start - timeSlice.start;
      if (timeSlice.end > slice.end)
        duration -= timeSlice.end - slice.end;

      if (slice.cpuDuration) {
        slice.cpuDuration += duration;
      } else {
        slice.cpuDuration = duration;
      }

      for (var i = 0; i < slice.subSlices.length; i++) {
        this.addCpuTimeToSubslice_(slice.subSlices[i], timeSlice);
      }

      return slice.end <= timeSlice.end;
    }
  };

  /**
   * Merge two slice groups.
   *
   * If the two groups do not nest properly some of the slices of groupB will
   * be split to accomodate the improper nesting.  This is done to accomodate
   * combined kernel and userland call stacks on Android.  Because userland
   * tracing is done by writing to the trace_marker file, the kernel calls
   * that get invoked as part of that write may not be properly nested with
   * the userland call trace.  For example the following sequence may occur:
   *
   *     kernel enter sys_write        (the write to trace_marker)
   *     user   enter some_function
   *     kernel exit  sys_write
   *     ...
   *     kernel enter sys_write        (the write to trace_marker)
   *     user   exit  some_function
   *     kernel exit  sys_write
   *
   * This is handled by splitting the sys_write call into two slices as
   * follows:
   *
   *     | sys_write |            some_function            | sys_write (cont.) |
   *                 | sys_write (cont.) |     | sys_write |
   *
   * The colorId of both parts of the split slices are kept the same, and the
   * " (cont.)" suffix is appended to the later parts of a split slice.
   *
   * The two input SliceGroups are not modified by this, and the merged
   * SliceGroup will contain a copy of each of the input groups' slices (those
   * copies may be split).
   */
  SliceGroup.merge = function(groupA, groupB) {
    // This is implemented by traversing the two slice groups in reverse
    // order.  The slices in each group are sorted by ascending end-time, so
    // we must do the traversal from back to front in order to maintain the
    // sorting.
    //
    // We traverse the two groups simultaneously, merging as we go.  At each
    // iteration we choose the group from which to take the next slice based
    // on which group's next slice has the greater end-time.  During this
    // traversal we maintain a stack of currently "open" slices for each input
    // group.  A slice is considered "open" from the time it gets reached in
    // our input group traversal to the time we reach an slice in this
    // traversal with an end-time before the start time of the "open" slice.
    //
    // Each time a slice from groupA is opened or closed (events corresponding
    // to the end-time and start-time of the input slice, respectively) we
    // split all of the currently open slices from groupB.

    if (groupA.openPartialSlices_.length > 0)
      throw new Error('groupA has open partial slices');

    if (groupB.openPartialSlices_.length > 0)
      throw new Error('groupB has open partial slices');

    if (groupA.parentContainer != groupB.parentContainer)
      throw new Error('Different parent threads. Cannot merge');

    if (groupA.sliceConstructor != groupB.sliceConstructor)
      throw new Error('Different slice constructors. Cannot merge');

    var result = new SliceGroup(groupA.parentContainer,
                                groupA.sliceConstructor,
                                groupA.name_);

    var slicesA = groupA.slices;
    var slicesB = groupB.slices;
    var idxA = 0;
    var idxB = 0;
    var openA = [];
    var openB = [];

    var splitOpenSlices = function(when) {
      for (var i = 0; i < openB.length; i++) {
        var oldSlice = openB[i];
        var oldEnd = oldSlice.end;
        if (when < oldSlice.start || oldEnd < when) {
          throw new Error('slice should not be split');
        }

        var newSlice = result.copySlice(oldSlice);
        newSlice.start = when;
        newSlice.duration = oldEnd - when;
        if (newSlice.title.indexOf(' (cont.)') == -1)
          newSlice.title += ' (cont.)';
        oldSlice.duration = when - oldSlice.start;
        openB[i] = newSlice;
        result.pushSlice(newSlice);
      }
    };

    var closeOpenSlices = function(upTo) {
      while (openA.length > 0 || openB.length > 0) {
        var nextA = openA[openA.length - 1];
        var nextB = openB[openB.length - 1];
        var endA = nextA && nextA.end;
        var endB = nextB && nextB.end;

        if ((endA === undefined || endA > upTo) &&
            (endB === undefined || endB > upTo)) {
          return;
        }

        if (endB === undefined || endA < endB) {
          splitOpenSlices(endA);
          openA.pop();
        } else {
          openB.pop();
        }
      }
    };

    while (idxA < slicesA.length || idxB < slicesB.length) {
      var sA = slicesA[idxA];
      var sB = slicesB[idxB];
      var nextSlice, isFromB;

      if (sA === undefined || (sB !== undefined && sA.start > sB.start)) {
        nextSlice = result.copySlice(sB);
        isFromB = true;
        idxB++;
      } else {
        nextSlice = result.copySlice(sA);
        isFromB = false;
        idxA++;
      }

      closeOpenSlices(nextSlice.start);

      result.pushSlice(nextSlice);

      if (isFromB) {
        openB.push(nextSlice);
      } else {
        splitOpenSlices(nextSlice.start);
        openA.push(nextSlice);
      }
    }

    closeOpenSlices();

    return result;
  };

  return {
    SliceGroup: SliceGroup
  };
});
'use strict';

/**
 * @fileoverview Provides the Thread class.
 */
tr.exportTo('tr.model', function() {
  var Slice = tr.model.Slice;

  /**
   * A ThreadSlice represents an interval of time on a thread resource
   * with associated nesting slice information.
   *
   * ThreadSlices are typically associated with a specific trace event pair on a
   * specific thread.
   * For example,
   *   TRACE_EVENT_BEGIN1("x","myArg", 7) at time=0.1ms
   *   TRACE_EVENT_END0()                 at time=0.3ms
   * This results in a single slice from 0.1 with duration 0.2 on a
   * specific thread.
   *
   * @constructor
   */
  function ThreadSlice(cat, title, colorId, start, args, opt_duration,
                       opt_cpuStart, opt_cpuDuration, opt_argsStripped,
                       opt_bind_id) {
    Slice.call(this, cat, title, colorId, start, args, opt_duration,
               opt_cpuStart, opt_cpuDuration, opt_argsStripped, opt_bind_id);
    // Do not modify this directly.
    // subSlices is configured by SliceGroup.rebuildSubRows_.
    this.subSlices = [];
  }

  ThreadSlice.prototype = {
    __proto__: Slice.prototype,

    getProcess: function() {
      var thread = this.parentContainer;
      if (thread && thread.getProcess)
        return thread.getProcess();
      return undefined;
    }
  };

  tr.model.EventRegistry.register(
      ThreadSlice,
      {
        name: 'slice',
        pluralName: 'slices',
        singleViewElementName: 'tr-ui-a-single-thread-slice-sub-view',
        multiViewElementName: 'tr-ui-a-multi-thread-slice-sub-view'
      });

  return {
    ThreadSlice: ThreadSlice
  };
});
'use strict';

/**
 * @fileoverview Provides the Thread class.
 */
tr.exportTo('tr.model', function() {
  var AsyncSlice = tr.model.AsyncSlice;
  var AsyncSliceGroup = tr.model.AsyncSliceGroup;
  var Slice = tr.model.Slice;
  var SliceGroup = tr.model.SliceGroup;
  var ThreadSlice = tr.model.ThreadSlice;
  var ThreadTimeSlice = tr.model.ThreadTimeSlice;

  /**
   * A Thread stores all the trace events collected for a particular
   * thread. We organize the synchronous slices on a thread by "subrows," where
   * subrow 0 has all the root slices, subrow 1 those nested 1 deep, and so on.
   * The asynchronous slices are stored in an AsyncSliceGroup object.
   *
   * The slices stored on a Thread should be instances of
   * ThreadSlice.
   *
   * @constructor
   * @extends {tr.model.EventContainer}
   */
  function Thread(parent, tid) {
    if (!parent)
      throw new Error('Parent must be provided.');

    tr.model.EventContainer.call(this);
    this.parent = parent;
    this.sortIndex = 0;
    this.tid = tid;
    this.name = undefined;
    this.samples_ = undefined; // Set during createSubSlices

    var that = this;

    this.sliceGroup = new SliceGroup(this, ThreadSlice, 'slices');
    this.timeSlices = undefined;
    this.kernelSliceGroup = new SliceGroup(
        this, ThreadSlice, 'kernel-slices');
    this.asyncSliceGroup = new AsyncSliceGroup(this, 'async-slices');
  }

  Thread.prototype = {
    __proto__: tr.model.EventContainer.prototype,

    get model() {
      return this.parent.model;
    },

    get stableId() {
      return this.parent.stableId + '.' + this.tid;
    },

    compareTo: function(that) {
      return Thread.compare(this, that);
    },

    iterateAllChildEventContainers: function(callback, opt_this) {
      if (this.sliceGroup.length)
        callback.call(opt_this, this.sliceGroup);
      if (this.kernelSliceGroup.length)
        callback.call(opt_this, this.kernelSliceGroup);
      if (this.asyncSliceGroup.length)
        callback.call(opt_this, this.asyncSliceGroup);
    },

    iterateAllEventsInThisContainer: function(eventTypePredicate,
                                              callback, opt_this) {
      if (this.timeSlices && this.timeSlices.length) {
        if (eventTypePredicate.call(opt_this, ThreadTimeSlice))
          this.timeSlices.forEach(callback, opt_this);
      }
    },

    iterateAllPersistableObjects: function(cb) {
      cb(this);
      if (this.sliceGroup.length)
        cb(this.sliceGroup);
      this.asyncSliceGroup.viewSubGroups.forEach(cb);
    },

    /**
     * Shifts all the timestamps inside this thread forward by the amount
     * specified.
     */
    shiftTimestampsForward: function(amount) {
      this.sliceGroup.shiftTimestampsForward(amount);

      if (this.timeSlices) {
        for (var i = 0; i < this.timeSlices.length; i++) {
          var slice = this.timeSlices[i];
          slice.start += amount;
        }
      }

      this.kernelSliceGroup.shiftTimestampsForward(amount);
      this.asyncSliceGroup.shiftTimestampsForward(amount);
    },

    /**
     * Determines whether this thread is empty. If true, it usually implies
     * that it should be pruned from the model.
     */
    get isEmpty() {
      if (this.sliceGroup.length)
        return false;
      if (this.sliceGroup.openSliceCount)
        return false;
      if (this.timeSlices && this.timeSlices.length)
        return false;
      if (this.kernelSliceGroup.length)
        return false;
      if (this.asyncSliceGroup.length)
        return false;
      if (this.samples_.length)
        return false;
      return true;
    },

    /**
     * Updates the bounds based on the
     * current objects associated with the thread.
     */
    updateBounds: function() {
      this.bounds.reset();

      this.sliceGroup.updateBounds();
      this.bounds.addRange(this.sliceGroup.bounds);

      this.kernelSliceGroup.updateBounds();
      this.bounds.addRange(this.kernelSliceGroup.bounds);

      this.asyncSliceGroup.updateBounds();
      this.bounds.addRange(this.asyncSliceGroup.bounds);

      if (this.timeSlices && this.timeSlices.length) {
        this.bounds.addValue(this.timeSlices[0].start);
        this.bounds.addValue(
            this.timeSlices[this.timeSlices.length - 1].end);
      }

      if (this.samples_ && this.samples_.length) {
        this.bounds.addValue(this.samples_[0].start);
        this.bounds.addValue(
            this.samples_[this.samples_.length - 1].end);
      }
    },

    addCategoriesToDict: function(categoriesDict) {
      for (var i = 0; i < this.sliceGroup.length; i++)
        categoriesDict[this.sliceGroup.slices[i].category] = true;
      for (var i = 0; i < this.kernelSliceGroup.length; i++)
        categoriesDict[this.kernelSliceGroup.slices[i].category] = true;
      for (var i = 0; i < this.asyncSliceGroup.length; i++)
        categoriesDict[this.asyncSliceGroup.slices[i].category] = true;
      if (this.samples_) {
        for (var i = 0; i < this.samples_.length; i++)
          categoriesDict[this.samples_[i].category] = true;
      }
    },

    autoCloseOpenSlices: function(opt_maxTimestamp) {
      this.sliceGroup.autoCloseOpenSlices(opt_maxTimestamp);
      this.kernelSliceGroup.autoCloseOpenSlices(opt_maxTimestamp);
    },

    mergeKernelWithUserland: function() {
      if (this.kernelSliceGroup.length > 0) {
        var newSlices = SliceGroup.merge(
            this.sliceGroup, this.kernelSliceGroup);
        this.sliceGroup.slices = newSlices.slices;
        this.kernelSliceGroup = new SliceGroup(this);
        this.updateBounds();
      }
    },

    createSubSlices: function() {
      this.sliceGroup.createSubSlices();
      this.samples_ = this.parent.model.samples.filter(function(sample) {
        return sample.thread == this;
      }, this);
    },

    /**
     * @return {String} A user-friendly name for this thread.
     */
    get userFriendlyName() {
      return this.name || this.tid;
    },

    /**
     * @return {String} User friendly details about this thread.
     */
    get userFriendlyDetails() {
      return 'tid: ' + this.tid +
          (this.name ? ', name: ' + this.name : '');
    },

    getSettingsKey: function() {
      if (!this.name)
        return undefined;
      var parentKey = this.parent.getSettingsKey();
      if (!parentKey)
        return undefined;
      return parentKey + '.' + this.name;
    },

    getProcess: function() {
      return this.parent;
    },

    /*
     * Returns the index of the slice in the timeSlices array, or undefined.
     */
    indexOfTimeSlice: function(timeSlice) {
      var i = tr.b.findLowIndexInSortedArray(
          this.timeSlices,
          function(slice) { return slice.start; },
          timeSlice.start);
      if (this.timeSlices[i] !== timeSlice)
        return undefined;
      return i;
    },

    /*
     * Returns an object with the CPU number used as keys,
     * and the value of each key object is the amount of milliseconds spent
     * running on this CPU.
     * Additionally, stats.total contains the total time
     * spent running on all CPUs.
     */
    getCpuStatsForRange: function(range) {
      var stats = {};
      stats.total = 0;

      if (!this.timeSlices)
        return stats;

      function addStatsForSlice(threadTimeSlice) {
        var freqRange = tr.b.Range.fromExplicitRange(threadTimeSlice.start,
            threadTimeSlice.end);
        var intersection = freqRange.findIntersection(range);

        if (threadTimeSlice.schedulingState ==
            tr.model.SCHEDULING_STATE.RUNNING) {
          var cpu = threadTimeSlice.cpuOnWhichThreadWasRunning;
          if (!(cpu.cpuNumber in stats))
            stats[cpu.cpuNumber] = 0;

          stats[cpu.cpuNumber] += intersection.duration;
          stats.total += intersection.duration;
        }
      }

      tr.b.iterateOverIntersectingIntervals(this.timeSlices,
                                            function(x) { return x.start; },
                                            function(x) { return x.end; },
                                            range.min,
                                            range.max,
                                            addStatsForSlice);
      return stats;
    },

    getSchedulingStatsForRange: function(start, end) {
      var stats = {};

      if (!this.timeSlices) return stats;

      function addStatsForSlice(threadTimeSlice) {
        var overlapStart = Math.max(threadTimeSlice.start, start);
        var overlapEnd = Math.min(threadTimeSlice.end, end);
        var schedulingState = threadTimeSlice.schedulingState;

        if (!(schedulingState in stats))
          stats[schedulingState] = 0;
        stats[schedulingState] += overlapEnd - overlapStart;
      }

      tr.b.iterateOverIntersectingIntervals(this.timeSlices,
                                            function(x) { return x.start; },
                                            function(x) { return x.end; },
                                            start,
                                            end,
                                            addStatsForSlice);
      return stats;
    },

    get samples() {
      return this.samples_;
    }
  };

  /**
   * Comparison between threads that orders first by parent.compareTo,
   * then by names, then by tid.
   */
  Thread.compare = function(x, y) {
    var tmp = x.parent.compareTo(y.parent);
    if (tmp)
      return tmp;

    tmp = x.sortIndex - y.sortIndex;
    if (tmp)
      return tmp;

    tmp = tr.b.comparePossiblyUndefinedValues(
        x.name, y.name,
        function(x, y) { return x.localeCompare(y); });
    if (tmp)
      return tmp;

    return x.tid - y.tid;
  };

  return {
    Thread: Thread
  };
});
'use strict';

/**
 * @fileoverview Provides the ProcessBase class.
 */
tr.exportTo('tr.model', function() {

  var Thread = tr.model.Thread;
  var Counter = tr.model.Counter;

  /**
   * The ProcessBase is a partial base class, upon which Kernel
   * and Process are built.
   *
   * @constructor
   * @extends {tr.model.EventContainer}
   */
  function ProcessBase(model) {
    if (!model)
      throw new Error('Must provide a model');
    tr.model.EventContainer.call(this);
    this.model = model;
    this.threads = {};
    this.counters = {};
    this.objects = new tr.model.ObjectCollection(this);
    this.sortIndex = 0;
  };

  ProcessBase.compare = function(x, y) {
    return x.sortIndex - y.sortIndex;
  };

  ProcessBase.prototype = {
    __proto__: tr.model.EventContainer.prototype,

    get stableId() {
      throw new Error('Not implemented');
    },

    iterateAllChildEventContainers: function(callback, opt_this) {
      for (var tid in this.threads)
        callback.call(opt_this, this.threads[tid]);
      for (var id in this.counters)
        callback.call(opt_this, this.counters[id]);
      callback.call(opt_this, this.objects);
    },

    iterateAllEventsInThisContainer: function(eventTypePredicate,
                                              callback, opt_this) {
    },

    iterateAllPersistableObjects: function(cb) {
      cb(this);
      for (var tid in this.threads)
        this.threads[tid].iterateAllPersistableObjects(cb);
    },

    /**
     * Gets the number of threads in this process.
     */
    get numThreads() {
      var n = 0;
      for (var p in this.threads) {
        n++;
      }
      return n;
    },

    /**
     * Shifts all the timestamps inside this process forward by the amount
     * specified.
     */
    shiftTimestampsForward: function(amount) {
      this.iterateAllChildEventContainers(function(child) {
        child.shiftTimestampsForward(amount);
      });
    },

    /**
     * Closes any open slices.
     */
    autoCloseOpenSlices: function(opt_maxTimestamp) {
      for (var tid in this.threads) {
        var thread = this.threads[tid];
        thread.autoCloseOpenSlices(opt_maxTimestamp);
      }
    },

    autoDeleteObjects: function(maxTimestamp) {
      this.objects.autoDeleteObjects(maxTimestamp);
    },

    /**
     * Called by the model after finalizing imports,
     * but before joining refs.
     */
    preInitializeObjects: function() {
      this.objects.preInitializeAllObjects();
    },

    /**
     * Called by the model after joining refs.
     */
    initializeObjects: function() {
      this.objects.initializeAllObjects();
    },

    /**
     * Merge slices from the kernel with those from userland for each thread.
     */
    mergeKernelWithUserland: function() {
      for (var tid in this.threads) {
        var thread = this.threads[tid];
        thread.mergeKernelWithUserland();
      }
    },

    updateBounds: function() {
      this.bounds.reset();
      for (var tid in this.threads) {
        this.threads[tid].updateBounds();
        this.bounds.addRange(this.threads[tid].bounds);
      }
      for (var id in this.counters) {
        this.counters[id].updateBounds();
        this.bounds.addRange(this.counters[id].bounds);
      }
      this.objects.updateBounds();
      this.bounds.addRange(this.objects.bounds);
    },

    addCategoriesToDict: function(categoriesDict) {
      for (var tid in this.threads)
        this.threads[tid].addCategoriesToDict(categoriesDict);
      for (var id in this.counters)
        categoriesDict[this.counters[id].category] = true;
      this.objects.addCategoriesToDict(categoriesDict);
    },

    findAllThreadsMatching: function(predicate, opt_this) {
      var threads = [];
      for (var tid in this.threads) {
        var thread = this.threads[tid];
        if (predicate.call(opt_this, thread))
          threads.push(thread);
      }
      return threads;
    },

    /**
     * @param {String} The name of the thread to find.
     * @return {Array} An array of all the matched threads.
     */
    findAllThreadsNamed: function(name) {
      var threads = this.findAllThreadsMatching(function(thread) {
        if (!thread.name)
          return false;
        return thread.name === name;
      });
      return threads;
    },

    findAtMostOneThreadNamed: function(name) {
      var threads = this.findAllThreadsNamed(name);
      if (threads.length === 0)
        return undefined;
      if (threads.length > 1)
        throw new Error('Expected no more than one ' + name);
      return threads[0];
    },

    /**
     * Removes threads from the process that are fully empty.
     */
    pruneEmptyContainers: function() {
      var threadsToKeep = {};
      for (var tid in this.threads) {
        var thread = this.threads[tid];
        if (!thread.isEmpty)
          threadsToKeep[tid] = thread;
      }
      this.threads = threadsToKeep;
    },

    /**
     * @return {TimelineThread} The thread identified by tid on this process,
     * or undefined if it doesn't exist.
     */
    getThread: function(tid) {
      return this.threads[tid];
    },

    /**
     * @return {TimelineThread} The thread identified by tid on this process,
     * creating it if it doesn't exist.
     */
    getOrCreateThread: function(tid) {
      if (!this.threads[tid])
        this.threads[tid] = new Thread(this, tid);
      return this.threads[tid];
    },

    /**
     * @return {Counter} The counter on this process with the given
     * category/name combination, creating it if it doesn't exist.
     */
    getOrCreateCounter: function(cat, name) {
      var id = cat + '.' + name;
      if (!this.counters[id])
        this.counters[id] = new Counter(this, id, cat, name);
      return this.counters[id];
    },

    getSettingsKey: function() {
      throw new Error('Not implemented');
    },

    createSubSlices: function() {
      for (var tid in this.threads)
        this.threads[tid].createSubSlices();
    }
  };

  return {
    ProcessBase: ProcessBase
  };
});
'use strict';

/**
 * @fileoverview Provides the Process class.
 */
tr.exportTo('tr.model', function() {
  var Cpu = tr.model.Cpu;
  var ProcessBase = tr.model.ProcessBase;

  /**
   * The Kernel represents kernel-level objects in the model.
   * @constructor
   */
  function Kernel(model) {
    ProcessBase.call(this, model);

    this.cpus = {};
    this.softwareMeasuredCpuCount_ = undefined;
  };

  /**
   * Comparison between kernels is pretty meaningless.
   */
  Kernel.compare = function(x, y) {
    return 0;
  };

  Kernel.prototype = {
    __proto__: ProcessBase.prototype,

    compareTo: function(that) {
      return Kernel.compare(this, that);
    },

    get userFriendlyName() {
      return 'Kernel';
    },

    get userFriendlyDetails() {
      return 'Kernel';
    },

    get stableId() {
      return 'Kernel';
    },

    /**
     * @return {Cpu} Gets a specific Cpu or creates one if
     * it does not exist.
     */
    getOrCreateCpu: function(cpuNumber) {
      if (!this.cpus[cpuNumber])
        this.cpus[cpuNumber] = new Cpu(this, cpuNumber);
      return this.cpus[cpuNumber];
    },

    get softwareMeasuredCpuCount() {
      return this.softwareMeasuredCpuCount_;
    },

    set softwareMeasuredCpuCount(softwareMeasuredCpuCount) {
      if (this.softwareMeasuredCpuCount_ !== undefined &&
          this.softwareMeasuredCpuCount_ !== softwareMeasuredCpuCount) {
        throw new Error(
            'Cannot change the softwareMeasuredCpuCount once it is set');
      }

      this.softwareMeasuredCpuCount_ = softwareMeasuredCpuCount;
    },

    /**
     * Estimates how many cpus are in the system, for use in system load
     * estimation.
     *
     * If kernel trace was provided, uses that data. Otherwise, uses the
     * software measured cpu count.
     */
    get bestGuessAtCpuCount() {
      var realCpuCount = tr.b.dictionaryLength(this.cpus);
      if (realCpuCount !== 0)
        return realCpuCount;
      return this.softwareMeasuredCpuCount;
    },

    updateBounds: function() {
      ProcessBase.prototype.updateBounds.call(this);
      for (var cpuNumber in this.cpus) {
        var cpu = this.cpus[cpuNumber];
        cpu.updateBounds();
        this.bounds.addRange(cpu.bounds);
      }
    },

    createSubSlices: function() {
      ProcessBase.prototype.createSubSlices.call(this);
      for (var cpuNumber in this.cpus) {
        var cpu = this.cpus[cpuNumber];
        cpu.createSubSlices();
      }
    },

    addCategoriesToDict: function(categoriesDict) {
      ProcessBase.prototype.addCategoriesToDict.call(this, categoriesDict);
      for (var cpuNumber in this.cpus)
        this.cpus[cpuNumber].addCategoriesToDict(categoriesDict);
    },

    getSettingsKey: function() {
      return 'kernel';
    },

    iterateAllChildEventContainers: function(callback, opt_this) {
      ProcessBase.prototype.iterateAllChildEventContainers.call(
          this, callback, opt_this);
      for (var cpuId in this.cpus)
        callback.call(opt_this, this.cpus[cpuId]);
    },

    iterateAllEventsInThisContainer: function(eventTypePredicate,
                                              callback, opt_this) {
      ProcessBase.prototype.iterateAllEventsInThisContainer.call(
          this, eventTypePredicate, callback, opt_this);
    }
  };

  return {
    Kernel: Kernel
  };
});
'use strict';

/**
 * @fileoverview Provides the Event Index class.
 */
tr.exportTo('tr.model', function() {
  /**
   * A Event Index maps an id to all the events that have that particular id
   *
   * @constructor
   */
  function ModelIndices(model) {
    // For now the only indices we construct are for flowEvents
    this.flowEventsById_ = {};
    model.flowEvents.forEach(function(fe) {
      if (fe.id !== undefined) {
        if (!this.flowEventsById_.hasOwnProperty(fe.id)) {
          this.flowEventsById_[fe.id] = new Array();
        }
        this.flowEventsById_[fe.id].push(fe);
      }
    }, this);
  }

  ModelIndices.prototype = {
    addEventWithId: function(id, event) {
      if (!this.flowEventsById_.hasOwnProperty(id)) {
        this.flowEventsById_[id] = new Array();
      }
      this.flowEventsById_[id].push(event);
    },

    getFlowEventsWithId: function(id) {
      if (!this.flowEventsById_.hasOwnProperty(id))
        return [];
      return this.flowEventsById_[id];
    }
  };

  return {
    ModelIndices: ModelIndices
  };
});
'use strict';

/**
 * @fileoverview Provides the ProcessMemoryDump class.
 */
tr.exportTo('tr.model', function() {

  // Names of MemoryAllocatorDump(s) from which tracing overhead should be
  // discounted.
  var DISCOUNTED_ALLOCATOR_NAMES = ['winheap', 'malloc'];

  var SIZE_ATTRIBUTE_NAME = tr.model.MemoryAllocatorDump.SIZE_ATTRIBUTE_NAME;
  var EFFECTIVE_SIZE_ATTRIBUTE_NAME =
      tr.model.MemoryAllocatorDump.EFFECTIVE_SIZE_ATTRIBUTE_NAME;

  /**
   * The ProcessMemoryDump represents a memory dump of a single process.
   * @constructor
   */
  function ProcessMemoryDump(globalMemoryDump, process, start) {
    tr.model.ContainerMemoryDump.call(this, start);
    this.process = process;
    this.globalMemoryDump = globalMemoryDump;

    this.totals = undefined;
    this.vmRegions_ = undefined;

    this.tracingMemoryDiscounted_ = false;
  };

  ProcessMemoryDump.prototype = {
    __proto__: tr.model.ContainerMemoryDump.prototype,

    get userFriendlyName() {
      return 'Process memory dump at ' +
          tr.b.u.TimeStamp.format(this.start);
    },

    get containerName() {
      return this.process.userFriendlyName;
    },

    get processMemoryDumps() {
      var dumps = {};
      dumps[this.process.pid] = this;
      return dumps;
    },

    get vmRegions() {
      throw new Error(
          'VM regions must be accessed through the mostRecentVmRegions field');
    },

    set vmRegions(vmRegions) {
      this.vmRegions_ = vmRegions;
    },

    get hasOwnVmRegions() {
      return this.vmRegions_ !== undefined;
    },

    getMostRecentTotalVmRegionStat: function(statName) {
      if (this.mostRecentVmRegions === undefined)
        return undefined;

      var total = 0;
      this.mostRecentVmRegions.forEach(function(vmRegion) {
        var statValue = vmRegion.byteStats[statName];
        if (statValue === undefined)
          return;
        total += statValue;
      });
      return total;
    },

    discountTracingOverhead: function(opt_model) {
      // Make sure that calling this method twice won't lead to
      // 'double-discounting'.
      if (this.tracingMemoryDiscounted_)
        return;
      this.tracingMemoryDiscounted_ = true;

      var tracingDump = this.getMemoryAllocatorDumpByFullName('tracing');
      if (tracingDump === undefined)
        return;

      function getDiscountedSize(sizeAttrName) {
        var sizeAttr = tracingDump.getValidSizeAttributeOrUndefined(
            sizeAttrName, opt_model);
        if (sizeAttr === undefined)
          return 0;
        return sizeAttr.value;
      }

      var discountedSize = getDiscountedSize(SIZE_ATTRIBUTE_NAME);
      var discountedEffectiveSize =
          getDiscountedSize(EFFECTIVE_SIZE_ATTRIBUTE_NAME);
      var discountedResidentSize = getDiscountedSize('resident_size');

      // Subtract 'resident_size' from totals and VM regions stats.
      if (discountedResidentSize > 0) {
        // Subtract the tracing size from the totals.
        if (this.totals !== undefined) {
          if (this.totals.residentBytes !== undefined)
            this.totals.residentBytes -= discountedResidentSize;
          if (this.totals.peakResidentBytes !== undefined)
            this.totals.peakResidentBytes -= discountedResidentSize;
        }

        // Subtract the tracing size from VM regions.
        if (this.vmRegions_ !== undefined) {
          this.vmRegions_.push(VMRegion.fromDict({
            mappedFile: '[discounted tracing overhead]',
            byteStats: {
              privateDirtyResident: -discountedResidentSize,
              proportionalResident: -discountedResidentSize
            }
          }));
        }
      }

      // Subtract 'size' and 'effective_size' from the 'winheap' or 'malloc'
      // MemoryAllocatorDump.
      if (discountedSize > 0 || discountedEffectiveSize > 0) {
        function discountSizeAndEffectiveSize(dump) {
          var dumpSizeAttr = dump.getValidSizeAttributeOrUndefined(
              SIZE_ATTRIBUTE_NAME, opt_model);
          if (dumpSizeAttr !== undefined)
            dumpSizeAttr.value -= discountedSize;

          var dumpEffectiveSizeAttr = dump.getValidSizeAttributeOrUndefined(
              EFFECTIVE_SIZE_ATTRIBUTE_NAME, opt_model);
          if (dumpEffectiveSizeAttr !== undefined)
            dumpEffectiveSizeAttr.value -= discountedEffectiveSize;
        }

        var hasDiscountedFromAllocatorDumps = DISCOUNTED_ALLOCATOR_NAMES.some(
            function(allocatorName) {
          // Discount 'size' and 'effective_size' from the allocator root.
          var allocatorDump = this.getMemoryAllocatorDumpByFullName(
              allocatorName);
          if (allocatorDump === undefined)
            return false;  // Allocator doesn't exist, try another one.
          discountSizeAndEffectiveSize(allocatorDump);

          // Discount 'size' and 'effective_size' from allocated objects of the
          // allocator ('<ALLOCATOR>/allocated_objects').
          var allocatedObjectsDumpName = allocatorName + '/allocated_objects';
          var allocatedObjectsDump = this.getMemoryAllocatorDumpByFullName(
              allocatedObjectsDumpName);
          if (allocatedObjectsDump === undefined)
            return true;  // Allocator has unexpected structure, good enough.
          discountSizeAndEffectiveSize(allocatedObjectsDump);

          // Add a child MAD representing the discounted tracing overhead
          // ('<ALLOCATOR>/allocated_objects/discounted_tracing_overhead').
          var discountDumpName =
              allocatedObjectsDumpName + '/discounted_tracing_overhead';
          var discountDump = new tr.model.MemoryAllocatorDump(
              this, discountDumpName);
          discountDump.parent = allocatedObjectsDump;
          discountDump.addAttribute(SIZE_ATTRIBUTE_NAME,
              new tr.model.ScalarAttribute('bytes', -discountedSize));
          discountDump.addAttribute(EFFECTIVE_SIZE_ATTRIBUTE_NAME,
              new tr.model.ScalarAttribute('bytes', -discountedEffectiveSize));
          allocatedObjectsDump.children.push(discountDump);

          return true;
        }, this);

        // Force rebuilding the memory allocator dump index (if we've just added
        // a new memory allocator dump).
        if (hasDiscountedFromAllocatorDumps)
          this.memoryAllocatorDumps = this.memoryAllocatorDumps;
      }
    }
  };

  ProcessMemoryDump.hookUpMostRecentVmRegionsLinks = function(processDumps) {
    var mostRecentVmRegions = undefined;

    processDumps.forEach(function(processDump) {
      // Update the most recent VM regions from the current dump.
      if (processDump.vmRegions_ !== undefined)
        mostRecentVmRegions = processDump.vmRegions_;

      // Set the most recent VM regions of the current dump.
      processDump.mostRecentVmRegions = mostRecentVmRegions;
    });
  };

  /**
   * @constructor
   */
  function VMRegion(startAddress, sizeInBytes, protectionFlags,
      mappedFile, byteStats) {
    this.startAddress = startAddress;
    this.sizeInBytes = sizeInBytes;
    this.protectionFlags = protectionFlags;
    this.mappedFile = mappedFile;
    this.byteStats = byteStats;
  };

  VMRegion.PROTECTION_FLAG_READ = 4;
  VMRegion.PROTECTION_FLAG_WRITE = 2;
  VMRegion.PROTECTION_FLAG_EXECUTE = 1;

  VMRegion.prototype = {
    get protectionFlagsToString() {
      if (this.protectionFlags === undefined)
        return undefined;
      return (
          (this.protectionFlags & VMRegion.PROTECTION_FLAG_READ ? 'r' : '-') +
          (this.protectionFlags & VMRegion.PROTECTION_FLAG_WRITE ? 'w' : '-') +
          (this.protectionFlags & VMRegion.PROTECTION_FLAG_EXECUTE ? 'x' : '-')
      );
    }
  };

  VMRegion.fromDict = function(dict) {
    return new VMRegion(
        dict.startAddress,
        dict.sizeInBytes,
        dict.protectionFlags,
        dict.mappedFile,
        VMRegionByteStats.fromDict(dict.byteStats));
  };

  /**
   * @constructor
   */
  function VMRegionByteStats(privateCleanResident, privateDirtyResident,
                             sharedCleanResident, sharedDirtyResident,
                             proportionalResident, swapped) {
    this.privateCleanResident = privateCleanResident;
    this.privateDirtyResident = privateDirtyResident;
    this.sharedCleanResident = sharedCleanResident;
    this.sharedDirtyResident = sharedDirtyResident;
    this.proportionalResident = proportionalResident;
    this.swapped = swapped;
  }

  VMRegionByteStats.fromDict = function(dict) {
    return new VMRegionByteStats(
        dict.privateCleanResident,
        dict.privateDirtyResident,
        dict.sharedCleanResident,
        dict.sharedDirtyResident,
        dict.proportionalResident,
        dict.swapped);
  }

  tr.model.EventRegistry.register(
      ProcessMemoryDump,
      {
        name: 'processMemoryDump',
        pluralName: 'processMemoryDumps',
        singleViewElementName: 'tr-ui-a-container-memory-dump-sub-view',
        multiViewElementName: 'tr-ui-a-container-memory-dump-sub-view'
      });

  return {
    ProcessMemoryDump: ProcessMemoryDump,
    VMRegion: VMRegion,
    VMRegionByteStats: VMRegionByteStats
  };
});
'use strict';

/**
 * @fileoverview Provides the Process class.
 */
tr.exportTo('tr.model', function() {
  var ProcessBase = tr.model.ProcessBase;
  var ProcessInstantEvent = tr.model.ProcessInstantEvent;
  var Frame = tr.model.Frame;
  var ProcessMemoryDump = tr.model.ProcessMemoryDump;

  /**
   * The Process represents a single userland process in the
   * trace.
   * @constructor
   */
  function Process(model, pid) {
    if (model === undefined)
      throw new Error('model must be provided');
    if (pid === undefined)
      throw new Error('pid must be provided');
    tr.model.ProcessBase.call(this, model);
    this.pid = pid;
    this.name = undefined;
    this.labels = [];
    this.instantEvents = [];
    this.memoryDumps = [];
    this.frames = [];
    this.activities = [];
  };

  /**
   * Comparison between processes that orders by pid.
   */
  Process.compare = function(x, y) {
    var tmp = tr.model.ProcessBase.compare(x, y);
    if (tmp)
      return tmp;

    tmp = tr.b.comparePossiblyUndefinedValues(
        x.name, y.name,
        function(x, y) { return x.localeCompare(y); });
    if (tmp)
      return tmp;

    tmp = tr.b.compareArrays(x.labels, y.labels,
        function(x, y) { return x.localeCompare(y); });
    if (tmp)
      return tmp;

    return x.pid - y.pid;
  };

  Process.prototype = {
    __proto__: tr.model.ProcessBase.prototype,

    get stableId() {
      return this.pid;
    },

    compareTo: function(that) {
      return Process.compare(this, that);
    },

    iterateAllEventsInThisContainer: function(eventTypePredicate,
                                              callback, opt_this) {
      ProcessBase.prototype.iterateAllEventsInThisContainer.call(
          this, eventTypePredicate, callback, opt_this);

      if (eventTypePredicate.call(opt_this, ProcessInstantEvent))
        this.instantEvents.forEach(callback, opt_this);

      if (eventTypePredicate.call(opt_this, Frame))
        this.frames.forEach(callback, opt_this);

      if (eventTypePredicate.call(opt_this, ProcessMemoryDump))
        this.memoryDumps.forEach(callback, opt_this);
    },

    pushInstantEvent: function(instantEvent) {
      this.instantEvents.push(instantEvent);
    },

    addLabelIfNeeded: function(labelName) {
      for (var i = 0; i < this.labels.length; i++) {
        if (this.labels[i] === labelName)
          return;
      }
      this.labels.push(labelName);
    },

    get userFriendlyName() {
      var res;
      if (this.name)
        res = this.name + ' (pid ' + this.pid + ')';
      else
        res = 'Process ' + this.pid;
      if (this.labels.length)
        res += ': ' + this.labels.join(', ');
      return res;
    },

    get userFriendlyDetails() {
      if (this.name)
        return this.name + ' (pid ' + this.pid + ')';
      return 'pid: ' + this.pid;
    },

    getSettingsKey: function() {
      if (!this.name)
        return undefined;
      if (!this.labels.length)
        return 'processes.' + this.name;
      return 'processes.' + this.name + '.' + this.labels.join('.');
    },

    shiftTimestampsForward: function(amount) {
      for (var id in this.instantEvents)
        this.instantEvents[id].start += amount;

      for (var i = 0; i < this.frames.length; i++)
        this.frames[i].shiftTimestampsForward(amount);

      for (var i = 0; i < this.memoryDumps.length; i++)
        this.memoryDumps[i].shiftTimestampsForward(amount);

      for (var i = 0; i < this.activities.length; i++)
        this.activities[i].shiftTimestampsForward(amount);

      tr.model.ProcessBase.prototype
          .shiftTimestampsForward.apply(this, arguments);
    },

    updateBounds: function() {
      tr.model.ProcessBase.prototype.updateBounds.apply(this);

      for (var i = 0; i < this.frames.length; i++)
        this.frames[i].addBoundsToRange(this.bounds);

      for (var i = 0; i < this.memoryDumps.length; i++)
        this.memoryDumps[i].addBoundsToRange(this.bounds);

      for (var i = 0; i < this.activities.length; i++)
        this.activities[i].addBoundsToRange(this.bounds);
    },

    sortMemoryDumps: function() {
      this.memoryDumps.sort(function(x, y) {
        return x.start - y.start;
      });
      tr.model.ProcessMemoryDump.hookUpMostRecentVmRegionsLinks(
          this.memoryDumps);
    }
  };

  return {
    Process: Process
  };
});
'use strict';

/**
 * @fileoverview Provides the Sample class.
 */
tr.exportTo('tr.model', function() {
  /**
   * A Sample represents a sample taken at an instant in time, plus its stack
   * frame and parameters associated with that sample.
   *
   * @constructor
   */
  function Sample(cpu, thread, title, start, leafStackFrame,
                  opt_weight, opt_args) {
    tr.model.TimedEvent.call(this, start);

    this.title = title;
    this.cpu = cpu;
    this.thread = thread;
    this.leafStackFrame = leafStackFrame;
    this.weight = opt_weight;
    this.args = opt_args || {};
  }

  Sample.prototype = {
    __proto__: tr.model.TimedEvent.prototype,

    get colorId() {
      return this.leafStackFrame.colorId;
    },

    get stackTrace() {
      return this.leafStackFrame.stackTrace;
    },

    getUserFriendlyStackTrace: function() {
      return this.leafStackFrame.getUserFriendlyStackTrace();
    },

    get userFriendlyName() {
      return 'Sample at ' + tr.b.u.TimeStamp.format(this.start);
    }
  };

  tr.model.EventRegistry.register(
      Sample,
      {
        name: 'sample',
        pluralName: 'samples',
        singleViewElementName: 'tr-ui-a-single-sample-sub-view',
        multiViewElementName: 'tr-ui-a-multi-sample-sub-view'
      });

  return {
    Sample: Sample
  };
});
'use strict';

tr.exportTo('tr.model', function() {
  function StackFrame(parentFrame, id, title, colorId, opt_sourceInfo) {
    if (id === undefined)
      throw new Error('id must be given');
    this.parentFrame_ = parentFrame;
    this.id = id;
    this.title_ = title;
    this.colorId = colorId;
    this.children = [];
    this.sourceInfo_ = opt_sourceInfo;

    if (this.parentFrame_)
      this.parentFrame_.addChild(this);
  }

  StackFrame.prototype = {
    get parentFrame() {
      return this.parentFrame_;
    },

    get title() {
      if (this.sourceInfo_) {
        var src = this.sourceInfo_.toString();
        return this.title_ + (src === '' ? '' : ' ' + src);
      }
      return this.title_;
    },

    /**
     * Attempts to find the domain of the origin of the script either from this
     * stack trace or from its ancestors.
     */
    get domain() {
      var result = 'unknown';
      if (this.sourceInfo_ && this.sourceInfo_.domain)
        result = this.sourceInfo_.domain;
      if (result === 'unknown' && this.parentFrame)
        result = this.parentFrame.domain;
      return result;
    },

    get sourceInfo() {
      return this.sourceInfo_;
    },

    set parentFrame(parentFrame) {
      if (this.parentFrame_)
        this.parentFrame_.removeChild(this);
      this.parentFrame_ = parentFrame;
      if (this.parentFrame_)
        this.parentFrame_.addChild(this);
    },

    addChild: function(child) {
      this.children.push(child);
    },

    removeChild: function(child) {
      var i = this.children.indexOf(child.id);
      if (i == -1)
        throw new Error('omg');
      this.children.splice(i, 1);
    },

    removeAllChildren: function() {
      for (var i = 0; i < this.children.length; i++)
        this.children[i].parentFrame_ = undefined;
      this.children.splice(0, this.children.length);
    },

    /**
     * Returns stackFrames where the most specific frame is first.
     */
    get stackTrace() {
      var stack = [];
      var cur = this;
      while (cur) {
        stack.push(cur);
        cur = cur.parentFrame;
      }
      return stack;
    },

    getUserFriendlyStackTrace: function() {
      return this.stackTrace.map(function(x) { return x.title; });
    }
  };

  return {
    StackFrame: StackFrame
  };
});
'use strict';

tr.exportTo('tr.ui.b', function() {

  /**
   * Decorates elements as an instance of a class.
   * @param {string|!Element} source The way to find the element(s) to decorate.
   *     If this is a string then {@code querySeletorAll} is used to find the
   *     elements to decorate.
   * @param {!Function} constr The constructor to decorate with. The constr
   *     needs to have a {@code decorate} function.
   */
  function decorate(source, constr) {
    var elements;
    if (typeof source == 'string')
      elements = tr.doc.querySelectorAll(source);
    else
      elements = [source];

    for (var i = 0, el; el = elements[i]; i++) {
      if (!(el instanceof constr))
        constr.decorate(el);
    }
  }

  /**
   * Defines a tracing UI component, a function that can be called to construct
   * the component.
   *
   * tr class:
   * var List = tr.ui.b.define('list');
   * List.prototype = {
   *   __proto__: HTMLUListElement.prototype,
   *   decorate: function() {
   *     ...
   *   },
   *   ...
   * };
   *
   * Derived class:
   * var CustomList = tr.ui.b.define('custom-list', List);
   * CustomList.prototype = {
   *   __proto__: List.prototype,
   *   decorate: function() {
   *     ...
   *   },
   *   ...
   * };
   *
   * @param {string} className The className of the newly created subtype. If
   *     subclassing by passing in opt_parentConstructor, this is used for
   *     debugging. If not subclassing, then it is the tag name that will be
   *     created by the component.

   * @param {function=} opt_parentConstructor The parent class for this new
   *     element, if subclassing is desired. If provided, the parent class must
   *     be also a function created by tr.ui.b.define.
   *
   * @param {string=} opt_tagNS The namespace in which to create the base
   *     element. Has no meaning when opt_parentConstructor is passed and must
   *     either be undefined or the same namespace as the parent class.
   *
   * @return {function(Object=):Element} The newly created component
   *     constructor.
   */
  function define(className, opt_parentConstructor, opt_tagNS) {
    if (typeof className == 'function') {
      throw new Error('Passing functions as className is deprecated. Please ' +
                      'use (className, opt_parentConstructor) to subclass');
    }

    var className = className.toLowerCase();
    if (opt_parentConstructor && !opt_parentConstructor.tagName)
      throw new Error('opt_parentConstructor was not ' +
                      'created by tr.ui.b.define');

    // Walk up the parent constructors until we can find the type of tag
    // to create.
    var tagName = className;
    var tagNS = undefined;
    if (opt_parentConstructor) {
      if (opt_tagNS)
        throw new Error('Must not specify tagNS if parentConstructor is given');
      var parent = opt_parentConstructor;
      while (parent && parent.tagName) {
        tagName = parent.tagName;
        tagNS = parent.tagNS;
        parent = parent.parentConstructor;
      }
    } else {
      tagNS = opt_tagNS;
    }

    /**
     * Creates a new UI element constructor.
     * Arguments passed to the constuctor are provided to the decorate method.
     * You will need to call the parent elements decorate method from within
     * your decorate method and pass any required parameters.
     * @constructor
     */
    function f() {
      if (opt_parentConstructor &&
          f.prototype.__proto__ != opt_parentConstructor.prototype) {
        throw new Error(
            className + ' prototye\'s __proto__ field is messed up. ' +
            'It MUST be the prototype of ' + opt_parentConstructor.tagName);
      }

      var el;
      if (tagNS === undefined)
        el = tr.doc.createElement(tagName);
      else
        el = tr.doc.createElementNS(tagNS, tagName);
      f.decorate.call(this, el, arguments);
      return el;
    }

    /**
     * Decorates an element as a UI element class.
     * @param {!Element} el The element to decorate.
     */
    f.decorate = function(el) {
      el.__proto__ = f.prototype;
      el.decorate.apply(el, arguments[1]);
      el.constructor = f;
    };

    f.className = className;
    f.tagName = tagName;
    f.tagNS = tagNS;
    f.parentConstructor = (opt_parentConstructor ? opt_parentConstructor :
                                                   undefined);
    f.toString = function() {
      if (!f.parentConstructor)
        return f.tagName;
      return f.parentConstructor.toString() + '::' + f.className;
    };

    return f;
  }

  function elementIsChildOf(el, potentialParent) {
    if (el == potentialParent)
      return false;

    var cur = el;
    while (cur.parentNode) {
      if (cur == potentialParent)
        return true;
      cur = cur.parentNode;
    }
    return false;
  };

  return {
    decorate: decorate,
    define: define,
    elementIsChildOf: elementIsChildOf
  };
});
'use strict';

tr.exportTo('tr.b', function() {
  function clamp(x, lo, hi) {
    return Math.min(Math.max(x, lo), hi);
  }

  function lerp(percentage, lo, hi) {
    var range = hi - lo;
    return lo + percentage * range;
  }

  function normalize(value, lo, hi) {
    return (value - lo) / (hi - lo);
  }

  function deg2rad(deg) {
    return (Math.PI * deg) / 180.0;
  }

  var tmp_vec2 = vec2.create();
  var tmp_vec2b = vec2.create();
  var tmp_vec4 = vec4.create();
  var tmp_mat2d = mat2d.create();

  vec2.createFromArray = function(arr) {
    if (arr.length != 2)
      throw new Error('Should be length 2');
    var v = vec2.create();
    vec2.set(v, arr[0], arr[1]);
    return v;
  };

  vec2.createXY = function(x, y) {
    var v = vec2.create();
    vec2.set(v, x, y);
    return v;
  };

  vec2.toString = function(a) {
    return '[' + a[0] + ', ' + a[1] + ']';
  };

  vec2.addTwoScaledUnitVectors = function(out, u1, scale1, u2, scale2) {
    // out = u1 * scale1 + u2 * scale2
    vec2.scale(tmp_vec2, u1, scale1);
    vec2.scale(tmp_vec2b, u2, scale2);
    vec2.add(out, tmp_vec2, tmp_vec2b);
  };

  vec2.interpolatePiecewiseFunction = function(points, x) {
    if (x < points[0][0])
      return points[0][1];
    for (var i = 1; i < points.length; ++i) {
      if (x < points[i][0]) {
        var percent = normalize(x, points[i - 1][0], points[i][0]);
        return lerp(percent, points[i - 1][1], points[i][1]);
      }
    }
    return points[points.length - 1][1];
  };

  vec3.createXYZ = function(x, y, z) {
    var v = vec3.create();
    vec3.set(v, x, y, z);
    return v;
  };

  vec3.toString = function(a) {
    return 'vec3(' + a[0] + ', ' + a[1] + ', ' + a[2] + ')';
  }

  mat2d.translateXY = function(out, x, y) {
    vec2.set(tmp_vec2, x, y);
    mat2d.translate(out, out, tmp_vec2);
  }

  mat2d.scaleXY = function(out, x, y) {
    vec2.set(tmp_vec2, x, y);
    mat2d.scale(out, out, tmp_vec2);
  }

  vec4.unitize = function(out, a) {
    out[0] = a[0] / a[3];
    out[1] = a[1] / a[3];
    out[2] = a[2] / a[3];
    out[3] = 1;
    return out;
  }

  vec2.copyFromVec4 = function(out, a) {
    vec4.unitize(tmp_vec4, a);
    vec2.copy(out, tmp_vec4);
  }

  return {
    clamp: clamp,
    lerp: lerp,
    normalize: normalize,
    deg2rad: deg2rad
  };

});
'use strict';

/**
 * @fileoverview 2D Rectangle math.
 */

tr.exportTo('tr.b', function() {

  /**
   * Tracks a 2D bounding box.
   * @constructor
   */
  function Rect() {
    this.x = 0;
    this.y = 0;
    this.width = 0;
    this.height = 0;
  };
  Rect.fromXYWH = function(x, y, w, h) {
    var rect = new Rect();
    rect.x = x;
    rect.y = y;
    rect.width = w;
    rect.height = h;
    return rect;
  }
  Rect.fromArray = function(ary) {
    if (ary.length != 4)
      throw new Error('ary.length must be 4');
    var rect = new Rect();
    rect.x = ary[0];
    rect.y = ary[1];
    rect.width = ary[2];
    rect.height = ary[3];
    return rect;
  }

  Rect.prototype = {
    __proto__: Object.prototype,

    get left() {
      return this.x;
    },

    get top() {
      return this.y;
    },

    get right() {
      return this.x + this.width;
    },

    get bottom() {
      return this.y + this.height;
    },

    toString: function() {
      return 'Rect(' + this.x + ', ' + this.y + ', ' +
          this.width + ', ' + this.height + ')';
    },

    toArray: function() {
      return [this.x, this.y, this.width, this.height];
    },

    clone: function() {
      var rect = new Rect();
      rect.x = this.x;
      rect.y = this.y;
      rect.width = this.width;
      rect.height = this.height;
      return rect;
    },

    enlarge: function(pad) {
      var rect = new Rect();
      this.enlargeFast(rect, pad);
      return rect;
    },

    enlargeFast: function(out, pad) {
      out.x = this.x - pad;
      out.y = this.y - pad;
      out.width = this.width + 2 * pad;
      out.height = this.height + 2 * pad;
      return out;
    },

    size: function() {
      return {width: this.width, height: this.height};
    },

    scale: function(s) {
      var rect = new Rect();
      this.scaleFast(rect, s);
      return rect;
    },

    scaleSize: function(s) {
      return Rect.fromXYWH(this.x, this.y, this.width * s, this.height * s);
    },

    scaleFast: function(out, s) {
      out.x = this.x * s;
      out.y = this.y * s;
      out.width = this.width * s;
      out.height = this.height * s;
      return out;
    },

    translate: function(v) {
      var rect = new Rect();
      this.translateFast(rect, v);
      return rect;
    },

    translateFast: function(out, v) {
      out.x = this.x + v[0];
      out.y = this.x + v[1];
      out.width = this.width;
      out.height = this.height;
      return out;
    },

    asUVRectInside: function(containingRect) {
      var rect = new Rect();
      rect.x = (this.x - containingRect.x) / containingRect.width;
      rect.y = (this.y - containingRect.y) / containingRect.height;
      rect.width = this.width / containingRect.width;
      rect.height = this.height / containingRect.height;
      return rect;
    },

    intersects: function(that) {
      var ok = true;
      ok &= this.x < that.right;
      ok &= this.right > that.x;
      ok &= this.y < that.bottom;
      ok &= this.bottom > that.y;
      return ok;
    },

    equalTo: function(rect) {
      return rect &&
             (this.x === rect.x) &&
             (this.y === rect.y) &&
             (this.width === rect.width) &&
             (this.height === rect.height);
    }
  };

  return {
    Rect: Rect
  };

});
'use strict';

tr.exportTo('tr.ui.b', function() {
  function instantiateTemplate(selector, doc) {
    doc = doc || document;
    var el = doc.querySelector(selector);
    if (!el)
      throw new Error('Element not found');
    return el.createInstance();
  }

  function windowRectForElement(element) {
    var position = [element.offsetLeft, element.offsetTop];
    var size = [element.offsetWidth, element.offsetHeight];
    var node = element.offsetParent;
    while (node) {
      position[0] += node.offsetLeft;
      position[1] += node.offsetTop;
      node = node.offsetParent;
    }
    return tr.b.Rect.fromXYWH(position[0], position[1], size[0], size[1]);
  }

  function scrollIntoViewIfNeeded(el) {
    var pr = el.parentElement.getBoundingClientRect();
    var cr = el.getBoundingClientRect();
    if (cr.top < pr.top) {
      el.scrollIntoView(true);
    } else if (cr.bottom > pr.bottom) {
      el.scrollIntoView(false);
    }
  }

  return {
    instantiateTemplate: instantiateTemplate,
    windowRectForElement: windowRectForElement,
    scrollIntoViewIfNeeded: scrollIntoViewIfNeeded
  };
});
'use strict';

/**
 * @fileoverview Implements an element that is hidden by default, but
 * when shown, dims and (attempts to) disable the main document.
 *
 * You can turn any div into an overlay. Note that while an
 * overlay element is shown, its parent is changed. Hiding the overlay
 * restores its original parentage.
 *
 */
tr.exportTo('tr.ui.b', function() {
  if (tr.isHeadless)
    return {};

  var THIS_DOC = document.currentScript.ownerDocument;

  /**
   * Creates a new overlay element. It will not be visible until shown.
   * @constructor
   * @extends {HTMLDivElement}
   */
  var Overlay = tr.ui.b.define('overlay');

  Overlay.prototype = {
    __proto__: HTMLDivElement.prototype,

    /**
     * Initializes the overlay element.
     */
    decorate: function() {
      this.classList.add('overlay');

      this.parentEl_ = this.ownerDocument.body;

      this.visible_ = false;
      this.userCanClose_ = true;

      this.onKeyDown_ = this.onKeyDown_.bind(this);
      this.onClick_ = this.onClick_.bind(this);
      this.onFocusIn_ = this.onFocusIn_.bind(this);
      this.onDocumentClick_ = this.onDocumentClick_.bind(this);
      this.onClose_ = this.onClose_.bind(this);

      this.addEventListener('visible-change',
          tr.ui.b.Overlay.prototype.onVisibleChange_.bind(this), true);

      // Setup the shadow root
      var createShadowRoot = this.createShadowRoot ||
          this.webkitCreateShadowRoot;
      this.shadow_ = createShadowRoot.call(this);
      this.shadow_.appendChild(tr.ui.b.instantiateTemplate('#overlay-template',
                                                        THIS_DOC));

      this.closeBtn_ = this.shadow_.querySelector('close-button');
      this.closeBtn_.addEventListener('click', this.onClose_);

      this.shadow_
          .querySelector('overlay-frame')
          .addEventListener('click', this.onClick_);

      this.observer_ = new WebKitMutationObserver(
          this.didButtonBarMutate_.bind(this));
      this.observer_.observe(this.shadow_.querySelector('button-bar'),
                             { childList: true });

      // title is a variable on regular HTMLElements. However, we want to
      // use it for something more useful.
      Object.defineProperty(
          this, 'title', {
            get: function() {
              return this.shadow_.querySelector('title').textContent;
            },
            set: function(title) {
              this.shadow_.querySelector('title').textContent = title;
            }
          });
    },

    set userCanClose(userCanClose) {
      this.userCanClose_ = userCanClose;
      this.closeBtn_.style.display =
          userCanClose ? 'block' : 'none';
    },

    get buttons() {
      return this.shadow_.querySelector('button-bar');
    },

    get visible() {
      return this.visible_;
    },

    set visible(newValue) {
      if (this.visible_ === newValue)
        return;

      this.visible_ = newValue;
      var e = new tr.b.Event('visible-change');
      this.dispatchEvent(e);
    },

    onVisibleChange_: function() {
      this.visible_ ? this.show_() : this.hide_();
    },

    show_: function() {
      this.parentEl_.appendChild(this);

      if (this.userCanClose_) {
        this.addEventListener('keydown', this.onKeyDown_.bind(this));
        this.addEventListener('click', this.onDocumentClick_.bind(this));
      }

      this.parentEl_.addEventListener('focusin', this.onFocusIn_);
      this.tabIndex = 0;

      // Focus the first thing we find that makes sense. (Skip the close button
      // as it doesn't make sense as the first thing to focus.)
      var focusEl = undefined;
      var elList = this.querySelectorAll('button, input, list, select, a');
      if (elList.length > 0) {
        if (elList[0] === this.closeBtn_) {
          if (elList.length > 1)
            focusEl = elList[1];
        } else {
          focusEl = elList[0];
        }
      }
      if (focusEl === undefined)
        focusEl = this;
      focusEl.focus();
    },

    hide_: function() {
      this.parentEl_.removeChild(this);

      this.parentEl_.removeEventListener('focusin', this.onFocusIn_);

      if (this.closeBtn_)
        this.closeBtn_.removeEventListener(this.onClose_);

      document.removeEventListener('keydown', this.onKeyDown_);
      document.removeEventListener('click', this.onDocumentClick_);
    },

    onClose_: function(e) {
      this.visible = false;
      if ((e.type != 'keydown') ||
          (e.type === 'keydown' && e.keyCode === 27))
        e.stopPropagation();
      e.preventDefault();
      tr.b.dispatchSimpleEvent(this, 'closeclick');
    },

    onFocusIn_: function(e) {
      if (e.target === this)
        return;

      window.setTimeout(function() { this.focus(); }, 0);
      e.preventDefault();
      e.stopPropagation();
    },

    didButtonBarMutate_: function(e) {
      var hasButtons = this.buttons.children.length > 0;
      if (hasButtons)
        this.shadow_.querySelector('button-bar').style.display = undefined;
      else
        this.shadow_.querySelector('button-bar').style.display = 'none';
    },

    onKeyDown_: function(e) {
      // Disallow shift-tab back to another element.
      if (e.keyCode === 9 &&  // tab
          e.shiftKey &&
          e.target === this) {
        e.preventDefault();
        return;
      }

      if (e.keyCode !== 27)  // escape
        return;

      this.onClose_(e);
    },

    onClick_: function(e) {
      e.stopPropagation();
    },

    onDocumentClick_: function(e) {
      if (!this.userCanClose_)
        return;

      this.onClose_(e);
    }
  };

  Overlay.showError = function(msg, opt_err) {
    var o = new Overlay();
    o.title = 'Error';
    o.textContent = msg;
    if (opt_err) {
      var e = tr.b.normalizeException(opt_err);

      var stackDiv = document.createElement('pre');
      stackDiv.textContent = e.stack;
      stackDiv.style.paddingLeft = '8px';
      stackDiv.style.margin = 0;
      o.appendChild(stackDiv);
    }
    var b = document.createElement('button');
    b.textContent = 'OK';
    b.addEventListener('click', function() {
      o.visible = false;
    });
    o.buttons.appendChild(b);
    o.visible = true;
    return o;
  }

  return {
    Overlay: Overlay
  };
});
'use strict';

/**
 * @fileoverview Model is a parsed representation of the
 * TraceEvents obtained from base/trace_event in which the begin-end
 * tokens are converted into a hierarchy of processes, threads,
 * subrows, and slices.
 *
 * The building block of the model is a slice. A slice is roughly
 * equivalent to function call executing on a specific thread. As a
 * result, slices may have one or more subslices.
 *
 * A thread contains one or more subrows of slices. Row 0 corresponds to
 * the "root" slices, e.g. the topmost slices. Row 1 contains slices that
 * are nested 1 deep in the stack, and so on. We use these subrows to draw
 * nesting tasks.
 *
 */
tr.exportTo('tr', function() {
  var Process = tr.model.Process;
  var Device = tr.model.Device;
  var Kernel = tr.model.Kernel;
  var GlobalMemoryDump = tr.model.GlobalMemoryDump;
  var GlobalInstantEvent = tr.model.GlobalInstantEvent;
  var FlowEvent = tr.model.FlowEvent;
  var Alert = tr.model.Alert;
  var InteractionRecord = tr.model.InteractionRecord;
  var Sample = tr.model.Sample;

  function ClockSyncRecord(name, ts, args) {
    this.name = name;
    this.ts = ts;
    this.args = args;
  }

  /**
   * @constructor
   */
  function Model() {
    tr.model.EventContainer.call(this);
    tr.b.EventTarget.decorate(this);

    this.timestampShiftToZeroAmount_ = 0;

    this.faviconHue = 'blue'; // Should be a key from favicons.html

    this.device = new Device(this);
    this.kernel = new Kernel(this);
    this.processes = {};
    this.metadata = [];
    this.categories = [];
    this.instantEvents = [];
    this.flowEvents = [];
    this.clockSyncRecords = [];
    this.intrinsicTimeUnit_ = undefined;

    this.stackFrames = {};
    this.samples = [];

    this.alerts = [];
    this.interactionRecords = [];

    this.flowIntervalTree = new tr.b.IntervalTree(
        function(f) { return f.start; },
        function(f) { return f.end; });

    this.globalMemoryDumps = [];

    this.annotationsByGuid_ = {};
    this.modelIndices = undefined;

    this.importWarnings_ = [];
    this.reportedImportWarnings_ = {};
  }

  Model.prototype = {
    __proto__: tr.model.EventContainer.prototype,

    iterateAllEventsInThisContainer: function(eventTypePredicate,
                                              callback, opt_this) {
      if (eventTypePredicate.call(opt_this, GlobalMemoryDump))
        this.globalMemoryDumps.forEach(callback, opt_this);

      if (eventTypePredicate.call(opt_this, GlobalInstantEvent))
        this.instantEvents.forEach(callback, opt_this);

      if (eventTypePredicate.call(opt_this, FlowEvent))
        this.flowEvents.forEach(callback, opt_this);

      if (eventTypePredicate.call(opt_this, Alert))
        this.alerts.forEach(callback, opt_this);

      if (eventTypePredicate.call(opt_this, InteractionRecord))
        this.interactionRecords.forEach(callback, opt_this);

      if (eventTypePredicate.call(opt_this, Sample))
        this.samples.forEach(callback, opt_this);
    },

    iterateAllChildEventContainers: function(callback, opt_this) {
      callback.call(opt_this, this.device);
      callback.call(opt_this, this.kernel);
      for (var pid in this.processes)
        callback.call(opt_this, this.processes[pid]);
    },

    /**
     * Some objects in the model can persist their state in ModelSettings.
     *
     * This iterates through them.
     */
    iterateAllPersistableObjects: function(callback) {
      this.kernel.iterateAllPersistableObjects(callback);
      for (var pid in this.processes)
        this.processes[pid].iterateAllPersistableObjects(callback);
    },

    updateBounds: function() {
      this.bounds.reset();
      var bounds = this.bounds;

      this.iterateAllChildEventContainers(function(ec) {
        ec.updateBounds();
        bounds.addRange(ec.bounds);
      });
      this.iterateAllEventsInThisContainer(
          function(eventConstructor) { return true; },
          function(event) {
            event.addBoundsToRange(bounds);
          });
    },

    shiftWorldToZero: function() {
      var shiftAmount = -this.bounds.min;
      this.timestampShiftToZeroAmount_ = shiftAmount;
      this.iterateAllChildEventContainers(function(ec) {
        ec.shiftTimestampsForward(shiftAmount);
      });
      this.iterateAllEventsInThisContainer(
        function(eventConstructor) { return true; },
        function(event) {
          event.start += shiftAmount;
        });
      this.updateBounds();
    },

    convertTimestampToModelTime: function(sourceClockDomainName, ts) {
      if (sourceClockDomainName !== 'traceEventClock')
        throw new Error('Only traceEventClock is supported.');
      return tr.b.u.Units.timestampFromUs(ts) +
        this.timestampShiftToZeroAmount_;
    },

    get numProcesses() {
      var n = 0;
      for (var p in this.processes)
        n++;
      return n;
    },

    /**
     * @return {Process} Gets a TimelineProcess for a specified pid. Returns
     * undefined if the process doesn't exist.
     */
    getProcess: function(pid) {
      return this.processes[pid];
    },

    /**
     * @return {Process} Gets a TimelineProcess for a specified pid or
     * creates one if it does not exist.
     */
    getOrCreateProcess: function(pid) {
      if (!this.processes[pid])
        this.processes[pid] = new Process(this, pid);
      return this.processes[pid];
    },

    pushInstantEvent: function(instantEvent) {
      this.instantEvents.push(instantEvent);
    },

    addStackFrame: function(stackFrame) {
      if (this.stackFrames[stackFrame.id])
        throw new Error('Stack frame already exists');
      this.stackFrames[stackFrame.id] = stackFrame;
      return stackFrame;
    },

    addInteractionRecord: function(ir) {
      this.interactionRecords.push(ir);
      return ir;
    },

    getClockSyncRecordsNamed: function(name) {
      return this.clockSyncRecords.filter(function(x) {
        return x.name === name;
      });
    },

    /**
     * Generates the set of categories from the slices and counters.
     */
    updateCategories_: function() {
      var categoriesDict = {};
      this.device.addCategoriesToDict(categoriesDict);
      this.kernel.addCategoriesToDict(categoriesDict);
      for (var pid in this.processes)
        this.processes[pid].addCategoriesToDict(categoriesDict);

      this.categories = [];
      for (var category in categoriesDict)
        if (category != '')
          this.categories.push(category);
    },

    getAllThreads: function() {
      var threads = [];
      for (var tid in this.kernel.threads) {
        threads.push(process.threads[tid]);
      }
      for (var pid in this.processes) {
        var process = this.processes[pid];
        for (var tid in process.threads) {
          threads.push(process.threads[tid]);
        }
      }
      return threads;
    },

    /**
     * @return {Array} An array of all processes in the model.
     */
    getAllProcesses: function() {
      var processes = [];
      for (var pid in this.processes)
        processes.push(this.processes[pid]);
      return processes;
    },

    /**
     * @return {Array} An array of all the counters in the model.
     */
    getAllCounters: function() {
      var counters = [];
      counters.push.apply(
          counters, tr.b.dictionaryValues(this.device.counters));
      counters.push.apply(
          counters, tr.b.dictionaryValues(this.kernel.counters));
      for (var pid in this.processes) {
        var process = this.processes[pid];
        for (var tid in process.counters) {
          counters.push(process.counters[tid]);
        }
      }
      return counters;
    },

    getAnnotationByGUID: function(guid) {
      return this.annotationsByGuid_[guid];
    },

    addAnnotation: function(annotation) {
      if (!annotation.guid)
        throw new Error('Annotation with undefined guid given');

      this.annotationsByGuid_[annotation.guid] = annotation;
      tr.b.dispatchSimpleEvent(this, 'annotationChange');
    },

    removeAnnotation: function(annotation) {
      this.annotationsByGuid_[annotation.guid].onRemove();
      delete this.annotationsByGuid_[annotation.guid];
      tr.b.dispatchSimpleEvent(this, 'annotationChange');
    },

    getAllAnnotations: function() {
      return tr.b.dictionaryValues(this.annotationsByGuid_);
    },

    /**
     * @param {String} The name of the thread to find.
     * @return {Array} An array of all the matched threads.
     */
    findAllThreadsNamed: function(name) {
      var namedThreads = [];
      namedThreads.push.apply(
          namedThreads,
          this.kernel.findAllThreadsNamed(name));
      for (var pid in this.processes) {
        namedThreads.push.apply(
            namedThreads,
            this.processes[pid].findAllThreadsNamed(name));
      }
      return namedThreads;
    },

    set importOptions(options) {
      this.importOptions_ = options;
    },

    /**
     * Returns a time unit that is used to format values and determines the
     * precision of the timestamp values.
     */
    get intrinsicTimeUnit() {
      if (this.intrinsicTimeUnit_ === undefined)
        return tr.b.u.TimeDisplayModes.ms;
      return this.intrinsicTimeUnit_;
    },

    set intrinsicTimeUnit(value) {
      if (this.intrinsicTimeUnit_ === value)
        return;
      if (this.intrinsicTimeUnit_ !== undefined)
        throw new Error('Intrinsic time unit already set');
      this.intrinsicTimeUnit_ = value;
    },

    /**
     * @param {Object} data The import warning data. Data must provide two
     *    accessors: type, message. The types are used to determine if we
     *    should output the message, we'll only output one message of each type.
     *    The message is the actual warning content.
     */
    importWarning: function(data) {
      this.importWarnings_.push(data);

      // Only log each warning type once. We may want to add some kind of
      // flag to allow reporting all importer warnings.
      if (this.reportedImportWarnings_[data.type] === true)
        return;

      if (this.importOptions_.showImportWarnings)
        console.warn(data.message);

      this.reportedImportWarnings_[data.type] = true;
    },

    get hasImportWarnings() {
      return (this.importWarnings_.length > 0);
    },

    get importWarnings() {
      return this.importWarnings_;
    },

    autoCloseOpenSlices: function() {
      // Sort the samples.
      this.samples.sort(function(x, y) {
        return x.start - y.start;
      });

      this.updateBounds();
      this.kernel.autoCloseOpenSlices(this.bounds.max);
      for (var pid in this.processes)
        this.processes[pid].autoCloseOpenSlices(this.bounds.max);
    },

    createSubSlices: function() {
      this.kernel.createSubSlices();
      for (var pid in this.processes)
        this.processes[pid].createSubSlices();
    },

    preInitializeObjects: function() {
      for (var pid in this.processes)
        this.processes[pid].preInitializeObjects();
    },

    initializeObjects: function() {
      for (var pid in this.processes)
        this.processes[pid].initializeObjects();
    },

    pruneEmptyContainers: function() {
      this.kernel.pruneEmptyContainers();
      for (var pid in this.processes)
        this.processes[pid].pruneEmptyContainers();
    },

    mergeKernelWithUserland: function() {
      for (var pid in this.processes)
        this.processes[pid].mergeKernelWithUserland();
    },

    computeWorldBounds: function(shiftWorldToZero) {
      this.updateBounds();
      this.updateCategories_();

      if (shiftWorldToZero)
        this.shiftWorldToZero();
    },

    buildFlowEventIntervalTree: function() {
      for (var i = 0; i < this.flowEvents.length; ++i) {
        var flowEvent = this.flowEvents[i];
        this.flowIntervalTree.insert(flowEvent);
      }
      this.flowIntervalTree.updateHighValues();
    },

    cleanupUndeletedObjects: function() {
      for (var pid in this.processes)
        this.processes[pid].autoDeleteObjects(this.bounds.max);
    },

    sortMemoryDumps: function() {
      this.globalMemoryDumps.sort(function(x, y) {
        return x.start - y.start;
      });

      for (var pid in this.processes)
        this.processes[pid].sortMemoryDumps();
    },

    calculateMemoryGraphAttributes: function() {
      this.globalMemoryDumps.forEach(function(dump) {
        dump.calculateGraphAttributes();
      });
    },

    buildEventIndices: function() {
      this.modelIndices = new tr.model.ModelIndices(this);
    },

    sortInteractionRecords: function() {
      this.interactionRecords.sort(function(x, y) {
        return x.start - y.start;
      });
    },

    sortAlerts: function() {
      this.alerts.sort(function(x, y) {
        return x.start - y.start;
      });
    }
  };

  return {
    ClockSyncRecord: ClockSyncRecord,
    Model: Model
  };
});
'use strict';

tr.exportTo('tr.b', function() {
  var tmpVec2s = [];
  for (var i = 0; i < 8; i++)
    tmpVec2s[i] = vec2.create();

  var tmpVec2a = vec4.create();
  var tmpVec4a = vec4.create();
  var tmpVec4b = vec4.create();
  var tmpMat4 = mat4.create();
  var tmpMat4b = mat4.create();

  var p00 = vec2.createXY(0, 0);
  var p10 = vec2.createXY(1, 0);
  var p01 = vec2.createXY(0, 1);
  var p11 = vec2.createXY(1, 1);

  var lerpingVecA = vec2.create();
  var lerpingVecB = vec2.create();
  function lerpVec2(out, a, b, amt) {
    vec2.scale(lerpingVecA, a, amt);
    vec2.scale(lerpingVecB, b, 1 - amt);
    vec2.add(out, lerpingVecA, lerpingVecB);
    vec2.normalize(out, out);
    return out;
  }

  /**
   * @constructor
   */
  function Quad() {
    this.p1 = vec2.create();
    this.p2 = vec2.create();
    this.p3 = vec2.create();
    this.p4 = vec2.create();
  }

  Quad.fromXYWH = function(x, y, w, h) {
    var q = new Quad();
    vec2.set(q.p1, x, y);
    vec2.set(q.p2, x + w, y);
    vec2.set(q.p3, x + w, y + h);
    vec2.set(q.p4, x, y + h);
    return q;
  }

  Quad.fromRect = function(r) {
    return new Quad.fromXYWH(
        r.x, r.y,
        r.width, r.height);
  }

  Quad.from4Vecs = function(p1, p2, p3, p4) {
    var q = new Quad();
    vec2.set(q.p1, p1[0], p1[1]);
    vec2.set(q.p2, p2[0], p2[1]);
    vec2.set(q.p3, p3[0], p3[1]);
    vec2.set(q.p4, p4[0], p4[1]);
    return q;
  }

  Quad.from8Array = function(arr) {
    if (arr.length != 8)
      throw new Error('Array must be 8 long');
    var q = new Quad();
    q.p1[0] = arr[0];
    q.p1[1] = arr[1];
    q.p2[0] = arr[2];
    q.p2[1] = arr[3];
    q.p3[0] = arr[4];
    q.p3[1] = arr[5];
    q.p4[0] = arr[6];
    q.p4[1] = arr[7];
    return q;
  };

  Quad.prototype = {
    pointInside: function(point) {
      return pointInImplicitQuad(point,
                                 this.p1, this.p2, this.p3, this.p4);
    },

    boundingRect: function() {
      var x0 = Math.min(this.p1[0], this.p2[0], this.p3[0], this.p4[0]);
      var y0 = Math.min(this.p1[1], this.p2[1], this.p3[1], this.p4[1]);

      var x1 = Math.max(this.p1[0], this.p2[0], this.p3[0], this.p4[0]);
      var y1 = Math.max(this.p1[1], this.p2[1], this.p3[1], this.p4[1]);

      return new tr.b.Rect.fromXYWH(x0, y0, x1 - x0, y1 - y0);
    },

    clone: function() {
      var q = new Quad();
      vec2.copy(q.p1, this.p1);
      vec2.copy(q.p2, this.p2);
      vec2.copy(q.p3, this.p3);
      vec2.copy(q.p4, this.p4);
      return q;
    },

    scale: function(s) {
      var q = new Quad();
      this.scaleFast(q, s);
      return q;
    },

    scaleFast: function(dstQuad, s) {
      vec2.copy(dstQuad.p1, this.p1, s);
      vec2.copy(dstQuad.p2, this.p2, s);
      vec2.copy(dstQuad.p3, this.p3, s);
      vec2.copy(dstQuad.p3, this.p3, s);
    },

    isRectangle: function() {
      // Simple rectangle check. Note: will not handle out-of-order components.
      var bounds = this.boundingRect();
      return (
          bounds.x == this.p1[0] &&
          bounds.y == this.p1[1] &&
          bounds.width == this.p2[0] - this.p1[0] &&
          bounds.y == this.p2[1] &&
          bounds.width == this.p3[0] - this.p1[0] &&
          bounds.height == this.p3[1] - this.p2[1] &&
          bounds.x == this.p4[0] &&
          bounds.height == this.p4[1] - this.p2[1]
      );
    },

    projectUnitRect: function(rect) {
      var q = new Quad();
      this.projectUnitRectFast(q, rect);
      return q;
    },

    projectUnitRectFast: function(dstQuad, rect) {
      var v12 = tmpVec2s[0];
      var v14 = tmpVec2s[1];
      var v23 = tmpVec2s[2];
      var v43 = tmpVec2s[3];
      var l12, l14, l23, l43;

      vec2.sub(v12, this.p2, this.p1);
      l12 = vec2.length(v12);
      vec2.scale(v12, v12, 1 / l12);

      vec2.sub(v14, this.p4, this.p1);
      l14 = vec2.length(v14);
      vec2.scale(v14, v14, 1 / l14);

      vec2.sub(v23, this.p3, this.p2);
      l23 = vec2.length(v23);
      vec2.scale(v23, v23, 1 / l23);

      vec2.sub(v43, this.p3, this.p4);
      l43 = vec2.length(v43);
      vec2.scale(v43, v43, 1 / l43);

      var b12 = tmpVec2s[0];
      var b14 = tmpVec2s[1];
      var b23 = tmpVec2s[2];
      var b43 = tmpVec2s[3];
      lerpVec2(b12, v12, v43, rect.y);
      lerpVec2(b43, v12, v43, 1 - rect.bottom);
      lerpVec2(b14, v14, v23, rect.x);
      lerpVec2(b23, v14, v23, 1 - rect.right);

      vec2.addTwoScaledUnitVectors(tmpVec2a,
                                   b12, l12 * rect.x,
                                   b14, l14 * rect.y);
      vec2.add(dstQuad.p1, this.p1, tmpVec2a);

      vec2.addTwoScaledUnitVectors(tmpVec2a,
                                   b12, l12 * -(1.0 - rect.right),
                                   b23, l23 * rect.y);
      vec2.add(dstQuad.p2, this.p2, tmpVec2a);


      vec2.addTwoScaledUnitVectors(tmpVec2a,
                                   b43, l43 * -(1.0 - rect.right),
                                   b23, l23 * -(1.0 - rect.bottom));
      vec2.add(dstQuad.p3, this.p3, tmpVec2a);

      vec2.addTwoScaledUnitVectors(tmpVec2a,
                                   b43, l43 * rect.left,
                                   b14, l14 * -(1.0 - rect.bottom));
      vec2.add(dstQuad.p4, this.p4, tmpVec2a);
    },

    toString: function() {
      return 'Quad(' +
          vec2.toString(this.p1) + ', ' +
          vec2.toString(this.p2) + ', ' +
          vec2.toString(this.p3) + ', ' +
          vec2.toString(this.p4) + ')';
    }
  };

  function sign(p1, p2, p3) {
    return (p1[0] - p3[0]) * (p2[1] - p3[1]) -
        (p2[0] - p3[0]) * (p1[1] - p3[1]);
  }

  function pointInTriangle2(pt, p1, p2, p3) {
    var b1 = sign(pt, p1, p2) < 0.0;
    var b2 = sign(pt, p2, p3) < 0.0;
    var b3 = sign(pt, p3, p1) < 0.0;
    return ((b1 == b2) && (b2 == b3));
  }

  function pointInImplicitQuad(point, p1, p2, p3, p4) {
    return pointInTriangle2(point, p1, p2, p3) ||
        pointInTriangle2(point, p1, p3, p4);
  }

  return {
    pointInTriangle2: pointInTriangle2,
    pointInImplicitQuad: pointInImplicitQuad,
    Quad: Quad
  };
});
'use strict';

tr.exportTo('tr.model.source_info', function() {
  function SourceInfo(file, opt_line, opt_column) {
    this.file_ = file;
    this.line_ = opt_line || -1;
    this.column_ = opt_column || -1;
  }

  SourceInfo.prototype = {
    get file() {
      return this.file_;
    },

    get line() {
      return this.line_;
    },

    get column() {
      return this.column_;
    },

    get domain() {
      if (!this.file_)
        return undefined;
      var domain = this.file_.match(/(.*:\/\/[^:\/]*)/i);
      return domain ? domain[1] : undefined;
    },

    toString: function() {
      var str = '';

      if (this.file_)
        str += this.file_;
      if (this.line_ > 0)
        str += ':' + this.line_;
      if (this.column_ > 0)
        str += ':' + this.column_;
      return str;
    }
  };

  return {
    SourceInfo: SourceInfo
  };
});
'use strict';

tr.exportTo('tr.model.source_info', function() {
  function JSSourceInfo(file, line, column, isNative, scriptId, state) {
    tr.model.source_info.SourceInfo.call(this, file, line, column);

    this.isNative_ = isNative;
    this.scriptId_ = scriptId;
    this.state_ = state;
  }

  JSSourceInfo.prototype = {
    __proto__: tr.model.source_info.SourceInfo.prototype,

    get state() {
      return this.state_;
    },

    get isNative() {
      return this.isNative_;
    },

    get scriptId() {
      return this.scriptId_;
    },

    toString: function() {
      var str = this.isNative_ ? '[native v8] ' : '';
      return str +
          tr.model.source_info.SourceInfo.prototype.toString.call(this);
    }
  };

  return {
    JSSourceInfo: JSSourceInfo,
    JSSourceState: {
      COMPILED: 'compiled',
      OPTIMIZABLE: 'optimizable',
      OPTIMIZED: 'optimized',
      UNKNOWN: 'unknown'
    }
  };
});
'use strict';

/**
 * @fileoverview TraceCodeEntry is a wrapper around the V8 CodeEntry that
 * extracts extra context information for each item. This includes things like
 * the source file, line and if the function is a native method or not.
 */
tr.exportTo('tr.e.importer', function() {
  function TraceCodeEntry(address, size, name, scriptId) {
    this.id_ = tr.b.GUID.allocate();
    this.address_ = address;
    this.size_ = size;

    // Stolen from DevTools TimelineJSProfileProcessor._buildCallFrame
    // Code states:
    // (empty) -> compiled
    //    ~    -> optimizable
    //    *    -> optimized
    var rePrefix = /^(\w*:)?([*~]?)(.*)$/m;
    var tokens = rePrefix.exec(name);
    var prefix = tokens[1];
    var state = tokens[2];
    var body = tokens[3];

    if (state === '*') {
      state = tr.model.source_info.JSSourceState.OPTIMIZED;
    } else if (state === '~') {
      state = tr.model.source_info.JSSourceState.OPTIMIZABLE;
    } else if (state === '') {
      state = tr.model.source_info.JSSourceState.COMPILED;
    } else {
      console.warning('Unknown v8 code state ' + state);
      state = tr.model.source_info.JSSourceState.UNKNOWN;
    }

    var rawName;
    var rawUrl;
    if (prefix === 'Script:') {
        rawName = '';
        rawUrl = body;
    } else {
        var spacePos = body.lastIndexOf(' ');
        rawName = spacePos !== -1 ? body.substr(0, spacePos) : body;
        rawUrl = spacePos !== -1 ? body.substr(spacePos + 1) : '';
    }

    function splitLineAndColumn(url) {
      var lineColumnRegEx = /(?::(\d+))?(?::(\d+))?$/;
      var lineColumnMatch = lineColumnRegEx.exec(url);
      var lineNumber;
      var columnNumber;

      if (typeof(lineColumnMatch[1]) === 'string') {
        lineNumber = parseInt(lineColumnMatch[1], 10);
        // Immediately convert line and column to 0-based numbers.
        lineNumber = isNaN(lineNumber) ? undefined : lineNumber - 1;
      }
      if (typeof(lineColumnMatch[2]) === 'string') {
        columnNumber = parseInt(lineColumnMatch[2], 10);
        columnNumber = isNaN(columnNumber) ? undefined : columnNumber - 1;
      }

      return {
        url: url.substring(0, url.length - lineColumnMatch[0].length),
        lineNumber: lineNumber,
        columnNumber: columnNumber
      };
    }

    var nativeSuffix = ' native';
    var isNative = rawName.endsWith(nativeSuffix);
    this.name_ =
        isNative ? rawName.slice(0, -nativeSuffix.length) : rawName;

    var urlData = splitLineAndColumn(rawUrl);
    var url = urlData.url || '';
    var line = urlData.lineNumber || 0;
    var column = urlData.columnNumber || 0;

    this.sourceInfo_ = new tr.model.source_info.JSSourceInfo(
        url, line, column, isNative, scriptId, state);
  };

  TraceCodeEntry.prototype = {
    get id() {
      return this.id_;
    },

    get sourceInfo() {
      return this.sourceInfo_;
    },

    get name() {
      return this.name_;
    },

    set address(address) {
      this.address_ = address;
    },

    get address() {
      return this.address_;
    },

    set size(size) {
      this.size_ = size;
    },

    get size() {
      return this.size_;
    }
  };

  return {
    TraceCodeEntry: TraceCodeEntry
  };
});
'use strict';

tr.exportTo('tr.e.importer', function() {
  // This code is a tracification of:
  // devtools/front_end/timeline/TimelineJSProfile.js
  function TraceCodeMap() {
    this.banks_ = new Map();
  }

  TraceCodeMap.prototype = {
    addEntry: function(addressHex, size, name, scriptId) {
      var entry = new tr.e.importer.TraceCodeEntry(
          this.getAddress_(addressHex), size, name, scriptId);

      this.addEntry_(addressHex, entry);
    },

    moveEntry: function(oldAddressHex, newAddressHex, size) {
      var entry = this.getBank_(oldAddressHex)
          .removeEntry(this.getAddress_(oldAddressHex));
      if (!entry)
          return;

      entry.address = this.getAddress_(newAddressHex);
      entry.size = size;
      this.addEntry_(newAddressHex, entry);
    },

    lookupEntry: function(addressHex) {
      return this.getBank_(addressHex)
          .lookupEntry(this.getAddress_(addressHex));
    },

    addEntry_: function(addressHex, entry) {
      // FIXME: Handle bank spanning addresses ...
      this.getBank_(addressHex).addEntry(entry);
    },

    getAddress_: function(addressHex) {
      // 13 hex digits == 52 bits, double mantissa fits 53 bits.
      var bankSizeHexDigits = 13;
      addressHex = addressHex.slice(2);  // cut 0x prefix.
      return parseInt(addressHex.slice(-bankSizeHexDigits), 16);
    },

    getBank_: function(addressHex) {
      addressHex = addressHex.slice(2);  // cut 0x prefix.

      // 13 hex digits == 52 bits, double mantissa fits 53 bits.
      var bankSizeHexDigits = 13;
      var maxHexDigits = 16;
      var bankName = addressHex.slice(-maxHexDigits, -bankSizeHexDigits);
      var bank = this.banks_.get(bankName);
      if (!bank) {
          bank = new TraceCodeBank();
          this.banks_.set(bankName, bank);
      }
      return bank;
    }
  };

  function TraceCodeBank() {
    this.entries_ = [];
  }

  TraceCodeBank.prototype = {
    removeEntry: function(address) {
      // findLowIndexInSortedArray returns 1 for empty. Just handle the
      // empty list and bail early.
      if (this.entries_.length === 0)
        return undefined;

      var index = tr.b.findLowIndexInSortedArray(
          this.entries_, function(entry) { return entry.address; }, address);
      var entry = this.entries_[index];
      if (!entry || entry.address !== address)
        return undefined;

      this.entries_.splice(index, 1);
      return entry;
    },

    lookupEntry: function(address) {
      var index = tr.b.findHighIndexInSortedArray(
          this.entries_, function(e) { return address - e.address; }) - 1;
      var entry = this.entries_[index];
      return entry &&
          address < entry.address + entry.size ? entry : undefined;
    },

    addEntry: function(newEntry) {
      // findLowIndexInSortedArray returns 1 for empty list. Just push the
      // new address as it's the only item.
      if (this.entries_.length === 0)
        this.entries_.push(newEntry);

      var endAddress = newEntry.address + newEntry.size;
      var lastIndex = tr.b.findLowIndexInSortedArray(
          this.entries_, function(entry) { return entry.address; }, endAddress);
      var index;
      for (index = lastIndex - 1; index >= 0; --index) {
          var entry = this.entries_[index];
          var entryEndAddress = entry.address + entry.size;
          if (entryEndAddress <= newEntry.address)
              break;
      }
      ++index;
      this.entries_.splice(index, lastIndex - index, newEntry);
    }
  };

  return {
    TraceCodeMap: TraceCodeMap
  };
});
'use strict';

/**
 * @fileoverview Splay tree used by CodeMap.
 */
tr.exportTo('tr.e.importer.v8', function() {
  /**
   * Constructs a Splay tree.  A splay tree is a self-balancing binary
   * search tree with the additional property that recently accessed
   * elements are quick to access again. It performs basic operations
   * such as insertion, look-up and removal in O(log(n)) amortized time.
   *
   * @constructor
   */
  function SplayTree() { };

  /**
   * Pointer to the root node of the tree.
   *
   * @type {SplayTree.Node}
   * @private
   */
  SplayTree.prototype.root_ = null;

  /**
   * @return {boolean} Whether the tree is empty.
   */
  SplayTree.prototype.isEmpty = function() {
    return !this.root_;
  };

  /**
   * Inserts a node into the tree with the specified key and value if
   * the tree does not already contain a node with the specified key. If
   * the value is inserted, it becomes the root of the tree.
   *
   * @param {number} key Key to insert into the tree.
   * @param {*} value Value to insert into the tree.
   */
  SplayTree.prototype.insert = function(key, value) {
    if (this.isEmpty()) {
      this.root_ = new SplayTree.Node(key, value);
      return;
    }
    // Splay on the key to move the last node on the search path for
    // the key to the root of the tree.
    this.splay_(key);
    if (this.root_.key == key) {
      return;
    }
    var node = new SplayTree.Node(key, value);
    if (key > this.root_.key) {
      node.left = this.root_;
      node.right = this.root_.right;
      this.root_.right = null;
    } else {
      node.right = this.root_;
      node.left = this.root_.left;
      this.root_.left = null;
    }
    this.root_ = node;
  };


  /**
   * Removes a node with the specified key from the tree if the tree
   * contains a node with this key. The removed node is returned. If the
   * key is not found, an exception is thrown.
   *
   * @param {number} key Key to find and remove from the tree.
   * @return {SplayTree.Node} The removed node.
   */
  SplayTree.prototype.remove = function(key) {
    if (this.isEmpty()) {
      throw Error('Key not found: ' + key);
    }
    this.splay_(key);
    if (this.root_.key != key) {
      throw Error('Key not found: ' + key);
    }
    var removed = this.root_;
    if (!this.root_.left) {
      this.root_ = this.root_.right;
    } else {
      var right = this.root_.right;
      this.root_ = this.root_.left;
      // Splay to make sure that the new root has an empty right child.
      this.splay_(key);
      // Insert the original right child as the right child of the new
      // root.
      this.root_.right = right;
    }
    return removed;
  };


  /**
   * Returns the node having the specified key or null if the tree doesn't
   * contain a node with the specified key.
   *
   *
   * @param {number} key Key to find in the tree.
   * @return {SplayTree.Node} Node having the specified key.
   */
  SplayTree.prototype.find = function(key) {
    if (this.isEmpty()) {
      return null;
    }
    this.splay_(key);
    return this.root_.key == key ? this.root_ : null;
  };

  /**
   * @return {SplayTree.Node} Node having the minimum key value.
   */
  SplayTree.prototype.findMin = function() {
    if (this.isEmpty()) {
      return null;
    }
    var current = this.root_;
    while (current.left) {
      current = current.left;
    }
    return current;
  };

  /**
   * @return {SplayTree.Node} Node having the maximum key value.
   */
  SplayTree.prototype.findMax = function(opt_startNode) {
    if (this.isEmpty()) {
      return null;
    }
    var current = opt_startNode || this.root_;
    while (current.right) {
      current = current.right;
    }
    return current;
  };

  /**
   * @return {SplayTree.Node} Node having the maximum key value that
   *     is less or equal to the specified key value.
   */
  SplayTree.prototype.findGreatestLessThan = function(key) {
    if (this.isEmpty()) {
      return null;
    }
    // Splay on the key to move the node with the given key or the last
    // node on the search path to the top of the tree.
    this.splay_(key);
    // Now the result is either the root node or the greatest node in
    // the left subtree.
    if (this.root_.key <= key) {
      return this.root_;
    } else if (this.root_.left) {
      return this.findMax(this.root_.left);
    } else {
      return null;
    }
  };

  /**
   * @return {Array<*>} An array containing all the values of tree's nodes
   * paired with keys.
   *
   */
  SplayTree.prototype.exportKeysAndValues = function() {
    var result = [];
    this.traverse_(function(node) { result.push([node.key, node.value]); });
    return result;
  };

  /**
   * @return {Array<*>} An array containing all the values of tree's nodes.
   */
  SplayTree.prototype.exportValues = function() {
    var result = [];
    this.traverse_(function(node) { result.push(node.value); });
    return result;
  };

  /**
   * Perform the splay operation for the given key. Moves the node with
   * the given key to the top of the tree.  If no node has the given
   * key, the last node on the search path is moved to the top of the
   * tree. This is the simplified top-down splaying algorithm from:
   * "Self-adjusting Binary Search Trees" by Sleator and Tarjan
   *
   * @param {number} key Key to splay the tree on.
   * @private
   */
  SplayTree.prototype.splay_ = function(key) {
    if (this.isEmpty()) {
      return;
    }
    // Create a dummy node.  The use of the dummy node is a bit
    // counter-intuitive: The right child of the dummy node will hold
    // the L tree of the algorithm.  The left child of the dummy node
    // will hold the R tree of the algorithm.  Using a dummy node, left
    // and right will always be nodes and we avoid special cases.
    var dummy, left, right;
    dummy = left = right = new SplayTree.Node(null, null);
    var current = this.root_;
    while (true) {
      if (key < current.key) {
        if (!current.left) {
          break;
        }
        if (key < current.left.key) {
          // Rotate right.
          var tmp = current.left;
          current.left = tmp.right;
          tmp.right = current;
          current = tmp;
          if (!current.left) {
            break;
          }
        }
        // Link right.
        right.left = current;
        right = current;
        current = current.left;
      } else if (key > current.key) {
        if (!current.right) {
          break;
        }
        if (key > current.right.key) {
          // Rotate left.
          var tmp = current.right;
          current.right = tmp.left;
          tmp.left = current;
          current = tmp;
          if (!current.right) {
            break;
          }
        }
        // Link left.
        left.right = current;
        left = current;
        current = current.right;
      } else {
        break;
      }
    }
    // Assemble.
    left.right = current.left;
    right.left = current.right;
    current.left = dummy.right;
    current.right = dummy.left;
    this.root_ = current;
  };

  /**
   * Performs a preorder traversal of the tree.
   *
   * @param {function(SplayTree.Node)} f Visitor function.
   * @private
   */
  SplayTree.prototype.traverse_ = function(f) {
    var nodesToVisit = [this.root_];
    while (nodesToVisit.length > 0) {
      var node = nodesToVisit.shift();
      if (node == null) {
        continue;
      }
      f(node);
      nodesToVisit.push(node.left);
      nodesToVisit.push(node.right);
    }
  };

  /**
   * Constructs a Splay tree node.
   *
   * @param {number} key Key.
   * @param {*} value Value.
   */
  SplayTree.Node = function(key, value) {
    this.key = key;
    this.value = value;
  };

  /**
   * @type {SplayTree.Node}
   */
  SplayTree.Node.prototype.left = null;

  /**
   * @type {SplayTree.Node}
   */
  SplayTree.Node.prototype.right = null;

  return {
    SplayTree: SplayTree
  };
});
'use strict';

/**
 * @fileoverview Map addresses to dynamically created functions.
 */
tr.exportTo('tr.e.importer.v8', function() {
  /**
   * Constructs a mapper that maps addresses into code entries.
   *
   * @constructor
   */
  function CodeMap() {
    /**
     * Dynamic code entries. Used for JIT compiled code.
     */
    this.dynamics_ = new tr.e.importer.v8.SplayTree();

    /**
     * Name generator for entries having duplicate names.
     */
    this.dynamicsNameGen_ = new tr.e.importer.v8.CodeMap.NameGenerator();

    /**
     * Static code entries. Used for statically compiled code.
     */
    this.statics_ = new tr.e.importer.v8.SplayTree();

    /**
     * Libraries entries. Used for the whole static code libraries.
     */
    this.libraries_ = new tr.e.importer.v8.SplayTree();

    /**
     * Map of memory pages occupied with static code.
     */
    this.pages_ = [];
  };

  /**
   * The number of alignment bits in a page address.
   */
  CodeMap.PAGE_ALIGNMENT = 12;

  /**
   * Page size in bytes.
   */
  CodeMap.PAGE_SIZE = 1 << CodeMap.PAGE_ALIGNMENT;

  /**
   * Adds a dynamic (i.e. moveable and discardable) code entry.
   *
   * @param {number} start The starting address.
   * @param {CodeMap.CodeEntry} codeEntry Code entry object.
   */
  CodeMap.prototype.addCode = function(start, codeEntry) {
    this.deleteAllCoveredNodes_(this.dynamics_, start, start + codeEntry.size);
    this.dynamics_.insert(start, codeEntry);
  };

  /**
   * Moves a dynamic code entry. Throws an exception if there is no dynamic
   * code entry with the specified starting address.
   *
   * @param {number} from The starting address of the entry being moved.
   * @param {number} to The destination address.
   */
  CodeMap.prototype.moveCode = function(from, to) {
    var removedNode = this.dynamics_.remove(from);
    this.deleteAllCoveredNodes_(this.dynamics_, to,
                                to + removedNode.value.size);
    this.dynamics_.insert(to, removedNode.value);
  };

  /**
   * Discards a dynamic code entry. Throws an exception if there is no dynamic
   * code entry with the specified starting address.
   *
   * @param {number} start The starting address of the entry being deleted.
   */
  CodeMap.prototype.deleteCode = function(start) {
    var removedNode = this.dynamics_.remove(start);
  };

  /**
   * Adds a library entry.
   *
   * @param {number} start The starting address.
   * @param {CodeMap.CodeEntry} codeEntry Code entry object.
   */
  CodeMap.prototype.addLibrary = function(
      start, codeEntry) {
    this.markPages_(start, start + codeEntry.size);
    this.libraries_.insert(start, codeEntry);
  };

  /**
   * Adds a static code entry.
   *
   * @param {number} start The starting address.
   * @param {CodeMap.CodeEntry} codeEntry Code entry object.
   */
  CodeMap.prototype.addStaticCode = function(
      start, codeEntry) {
    this.statics_.insert(start, codeEntry);
  };

  /**
   * @private
   */
  CodeMap.prototype.markPages_ = function(start, end) {
    for (var addr = start; addr <= end;
         addr += CodeMap.PAGE_SIZE) {
      this.pages_[addr >>> CodeMap.PAGE_ALIGNMENT] = 1;
    }
  };

  /**
   * @private
   */
  CodeMap.prototype.deleteAllCoveredNodes_ = function(tree, start, end) {
    var to_delete = [];
    var addr = end - 1;
    while (addr >= start) {
      var node = tree.findGreatestLessThan(addr);
      if (!node) break;
      var start2 = node.key, end2 = start2 + node.value.size;
      if (start2 < end && start < end2) to_delete.push(start2);
      addr = start2 - 1;
    }
    for (var i = 0, l = to_delete.length; i < l; ++i) tree.remove(to_delete[i]);
  };

  /**
   * @private
   */
  CodeMap.prototype.isAddressBelongsTo_ = function(addr, node) {
    return addr >= node.key && addr < (node.key + node.value.size);
  };

  /**
   * @private
   */
  CodeMap.prototype.findInTree_ = function(tree, addr) {
    var node = tree.findGreatestLessThan(addr);
    return node && this.isAddressBelongsTo_(addr, node) ? node.value : null;
  };

  /**
   * Finds a code entry that contains the specified address. Both static and
   * dynamic code entries are considered.
   *
   * @param {number} addr Address.
   */
  CodeMap.prototype.findEntry = function(addr) {
    var pageAddr = addr >>> CodeMap.PAGE_ALIGNMENT;
    if (pageAddr in this.pages_) {
      // Static code entries can contain "holes" of unnamed code.
      // In this case, the whole library is assigned to this address.
      return this.findInTree_(this.statics_, addr) ||
          this.findInTree_(this.libraries_, addr);
    }
    var min = this.dynamics_.findMin();
    var max = this.dynamics_.findMax();
    if (max != null && addr < (max.key + max.value.size) && addr >= min.key) {
      var dynaEntry = this.findInTree_(this.dynamics_, addr);
      if (dynaEntry == null) return null;
      // Dedupe entry name.
      if (!dynaEntry.nameUpdated_) {
        dynaEntry.name = this.dynamicsNameGen_.getName(dynaEntry.name);
        dynaEntry.nameUpdated_ = true;
      }
      return dynaEntry;
    }
    return null;
  };

  /**
   * Returns a dynamic code entry using its starting address.
   *
   * @param {number} addr Address.
   */
  CodeMap.prototype.findDynamicEntryByStartAddress =
      function(addr) {
    var node = this.dynamics_.find(addr);
    return node ? node.value : null;
  };

  /**
   * Returns an array of all dynamic code entries.
   */
  CodeMap.prototype.getAllDynamicEntries = function() {
    return this.dynamics_.exportValues();
  };

  /**
   * Returns an array of pairs of all dynamic code entries and their addresses.
   */
  CodeMap.prototype.getAllDynamicEntriesWithAddresses = function() {
    return this.dynamics_.exportKeysAndValues();
  };

  /**
   * Returns an array of all static code entries.
   */
  CodeMap.prototype.getAllStaticEntries = function() {
    return this.statics_.exportValues();
  };

  /**
   * Returns an array of all libraries entries.
   */
  CodeMap.prototype.getAllLibrariesEntries = function() {
    return this.libraries_.exportValues();
  };

  /**
   * Creates a code entry object.
   *
   * @param {number} size Code entry size in bytes.
   * @param {string=} opt_name Code entry name.
   * @constructor
   */
  CodeMap.CodeEntry = function(size, opt_name) {
    this.id = tr.b.GUID.allocate();
    this.size = size;
    this.name = opt_name || '';
    this.nameUpdated_ = false;
  };

  CodeMap.CodeEntry.prototype.getName = function() {
    return this.name;
  };

  CodeMap.CodeEntry.prototype.toString = function() {
    return this.name + ': ' + this.size.toString(16);
  };

  CodeMap.NameGenerator = function() {
    this.knownNames_ = {};
  };

  CodeMap.NameGenerator.prototype.getName = function(name) {
    if (!(name in this.knownNames_)) {
      this.knownNames_[name] = 0;
      return name;
    }
    var count = ++this.knownNames_[name];
    return name + ' {' + count + '}';
  };
  return {
    CodeMap: CodeMap
  };
});
'use strict';

/**
 * @fileoverview Base class for trace data importers.
 */
tr.exportTo('tr.importer', function() {
  function Importer() { }

  Importer.prototype = {
    __proto__: Object.prototype,

    /**
     * Called by the Model to check whether the importer type stores the actual
     * trace data or just holds it as container for further extraction.
     */
    isTraceDataContainer: function() {
      return false;
    },

    /**
     * Called by the Model to extract one or more subtraces from the event data.
     */
    extractSubtraces: function() {
      return [];
    },

    /**
     * Called to import events into the Model.
     */
    importEvents: function() {
    },

    /**
     * Called to import sample data into the Model.
     */
    importSampleData: function() {
    },

    /**
     * Called by the Model after all other importers have imported their
     * events.
     */
    finalizeImport: function() {
    },

    /**
     * Called by the Model to join references between objects, after final
     * model bounds have been computed.
     */
    joinRefs: function() {
    }
  };


  var options = new tr.b.ExtensionRegistryOptions(tr.b.BASIC_REGISTRY_MODE);
  options.defaultMetadata = {};
  options.mandatoryBaseClass = Importer;
  tr.b.decorateExtensionRegistry(Importer, options);

  Importer.findImporterFor = function(eventData) {
    var typeInfo = Importer.findTypeInfoMatching(function(ti) {
      return ti.constructor.canImport(eventData);
    });
    if (typeInfo)
      return typeInfo.constructor;
    return undefined;
  };

  return {
    Importer: Importer
  };
});
'use strict';

tr.exportTo('tr.model', function() {
  /**
   * YComponent is a class that handles storing the stableId and the percentage
   * offset in the y direction of all tracks within a specific viewX and viewY
   * coordinate.
   * @constructor
   */
  function YComponent(stableId, yPercentOffset) {
    this.stableId = stableId;
    this.yPercentOffset = yPercentOffset;
  }

  YComponent.prototype = {
    toDict: function() {
      return {
        stableId: this.stableId,
        yPercentOffset: this.yPercentOffset
      };
    }
  };

  /**
   * Location is a class that represents a spatial location on the timeline
   * that is specified by percent offsets within tracks rather than specific
   * points.
   *
   * @constructor
   */
  function Location(xWorld, yComponents) {
    this.xWorld_ = xWorld;
    this.yComponents_ = yComponents;
  };

  /**
   * Returns a new Location given by x and y coordinates with respect to
   * the timeline's drawing canvas.
   */
  Location.fromViewCoordinates = function(viewport, viewX, viewY) {
    var dt = viewport.currentDisplayTransform;
    var xWorld = dt.xViewToWorld(viewX);
    var yComponents = [];

    // Since we're given coordinates within the timeline canvas, we need to
    // convert them to document coordinates to get the element.
    var elem = document.elementFromPoint(
          viewX + viewport.modelTrackContainer.canvas.offsetLeft,
          viewY + viewport.modelTrackContainer.canvas.offsetTop);
    // Build yComponents by calculating percentage offset with respect to
    // each parent track.
    while (elem instanceof tr.ui.tracks.Track) {
      if (elem.eventContainer) {
        var boundRect = elem.getBoundingClientRect();
        var yPercentOffset = (viewY - boundRect.top) / boundRect.height;
        yComponents.push(
            new YComponent(elem.eventContainer.stableId, yPercentOffset));
      }
      elem = elem.parentElement;
    }

    if (yComponents.length == 0)
      return;
    return new Location(xWorld, yComponents);
  }

  Location.fromStableIdAndTimestamp = function(viewport, stableId, ts) {
    var xWorld = ts;
    var yComponents = [];

    // The y components' percentage offsets will be calculated with respect to
    // the boundingRect's top of containing track.
    var containerToTrack = viewport.containerToTrackMap;
    var elem = containerToTrack.getTrackByStableId(stableId);
    if (!elem)
      return;

    var firstY = elem.getBoundingClientRect().top;
    while (elem instanceof tr.ui.tracks.Track) {
      if (elem.eventContainer) {
        var boundRect = elem.getBoundingClientRect();
        var yPercentOffset = (firstY - boundRect.top) / boundRect.height;
        yComponents.push(
            new YComponent(elem.eventContainer.stableId, yPercentOffset));
      }
      elem = elem.parentElement;
    }

    if (yComponents.length == 0)
      return;
    return new Location(xWorld, yComponents);
  }

  Location.prototype = {

    get xWorld() {
      return this.xWorld_;
    },

    /**
     * Returns the first valid containing track based on the
     * internal yComponents.
     */
    getContainingTrack: function(viewport) {
      var containerToTrack = viewport.containerToTrackMap;
      for (var i in this.yComponents_) {
        var yComponent = this.yComponents_[i];
        var track = containerToTrack.getTrackByStableId(yComponent.stableId);
        if (track !== undefined)
          return track;
      }
    },

    /**
     * Calculates and returns x and y coordinates of the current location with
     * respect to the timeline's canvas.
     */
    toViewCoordinates: function(viewport) {
      var dt = viewport.currentDisplayTransform;
      var containerToTrack = viewport.containerToTrackMap;
      var viewX = dt.xWorldToView(this.xWorld_);

      var viewY = -1;
      for (var index in this.yComponents_) {
        var yComponent = this.yComponents_[index];
        var track = containerToTrack.getTrackByStableId(yComponent.stableId);
        if (track !== undefined) {
          var boundRect = track.getBoundingClientRect();
          viewY = yComponent.yPercentOffset * boundRect.height + boundRect.top;
          break;
        }
      }

      return {
        viewX: viewX,
        viewY: viewY
      };
    },

    toDict: function() {
      return {
        xWorld: this.xWorld_,
        yComponents: this.yComponents_
      };
    }
  };

  return {
    Location: Location
  };
});
'use strict';

tr.exportTo('tr.model', function() {
  /**
   * Annotation is a base class that represents all annotation objects that
   * can be drawn on the timeline.
   *
   * @constructor
   */
  function Annotation() {
    this.guid_ = tr.b.GUID.allocate();
    this.view_ = undefined;
  };

  Annotation.fromDictIfPossible = function(args) {
    if (args.typeName === undefined)
      throw new Error('Missing typeName argument');

    var typeInfo = Annotation.findTypeInfoMatching(function(typeInfo) {
      return typeInfo.metadata.typeName === args.typeName;
    });

    if (typeInfo === undefined)
      return undefined;

    return typeInfo.constructor.fromDict(args);
  };

  Annotation.fromDict = function() {
    throw new Error('Not implemented');
  }

  Annotation.prototype = {
    get guid() {
      return this.guid_;
    },

    // Invoked by trace model when this annotation is removed.
    onRemove: function() {
    },

    toDict: function() {
      throw new Error('Not implemented');
    },

    getOrCreateView: function(viewport) {
      if (!this.view_)
        this.view_ = this.createView_(viewport);
      return this.view_;
    },

    createView_: function() {
      throw new Error('Not implemented');
    }
  };

  var options = new tr.b.ExtensionRegistryOptions(tr.b. BASIC_REGISTRY_MODE);
  tr.b.decorateExtensionRegistry(Annotation, options);

  Annotation.addEventListener('will-register', function(e) {
    if (!e.typeInfo.constructor.hasOwnProperty('fromDict'))
      throw new Error('Must have fromDict method');

    if (!e.typeInfo.metadata.typeName)
      throw new Error('Registered Annotations must provide typeName');
  });

  return {
    Annotation: Annotation
  };
});
'use strict';

tr.exportTo('tr.ui.annotations', function() {
  /**
   * A base class for all annotation views.
   * @constructor
   */
  function AnnotationView(viewport, annotation) {
  }

  AnnotationView.prototype = {
    draw: function(ctx) {
      throw new Error('Not implemented');
    }
  };

  return {
    AnnotationView: AnnotationView
  };
});
'use strict';

tr.exportTo('tr.ui.annotations', function() {
  /**
   * A view responsible for drawing a single highlight rectangle box on
   * the timeline.
   * @extends {AnnotationView}
   * @constructor
   */
  function RectAnnotationView(viewport, annotation) {
    this.viewport_ = viewport;
    this.annotation_ = annotation;
  }

  RectAnnotationView.prototype = {
    __proto__: tr.ui.annotations.AnnotationView.prototype,

    draw: function(ctx) {
      var dt = this.viewport_.currentDisplayTransform;
      var startCoords =
          this.annotation_.startLocation.toViewCoordinates(this.viewport_);
      var endCoords =
          this.annotation_.endLocation.toViewCoordinates(this.viewport_);

      // Prevent drawing into the ruler track by clamping the initial Y
      // point and the rect's Y size.
      var startY = startCoords.viewY - ctx.canvas.getBoundingClientRect().top;
      var sizeY = endCoords.viewY - startCoords.viewY;
      if (startY + sizeY < 0) {
        // In this case sizeY is negative. If final Y is negative,
        // overwrite startY so that the rectangle ends at y=0.
        startY = sizeY;
      } else if (startY < 0) {
        startY = 0;
      }

      ctx.fillStyle = this.annotation_.fillStyle;
      ctx.fillRect(startCoords.viewX, startY,
          endCoords.viewX - startCoords.viewX, sizeY);
    }
  };

  return {
    RectAnnotationView: RectAnnotationView
  };
});
'use strict';

tr.exportTo('tr.model', function() {

  function RectAnnotation(start, end) {
    tr.model.Annotation.apply(this, arguments);

    this.startLocation_ = start; // Location of top-left corner.
    this.endLocation_ = end; // Location of bottom-right corner.
    this.fillStyle = 'rgba(255, 180, 0, 0.3)';
  }

  RectAnnotation.fromDict = function(dict) {
    var args = dict.args;
    var startLoc =
        new tr.model.Location(args.start.xWorld, args.start.yComponents);
    var endLoc =
        new tr.model.Location(args.end.xWorld, args.end.yComponents);
    return new tr.model.RectAnnotation(startLoc, endLoc);
  }

  RectAnnotation.prototype = {
    __proto__: tr.model.Annotation.prototype,

    get startLocation() {
      return this.startLocation_;
    },

    get endLocation() {
      return this.endLocation_;
    },

    toDict: function() {
      return {
        typeName: 'rect',
        args: {
          start: this.startLocation.toDict(),
          end: this.endLocation.toDict()
        }
      };
    },

    createView_: function(viewport) {
      return new tr.ui.annotations.RectAnnotationView(viewport, this);
    }
  };

  tr.model.Annotation.register(RectAnnotation, {typeName: 'rect'});

  return {
    RectAnnotation: RectAnnotation
  };
});
'use strict';

tr.exportTo('tr.ui.annotations', function() {
  /**
   * A view of a comment box consisting of a textarea and a line to the
   * actual location.
   * @extends {AnnotationView}
   * @constructor
   */
  function CommentBoxAnnotationView(viewport, annotation) {
    this.viewport_ = viewport;
    this.annotation_ = annotation;
    this.textArea_ = undefined;

    this.styleWidth = 250;
    this.styleHeight = 50;
    this.fontSize = 10;
    this.rightOffset = 50;
    this.topOffset = 25;
  }

  CommentBoxAnnotationView.prototype = {
    __proto__: tr.ui.annotations.AnnotationView.prototype,

    removeTextArea: function() {
      this.textArea_.parentNode.removeChild(this.textArea_);
    },

    draw: function(ctx) {
      var coords = this.annotation_.location.toViewCoordinates(this.viewport_);
      if (coords.viewX < 0) {
        if (this.textArea_)
          this.textArea_.style.visibility = 'hidden';
        return;
      }

      // Set up textarea element.
      if (!this.textArea_) {
        this.textArea_ = document.createElement('textarea');
        this.textArea_.style.position = 'absolute';
        this.textArea_.readOnly = true;
        this.textArea_.value = this.annotation_.text;
        // Set the z-index so that this is shown on top of canvas.
        this.textArea_.style.zIndex = 1;
        ctx.canvas.parentNode.appendChild(this.textArea_);
      }

      this.textArea_.style.width = this.styleWidth + 'px';
      this.textArea_.style.height = this.styleHeight + 'px';
      this.textArea_.style.fontSize = this.fontSize + 'px';
      this.textArea_.style.visibility = 'visible';

      // Update positions to latest coordinate.
      this.textArea_.style.left =
          coords.viewX + ctx.canvas.getBoundingClientRect().left +
          this.rightOffset + 'px';
      this.textArea_.style.top =
          coords.viewY - ctx.canvas.getBoundingClientRect().top -
          this.topOffset + 'px';

      // Draw pointer line from offset to actual location.
      ctx.strokeStyle = 'rgb(0, 0, 0)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      tr.ui.b.drawLine(ctx, coords.viewX,
          coords.viewY - ctx.canvas.getBoundingClientRect().top,
          coords.viewX + this.rightOffset,
          coords.viewY - this.topOffset -
            ctx.canvas.getBoundingClientRect().top);
      ctx.stroke();
    }
  };

  return {
    CommentBoxAnnotationView: CommentBoxAnnotationView
  };
});
'use strict';

tr.exportTo('tr.model', function() {

  function CommentBoxAnnotation(location, text) {
    tr.model.Annotation.apply(this, arguments);

    this.location = location;
    this.text = text;
  }

  CommentBoxAnnotation.fromDict = function(dict) {
    var args = dict.args;
    var location =
        new tr.model.Location(args.location.xWorld, args.location.yComponents);
    return new tr.model.CommentBoxAnnotation(location, args.text);
  };

  CommentBoxAnnotation.prototype = {
    __proto__: tr.model.Annotation.prototype,

    onRemove: function() {
      this.view_.removeTextArea();
    },

    toDict: function() {
      return {
        typeName: 'comment_box',
        args: {
          text: this.text,
          location: this.location.toDict()
        }
      };
    },

    createView_: function(viewport) {
      return new tr.ui.annotations.CommentBoxAnnotationView(viewport, this);
    }
  };

  tr.model.Annotation.register(
      CommentBoxAnnotation, {typeName: 'comment_box'});

  return {
    CommentBoxAnnotation: CommentBoxAnnotation
  };
});
'use strict';

tr.exportTo('tr.ui.annotations', function() {
  /**
   * A view that draws a vertical line on the timeline at a specific timestamp.
   * @extends {AnnotationView}
   * @constructor
   */
  function XMarkerAnnotationView(viewport, annotation) {
    this.viewport_ = viewport;
    this.annotation_ = annotation;
  }

  XMarkerAnnotationView.prototype = {
    __proto__: tr.ui.annotations.AnnotationView.prototype,

    draw: function(ctx) {
      var dt = this.viewport_.currentDisplayTransform;
      var viewX = dt.xWorldToView(this.annotation_.timestamp);

      ctx.beginPath();
      tr.ui.b.drawLine(ctx, viewX, 0, viewX, ctx.canvas.height);
      ctx.strokeStyle = this.annotation_.strokeStyle;
      ctx.stroke();
    }
  };

  return {
    XMarkerAnnotationView: XMarkerAnnotationView
  };
});
'use strict';

tr.exportTo('tr.model', function() {

  function XMarkerAnnotation(timestamp) {
    tr.model.Annotation.apply(this, arguments);

    this.timestamp = timestamp;
    this.strokeStyle = 'rgba(0, 0, 255, 0.5)';
  }

  XMarkerAnnotation.fromDict = function(dict) {
    return new XMarkerAnnotation(dict.args.timestamp);
  }

  XMarkerAnnotation.prototype = {
    __proto__: tr.model.Annotation.prototype,

    toDict: function() {
      return {
        typeName: 'xmarker',
        args: {
          timestamp: this.timestamp
        }
      };
    },

    createView_: function(viewport) {
      return new tr.ui.annotations.XMarkerAnnotationView(viewport, this);
    }
  };

  tr.model.Annotation.register(
      XMarkerAnnotation, {typeName: 'xmarker'});

  return {
    XMarkerAnnotation: XMarkerAnnotation
  };
});
'use strict';

/**
 * @fileoverview TraceEventImporter imports TraceEvent-formatted data
 * into the provided model.
 */
tr.exportTo('tr.e.importer', function() {
  var deepCopy = tr.b.deepCopy;

  function getEventColor(event, opt_customName) {
    if (event.cname)
      return tr.ui.b.getColorIdForReservedName(event.cname);
    else if (opt_customName || event.name) {
      return tr.ui.b.getColorIdForGeneralPurposeString(
          opt_customName || event.name);
    }
  }

  var timestampFromUs = tr.b.u.Units.timestampFromUs;
  var maybeTimestampFromUs = tr.b.u.Units.maybeTimestampFromUs;

  var PRODUCER = 'producer';
  var CONSUMER = 'consumer';
  var STEP = 'step';

  function TraceEventImporter(model, eventData) {
    this.importPriority = 1;
    this.model_ = model;
    this.events_ = undefined;
    this.sampleEvents_ = undefined;
    this.stackFrameEvents_ = undefined;
    this.systemTraceEvents_ = undefined;
    this.battorData_ = undefined;
    this.eventsWereFromString_ = false;
    this.softwareMeasuredCpuCount_ = undefined;

    this.allAsyncEvents_ = [];
    this.allFlowEvents_ = [];
    this.allObjectEvents_ = [];

    this.traceEventSampleStackFramesByName_ = {};

    this.v8ProcessCodeMaps_ = {};
    this.v8ProcessRootStackFrame_ = {};

    // Dump ID -> {global: (event | undefined), process: [events]}
    this.allMemoryDumpEvents_ = {};

    if (typeof(eventData) === 'string' || eventData instanceof String) {
      eventData = eventData.trim();
      // If the event data begins with a [, then we know it should end with a ].
      // The reason we check for this is because some tracing implementations
      // cannot guarantee that a ']' gets written to the trace file. So, we are
      // forgiving and if this is obviously the case, we fix it up before
      // throwing the string at JSON.parse.
      if (eventData[0] === '[') {
        eventData = eventData.replace(/\s*,\s*$/, '');
        if (eventData[eventData.length - 1] !== ']')
          eventData = eventData + ']';
      }

      this.events_ = JSON.parse(eventData);
      this.eventsWereFromString_ = true;
    } else {
      this.events_ = eventData;
    }

    this.traceAnnotations_ = this.events_.traceAnnotations;

    // Some trace_event implementations put the actual trace events
    // inside a container. E.g { ... , traceEvents: [ ] }
    // If we see that, just pull out the trace events.
    if (this.events_.traceEvents) {
      var container = this.events_;
      this.events_ = this.events_.traceEvents;

      // Some trace_event implementations put ftrace_importer traces as a
      // huge string inside container.systemTraceEvents. If we see that, pull it
      // out. It will be picked up by extractSubtraces later on.
      this.systemTraceEvents_ = container.systemTraceEvents;

      // Some trace_event implementations put battor power traces as a
      // huge string inside container.battorLogAsString. If we see that, pull
      // it out. It will be picked up by extractSubtraces later on.
      this.battorData_ = container.battorLogAsString;

      // Sampling data.
      this.sampleEvents_ = container.samples;
      this.stackFrameEvents_ = container.stackFrames;

      // Some implementations specify displayTimeUnit
      if (container.displayTimeUnit) {
        var unitName = container.displayTimeUnit;
        var unit = tr.b.u.TimeDisplayModes[unitName];
        if (unit === undefined) {
          throw new Error('Unit ' + unitName + ' is not supported.');
        }
        this.model_.intrinsicTimeUnit = unit;
      }

      var knownFieldNames = {
        battorLogAsString: true,
        samples: true,
        stackFrames: true,
        systemTraceEvents: true,
        traceAnnotations: true,
        traceEvents: true
      };
      // Any other fields in the container should be treated as metadata.
      for (var fieldName in container) {
        if (fieldName in knownFieldNames)
          continue;
        this.model_.metadata.push({name: fieldName,
          value: container[fieldName]});
      }
    }
  }

  /**
   * @return {boolean} Whether obj is a TraceEvent array.
   */
  TraceEventImporter.canImport = function(eventData) {
    // May be encoded JSON. But we dont want to parse it fully yet.
    // Use a simple heuristic:
    //   - eventData that starts with [ are probably trace_event
    //   - eventData that starts with { are probably trace_event
    // May be encoded JSON. Treat files that start with { as importable by us.
    if (typeof(eventData) === 'string' || eventData instanceof String) {
      eventData = eventData.trim();
      return eventData[0] === '{' || eventData[0] === '[';
    }

    // Might just be an array of events
    if (eventData instanceof Array && eventData.length && eventData[0].ph)
      return true;

    // Might be an object with a traceEvents field in it.
    if (eventData.traceEvents) {
      if (eventData.traceEvents instanceof Array) {
        if (eventData.traceEvents.length && eventData.traceEvents[0].ph)
          return true;
        if (eventData.samples.length && eventData.stackFrames !== undefined)
          return true;
      }
    }

    return false;
  };

  TraceEventImporter.prototype = {
    __proto__: tr.importer.Importer.prototype,

    extractSubtraces: function() {
      var systemEventsTmp = this.systemTraceEvents_;
      var battorDataTmp = this.battorData_;
      this.systemTraceEvents_ = undefined;
      this.battorData_ = undefined;
      var subTraces = systemEventsTmp ? [systemEventsTmp] : [];
      if (battorDataTmp)
        subTraces.push(battorDataTmp);
       return subTraces;
    },

    /**
     * Deep copying is only needed if the trace was given to us as events.
     */
    deepCopyIfNeeded_: function(obj) {
      if (obj === undefined)
        obj = {};
      if (this.eventsWereFromString_)
        return obj;
      return deepCopy(obj);
    },

    /**
     * Always perform deep copying.
     */
    deepCopyAlways_: function(obj) {
      if (obj === undefined)
        obj = {};
      return deepCopy(obj);
    },

    /**
     * Helper to process an async event.
     */
    processAsyncEvent: function(event) {
      var thread = this.model_.getOrCreateProcess(event.pid).
          getOrCreateThread(event.tid);
      this.allAsyncEvents_.push({
        sequenceNumber: this.allAsyncEvents_.length,
        event: event,
        thread: thread
      });
    },

    /**
     * Helper to process a flow event.
     */
    processFlowEvent: function(event, opt_slice) {
      var thread = this.model_.getOrCreateProcess(event.pid).
          getOrCreateThread(event.tid);
      this.allFlowEvents_.push({
        refGuid: tr.b.GUID.getLastGuid(),
        sequenceNumber: this.allFlowEvents_.length,
        event: event,
        slice: opt_slice,  // slice for events that have flow info
        thread: thread
      });
    },

    /**
     * Helper that creates and adds samples to a Counter object based on
     * 'C' phase events.
     */
    processCounterEvent: function(event) {
      var ctr_name;
      if (event.id !== undefined)
        ctr_name = event.name + '[' + event.id + ']';
      else
        ctr_name = event.name;

      var ctr = this.model_.getOrCreateProcess(event.pid)
          .getOrCreateCounter(event.cat, ctr_name);
      var reservedColorId = event.cname ? getEventColor(event) : undefined;

      // Initialize the counter's series fields if needed.
      if (ctr.numSeries === 0) {
        for (var seriesName in event.args) {
          var colorId = reservedColorId ||
              getEventColor(event, ctr.name + '.' + seriesName);
          ctr.addSeries(new tr.model.CounterSeries(seriesName, colorId));
        }

        if (ctr.numSeries === 0) {
          this.model_.importWarning({
            type: 'counter_parse_error',
            message: 'Expected counter ' + event.name +
                ' to have at least one argument to use as a value.'
          });

          // Drop the counter.
          delete ctr.parent.counters[ctr.name];
          return;
        }
      }

      var ts = timestampFromUs(event.ts);
      ctr.series.forEach(function(series) {
        var val = event.args[series.name] ? event.args[series.name] : 0;
        series.addCounterSample(ts, val);
      });
    },

    processObjectEvent: function(event) {
      var thread = this.model_.getOrCreateProcess(event.pid).
          getOrCreateThread(event.tid);
      this.allObjectEvents_.push({
        sequenceNumber: this.allObjectEvents_.length,
        event: event,
        thread: thread});
    },

    processDurationEvent: function(event) {
      var thread = this.model_.getOrCreateProcess(event.pid)
        .getOrCreateThread(event.tid);
      var ts = timestampFromUs(event.ts);
      if (!thread.sliceGroup.isTimestampValidForBeginOrEnd(ts)) {
        this.model_.importWarning({
          type: 'duration_parse_error',
          message: 'Timestamps are moving backward.'
        });
        return;
      }

      if (event.ph === 'B') {
        var slice = thread.sliceGroup.beginSlice(
            event.cat, event.name, timestampFromUs(event.ts),
            this.deepCopyIfNeeded_(event.args),
            timestampFromUs(event.tts), event.argsStripped,
            getEventColor(event));
        slice.startStackFrame = this.getStackFrameForEvent_(event);
      } else if (event.ph === 'I' || event.ph === 'i' || event.ph === 'R') {
        if (event.s !== undefined && event.s !== 't')
          throw new Error('This should never happen');

        thread.sliceGroup.beginSlice(event.cat, event.name,
                                     timestampFromUs(event.ts),
                                     this.deepCopyIfNeeded_(event.args),
                                     timestampFromUs(event.tts),
                                     event.argsStripped,
                                     getEventColor(event));
        var slice = thread.sliceGroup.endSlice(timestampFromUs(event.ts),
                                   timestampFromUs(event.tts));
        slice.startStackFrame = this.getStackFrameForEvent_(event);
        slice.endStackFrame = undefined;
      } else {
        if (!thread.sliceGroup.openSliceCount) {
          this.model_.importWarning({
            type: 'duration_parse_error',
            message: 'E phase event without a matching B phase event.'
          });
          return;
        }

        var slice = thread.sliceGroup.endSlice(timestampFromUs(event.ts),
                                               timestampFromUs(event.tts),
                                               getEventColor(event));
        if (event.name && slice.title != event.name) {
          this.model_.importWarning({
            type: 'title_match_error',
            message: 'Titles do not match. Title is ' +
                slice.title + ' in openSlice, and is ' +
                event.name + ' in endSlice'
          });
        }
        slice.endStackFrame = this.getStackFrameForEvent_(event);

        this.mergeArgsInto_(slice.args, event.args, slice.title);
      }
    },

    mergeArgsInto_: function(dstArgs, srcArgs, eventName) {
      for (var arg in srcArgs) {
        if (dstArgs[arg] !== undefined) {
          this.model_.importWarning({
            type: 'arg_merge_error',
            message: 'Different phases of ' + eventName +
                ' provided values for argument ' + arg + '.' +
                ' The last provided value will be used.'
          });
        }
        dstArgs[arg] = this.deepCopyIfNeeded_(srcArgs[arg]);
      }
    },

    processCompleteEvent: function(event) {
      // Preventing the overhead slices from making it into the model. This
      // only applies to legacy traces, as the overhead traces have been
      // removed from the chromium code.
      if (event.cat !== undefined &&
          event.cat.indexOf('trace_event_overhead') > -1)
        return undefined;

      var thread = this.model_.getOrCreateProcess(event.pid)
          .getOrCreateThread(event.tid);

      if (event.flow_out) {
        if (event.flow_in)
          event.flowPhase = STEP;
        else
          event.flowPhase = PRODUCER;
      } else if (event.flow_in) {
        event.flowPhase = CONSUMER;
      }

      var slice = thread.sliceGroup.pushCompleteSlice(event.cat, event.name,
          timestampFromUs(event.ts),
          maybeTimestampFromUs(event.dur),
          maybeTimestampFromUs(event.tts),
          maybeTimestampFromUs(event.tdur),
          this.deepCopyIfNeeded_(event.args),
          event.argsStripped,
          getEventColor(event),
          event.bind_id);
      slice.startStackFrame = this.getStackFrameForEvent_(event);
      slice.endStackFrame = this.getStackFrameForEvent_(event, true);

      return slice;
    },

    processMetadataEvent: function(event) {
      // The metadata events aren't useful without args.
      if (event.argsStripped)
        return;

      if (event.name === 'process_name') {
        var process = this.model_.getOrCreateProcess(event.pid);
        process.name = event.args.name;
      } else if (event.name === 'process_labels') {
        var process = this.model_.getOrCreateProcess(event.pid);
        var labels = event.args.labels.split(',');
        for (var i = 0; i < labels.length; i++)
          process.addLabelIfNeeded(labels[i]);
      } else if (event.name === 'process_sort_index') {
        var process = this.model_.getOrCreateProcess(event.pid);
        process.sortIndex = event.args.sort_index;
      } else if (event.name === 'thread_name') {
        var thread = this.model_.getOrCreateProcess(event.pid).
            getOrCreateThread(event.tid);
        thread.name = event.args.name;
      } else if (event.name === 'thread_sort_index') {
        var thread = this.model_.getOrCreateProcess(event.pid).
            getOrCreateThread(event.tid);
        thread.sortIndex = event.args.sort_index;
      } else if (event.name === 'num_cpus') {
        var n = event.args.number;
        // Not all render processes agree on the cpu count in trace_event. Some
        // processes will report 1, while others will report the actual cpu
        // count. To deal with this, take the max of what is reported.
        if (this.softwareMeasuredCpuCount_ !== undefined)
          n = Math.max(n, this.softwareMeasuredCpuCount_);
        this.softwareMeasuredCpuCount_ = n;
      } else {
        this.model_.importWarning({
          type: 'metadata_parse_error',
          message: 'Unrecognized metadata name: ' + event.name
        });
      }
    },

    processJitCodeEvent: function(event) {
      if (this.v8ProcessCodeMaps_[event.pid] === undefined)
        this.v8ProcessCodeMaps_[event.pid] = new tr.e.importer.TraceCodeMap();
      var map = this.v8ProcessCodeMaps_[event.pid];

      var data = event.args.data;
      if (event.name === 'JitCodeMoved')
        map.moveEntry(data.code_start, data.new_code_start, data.code_len);
      else
        map.addEntry(data.code_start, data.code_len, data.name, data.script_id);
    },

    processInstantEvent: function(event) {
      // V8 JIT events are logged as phase 'I' so we need to separate them out
      // and handle specially.
      //
      // TODO(dsinclair): There are _a lot_ of JitCode events so I'm skipping
      // the display for now. Can revisit later if we want to show them.
      if (event.name === 'JitCodeAdded' || event.name === 'JitCodeMoved') {
        this.processJitCodeEvent(event);
        return;
      }

      // Thread-level instant events are treated as zero-duration slices.
      if (event.s === 't' || event.s === undefined) {
        this.processDurationEvent(event);
        return;
      }

      var constructor;
      switch (event.s) {
        case 'g':
          constructor = tr.model.GlobalInstantEvent;
          break;
        case 'p':
          constructor = tr.model.ProcessInstantEvent;
          break;
        default:
          this.model_.importWarning({
            type: 'instant_parse_error',
            message: 'I phase event with unknown "s" field value.'
          });
          return;
      }

      var instantEvent = new constructor(event.cat, event.name,
          getEventColor(event), timestampFromUs(event.ts),
          this.deepCopyIfNeeded_(event.args));

      switch (instantEvent.type) {
        case tr.model.InstantEventType.GLOBAL:
          this.model_.pushInstantEvent(instantEvent);
          break;

        case tr.model.InstantEventType.PROCESS:
          var process = this.model_.getOrCreateProcess(event.pid);
          process.pushInstantEvent(instantEvent);
          break;

        default:
          throw new Error('Unknown instant event type: ' + event.s);
      }
    },

    processV8Sample: function(event) {
      var data = event.args.data;

      // As-per DevTools, the backend sometimes creates bogus samples. Skip it.
      if (data.vm_state === 'js' && !data.stack.length)
        return;

      var rootStackFrame = this.v8ProcessRootStackFrame_[event.pid];
      if (!rootStackFrame) {
        rootStackFrame = new tr.model.StackFrame(
            undefined /* parent */, 'v8-root-stack-frame' /* id */,
            'v8-root-stack-frame' /* title */, 0 /* colorId */);
        this.v8ProcessRootStackFrame_[event.pid] = rootStackFrame;
      }

      function findChildWithEntryID(stackFrame, entryID) {
        return tr.b.findFirstInArray(stackFrame.children, function(child) {
          return child.entryID === entryID;
        });
      }

      var model = this.model_;
      function addStackFrame(lastStackFrame, entry) {
        var childFrame = findChildWithEntryID(lastStackFrame, entry.id);
        if (childFrame)
          return childFrame;

        var frame = new tr.model.StackFrame(
            lastStackFrame, tr.b.GUID.allocate(), entry.name,
            tr.ui.b.getColorIdForGeneralPurposeString(entry.name),
            entry.sourceInfo);

        frame.entryID = entry.id;
        model.addStackFrame(frame);
        return frame;
      }

      var lastStackFrame = rootStackFrame;

      // There are several types of v8 sample events, gc, native, compiler, etc.
      // Some of these types have stacks and some don't, we handle those two
      // cases differently. For types that don't have any stack frames attached
      // we synthesize one based on the type of thing that's happening so when
      // we view all the samples we'll see something like 'external' or 'gc'
      // as a fraction of the time spent.
      if (data.stack.length > 0 && this.v8ProcessCodeMaps_[event.pid]) {
        var map = this.v8ProcessCodeMaps_[event.pid];

        // Stacks have the leaf node first, flip them around so the root
        // comes first.
        data.stack.reverse();

        for (var i = 0; i < data.stack.length; i++) {
          var entry = map.lookupEntry(data.stack[i]);
          if (entry === undefined) {
            entry = {
              id: 'unknown',
              name: 'unknown',
              sourceInfo: undefined
            };
          }

          lastStackFrame = addStackFrame(lastStackFrame, entry);
        }
      } else {
        var entry = {
          id: data.vm_state,
          name: data.vm_state,
          sourceInfo: undefined
        };
        lastStackFrame = addStackFrame(lastStackFrame, entry);
      }

      var thread = this.model_.getOrCreateProcess(event.pid)
        .getOrCreateThread(event.tid);

      var sample = new tr.model.Sample(
          undefined /* cpu */, thread, 'V8 Sample',
          timestampFromUs(event.ts), lastStackFrame, 1 /* weight */,
          this.deepCopyIfNeeded_(event.args));
      this.model_.samples.push(sample);
    },

    processTraceSampleEvent: function(event) {
      if (event.name === 'V8Sample') {
        this.processV8Sample(event);
        return;
      }

      var stackFrame = this.getStackFrameForEvent_(event);
      if (stackFrame === undefined) {
        stackFrame = this.traceEventSampleStackFramesByName_[
            event.name];
      }
      if (stackFrame === undefined) {
        var id = 'te-' + tr.b.GUID.allocate();
        stackFrame = new tr.model.StackFrame(
            undefined, id, event.name,
            tr.ui.b.getColorIdForGeneralPurposeString(event.name));
        this.model_.addStackFrame(stackFrame);
        this.traceEventSampleStackFramesByName_[event.name] = stackFrame;
      }

      var thread = this.model_.getOrCreateProcess(event.pid)
        .getOrCreateThread(event.tid);

      var sample = new tr.model.Sample(
          undefined, thread, 'Trace Event Sample',
          timestampFromUs(event.ts), stackFrame, 1,
          this.deepCopyIfNeeded_(event.args));
      this.model_.samples.push(sample);
    },

    getOrCreateMemoryDumpEvents_: function(dumpId) {
      if (this.allMemoryDumpEvents_[dumpId] === undefined) {
        this.allMemoryDumpEvents_[dumpId] = {
          global: undefined,
          process: []
        };
      }
      return this.allMemoryDumpEvents_[dumpId];
    },

    processMemoryDumpEvent: function(event) {
      if (event.id === undefined) {
        this.model_.importWarning({
          type: 'memory_dump_parse_error',
          message: event.ph + ' phase event without a dump ID.'
        });
        return;
      }
      var events = this.getOrCreateMemoryDumpEvents_(event.id);

      if (event.ph === 'v') {
        // Add a process memory dump.
        events.process.push(event);
      } else if (event.ph === 'V') {
        // Add a global memory dump (unless already present).
        if (events.global !== undefined) {
          this.model_.importWarning({
            type: 'memory_dump_parse_error',
            message: 'Multiple V phase events with the same dump ID.'
          });
          return;
        }
        events.global = event;
      } else {
        throw new Error('Invalid memory dump event phase "' + event.ph + '".');
      }
    },

    /**
     * Walks through the events_ list and outputs the structures discovered to
     * model_.
     */
    importEvents: function() {
      var csr = new tr.ClockSyncRecord('ftrace_importer', 0, {});
      this.model_.clockSyncRecords.push(csr);
      if (this.stackFrameEvents_)
        this.importStackFrames_();

      if (this.traceAnnotations_)
        this.importAnnotations_();

      var events = this.events_;
      for (var eI = 0; eI < events.length; eI++) {
        var event = events[eI];
        if (event.args === '__stripped__') {
          event.argsStripped = true;
          event.args = undefined;
        }

        if (event.ph === 'B' || event.ph === 'E') {
          this.processDurationEvent(event);

        } else if (event.ph === 'X') {
          var slice = this.processCompleteEvent(event);
          // TODO(yuhaoz): If Chrome supports creating other events with flow,
          // we will need to call processFlowEvent for them also.
          // https://github.com/catapult-project/catapult/issues/1259
          if (slice !== undefined && event.bind_id !== undefined)
            this.processFlowEvent(event, slice);

        } else if (event.ph === 'b' || event.ph === 'e' || event.ph === 'n' ||
                   event.ph === 'S' || event.ph === 'F' || event.ph === 'T' ||
                   event.ph === 'p') {
          this.processAsyncEvent(event);

        // Note, I is historic. The instant event marker got changed, but we
        // want to support loading old trace files so we have both I and i.
        } else if (event.ph === 'I' || event.ph === 'i' || event.ph === 'R') {
          this.processInstantEvent(event);

        } else if (event.ph === 'P') {
          this.processTraceSampleEvent(event);

        } else if (event.ph === 'C') {
          this.processCounterEvent(event);

        } else if (event.ph === 'M') {
          this.processMetadataEvent(event);

        } else if (event.ph === 'N' || event.ph === 'D' || event.ph === 'O') {
          this.processObjectEvent(event);

        } else if (event.ph === 's' || event.ph === 't' || event.ph === 'f') {
          this.processFlowEvent(event);

        } else if (event.ph === 'v' || event.ph === 'V') {
          this.processMemoryDumpEvent(event);

        } else {
          this.model_.importWarning({
            type: 'parse_error',
            message: 'Unrecognized event phase: ' +
                event.ph + ' (' + event.name + ')'
          });
        }
      }

      // Remove all the root stack frame children as they should
      // already be added.
      tr.b.iterItems(this.v8ProcessRootStackFrame_, function(name, frame) {
        frame.removeAllChildren();
      });
    },

    importStackFrames_: function() {
      var m = this.model_;
      var events = this.stackFrameEvents_;

      for (var id in events) {
        var event = events[id];
        var textForColor = event.category ? event.category : event.name;
        var frame = new tr.model.StackFrame(
            undefined, 'g' + id, event.name,
            tr.ui.b.getColorIdForGeneralPurposeString(textForColor));
        m.addStackFrame(frame);
      }
      for (var id in events) {
        var event = events[id];
        if (event.parent === undefined)
          continue;

        var frame = m.stackFrames['g' + id];
        if (frame === undefined)
          throw new Error('omg');
        var parentFrame;
        if (event.parent === undefined) {
          parentFrame = undefined;
        } else {
          parentFrame = m.stackFrames['g' + event.parent];
          if (parentFrame === undefined)
            throw new Error('omg');
        }
        frame.parentFrame = parentFrame;
      }
    },

    importAnnotations_: function() {
      for (var id in this.traceAnnotations_) {
        var annotation = tr.model.Annotation.fromDictIfPossible(
           this.traceAnnotations_[id]);
        if (!annotation) {
          this.model_.importWarning({
            type: 'annotation_warning',
            message: 'Unrecognized traceAnnotation typeName \"' +
                this.traceAnnotations_[id].typeName + '\"'
          });
          continue;
        }
        this.model_.addAnnotation(annotation);
      }
    },

    /**
     * Called by the Model after all other importers have imported their
     * events.
     */
    finalizeImport: function() {
      if (this.softwareMeasuredCpuCount_ !== undefined) {
        this.model_.kernel.softwareMeasuredCpuCount =
            this.softwareMeasuredCpuCount_;
      }
      this.createAsyncSlices_();
      this.createFlowSlices_();
      this.createExplicitObjects_();
      this.createImplicitObjects_();
      this.createMemoryDumps_();
    },

    /* Events can have one or more stack frames associated with them, but
     * that frame might be encoded either as a stack trace of program counters,
     * or as a direct stack frame reference. This handles either case and
     * if found, returns the stackframe.
     */
    getStackFrameForEvent_: function(event, opt_lookForEndEvent) {
      var sf;
      var stack;
      if (opt_lookForEndEvent) {
        sf = event.esf;
        stack = event.estack;
      } else {
        sf = event.sf;
        stack = event.stack;
      }
      if (stack !== undefined && sf !== undefined) {
        this.model_.importWarning({
          type: 'stack_frame_and_stack_error',
          message: 'Event at ' + event.ts +
              ' cannot have both a stack and a stackframe.'
        });
        return undefined;
      }

      if (stack !== undefined)
        return this.model_.resolveStackToStackFrame_(event.pid, stack);
      if (sf === undefined)
        return undefined;

      var stackFrame = this.model_.stackFrames['g' + sf];
      if (stackFrame === undefined) {
        this.model_.importWarning({
          type: 'sample_import_error',
          message: 'No frame for ' + sf
        });
        return;
      }
      return stackFrame;
    },

    resolveStackToStackFrame_: function(pid, stack) {
      // TODO(alph,fmeawad): Add codemap resolution code here.
      return undefined;
    },

    importSampleData: function() {
      if (!this.sampleEvents_)
        return;
      var m = this.model_;

      // If this is the only importer, then fake-create the threads.
      var events = this.sampleEvents_;
      if (this.events_.length === 0) {
        for (var i = 0; i < events.length; i++) {
          var event = events[i];
          m.getOrCreateProcess(event.tid).getOrCreateThread(event.tid);
        }
      }

      var threadsByTid = {};
      m.getAllThreads().forEach(function(t) {
        threadsByTid[t.tid] = t;
      });

      for (var i = 0; i < events.length; i++) {
        var event = events[i];
        var thread = threadsByTid[event.tid];
        if (thread === undefined) {
          m.importWarning({
            type: 'sample_import_error',
            message: 'Thread ' + events.tid + 'not found'
          });
          continue;
        }

        var cpu;
        if (event.cpu !== undefined)
          cpu = m.kernel.getOrCreateCpu(event.cpu);

        var stackFrame = this.getStackFrameForEvent_(event);

        var sample = new tr.model.Sample(
            cpu, thread,
            event.name,
            timestampFromUs(event.ts),
            stackFrame,
            event.weight);
        m.samples.push(sample);
      }
    },

    /**
     * Called by the model to join references between objects, after final model
     * bounds have been computed.
     */
    joinRefs: function() {
      this.joinObjectRefs_();
    },

    createAsyncSlices_: function() {
      if (this.allAsyncEvents_.length === 0)
        return;

      this.allAsyncEvents_.sort(function(x, y) {
        var d = x.event.ts - y.event.ts;
        if (d !== 0)
          return d;
        return x.sequenceNumber - y.sequenceNumber;
      });

      var legacyEvents = [];
      // Group nestable async events by ID. Events with the same ID should
      // belong to the same parent async event.
      var nestableAsyncEventsByKey = {};
      for (var i = 0; i < this.allAsyncEvents_.length; i++) {
        var asyncEventState = this.allAsyncEvents_[i];
        var event = asyncEventState.event;
        if (event.ph === 'S' || event.ph === 'F' || event.ph === 'T' ||
            event.ph === 'p') {
          legacyEvents.push(asyncEventState);
          continue;
        }
        if (event.cat === undefined) {
          this.model_.importWarning({
            type: 'async_slice_parse_error',
            message: 'Nestable async events (ph: b, e, or n) require a ' +
                'cat parameter.'
          });
          continue;
        }

        if (event.name === undefined) {
          this.model_.importWarning({
            type: 'async_slice_parse_error',
            message: 'Nestable async events (ph: b, e, or n) require a ' +
                'name parameter.'
          });
          continue;
        }

        if (event.id === undefined) {
          this.model_.importWarning({
            type: 'async_slice_parse_error',
            message: 'Nestable async events (ph: b, e, or n) require an ' +
                'id parameter.'
          });
          continue;
        }
        var key = event.cat + ':' + event.id;
        if (nestableAsyncEventsByKey[key] === undefined)
           nestableAsyncEventsByKey[key] = [];
        nestableAsyncEventsByKey[key].push(asyncEventState);
      }
      // Handle legacy async events.
      this.createLegacyAsyncSlices_(legacyEvents);

      // Parse nestable async events into AsyncSlices.
      for (var key in nestableAsyncEventsByKey) {
        var eventStateEntries = nestableAsyncEventsByKey[key];
        // Stack of enclosing BEGIN events.
        var parentStack = [];
        for (var i = 0; i < eventStateEntries.length; ++i) {
          var eventStateEntry = eventStateEntries[i];
          // If this is the end of an event, match it to the start.
          if (eventStateEntry.event.ph === 'e') {
            // Walk up the parent stack to find the corresponding BEGIN for
            // this END.
            var parentIndex = -1;
            for (var k = parentStack.length - 1; k >= 0; --k) {
              if (parentStack[k].event.name === eventStateEntry.event.name) {
                parentIndex = k;
                break;
              }
            }
            if (parentIndex === -1) {
              // Unmatched end.
              eventStateEntry.finished = false;
            } else {
              parentStack[parentIndex].end = eventStateEntry;
              // Pop off all enclosing unmatched BEGINs util parentIndex.
              while (parentIndex < parentStack.length) {
                parentStack.pop();
              }
            }
          }
          // Inherit the current parent.
          if (parentStack.length > 0)
            eventStateEntry.parentEntry = parentStack[parentStack.length - 1];
          if (eventStateEntry.event.ph === 'b')
            parentStack.push(eventStateEntry);
        }
        var topLevelSlices = [];
        for (var i = 0; i < eventStateEntries.length; ++i) {
          var eventStateEntry = eventStateEntries[i];
          // Skip matched END, as its slice will be created when we
          // encounter its corresponding BEGIN.
          if (eventStateEntry.event.ph === 'e' &&
              eventStateEntry.finished === undefined) {
            continue;
          }
          var startState = undefined;
          var endState = undefined;
          var sliceArgs = eventStateEntry.event.args || {};
          var sliceError = undefined;
          if (eventStateEntry.event.ph === 'n') {
            startState = eventStateEntry;
            endState = eventStateEntry;
          } else if (eventStateEntry.event.ph === 'b') {
            if (eventStateEntry.end === undefined) {
              // Unmatched BEGIN. End it when last event with this ID ends.
              eventStateEntry.end =
                  eventStateEntries[eventStateEntries.length - 1];
              sliceError =
                  'Slice has no matching END. End time has been adjusted.';
              this.model_.importWarning({
                type: 'async_slice_parse_error',
                message: 'Nestable async BEGIN event at ' +
                    eventStateEntry.event.ts + ' with name=' +
                    eventStateEntry.event.name +
                    ' and id=' + eventStateEntry.event.id + ' was unmatched.'
              });
            } else {
              // Include args for both END and BEGIN for a matched pair.
              function concatenateArguments(args1, args2) {
                if (args1.params === undefined || args2.params === undefined)
                  return tr.b.concatenateObjects(args1, args2);
                // Make an argument object to hold the combined params.
                var args3 = {};
                args3.params = tr.b.concatenateObjects(args1.params,
                                                       args2.params);
                return tr.b.concatenateObjects(args1, args2, args3);
              }
              var endArgs = eventStateEntry.end.event.args || {};
              sliceArgs = concatenateArguments(sliceArgs, endArgs);
            }
            startState = eventStateEntry;
            endState = eventStateEntry.end;
          } else {
            // Unmatched END. Start it at the first event with this ID starts.
            sliceError =
                'Slice has no matching BEGIN. Start time has been adjusted.';
            this.model_.importWarning({
              type: 'async_slice_parse_error',
              message: 'Nestable async END event at ' +
                  eventStateEntry.event.ts + ' with name=' +
                  eventStateEntry.event.name +
                  ' and id=' + eventStateEntry.event.id + ' was unmatched.'
            });
            startState = eventStateEntries[0];
            endState = eventStateEntry;
          }

          var isTopLevel = (eventStateEntry.parentEntry === undefined);
          var asyncSliceConstructor =
             tr.model.AsyncSlice.getConstructor(
                eventStateEntry.event.cat,
                eventStateEntry.event.name);

          var thread_start = undefined;
          var thread_duration = undefined;
          if (startState.event.tts && startState.event.use_async_tts) {
            thread_start = timestampFromUs(startState.event.tts);
            if (endState.event.tts) {
              var thread_end = timestampFromUs(endState.event.tts);
              thread_duration = thread_end - thread_start;
            }
          }

          var slice = new asyncSliceConstructor(
              eventStateEntry.event.cat,
              eventStateEntry.event.name,
              getEventColor(endState.event),
              timestampFromUs(startState.event.ts),
              sliceArgs,
              timestampFromUs(endState.event.ts - startState.event.ts),
              isTopLevel,
              thread_start,
              thread_duration,
              startState.event.argsStripped);

          slice.startThread = startState.thread;
          slice.endThread = endState.thread;

          slice.startStackFrame = this.getStackFrameForEvent_(startState.event);
          slice.endStackFrame = this.getStackFrameForEvent_(endState.event);

          slice.id = key;
          if (sliceError !== undefined)
            slice.error = sliceError;
          eventStateEntry.slice = slice;
          // Add the slice to the topLevelSlices array if there is no parent.
          // Otherwise, add the slice to the subSlices of its parent.
          if (isTopLevel) {
            topLevelSlices.push(slice);
          } else if (eventStateEntry.parentEntry.slice !== undefined) {
            eventStateEntry.parentEntry.slice.subSlices.push(slice);
          }
        }
        for (var si = 0; si < topLevelSlices.length; si++) {
          topLevelSlices[si].startThread.asyncSliceGroup.push(
              topLevelSlices[si]);
        }
      }
    },

    createLegacyAsyncSlices_: function(legacyEvents) {
      if (legacyEvents.length === 0)
        return;

      legacyEvents.sort(function(x, y) {
        var d = x.event.ts - y.event.ts;
        if (d != 0)
          return d;
        return x.sequenceNumber - y.sequenceNumber;
      });

      var asyncEventStatesByNameThenID = {};

      for (var i = 0; i < legacyEvents.length; i++) {
        var asyncEventState = legacyEvents[i];

        var event = asyncEventState.event;
        var name = event.name;
        if (name === undefined) {
          this.model_.importWarning({
            type: 'async_slice_parse_error',
            message: 'Async events (ph: S, T, p, or F) require a name ' +
                ' parameter.'
          });
          continue;
        }

        var id = event.id;
        if (id === undefined) {
          this.model_.importWarning({
            type: 'async_slice_parse_error',
            message: 'Async events (ph: S, T, p, or F) require an id parameter.'
          });
          continue;
        }

        // TODO(simonjam): Add a synchronous tick on the appropriate thread.

        if (event.ph === 'S') {
          if (asyncEventStatesByNameThenID[name] === undefined)
            asyncEventStatesByNameThenID[name] = {};
          if (asyncEventStatesByNameThenID[name][id]) {
            this.model_.importWarning({
              type: 'async_slice_parse_error',
              message: 'At ' + event.ts + ', a slice of the same id ' + id +
                  ' was alrady open.'
            });
            continue;
          }
          asyncEventStatesByNameThenID[name][id] = [];
          asyncEventStatesByNameThenID[name][id].push(asyncEventState);
        } else {
          if (asyncEventStatesByNameThenID[name] === undefined) {
            this.model_.importWarning({
              type: 'async_slice_parse_error',
              message: 'At ' + event.ts + ', no slice named ' + name +
                  ' was open.'
            });
            continue;
          }
          if (asyncEventStatesByNameThenID[name][id] === undefined) {
            this.model_.importWarning({
              type: 'async_slice_parse_error',
              message: 'At ' + event.ts + ', no slice named ' + name +
                  ' with id=' + id + ' was open.'
            });
            continue;
          }
          var events = asyncEventStatesByNameThenID[name][id];
          events.push(asyncEventState);

          if (event.ph === 'F') {
            // Create a slice from start to end.
            var asyncSliceConstructor =
               tr.model.AsyncSlice.getConstructor(
                  events[0].event.cat,
                  name);
            var slice = new asyncSliceConstructor(
                events[0].event.cat,
                name,
                getEventColor(events[0].event),
                timestampFromUs(events[0].event.ts),
                tr.b.concatenateObjects(events[0].event.args,
                                      events[events.length - 1].event.args),
                timestampFromUs(event.ts - events[0].event.ts),
                true, undefined, undefined, events[0].event.argsStripped);
            slice.startThread = events[0].thread;
            slice.endThread = asyncEventState.thread;
            slice.id = id;

            var stepType = events[1].event.ph;
            var isValid = true;

            // Create subSlices for each step. Skip the start and finish events,
            // which are always first and last respectively.
            for (var j = 1; j < events.length - 1; ++j) {
              if (events[j].event.ph === 'T' || events[j].event.ph === 'p') {
                isValid = this.assertStepTypeMatches_(stepType, events[j]);
                if (!isValid)
                  break;
              }

              if (events[j].event.ph === 'S') {
                this.model_.importWarning({
                  type: 'async_slice_parse_error',
                  message: 'At ' + event.event.ts + ', a slice named ' +
                      event.event.name + ' with id=' + event.event.id +
                      ' had a step before the start event.'
                });
                continue;
              }

              if (events[j].event.ph === 'F') {
                this.model_.importWarning({
                  type: 'async_slice_parse_error',
                  message: 'At ' + event.event.ts + ', a slice named ' +
                      event.event.name + ' with id=' + event.event.id +
                      ' had a step after the finish event.'
                });
                continue;
              }

              var startIndex = j + (stepType === 'T' ? 0 : -1);
              var endIndex = startIndex + 1;

              var subName = events[j].event.name;
              if (!events[j].event.argsStripped &&
                  (events[j].event.ph === 'T' || events[j].event.ph === 'p'))
                subName = subName + ':' + events[j].event.args.step;

              var asyncSliceConstructor =
                 tr.model.AsyncSlice.getConstructor(
                    events[0].event.cat,
                    subName);
              var subSlice = new asyncSliceConstructor(
                  events[0].event.cat,
                  subName,
                  getEventColor(event, subName + j),
                  timestampFromUs(events[startIndex].event.ts),
                  this.deepCopyIfNeeded_(events[j].event.args),
                  timestampFromUs(
                    events[endIndex].event.ts - events[startIndex].event.ts),
                      undefined, undefined,
                      events[startIndex].event.argsStripped);
              subSlice.startThread = events[startIndex].thread;
              subSlice.endThread = events[endIndex].thread;
              subSlice.id = id;

              slice.subSlices.push(subSlice);
            }

            if (isValid) {
              // Add |slice| to the start-thread's asyncSlices.
              slice.startThread.asyncSliceGroup.push(slice);
            }

            delete asyncEventStatesByNameThenID[name][id];
          }
        }
      }
    },

    assertStepTypeMatches_: function(stepType, event) {
      if (stepType != event.event.ph) {
        this.model_.importWarning({
          type: 'async_slice_parse_error',
          message: 'At ' + event.event.ts + ', a slice named ' +
              event.event.name + ' with id=' + event.event.id +
              ' had both begin and end steps, which is not allowed.'
        });
        return false;
      }
      return true;
    },

    createFlowSlices_: function() {
      if (this.allFlowEvents_.length === 0)
        return;

      var that = this;

      function validateFlowEvent() {
        if (event.name === undefined) {
          that.model_.importWarning({
            type: 'flow_slice_parse_error',
            message: 'Flow events (ph: s, t or f) require a name parameter.'
          });
          return false;
        }

        // Support Flow API v1.
        if (event.ph === 's' || event.ph === 'f' || event.ph === 't') {
          if (event.id === undefined) {
            that.model_.importWarning({
              type: 'flow_slice_parse_error',
              message: 'Flow events (ph: s, t or f) require an id parameter.'
            });
            return false;
          }
          return true;
        }

        // Support Flow API v2.
        if (event.bind_id) {
          if (event.flow_in === undefined && event.flow_out === undefined) {
            that.model_.importWarning({
              type: 'flow_slice_parse_error',
              message: 'Flow producer or consumer require flow_in or flow_out.'
            });
            return false;
          }
          return true;
        }

        return false;
      }

      function createFlowEvent(thread, event, opt_slice) {
        var startSlice, flowId, flowStartTs;

        if (event.bind_id) {
          // Support Flow API v2.
          startSlice = opt_slice;
          flowId = event.bind_id;
          flowStartTs = timestampFromUs(event.ts + event.dur);
        } else {
          // Support Flow API v1.
          var ts = timestampFromUs(event.ts);
          startSlice = thread.sliceGroup.findSliceAtTs(ts);
          if (startSlice === undefined)
            return undefined;
          flowId = event.id;
          flowStartTs = ts;
        }

        var flowEvent = new tr.model.FlowEvent(
            event.cat,
            flowId,
            event.name,
            getEventColor(event),
            flowStartTs,
            that.deepCopyAlways_(event.args));
        flowEvent.startSlice = startSlice;
        flowEvent.startStackFrame = that.getStackFrameForEvent_(event);
        flowEvent.endStackFrame = undefined;
        startSlice.outFlowEvents.push(flowEvent);
        return flowEvent;
      }

      function finishFlowEventWith(flowEvent, thread, event,
                                   refGuid, bindToParent, opt_slice) {
        var endSlice;

        if (event.bind_id) {
          // Support Flow API v2.
          endSlice = opt_slice;
        } else {
          // Support Flow API v1.
          var ts = timestampFromUs(event.ts);
          if (bindToParent) {
            endSlice = thread.sliceGroup.findSliceAtTs(ts);
          } else {
            endSlice = thread.sliceGroup.findNextSliceAfter(ts, refGuid);
          }
          if (endSlice === undefined)
            return false;
        }

        endSlice.inFlowEvents.push(flowEvent);
        flowEvent.endSlice = endSlice;
        flowEvent.duration = timestampFromUs(event.ts) - flowEvent.start;
        flowEvent.endStackFrame = that.getStackFrameForEvent_(event);
        that.mergeArgsInto_(flowEvent.args, event.args, flowEvent.title);
        return true;
      }

      function processFlowConsumer(flowIdToEvent, sliceGuidToEvent, event,
          slice) {
        var flowEvent = flowIdToEvent[event.bind_id];
        if (flowEvent === undefined) {
          that.model_.importWarning({
              type: 'flow_slice_ordering_error',
              message: 'Flow consumer ' + event.bind_id + ' does not have ' +
                  'a flow producer'});
          return false;
        } else if (flowEvent.endSlice) {
          // One flow producer can have more than one flow consumers.
          // In this case, create a new flow event using the flow producer.
          var flowProducer = flowEvent.startSlice;
          flowEvent = createFlowEvent(undefined,
              sliceGuidToEvent[flowProducer.guid], flowProducer);
        }

        var ok = finishFlowEventWith(flowEvent, undefined, event,
                                     refGuid, undefined, slice);
        if (ok) {
          that.model_.flowEvents.push(flowEvent);
        } else {
          that.model_.importWarning({
              type: 'flow_slice_end_error',
              message: 'Flow consumer ' + event.bind_id + ' does not end ' +
                  'at an actual slice, so cannot be created.'});
          return false;
        }

        return true;
      }

      function processFlowProducer(flowIdToEvent, flowStatus, event, slice) {
        if (flowIdToEvent[event.bind_id] &&
            flowStatus[event.bind_id]) {
          // Can't open the same flow again while it's still open.
          // This is essentially the multi-producer case which we don't support
          that.model_.importWarning({
              type: 'flow_slice_start_error',
              message: 'Flow producer ' + event.bind_id + ' already seen'});
          return false;
        }

        var flowEvent = createFlowEvent(undefined, event, slice);
        if (!flowEvent) {
          that.model_.importWarning({
              type: 'flow_slice_start_error',
              message: 'Flow producer ' + event.bind_id + ' does not start' +
                  'a flow'});
          return false;
        }
        flowIdToEvent[event.bind_id] = flowEvent;

        return;
      }

      // Actual import.
      this.allFlowEvents_.sort(function(x, y) {
        var d = x.event.ts - y.event.ts;
        if (d != 0)
          return d;
        return x.sequenceNumber - y.sequenceNumber;
      });

      var flowIdToEvent = {};
      var sliceGuidToEvent = {};
      var flowStatus = {}; // true: open; false: closed.
      for (var i = 0; i < this.allFlowEvents_.length; ++i) {
        var data = this.allFlowEvents_[i];
        var refGuid = data.refGuid;
        var event = data.event;
        var thread = data.thread;
        if (!validateFlowEvent(event))
          continue;

        // Support for Flow API v2.
        if (event.bind_id) {
          var slice = data.slice;
          sliceGuidToEvent[slice.guid] = event;

          if (event.flowPhase === PRODUCER) {
            if (!processFlowProducer(flowIdToEvent, flowStatus, event, slice))
              continue;
            flowStatus[event.bind_id] = true; // open the flow.
          }
          else {
            if (!processFlowConsumer(flowIdToEvent, sliceGuidToEvent,
                event, slice))
              continue;
            flowStatus[event.bind_id] = false; // close the flow.

            if (event.flowPhase === STEP) {
              if (!processFlowProducer(flowIdToEvent, flowStatus,
                  event, slice))
                continue;
              flowStatus[event.bind_id] = true; // open the flow again.
            }
          }
          continue;
        }

        // Support for Flow API v1.
        var flowEvent;
        if (event.ph === 's') {
          if (flowIdToEvent[event.id]) {
            this.model_.importWarning({
              type: 'flow_slice_start_error',
              message: 'event id ' + event.id + ' already seen when ' +
                  'encountering start of flow event.'});
            continue;
          }
          flowEvent = createFlowEvent(thread, event);
          if (!flowEvent) {
            this.model_.importWarning({
              type: 'flow_slice_start_error',
              message: 'event id ' + event.id + ' does not start ' +
                  'at an actual slice, so cannot be created.'});
            continue;
          }
          flowIdToEvent[event.id] = flowEvent;

        } else if (event.ph === 't' || event.ph === 'f') {
          flowEvent = flowIdToEvent[event.id];
          if (flowEvent === undefined) {
            this.model_.importWarning({
              type: 'flow_slice_ordering_error',
              message: 'Found flow phase ' + event.ph + ' for id: ' + event.id +
                  ' but no flow start found.'
            });
            continue;
          }

          var bindToParent = event.ph === 't';

          if (event.ph === 'f') {
            if (event.bp === undefined) {
              // TODO(yuhaoz): In flow V2, there is no notion of binding point.
              // Removal of binding point is tracked in
              // https://github.com/google/trace-viewer/issues/991.
              if (event.cat.indexOf('input') > -1)
                bindToParent = true;
              else if (event.cat.indexOf('ipc.flow') > -1)
                bindToParent = true;
            } else {
              if (event.bp !== 'e') {
                this.model_.importWarning({
                 type: 'flow_slice_bind_point_error',
                 message: 'Flow event with invalid binding point (event.bp).'
                });
                continue;
              }
              bindToParent = true;
            }
          }

          var ok = finishFlowEventWith(flowEvent, thread, event,
                                       refGuid, bindToParent);
          if (ok) {
            that.model_.flowEvents.push(flowEvent);
          } else {
            this.model_.importWarning({
              type: 'flow_slice_end_error',
              message: 'event id ' + event.id + ' does not end ' +
                  'at an actual slice, so cannot be created.'});
          }
          flowIdToEvent[event.id] = undefined;

          // If this is a step, then create another flow event.
          if (ok && event.ph === 't') {
            flowEvent = createFlowEvent(thread, event);
            flowIdToEvent[event.id] = flowEvent;
          }
        }
      }
    },

    /**
     * This function creates objects described via the N, D, and O phase
     * events.
     */
    createExplicitObjects_: function() {
      if (this.allObjectEvents_.length === 0)
        return;

      function processEvent(objectEventState) {
        var event = objectEventState.event;
        var thread = objectEventState.thread;
        if (event.name === undefined) {
          this.model_.importWarning({
            type: 'object_parse_error',
            message: 'While processing ' + JSON.stringify(event) + ': ' +
                'Object events require an name parameter.'
          });
        }

        if (event.id === undefined) {
          this.model_.importWarning({
            type: 'object_parse_error',
            message: 'While processing ' + JSON.stringify(event) + ': ' +
                'Object events require an id parameter.'
          });
        }
        var process = thread.parent;
        var ts = timestampFromUs(event.ts);
        var instance;
        if (event.ph === 'N') {
          try {
            instance = process.objects.idWasCreated(
                event.id, event.cat, event.name, ts);
          } catch (e) {
            this.model_.importWarning({
              type: 'object_parse_error',
              message: 'While processing create of ' +
                  event.id + ' at ts=' + ts + ': ' + e
            });
            return;
          }
        } else if (event.ph === 'O') {
          if (event.args.snapshot === undefined) {
            this.model_.importWarning({
              type: 'object_parse_error',
              message: 'While processing ' + event.id + ' at ts=' + ts + ': ' +
                  'Snapshots must have args: {snapshot: ...}'
            });
            return;
          }
          var snapshot;
          try {
            var args = this.deepCopyIfNeeded_(event.args.snapshot);
            var cat;
            if (args.cat) {
              cat = args.cat;
              delete args.cat;
            } else {
              cat = event.cat;
            }

            var baseTypename;
            if (args.base_type) {
              baseTypename = args.base_type;
              delete args.base_type;
            } else {
              baseTypename = undefined;
            }
            snapshot = process.objects.addSnapshot(
                event.id, cat, event.name, ts,
                args, baseTypename);
            snapshot.snapshottedOnThread = thread;
          } catch (e) {
            this.model_.importWarning({
              type: 'object_parse_error',
              message: 'While processing snapshot of ' +
                  event.id + ' at ts=' + ts + ': ' + e
            });
            return;
          }
          instance = snapshot.objectInstance;
        } else if (event.ph === 'D') {
          try {
            process.objects.idWasDeleted(event.id, event.cat, event.name, ts);
            var instanceMap = process.objects.getOrCreateInstanceMap_(event.id);
            instance = instanceMap.lastInstance;
          } catch (e) {
            this.model_.importWarning({
              type: 'object_parse_error',
              message: 'While processing delete of ' +
                  event.id + ' at ts=' + ts + ': ' + e
            });
            return;
          }
        }

        if (instance)
          instance.colorId = getEventColor(event, instance.typeName);
      }

      this.allObjectEvents_.sort(function(x, y) {
        var d = x.event.ts - y.event.ts;
        if (d != 0)
          return d;
        return x.sequenceNumber - y.sequenceNumber;
      });

      var allObjectEvents = this.allObjectEvents_;
      for (var i = 0; i < allObjectEvents.length; i++) {
        var objectEventState = allObjectEvents[i];
        try {
          processEvent.call(this, objectEventState);
        } catch (e) {
          this.model_.importWarning({
            type: 'object_parse_error',
            message: e.message
          });
        }
      }
    },

    createImplicitObjects_: function() {
      tr.b.iterItems(this.model_.processes, function(pid, process) {
        this.createImplicitObjectsForProcess_(process);
      }, this);
    },

    // Here, we collect all the snapshots that internally contain a
    // Javascript-level object inside their args list that has an "id" field,
    // and turn that into a snapshot of the instance referred to by id.
    createImplicitObjectsForProcess_: function(process) {

      function processField(referencingObject,
                            referencingObjectFieldName,
                            referencingObjectFieldValue,
                            containingSnapshot) {
        if (!referencingObjectFieldValue)
          return;

        if (referencingObjectFieldValue instanceof
            tr.model.ObjectSnapshot)
          return null;
        if (referencingObjectFieldValue.id === undefined)
          return;

        var implicitSnapshot = referencingObjectFieldValue;

        var rawId = implicitSnapshot.id;
        var m = /(.+)\/(.+)/.exec(rawId);
        if (!m)
          throw new Error('Implicit snapshots must have names.');
        delete implicitSnapshot.id;
        var name = m[1];
        var id = m[2];
        var res;

        var cat;
        if (implicitSnapshot.cat !== undefined)
          cat = implicitSnapshot.cat;
        else
          cat = containingSnapshot.objectInstance.category;

        var baseTypename;
        if (implicitSnapshot.base_type)
          baseTypename = implicitSnapshot.base_type;
        else
          baseTypename = undefined;

        try {
          res = process.objects.addSnapshot(
              id, cat,
              name, containingSnapshot.ts,
              implicitSnapshot, baseTypename);
        } catch (e) {
          this.model_.importWarning({
            type: 'object_snapshot_parse_error',
            message: 'While processing implicit snapshot of ' +
                rawId + ' at ts=' + containingSnapshot.ts + ': ' + e
          });
          return;
        }
        res.objectInstance.hasImplicitSnapshots = true;
        res.containingSnapshot = containingSnapshot;
        res.snapshottedOnThread = containingSnapshot.snapshottedOnThread;
        referencingObject[referencingObjectFieldName] = res;
        if (!(res instanceof tr.model.ObjectSnapshot))
          throw new Error('Created object must be instanceof snapshot');
        return res.args;
      }

      /**
       * Iterates over the fields in the object, calling func for every
       * field/value found.
       *
       * @return {object} If the function does not want the field's value to be
       * iterated, return null. If iteration of the field value is desired, then
       * return either undefined (if the field value did not change) or the new
       * field value if it was changed.
       */
      function iterObject(object, func, containingSnapshot, thisArg) {
        if (!(object instanceof Object))
          return;

        if (object instanceof Array) {
          for (var i = 0; i < object.length; i++) {
            var res = func.call(thisArg, object, i, object[i],
                                containingSnapshot);
            if (res === null)
              continue;
            if (res)
              iterObject(res, func, containingSnapshot, thisArg);
            else
              iterObject(object[i], func, containingSnapshot, thisArg);
          }
          return;
        }

        for (var key in object) {
          var res = func.call(thisArg, object, key, object[key],
                              containingSnapshot);
          if (res === null)
            continue;
          if (res)
            iterObject(res, func, containingSnapshot, thisArg);
          else
            iterObject(object[key], func, containingSnapshot, thisArg);
        }
      }

      // TODO(nduca): We may need to iterate the instances in sorted order by
      // creationTs.
      process.objects.iterObjectInstances(function(instance) {
        instance.snapshots.forEach(function(snapshot) {
          if (snapshot.args.id !== undefined)
            throw new Error('args cannot have an id field inside it');
          iterObject(snapshot.args, processField, snapshot, this);
        }, this);
      }, this);
    },

    createMemoryDumps_: function() {
      tr.b.iterItems(this.allMemoryDumpEvents_, function(id, events) {
        // Calculate the range of the global memory dump.
        var range = new tr.b.Range();
        if (events.global !== undefined)
          range.addValue(timestampFromUs(events.global.ts));
        for (var i = 0; i < events.process.length; i++)
          range.addValue(timestampFromUs(events.process[i].ts));

        // Create the global memory dump.
        var globalMemoryDump = new tr.model.GlobalMemoryDump(
            this.model_, range.min);
        globalMemoryDump.duration = range.range;
        this.model_.globalMemoryDumps.push(globalMemoryDump);

        // Create individual process memory dumps.
        if (events.process.length === 0) {
          this.model_.importWarning({
              type: 'memory_dump_parse_error',
              message: 'No process memory dumps associated with global memory' +
                  ' dump ' + id + '.'
          });
        }

        var allMemoryAllocatorDumpsByGuid = {};
        var globalMemoryAllocatorDumpsByFullName = {};

        var LEVELS_OF_DETAIL = [undefined, 'light', 'detailed'];
        var globalLevelOfDetailIndex = undefined;

        events.process.forEach(function(processEvent) {
          var pid = processEvent.pid;
          if (pid in globalMemoryDump.processMemoryDumps) {
            this.model_.importWarning({
              type: 'memory_dump_parse_error',
              message: 'Multiple process memory dumps with pid=' + pid +
                  ' for dump id ' + id + '.'
            });
            return;
          }

          var dumps = processEvent.args.dumps;
          if (dumps === undefined) {
            this.model_.importWarning({
                type: 'memory_dump_parse_error',
                message: 'dumps not found in process memory dump for ' +
                    'pid=' + pid + ' and dump id=' + id + '.'
            });
            return;
          }

          var process = this.model_.getOrCreateProcess(pid);
          var processMemoryDump = new tr.model.ProcessMemoryDump(
              globalMemoryDump, process,
              timestampFromUs(processEvent.ts));

          // Determine the level of detail of the dump.
          var processLevelOfDetail = dumps.level_of_detail;
          var processLevelOfDetailIndex = LEVELS_OF_DETAIL.indexOf(
              processLevelOfDetail);
          if (processLevelOfDetailIndex < 0) {
            this.model_.importWarning({
              type: 'memory_dump_parse_error',
              message: 'unknown level of detail \'' + processLevelOfDetail +
                  '\' of process memory dump for pid=' + pid +
                  ' and dump id=' + id + '.'
            });
          } else {
            processMemoryDump.levelOfDetail = processLevelOfDetail;
            if (globalLevelOfDetailIndex === undefined) {
              globalLevelOfDetailIndex = processLevelOfDetailIndex;
            } else if (globalLevelOfDetailIndex !== processLevelOfDetailIndex) {
              // If the process memory dumps have different levels of detail,
              // show a warning and use the highest level.
              this.model_.importWarning({
                type: 'memory_dump_parse_error',
                message: 'diffent levels of detail of process memory dumps ' +
                    'for dump id=' + id + '.'
              });
              globalLevelOfDetailIndex = Math.max(
                  globalLevelOfDetailIndex, processLevelOfDetailIndex);
            }
          }

          // Parse the totals.
          var rawTotals = dumps.process_totals;
          if (rawTotals !== undefined) {
            processMemoryDump.totals = {};

            // Total resident bytes (mandatory).
            if (rawTotals.resident_set_bytes !== undefined) {
              processMemoryDump.totals.residentBytes = parseInt(
                  rawTotals.resident_set_bytes, 16);
            }

            // Peak resident bytes (optional).
            if (rawTotals.peak_resident_set_bytes !== undefined) {
              if (rawTotals.is_peak_rss_resetable === undefined) {
                this.model_.importWarning({
                    type: 'memory_dump_parse_error',
                    message: 'Optional field peak_resident_set_bytes found' +
                        ' but is_peak_rss_resetable not found in' +
                        ' process memory dump for pid=' + pid +
                        ' and dump id=' + id + '.'
                });
              }
              processMemoryDump.totals.peakResidentBytes = parseInt(
                  rawTotals.peak_resident_set_bytes, 16);
            }
            if (rawTotals.is_peak_rss_resetable !== undefined) {
              if (rawTotals.peak_resident_set_bytes === undefined) {
                this.model_.importWarning({
                    type: 'memory_dump_parse_error',
                    message: 'Optional field is_peak_rss_resetable found' +
                        ' but peak_resident_set_bytes not found in' +
                        ' process memory dump for pid=' + pid +
                        ' and dump id=' + id + '.'
                });
              }
              processMemoryDump.totals.arePeakResidentBytesResettable =
                  !!rawTotals.is_peak_rss_resetable;
            }
          }
          if (processMemoryDump.totals === undefined ||
              processMemoryDump.totals.residentBytes === undefined) {
            this.model_.importWarning({
                type: 'memory_dump_parse_error',
                message: 'Mandatory field resident_set_bytes not found in' +
                    ' process memory dump for pid=' + pid +
                    ' and dump id=' + id + '.'
            });
          }

          // Populate the vmRegions, if present.
          if (dumps.process_mmaps && dumps.process_mmaps.vm_regions) {
            function parseByteStat(rawValue) {
              if (rawValue === undefined)
                return undefined;
              return parseInt(rawValue, 16);
            }

            processMemoryDump.vmRegions = dumps.process_mmaps.vm_regions.map(
              function(rawRegion) {
                // See //base/trace_event/process_memory_maps.cc in Chromium.
                var byteStats = new tr.model.VMRegionByteStats(
                  parseByteStat(rawRegion.bs.pc),
                  parseByteStat(rawRegion.bs.pd),
                  parseByteStat(rawRegion.bs.sc),
                  parseByteStat(rawRegion.bs.sd),
                  parseByteStat(rawRegion.bs.pss),
                  parseByteStat(rawRegion.bs.sw)
                );
                return new tr.model.VMRegion(
                    parseInt(rawRegion.sa, 16),  // startAddress
                    parseInt(rawRegion.sz, 16),  // sizeInBytes
                    rawRegion.pf,  // protectionFlags
                    rawRegion.mf,  // mappedFile
                    byteStats
                );
              }
            );
          }

          // Gather the process and global memory allocator dumps, if present.
          var processMemoryAllocatorDumpsByFullName = {};
          if (dumps.allocators !== undefined) {
            // Construct the MemoryAllocatorDump objects without parent links
            // and add them to the processMemoryAllocatorDumpsByName and
            // globalMemoryAllocatorDumpsByName indices appropriately.
            tr.b.iterItems(dumps.allocators,
                function(fullName, rawAllocatorDump) {
              // Every memory allocator dump should have a GUID. If not, then
              // it cannot be associated with any edges.
              var guid = rawAllocatorDump.guid;
              if (guid === undefined) {
                this.model_.importWarning({
                  type: 'memory_dump_parse_error',
                  message: 'Memory allocator dump ' + fullName +
                      ' from pid=' + pid + ' does not have a GUID.'
                });
              }

              // Determine if this is a global memory allocator dump (check if
              // it's prefixed with 'global/').
              var GLOBAL_MEMORY_ALLOCATOR_DUMP_PREFIX = 'global/';
              var containerMemoryDump;
              var dstIndex;
              if (fullName.startsWith(GLOBAL_MEMORY_ALLOCATOR_DUMP_PREFIX)) {
                // Global memory allocator dump.
                fullName = fullName.substring(
                    GLOBAL_MEMORY_ALLOCATOR_DUMP_PREFIX.length);
                containerMemoryDump = globalMemoryDump;
                dstIndex = globalMemoryAllocatorDumpsByFullName;
              } else {
                // Process memory allocator dump.
                containerMemoryDump = processMemoryDump;
                dstIndex = processMemoryAllocatorDumpsByFullName;
              }

              // Construct or retrieve a memory allocator dump with the provided
              // GUID.
              var allocatorDump = allMemoryAllocatorDumpsByGuid[guid];
              if (allocatorDump === undefined) {
                if (fullName in dstIndex) {
                  this.model_.importWarning({
                    type: 'memory_dump_parse_error',
                    message: 'Multiple GUIDs provided for' +
                        ' memory allocator dump ' + fullName + ': ' +
                        dstIndex[fullName].guid + ', ' + guid + ' (ignored).'
                  });
                  return;
                }
                allocatorDump = new tr.model.MemoryAllocatorDump(
                    containerMemoryDump, fullName, guid);
                dstIndex[fullName] = allocatorDump;
                if (guid !== undefined)
                  allMemoryAllocatorDumpsByGuid[guid] = allocatorDump;
              } else {
                // A memory allocator dump with this GUID has already been
                // dumped (so we will only add new attributes). Check that it
                // belonged to the same process or was also global.
                if (allocatorDump.containerMemoryDump !== containerMemoryDump) {
                  this.model_.importWarning({
                  type: 'memory_dump_parse_error',
                  message: 'Memory allocator dump ' + fullName +
                      ' (GUID=' + guid + ') dumped in different contexts.'
                  });
                  return;
                }
                // Check that the names of the memory allocator dumps match.
                if (allocatorDump.fullName !== fullName) {
                  this.model_.importWarning({
                  type: 'memory_dump_parse_error',
                  message: 'Memory allocator dump with GUID=' + guid +
                      ' has multiple names: ' + allocatorDump.fullName +
                      ', ' + fullName + ' (ignored).'
                  });
                  return;
                }
              }

              // Add all new attributes to the memory allocator dump.
              var attributes = rawAllocatorDump.attrs;
              if (attributes === undefined) {
                this.model_.importWarning({
                  type: 'memory_dump_parse_error',
                  message: 'Memory allocator dump ' + fullName +
                      ' from pid=' + pid + ' (GUID=' + guid + ') does not' +
                      ' have attributes.'
                });
                attributes = {};
              }

              tr.b.iterItems(attributes, function(attrName, attrArgs) {
                if (attrName in allocatorDump.attributes) {
                  // Skip existing attributes of the memory allocator dump.
                  this.model_.importWarning({
                  type: 'memory_dump_parse_error',
                  message: 'Multiple values provided for attribute ' +
                      attrName + ' of memory allocator dump ' + fullName +
                      ' (GUID=' + guid + ').'
                  });
                  return;
                }
                var attrValue =
                    tr.model.Attribute.fromDictIfPossible(attrArgs);
                allocatorDump.addAttribute(attrName, attrValue);
              }, this);
            }, this);
          }

          // Find the root allocator dumps and establish the parent links of
          // the process memory dump.
          processMemoryDump.memoryAllocatorDumps =
              this.inferMemoryAllocatorDumpTree_(
                  processMemoryAllocatorDumpsByFullName);

          process.memoryDumps.push(processMemoryDump);
          globalMemoryDump.processMemoryDumps[pid] = processMemoryDump;
        }, this);

        globalMemoryDump.levelOfDetail =
            LEVELS_OF_DETAIL[globalLevelOfDetailIndex];

        // Find the root allocator dumps and establish the parent links of
        // the global memory dump.
        globalMemoryDump.memoryAllocatorDumps =
            this.inferMemoryAllocatorDumpTree_(
                globalMemoryAllocatorDumpsByFullName);

        // Set up edges between memory allocator dumps.
        events.process.forEach(function(processEvent) {
          var dumps = processEvent.args.dumps;
          if (dumps === undefined)
            return;

          var edges = dumps.allocators_graph;
          if (edges === undefined)
            return;

          edges.forEach(function(rawEdge) {
            var sourceGuid = rawEdge.source;
            var sourceDump = allMemoryAllocatorDumpsByGuid[sourceGuid];
            if (sourceDump === undefined) {
              this.model_.importWarning({
                type: 'memory_dump_parse_error',
                message: 'Edge is missing source memory allocator dump (GUID=' +
                    sourceGuid + ')'
              });
              return;
            }

            var targetGuid = rawEdge.target;
            var targetDump = allMemoryAllocatorDumpsByGuid[targetGuid];
            if (targetDump === undefined) {
              this.model_.importWarning({
                type: 'memory_dump_parse_error',
                message: 'Edge is missing target memory allocator dump (GUID=' +
                    targetGuid + ')'
              });
              return;
            }

            var importance = rawEdge.importance;
            var edge = new tr.model.MemoryAllocatorDumpLink(
                sourceDump, targetDump, importance);

            switch (rawEdge.type) {
              case 'ownership':
                if (sourceDump.owns !== undefined) {
                  this.model_.importWarning({
                    type: 'memory_dump_parse_error',
                    message: 'Memory allocator dump ' + sourceDump.fullName +
                        ' (GUID=' + sourceGuid + ') already owns a memory' +
                        ' allocator dump (' +
                        sourceDump.owns.target.fullName + ').'
                  });
                  return;
                }
                sourceDump.owns = edge;
                targetDump.ownedBy.push(edge);
                break;

              case 'retention':
                sourceDump.retains.push(edge);
                targetDump.retainedBy.push(edge);
                break;

              default:
                this.model_.importWarning({
                  type: 'memory_dump_parse_error',
                  message: 'Invalid edge type: ' + rawEdge.type +
                      ' (source=' + sourceGuid + ', target=' + targetGuid +
                      ', importance=' + importance + ').'
                });
            }
          }, this);
        }, this);
      }, this);
    },

    inferMemoryAllocatorDumpTree_: function(memoryAllocatorDumpsByFullName) {
      var rootAllocatorDumps = [];

      var fullNames = Object.keys(memoryAllocatorDumpsByFullName);
      fullNames.sort();
      fullNames.forEach(function(fullName) {
        var allocatorDump = memoryAllocatorDumpsByFullName[fullName];

        // This is a loop because we might need to build implicit
        // ancestors in case they were not present in the trace.
        while (true) {
          var lastSlashIndex = fullName.lastIndexOf('/');
          if (lastSlashIndex === -1) {
            // If the dump is a root, add it to the top-level
            // rootAllocatorDumps list.
            rootAllocatorDumps.push(allocatorDump);
            break;
          }

          // If the dump is not a root, find its parent.
          var parentFullName = fullName.substring(0, lastSlashIndex);
          var parentAllocatorDump =
              memoryAllocatorDumpsByFullName[parentFullName];

          // If the parent dump does not exist yet, we build an implicit
          // one and continue up the ancestor chain.
          var parentAlreadyExisted = true;
          if (parentAllocatorDump === undefined) {
            parentAlreadyExisted = false;
            parentAllocatorDump = new tr.model.MemoryAllocatorDump(
                allocatorDump.containerMemoryDump, parentFullName);
            memoryAllocatorDumpsByFullName[parentFullName] =
                parentAllocatorDump;
          }

          // Setup the parent <-> children relationships
          allocatorDump.parent = parentAllocatorDump;
          parentAllocatorDump.children.push(allocatorDump);

          // If the parent already existed, then its ancestors were/will be
          // constructed in another iteration of the forEach loop.
          if (parentAlreadyExisted)
            break;

          fullName = parentFullName;
          allocatorDump = parentAllocatorDump;
        }
      }, this);

      return rootAllocatorDumps;
    },

    joinObjectRefs_: function() {
      tr.b.iterItems(this.model_.processes, function(pid, process) {
        this.joinObjectRefsForProcess_(process);
      }, this);
    },

    joinObjectRefsForProcess_: function(process) {
      // Iterate the world, looking for id_refs
      var patchupsToApply = [];
      tr.b.iterItems(process.threads, function(tid, thread) {
        thread.asyncSliceGroup.slices.forEach(function(item) {
          this.searchItemForIDRefs_(
              patchupsToApply, process.objects, 'start', item);
        }, this);
        thread.sliceGroup.slices.forEach(function(item) {
          this.searchItemForIDRefs_(
              patchupsToApply, process.objects, 'start', item);
        }, this);
      }, this);
      process.objects.iterObjectInstances(function(instance) {
        instance.snapshots.forEach(function(item) {
          this.searchItemForIDRefs_(
              patchupsToApply, process.objects, 'ts', item);
        }, this);
      }, this);

      // Change all the fields pointing at id_refs to their real values.
      patchupsToApply.forEach(function(patchup) {
        patchup.object[patchup.field] = patchup.value;
      });
    },

    searchItemForIDRefs_: function(patchupsToApply, objectCollection,
                                   itemTimestampField, item) {
      if (!item.args)
        throw new Error('item is missing its args');

      function handleField(object, fieldName, fieldValue) {
        if (!fieldValue || (!fieldValue.id_ref && !fieldValue.idRef))
          return;

        var id = fieldValue.id_ref || fieldValue.idRef;
        var ts = item[itemTimestampField];
        var snapshot = objectCollection.getSnapshotAt(id, ts);
        if (!snapshot)
          return;

        // We have to delay the actual change to the new value until after all
        // refs have been located. Otherwise, we could end up recursing in
        // ways we definitely didn't intend.
        patchupsToApply.push({object: object,
          field: fieldName,
          value: snapshot});
      }
      function iterObjectFieldsRecursively(object) {
        if (!(object instanceof Object))
          return;

        if ((object instanceof tr.model.ObjectSnapshot) ||
            (object instanceof Float32Array) ||
            (object instanceof tr.b.Quad))
          return;

        if (object instanceof Array) {
          for (var i = 0; i < object.length; i++) {
            handleField(object, i, object[i]);
            iterObjectFieldsRecursively(object[i]);
          }
          return;
        }

        for (var key in object) {
          var value = object[key];
          handleField(object, key, value);
          iterObjectFieldsRecursively(value);
        }
      }

      iterObjectFieldsRecursively(item.args);
    }
  };

  tr.importer.Importer.register(TraceEventImporter);

  return {
    TraceEventImporter: TraceEventImporter
  };
});
'use strict';

/**
 * @fileoverview Base class for trace data importers.
 */
tr.exportTo('tr.importer', function() {
  /**
   * Importer for empty strings and arrays.
   * @constructor
   */
  function EmptyImporter(events) {
    this.importPriority = 0;
  };

  EmptyImporter.canImport = function(eventData) {
    if (eventData instanceof Array && eventData.length == 0)
      return true;
    if (typeof(eventData) === 'string' || eventData instanceof String) {
      return eventData.length == 0;
    }
    return false;
  };

  EmptyImporter.prototype = {
    __proto__: tr.importer.Importer.prototype
  };

  tr.importer.Importer.register(EmptyImporter);

  return {
    EmptyImporter: EmptyImporter
  };
});
'use strict';

tr.exportTo('tr.importer', function() {
  function ImportOptions() {
    this.shiftWorldToZero = true;
    this.pruneEmptyContainers = true;
    this.showImportWarnings = true;

    // Callback called after
    // importers run in which more data can be added to the model, before it is
    // finalized.
    this.customizeModelCallback = undefined;

    var auditorTypes = tr.c.Auditor.getAllRegisteredTypeInfos();
    this.auditorConstructors = auditorTypes.map(function(typeInfo) {
      return typeInfo.constructor;
    });
  }

  function Import(model, opt_options) {
    if (model === undefined)
      throw new Error('Must provide model to import into.');

    // TODO(dsinclair): Check the model is empty.

    this.importing_ = false;
    this.importOptions_ = opt_options || new ImportOptions();

    this.model_ = model;
    this.model_.importOptions = this.importOptions_;
  }

  Import.prototype = {
    __proto__: Object.prototype,

    /**
     * Imports the provided traces into the model. The eventData type
     * is undefined and will be passed to all the importers registered
     * via Importer.register. The first importer that returns true
     * for canImport(events) will be used to import the events.
     *
     * The primary trace is provided via the eventData variable. If multiple
     * traces are to be imported, specify the first one as events, and the
     * remainder in the opt_additionalEventData array.
     *
     * @param {Array} traces An array of eventData to be imported. Each
     * eventData should correspond to a single trace file and will be handled by
     * a separate importer.
     */
    importTraces: function(traces) {
      var progressMeter = {
        update: function(msg) {}
      };

      tr.b.Task.RunSynchronously(
          this.createImportTracesTask(progressMeter, traces));
    },

    /**
     * Imports a trace with the usual options from importTraces, but
     * does so using idle callbacks, putting up an import dialog
     * during the import process.
     */
    importTracesWithProgressDialog: function(traces) {
      if (tr.isHeadless)
        throw new Error('Cannot use this method in headless mode.');

      var overlay = tr.ui.b.Overlay();
      overlay.title = 'Importing...';
      overlay.userCanClose = false;
      overlay.msgEl = document.createElement('div');
      overlay.appendChild(overlay.msgEl);
      overlay.msgEl.style.margin = '20px';
      overlay.update = function(msg) {
        this.msgEl.textContent = msg;
      }
      overlay.visible = true;

      var promise =
          tr.b.Task.RunWhenIdle(this.createImportTracesTask(overlay, traces));
      promise.then(
          function() { overlay.visible = false; },
          function(err) { overlay.visible = false; }
      );
      return promise;
    },

    /**
     * Creates a task that will import the provided traces into the model,
     * updating the progressMeter as it goes. Parameters are as defined in
     * importTraces.
     */
    createImportTracesTask: function(progressMeter, traces) {
      if (this.importing_)
        throw new Error('Already importing.');
      this.importing_ = true;

      // Just some simple setup. It is useful to have a no-op first
      // task so that we can set up the lastTask = lastTask.after()
      // pattern that follows.
      var importTask = new tr.b.Task(function() {
        progressMeter.update('I will now import your traces for you...');
      }, this);
      var lastTask = importTask;

      var importers = [];

      lastTask = lastTask.after(function() {
        // Copy the traces array, we may mutate it.
        traces = traces.slice(0);
        progressMeter.update('Creating importers...');
        // Figure out which importers to use.
        for (var i = 0; i < traces.length; ++i)
          importers.push(this.createImporter_(traces[i]));

        // Some traces have other traces inside them. Before doing the full
        // import, ask the importer if it has any subtraces, and if so, create
        // importers for them, also.
        for (var i = 0; i < importers.length; i++) {
          var subtraces = importers[i].extractSubtraces();
          for (var j = 0; j < subtraces.length; j++) {
            try {
              traces.push(subtraces[j]);
              importers.push(this.createImporter_(subtraces[j]));
            } catch (error) {
              // TODO(kphanee): Log the subtrace file which has failed.
              console.warn(error.name + ': ' + error.message);
              continue;
            }
          }
        }

        if (traces.length && !this.hasEventDataDecoder_(importers)) {
          throw new Error(
              'Could not find an importer for the provided eventData.');
        }

        // Sort them on priority. This ensures importing happens in a
        // predictable order, e.g. ftrace_importer before
        // trace_event_importer.
        importers.sort(function(x, y) {
          return x.importPriority - y.importPriority;
        });
      }, this);

      // Run the import.
      lastTask = lastTask.after(function(task) {
        importers.forEach(function(importer, index) {
          task.subTask(function() {
            progressMeter.update(
                'Importing ' + (index + 1) + ' of ' + importers.length);
            importer.importEvents();
          }, this);
        }, this);
      }, this);

      // Run the cusomizeModelCallback if needed.
      if (this.importOptions_.customizeModelCallback) {
        lastTask = lastTask.after(function(task) {
          this.importOptions_.customizeModelCallback(this.model_);
        }, this);
      }

      // Import sample data.
      lastTask = lastTask.after(function(task) {
        importers.forEach(function(importer, index) {
          progressMeter.update(
              'Importing sample data ' + (index + 1) + '/' + importers.length);
          importer.importSampleData();
        }, this);
      }, this);

      // Autoclose open slices and create subSlices.
      lastTask = lastTask.after(function() {
        progressMeter.update('Autoclosing open slices...');
        this.model_.autoCloseOpenSlices();
        this.model_.createSubSlices();
      }, this);

      // Finalize import.
      lastTask = lastTask.after(function(task) {
        importers.forEach(function(importer, index) {
          progressMeter.update(
              'Finalizing import ' + (index + 1) + '/' + importers.length);
          importer.finalizeImport();
        }, this);
      }, this);

      // Run preinit.
      lastTask = lastTask.after(function() {
        progressMeter.update('Initializing objects (step 1/2)...');
        this.model_.preInitializeObjects();
      }, this);

      // Prune empty containers.
      if (this.importOptions_.pruneEmptyContainers) {
        lastTask = lastTask.after(function() {
          progressMeter.update('Pruning empty containers...');
          this.model_.pruneEmptyContainers();
        }, this);
      }

      // Merge kernel and userland slices on each thread.
      lastTask = lastTask.after(function() {
        progressMeter.update('Merging kernel with userland...');
        this.model_.mergeKernelWithUserland();
      }, this);

      // Create auditors
      var auditors = [];
      lastTask = lastTask.after(function() {
        progressMeter.update('Adding arbitrary data to model...');
        auditors = this.importOptions_.auditorConstructors.map(
          function(auditorConstructor) {
            return new auditorConstructor(this.model_);
          }, this);
        auditors.forEach(function(auditor) {
          auditor.runAnnotate();
        });
      }, this);

      lastTask = lastTask.after(function() {
        progressMeter.update('Computing final world bounds...');
        this.model_.computeWorldBounds(this.importOptions_.shiftWorldToZero);
      }, this);

      // Build the flow event interval tree.
      lastTask = lastTask.after(function() {
        progressMeter.update('Building flow event map...');
        this.model_.buildFlowEventIntervalTree();
      }, this);

      // Join refs.
      lastTask = lastTask.after(function() {
        progressMeter.update('Joining object refs...');
        for (var i = 0; i < importers.length; i++)
          importers[i].joinRefs();
      }, this);

      // Delete any undeleted objects.
      lastTask = lastTask.after(function() {
        progressMeter.update('Cleaning up undeleted objects...');
        this.model_.cleanupUndeletedObjects();
      }, this);

      // Sort global and process memory dumps.
      lastTask = lastTask.after(function() {
        progressMeter.update('Sorting memory dumps...');
        this.model_.sortMemoryDumps();
      }, this);

      // Calculate memory dump graph attributes.
      lastTask = lastTask.after(function() {
        progressMeter.update('Calculating memory dump graph attributes...');
        this.model_.calculateMemoryGraphAttributes();
      }, this);

      // Run initializers.
      lastTask = lastTask.after(function() {
        progressMeter.update('Initializing objects (step 2/2)...');
        this.model_.initializeObjects();
      }, this);

      // Build event indices mapping from an event id to all flow events.
      lastTask = lastTask.after(function() {
        progressMeter.update('Building flow event indices...');
        this.model_.buildEventIndices();
      }, this);

      // Run audits.
      lastTask = lastTask.after(function() {
        progressMeter.update('Running auditors...');
        auditors.forEach(function(auditor) {
          auditor.runAudit();
        });
      }, this);

      lastTask = lastTask.after(function() {
        progressMeter.update('Updating interaction records...');
        this.model_.sortInteractionRecords();
      }, this);

      lastTask = lastTask.after(function() {
        progressMeter.update('Updating alerts...');
        this.model_.sortAlerts();
      }, this);

      lastTask = lastTask.after(function() {
        progressMeter.update('Update bounds...');
        this.model_.updateBounds();
      }, this);

      // Cleanup.
      lastTask.after(function() {
        this.importing_ = false;
      }, this);
      return importTask;
    },

    createImporter_: function(eventData) {
      var importerConstructor = tr.importer.Importer.findImporterFor(eventData);
      if (!importerConstructor) {
        throw new Error('Couldn\'t create an importer for the provided ' +
                        'eventData.');
      }
      return new importerConstructor(this.model_, eventData);
    },

    hasEventDataDecoder_: function(importers) {
      if (importers.length === 0)
        return false;

      for (var i = 0; i < importers.length; ++i) {
        if (!importers[i].isTraceDataContainer())
          return true;
      }
      return false;
    }
  };

  return {
    ImportOptions: ImportOptions,
    Import: Import
  };
});
}).call(global);
module.exports = global.tr;
