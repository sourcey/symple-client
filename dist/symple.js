// -----------------------------------------------------------------------------
// Symple JavaScript Client
//
var Symple = {
    // Version
    VERSION: "0.9.0",

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
        return Math.random().toString(36).slice(2) //Math.random().toString(36).substring(n || 7);
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
    
    // Object extend functionality
    extend: function() {   
        var process = function(destination, source) {   
            for (var key in source) {
                if (hasOwnProperty.call(source, key)) {
                    destination[key] = source[key];
                }
            }
            return destination;
        };
        var result = arguments[0];
        for(var i=1; i<arguments.length; i++) {
            result = process(result, arguments[i]);
        }
        return result;
    },
    
    // Run a vendor prefixed method from W3C standard method.
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
    
    //
    // Date parseing for ISO 8601
    // Based on https://github.com/csnover/js-iso8601
    //
    // Parses dates like:
    // 2001-02-03T04:05:06.007+06:30
    // 2001-02-03T04:05:06.007Z
    // 2001-02-03T04:05:06Z
    //
    parseISODate: function (date) { // (String)
        
        // ISO8601 dates were introduced with ECMAScript v5, 
        // try to parse it natively first...
        var timestamp = Date.parse(date)
        if (isNaN(timestamp)) {
            var struct,
                minutesOffset = 0,
                numericKeys = [ 1, 4, 5, 6, 7, 10, 11 ];

            // ES5 §15.9.4.2 states that the string should attempt to be parsed as a Date
            // Time String Format string before falling back to any implementation-specific
            // date parsing, so that's what we do, even if native implementations could be faster
            //
            //              1 YYYY                2 MM       3 DD           4 HH    5 mm       6 ss        7 msec        8 Z 9 ±    10 tzHH    11 tzmm
            if ((struct = /^(\d{4}|[+\-]\d{6})(?:-(\d{2})(?:-(\d{2}))?)?(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{3}))?)?(?:(Z)|([+\-])(\d{2})(?::(\d{2}))?)?)?$/.exec(date))) {
                // Avoid NaN timestamps caused by "undefined" values being passed to Date.UTC
                for (var i = 0, k; (k = numericKeys[i]); ++i)
                    struct[k] = +struct[k] || 0;

                // Allow undefined days and months
                struct[2] = (+struct[2] || 1) - 1;
                struct[3] = +struct[3] || 1;

                if (struct[8] !== 'Z' && struct[9] !== undefined) {
                    minutesOffset = struct[10] * 60 + struct[11];
                    if (struct[9] === '+')
                        minutesOffset = 0 - minutesOffset;
                }

                timestamp = Date.UTC(struct[1], struct[2], struct[3], struct[4], struct[5] + minutesOffset, struct[6], struct[7]);
            }
        }

        return new Date(timestamp);
    },
    
    isMobileDevice: function() {
        return 'ontouchstart' in document.documentElement;
    },    
    
    // Returns the current iOS version, or false if not iOS
    iOSVersion: function(l, r) {
        return parseFloat(('' + (/CPU.*OS ([0-9_]{1,5})|(CPU like).*AppleWebKit.*Mobile/i.exec(navigator.userAgent) || [0,''])[1])
            .replace('undefined', '3_2').replace('_', '.').replace('_', '')) || false;
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
    },
    
    formatTime: function(date) {        
        function pad(n) { return n < 10 ? ('0' + n) : n }
        return pad(date.getHours()).toString() + ':' +
            pad(date.getMinutes()).toString() + ':' +
            pad(date.getSeconds()).toString() + ' ' +
            pad(date.getDate()).toString() + '/' +
            pad(date.getMonth()).toString();
    },
    
    // Debug logger
    log: function () {
        if (typeof console != "undefined" && 
            typeof console.log != "undefined") {
            console.log.apply(console, arguments);
        }
    }
};


// -----------------------------------------------------------------------------
// Symple OOP Base Class
//    
(function(Symple) {
    var initializing = false, 
        fnTest = /xyz/.test(function(){xyz;}) ? /\b_super\b/ : /.*/;
   
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
          if (!initializing && this.init)
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
        //Symple.log('Dispatching: ', arguments);
        var event = arguments[0];
        var args = Array.prototype.slice.call(arguments, 1);
        if (typeof this.listeners[event] != 'undefined') {
            for (var i = 0; i < this.listeners[event].length; i++) {
                //Symple.log('Dispatching: Function: ', this.listeners[event][i]);
                if (this.listeners[event][i].constructor == Function)
                    this.listeners[event][i].apply(this, args);
            }
        }
    }
});


// -----------------------------------------------------------------------------
// Manager
//
Symple.Manager = Symple.Class.extend({
    init: function(options) {    
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
// Symple Client
//
Symple.Client = Symple.Dispatcher.extend({
    init: function(options) {
        this.options = Symple.extend({ //$.extend
            url:     options.url ? options.url : 'http://localhost:4000',
            secure:  options.url && (
                         options.url.indexOf('https') == 0 || 
                         options.url.indexOf('wss') == 0) ? true : false,
            token:   undefined     // pre-arranged server session token
            //timeout: 0           // set for connection timeout
        }, options);
        this._super();
        this.peer = options.peer || {};
        this.roster = new Symple.Roster(this);
        this.socket = null;
    },

    // Connects and authenticates on the server.
    // If the server is down the 'error' event will fire.
    connect: function() {
        Symple.log('Symple Client: Connecting: ', this.options);
        self = this; 
        if (this.socket)
            throw 'The client socket is not null'
        this.socket = io.connect(this.options.url, this.options);
        this.socket.on('connect', function() {
            Symple.log('Symple Client: Connected');
            self.socket.emit('announce', {
                token:  self.options.token || "",
                group:  self.peer.group    || "",
                user:   self.peer.user     || "",
                name:   self.peer.name     || "",
                type:   self.peer.type     || ""
            }, function(res) {
                Symple.log('Symple Client: Announced: ', res);
                if (res.status != 200) {
                    self.setError('auth', res);
                    return;
                }
                self.peer = Symple.extend(self.peer, res.data); //$.extend
                self.roster.add(res.data);
                self.sendPresence({ probe: true });
                self.doDispatch('announce', res);
                self.socket.on('message', function(m) {
                    //Symple.log('Symple Client: Receive: ', m);
                    if (typeof(m) == 'object') {     
                        switch(m.type) {
                            case 'message':
                                m = new Symple.Message(m); 
                                break;
                            case 'command':
                                m = new Symple.Command(m);
                                break;
                            case 'event':
                                m = new Symple.Event(m);
                                break;
                            case 'presence':
                                m = new Symple.Presence(m);
                                if (m.data.online)
                                    self.roster.update(m.data);
                                else
                                    self.roster.remove(m.data.id);
                                if (m.probe)
                                    self.sendPresence(new Symple.Presence({ to: m.from }));
                                break;
                            default:
                                o = m;
                                o.type = o.type || 'message';
                                break;
                        }
                    
                        if (typeof(m.from) != 'string') {
                            Symple.log('Symple Client: Invalid sender address: ', m);
                            return;
                        }
                            
                        // Replace the from attribute with the full peer object.
                        // This will only work for peer messages, not server messages.
                        var rpeer = self.roster.get(m.from);
                        if (rpeer)
                            m.from = rpeer;
                        else
                            Symple.log('Symple Client: Got message from unknown peer: ', m);
                        
                        // Dispatch to the application
                        self.doDispatch(m.type, m);
                    }
                });
            });
        });
        this.socket.on('error', function() {
            // This is triggered when any transport fails, 
            // so not necessarily fatal
            //self.setError('connect');          
            self.doDispatch('connect');   
        });
        this.socket.on('connecting', function() {
            Symple.log('Symple Client: Connecting');            
            self.doDispatch('connecting');
        });
        this.socket.on('reconnecting', function() {
            Symple.log('Symple Client: Reconnecting');            
            self.doDispatch('reconnecting');
        });
        this.socket.on('connect_failed', function() {
            // Called when all transports fail
            Symple.log('Symple Client: Connect failed');            
            self.doDispatch('connect_failed');
            self.setError('connect');   
        });
        this.socket.on('disconnect', function() {
            Symple.log('Symple Client: Disconnect');
            self.peer.online = false;
            self.doDispatch('disconnect');
        });
    },

    online: function() {
        return this.peer.online;
    },

    getPeers: function(fn) {
        self = this;
        this.socket.emit('peers', function(res) {
            Symple.log('Peers: ', res);
            if (typeof(res) != 'object')
                for (var peer in res)
                    self.roster.update(peer);
            if (fn)
                fn(res);
        });
    },

    send: function(m) {
        //Symple.log('Symple Client: Sending: ', m);
        if (!this.online()) throw 'Cannot send messages when offline';
        if (typeof(m) != 'object') throw 'Message must be an object';
        if (typeof(m.type) != 'string') m.type = 'message' //throw 'Message must have a type attribute';
        if (!m.id)  m.id = Symple.randomString(8);
        if (m.to && typeof(m.to) == 'object' && (m.to.group || m.to.user || m.to.id))
            m.to = Symple.buildAddress(m.to, this.peer.group);
        if (m.to && typeof(m.to) != 'string')
            throw 'Message \'to\' attribute must be an address string';
        if (m.to && m.to.indexOf(this.peer.id) != -1)
            throw 'Message sender cannot match the recipient';
        //if (typeof(m.to) == 'object' && m.to && m.to.id == m.from.id)
        //    throw 'The sender must not match the recipient';
        m.from = Symple.buildAddress(this.peer);
        Symple.log('Symple Client: Sending: ', m);
        this.socket.json.send(m);
    },
    
    respond: function(m) {      
        m.to = m.from;
        this.send(m);
    },

    sendMessage: function(m) { //, fn
        this.send(m); //, fn
    },

    sendPresence: function(p) {
        p = p || {};
        if (!this.online()) throw 'Cannot send message while offline';
        if (p.data) {
            p.data = Symple.merge(this.peer, p.data);
        }
        else
            p.data = this.peer;
        Symple.log('Symple Client: Sending Presence: ', p);
        this.send(new Symple.Presence(p));
    },

    sendCommand: function(c, fn, once) {
        var self = this;
        c = new Symple.Command(c);
        this.send(c);
        if (fn) {
            this.onResponse('command', {
                id: c.id
            }, fn, function(res) {
                if (once || (
                    // 202 (Accepted) and 406 (Not acceptable) response codes
                    // signal that the command has not yet completed.
                    res.status != 202 &&
                    res.status != 406)) {
                    self.clear('command', fn);
                }
            });
        }
    },

    // Adds a capability for our current peer
    addCapability: function(name, value) {        
        var peer = this.peer;
        if (peer) {
            if (typeof value == 'undefined')
                value = true
            if (typeof peer.capabilities == 'undefined')
                peer.capabilities = {}
            peer.capabilities[name] = value;
            //var idx = peer.capabilities.indexOf(name);
            //if (idx == -1) {
            //    peer.capabilities.push(name);
            //    this.sendPresence();
            //}
        }
    },

    // Removes a capability from our current peer
    removeCapability: function(name) {
        var peer = this.peer;
        if (peer && typeof peer.capabilities != 'undefined' && 
            typeof peer.capabilities[name] != 'undefined') {
            delete peer.capabilities[key];
            this.sendPresence();    
            //var idx = peer.capabilities.indexOf(name)
            //if (idx != -1) {
            //    peer.capabilities.pop(name);
            //    this.sendPresence();                
            //}
        }        
    },
    
    // Checks if a peer has a specific capbility and returns a boolean
    hasCapability: function(id, name) {
        var peer = this.roster.get(id)
        if (peer) {
            if (typeof peer.capabilities != 'undefined' && 
                typeof peer.capabilities[name] != 'undefined')
                return peer.capabilities[name] !== false;
            if (typeof peer.data != 'undefined' && 
                typeof peer.data.capabilities != 'undefined' && 
                typeof peer.data.capabilities[name] != 'undefined')
                return peer.data.capabilities[name] !== false;
        }
        return false;
    },
    
    // Checks if a peer has a specific capbility and returns the value
    getCapability: function(id, name) {
        var peer = this.roster.get(id)
        if (peer) {
            if (typeof peer.capabilities != 'undefined' && 
                typeof peer.capabilities[name] != 'undefined')
                return peer.capabilities[name];
            if (typeof peer.data != 'undefined' && 
                typeof peer.data.capabilities != 'undefined' && 
                typeof peer.data.capabilities[name] != 'undefined')
                return peer.data.capabilities[name];
        }
        return undefined;
    },

    // Sets the client to an error state and disconnect
    setError: function(error, message) {
        Symple.log('Symple Client: Client error: ', error, message);
        //if (this.error == error)
        //    return;
        //this.error = error;
        this.doDispatch('error', error, message);
        if (this.socket)
            this.socket.disconnect();
    },

    onResponse: function(event, filters, fn, after) {
        if (typeof this.listeners[event] == 'undefined')
            this.listeners[event] = [];
        if (typeof fn != 'undefined' && fn.constructor == Function)
            this.listeners[event].push({
                fn: fn,             // data callback function
                after: after,       // after data callback function
                filters: filters    // event filter object for matching response
            });
    },

    clear: function(event, fn) {
        Symple.log('Symple Client: Clearing callback: ', event);
        if (typeof this.listeners[event] != 'undefined') {
            for (var i = 0; i < this.listeners[event].length; i++) {
                if (this.listeners[event][i].fn === fn &&
                    String(this.listeners[event][i].fn) == String(fn)) {
                    this.listeners[event].splice(i, 1);
                    Symple.log('Symple Client: Clearing callback: OK: ', event);
                }
            }
        }
    },

    doDispatch: function() {
        // Modified dispatch function response callbacks first.
        // If a match is found event propagation will be terminated.
        if (!this.dispatchResponse.apply(this, arguments)) {
            this.dispatch.apply(this, arguments);
        }
    },

    dispatchResponse: function() {
        var event = arguments[0];
        var data = Array.prototype.slice.call(arguments, 1);
        if (typeof this.listeners[event] != 'undefined') {
            for (var i = 0; i < this.listeners[event].length; i++) {
                if (typeof this.listeners[event][i] == 'object' &&
                    this.listeners[event][i].filters != 'undefined' &&
                    Symple.match(this.listeners[event][i].filters, data[0])) {
                    this.listeners[event][i].fn.apply(this, data);
                    if (this.listeners[event][i].after != 'undefined') {
                        this.listeners[event][i].after.apply(this, data);   
                    }                 
                    return true;
                }
            }
        }
        return false;
    }
});


// -----------------------------------------------------------------------------
// Symple Roster
//
Symple.Roster = Symple.Manager.extend({
    init: function(client) {
        Symple.log('Symple Roster: Creating');
        this._super();
        this.client = client;
    },
    
    // Add a peer object to the roster
    add: function(peer) {
        Symple.log('Symple Roster: Adding: ', peer);
        if (!peer || !peer.id || !peer.user || !peer.group)
            throw 'Cannot add invalid peer'
        this._super(peer);
        this.client.doDispatch('addPeer', peer);
    },

    // Remove the peer matching an ID or address string: user@group/id
    remove: function(id) {
        id = Symple.parseIDFromAddress(id) || id;
        var peer = this._super(id);
        Symple.log('Symple Roster: Removing: ', id, peer);
        if (peer)
            this.client.doDispatch('removePeer', peer);
        return peer;
    },
    
    // Get the peer matching an ID or address string: user@group/id
    get: function(id) {
    
        // Handle IDs
        peer = this._super(id); // id = Symple.parseIDFromAddress(id) || id;
        if (peer)
            return peer;

        // Handle address strings
        return this.findOne(Symple.parseAddress(id));
    },
    
    update: function(data) {
        if (!data || !data.id)
            return;
        var peer = this.get(data.id);
        if (peer)
            for (var key in data)
                peer[key] = data[key];
        else
            this.add(data);
    }
        
    // Get the peer matching an address string: user@group/id
    //getForAddr: function(addr) {        
    //    var o = Symple.parseAddress(addr);
    //    if (o && o.id)
    //        return this.get(o.id);
    //    return null;
    //}
});


// -----------------------------------------------------------------------------
// Helpers
//
Symple.parseIDFromAddress = function(str) {
    var arr = str.split("/")
    if (arr.length == 2)
        return arr[1];
    return null;
};

Symple.parseAddress = function(str) {
    var addr = {}, base,
        arr = str.split("/")
        
    if (arr.length < 2) // no id
        base = str;        
    else { // has id
        addr.id = arr[1];   
        base = arr[0];   
    }
    
    arr = base.split("@")
    if (arr.length < 2) // group only
        addr.group = base;         
    else { // group and user
        addr.user = arr[0];
        addr.group  = arr[1];
    }
        
    return addr;
}

Symple.buildAddress = function(peer, defaultGroup) {
    return (peer.user ? (peer.user + '@') : '') + 
        (peer.group ? peer.group : defaultGroup) + '/' + 
        (peer.id ? peer.id : '');
}


// -----------------------------------------------------------------------------
// Message
//
Symple.Message = function(json) {
    if (typeof(json) == 'object')
        this.fromJSON(json);
    this.type = "message";
}

Symple.Message.prototype = {
    fromJSON: function(json) {
        for (var key in json)
            this[key] = json[key];
    },

    valid: function() {
        return this['id']
        && this['from'];
    }
};


// -----------------------------------------------------------------------------
// Command
//
Symple.Command = function(json) {
    if (typeof(json) == 'object')
        this.fromJSON(json);
    this.type = "command";
}

Symple.Command.prototype = {
    getData: function(name) {
        return this['data'] ? this['data'][name] : null;
    },

    params: function() {
        return this['node'].split(':');
    },
    
    param: function(n) {
        return this.params()[n-1];
    },

    matches: function(xuser) {
        xparams = xuser.split(':');

        // No match if x params are greater than ours.
        if (xparams.length > this.params().length)
            return false;

        for (var i = 0; i < xparams.length; i++) {

            // Wildcard * matches everything until next parameter.
            if (xparams[i] == "*")
                continue;
            if (xparams[i] != this.params()[i])
                return false;
        }

        return true;
    },

    fromJSON: function(json) {
        for (var key in json)
            this[key] = json[key];
    },

    valid: function() {
        return this['id']
        && this['from']
        && this['node'];
    }
};


// -----------------------------------------------------------------------------
// Presence
//
Symple.Presence = function(json) {
    if (typeof(json) == 'object')
        this.fromJSON(json);
    this.type = "presence";
}

Symple.Presence.prototype = {
    fromJSON: function(json) {
        for (var key in json)
            this[key] = json[key];
    },

    valid: function() {
        return this['id']
        && this['from'];
    }
};


// -----------------------------------------------------------------------------
// Event
//
Symple.Event = function(json) {
    if (typeof(json) == 'object')
        this.fromJSON(json);
    this.type = "event";
}

Symple.Event.prototype = {
    fromJSON: function(json) {
        for (var key in json)
            this[key] = json[key];
    },

    valid: function() {
        return this['id']
        && this['from']
        && this.name;
    }
};
