// console.log(Symple)
let queryParams = new URLSearchParams(window.location.search)
// function getSearchParams(k) {
//  var p={};
//  location.search.replace(/[?&]+([^=&]+)=([^&]*)/gi,function(s,k,v){p[k]=v})
//  return k?p[k]:p;
// }


// ----------------------------------------
// L Client

const client = new Symple.Client({
  // url: 'https://chat.mytommy.com',  // Symple server URL [http/https]
  url: 'http://localhost:4500',  // Symple server URL [http/https]
  token: 'someauthtoken',        // An optional pre-arranged session token
  peer: {                        // Peer object contains user information
    name: queryParams.get('name') || 'My Name',           // User display name
    user: queryParams.get('user') || 'myusername',        // User ID
    group: queryParams.get('group') || 'somegroup',       // Peer group/room this user's communication is restricted to

    // Note: The peer object may be extended any custom data, which will
    // automatically be broadcast to other group peers via presence updates.
  }
});

client.on('connect', function() {
  console.log('connect')
  console.log('joining test')
  client.join('test');

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
  if (error == 'auth') {
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

client.connect();
