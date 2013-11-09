var http = require('http')
  , https = require('https')
  , sio = require('socket.io')  
  , fs = require('fs')
  , RedisStore = sio.RedisStore;

//
// Load configuration file
var config = JSON.parse(
  fs.readFileSync(__dirname + "/config.json").toString().replace(
    new RegExp("\\/\\*(.|\\r|\\n)*?\\*\\/", "g"),
    "" // strip out comments
  )
);

//
// Create server instance
var server = (config.ssl.enabled ?
  // HTTPS
  https.createServer({
      key: fs.readFileSync(config.ssl.key)
    , cert: fs.readFileSync(config.ssl.cert)
  }) :
  // HTTP
  http.createServer())  
    .listen(config.port, function() {
      var addr = server.address();
      console.log('Listening on ' + (config.ssl.enabled ? 'https' : 'http')  + '://' + addr.address + ':' + addr.port);
    });


var io = sio.listen(server);

//
// Socket.IO Configuration
io.configure(function () {

  // Initialize the redis store
  var store = new RedisStore({
    nodeID: config.nodeId     || 1,
    redisPub: config.redis    || {},
    redisSub: config.redis    || {},
    redisClient: config.redis || {}
  });
    
  // Authenticate redis connections if required
  if (config.redis && config.redis.password) {
    store.pub.auth(config.redis.password)
    store.sub.auth(config.redis.password)
    store.cmd.auth(config.redis.password)
  }
  
  io.set('store', store); 
});


//
// Globals
//

function isfunc(obj) {
  return !!(obj && obj.constructor && obj.call && obj.apply);
}

function respond(ack, status, message, data) {
  if (ack && isfunc(ack)) {
    res = {}
    res.type = 'response';
    res.status = status;
    res.message = message;
    if (data)
      res.data = data.data ? data.data : data;
    console.log('Responding: ', res);    
    ack(res);
  }
}


//
// Socket.IO Socket extensions
//

sio.Socket.prototype.authorize = function(req, fn) {  
    
  var client = this;
  
  // Authenticated Access
  if (!config.anonymous) {
    if (!req.user || !req.token)
      return fn(400, 'Bad request');
    
    // Retreive the session from Redis
    client.token = req.token;                 // Remote session token
    client.getSession(function(err, session) {
      console.log('Authenticating: Token: ', req.token, 'Session:', session);
      if (err || typeof session !== 'object' || typeof session.user !== 'object') {
        console.log('Authentication Error: ', req.token, ':', err);
        return fn(401, 'Authentication Failed');
      }
      else {
        console.log('Authentication Success: ', req);        
        client.session = session;             // Remote session object
        client.group = session.user.group;    // The client's parent group
        client.access = session.user.access;  // The client access level [1 - 10]
        client.user = session.user.user;      // The client login name
        client.user_id = session.user.user_id;// The client login user ID
        client.onAuthorize(req);
        return fn(200, 'Welcome ' + client.name);
      }
    });
  }
  
  // Anonymous Access
  else {
    if (!req.user)
      return fn(400, 'Bad request');
      
    client.access = 0;
    client.name = req.name;
    client.group = req.group;
    client.user = req.user;
    client.user_id = req.user_id;
    client.onAuthorize(req);
    return fn(200, 'Welcome ' + client.name);
  }
}


sio.Socket.prototype.onAuthorize = function(req) {
  console.log('On Authorize: ', req);
  this.online = true;
  this.name = req.name ?                // The client display name
      req.name : this.user;
  this.type = req.type;                 // The client type
  this.join('user-' + this.user);       // join user channel
  this.join('group-' + this.group);     // join group channel
}


sio.Socket.prototype.toPresence = function(p) {
  if (!p || typeof p !== 'object')
    p = {};
  p.type = 'presence';
  p.data = this.toPeer(p.data);
  if (!p.from || typeof p.from !== 'object') {
    p.from = {};
    p.from.name = this.name;
  }
  return p;
}


sio.Socket.prototype.toPeer = function(p) {
  if (!p || typeof p !== 'object')
    p = {};
  p.id = this.id; //sympleID;
  p.type = this.type;
  p.node = this.node;
  p.user = this.user;
  p.user_id = this.user_id;
  p.group = this.group;
  p.access = this.access;
  p.online = this.online;
  p.host = this.handshake.headers['x-real-ip'] 
    || this.handshake.headers['x-forwarded-for'] 
    || this.handshake.address.address; //this.handshake ?  : '';

  // allow client to change name
  if (typeof p.name === 'string')
    this.name = p.name;
  else
    p.name = this.name;

  return p;
}


sio.Socket.prototype.getSessionKey = function(fn) {
  // token must be set
  io.store.cmd.keys("symple:*:" + this.token, function(err, keys) {
    fn(err, keys.length ? keys[0] : null)
  });  
}


sio.Socket.prototype.getSession = function(fn) {
  this.getSessionKey(function(err, key) {
    if (key) {
      io.store.cmd.get(key, function(err, session) {
        fn(err, JSON.parse(session));
      });
    }
    else fn("No session", null);
  });
}


sio.Socket.prototype.touchSession = function(fn) { 
  this.getSessionKey(function(err, key) {
    if (key) {
      // expire in 15 mins
      io.store.cmd.expire(key, 15 * 60, fn);
    }
    else fn("No session", null);
  });
}


//sio.Socket.prototype.authorizedClients = function() {
//  var res = [];
//  var clients = io.sockets.clients(this.group);
//  for (i = 0; i < clients.length; i++) {
//    if (clients[i].access >= this.access)
//      res.push(clients[i]);
//  }
//  return res;
//}


// Returns an array of authorized peers belonging to the currect
// client socket group.
//sio.Socket.prototype.peers = function(includeSelf) {
//  res = []
//  //var clients = this.authorizedClients();
//  var clients = io.sockets.clients('group-' + this.group);
//  for (i = 0; i < clients.length; i++) {
//    if ((!includeSelf && clients[i] == this) ||
//            clients[i].access > this.access)
//      continue;
//    res.push(clients[i].toPeer());
//  }
//  return res;
//}


// Returns an array of group peer IDs that dont have permission
// to receive messages broadcast by the current peer ie. access
// is lower than the current peer.
//sio.Socket.prototype.unauthorizedIDs = function() {
//  var res = [];
//  var clients = io.sockets.clients('group-' + this.group);
//  for (i = 0; i < clients.length; i++) {
//    if (clients[i].access < this.access)
//      res.push(clients[i].id);
//  }
//  console.log('Unauthorized IDs:', this.name, ':', this.access, ':', res);
//  return res;
//}


sio.Socket.prototype.broadcastMessage = function(message) {
  if (!message || typeof message !== 'object' || !message.from || typeof message.from !== 'object') {
    console.log('ERROR: Dropping invalid message from ', this.id, ':', message);
    return;
  }
  
  //console.log('broadcastMessage: ', this.id, ':', message);

  // Always use server-side peer info for security.
  message.from.id = this.id;
  message.from.type = this.type;
  message.from.group = this.group;
  message.from.access = this.access;
  message.from.user = this.user;
  message.from.user_id = this.user_id;

  // If no destination address was given we broadcast 
  // the message to the current client's group scope.
  if (!message.to || typeof message.to !== 'object') {
    this.broadcast.to('group-' + this.group/*, this.unauthorizedIDs()*/).json.send(message);
  }

  // If a session id was given (but no user group)
  // we send a directed message to that session id.
  else if (message.to.id && typeof message.to.id === 'string') {
    this.namespace/*.except(this.unauthorizedIDs())*/.socket(message.to.id).json.send(message);
  }

  // If a user was given (but no session id or group) 
  // we broadcast a message to user scope.
  else if (message.to.user && typeof message.to.user === 'string') {
    this.broadcast.to('user-' + message.to.user/*, this.unauthorizedIDs()*/).json.send(message);
  }

  // If a group was given (but no session id or user) we
  // broadcast a message to the given group scope.
  else if (message.to.group && typeof message.to.group === 'string') {
    this.broadcast.to('group-' + message.to.group/*, this.unauthorizedIDs()*/).json.send(message);
  }

  else {
    console.log('ERROR: Failed to send message: ', message);
  }
}


//
// Socket.IO connection handler
//

io.sockets.on('connection', function(client) {    

  // 5 seconds to Announce or get booted
  var interval = setInterval(function () {
      console.log(client.id + ' Failed to Announce'); 
      client.disconnect();
  }, 5000);

  //
  // Announce
  client.on('announce', function(req, ack) {    
    console.log('Announcing: ', req);

    try {

      //
      // Authorization
      client.authorize(req, function(status, message) {
        console.log('#################### Announce Result: ', status, message);
        clearInterval(interval);
        if (status == 200)
          respond(ack, status, message, client.toPeer());
        else {
          respond(ack, status, message);
          client.disconnect();
          return;
        }

        //
        // Message
        client.on('message', function(m, ack) {
          if (m) {
            if (m.type == 'presence')
              this.toPresence(m);
            client.broadcastMessage(m);
            respond(ack, 200, 'Message Received');
          }
        });

        //
        // Peers
        client.on('peers', function(ack) {
          respond(ack, 200, '', this.peers(false));
        });

        //
        // Timer
        interval = setInterval(function () {
          // Touch the client session event 10
          // minutes to prevent it from expiring.
          client.touchSession(function(err, res) {
            console.log(client.id + 'Touching session: ', !!res);
          });
        }, 10 * 60000);

      });
    }
    catch (e) {
        console.log('Client error: ', e);
        client.disconnect();
    }
  }); 

  //
  // Disconnection
  client.on('disconnect', function() {
    console.log(client.id + ' is disconnecting');
    clearInterval(interval);
    if (client.online) {
      client.online = false;
      var p = client.toPresence();
      console.log('disconnecting', p);
      client.broadcastMessage(p);
    }
    client.leave('user-' + client.user);    // leave user channel
    client.leave('group-' + client.group);  // leave group channel
  });
});



//
// Socket.IO Manager extensions
//

/*
function packetSender(packet) {
  var res = packet.match(/\"from\"[ :]+[ {]+[^}]*\"id\"[ :]+\"(.*?)\"/);
  return res ? io.sockets.sockets[res[1]] : null;
}

onDispatchOriginal = sio.Manager.prototype.onDispatch;
sio.Manager.prototype.onDispatch = function(room, packet, volatile, exceptions) {

  // Authorise outgoing messages via the onDispatch method so unprotected
  // data can not be published directly from Redis.
  var sender = packetSender(packet);
  if (sender) {
    if (!exceptions)
      exceptions = [sender.id]; // dont send to self
    exceptions = exceptions.concat(sender.unauthorizedIDs());
    //console.log("Sending a message excluding: ", exceptions, ': ', sender.unauthorizedIDs());
    onDispatchOriginal.call(this, room, packet, volatile, exceptions)
  }
}

onClientDispatchOriginal = sio.Manager.prototype.onClientDispatch;
sio.Manager.prototype.onClientDispatch = function (id, packet) {
    
  // Ensure the recipient has sufficient permission to recieve the message
  var sender = packetSender(packet);
  var recipient = io.sockets.sockets[id];
  if (sender && recipient && recipient.access >= sender) {
      onClientDispatchOriginal.call(this, id, packet);
  }
}
*/