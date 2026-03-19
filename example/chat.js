/**
 * Symple chat example
 *
 * 1. Start a Symple server:
 *    cd ../symple-server && npm start
 *
 * 2. Run two instances of this script in separate terminals:
 *    node example/chat.js alice
 *    node example/chat.js bob
 *
 * 3. Type messages — they'll appear in the other terminal.
 */

import SympleClient from '../src/index.js'
import { createInterface } from 'readline'

const user = process.argv[2] || 'user-' + Math.random().toString(36).slice(2, 6)
const room = 'lobby'

const client = new SympleClient({
  url: 'ws://localhost:4500',
  peer: { user, name: user }
})

client.on('connect', () => {
  console.log(`Connected as ${user}. Joining room "${room}"...`)
  client.join(room)

  const rl = createInterface({ input: process.stdin })
  rl.on('line', (line) => {
    if (!line.trim()) return
    client.send({
      type: 'message',
      from: client.peer.address || `${user}|${client.peer.id}`,
      body: line.trim()
    })
  })
})

client.on('message', (m) => {
  if (m.type === 'message' && m.body) {
    const sender = m.from ? m.from.split('|')[0] : 'unknown'
    console.log(`${sender}: ${m.body}`)
  }
})

client.on('addPeer', (peer) => {
  console.log(`* ${peer.name} joined`)
})

client.on('removePeer', (peer) => {
  console.log(`* ${peer.name} left`)
})

client.on('error', (err, msg) => {
  console.error('Error:', err, msg)
})

client.on('disconnect', () => {
  console.log('Disconnected')
})

client.connect()
