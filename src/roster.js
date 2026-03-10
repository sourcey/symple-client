import Symple from './symple.js'
import Store from './store.js'

export default class Roster extends Store {
  constructor (client) {
    super()
    this.client = client
  }

  // Add a peer object to the roster.
  add (peer) {
    Symple.log('symple:roster: adding', peer)
    if (!peer || !peer.id || !peer.user) { throw 'Cannot add invalid peer' }
    super.add(peer)
    this.client.emit('addPeer', peer)
  }

  // Remove the peer matching an ID or address string: user|id
  remove (id) {
    id = Symple.parseAddress(id).id || id
    const peer = super.remove(id)
    Symple.log('symple:roster: removing', id, peer)
    if (peer) { this.client.emit('removePeer', peer) }
    return peer
  }

  // Get the peer matching an ID or address string: user|id
  get (id) {
    const peer = super.get(id)
    if (peer) { return peer }

    // Handle address strings
    return this.findOne(Symple.parseAddress(id))
  }

  // Update a peer or add it if not found.
  update (data) {
    if (!data || !data.id) { return }
    const peer = this.get(data.id)
    if (peer) {
      for (const key in data) { peer[key] = data[key] }
    } else {
      this.add(data)
    }
  }
}
