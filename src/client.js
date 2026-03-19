import Symple from './symple.js'
import Emitter from './emitter.js'
import Roster from './roster.js'

export default class SympleClient extends Emitter {
  constructor (options) {
    super()
    this.options = Symple.extend({
      url: options.url ? options.url : 'ws://localhost:4500',
      reconnection: true,
      reconnectionDelay: 3000,
      reconnectionAttempts: 0, // 0 = unlimited
      token: undefined,
      peer: {}
    }, options)
    this.peer = options.peer
    this.peer.rooms = this.peer.rooms || []
    this.roster = new Roster(this)
    this.socket = null
    this._reconnectCount = 0
    this._reconnectTimer = null
    this._closing = false
  }

  // Connect and authenticate on the server.
  connect () {
    Symple.log('symple:client: connect', this.options.url)
    this._closing = false
    this._reconnectCount = 0
    this._doConnect()
  }

  _doConnect () {
    if (this.socket) {
      this.socket.close()
      this.socket = null
    }

    const url = this.options.url.replace(/^http/, 'ws')
    this.socket = new WebSocket(url)

    this.socket.onopen = () => {
      Symple.log('symple:client: websocket open, sending auth')
      // Auth is the first message after WebSocket handshake
      const auth = {
        type: 'auth',
        user: this.options.peer.user || '',
        name: this.options.peer.name || '',
        token: this.options.token || ''
      }
      if (this.options.peer.type) {
        auth.data = { peerType: this.options.peer.type }
      }
      this.socket.send(JSON.stringify(auth))
    }

    this.socket.onmessage = (event) => {
      let msg
      try {
        msg = JSON.parse(event.data)
      } catch (e) {
        Symple.log('symple:client: parse error', e)
        return
      }

      Symple.log('symple:client: receive', msg)

      if (typeof msg !== 'object') return

      // Handle welcome (auth success)
      if (msg.type === 'welcome') {
        this._onWelcome(msg)
        return
      }

      // Handle error from server
      if (msg.type === 'error') {
        Symple.log('symple:client: server error', msg.status, msg.message)
        this.setError('server', msg.message)
        this.emit('error', msg)
        return
      }

      // Handle join/leave acks
      if (msg.type === 'join:ok' || msg.type === 'leave:ok') return

      // Route messages
      this._onMessage(msg)
    }

    this.socket.onclose = (event) => {
      Symple.log('symple:client: websocket closed', event.code, event.reason)
      const wasOnline = this.peer.online
      this.peer.online = false
      this.emit('disconnect')

      if (!this._closing && wasOnline && this.options.reconnection) {
        this._startReconnect()
      }
    }

    this.socket.onerror = (error) => {
      Symple.log('symple:client: websocket error', error)
      this.emit('connect_error', error)
    }
  }

  _onWelcome (msg) {
    if (msg.status !== 200) {
      this.setError('auth', msg.message || 'Auth failed')
      return
    }

    if (!msg.peer || !msg.peer.id) {
      this.setError('auth', 'Invalid welcome: missing peer data')
      return
    }

    this.error = null
    this.peer.id = msg.peer.id
    this.peer.online = true
    this._reconnectCount = 0
    this.roster.add(this.peer)

    Symple.log('symple:client: online as', this.peer.user + '|' + this.peer.id)
    this.emit('connect')

    // Send presence probe on next tick (in case rooms are joined on connect)
    setTimeout(() => {
      this.sendPresence({ probe: true })
    })
  }

  _onMessage (m) {
    switch (m.type) {
      case 'presence':
        if (m.data && m.data.online) {
          this.roster.update(m.data)
        } else if (m.data) {
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
      case 'message':
      case 'command':
      case 'event':
        break
      default:
        m.type = m.type || 'message'
        break
    }

    // Resolve 'from' address to roster peer
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

  // Disconnect from the server.
  disconnect () {
    Symple.log('symple:client: disconnect')
    this._closing = true
    this._clearReconnect()
    if (this.socket) {
      this.socket.close()
    }
  }

  // Disconnect and nullify the socket.
  shutdown () {
    Symple.log('symple:client: shutdown')
    this._closing = true
    this._clearReconnect()
    if (this.socket) {
      this.socket.close()
      this.socket = null
    }
  }

  // Return the online status.
  get online () {
    return !!(this.peer && this.peer.online && this.socket && this.socket.readyState === WebSocket.OPEN)
  }

  // Join a room.
  join (room) {
    if (!this.online) return
    this.socket.send(JSON.stringify({ type: 'join', room }))
  }

  // Leave a room.
  leave (room) {
    if (!this.online) return
    this.socket.send(JSON.stringify({ type: 'leave', room }))
  }

  // Send a message to the given peer.
  send (m, to) {
    if (!this.online) { throw new Error('Cannot send messages while offline') }
    if (typeof m !== 'object') { throw new Error('Message must be an object') }
    if (typeof m.type !== 'string') { m.type = 'message' }
    if (!m.id) { m.id = Symple.randomString(8) }
    if (to) { m.to = to }
    if (m.to && typeof m.to === 'object') { m.to = Symple.buildAddress(m.to) }
    if (m.to && typeof m.to !== 'string') { throw new Error('Message `to` attribute must be an address string') }
    m.from = Symple.buildAddress(this.peer)
    if (m.from === m.to) { throw new Error('Message sender cannot match the recipient') }

    Symple.log('symple:client: sending', m)
    this.socket.send(JSON.stringify(m))
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

  // Reconnection
  _startReconnect () {
    if (this.options.reconnectionAttempts > 0 &&
        this._reconnectCount >= this.options.reconnectionAttempts) {
      Symple.log('symple:client: max reconnect attempts reached')
      return
    }

    this._reconnectCount++
    Symple.log('symple:client: reconnecting (attempt ' + this._reconnectCount + ')')

    this._reconnectTimer = setTimeout(() => {
      this._doConnect()
      this.emit('reconnect_attempt', this._reconnectCount)
    }, this.options.reconnectionDelay)
  }

  _clearReconnect () {
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer)
      this._reconnectTimer = null
    }
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
