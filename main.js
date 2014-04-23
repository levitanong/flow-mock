
bools = {};

bools.AND = function(arr){
  return arr.reduce(function(a, b){
    return a && b;
  })
}

bools.OR = function(arr){
  return arr.reduce(function(a, b){
    return a || b;
  })
}

// bools.NOT = function(a){
//   return !a;
// }

bools.XOR = function(arr){
  return _.compact(arr).length === 1
}

// bools.ID = function(a){
//   return a;
// }

// model

var nodes = {}
nodes.Node = function(name, value, children, parent){
  if(typeof(value) === "undefined") value = false;
  if(typeof(children) === "undefined") children = [];
  // if(typeof(condition) === "undefined") condition = "AND";
  if(typeof(parent) === "undefined") parent = null;
  this.name = m.prop(name);
  this.value = m.prop(value);
  this.children = m.prop(children);
  this.parent = m.prop(parent);

  // explicitly defined
  this.condition = m.prop("AND");

  this.getValue = function(){
    var func;
    switch(this.condition()){
      case "AND":
        func = bools.AND;
        break;
      case "OR":
        func = bools.OR;
        break;
      // case "NOT":
      //   func = bools.NOT;
      //   break;
      case "XOR":
        func = bools.XOR;
        break;
      default:
        func = bools.ID;
        break;
    }

    if(this.children().length){
      return func(
        this.children()
        .map(function(c){
          return c.getValue()
        })
      )
    } else {
      return this.value();
    }
  }.bind(this);

  this.addChild = function(child){
    child.parent(this);
    this.children(this.children().concat(child));
    return child;
  }
  this.deleteChild = function(child){
    var arrCopy = this.children();
    var childIndex = arrCopy.indexOf(child);
    arrCopy.splice(childIndex, 1);
    this.children(arrCopy);
  }
  this.getId = function(){
    if(this.parent()){
      var myIndex = this.parent().children().indexOf(this);
      // console.log(myIndex, this.parent().getId());
      return this.parent().getId() + "" + myIndex;
    } else {
      return "";
    }
  }
}

var app = {}

app.data = new nodes.Node("Root", false, []);
app.data.addChild(new nodes.Node(""));

app.controller = function(){
  this.input = {};
  this.data = app.data;

  this.addNode = function(parent, child){
    return parent.addChild(child);
  }
  this.deleteNode = function(parent, child){
    parent.deleteChild(child);
  }
  this.onNodeCreate = function(elem){
    // console.log(elem.children[0].children[1]);
    // console.log(elem.value);
    // elem.focus();
  }
}


app.view = function(ctrl){

  var renderNode = function(node, parent){
    // recursively render a node
    var children;

    var keyHandler = function(e){
      node.name("value" in e.currentTarget ? e.currentTarget.value : e.currentTarget.getAttribute("value"));

      if(e.keyCode == 13 && parent){
        var sibling = ctrl.addNode(parent, new nodes.Node(""));

        m.redraw(); // redraw to generate element
        document.getElementById("input"+sibling.getId()).focus();
      }
      if(e.keyCode == 9){
        e.preventDefault();
        if(e.shiftKey){
          // turn into sibling of parent
          var gramps = parent.parent();
          gramps.addChild(node);
          parent.deleteChild(node);
          m.redraw();
          document.getElementById("input"+node.getId()).focus();
        } else {
          // turn into child of sibling above it.
          var nodeIndex = parent.children().indexOf(node);
          if(nodeIndex > 0){
            // trigger converting node into child of sibling above.
            var siblingNodeIndex = nodeIndex - 1;
            var siblingNode = parent.children()[siblingNodeIndex];
            var newChild = siblingNode.addChild(node);
            parent.deleteChild(node);

            m.redraw(); // redraw to generate element
            document.getElementById("input"+newChild.getId()).focus();
          }
        }
      }
      if(e.keyCode == 8 && !e.currentTarget.value){
        e.preventDefault();
        var nodeIndex = parent.children().indexOf(node);

        if(!(!node.parent().parent() && nodeIndex === 0)){
          parent.deleteChild(node);
          if(nodeIndex){
            var siblingNodeIndex = nodeIndex - 1;
            document.getElementById("input"+parent.children()[siblingNodeIndex].getId()).focus();
          } else {
            document.getElementById("input"+parent.getId()).focus();
          }
        }
      };
    }

    if(node.children().constructor === Array){
      // array
      children = node.children().map(function(c, i){
        return renderNode(c, node, i);
      })
    } else {
      // should be boolean
      children = ""; 
    }

    return m(".node", {id: "n"+node.getId()}, [
      m(".info",[
        m("input", {
          type: "checkbox", 
          onchange: m.withAttr("checked", node.value), 
          checked: node.getValue()
        }),
        m("input", {
          id: "input"+node.getId(),
          type: "text", 
          value: node.name(), 
          // onchange: m.withAttr("value", node.name),
          config: ctrl.onNodeCreate,
          onkeydown: keyHandler
        }),
        node.children().length > 1 ?
          m("select", {onchange: m.withAttr("value", node.condition)}, [
            _.map(bools, function(f, key){
              return m("option", {selected: (key === "AND") ? true : false }, key);
            })
          ])
        : null
        // m("button", {onclick: function(){ 
        //   ctrl.addNode(node, new nodes.Node(""));
        // }}, "Add"),
        // m("button", {onclick: function(){ 
        //   ctrl.deleteNode(parent, node);
        // }}, "Delete")
      ]),
      m(".children", [
        children
      ]),
    ])
  }
  return m("html", [
    m("head", [
      m("link", {rel: "stylesheet", href: "styles/css/style.css"})
    ]),
    m("body", [
      m("div", [
        ctrl.data.children().map(function(n){
          return renderNode(n, ctrl.data);
        })
        // recursive function maybe to render all the information of the nodes and their children.
        // renderNode(ctrl.data, null)
      ]),
    ])
  ])
}

m.module(document, app);