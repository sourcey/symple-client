const Symple = {}

// (function (S) {
  // Parse a Symple address into a peer object.
  Symple.parseAddress = function (str) {
    var addr = {},
      arr = str.split('|')

    if (arr.length > 0) // no id
      { addr.user = arr[0] }
    if (arr.length > 1) // has id
      { addr.id = arr[1] }

    return addr
  }

  // Build a Symple address from the given peer object.
  Symple.buildAddress = function (peer) {
    return (peer.user ? (peer.user + '|') : '') + (peer.id ? peer.id : '')
  }

  // Return an array of nested objects matching
  // the given key/value strings.
  Symple.filterObject = function (obj, key, value) { // (Object[, String, String])
    var r = []
    for (var k in obj) {
      if (obj.hasOwnProperty(k)) {
        var v = obj[k]
        if ((!key || k === key) && (!value || v === value)) {
          r.push(obj)
        } else if (typeof v === 'object') {
          var a = Symple.filterObject(v, key, value)
          if (a) r = r.concat(a)
        }
      }
    }
    return r
  }

  // Delete nested objects with properties that match the given key/value strings.
  Symple.deleteNested = function (obj, key, value) { // (Object[, String, String])
    for (var k in obj) {
      var v = obj[k]
      if ((!key || k === key) && (!value || v === value)) {
        delete obj[k]
      } else if (typeof v === 'object') {
        Symple.deleteNested(v, key)
      }
    }
  }

  // Count nested object properties that match the given key/value strings.
  Symple.countNested = function (obj, key, value, count) {
    if (count === undefined) count = 0
    for (var k in obj) {
      if (obj.hasOwnProperty(k)) {
        var v = obj[k]
        if ((!key || k === key) && (!value || v === value)) {
          count++
        } else if (typeof (v) === 'object') {
          // else if (v instanceof Object) {
          count = Symple.countNested(v, key, value, count)
        }
      }
    }
    return count
  }

  // Traverse an objects nested properties
  Symple.traverse = function (obj, fn) { // (Object, Function)
    for (var k in obj) {
      if (obj.hasOwnProperty(k)) {
        var v = obj[k]
        fn(k, v)
        if (typeof v === 'object') { Symple.traverse(v, fn) }
      }
    }
  }

  // Generate a random string
  Symple.randomString = function (n) {
    return Math.random().toString(36).slice(2) // Math.random().toString(36).substring(n || 7)
  }

  // Recursively merge object properties of r into l
  Symple.merge = function (l, r) { // (Object, Object)
    for (var p in r) {
      try {
        // Property in destination object set; update its value.
        // if (typeof r[p] === "object") {
        if (r[p].constructor === Object) {
          l[p] = merge(l[p], r[p])
        } else {
          l[p] = r[p]
        }
      } catch (e) {
        // Property in destination object not set;
        // create it and set its value.
        l[p] = r[p]
      }
    }
    return l
  }

  // Object extend functionality
  Symple.extend = function () {
    var process = function (destination, source) {
      for (var key in source) {
        if (hasOwnProperty.call(source, key)) {
          destination[key] = source[key]
        }
      }
      return destination
    }
    var result = arguments[0]
    for (var i = 1; i < arguments.length; i++) {
      result = process(result, arguments[i])
    }
    return result
  }

  // Run a vendor prefixed method from W3C standard method.
  Symple.runVendorMethod = function (obj, method) {
    var p = 0, m, t, pfx = ['webkit', 'moz', 'ms', 'o', '']
    while (p < pfx.length && !obj[m]) {
      m = method
      if (pfx[p] === '') {
        m = m.substr(0, 1).toLowerCase() + m.substr(1)
      }
      m = pfx[p] + m
      t = typeof obj[m]
      if (t !== 'undefined') {
        pfx = [pfx[p]]
        return (t === 'function' ? obj[m]() : obj[m])
      }
      p++
    }
  }

  // Date parsing for ISO 8601
  // Based on https://github.com/csnover/js-iso8601
  //
  // Parses dates like:
  // 2001-02-03T04:05:06.007+06:30
  // 2001-02-03T04:05:06.007Z
  // 2001-02-03T04:05:06Z
  Symple.parseISODate = function (date) { // (String)
    // ISO8601 dates were introduced with ECMAScript v5,
    // try to parse it natively first...
    var timestamp = Date.parse(date)
    if (isNaN(timestamp)) {
      var struct,
        minutesOffset = 0,
        numericKeys = [ 1, 4, 5, 6, 7, 10, 11 ]

      // ES5 §15.9.4.2 states that the string should attempt to be parsed as a Date
      // Time String Format string before falling back to any implementation-specific
      // date parsing, so that's what we do, even if native implementations could be faster
      //
      //              1 YYYY                2 MM       3 DD           4 HH    5 mm       6 ss        7 msec        8 Z 9 ±    10 tzHH    11 tzmm
      if ((struct = /^(\d{4}|[+\-]\d{6})(?:-(\d{2})(?:-(\d{2}))?)?(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{3}))?)?(?:(Z)|([+\-])(\d{2})(?::(\d{2}))?)?)?$/.exec(date))) {
        // Avoid NaN timestamps caused by "undefined" values being passed to Date.UTC
        for (var i = 0, k; (k = numericKeys[i]); ++i) { struct[k] = +struct[k] || 0 }

        // Allow undefined days and months
        struct[2] = (+struct[2] || 1) - 1
        struct[3] = +struct[3] || 1

        if (struct[8] !== 'Z' && struct[9] !== undefined) {
          minutesOffset = struct[10] * 60 + struct[11]
          if (struct[9] === '+') { minutesOffset = 0 - minutesOffset }
        }

        timestamp = Date.UTC(struct[1], struct[2], struct[3], struct[4], struct[5] + minutesOffset, struct[6], struct[7])
      }
    }

    return new Date(timestamp)
  }

  Symple.isMobileDevice = function () {
    return 'ontouchstart' in document.documentElement
  }

  // Returns the current iOS version, or false if not iOS
  Symple.iOSVersion = function (l, r) {
    return parseFloat(('' + (/CPU.*OS ([0-9_]{1,5})|(CPU like).*AppleWebKit.*Mobile/i.exec(navigator.userAgent) || [0, ''])[1])
            .replace('undefined', '3_2').replace('_', '.').replace('_', '')) || false
  }

  // Match the object properties of l with r
  Symple.match = function (l, r) { // (Object, Object)
    var res = true
    for (var prop in l) {
      if (!l.hasOwnProperty(prop) ||
                !r.hasOwnProperty(prop) ||
                r[prop] !== l[prop]) {
        res = false
        break
      }
    }
    return res
  }

  Symple.formatTime = function (date) {
    function pad (n) { return n < 10 ? ('0' + n) : n }
    return pad(date.getHours()).toString() + ':' +
            pad(date.getMinutes()).toString() + ':' +
            pad(date.getSeconds()).toString() + ' ' +
            pad(date.getDate()).toString() + '/' +
            pad(date.getMonth()).toString()
  }

  // Return true if the DOM element has the specified class.
  Symple.hasClass = function (element, className) {
    return (' ' + element.className + ' ').indexOf(' ' + className + ' ') !== -1
  }

  // Debug logger
  Symple.log = function () {
    if (typeof console !== 'undefined' &&
        typeof console.log !== 'undefined') {
      console.log.apply(console, arguments)
    }
  }

  // -------------------------------------------------------------------------
  // Symple OOP Base Class
  //
  var initializing = false,
    fnTest = /xyz/.test(function () { xyz }) ? /\b_super\b/ : /.*/

  // The base Class implementation (does nothing)
  Symple.Class = function () {}

  // Create a new Class that inherits from this class
  Symple.Class.extend = function (prop) {
    var _super = this.prototype

    // Instantiate a base class (but only create the instance,
    // don't run the init constructor)
    initializing = true
    var prototype = new this()
    initializing = false

    // Copy the properties over onto the new prototype
    for (var name in prop) {
      // Check if we're overwriting an existing function
      prototype[name] = typeof prop[name] === 'function' &&
                typeof _super[name] === 'function' && fnTest.test(prop[name])
                ? (function (name, fn) {
                  return function () {
                    var tmp = this._super

                    // Add a new ._super() method that is the same method
                    // but on the super-class
                    this._super = _super[name]

                    // The method only need to be bound temporarily, so we
                    // remove it when we're done executing
                    var ret = fn.apply(this, arguments)
                    this._super = tmp

                    return ret
                  }
                })(name, prop[name])
                : prop[name]
    }

    // The dummy class constructor
    function Class () {
      // All construction is actually done in the init method
      if (!initializing && this.init) { this.init.apply(this, arguments) }
    }

    // Populate our constructed prototype object
    Class.prototype = prototype

    // Enforce the constructor to be what we expect
    Class.prototype.constructor = Class

    // And make this class extendable
    Class.extend = arguments.callee

    return Class
  }

  // -------------------------------------------------------------------------
  // Emitter
  //
  Symple.Emitter = Symple.Class.extend({
    init: function () {
      this.listeners = {}
    },

    on: function (event, fn) {
      if (typeof this.listeners[event] === 'undefined') { this.listeners[event] = [] }
      if (typeof fn !== 'undefined' && fn.constructor === Function) { this.listeners[event].push(fn) }
    },

    clear: function (event, fn) {
      if (typeof this.listeners[event] !== 'undefined') {
        for (var i = 0; i < this.listeners[event].length; i++) {
          if (this.listeners[event][i] === fn) {
            this.listeners[event].splice(i, 1)
          }
        }
      }
    },

    emit: function () {
      // Symple.log('Emitting: ', arguments);
      var event = arguments[0]
      var args = Array.prototype.slice.call(arguments, 1)
      if (typeof this.listeners[event] !== 'undefined') {
        for (var i = 0; i < this.listeners[event].length; i++) {
          // Symple.log('Emitting: Function: ', this.listeners[event][i]);
          if (this.listeners[event][i].constructor === Function) {
            this.listeners[event][i].apply(this, args)
          }
        }
      }
    }
  })

  // -------------------------------------------------------------------------
  // Manager
  //
  Symple.Manager = Symple.Class.extend({
    init: function (options) {
      this.options = options || {}
      this.key = this.options.key || 'id'
      this.store = []
    },

    add: function (value) {
      this.store.push(value)
    },

    remove: function (key) {
      var res = null
      for (var i = 0; i < this.store.length; i++) {
        if (this.store[i][this.key] === key) {
          res = this.store[i]
          this.store.splice(i, 1)
          break
        }
      }
      return res
    },

    get: function (key) {
      for (var i = 0; i < this.store.length; i++) {
        if (this.store[i][this.key] === key) {
          return this.store[i]
        }
      }
      return null
    },

    find: function (params) {
      var res = []
      for (var i = 0; i < this.store.length; i++) {
        if (Symple.match(params, this.store[i])) {
          res.push(this.store[i])
        }
      }
      return res
    },

    findOne: function (params) {
      var res = this.find(params)
      return res.length ? res[0] : undefined
    },

    last: function () {
      return this.store[this.store.length - 1]
    },

    size: function () {
      return this.store.length
    }
  })
// })(window.Symple = window.Symple || {})


/**
 * Module exports.
 */

module.exports = Symple;
;
const Symple = require('./symple');
const { io } = require('socket.io-client');

// (function (S) {
  // Symple client class
  Symple.Client = Symple.Emitter.extend({
    init: function (options) {
      this.options = Symple.extend({
        url: options.url ? options.url : 'http://localhost:4000',
        secure: !!(options.url && (options.url.indexOf('https') === 0 ||
                                   options.url.indexOf('wss') === 0)),
        token: undefined, // pre-arranged server session token
        peer: {}
      }, options)
      this._super()
      this.options.auth = Symple.extend({
        token: this.options.token || '',
        user: this.options.peer.user || '',
        name: this.options.peer.name || '',
        type: this.options.peer.type || ''
      }, this.options.auth)
      this.peer = options.peer // Symple.extend(this.options.auth, options.peer)
      this.peer.rooms = this.peer.rooms || []
      // delete this.peer.token
      this.roster = new Symple.Roster(this)
      this.socket = null
    },

    // Connects and authenticates on the server.
    // If the server is down the 'error' event will fire.
    connect: function () {
      Symple.log('symple:client: connecting', this.options)
      var self = this
      if (this.socket) { throw 'The client socket is not null' }

      // var io = io || window.io
      // console.log(io)
      // this.options.auth || {}
      // this.options.auth.user = this.peer.user
      // this.options.auth.token = this.options.token

      this.socket = io.connect(this.options.url, this.options)
      this.socket.on('connect', function () {
        Symple.log('symple:client: connected')
        // self.socket.emit('announce', {
        //   token: self.options.token || '',
        //   user: self.peer.user || '',
        //   name: self.peer.name || '',
        //   type: self.peer.type || ''
        // }, function (res) {
          // Symple.log('symple:client: announced', res)
          // if (res.status !== 200) {
          //   self.setError('auth', res)
          //   return
          // }
          // self.peer = Symple.extend(self.peer, res.data)
          // self.roster.add(res.data)
          self.peer.id = self.socket.id
          self.peer.online = true
          self.roster.add(self.peer)
          self.sendPresence({ probe: true })
          self.emit('connect')
          self.socket.on('message', function (m) {
            Symple.log('symple:client: receive', m);
            if (typeof (m) === 'object') {
              switch (m.type) {
                case 'message':
                  m = new Symple.Message(m)
                  break
                case 'command':
                  m = new Symple.Command(m)
                  break
                case 'event':
                  m = new Symple.Event(m)
                  break
                case 'presence':
                  m = new Symple.Presence(m)
                  if (m.data.online) {
                    self.roster.update(m.data)
                  } else {
                    setTimeout(function () { // remove after timeout
                      self.roster.remove(m.data.id)
                    })
                  }
                  if (m.probe) {
                    self.sendPresence(new Symple.Presence({
                      to: Symple.parseAddress(m.from).id
                    }))
                  }
                  break
                default:
                  m.type = m.type || 'message'
                  break
              }

              if (typeof (m.from) !== 'string') {
                Symple.log('symple:client: invalid sender address', m)
                return
              }

              // Replace the from attribute with the full peer object.
              // This will only work for peer messages, not server messages.
              var rpeer = self.roster.get(m.from)
              if (rpeer) {
                m.from = rpeer
              } else {
                Symple.log('symple:client: got message from unknown peer', m)
              }

              // Dispatch to the application
              self.emit(m.type, m)
            }
          })
        // })
      })
      this.socket.on('error', function () {
        // This is triggered when any transport fails,
        // so not necessarily fatal.
        self.emit('connect')
      })
      this.socket.on('connecting', function () {
        Symple.log('symple:client: connecting')
        self.emit('connecting')
      })
      this.socket.on('reconnecting', function () {
        Symple.log('symple:client: reconnecting')
        self.emit('reconnecting')
      })
      this.socket.on('connect_error', (err) => {
        // Called when authentication middleware fails
        self.emit('connect_error')
        self.setError('auth', err.message)
        Symple.log('symple:client: connect error', err)
      })
      this.socket.on('connect_failed', function () {
        // Called when all transports fail
        Symple.log('symple:client: connect failed')
        self.emit('connect_failed')
        self.setError('connect')
      })
      this.socket.on('disconnect', function () {
        Symple.log('symple:client: disconnect')
        self.peer.online = false
        self.emit('disconnect')
      })
    },

    // Disconnect from the server
    disconnect: function () {
      if (this.socket) { this.socket.disconnect() }
    },

    // Return the online status
    online: function () {
      return this.peer.online
    },

    // Join a room
    join: function (room) {
      this.socket.emit('join', room)
    },

    // Leave a room
    leave: function (room) {
      this.socket.emit('leave', room)
    },

    // Send a message to the given peer
    send: function (m, to) {
      // Symple.log('symple:client: before send', m, to);
      if (!this.online()) { throw 'Cannot send messages while offline' } // add to pending queue?
      if (typeof (m) !== 'object') { throw 'Message must be an object' }
      if (typeof (m.type) !== 'string') { m.type = 'message' }
      if (!m.id) { m.id = Symple.randomString(8) }
      if (to) { m.to = to }
      if (m.to && typeof (m.to) === 'object') { m.to = Symple.buildAddress(m.to) }
      if (m.to && typeof (m.to) !== 'string') { throw 'Message `to` attribute must be an address string' }
      m.from = Symple.buildAddress(this.peer)
      if (m.from === m.to) { throw 'Message sender cannot match the recipient' }

      Symple.log('symple:client: sending', m)
      this.socket.emit('message', m)
      // this.socket.json.send(m)
    },

    respond: function (m) {
      this.send(m, m.from)
    },

    sendMessage: function (m, to) {
      this.send(m, to)
    },

    sendPresence: function (p) {
      p = p || {}
      if (p.data) { p.data = Symple.merge(this.peer, p.data) } else { p.data = this.peer }
      this.send(new Symple.Presence(p))
    },

    sendCommand: function (c, to, fn, once) {
      var self = this
      c = new Symple.Command(c, to)
      this.send(c)
      if (fn) {
        this.onResponse('command', {
          id: c.id
        }, fn, function (res) {
          // NOTE: 202 (Accepted) and 406 (Not acceptable) response codes
          // signal that the command has not yet completed.
          if (once || (res.status !== 202 &&
                       res.status !== 406)) {
            self.clear('command', fn)
          }
        })
      }
    },

    // Adds a capability for our current peer
    addCapability: function (name, value) {
      var peer = this.peer
      if (peer) {
        if (typeof value === 'undefined') { value = true }
        if (typeof peer.capabilities === 'undefined') { peer.capabilities = {} }
        peer.capabilities[name] = value
        // var idx = peer.capabilities.indexOf(name);
        // if (idx === -1) {
        //    peer.capabilities.push(name);
        //    this.sendPresence();
        // }
      }
    },

    // Removes a capability from our current peer
    removeCapability: function (name) {
      var peer = this.peer
      if (peer && typeof peer.capabilities !== 'undefined' &&
                typeof peer.capabilities[name] !== 'undefined') {
        delete peer.capabilities[key]
        this.sendPresence()
        // var idx = peer.capabilities.indexOf(name)
        // if (idx !== -1) {
        //    peer.capabilities.pop(name);
        //    this.sendPresence();
        // }
      }
    },

    // Checks if a peer has a specific capbility and returns a boolean
    hasCapability: function (id, name) {
      var peer = this.roster.get(id)
      if (peer) {
        if (typeof peer.capabilities !== 'undefined' &&
                    typeof peer.capabilities[name] !== 'undefined') { return peer.capabilities[name] !== false }
        if (typeof peer.data !== 'undefined' &&
                    typeof peer.data.capabilities !== 'undefined' &&
                    typeof peer.data.capabilities[name] !== 'undefined') { return peer.data.capabilities[name] !== false }
      }
      return false
    },

    // Checks if a peer has a specific capbility and returns the value
    getCapability: function (id, name) {
      var peer = this.roster.get(id)
      if (peer) {
        if (typeof peer.capabilities !== 'undefined' &&
                    typeof peer.capabilities[name] !== 'undefined') { return peer.capabilities[name] }
        if (typeof peer.data !== 'undefined' &&
                    typeof peer.data.capabilities !== 'undefined' &&
                    typeof peer.data.capabilities[name] !== 'undefined') { return peer.data.capabilities[name] }
      }
      return undefined
    },

    // Sets the client to an error state and disconnect
    setError: function (error, message) {
      Symple.log('symple:client: fatal error', error, message)
      // if (this.error === error)
      //    return;
      // this.error = error;
      this.emit('error', error, message)
      if (this.socket) { this.socket.disconnect() }
    },

    onResponse: function (event, filters, fn, after) {
      if (typeof this.listeners[event] === 'undefined') { this.listeners[event] = [] }
      if (typeof fn !== 'undefined' && fn.constructor === Function) {
        this.listeners[event].push({
          fn: fn,             // data callback function
          after: after,       // after data callback function
          filters: filters    // event filter object for matching response
        })
      }
    },

    clear: function (event, fn) {
      Symple.log('symple:client: clearing callback', event)
      if (typeof this.listeners[event] !== 'undefined') {
        for (var i = 0; i < this.listeners[event].length; i++) {
          if (this.listeners[event][i].fn === fn &&
            String(this.listeners[event][i].fn) === String(fn)) {
            this.listeners[event].splice(i, 1)
            Symple.log('symple:client: cleared callback', event)
          }
        }
      }
    },

    // Extended emit function to handle filtered message response
    // callbacks first, and then standard events.
    emit: function () {
      if (!this.emitResponse.apply(this, arguments)) {
        this._super.apply(this, arguments)
      }
    },

    // Emit function for handling filtered message response callbacks.
    emitResponse: function () {
      var event = arguments[0]
      var data = Array.prototype.slice.call(arguments, 1)
      if (typeof this.listeners[event] !== 'undefined') {
        for (var i = 0; i < this.listeners[event].length; i++) {
          if (typeof this.listeners[event][i] === 'object' &&
                        this.listeners[event][i].filters !== 'undefined' &&
                        Symple.match(this.listeners[event][i].filters, data[0])) {
            this.listeners[event][i].fn.apply(this, data)
            if (this.listeners[event][i].after !== 'undefined') {
              this.listeners[event][i].after.apply(this, data)
            }
            return true
          }
        }
      }
      return false
    }

    // getPeers: function(fn) {
    //     var self = this;
    //     this.socket.emit('peers', function(res) {
    //         Symple.log('Peers: ', res);
    //         if (typeof(res) !== 'object')
    //             for (var peer in res)
    //                 self.roster.update(peer);
    //         if (fn)
    //             fn(res);
    //     });
    // }
  })

  // -------------------------------------------------------------------------
  // Symple Roster
  //
  Symple.Roster = Symple.Manager.extend({
    init: function (client) {
      this._super()
      this.client = client
    },

    // Add a peer object to the roster
    add: function (peer) {
      Symple.log('symple:roster: adding', peer)
      if (!peer || !peer.id || !peer.user) { throw 'Cannot add invalid peer' }
      this._super(peer)
      this.client.emit('addPeer', peer)
    },

    // Remove the peer matching an ID or address string: user|id
    remove: function (id) {
      id = Symple.parseAddress(id).id || id
      var peer = this._super(id)
      Symple.log('symple:roster: removing', id, peer)
      if (peer) { this.client.emit('removePeer', peer) }
      return peer
    },

    // Get the peer matching an ID or address string: user|id
    get: function (id) {
      // Handle IDs
      peer = this._super(id) // id = Symple.parseIDFromAddress(id) || id;
      if (peer) { return peer }

      // Handle address strings
      return this.findOne(Symple.parseAddress(id))
    },

    update: function (data) {
      if (!data || !data.id) { return }
      var peer = this.get(data.id)
      if (peer) {
        for (var key in data) { peer[key] = data[key] }
      } else { this.add(data) }
    }

    // Get the peer matching an address string: user|id
    // getForAddr: function(addr) {
    //    var o = Symple.parseAddress(addr);
    //    if (o && o.id)
    //        return this.get(o.id);
    //    return null;
    // }
  })

  // -------------------------------------------------------------------------
  // Message
  //
  Symple.Message = function (json) {
    if (typeof (json) === 'object') { this.fromJSON(json) }
    this.type = 'message'
  }

  Symple.Message.prototype = {
    fromJSON: function (json) {
      for (var key in json) { this[key] = json[key] }
    },

    valid: function () {
      return this['id'] &&
            this['from']
    }
  }

  // -------------------------------------------------------------------------
  // Command
  //
  Symple.Command = function (json) {
    if (typeof (json) === 'object') { this.fromJSON(json) }
    this.type = 'command'
  }

  Symple.Command.prototype = {
    getData: function (name) {
      return this['data'] ? this['data'][name] : null
    },

    params: function () {
      return this['node'].split(':')
    },

    param: function (n) {
      return this.params()[n - 1]
    },

    matches: function (xuser) {
      xparams = xuser.split(':')

      // No match if x params are greater than ours.
      if (xparams.length > this.params().length) { return false }

      for (var i = 0; i < xparams.length; i++) {
        // Wildcard * matches everything until next parameter.
        if (xparams[i] === '*') { continue }
        if (xparams[i] !== this.params()[i]) { return false }
      }

      return true
    },

    fromJSON: function (json) {
      for (var key in json) { this[key] = json[key] }
    },

    valid: function () {
      return this['id'] &&
            this['from'] &&
            this['node']
    }
  }

  // -------------------------------------------------------------------------
  // Presence
  //
  Symple.Presence = function (json) {
    if (typeof (json) === 'object') { this.fromJSON(json) }
    this.type = 'presence'
  }

  Symple.Presence.prototype = {
    fromJSON: function (json) {
      for (var key in json) { this[key] = json[key] }
    },

    valid: function () {
      return this['id'] && this['from']
    }
  }

  // -------------------------------------------------------------------------
  // Event
  //
  Symple.Event = function (json) {
    if (typeof (json) === 'object') { this.fromJSON(json) }
    this.type = 'event'
  }

  Symple.Event.prototype = {
    fromJSON: function (json) {
      for (var key in json) { this[key] = json[key] }
    },

    valid: function () {
      return this['id'] &&
            this['from'] &&
            this.name
    }
  }
// })(window.Symple = window.Symple || {})


/**
 * Module exports.
 */

module.exports = Symple;
