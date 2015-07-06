
function ElementWriter(name) {
  this.name = name;
  this.attributes = [];
  this.children = [];
  this.style = [];
}

ElementWriter.prototype.setAttribute = function(name, value) {
  this.attributes.push({ name: name, value: value });
}

ElementWriter.prototype.styleProperty = function(name, value) {
  this.style.push({name: name, value: value});
}

ElementWriter.prototype.appendChild = function(child) {
  this.children.push(child);
}

ElementWriter.prototype.write = function(writer) {
  writer.beginOpenElement(this.name);
  this.attributes.forEach(function(attribute) {
    writer.attribute(attribute.name, attribute.value);
  }, this);
  if (this.style.length > 0) {
    writer.styleAttribute();
    this.style.forEach(function(attribute) {
      writer.styleProperty(attribute.name, attribute.value);
    }, this);
    writer.closeElement();
  }

  writer.endOpenElement();
  this.children.forEach(function(child) {
    child.write(writer);
  })
  writer.closeElement(this.name);
}


function TextNodeWriter(text) {
  this.text = text;
}

TextNodeWriter.prototype.write = function(writer) {
  writer.text(this.text);
}


function CommentNodeWriter(comment) {
  this.comment = comment;
}

CommentNodeWriter.prototype.write = function(writer) {
  writer.comment(this.comment);
}


function TreeBuilder() {
  this.children = [];
  this.elementStack = [this];
  this.commandHandlers = {
    // Base
    'b': function(command) {
      var base = new ElementWriter('base');
      base.setAttribute('href', command.v);
      this.appendChild(base);
    }.bind(this),
    // Open Element
    'n': function(command) {
      var element = new ElementWriter(command.n);
      this.top().appendChild(element);
      this.elementStack.push(element);
    }.bind(this),
    'a': function(command) {
      this.top().setAttribute(command.n, command.v);
    }.bind(this),
    // Close Element
    '/': function(command) {
      if (this.isStyleAttribute) {
        this.isStyleAttribute = false;
        return;
      }
      var element = this.elementStack.pop();

      // intentionally crippling script nodes for now
      if (element.name == 'SCRIPT')
        element.setAttribute('type', 'dead');
    }.bind(this),
    // Text
    't': function(command) {
      this.top().appendChild(new TextNodeWriter(command.v));
    }.bind(this),
    // Comment
    'c': function(command) {
      this.top().appendChild(new CommentNodeWriter(command.v));
    }.bind(this),
    's': function(command) {
      this.isStyleAttribute = true;
    }.bind(this),
    'sp': function(command) {
      this.top().styleProperty(command.n, command.v);
    }.bind(this)

  }
}

TreeBuilder.prototype.appendChild = function(child) {
  this.children.push(child);
}

TreeBuilder.prototype.setAttribute = nil;

TreeBuilder.prototype.top = function() {
  return this.elementStack[this.elementStack.length - 1];
}

TreeBuilder.prototype.build = function(data) {
  if (typeof data == 'string')
    throw new Error("expected JSON list but received string");
  data.forEach(function(command) {
    var handler = this.commandHandlers[command.t];
    (handler || nil)(command);
  }, this);
}

TreeBuilder.prototype.write = function(writer) {
  this.children.forEach(function(child) {
    child.write(writer);
  });
}


function nil() {}


module.exports = TreeBuilder;
