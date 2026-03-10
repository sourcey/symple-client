import { io } from 'socket.io-client'
import Symple from './symple.js'
import Emitter from './emitter.js'
import Roster from './roster.js'

export default class SympleClient extends Emitter {
  constructor (options) {
    super()
    this.options = Symple.extend({
      url: options.url ? options.url : 'http://localhost:4500',
      secure: !!(options.url && (options.url.indexOf('https') === 0 ||
                                 options.url.indexOf('wss') === 0)),
      reconnectionDelay: 3000,
      token: undefined,
      peer: {}
    }, options)
    this.options.auth = Symple.extend({
      token: this.options.token || '',
      user: this.options.peer.user || '',
      name: this.options.peer.name || '',
      type: this.options.peer.type || ''
    }, this.options.auth)
    this.peer = options.peer
    this.peer.rooms = this.peer.rooms || []
    this.roster = new Roster(this)
    this.socket = null
  }

  // Connect and authenticate on the server.
  connect () {
    Symple.log('symple:client: connect', this.options)

    if (!this.socket) {
      this.socket = io.connect(this.options.url, this.options)
      this.bind()
    } else if (!this.online) {
      // Ensure auth is set for reconnection
      if (!this.socket.auth || !this.socket.auth.token) {
        this.socket.auth = this.options.auth
      }
      this.socket.connect()
    } else {
      Symple.log('symple:client: already connected')
    }
  }

  bind () {
    if (!this.socket) { throw 'The client socket must be initialized' }

    this.socket.on('connect', () => {
      Symple.log('symple:client: connected')
      this.error = null
      this.peer.id = this.socket.id
      this.peer.online = true
      this.roster.add(this.peer)
      setTimeout(() => {
        this.sendPresence({ probe: true })
      }) // next tick in case rooms are joined on connect
      this.emit('connect')
    })

    this.socket.on('message', (m) => {
      Symple.log('symple:client: receive', m)
      if (typeof m === 'object') {
        switch (m.type) {
          case 'message':
            break
          case 'command':
            break
          case 'event':
            break
          case 'presence':
            if (m.data.online) {
              this.roster.update(m.data)
            } else {
              setTimeout(() => {
                this.roster.remove(m.data.id)
              })
            }
            if (m.probe) {
              this.sendPresence({
                to: Symple.parseAddress(m.from).id
              })
            }
            break
          default:
            m.type = m.type || 'message'
            break
        }

        if (typeof m.from === 'string') {
          const rpeer = this.roster.get(m.from)
          if (rpeer) {
            m.from = rpeer
          } else {
            Symple.log('symple:client: got message from unknown peer', m)
          }
        }

        // Dispatch to the application
        this.emit(m.type, m)
      }
    })

    this.socket.on('connect_error', (error) => {
      this.emit('connect_error')
      this.setError('connect', error.message)
      Symple.log('symple:client: connect error', error)
    })

    this.socket.on('disconnect', (reason) => {
      Symple.log('symple:client: disconnect', reason)
      this.peer.online = false
      this.emit('disconnect')
    })

    // Manager events
    this.socket.io.on('reconnect', (attempt) => {
      Symple.log('symple:client: reconnect', attempt)
      this.emit('reconnect')
    })

    this.socket.io.on('reconnect_attempt', (attempt) => {
      Symple.log('symple:client: reconnect_attempt', attempt)
    })

    this.socket.io.on('reconnect_error', (error) => {
      Symple.log('symple:client: reconnect_error', error)
    })

    this.socket.io.on('error', (error) => {
      this.emit('error', error)
    })
  }

  // Disconnect from the server.
  disconnect () {
    Symple.log('symple:client: disconnect')
    if (this.socket) {
      this.socket.disconnect()
    }
  }

  // Disconnect and nullify the socket.
  shutdown () {
    Symple.log('symple:client: shutdown')
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  // Return the online status.
  get online () {
    return !!this.socket?.connected
  }

  // Join a room.
  join (room) {
    this.socket.emit('join', room)
  }

  // Leave a room.
  leave (room) {
    this.socket.emit('leave', room)
  }

  // Send a message to the given peer.
  send (m, to) {
    if (!this.online) { throw 'Cannot send messages while offline' }
    if (typeof m !== 'object') { throw 'Message must be an object' }
    if (typeof m.type !== 'string') { m.type = 'message' }
    if (!m.id) { m.id = Symple.randomString(8) }
    if (to) { m.to = to }
    if (m.to && typeof m.to === 'object') { m.to = Symple.buildAddress(m.to) }
    if (m.to && typeof m.to !== 'string') { throw 'Message `to` attribute must be an address string' }
    m.from = Symple.buildAddress(this.peer)
    if (m.from === m.to) { throw 'Message sender cannot match the recipient' }

    Symple.log('symple:client: sending', m)
    this.socket.emit('message', m)
  }

  // Send a response to a received message.
  respond (m) {
    this.send(m, m.from)
  }

  // Send a message with type 'message'.
  sendMessage (m, to) {
    m.type = 'message'
    this.send(m, to)
  }

  // Broadcast presence to peers.
  sendPresence (p) {
    p = p || {}
    p.type = 'presence'
    if (p.data) {
      p.data = Symple.merge(p.data, this.peer)
    } else {
      p.data = this.peer
    }
    this.send(p)
  }

  // Add a capability for the current peer.
  addCapability (name, value) {
    if (typeof value === 'undefined') { value = true }
    if (typeof this.peer.capabilities === 'undefined') { this.peer.capabilities = {} }
    this.peer.capabilities[name] = value
  }

  // Remove a capability from the current peer.
  removeCapability (name) {
    if (this.peer.capabilities && typeof this.peer.capabilities[name] !== 'undefined') {
      delete this.peer.capabilities[name]
      this.sendPresence()
    }
  }

  // Check if a peer has a specific capability.
  hasCapability (id, name) {
    const peer = this.roster.get(id)
    if (peer && peer.capabilities && typeof peer.capabilities[name] !== 'undefined') {
      return peer.capabilities[name] !== false
    }
    return false
  }

  // Get the value of a peer's capability.
  getCapability (id, name) {
    const peer = this.roster.get(id)
    if (peer && peer.capabilities && typeof peer.capabilities[name] !== 'undefined') {
      return peer.capabilities[name]
    }
    return undefined
  }

  // Set the client to an error state.
  setError (error, message) {
    Symple.log('symple:client: fatal error', error, message)
    if (this.error === error) return
    this.error = error
    this.emit('error', error, message)
  }

  // Register a filtered response handler.
  onResponse (event, filters, fn, after) {
    if (typeof this.listeners[event] === 'undefined') {
      this.listeners[event] = []
    }
    if (typeof fn !== 'undefined' && fn.constructor === Function) {
      this.listeners[event].push({
        fn: fn,
        after: after,
        filters: filters
      })
    }
  }

  // Clear a specific response callback.
  clear (event, fn) {
    Symple.log('symple:client: clearing callback', event)
    if (typeof this.listeners[event] !== 'undefined') {
      for (let i = 0; i < this.listeners[event].length; i++) {
        if (this.listeners[event][i].fn === fn &&
          String(this.listeners[event][i].fn) === String(fn)) {
          this.listeners[event].splice(i, 1)
          Symple.log('symple:client: cleared callback', event)
        }
      }
    }
  }

  // Extended emit to handle filtered response callbacks first.
  emit () {
    if (!this.emitFiltered.apply(this, arguments)) {
      super.emit.apply(this, arguments)
    }
  }

  // Emit function for handling filtered message response callbacks.
  emitFiltered () {
    const event = arguments[0]
    const data = Array.prototype.slice.call(arguments, 1)
    if (typeof this.listeners[event] !== 'undefined') {
      for (let i = 0; i < this.listeners[event].length; i++) {
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
}
