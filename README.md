# Symple Client

The Symple JavaScript client is a client-side implementation of the Symple protocol which runs in the web browser. 

## What is Symple?

Symple is a unrestrictive real-time messaging and presence protocol. 

The protocol itself is semantically similar to XMPP, except that it is much more flexible and economical due to the use of JSON instead of XML for encoding messages. 

Symple currently has client implementations in [JavaScript](https://github.com/sourcey/symple-client), [Ruby](https://github.com/sourcey/symple-client-ruby) and [C++](https://github.com/sourcey/libsourcey/tree/master/src/symple), which make it ideal for a wide range of messaging requirements, such as building real-time games and applications which run in the web browser, desktop, and mobile phone.

## Using Symple

1. Clone the `symple-server` repository and fire up the Node.js server `node server`
2. Clone the `symple-client` repository and check the `examples` folder to start hacking!
3. Also check the `symple-client-webrtc-demo` for a fully featured WebRTC video chat demo using Symple.

## Examples

A basic Symple client looks like this:

```javascript
client = new Symple.Client({	
	url: 'http://localhost:4500',    // Server URL [http/https]
    peer: {                          // Peer object contains user information
        name: 'My Name',             // User display name 
        user: 'myusername',          // User ID 
        group: 'somegroup',          // Peer group/room this user's communication is restricted to
        token: 'someauthtoken'       // An optional pre-arranged session token 

        // The peer object may be extended any custom information, which will  
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

For a full fledged example using Symple for signalling in a live WebRTC chat application check out: http://symple.sourcey.com

## Dependencies

While the Symple protocol itself is inherently dependency free, the JavaScript client currently relies on the following third party libraries:

* [JQuery](http://jquery.com/)
* [Socket.IO](http://socket.io)

## Symple Projects

Node.js server: https://github.com/sourcey/symple-server-node  
JavaScript client: https://github.com/sourcey/symple-client  
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
If you have a bug or an issue then please use the Github issue tracker: https://github.com/sourcey/symple-client/issues
