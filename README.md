# Symple Client

The Symple JavaScript client is a client-side implementation of the Symple protocol that runs in the web browser.

## What is Symple?

Symple is a unrestrictive real time messaging and presence protocol that implements the minimum number of features required to build full fledged messaging applications with security, flexibility, performance and scalability in mind. These features include:

* Session sharing with any backend (via Redis)
* User rostering and presence
* Media streaming (via WebRTC, [see demo](http://symple.sourcey.com))
* Scoped messaging ie. direct, user and group scope
* Real-time commands and events
* Real-time forms

Symple currently has client implementations in [JavaScript](https://github.com/sourcey/symple-client), [Ruby](https://github.com/sourcey/symple-client-ruby) and [C++](https://github.com/sourcey/libsourcey/tree/master/src/symple), which make it ideal for a wide range of messaging requirements, such as building real-time games and applications that run in the web browser, desktop, and mobile phone.

## Installation

```bash
# install the server
npm install symple

# install the client
npm install symple-client
```

## Demo

We've included a fully featured video chat demo using Symple and WebRTC for your hacking pleasure. The source code is located in the [symple-webrtc-video-chat-demo](https://github.com/sourcey/symple-webrtc-video-chat-demo) repository.

You can see it live here: http://symple.sourcey.com

## Usage

The first thing to do is fire up the server:

```bash
cd /path/to/symple/server

node server
```

To use Symple in your app just add the following two scripts into your HTML head, replacing the `src` path with the correct script locations as necessary.

**Note:** [Socket.IO](https://github.com/socketio/socket.io-client) is the only dependency (1.3.7 at the time of writing).

```
  <script type="text/javascript" src="socket.io.js"></script>
  <script type="text/javascript" src="symple.min.js"></script>
```

The next thing is to instantiate the client. The code below should provide you with a solid starting point, and illustrates the available callback API methods:

```javascript
client = new Symple.Client({
  token: 'someauthtoken',        // An optional pre-arranged session token  
  url: 'http://localhost:4500',  // Symple server URL [http/https]  
  peer: {                        // Peer object contains user information  
    name: 'My Name',             // User display name  
    user: 'myusername',          // User ID  
    group: 'somegroup',          // Peer group/room this user's communication is restricted to  

    // Note: The peer object may be extended any custom data, which will  
    // automatically be broadcast to other group peers via presence updates.  
  }
});

client.on('announce', function(peer) {
  console.log('announce:', peer)

  // The user has successfully authenticated
});

client.on('presence', function(p) {
  console.log('presence:', p)

  // Captures a presence message broadcast by a peer
});

client.on('message', function(m) {
  console.log('message:', m)

  // Captures a message broadcast by a peer
});

client.on('command', function(c) {
  console.log('command:', c)

  // Captures a command send from a remote peer
});

client.on('event', function(e) {  
  console.log('event:', e)    

  // Captures an event broadcast from a remote peer
});

client.on('error', function(error, message) {
  console.log('connection error:', error, message)

  // Connection or authentication failed
  if (error == 'connect') {
  	// Authentication failed
  }
  else if (error == 'connect') {
  	// Connection failed
  }
});

client.on('disconnect', function() {
  console.log('disconnected')

  // Disconnected from the server
});

client.on('addPeer', function(peer) {
  console.log('add peer:', peer)  

  // A peer connected       
});

client.on('removePeer', function(peer) {
  console.log('remove peer:', peer)

  // A peer disconnected  
});
```

Now all that's left is to build your awesome app!

## Symple Projects

Node.js server: https://github.com/sourcey/symple-server-node  
JavaScript client: https://github.com/sourcey/symple-client  
JavaScript client player: https://github.com/sourcey/symple-client-player  
Ruby client: https://github.com/sourcey/symple-client-ruby  
C++ client: https://github.com/sourcey/libsourcey/tree/master/src/symple  

## Contributing

1. Fork it
2. Create your feature branch (`git checkout -b my-new-feature`)
3. Commit your changes (`git commit -am 'Add some feature'`)
4. Push to the branch (`git push origin my-new-feature`)
5. Create new Pull Request

## Contact

For more information please check out the Symple homepage: http://sourcey.com/symple/  
For bugs and issues please use the Github issue tracker: https://github.com/sourcey/symple-client/issues
