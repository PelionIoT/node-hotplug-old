/**
 * (c) 2014 - Ed Hemphill
 */

var util = require('util');

var _NODE_VALUE_ = "*VAL&^!";
var _DEFAULT_VALUE_ = "#DEF&*!&!";  // the value you get if you lookup 'undefined'
var _FIELD_NAME_ = "$NAME%!^$@%";

var _id = 0;
var nextID = function() {
    return _id++;
}

// Each Node can heave N leafs
// each node also has a default, this is where to go if there is no value / match found
var TreeNode = function(fieldname,val) {
    this.id = nextID();
//    console.log("new TreeNode["+this.id+"]("+fieldname+","+val+")");
    this[_FIELD_NAME_] = fieldname;
    if(val) {
        this[_NODE_VALUE_] = val;
    }
    this.__RegExLookups = {};
}

//TreeNode.prototype.__RegExLookups = {}; // nodes can have either value (which are looked up directly on the node, or RegEx's which must be tested against)

TreeNode.prototype.setDefault = function(val) {
    this[_DEFAULT_VALUE_] = val;
}

TreeNode.prototype.getDefault = function() {
    return this[_DEFAULT_VALUE_];
}

TreeNode.prototype.setVal = function(val) {
//    console.log('setVal('+val+')');
    this[_NODE_VALUE_] = val;
}

TreeNode.prototype.getVal = function() {
    return this[_NODE_VALUE_];
}

TreeNode.prototype.removeVal = function() { // remove value if its just a value (not an inner node)
    var ret = undefined;
    if (!(this[_NODE_VALUE_] instanceof TreeNode)) {
        ret = this[_NODE_VALUE_];
        delete this[_NODE_VALUE_];
    } 
    return ret;
}

/**
 * The value which is passed in is looked up at the node. If a direct equivalent does not exist the 
 * function looks at all the regex expression leaves, and checks for a test, returning that value if it exists. 
 * If a regex is passed in, then the node for that reg ex is returned.
 * @param  {[type]} key [description]
 * @return {[type]}     [description]
 */
TreeNode.prototype.getNode = function(key) {
    var ret = undefined;

    if(util.isRegExp(key)) {
//        console.log('key is regex!!');
        var str = key.toString();
        if(this.__RegExLookups[str])
            ret = this.__RegExLookups[str][_NODE_VALUE_];
    } else {
        ret = this[key];
        if(!ret) {
//            console.log("trying regexs["+this.id+"]");
            var regexs = Object.keys(this.__RegExLookups);
            for (var n=0;n<regexs.length;n++) {
                if(this.__RegExLookups[regexs[n]].test(key)) {
//                    console.log("test true[" + this.id+"]: " + this.__RegExLookups[regexs[n]].toString());
                    ret = this.__RegExLookups[regexs[n]][_NODE_VALUE_];
                    break;
                }
            }
        }
    }
    if(ret === undefined) {
//        console.log("Trying default val. ["+this.id+"]");
        if(this[_DEFAULT_VALUE_]) {
            ret = this[_DEFAULT_VALUE_];
//            console.log("default value...");
        }
    }
//    console.log("getNode["+this.id+"]("+key+") = " + util.inspect(ret)  + "  [" + this[_FIELD_NAME_] + "]");    
    return ret;
}


/**
 * Creates a new node or returns an existing one.
 * If a regex is passed in, then the node for that reg ex is returned.
 * @param {[type]} key [description]
 * @param {[type]} val* Optional. Sets the value of the node at key.
 * @return {TreeNode} The TreeNode at this key.
 */
TreeNode.prototype.getOrAddNode = function(fieldname,key,val) {
//    var newnode = new TreeNode(val);
    if(key === undefined) {
        if(this[_DEFAULT_VALUE_])
            return this[_DEFAULT_VALUE_];
        else {
            var newnode = new TreeNode(fieldname,val);
//            console.log("getOrAddNode["+this.id+"] making default val for key, node: " + newnode.id);
            this[_DEFAULT_VALUE_] = newnode;
            return this[_DEFAULT_VALUE_];
        }
    }

    if(util.isRegExp(key)) {
        var str = key.toString();

        if(this.__RegExLookups[str]){
            return this.__RegExLookups[str][_NODE_VALUE_];
        }
        else {
            this.__RegExLookups[str] = key;
            var newnode = new TreeNode(fieldname,val);
//            console.log("getOrAddNode["+this.id+"] making regex val for key ("+str+"), node: " + newnode.id);
            this.__RegExLookups[str][_NODE_VALUE_] = newnode;
            return newnode;
        }
    } else {
        var ret = (this[key]);
        if(!ret) {
//            console.log('looking at regexs');
            var regexs = Object.keys(this.__RegExLookups);
            for (var n=0;n<regexs.length;n++) {
//                console.log("doing test on " + key + "-->" + this.__RegExLookups[regexs[n]].toString())
                if(this.__RegExLookups[regexs[n]].test(key)) {
                    ret = this.__RegExLookups[regexs[n]][_NODE_VALUE_];
                    if(val) this.__RegExLookups[regexs[n]][_NODE_VALUE_].setVal(val);
                    break;
                }
            }
        }
        if(!ret) {
            ret = new TreeNode(fieldname,val);
            this[key] = ret;
        }
        return ret;
    }
}


var isRegExInNode = function(node,regex) {
    if(node.__RegExLookups[regex.toString()])
        return true;
    else return false;
}


/**
 * @class lookupTree
 * @constructor
 */
var signatureTree = function() {

    var count = 0;


    var tree = undefined;//new TreeNode();

    var that=this;




    /**
     * Adds a path to the tree. In the signature the fields should be input in the same order every time,
     * and the fields which are unimplemented should be 'undefined'
     * @param {[type]} keyarray An array of two field arrays [ [ 'fieldname', 'key' ], ['fieldname','key'] ]
     * @param {[type]} val      [description]
     */
    this.add = function(keyarray,val) {
        var n = 0;
        if(!tree && keyarray.length > 0)
            tree = new TreeNode(undefined);
        var leaf = tree;
        var ret = undefined;
//        console.log(util.inspect(keyarray));
        while(n < keyarray.length) {
//            console.log("getOrAddNode("+keyarray[n][0]+","+keyarray[n][1]+")");
            leaf = leaf.getOrAddNode(keyarray[n][0],keyarray[n][1]);
            n++;
        }
        ret = leaf.getVal();
        leaf.setVal(val);
        return ret;
    }


    /**
     * Looks up a value using an Array or Array-like key
     * @param {[type]} keyarray An array of two field arrays [ [ 'fieldname', 'key' ], ['fieldname','key'] ]
     * @return {any}          Anything, undefined if the value does not exist.
     */
    this.lookup = function(keyarray) {
        var n = 0;
        var leaf = tree;
        while(n < keyarray.length && leaf !== undefined) {
            leaf = leaf.getNode(keyarray[n][1]);
            n++;
        }

        if(leaf)
            return leaf.getVal();
        else
            return undefined;
    }

    /**
     * Uses a lookup Array (or Array-like obejct) to find the first value it finds which fully or partially (left to right) matching
     * value.
     * @param {Array} keyarray Array or Array-like up key
     * @param {Object} obj* An optional object. A property 'depth' will be filled in with the depth in tree a value was found, if found.
     * @return {any}          Anything, undefined if the value does not exist.
     */
    this.alongPath = function(keyarray,obj) {
        var n = 0;
        var leaf = tree;
        var ret = undefined;

        while(n < keyarray.length && leaf !== undefined) {
            leaf = leaf.getNode(keyarray[n][1]);
            n++;
            if(leaf)
                ret = leaf.getVal();

            if(ret) break;
        }

        if(typeof obj === 'object') obj.depth = n;
        return ret;
    }


    this.remove = function(keyarray) {
        var n = 0;
        var leaf = tree;
        var ret = undefined;
        while(n < keyarray.length && leaf !== undefined) {
            leaf = leaf.getNode(keyarray[n]);
            n++;
        }

        if(leaf) {
            ret = leaf.removeVal();
        }
        return ret;
    }

}

exports = module.exports = signatureTree;