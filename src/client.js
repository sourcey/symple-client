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
