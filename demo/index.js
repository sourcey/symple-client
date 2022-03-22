var Symple = require('../src/client');

// ----------------------------------------
// L Client

const lclient = new Symple.Client({
  url: 'http://localhost:4500',  // Symple server URL [http/https]
  token: 'someauthtoken',        // An optional pre-arranged session token
  peer: {                        // Peer object contains user information
    name: 'My Name 1',           // User display name
    user: 'myusername1',         // User ID
    group: 'somegroup',          // Peer group/room this user's communication is restricted to

    // Note: The peer object may be extended any custom data, which will
    // automatically be broadcast to other group peers via presence updates.
  }
});

lclient.on('announce', function(peer) {
  console.log('l announce:', peer)

  // The user has successfully authenticated
});

lclient.on('presence', function(p) {
  console.log('l presence:', p)

  // Captures a presence message broadcast by a peer
});

lclient.on('message', function(m) {
  console.log('l message:', m)

  // Captures a message broadcast by a peer
});

lclient.on('command', function(c) {
  console.log('l command:', c)

  // Captures a command send from a remote peer
});

lclient.on('event', function(e) {
  console.log('l event:', e)

  // Captures an event broadcast from a remote peer
});

lclient.on('error', function(error, message) {
  console.log('l connection error:', error, message)

  // Connection or authentication failed
  if (error == 'auth') {
  	// Authentication failed
  }
  else if (error == 'connect') {
  	// Connection failed
  }
});

lclient.on('disconnect', function() {
  console.log('l disconnected')

  // Disconnected from the server
});

lclient.on('addPeer', function(peer) {
  console.log('l add peer:', peer)

  // A peer connected
});

lclient.on('removePeer', function(peer) {
  console.log('l remove peer:', peer)

  // A peer disconnected
});

lclient.connect();


// ----------------------------------------
// L Client

const rclient = new Symple.Client({
  url: 'http://localhost:4500',  // Symple server URL [http/https]
  token: 'someauthtoken2',        // An optional pre-arranged session token
  peer: {                        // Peer object contains user information
    name: 'My Name 2',             // User display name
    user: 'myusername2',          // User ID
    group: 'somegroup',          // Peer group/room this user's communication is restricted to

    // Note: The peer object may be extended any custom data, which will
    // automatically be broadcast to other group peers via presence updates.
  }
});

rclient.on('announce', function(peer) {
  console.log('r announce:', peer)

  // The user has successfully authenticated
});

rclient.on('presence', function(p) {
  console.log('r presence:', p)

  // Captures a presence message broadcast by a peer
});

rclient.on('message', function(m) {
  console.log('r message:', m)

  // Captures a message broadcast by a peer
});

rclient.on('command', function(c) {
  console.log('r command:', c)

  // Captures a command send from a remote peer
});

rclient.on('event', function(e) {
  console.log('r event:', e)

  // Captures an event broadcast from a remote peer
});

rclient.on('error', function(error, message) {
  console.log('r connection error:', error, message)

  // Connection or authentication failed
  if (error == 'auth') {
  	// Authentication failed
  }
  else if (error == 'connect') {
  	// Connection failed
  }
});

rclient.on('disconnect', function() {
  console.log('r disconnected')

  // Disconnected from the server
});

rclient.on('addPeer', function(peer) {
  console.log('r add peer:', peer)

  // A peer connected
});

rclient.on('removePeer', function(peer) {
  console.log('r remove peer:', peer)

  // A peer disconnected
});

rclient.connect();

// (function wait () {
//    if (!SOME_EXIT_CONDITION) setTimeout(wait, 1000);
// })();
