# Symple WebRTC Video Chat Demo

The Symple video chat demo is an example of how to use the Symple for instant messaging and WebRTC signaling. External projects used are AngularJS, Bootstrap, Node.js and Express

See this blog post for more information about the demo: http://sourcey.com/symple-webrtc-video-chat-demo

## What is Symple?

Symple is a unrestrictive real-time messaging and presence protocol.

The protocol itself is semantically similar to XMPP, except that it is much more flexible and economical due to the use of JSON instead of XML for encoding messages.

Symple currently has client implementations in [JavaScript](https://github.com/sourcey/symple-client), [Ruby](https://github.com/sourcey/symple-client-ruby) and [C++](https://github.com/sourcey/libsourcey/tree/master/src/symple), which make it ideal for a wide range of messaging requirements, such as building real-time games and applications which run in the web browser, desktop, and mobile phone.

## How to use it

1. Clone the `symple-server` repository and fire up the server by typing `node server`. The server should be running on port 4500. Either ensure you have Redis installed for session management, or that anonymous logins are enabled on the server. See `config.json` in the server foot folder for configuration options.
2. Run `node webserver` to start the demo web server.  
3. Open `http://localhost:4500` in your browser and play!

### Hacking

Some key options are specified in the main HTML file located at `views/index.ejs`

**CLIENT_OPTIONS** This is the options hash for the Symple client and Socket.IO. This is where you specify the server URL and Peer object. Note that we have disabled 'websocket' transport by default, but you will probably want to re-enable it in production.

**WEBRTC_CONFIG** This is the PeerConnection options hash. In production you will want to specify some TURN servers so as to ensure the p2p connection succeeds in all network topologies.

Other than that all relevant JavaScript is located in `public/js/app.js` and `public/js/helpers.js`. Enjoy!

## Contributing

1. Fork it
2. Create your feature branch (`git checkout -b my-new-feature`)
3. Commit your changes (`git commit -am 'Add some feature'`)
4. Push to the branch (`git push origin my-new-feature`)
5. Create new Pull Request

## TODO

1. Store last 50 messages via json - store via server using a group cache options or flat file?.
2  Gruntfile for compressing scripts.
3. Sync with twitter API to get user info and profile photo for handles.

## Contact

For more information please check out the Symple homepage: http://sourcey.com/symple/
If you have a bug or an issue then please use our new Github issue tracker: https://github.com/sourcey/symple-client/issues
