// console.log(Symple)
let queryParams = new URLSearchParams(window.location.search)
// function getSearchParams(k) {
//  var p={};
//  location.search.replace(/[?&]+([^=&]+)=([^&]*)/gi,function(s,k,v){p[k]=v})
//  return k?p[k]:p;
// }


// ----------------------------------------
// L Client

const lclient = new Symple.Client({
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

lclient.on('connect', function(peer) {
  console.log('l connect !!!!!!!!!!!!!!!!!:', peer)

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
