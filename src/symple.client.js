//
// Symple.Client.js
// Realtime Messaging Client
//
// Copyright (c)2010 Sourcey
// http://sourcey.com
// Distributed under The MIT License.
//
(function (S) {
  // Symple client class
  S.Client = S.Emitter.extend({
    init: function (options) {
      this.options = S.extend({
        url: options.url ? options.url : 'http://localhost:4000',
        secure: !!(options.url && (options.url.indexOf('https') === 0 ||
                                   options.url.indexOf('wss') === 0)),
        token: undefined  // pre-arranged server session token
      }, options)
      this._super()
      this.peer = options.peer || {}
      this.peer.rooms = options.peer.rooms || []
      this.roster = new S.Roster(this)
      this.socket = null
    },

    // Connects and authenticates on the server.
    // If the server is down the 'error' event will fire.
    connect: function () {
      S.log('symple:client: connecting', this.options)
      self = this
      if (this.socket) { throw 'The client socket is not null' }

      var io = io || window.io
      this.socket = io.connect(this.options.url, this.options)
      this.socket.on('connect', function () {
        S.log('symple:client: connected')
        self.socket.emit('announce', {
          token: self.options.token || '',
          user: self.peer.user || '',
          name: self.peer.name || '',
          type: self.peer.type || ''
        }, function (res) {
          S.log('symple:client: announced', res)
          if (res.status !== 200) {
            self.setError('auth', res)
            return
          }
          self.peer = S.extend(self.peer, res.data)
          self.roster.add(res.data)
          self.sendPresence({ probe: true })
          self.emit('announce', res)
          self.socket.on('message', function (m) {
            // S.log('symple:client: receive', m);
            if (typeof (m) === 'object') {
              switch (m.type) {
                case 'message':
                  m = new S.Message(m)
                  break
                case 'command':
                  m = new S.Command(m)
                  break
                case 'event':
                  m = new S.Event(m)
                  break
                case 'presence':
                  m = new S.Presence(m)
                  if (m.data.online) { self.roster.update(m.data) } else {
                    setTimeout(function () { // remove after timeout
                      self.roster.remove(m.data.id)
                    })
                  }
                  if (m.probe) {
                    self.sendPresence(new S.Presence({
                        to: S.parseAddress(m.from).id
                      }))
                  }
                  break
                default:
                  o = m
                  o.type = o.type || 'message'
                  break
              }

              if (typeof (m.from) !== 'string') {
                S.log('symple:client: invalid sender address', m)
                return
              }

              // Replace the from attribute with the full peer object.
              // This will only work for peer messages, not server messages.
              var rpeer = self.roster.get(m.from)
              if (rpeer) { m.from = rpeer } else {
                S.log('symple:client: got message from unknown peer', m)
              }

              // Dispatch to the application
              self.emit(m.type, m)
            }
          })
        })
      })
      this.socket.on('error', function () {
        // This is triggered when any transport fails,
        // so not necessarily fatal.
        self.emit('connect')
      })
      this.socket.on('connecting', function () {
        S.log('symple:client: connecting')
        self.emit('connecting')
      })
      this.socket.on('reconnecting', function () {
        S.log('symple:client: reconnecting')
        self.emit('reconnecting')
      })
      this.socket.on('connect_failed', function () {
                // Called when all transports fail
        S.log('symple:client: connect failed')
        self.emit('connect_failed')
        self.setError('connect')
      })
      this.socket.on('disconnect', function () {
        S.log('symple:client: disconnect')
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
      // S.log('symple:client: before send', m, to);
      if (!this.online()) { throw 'Cannot send messages while offline' } // add to pending queue?
      if (typeof (m) !== 'object') { throw 'Message must be an object' }
      if (typeof (m.type) !== 'string') { m.type = 'message' }
      if (!m.id) { m.id = S.randomString(8) }
      if (to) { m.to = to }
      if (m.to && typeof (m.to) === 'object') { m.to = S.buildAddress(m.to) }
      if (m.to && typeof (m.to) !== 'string') { throw 'Message `to` attribute must be an address string' }
      m.from = S.buildAddress(this.peer)
      if (m.from === m.to) { throw 'Message sender cannot match the recipient' }

      S.log('symple:client: sending', m)
      this.socket.json.send(m)
    },

    respond: function (m) {
      this.send(m, m.from)
    },

    sendMessage: function (m, to) {
      this.send(m, to)
    },

    sendPresence: function (p) {
      p = p || {}
      if (p.data) { p.data = S.merge(this.peer, p.data) } else { p.data = this.peer }
      this.send(new S.Presence(p))
    },

    sendCommand: function (c, to, fn, once) {
      var self = this
      c = new S.Command(c, to)
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
      S.log('symple:client: fatal error', error, message)
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
      S.log('symple:client: clearing callback', event)
      if (typeof this.listeners[event] !== 'undefined') {
        for (var i = 0; i < this.listeners[event].length; i++) {
          if (this.listeners[event][i].fn === fn &&
            String(this.listeners[event][i].fn) === String(fn)) {
            this.listeners[event].splice(i, 1)
            S.log('symple:client: cleared callback', event)
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
                        S.match(this.listeners[event][i].filters, data[0])) {
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
    //     self = this;
    //     this.socket.emit('peers', function(res) {
    //         S.log('Peers: ', res);
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
  S.Roster = S.Manager.extend({
    init: function (client) {
      this._super()
      this.client = client
    },

    // Add a peer object to the roster
    add: function (peer) {
      S.log('symple:roster: adding', peer)
      if (!peer || !peer.id || !peer.user) { throw 'Cannot add invalid peer' }
      this._super(peer)
      this.client.emit('addPeer', peer)
    },

    // Remove the peer matching an ID or address string: user|id
    remove: function (id) {
      id = S.parseAddress(id).id || id
      var peer = this._super(id)
      S.log('symple:roster: removing', id, peer)
      if (peer) { this.client.emit('removePeer', peer) }
      return peer
    },

    // Get the peer matching an ID or address string: user|id
    get: function (id) {
      // Handle IDs
      peer = this._super(id) // id = S.parseIDFromAddress(id) || id;
      if (peer) { return peer }

      // Handle address strings
      return this.findOne(S.parseAddress(id))
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
    //    var o = S.parseAddress(addr);
    //    if (o && o.id)
    //        return this.get(o.id);
    //    return null;
    // }
  })

  // -------------------------------------------------------------------------
  // Message
  //
  S.Message = function (json) {
    if (typeof (json) === 'object') { this.fromJSON(json) }
    this.type = 'message'
  }

  S.Message.prototype = {
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
  S.Command = function (json) {
    if (typeof (json) === 'object') { this.fromJSON(json) }
    this.type = 'command'
  }

  S.Command.prototype = {
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
  S.Presence = function (json) {
    if (typeof (json) === 'object') { this.fromJSON(json) }
    this.type = 'presence'
  }

  S.Presence.prototype = {
    fromJSON: function (json) {
      for (var key in json) { this[key] = json[key] }
    },

    valid: function () {
      return this['id'] &&
            this['from']
    }
  }

  // -------------------------------------------------------------------------
  // Event
  //
  S.Event = function (json) {
    if (typeof (json) === 'object') { this.fromJSON(json) }
    this.type = 'event'
  }

  S.Event.prototype = {
    fromJSON: function (json) {
      for (var key in json) { this[key] = json[key] }
    },

    valid: function () {
      return this['id'] &&
            this['from'] &&
            this.name
    }
  }
})(window.Symple = window.Symple || {})
