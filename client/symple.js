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
}


// -----------------------------------------------------------------------------
// Symple Client
//
Symple.Client = Dispatcher.extend({
    init: function(peer, options) {
        console.log('Symple Client: Creating: ', peer, options);
        this.peer = peer;
        this.options = $.extend({
            url:     'http://localhost:4000',
            token:   undefined     // pre-arranged server session token
            //timeout: 0              // set to positive for connection timeout
        }, options);
        this._super(this.options);
        this.roster = new Symple.Roster(this);
        this.socket = null;
    },

    // Connects and authenticates on the server.
    // If the server is down the 'error' event will fire.
    connect: function() {
        self = this;
        console.log('Symple Client: Connecting: ', this.options);
        
        this.socket = io.connect(this.options.url, this.options);
        this.socket.on('connect', function() {
            console.log('Symple Client: Connected');
            self.socket.emit('announce', {
                token:  self.options.token,
                group:  self.peer.group,
                user:   self.peer.user,
                name:   self.peer.name,
                type:   self.peer.type
            }, function(res) {
                console.log('Symple Client: Announce Response: ', res);
                if (res.status != 200) {
                    self.setError('auth', res);
                    return;
                }
                self.peer = $.extend(self.peer, res.data);
                self.roster.add(res.data);
                self.sendPresence({ probe: true });
                self.doDispatch('announce', res);
                self.socket.on('message', function(m) {
                    console.log('Symple Client: Receive: ', m);
                    if (typeof(m) == 'object') {
                        if (m.type == 'message') {
                            self.doDispatch('message',
                                new Symple.Message(m));
                        }
                        else if (m.type == 'command') {
                            self.doDispatch('command',
                                new Symple.Command(m));
                        }
                        else if (m.type == 'event') {
                            self.doDispatch('event',
                                new Symple.Event(m));
                        }
                        else if (m.type == 'presence') {
                            if (m.data.online)
                                self.roster.update(m.data);
                            else
                                self.roster.remove(m.data.id);
                            self.doDispatch('presence',
                                new Symple.Presence(m));
                            if (m.probe == true) {
                                self.sendPresence(
                                    new Symple.Presence({
                                        to: m.from
                                    }));
                            }
                        }
                        else {
                            self.doDispatch(m.type, m);
                        }
                    }
                });
            });
        });
        this.socket.on('error', function() {
            self.setError('connect');       
        });
        this.socket.on('connecting', function() {
            console.log('Symple Client: Connecting');            
            self.doDispatch('connecting');
        });
        this.socket.on('reconnecting', function() {
            console.log('Symple Client: Reconnecting');            
            self.doDispatch('reconnecting');
        });
        this.socket.on('connect_failed', function() {
            console.log('Symple Client: Connect Failed');            
            self.doDispatch('connect_failed');
        });
        this.socket.on('disconnect', function() {
            console.log('Symple Client: Disconnect');
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
            console.log('Peers: ', res);
            if (typeof(res) != 'object')
                for (var peer in res)
                    self.roster.update(peer);
            if (fn)
                fn(res);
        });
    },

    send: function(m) {
        //console.log('Symple Client: Sending: Pre: ', m); 
        if (!this.online())
            throw 'Cannot send message while offline';
        if (typeof(m) != 'object')
            throw 'Must send object';
        //if (typeof(m.to) != 'object')
        //    throw 'Cannot send message with no recipient';
        if (typeof(m.type) != 'string')
            throw 'Cannot send message with no type';
        if (!m.id)
            m.id = Symple.randomString(8);
        //if (!m.from)
        //    m.from = {}
        //m.from = self.ourID;
        m.from = this.peer;
        console.log('Symple Client: Sending: ', m);
        if (typeof(m.to) == 'object' && m.to && m.to.id == m.from.id)
            throw 'The sender must not match the recipient';
        this.socket.json.send(m);
    },

    sendMessage: function(m) { //, fn
        this.send(new Symple.Message(m)); //, fn
    },

    sendPresence: function(p) {
        p = p || {};
        //console.log('Symple Client: Sending: sendPresence: ', p, this.peer); 
        if (!this.online())
            throw 'Cannot send message while offline';
        if (p.data) {
            //console.log('Symple Client: Sending Presence: ', p.data, this.peer);
            p.data = Symple.merge(this.peer, p.data);
        }
        else
            p.data = this.peer;
        console.log('Symple Client: Sending Presence: ', p);
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
    addCapability: function(name) {
        var peer = this.peer;
        if (peer) {
            if (typeof peer.capabilities == 'undefined')
                peer.capabilities = []; //{}
            var idx = peer.capabilities.indexOf(name)
            if (idx == -1) {
                peer.capabilities.push(name);
                this.sendPresence();
            }
        }
    },

    // Removes a capability from our current peer
    removeCapability: function(name) {
        var peer = this.peer;
        if (peer && typeof(peer.capabilities) != 'undefined') {
            var idx = peer.capabilities.indexOf(name)
            if (idx != -1) {
                peer.capabilities.pop(name);
                this.sendPresence();                
            }
        }        
    },

    // Sets the client to an error state and and dispatches an error event
    setError: function(error, message) {
        console.log('Symple Client: Client Error: ', error, message);
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
        console.log('Symple Client: Clearing Callback: ', event);
        if (typeof this.listeners[event] != 'undefined') {
            for (var i = 0; i < this.listeners[event].length; i++) {
                if (this.listeners[event][i] == fn ||
                    String(this.listeners[event][i].fn) == String(fn)) {
                    this.listeners[event].splice(i, 1);
                    console.log('Symple Client: Clearing Callback: OK: ', event);
                }
            }
        }
    },

    doDispatch: function() {
        // Modified dispatch function response callbacks first.
        // If a match is found event propagation will be terminated.
        if (!this.dispatchResponse.apply(this, arguments))
            this.dispatch.apply(this, arguments);
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
                    if (this.listeners[event][i].after != 'undefined')
                        this.listeners[event][i].after.apply(this, data);                    
                    return true;
                }
            }
        }
        return false;
    }
});


// -----------------------------------------------------------------------------
//
// Symple Roster
//
// -----------------------------------------------------------------------------
Symple.Roster = Manager.extend({
    init: function(client) {
        console.log('Symple Roster: Creating');
        this._super();
        this.client = client;
    },
    
    add: function(peer) {
        console.log('Symple Roster: Adding: ', peer);
        this._super(peer);
        this.client.doDispatch('addPeer', peer);
    },

    remove: function(id) {
        var peer = this._super(id)
        console.log('Symple Roster: Removing: ', id, peer);
        if (peer)
            this.client.doDispatch('removePeer', peer);
        return peer;
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
});


// -----------------------------------------------------------------------------
//
// Message
//
// TODO: All messages should inherit from here.
//
// -----------------------------------------------------------------------------
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
//
// Command
//
// -----------------------------------------------------------------------------
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
//
// Presence
//
// -----------------------------------------------------------------------------
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
//
// Event
//
// -----------------------------------------------------------------------------
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


    /*
    toID: function() {
        return new Symple.Address(this['to']);
    },

    fromID: function() {
        return new Symple.Address(this['from']);
    },
    */

    /*
    toID: function() {
        return new Symple.Address(this['to']);
    },

    fromID: function() {
        return new Symple.Address(this['from']);
    },
    */

    /*
    toID: function() {
        return new Symple.Address(this['to']);
    },

    fromID: function() {
        return new Symple.Address(this['from']);
    },
    */


    /*
    toID: function() {
        return new Symple.Address(this['to']);
    },

    fromID: function() {
        return new Symple.Address(this['from']);
    },
    */



/*
Symple.Roster = function (client) {
    this.client = client;
    this.peers = [];
}

Symple.Roster.prototype = {


    add: function(peer) {
        console.log('Roster: Adding: ' + peer.id);
        this.peers.push(peer);
        this.client.doDispatch('addPeer', peer);
    },

    remove: function(id) {
        console.log('Roster: Removing: ' + id);
        for (var i = 0; i < this.peers.length; i++) {
            if (this.peers[i].id == id) {
                this.client.doDispatch('removePeer', this.peers[i]);
                this.peers.splice(i, 1);
                console.log('Roster: Removed: ' + id);
                return true;
            }
        }
        return false;
    },

    get: function(id) {
        for (var i = 0; i < this.peers.length; i++) {
            if (this.peers[i].id == id) {
                return this.peers[i];
            }
        }
        return null;
    },

    find: function(params) {
        var res = [];
        var peer = null;
        var match = true;
        for (var i = 0; i < this.peers.length; i++) {
            peer = this.peers[i];
            match = true;
            for (var prop in params) {
                if (!params.hasOwnProperty(prop) ||
                    !peer.hasOwnProperty(prop) ||
                    peer[prop] != params[prop]) {
                    match = false;
                    break;
                }
            }
            if (match)
                res.push(peer)
        }
        return res;
    },

    findOne: function(params) {
        var res = this.find(params);
        return res.length ? res[0] : undefined;
    },

    update: function(data) {
        //var id;
        //var peer;
        //for (var i = 0; i < data.length; i++) {
            //id = data.id;
            // TODO: check data veracity
            if (!data.id)
                return;
            if (data.online) {
                var peer = this.get(data.id);
                if (peer)
                    for (var key in data)
                        peer[key] = data[key];
                else
                    this.add(data);
            }
            else
                this.remove(data.id);
        //}
    }
}


// -----------------------------------------------------------------------------
//
// Symple ID
//
// -----------------------------------------------------------------------------
Symple.Address = function(id) {
    parts = id ? id.split(':') : [];
    this.group = parts[0] ? parts[0] : '';
    this.user = parts[1] ? parts[1] : '';
    this.node = parts[2] ? parts[2] : '';
}

Symple.Address.prototype = {
    toString: function() {
        var s = ''
        if (this.group.length) {
            s += this.group;
        }
        if (this.user.length) {
            s += ':';
            s += this.user;
        }
        if (this.node.length) {
            s += ':';
            s += this.node;
        }
        return s;
    },

    // Compares two ids if they belong to
    // the same entity (i.e. w/o session)
    isEntity: function(id) {
        if (typeof id == 'string')
            id = (new Symple.Address(id));
        return (this.group == id.group
            && this.user == id.user);
    }
}
*/



        /*
    updateElementFromField: function(el) {
        el = $(el);
        var id = el.attr('id');
        var field = this.getField(id);
        if (!id || !field || el.attr('name') == 'submit') return null;
        switch (el.get(0).nodeName) {
            case 'INPUT':
                el.val(field.values[0]);
                break;
            case 'TEXTAREA':
                el.text(field.values[0]);
                break;
            case 'SELECT':
                $('option:selected', el).attr('selected', false);
                for (var i = 0; i < field.values.length; i++) {
                    $('option[value="' + field.values[i] + '"]', el).attr('selected', true); //.addAttr('selected');
                }
                break;
            default: return null;
        }

        if (field.error) {
            var fel = el.parents('.field:first');
            console.log('AAAAAAAAAAAAAAAAAAAAA', field.error)
            console.log('AAAAAAAAAAAAAAAAAAAAA fel', fel)
            fel.addClass('errors');
            fel.find('.error').text(field.error)
            //var err = el.parent('.field').find('.error');
            //err = err || el.after('<div class="error">' + field.error + '</div>');
        }
        //'<div class="error">' + o.error + '</div>';

        console.log('Updating Element: ', id, field.values)
        return field;
    },
                        */





        // Implementing out own connection timer since socket.io's
        // connect_failed event is broken in the current version 0.9.1.
        //if (this.options.timeout) {
        //    var timeout = setTimeout(function() {
        //        self.setError('connect', 'Connection timed out after ' + self.options.timeout);
        //    }, this.options.timeout);
        //}

        //this.error = null;
            //clearTimeout(timeout);










        //o.live ? '<fieldset class="live">' : '<fieldset>';
        /* //, e
            console.log('Building form field:', o.type)
        if (o.label)
            id = this.form.id + '-' + o.label.paramaterize();
    //buildSectionHeading: function(o) {
    //    return '<h3>' + o.label + '</h3>';
   // },
        */
   // buildPageHeading: function(o) {
   //     return '<h2>' + o.label + '</h2>';
   // },
/*
function Symple(options) {
    this.roster = new Symple.Roster(this);
    this.listeners = {};
    this.socket = null;
    this.online = false;
    if (options)
        this.init(options);
}

Symple.prototype = {
    init: function(options) {
        this.options = $.extend({
            url:    'http://localhost:1337',
            token:  undefined,
            group:  undefined,
            user:   undefined,
            name:   undefined,
            type:   'Client'
        }, options);
    },
    */


    /*
    // Converts the inner XML object to form HTML
    toPagedHTML: function() {
        var html = '';
        html += this.startFormHTML();
        html += this.buildElements(this, 0);
        html += this.endFormHTML();
        return html;
    },
        */

        /*
        var label = field.label;
        var type = field['type'];
        var name = field['id'];
        var values = field['values'];
        var value = values ? values[0] : ''; // The default value (if any)
        var hint = field['hint'];
        var error = field['error'];
        var isField = true;

        if (type == 'page') {
            html += '<h2>' + label + '</h2>';
            isField = false;
        }
        else if (type == 'fieldset') {
            html += '<h3>' + label + '</h3>';
            isField = false;
        }
        else
            html += '<label for="' + name + '">' + label + '</label>';
        if (hint)
            html += '<div class="hint ' + (isField ? '' : 'field') + '">' + hint + '</div>';
        if (error)
            html += '<div class="error ' + (isField ? '' : 'field') + '">' + error + '</div>';

        //console.log("multi-form".classify())
        //console.log(type.classify())

        switch (type) {
            case 'text':
                //html += '<input type="text" id="' + o.id + '" name="' + o.id + '" size="20" value="' + (o.values ? o.values[0] : '') + '" />';
                break;
            case 'text-multi':
                //html += '<textarea id="' + o.id + '" name="' + o.id + '" rows="2" cols="20"></textarea>';
                break;
            case 'text-private':
                //html += '<input type="password" id="' + o.id + '" name="' + o.id + '" size="20" />';
                break;
            case 'list':
                html += '<select id="' + o.id + '" name="' + o.id + '">';
                for (var o in field['options'])
                    html += '<option value="' + o.o + '" ' + o.(o == value ? 'selected' : '') + '>' + o.field['options'][o] + '</option>';
                html += '</select>';
                break;
            case 'list-multi':
                html += '<select id="' + o.id + '" name="' + o.id + '" multiple>';
                for (var o in field['options'])
                    html += '<option value="' + o.o + '" ' + o.values && values.indexOf(o) > -1 ? 'selected' : '') + '>' + o.field['options'][o] + '</option>';
                html += '</select>';
                break;
            case 'boolean':
                html += '<select id="' + o.id + '" name="' + o.id + '" size="1">';
                if (value == '1')
                    html += '<option value="0">No</option>' +
                            '<option value="1" selected>Yes</option>';
                else
                    html += '<option value="0" selected>No</option>' +
                            '<option value="1">Yes</option>';
                html += '</select>';
                break;
            //case 'fixed':
            //    html += '<h3o.values><a href="#">' + (o.values ? o.values[0] : '') + '</a></h3>';
            //    break;
            case 'hidden':
                html += '<input type="hidden" id="' + o.id + '" name="' + o.id + '" value="' + (o.values ? o.values[0] : '') + '" />';
                break;
            default: // unknown type...
                break;
        }
        */

                        /*
    buildPageMenu: function(o, depth) {
        var html = '';
        var root = depth == 0;
        if (root)
           html += '<ul class="menu">';
        if (typeof o.elements != 'undefined') {
            depth++;
            for (var i = 0; i < o.elements.length; i++) {
                var a = o.elements[i];
                if (typeof a == 'object') {
                    if (a.type == 'page') {
                        var label = a.label;
                        if (label) {
                            var id = this.id + '_' + label.paramaterize();
                            html += '<li><a href="#' + id + '"><span>' + label + '</span></a></li>';
                        }
                    }
                    if (a.elements)
                        html += this.buildPageMenu(a, depth);
                }
            }
        }
        if (root)
           html += '</ul>';
        return html;
    },
                        var label = a.label;
                        if (label) {
                            var id = this.id + '_' + label.paramaterize();
                            html += '<div class="page" id="' + id + '">';
                        }
                        //html += '<fieldset>';
                        //html += '</div>';
                        */

    /*
    toJSON: function() {
      var object = {};
      for (var key in this) {
        if (typeof this[key] != "function")
          object[key] = this[key];
      }
      return (JSON.stringify(object));
    },
    */

            //f.append('<value>' + e.val() + '</value>');

            //f.append('<value>' + e.text() + '</value>');
            //console.log('prepareSend: ', self);
            //console.log('prepareSend: ', e.get(0).nodeName);
            //console.log('prepareSend: name: ', e.attr('id'));
            //console.log('prepareSend: VALUE: ', e.val());
            //console.log('prepareSend: FIELD: ', field);
            //findNestedWithProperty(getTestJSONDataForm(), "error", null, 1); //console.log(.error)
            //var f = $('<field/>');
            //f.attr('type', e.attr('class'));	// TODO: Get only first class name
            //f.attr('var', e.attr('name'));
            //f.append('<value>' + $(this).find('option:selected').val() + '</value>');
            //x.append(f);
    /*,

    valid: function() {
        return this['id']
            && this['from'];
    }


    // Converts a HTML object into Form XML
    formToXML: function(obj, type) {
        try {
            //alert(formToXML);
            var x = $('<x xmlns="jabber:x:data" type="' + type + '"/>');
            $('input, select, textarea', obj).each(function() {
                var e = $(this);
                if (e.attr('name') == 'submit') return;
                var f = $('<field/>');
                f.attr('type', e.attr('class'));	// TODO: Get only first class name
                f.attr('var', e.attr('name'));
                switch (e.get(0).nodeName) {
                    case 'INPUT':
                        f.append('<value>' + e.val() + '</value>');
                        break;
                    case 'TEXTAREA':
                        f.append('<value>' + e.text() + '</value>');
                        break;
                    case 'SELECT':
                        f.append('<value>' + $(this).find('option:selected').val() + '</value>');
                        break;
                }
                x.append(f);
            });
            return $.parseXML($('<div/>').html(x).html());

        } catch (e) {
            alert(e)
        }
        return null;
    },
    */

        //var formName = 'formName';
            //var inst = $(this.xml).find('instructions').text();
            //if (inst.length)
            //    html += '<p class="instructions">' + inst + '<p>';
       // console.log('toHTML');
       //alert(html)
        //}
        /*json
        */
        //function iterateAttributesAndFormHTMLLabels(o){
            //var s = '';//end for
        //return s;
        //}//end function
        //html += this.buildElements(this.elements, html, 0);

        //if (form) {
        //console.log('toHTML: HTML: ', html);
        /*
        // Iterate through the fields creating form elements
        $(this.xml).find('field').each(function() {
            html += self.fieldToHTML(this);
        });
        */
        //if (form) {
        //}
        //alert(html);
        //field = $(field);
        /*
        var label = field.attr('label');
        var type = field.attr('type');
        var name = field.attr('var');
        var value = field.find('value:first').text(); // The default value (if any)
        var hint = field.find('desc').text();
        */

                //if (value.length) {
                //} else {
                //    html += '<input type="text" id="' + name + '" name="' + name + '" size="20" class="' + type + '" />';
                //}

                //var optval = o;
                //var optlabel = field['options'][o];
                //if (optval == value) {
                //    oent += '<option value="' + optval + '" selected>' + optlabel + '</option>';
                //} else {
                //    oent += '<option value="' + optval + '">' + optlabel + '</option>';
                //}
                /*//$(this).attr('label'); //$(this).find('value').text();
                value = field.children('value').text();
                oent = '<select id="' + name + '" name="' + name + '" class="' + type + '">';
                field.children('option').each(function() {
                    var optval = $(this).find('value').text();
                    var optlabel = $(this).attr('label');
                    if (optval == value) {
                        oent += '<option value="' + optval + '" selected>' + optlabel + '</option>';
                    } else {
                        oent += '<option value="' + optval + '">' + optlabel + '</option>';
                    }
                });
                html += oent;
                */
    /*
    toTabsHTML: function(formName) {

        var self = this;
        var xml = this.xml;
        var pages = $(this.xml).find('page');
        if (pages.length == 0)
            throw ('Failed to create tabs: No layout data');

        var html = '';
        html += "<form id='" + formName + "' name='" + formName + "' class='friendly data-form'>";
        var inst = $(this.xml).find('instructions').text();
        if (inst.length)
            html += '<p class="instructions">' + inst + '<p>';

        html += '<div class="tabs">';
        html += '<ul class="menu">';

        // Iterate through the pages creating tab headings
        $(this.xml).find('page').each(function() {
            var page = $(this);
            var label = page.attr('label');
            var id = label.paramaterize();
            html += '<li>';
            html += '<a href="#' + formName + '_' + id + '"><span>' + label + '</span></a>'
            html += '</li>';
        });
        html += "</ul>";

        // Iterate through the pages again creating tab content
        $(this.xml).find('page').each(function() {
            var page = $(this);
            var section = $('section', this);
            var label = page.attr('label');
            var id = label.paramaterize();
            html += '<div class="panel" id="' + formName + '_' + id + '">';

            // Add a heading for each section
            if (section.length)
                html += '<h3>' + section.attr('label') + '</h3>';

            // Add fields for each fieldref
            page.find('fieldref').each(function() {
                var field = $(xml).find('field[var*="' + $(this).attr('var') + '"]');
                html += self.fieldToHTML(field);
            });

            html += '</div>';

        });

        // Iterate through the fields creating form elements
        //$(this.xml).find('field').each(function() {
        //    html += fieldToHTML(this);
        //});

        html += "<input type='submit' name='submit' value='Submit' class='submit'/>";
        html += "</form>";
        return html;
    },
    */


    /*
	<div id="tabs">
    <ul>
        <li><a href="#fragment-1"><span>One</span></a></li>
        <li><a href="#fragment-2"><span>Two</span></a></li>
        <li><a href="#fragment-3"><span>Three</span></a></li>
    </ul>
    <div id="fragment-1">
        <p>First tab is active by default:</p>
        <pre><code>$('#example').tabs();</code></pre>
    </div>
    <div id="fragment-2">
        Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat.
        Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat.
    </div>
    <div id="fragment-3">
        Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat.
        Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat.
        Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat.
    </div>
</div>
*/



//    Symple.Message.call(this, false);
//}

//Symple.Command.prototype = Object.create(Person.prototype);
//Symple.Command.prototype = {
//};





    /*
    toString: function() {
      var object = {};
      for (var key in this) {
        if (typeof this[key] != "function")
          object[key] = this[key];
      }
      return JSON.stringify(object);
    },

    type: function() {
        return this['type'];
    },
        setRootAttr('from', value);
        setRootAttr('to', value);
    ,
    setType: function(value) {
        setRootAttr('type', value);
    },

    setAttrs: function(attrs) {
        for (var key in attrs) {
            setRootAttr(key, attrs[key]);
        }
    },
    setRootAttr: function(name, value) {
        this.xml.firstChild.setAttribute(name, value);
    }
    */
    /*
    //
    ////,
    //name: function() {
    //    return this.xml.firstChild.nodeName.toLowerCase();
    //},

    firstChild: function() {
        return $(this.xml.firstChild).children(':first');
    },
    childName: function() {
        try {
            return this.firstChild().get(0).nodeName.toLowerCase();
        } catch (e) {
        }
        return "undefined";
    },

    // Children
    error: function() {
        var data = $('<div/>').html($(this.xml).find('error[code][type]:first')).html();
        if (data.length)
            return new Error(data);
        return null;
    },
    command: function() {
        try {
            return new Command(this);
        } catch (e) {
            alert(e);
        }
        return "undefined";

    //var data = $('<div/>').html($(this.xml).find('command[sessionid][user]:first')).html();
    //if (data.length)
    //return new Command(this);
    //return null;
    },
    */



            //for (var cb in this.listeners[event]) {
                //console.log('Callback:1: ', arguments[1]);
                //console.log('Callback event: ', event);
                //console.log('Callback cb: ', cb);
            //}


           // this.listeners[event].forEach(function(cb) {
                //console.log('Callback: ', arguments);
                //cb.apply(self, arguments);
           // });
                /*
                self.socket.on('disconnect', function(){
                    self.options.onDisconnect();
                });
                    //console.log(data)
                    //fn('message', data);
                this.socket.on('peers', function(data){
                    console.log('getPeers CBBBBBBBBBBBBBBBBBBBBBBBBB')
                    console.log(data)
                    fn('peers', data);
                });
                */
                //self.getPeers(function(r) {
                //});

              //$user = $symple.peers.findOne({ username: '<%= @peer.username %>', type: 'user' });
              //console.log($user);
                //self.peers.peer()
              //$symple.sendPresence({ to: $user.id, probe: true })
                /*{
                    from:   self.ourID,
                    peer: self.peers.peer(),
                    probe:  true }
                self.peers.add({
                    id:     self.socket.socket.sessionid,
                    name:   self.options.name,
                    type:   self.options.type
                })
                */

                //,
                //    probe:  true
                //console.log('peer: ' + self.peers.peer())
                //self.sendPresence(self.peers.peer());

/*
// -----------------------------------------------------------------------------
//
// Symple.Roster
//
// -----------------------------------------------------------------------------
function Symple.Roster() {
    this.ourID = null;
    this.Symples = [];
}

Symple.Roster.prototype = {
    get: function(id) {
        for (var i = 0; i < this.Symples.length; i++) {
            if (this.Symples[i].id == id) {
                return this.Symples[i];
            }
        }
        return undefined;
    },

    remove: function(id) {
        for (var i = 0; i < this.Symples.length; i++) {
            if (this.Symples[i].id == id) {
                this.Symples.splice(i, 1);
            }
        }
    },

    getWithType: function(id, type) {
        for (var i = 0; i < this.Symples.length; i++) {
            if (this.Symples[i].id == id &&
                this.Symples[i].type == type) {
                return this.Symples[i];
            }
        }
        return undefined;
    },

    find: function(params) {
        var res = [];
        var Symple = null;
        var match = true;
        for (var i = 0; i < this.Symples.length; i++) {
            Symple = this.Symples[i];
            match = true;
            for (var prop in params) {
                if (!params.hasOwnProperty(prop) ||
                    !Symple.hasOwnProperty(prop) ||
                    Symple[prop] != params[prop]) {
                    match = false;
                    break;
                }
            }
            if (match)
                res.push(Symple)
        }
        return res;
    },

    findOne: function(params) {
        var res = this.find(params);
        return res.length ? res[0] : undefined;
    },

    peer: function() {
        return this.Symples[this.ourID];
    },

    add: function(Symple) {
        console.log('Symple.Roster: Adding: ' + Symple.Address);
        this.remove(Symple.Address);
        this.Symples.push(Symple);
    },

    update: function(data) {
        data = JSON.parse(data);

        for (var i = 0; i < data.length; i++) {
            this.add(data[i]);
        }
    }
}


// -----------------------------------------------------------------------------
//
// Symple
//
// -----------------------------------------------------------------------------
function Symple(options) {
    self = this;
    this.options = $.extend({
        url:    'http://localhost:1337',
        name:   undefined,
        token:  undefined,
        type:   'Symple',
        onAnnounce: function(e, d) {},
        onCommand: function(c) {},
        onPresence: function(p) {},
        onMessage: function(m) {}
    }, options);

    this.peers = new Symple.Roster;
    this.socket = null;

    this.connect = function() {
        console.log('Connecting: ' + self.options.url);
        self.socket = io.connect(self.options.url);
        self.socket.on('connect', function() {
            self.socket.emit('announce', {
                token: self.options.token,
                name: self.options.name,
                type: self.options.type
            }, function(res) {
                console.log('Authorized: ' + self.socket.socket.sessionid);
                self.ourID = self.socket.socket.sessionid;
                self.options.onAnnounce(res);
                self.socket.on('message', function(m) {
                    self.options.onMessage(m);
                });
                self.socket.on('command', function(c) {
                    self.options.onCommand(c);
                });
                self.socket.on('presence', function(p) {
                    self.options.onPresence(p);
                });
                self.socket.on('disconnect', function() {
                    self.options.onDisconnect();
                });
            });
        });
        self.socket.on('disconnect', function() {
            self.options.onPresence();
        });
    };

    this.getPeers = function send(fn) {
        console.log('getPeers')
        this.socket.emit('peers', '', function(res) {
            self.peers.update(res);
            console.log(res);
            if (fn)
                fn(res);
             //$('#board').append('<p>' + name + ': ' + msg + '</p>');
        });
    }

    this.send = function send(type, o, fn) {
        console.log('Sending: ')
        console.log(o)
        this.socket.emit(type, o, function(res) {
            console.log(res)
            if (fn)
                fn(res);
        });
    };

    this.sendMessage = function send(m, fn) {
        this.send('message', m, fn);
    };

    this.sendCommand = function send(c, fn) {
        this.send('command', c, fn);
    };

    this.sendPresence = function send(p, fn) {
        this.send('presence', p, fn);
    };
}

*/


        //this.peers = JSON.parse(data); //peers[data[i].id] = data

        /*
        for (var i = 0; i < this.peers.length; i++) {
            if (this.peers[i].id == id) {
                return this.peers[i];
            }
        }
        */
    /*,


    getWithType: function(id, type) {
        for (var i = 0; i < this.peers.length; i++) {
            if (this.peers[i].id == id &&
                this.peers[i].type == type) {
                return this.peers[i];
            }
        }
        return undefined;
    },

    getOrActive: function(id) {
        var peer = this.get(id);
        if (!peer && this.ourID) // && Spot.session && Spot.session.active()
            peer = this.peer();
        return peer;
    },

    data: function(data) {
        //this.peers = JSON.parse(data);
    }

    setActive: function(peer) {
        //var state = "offline";
        if (peer) {
          for (var i = 0; i < this.peers.length; i++) {
              this.peers[i];.setActive(this.peers[i].id == peer.id);
          }
          //state = "online"
        }
        //this.setState(state);
    }
    */


        //this.Symples = JSON.parse(data); //Symples[data[i].id] = data

        /*
        for (var i = 0; i < this.Symples.length; i++) {
            if (this.Symples[i].id == id) {
                return this.Symples[i];
            }
        }
        */
    /*,


    getOrActive: function(id) {
        var Symple = this.get(id);
        if (!Symple && this.ourID) // && Spot.session && Spot.session.active()
            Symple = this.peer();
        return Symple;
    },

    data: function(data) {
        //this.Symples = JSON.parse(data);
    }

    setActive: function(Symple) {
        //var state = "offline";
        if (Symple) {
          for (var i = 0; i < this.Symples.length; i++) {
              this.Symples[i];.setActive(this.Symples[i].id == Symple.Address);
          }
          //state = "online"
        }
        //this.setState(state);
    }
    */
                /*
                self.socket.on('message', self.options.onMessage());
                self.socket.on('command', self.options.onCommand());
                self.socket.on('presence', self.options.onPresence());
                self.socket.on('disconnect', self.options.onDisconnect());
                this.socket.on('peers', function(data){
                    console.log('getPeers CBBBBBBBBBBBBBBBBBBBBBBBBB')
                    console.log(data)
                    fn('peers', data);
                });
                */
    //this.sendCommand = function send(user) {
    //
    //}
        //$('#board').append('<p>' + name + ': ' + msg + '</p>');