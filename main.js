
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

bools.XOR = function(arr){
  return _.compact(arr).length === 1
}

var nodes = {}
nodes.Node = function(name, value, children, parent){
  if(typeof(value) === "undefined") value = false;
  if(typeof(children) === "undefined") children = [];
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

  this.getIndex = function(){
    if(this.parent()){
      return this.siblings().indexOf(this);
    } else {
      return null
    }
  }
  this.siblings = function(){
    if (this.parent()){
      return this.parent().children();
    } else {
      return [];
    }
  }
  this.insertChild = function(child, index){
    if(typeof(index) === "undefined"){
      index = this.children().length;
    }
    child.parent(this);
    var children = this.children();
    children.splice(index, 0, child);
    this.children(children);
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
      return this.parent().getId() + "" + this.getIndex();
    } else {
      return "";
    }
  }
  this.getInputId = function(){
    return "input" + this.getId();
  }
  this.getNodeId = function(){
    return "n" + this.getId();
  }
  this.generation = function(){
    var innerLoop = function(curGen, node){
      if(node.parent()){
        return innerLoop(curGen+1, node.parent());
      } else {
        return curGen
      }
    }
    return innerLoop(0, this);
  }
  this.youngestDescendant = function(){
    var innerLoop = function(node){
      if (!node.children().length) {
        // no children
        return node;
      } else {
        return innerLoop(_.last(node.children()))
      }
    }
    return innerLoop(this);
  }.bind(this);
}

var app = {}

app.data = new nodes.Node("My Checklist", false, []);
app.data.insertChild(new nodes.Node(""));

app.controller = function(){
  this.input = {};
  this.data = app.data;
  // this.focus = m.prop("n0");
  this.focus = m.prop(this.data.children()[0]);

  this.isNodeInFocus = function(node){
    // return this.focus() === "n" + node.getId()
    return this.focus().getNodeId() === node.getNodeId();
  }
  this.insertNode = function(parent, child, index){
    return parent.insertChild(child, index);
  }
  this.deleteNode = function(parent, child){
    parent.deleteChild(child);
  }
  this.setFocus = function(node){
    if(node){
      this.focus(node);
      document.getElementById(node.getInputId()).focus();
      return node;
    }
  }
}


app.view = function(ctrl){

  var renderNode = function(node){
    // recursively render a node
    var children;
    var oldParent = node.parent();

    var keyHandler = function(e){
      // imported from m.withAttr. do not touch!
      node.name("value" in e.currentTarget ? e.currentTarget.value : e.currentTarget.getAttribute("value"));

      // enter key
      if(e.keyCode == 13 && node.parent()){
        var sibling = ctrl.insertNode(node.parent(), new nodes.Node(""), node.getIndex() + 1);

        m.redraw(); // redraw to generate element
        ctrl.setFocus(sibling);
      }

      // tab key
      if(e.keyCode == 9){
        e.preventDefault();
        if(e.shiftKey){
          // turn into sibling of parent
          var gramps = node.parent().parent();
          if(gramps){
            var newIndex = oldParent.getIndex() + 1;
            var sibling = ctrl.insertNode(gramps, node, newIndex)
            ctrl.deleteNode(oldParent, node)
            m.redraw();

            ctrl.setFocus(sibling);
          }
        } else {
          // turn into child of sibling above it.
          var nodeIndex = node.getIndex();
          if(nodeIndex > 0){
            // trigger converting node into child of sibling above.
            var siblingNodeIndex = nodeIndex - 1;
            var siblingNode = oldParent.children()[siblingNodeIndex];
            var newChild = ctrl.insertNode(siblingNode, node)
            oldParent.deleteChild(node);

            m.redraw(); // redraw to generate element
            ctrl.setFocus(newChild);
          }
        }
      }
      // delete
      if(e.keyCode == 8 && !e.currentTarget.value){
        e.preventDefault();
        var nodeIndex = node.getIndex();

        if(!(!oldParent.parent() && nodeIndex === 0)){
          oldParent.deleteChild(node);
          if(nodeIndex){
            var siblingNodeIndex = nodeIndex - 1;
            var sibling = oldParent.children()[siblingNodeIndex];
            ctrl.setFocus(sibling);
          } else {
            ctrl.setFocus(oldParent);
          }
        }
      };
      
      // Down key
      if(e.keyCode == 40){
        if(node.children().length){
          // has children
          ctrl.setFocus(node.children()[0])
        } else {
          // terminal
          var findNextYoungerSibling = function(node){
            var siblingIndex = node.getIndex() + 1
            // console.log(node.siblings().length, siblingIndex);
            if(node.siblings().length - 1 >= siblingIndex) {
              return node.siblings()[siblingIndex];
            } else if (node.parent().parent()) {
              return findNextYoungerSibling(node.parent());
            } else {
              return null
            }
          }
          var nextNode = findNextYoungerSibling(node)
          ctrl.setFocus(nextNode);
        }
      }

      // Up key
      if(e.keyCode == 38){
        var nodeIndex = node.getIndex();
        if (nodeIndex === 0) {
          // oldest child. go to parent.
          ctrl.setFocus(oldParent);

        } else if (oldParent) {
          // else, go to youngest decendant of elder sibling.
          var olderSibling = node.siblings()[node.getIndex() - 1];
          ctrl.setFocus(olderSibling.youngestDescendant());
        } else {
          null
        }
      }

      // slash key. rethink this.
      // if (e.keyCode == 191) {
      //   ctrl.focus().value(!ctrl.focus().value());
      // };
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
      m(".info", {
        className: ctrl.isNodeInFocus(node) ? "focus" : "",
        onclick: function(e){
          document.getElementById(node.getInputId()).focus();
        }
      }, [
        m(".details", 
        {style: {"padding-left": (node.generation() - 1) * 20 + "px"}, className: (node.generation() === 0) ? "root" : ""}, [
          m("label", [
            m("input", {
              type: "checkbox", 
              onchange: m.withAttr("checked", node.value), 
              checked: node.getValue()
            }),
            m(".checkbox", [
              m(".tick")
            ]),
          ]),
          m("input", {
            id: "input"+node.getId(),
            type: "text", 
            value: node.name(), 
            autofocus: node.getId() === "0",
            onfocus: function(e){
              ctrl.focus(node);
            },
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
        ]),
      ]),
      m(".children", [
        children
      ]),
    ])
  }
  return m("html", [
    m("head", [
      m("link", {rel: "stylesheet", href: "styles/css/style.css"}),
      m("link[href='//fonts.googleapis.com/css?family=Roboto+Condensed:400,300,700'][rel='stylesheet'][type='text/css']"),
      m("link[href='bower_components/font-awesome/css/font-awesome.css'][rel='stylesheet'][type='text/css']"),
    ]),
    m("body", [
      m("div", [

        // ctrl.data.map(function(n){
        //   return renderNode(n);
        // })
        renderNode(ctrl.data)
        // recursive function maybe to render all the information of the nodes and their children.
        // renderNode(ctrl.data, null)
      ]),
    ])
  ])
}

m.module(document, app);