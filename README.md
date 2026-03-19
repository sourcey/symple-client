# Symple Client

Realtime messaging and presence client for the [Symple](https://github.com/sourcey/symple-server) protocol over native WebSocket.

Part of the Symple ecosystem:

- **[symple-server](https://github.com/sourcey/symple-server)** - Node.js messaging server
- **[symple-client-ruby](https://github.com/sourcey/symple-client-ruby)** - Ruby/Rails server-side emitter

## Features

- **Connect and authenticate** with a Symple server
- **Peer presence** - online/offline status, capabilities
- **Scoped messaging** - direct, room, or broadcast
- **Dynamic rooms** - join and leave at runtime
- **Roster management** - automatic peer tracking
- **Reconnection** - configurable automatic reconnection
- **Zero dependencies** - uses the native WebSocket API (browser or Node.js 22+)
- **ES modules** - clean ESM imports, tree-shakeable

## Install

```bash
npm install symple-client
```

## Quick Start

```javascript
import SympleClient from 'symple-client'

const client = new SympleClient({
  url: 'ws://localhost:4500',
  peer: {
    user: 'alice',
    name: 'Alice'
  }
})

client.on('connect', () => {
  console.log('Connected as', client.peer.name)

  // Join a room
  client.join('general')

  // Send a message
  client.send({
    type: 'message',
    body: 'Hello everyone!'
  })
})

client.on('message', (m) => {
  console.log('Message from', m.from, ':', m.body)
})

client.on('addPeer', (peer) => {
  console.log('Peer joined:', peer.name)
})

client.on('removePeer', (peer) => {
  console.log('Peer left:', peer.name)
})

client.on('error', (error, message) => {
  console.error('Error:', error, message)
})

client.connect()
```

## Authentication

To use token-based authentication (when the server has `SYMPLE_AUTHENTICATION=true`):

```javascript
const client = new SympleClient({
  url: 'wss://your-server.com',
  token: 'your-session-token',
  peer: {
    user: 'alice',
    name: 'Alice'
  }
})
```

## API

### `new SympleClient(options)`

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `url` | string | `ws://localhost:4500` | Server WebSocket URL |
| `token` | string | - | Authentication token |
| `peer` | object | `{}` | Peer info (`user`, `name`, `type`) |
| `reconnection` | boolean | `true` | Enable automatic reconnection |
| `reconnectionDelay` | number | `3000` | Reconnection delay in ms |
| `reconnectionAttempts` | number | `0` | Max attempts (`0` = unlimited) |

### Methods

| Method | Description |
| --- | --- |
| `connect()` | Connect to the server |
| `disconnect()` | Disconnect from the server |
| `shutdown()` | Disconnect and destroy the socket |
| `send(message, to?)` | Send a message |
| `sendMessage(message, to?)` | Send a typed message |
| `sendPresence(presence?)` | Broadcast presence |
| `join(room)` | Join a room |
| `leave(room)` | Leave a room |
| `addCapability(name, value?)` | Add a peer capability |
| `removeCapability(name)` | Remove a peer capability |
| `hasCapability(peerId, name)` | Check if a peer has a capability |
| `getCapability(peerId, name)` | Get a peer's capability value |

### Events

| Event | Payload | Description |
| --- | --- | --- |
| `connect` | - | Connected and authenticated |
| `disconnect` | - | Disconnected from server |
| `reconnect_attempt` | attempt | Reconnection attempt |
| `connect_error` | error | Connection failed |
| `error` | error, message | Error occurred |
| `message` | message | Message received |
| `presence` | presence | Presence update |
| `command` | command | Command received |
| `event` | event | Event received |
| `addPeer` | peer | Peer joined |
| `removePeer` | peer | Peer left |

### Properties

| Property | Type | Description |
| --- | --- | --- |
| `online` | boolean | Whether the client is connected |
| `peer` | object | The local peer object |
| `roster` | Roster | Connected peers roster |

## Exports

```javascript
// Default export
import SympleClient from 'symple-client'

// Named exports
import { SympleClient, Symple, Emitter, Store, Roster } from 'symple-client'
```

## Debug Logging

Enable debug output:

```javascript
import { Symple } from 'symple-client'
Symple.debug = true
```

## More Information

For more details, visit [sourcey.com/code/symple](https://sourcey.com/code/symple).

## License

MIT
