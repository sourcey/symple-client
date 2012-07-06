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
// Configure Socket.IO
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
// Socket.IO Socket Extensions
//

sio.Socket.prototype.authorize = function(req, fn) {  
    
  var client = this;
  
  // Authenticated Access
  if (!config.anonymous) {
    if (!req.user || !req.token)
      return fn(404, 'Bad request');
    
    // Retreive the session from Redis
    client.token = req.token;                 // Remote session token
    client.getSession(function(err, session) {
      console.log('Authenticating: Token: ', req.token, 'Session:', session);
      if (err || typeof session !== 'object' || typeof session.user !== 'object') {
        console.log('Authentication Error: ', req.token, ':', err);
        return fn(401, 'Authentication Error');
      }
      else {
        console.log('Authentication Success: ', req.token);        
        client.session = session;             // Remote session object
        client.user = session.user.user;      // The client login name
        client.group = session.user.group;    // The client's parent group
        client.access = session.user.access;  // The client access level [1 - 10]
        client.onAuthorize.apply(client, req);
        return fn(200, 'Welcome ' + client.name);
      }
    });
  }
  
  // Anonymous Access
  else {
    if (!req.user)
      return fn(404, 'Bad request');      
      
    client.user = req.user;
    client.group = req.group;
    client.access = 1;
    client.onAuthorize(req);
    return fn(200, 'Welcome ' + client.name);
  }
}


sio.Socket.prototype.onAuthorize = function(req) {
  this.online = true;
  this.name = req.name ?                 // The client display name
      req.name : this.user;
  this.type = req.type;                  // The client type
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
    p.from.group = this.group;
    p.from.name = this.name;
    p.from.user = this.user;
    p.from.id = this.id;
  }
  return p;
}


sio.Socket.prototype.toPeer = function(p) {
  if (!p || typeof p !== 'object')
    p = {};
  p.id = this.id; //sympleID;
  p.group = this.group;
  p.user = this.user;
  p.type = this.type;
  p.node = this.node;
  p.online = this.online;
  p.address = this.handshake.address.address;

  // allow client to change name
  if (typeof p.name === 'string')
    this.name = p.name;
  else
    p.name = this.name;

  return p;
}


sio.Socket.prototype.getSessionKey = function(fn) {
  // token must be set
  io.store.cmd.keys("*:" + this.token, function(err, keys) {
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
sio.Socket.prototype.peers = function(includeSelf) {
  res = []
  //var clients = this.authorizedClients();
  var clients = io.sockets.clients(this.group);
  for (i = 0; i < clients.length; i++) {
    if ((!includeSelf && clients[i] == this) ||
            this.access > clients[i].access)
      continue;
    res.push(clients[i].toPeer());
  }
  return res;
}


// Returns an array of session IDs which are not authorized
// to view messages broadcast from the current client socket.
sio.Socket.prototype.unauthorizedIDs = function() {
  var res = [];
  var clients = io.sockets.clients(this.group);
  for (i = 0; i < clients.length; i++) {
    if (clients[i].access <= this.access)
      res.push(clients[i].id);
  }
  return res;
}


sio.Socket.prototype.sendAuthorized = function(message) {
  if (!message || typeof message !== 'object' || typeof message.from !== 'object') {
    console.log('Bad message received from:', this.id, ':', message);
  }

  // If no destination address was given we broadcast 
  // the message to the current client's group scope.
  else if (typeof message.to !== 'object') {
    this.broadcast.to('group-' + this.group, this.unauthorizedIDs()).json.send(message);
  }

  // If a session id was given (but no user group)
  // we send a directed message to that session id.
  else if (typeof message.to.id === 'string') {
    this.namespace.except(this.unauthorizedIDs()).socket(message.to.id).json.send(message);
  }

  // If a user was given (but no session id or group) 
  // we broadcast a message to user scope.
  else if (typeof message.to.user === 'string') {
    this.broadcast.to('user-' + message.to.user, this.unauthorizedIDs()).json.send(message);
  }

  // If a group was given (but no session id or user) we
  // broadcast a message to the given group scope.
  else if (typeof message.to.group === 'string') {
    this.broadcast.to('group-' + message.to.group, this.unauthorizedIDs()).json.send(message);
  }

  else {
    console.log('Failed to send message without scope: ' + message);
  }
}


//
// Socket.IO Server
//

io.sockets.on('connection', function(client) {    

  // 5 seconds to Announce or get booted
  var interval = setInterval(function () {
      console.log(client.id + ' Failed to Announce'); 
      client.disconnect();
  }, 5000);


  // Announce
  //
  client.on('announce', function(req, ack) {    
    console.log('Announcing: ', req);

    // Authorization
    //
    client.authorize(req, function(status, message) {  
      console.log('Announce Result: ', status, message);
      clearInterval(interval);
      //status = 404;
      if (status == 200)
        respond(ack, status, message, client.toPeer());
      else {
        respond(ack, status, message);
        client.disconnect();
        return;
      }

      // Message
      //
      client.on('message', function(m, ack) {
        //console.log(client.id + ' Received Message <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n', m);        
        if (m) {
          // Populate some default fields.
          //m.from = this.sympleID;
          //m.sender = this.name;

          if (m.type == 'presence')
            this.toPresence(m);

          // TODO: Allow client to change name!
          m.from = {
              group: this.group,
              user: this.user,
              name: this.name,
              id: this.id
          }
    
          client.sendAuthorized(m);
           
          respond(ack, 200, 'Message Received');
        }
      });

      // Peers
      // 
      client.on('peers', function(ack) {
        //console.log(client.id + ' Received Roster <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<');        
        
        respond(ack, 200, '', this.peers(false));
      });
      
      // Timer
      // 
      interval = setInterval(function () {
        // Touch the client session event 10
        // minutes to prevent it from expiring.   
        client.touchSession(function(err, res) {
          console.log(client.id + 'Touching session: ', !!res);
        });    
      }, 10 * 60000);
    
    }); 
  }); 

  // Disconnection
  //
  client.on('disconnect', function() {
    console.log(client.id + ' is disconnecting');
    //client.name + ' (' + client.user + ') disconected.'
    clearInterval(interval);
    if (client.online) {
      client.online = false;
      var p = client.toPresence();
      console.log('disconnecting', p);
      client.sendAuthorized(p);
    }
    client.leave('user-' + client.user);    // leave user channel
    client.leave('group-' + client.group);  // leave group channel
  });
});



//, io = sio.listen(app);
//app.listen(config.port);
//require('express').createServer();  


  /*
    //console.log(this);
    //this.namespace.except(this.unauthorizedIDs()).clients('group-' + this.group).json.send(message);
    //this.namespace.sockets.broadcast.to('group-' + this.group).except(this.unauthorizedIDs()).json.send(message);
    //var clients = io.sockets.clients(this.group);

    //io.sockets.socket(message.to.node).except(this.unauthorizedIDs()).json.send(message);

  // broadcast to group scope
  if (message.to.group) {
    this.broadcast.to(message.group).except(this.unauthorizedIDs()).json.send(message);
  }

      client.join('user-' + client.user);       // join user channel
      client.join('group-' + client.group);     // join group channel

  }
  // broadcast to group scope
  //var scope = message.to ? message.to.split(':') : [];

  // Broadcast to group scope
  if (scope.length == 0 || 
    (scope.length == 1 && scope[0] == this.group)) {
    var clients = io.sockets.clients(this.group); 
    for (i = 0; i < clients.length; i++) {
      if (clients[i].access >= this.access &&
        clients[i].id != this.id &&
        clients[i] != this) {
        console.log('Sending Message to: ' + clients[i].id);
        console.log(message);
        clients[i].json.send(message); 
      }
    }
  }
  
  // Broadcast to user scope
  else if (scope.length == 2) { // && scope[1] == this.id
    var clients = io.sockets.clients(this.group); 
    for (i = 0; i < clients.length; i++) {
      if (clients[i].access >= this.access &&
        clients[i].user == scope[1] &&
        clients[i] != this) {
        console.log('Sending Message to: ' + clients[i].id);
        console.log(message);
        clients[i].json.send(message); 
      }
    }
  }  
  
  // Send directed message
  else if (scope.length == 3)  { 
    console.log('Sending Message to: ' + scope[2]);
    console.log(message);
    io.sockets.socket(scope[2]).json.send(message);
  }
  */
   
  
        /*
    console.log('BROADCAST: ', this.broadcast.to(this.group));
  this.broadcast.to(this.group).json.send(message);
  //this.broadcast.to        
  */
      
      /*
      //
      // Storage
      //
      client.on('store:group:set', function(key, data, ack) {
        //value, expiry, scoped
       // if (typeof params !== 'object') {
        //  return;
          
        //if (!params.data)
        
        //  io.store.cmd
        //client.set('name', req.body.name, function(error, result) {
       //     if (error) res.send('Error: ' + error);
       //     else res.send('Saved');
        //});        
      });
      
      client.on('get', function(key, ack) {
        // return an array of items for key
      });
      */   



/*
sio.Manager.prototype.generateId = function () {
  return "aaaaaaaaaaaaaaaaaaaaaaaaaaa"; //Math.abs(Math.random() * Math.random() * Date.now() | 0).toString()
    //+ Math.abs(Math.random() * Math.random() * Date.now() | 0).toString();
};

sio.Socket.prototype.ddd = function () {
  return "!!!!!!!!!!!!!!!!aaaaaaaaaaaaaaaaaaaaaaaaaaa"; //Math.abs(Math.random() * Math.random() * Date.now() | 0).toString()
    //+ Math.abs(Math.random() * Math.random() * Date.now() | 0).toString();
};// || session.user['user'] != req.user //|| 
      //!session.user || !session['access_level'] || 
      //!session['group_id'] || !session['session_id']
      
  //client.key = req.group + ":" + req.user + ":" + req.token
  //client.key = "*:" + req.user + ":" + req.token
  //io.store.cmd.get(client.key, function(err, session) { //, 'session''*:' +  
app.get('/', function(req, res) {
  //console.log(req)
  res.sendfile(__dirname + '/client.html');
});
*/

/*
  io.set('authorization', function (data, accept) {  
      //console.log('\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\');
     console.log(data);
      //console.log(data.query.token);
      //console.log(data.headers.query.token);
      
    //client.token = req.token;    
    io.store.cmd.get(data.query.token, function(err, session) {
      data.session = JSON.parse(session);        
      console.log('Authentication: Session: ' + data.session);     
      if (err) {            
        console.log('Authentication Error: ' + err);
        return accept("Authentication Error", false);
      }
      else { 
        console.log('Authentication Success: ' + session);
        return accept(null, true);
      } 
    });      
  });
  */
  
  //io.set('authorization', function (data, accept) {  
  //    console.log(data.headers.cookie);
  //    if (data.headers.cookie) {
  //        //var sessionID = "81e8b60ee3ce1fbe85fd274197ae06f1d8246c687eab9fa0d0260e626831ccac"
  //        var sessionID = data.headers.cookie.replace(/.*session_id\=([^;]+).*/, '$1');
  //        //if (sessionID) {
  //            console.log('Authorizing: ' +  sessionID);  
  //            console.log(data);
  //            io.store.cmd.get('session:' + sessionID, function(err, obj) {
  //              obj = JSON.parse(obj);
  //                  
  //                 // !obj['client_id'] || 
  //                if (!obj || !obj['username'] || !obj['access_level'] || 
  //                    !obj['group_id'] || !obj['session_id'] || err) {            
  //                    console.log('Authentication Error: ' + err);
  //                    return accept("Error", false);
  //                }
  //                else {
  //                    console.log('Authentication Success: ' + obj);
  //                    data.session = obj;
  //                    return accept(null, true);
  //                }                
  //            });
  //        //}
  //    } else {
  //      accept("No cookie", false);
  //    }
  //});
  
  

/**
 * Transmits a packet.
 *
 * @api private
var parser = require('socket.io/lib/parser');
sio.Socket.prototype.packet = function (packet) {
  if (this.flags.broadcast) {
    this.log.debug('Broadcasting packet!!!!!!!!!!');
    this.namespace.in(this.flags.room).except(this.id).packet(packet);
  } else {
    this.log.debug('Transmits packet!!!!!!!!!!');
    packet.endpoint = this.flags.endpoint;
    packet = parser.encodePacket(packet);

    this.dispatch(packet, this.flags.volatile);
  }

  this.setFlags();

  return this;
};
 */
 
 
  /*
      
      
  timeout = window.setInterval(..., y);
  setInterval(function () {
        client.send('Waited two seconds!');
    }, 2000);
    */
              

      /* //'message', client, 
        console.log(m); //'); // 
        
        console.log(client.id + ' Received Message 0'); //');
        console.log(client.id + ' Received Message 1'); //');
        console.log(client.id + ' Received Message 2'); //')
        
        
      //
      // Presence
      //
      client.on('presence', function(p, ack) {
        console.log(client.id + ' Received Presence <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<'); // \n', p);
        
        client.toPresence(p);
        console.log(client.id + ' Received Presence <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< 1111111111'); // \n', p);
        client.sendAuthorized('presence', p);
        
        respond(ack, 200, "Presence Received");
      }); 

      //
      // Command
      //
      client.on('command', function(c, ack) {
        console.log(client.id + ' Received Command <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<'); // \n', p);
        
        client.sendAuthorized('command', c);
         
        respond(ack, 200, "Command Received");
      });
      */
        
        //console.log(client);        
        // Add some manditory fields
        //if (p['data'] === undefined)
        //  p['data'] = {};
        //p['data'] = client.toPresence();        
        // TODO: Check valid presence
        // Set the presence data on our redis session
        //client.updateSession('presence', JSON.stringify(p['user']));
        

/*
// build a map of all keys and their types
client.keys("*", function (err, all_keys) {
    var key_types = {};
    
    all_keys.forEach(function (key, pos) { // use second arg of forEach to get pos
        client.type(key, function (err, type) {
            key_types[key] = type;
            if (pos === all_keys.length - 1) { // callbacks all run in order
                print_results(key_types);
            }
        });
    });
});
sio.Socket.prototype.updateSession = function(key, value, fn) {
  if (!fn)
    fn = function(){}
  this.session[key] = value;
  io.store.cmd.set(this.token, this.session, fn);
};
*/
 
        
    
    /*
    //var id = message.to;
    //id = id.substring(id.indexOf(":") + 1 , id.length);
        //res.push(clients[i]);
    var clients = this.authorizedClients(); 
    for (i = 0; i < clients.length; i++) {
      if (this.id == clients[i].id)
        continue;
      console.log('Sending Message to: ' + clients[i].id);
      console.log(message);
    }
    */
    
        //
        // Other events are bound within authorized scope
        //  
/*
//function authorize(client, req, fn) {  
  //client.redisKey = req.user + ':sessions:' + req.token;req.user + ":" + 
  //client.redisKey = req.token;
*/
      
        // Await presence... 
    
        //console.log('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ authorize: ');
        //console.log(client);
    
        //client.broadcast.to(client.group).json.send(client.name + ' (' + client.user + ') has connected.');        
        // TODO: Set timer to touch session periodically while connected
        //setInterval(function () {
        //  socket.volatile.send("it's: " + new Date);
        //}, 500);
        
    
      
  
    /*
    */
    
    
        
        /*
        if (ack) {
          console.log(client.id + ' Responding Authorize: ' + JSON.stringify(req));
          console.log(client.id + ' Responding Authorize: ------------');
          
    //console.log(isfunc(ack));
   // console.log(isfunc(req));
    //console.log(isfunc(authorize));
    //console.log(ack);
          ack({ res: "Welcome " + client.name });
          }
          */
  
  //client.broadcast.volatile.json.send({'foo':'bar'});
  //client.volatile.broadcast.emit('ping', 'pong');
  //client.json.broadcast.send([{foo:'bar'}, {'ping': 12}]);
    
      /*
        if (ack) {
          console.log(client.id + ' Responding Authorize: ' + JSON.stringify(req));
          console.log(client.id + ' Responding Authorize: ------------');
       // console.log(isfunc(ack));
        //console.log(isfunc(req));
        //console.log(isfunc(authorize));
        //console.log(ack);
          ack({ res: err }); //err);
          }
          id: clients[i].id,
          name: clients[i].name,
          user: clients[i].user,
          type: clients[i].type,
          address: clients[i].handshake.address.address
          
      var event = 'presence'
      
      buffer.push(p);
      if (buffer.length > 15) {
          buffer.shift();
      }
  
      //var out = {
      //}
    */

      
      /*
      // Check valid format
      // Broadcast messages to clients with sufficient permissions
      if (!message.to || message.to == client.group)  {
        var clients = client.authorizedClients(client); 
        for (i = 0; i < clients.length; i++) {
            clients[i].send(message);
        }
      }
      
      // Send directed message
      else {
        io.sockets.socket(message.to).send(message);
        //client.broadcast.to(client.group).json.send(message);  
        //clients[i].send(message);
      }
      */


/*
//
//
//
Message = module.exports = function(hash) {
  for (var key in hash) this[key] = hash[key];
};

Message.fromJSON = function(json) {
  return (new this(JSON.parse(json)))
};

Message.prototype.toJSON = function() {
  var object = {};
  for (var key in this) {
    if (typeof this[key] != "function")
      object[key] = this[key];
  }
  return (JSON.stringify(object));
};

Message.valid = function() {
  return this['to'] != undefined
    &&  this['type'] != undefined;
};
//var buffer = [];
*/
    //io.sockets.socket(message.to).send(message);
    //client.broadcast.to(client.group).json.send(message);  
    //clients[i].send(message);

                /*
                console.log(obj['username']);
                console.log(obj['group_id']);
                console.log(obj['session_id']);
                console.log(obj);
                console.log('Authorizing: --------------------- '); 
                */
/*
              //accept(null, true);
      //callback(null, true);
      // TODO: Currently if the session exists it is good
      // enough for authentication.      
      //return accept(null, true);    
      //sid = "79df0fe289d33d755e0301fd46c9976b163bcd390803eb799e6383fe113deb22";    
          //var groupID = "4" //data.headers.cookie.replace(/.*_anionu_group\=([^;]+)., '$1'); && groupID
          
          
                  //console.log('Authentication ################################################');
                  //console.log(obj);
                  //console.log('Authentication ++++++++++++++++++++++++++++++++++++++++++++++++');
                  
                  //obj.replace(/._anionu_group\=([^;]+)./, '$1'); 
                  //group_id?; FI"?4?;
                     
    // check if there's a cookie header
    if (data.headers.cookie) {
        // if there is, parse the cookie
        data.cookie = parseCookie(data.headers.cookie);
        // note that you will need to use the same key to grad the
        // session id, as you specified in the Express setup.
        data.sessionID = data.cookie['express.sid'];
    } else {
       // if there isn't, turn down the connection with a message
       // and leave the function.
       return accept('No cookie transmitted.', false);
    }
    // accept the incoming connection
    accept(null, true);
    */
      
      //if (data.sid) {
      
   //     io.store.cmd.get('session:' + sessionID, function(err, obj) {
   //         .disconnect() 
              //        var sessionID = data.headers.cookie.replace(/.*session_id\=([^;]+).*/, '$1');
    //        //if (sessionID) {
    //            console.log('Authorizing: ' +  sessionID);  
    //            console.log(data);
    //            io.store.cmd.get('session:' + sessionID, function(err, obj) {
    //              obj = JSON.parse(obj);
    //                  
    //                 // !obj['client_id'] || 
    //                if (!obj || !obj['username'] || !obj['access_level'] || 
    //                    !obj['group_id'] || !obj['session_id'] || err) {            
    //                    console.log('Authentication Error: ' + err);
    //                    return accept("Error", false);
    //                }
    //                else {
    //                    console.log('Authentication Success: ' + obj);
    //                    data.session = obj;
    //                    return accept(null, true);
    //                }                
    //            });
    //        //}
    //  }  
        

    //client.user = client.handshake.session['username'];
    //client.group = client.handshake.session['group_id'];
    //client.access = client.handshake.session['access_level'];
    //client.userID = client.id;
    //client.userName = "unset"; // the name specified for this node
    
    //console.log('A socket with session ID ' + client.id + ' connected!');  
          
          /*
          var msg = message; //{ message: [client.sessionId, message] };
          buffer.push(msg);
          if (buffer.length > 15)
              buffer.shift();
          //io.sockets.socket(sess_id).send('my message')
          client.broadcast.to(group).json.send(msg);   
          */     
          //var clients = io.sockets.clients();// all users from room `room`
          //console.log(io.sockets.in(group));
          //console.log(clients);
          //console.log(clients1);
                /*
                console.log('CLIENT ---------------------------------------');
                console.log(clients1[i].handshake);
                console.log(clients1[i].username);
                console.log(clients1[i].group);
                */
   
    //var cookie = client.handshake.session['session_id'];
    //var io.sockets.socket(sess_id).send('my message')
        
    //if (ack) 
     //   ack({ msg: "Hello " + data.name, group: group, sid: client.handshake.sid });
            
    //client.group = data.group;, data: data
    //var cookie = ""; //"31fec9d24829b2163c1d3b37695f48b68c38940bc01e78f7620c2f772e24b6e5";
    //var session = "";
     // console.log(client.handshake.headers); 
    // handshake still available
    // console.log(client.handshake.foo == true); // writes `true`
    // console.log(client.handshake.address.address); // writes 127.0.0.1

  /*
    //var name = "";
    //var groupID = client.handshake.groupID;
    //var sessionID = client.handshake.sessionID;
    
    client.on("announce", function(data, ack) { 
        
        username = data.username;
        name = data.name;
        group = data.group;
        
        console.log(username + ' connected to ' + group);
        
        if (ack) 
            ack({ msg: "Hello " + data.name, group: group, sid: client.handshake.sid });
            
        client.join(group);
        client.broadcast.to(group).json.send({ msg: data.name + " has connected.", data: data });    
    });
    
    client.on("xmpp", function(data, ack){
        console.log('Received XMPP: ' + data);
        console.log('XMPP Callback: ' + ack);
        
        client.broadcast.to(group).json.send(msg);        
        
        //if (ack)
        //    ack({ msg: "Goddit" });
    });
    */
