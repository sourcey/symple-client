var Symple = {

    // Return an array of nested objects matching
    // the given key/value strings.
    filterObject: function(obj, key, value) { // (Object[, String, String])
        var r = []
        for (var k in obj) {
            if (obj.hasOwnProperty(k)) {
                var v = obj[k];
                if ((!key || k == key) &&
                    (!value || v == value)) {
                    r.push(obj)
                }
                else if (typeof v === 'object') {
                    var a = Symple.filterObject(v, key, value);
                    if (a) r = r.concat(a);
                }
            }
        }
        return r;
    },
        
    // Delete nested objects with properties
    // that match the given key/value strings.
    deleteNested: function(obj, key, value) { // (Object[, String, String])
        for (var k in obj) {
            var v = obj[k];
            if ((!key || k == key) &&
                (!value || v == value)) {
                delete obj[k];
            }
            else if (typeof v === 'object')
                 Symple.deleteNested(v, key);
        }
    },
    
    // Count nested object properties which
    // match the given key/value strings.
    countNested: function(obj, key, value, count) {
        if (count === undefined) count = 0;
        for (var k in obj) {
            if (obj.hasOwnProperty(k)) {
                var v = obj[k];
                if ((!key || k == key) &&
                    (!value || v == value)) {
                    count++;
                }
                else if (typeof(v) === 'object') {
                //else if (v instanceof Object) {
                    count = Symple.countNested(v, key, value, count);
                }
            }
        }
        return count;
    },
    
    // Traverse an objects nested properties
    traverse: function(obj, fn) { // (Object, Function)
        for (var k in obj) {
            if (obj.hasOwnProperty(k)) {
                var v = obj[k];
                fn(k, v);
                if (typeof v === 'object')
                    Symple.traverse(v, fn);
            }
        }
    },
    
    // Generate a random string
    randomString: function(n) {
        return Math.random().toString(36).substring(n || 7);
    },
    
    // Recursively merge object properties of r into l
    merge: function(l, r) { // (Object, Object)
        for (var p in r) {
            try {
                // Property in destination object set; update its value.
                //if (typeof r[p] == "object") {
                if (r[p].constructor == Object) {
                    l[p] = merge(l[p], r[p]);
                } else {
                    l[p] = r[p];
                }
            } catch(e) {
                // Property in destination object not set; 
                // create it and set its value.
                l[p] = r[p];
            }
        }
        return l;
    },
    
    // Run a vendor prefix method from W3C standard method.
    runVendorMethod: function(obj, method) {      
        var p = 0, m, t, pfx = ["webkit", "moz", "ms", "o", ""];
        while (p < pfx.length && !obj[m]) {
            m = method;
            if (pfx[p] == "") {
                m = m.substr(0,1).toLowerCase() + m.substr(1);
            }
            m = pfx[p] + m;
            t = typeof obj[m];
            if (t != "undefined") {
                pfx = [pfx[p]];
                return (t == "function" ? obj[m]() : obj[m]);
            }
            p++;
        }
    },
    
    // Match the object properties of l with r
    match: function(l, r) { // (Object, Object)
        var res = true;
        for (var prop in l) {
            if (!l.hasOwnProperty(prop) ||
                !r.hasOwnProperty(prop) ||
                r[prop] != l[prop]) {
                res = false;
                break;
            }
        }
        return res
    }
};


// -----------------------------------------------------------------------------
// OOP Base Class
// Simple JavaScript Inheritance By John Resig
//    
(function(Symple){
  var initializing = false, fnTest = /xyz/.test(function(){xyz;}) ? /\b_super\b/ : /.*/;
 
  // The base Class implementation (does nothing)
  Symple.Class = function(){};
 
  // Create a new Class that inherits from this class
  Symple.Class.extend = function(prop) {
    var _super = this.prototype;
   
    // Instantiate a base class (but only create the instance,
    // don't run the init constructor)
    initializing = true;
    var prototype = new this();
    initializing = false;
   
    // Copy the properties over onto the new prototype
    for (var name in prop) {
      // Check if we're overwriting an existing function
      prototype[name] = typeof prop[name] == "function" &&
        typeof _super[name] == "function" && fnTest.test(prop[name]) ?
        (function(name, fn){
          return function() {
            var tmp = this._super;
           
            // Add a new ._super() method that is the same method
            // but on the super-class
            this._super = _super[name];
           
            // The method only need to be bound temporarily, so we
            // remove it when we're done executing
            var ret = fn.apply(this, arguments);        
            this._super = tmp;
           
            return ret;
          };
        })(name, prop[name]) :
        prop[name];
    }
   
    // The dummy class constructor
    function Class() {
      // All construction is actually done in the init method
      if ( !initializing && this.init )
        this.init.apply(this, arguments);
    }
   
    // Populate our constructed prototype object
    Class.prototype = prototype;
   
    // Enforce the constructor to be what we expect
    Class.prototype.constructor = Class;
 
    // And make this class extendable
    Class.extend = arguments.callee;
   
    return Class;
  };
})(Symple);


// -----------------------------------------------------------------------------
// Manager
//
Symple.Manager = Symple.Class.extend({
    init: function() {    
        this.options = options || {};
        this.key = this.options.key || 'id';
        this.store = [];
    },
    
    add: function(value) {
        this.store.push(value);
    },

    remove: function(key) {
        var res = null;
        for (var i = 0; i < this.store.length; i++) {
            if (this.store[i][this.key] == key) {
                res = this.store[i];
                this.store.splice(i, 1);
                break;
            }
        }
        return res;
    },

    get: function(key) {
        for (var i = 0; i < this.store.length; i++) {
            if (this.store[i][this.key] == key) {
                return this.store[i];
            }
        }
        return null;
    },

    find: function(params) {
        var res = [];
        for (var i = 0; i < this.store.length; i++) {
            if (Symple.match(params, this.store[i])) {
                res.push(this.store[i])
            }
        }
        return res;
    },

    findOne: function(params) {
        var res = this.find(params);
        return res.length ? res[0] : undefined;
    },

    last: function() {
        return this.store[this.store.length - 1];
    },

    size: function() {
        return this.store.length;
    }
});


// -----------------------------------------------------------------------------
// Dispatcher
//
Symple.Dispatcher = Symple.Class.extend({
    init: function() {      
        this.listeners = {};
    },
    
    on: function(event, fn) {
        if (typeof this.listeners[event] == 'undefined')
            this.listeners[event] = [];
        if (typeof fn != 'undefined' && fn.constructor == Function)
            this.listeners[event].push(fn);
    },

    clear: function(event, fn) {
        if (typeof this.listeners[event] != 'undefined') {
            for (var i = 0; i < this.listeners[event].length; i++) {
                if (this.listeners[event][i] == fn) {
                    this.listeners[event].splice(i, 1);
                }
            }
        }
    },

    dispatch: function() {
        //console.log('Dispatching: ', arguments);
        var event = arguments[0];
        var args = Array.prototype.slice.call(arguments, 1);
        if (typeof this.listeners[event] != 'undefined') {
            for (var i = 0; i < this.listeners[event].length; i++) {
                //console.log('Dispatching: Function: ', this.listeners[event][i]);
                if (this.listeners[event][i].constructor == Function)
                    this.listeners[event][i].apply(this, args);
            }
        }
    }
});