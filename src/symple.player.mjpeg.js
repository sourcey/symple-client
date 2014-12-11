Symple.Media.BrowserCompatabilityMsg = '\
    <br>Download the latest version <a href="www.google.com/chrome/">Chrome</a> or \
    <a href="http://www.apple.com/safari/">Safari</a> to view this video stream.'

// -----------------------------------------------------------------------------
// Native MJPEG Engine
//
// - Works in Firefox, Chrome and Safari except iOS >= 6.
//
Symple.Media.registerEngine({
    id: 'MJPEG',
    name: 'MJPEG Native',
    formats: 'MJPEG',
    preference: 60,
    defaults: {
        framing: 'multipart'
    },
    support: (function() {
        var ua = navigator.userAgent;
        var iOS = Symple.iOSVersion();
        return !!(ua.match(/(Firefox|Chrome)/) || 
            // iOS < 6 or desktop safari
            (iOS ? iOS < 6 : ua.match(/(Safari)/)));
    })()
});

Symple.Player.Engine.MJPEG = Symple.Player.Engine.extend({
    init: function(player) {
        this._super(player);
        this.img = null;
    },

    play: function(params) {    
        //params = params || {};
        //params.framing = 'multipart'; // using multipart/x-mixed-replace
        Symple.log("MJPEG Native: Play", params);
        
        if (this.img)
          throw 'Streaming already initialized'
          
        this._super(params);
        
        // TODO: Some kind of connection timeout
        
        //this.params = params;
        //this.params.url = this.buildURL();        
        //if (!this.params.url)
        //  throw 'Invalid streaming URL'
        
        var self = this;
        var init = true;
        this.img = new Image();
        //this.img.style.width = '100%';  // constraints set on screen element
        //this.img.style.height = '100%';
        this.img.style.display = 'none';
        this.img.onload = function() {
            Symple.log("MJPEG Native: Success");
        
            // Most browsers inclusing WebKit just call onload once.
            if (init) {
                if (self.img)
                    self.img.style.display = 'inline';
                self.setState('playing');
                init = false;
            }
            
            // Some browsers, like Firefox calls onload on each 
            // multipart segment, so we can display status.
            else
                self.displayFPS();
        }
        
        // NOTE: This never fires in latest chrome  
        // when the remote side disconnects stream.
        this.img.onerror = function() {
            self.setError('Streaming connection failed.' + 
                Symple.Media.BrowserCompatabilityMsg);
        }
        this.img.src = this.params.url; // + "&rand=" + Math.random();
        this.player.screen.prepend(this.img);        
    },

    stop: function() {
        Symple.log("MJPEG Native: Stop");
        this.cleanup();
        this.setState('stopped');
    },
    
    cleanup: function() {
        if (this.img) {
            this.img.style.display = 'none';
            this.img.src = "#"; // closes the socket in ff, but not webkit
            this.img.onload = new Function;
            this.img.onerror = new Function;
            this.player.screen[0].removeChild(this.img);
            this.img = null;
        }
    },
    
    setError: function(error) {
        Symple.log('Symple MJPEG Engine: Error:', error);
        this.cleanup();
        this.setState('error', error);
    }
});


// -----------------------------------------------------------------------------
// MJPEG WebSocket Engine
//
// Requires HyBi binary WebSocket support.
// Available in all the latest browsers:
// http://en.wikipedia.org/wiki/WebSocket
//
Symple.Media.registerEngine({
    id: 'MJPEGWebSocket',
    name: 'MJPEG WebSocket',
    formats: 'MJPEG',
    preference: 50,
    support: (function() {
        window.WebSocket = window.WebSocket || window.MozWebSocket;
        window.URL = window.URL || window.webkitURL || window.mozURL || window.msURL;
        return !!(window.WebSocket && window.WebSocket.CLOSING === 2 && window.URL)
    })()
});

Symple.Player.Engine.MJPEGWebSocket = Symple.Player.Engine.extend({
    init: function(player) {
        this._super(player);
        this.socket = null;
        this.img = null;
    },

    play: function(params) {
        if (this.active())
          throw 'Streaming already active'      
                
        this._super(params);
        this.createImage();
        
        var self = this, init = true;     
        
        Symple.log("MJPEG WebSocket: Play:", this.params);
        this.socket = new WebSocket(this.normalizeURL(this.params.url));
        
        this.socket.onopen = function () {
            Symple.log("MJPEG WebSocket: Open");    
            //self.socket.send('Ping');  
        };                
        this.socket.onmessage = function (e) {
            Symple.log("MJPEG WebSocket: Message: ", e);    
            
            // http://www.adobe.com/devnet/html5/articles/real-time-data-exchange-in-html5-with-websockets.html
            // http://stackoverflow.com/questions/15040126/receiving-websocket-arraybuffer-data-in-the-browser-receiving-string-instead
            // http://stackoverflow.com/questions/9546437/how-send-arraybuffer-as-binary-via-websocket/11426037#11426037        
            if (!self.active()) {
                self.setError('Streaming failed');
                //self.socket.close();
            }
            
            if (init) {
                self.setState('playing');
                init = false;
            }

            // TODO: Image content type
            Symple.log("MJPEG WebSocket: Frame", self, e.data);
            var blob = window.URL.createObjectURL(e.data);     
            self.img.onload = function() {
                window.URL.revokeObjectURL(blob);
            };
            self.img.src = blob;
            self.displayFPS();
        };   
        this.socket.onerror = function (error) {
            // Invalid MJPEG streams will end up here
            self.setError('Invalid MJPEG stream: ' + error + '.');
        };
    },

    stop: function() {
        Symple.log("MJPEG WebSocket: Stop");
        this.cleanup();
        this.setState('stopped');
    },

    active: function(params) {
        return this.img !== null && this.socket !== null;
    },
    
    cleanup: function() {
        Symple.log("MJPEG WebSocket: Cleanup");
        if (this.img) {
            this.img.style.display = 'none';
            this.img.src = "#"; // XXX: Closes socket in ff, but not safari
            this.img.onload = null;
            this.img.onerror = null;
            this.player.screen[0].removeChild(this.img);
            this.img = null;
        }
        if (this.socket) {
            Symple.log("MJPEG WebSocket: Cleanup: Socket: ", this.socket);
            
            // BUG: Not closing in latest chrome,
            this.socket.close()
            this.socket = null;
        }
    },

    createImage: function() { 
        if (!this.img) {
            this.img = new Image();
            this.img.style.width = '100%';
            this.img.style.height = '100%';
            
            // We will end up here if the MJPEG stream is invalid.
            // NOTE: This never fires in latest chrome when the
            // remote side disconnects stream.
            var self = this;
            this.img.onerror = function(e) {
                Symple.log("MJPEG WebSocket: Image load error: ", e);
                //self.setError(
                //  'Invalid MJPEG stream');
            }
            //this.player.screen[0].innerHTML = this.img; 
            this.player.screen.append(this.img); 
        } 
    },
    
    normalizeURL: function(url) {  
      return url.replace(/^http/, 'ws');
    },
    //buildURL: function() {    
    //    return this._super().replace(/^http/, 'ws');
    //},
    
    setError: function(error) {
        Symple.log('MJPEG WebSocket: Error:', error);
        this.cleanup();
        this.setState('error', error);
    }
});

        
// -----------------------------------------------------------------------------
// Multipart HTTP Parser
// 
Symple.MultipartParser = Symple.Class.extend({
    init: function(engine) {
        this.engine = engine;
        this.contentType = null;
        this.boundary = 0;
        this.xhr.numParsed = 0;
    },
    
    process: function(buffer) {
        var res = this.incrParse(buffer);
        if (res[0] > 0) {
            this.processPart(res[1]);
            this.xhr.numParsed += res[0];
            if (buffer.length > this.xhr.numParsed)
                this.processChunk();
        }
    },

    processPart: function(part) { 
        //Symple.log('MultipartParser: processPart: ', this.boundary)
        part = part.replace(this.boundary + "\r\n", '');
        var lines = part.split("\r\n");
        var headers = {};
        while(/^[-a-z0-9]+:/i.test(lines[0])) {
            var header = lines.shift().split(':');
            headers[header[0]] = header[1].trim();
            if (!this.contentType) {
                if (header[0] == 'Content-Type')
                    this.contentType = header[1].trim();
            }
        }
        var payload = lines.join("\r\n");
        this.draw(payload);
    },

    incrParse: function(buffer) {
        //Symple.log('MultipartParser: incrParse: ', this.boundary)
        if (buffer.length < 1) return [-1];
        var start = buffer.indexOf(this.boundary);
        if (start == -1) return [-1];
        var end = buffer.indexOf(this.boundary, start + this.boundary.length);
        // SUCCESS
        if (start > -1 && end > -1) {
            var part = buffer.substring(start, end);
            // end != part.length in wrong response, ignore it
            return [end, part];
        }
        // INCOMPLETE
        return [-1];
    }
});


// -----------------------------------------------------------------------------
// HTTP Chunked Parser
//
Symple.ChunkedParser = Symple.Class.extend({
    init: function(engine) {
        this.engine = engine;
    },
    
    process: function(frame) {       
        var start, 
            nread = 0, 
            pos = frame.indexOf("/9j/");
        while (pos > -1) {
            start = pos;
            pos = frame.indexOf("/9j/", pos + 4);
            if (pos > -1) {
                var image = frame.substr(start, pos);
                this.engine.draw(image);
                nread += image.length;
            }
        }
        return nread;
        
        /*            
        // Image start
        if (frame.indexOf("/9j/") == 0) {        
            Symple.log('Symple ChunkedParser: Got Image Start')
        
            // Draw the current frame
            if (this.currentFrame.length) {
                this.engine.draw(this.currentFrame); 
                this.currentFrame = '';
            }         
        }
        else 
            Symple.log('Symple ChunkedParser: Partial Packet')  
                      
        // Append data to current frame
        this.currentFrame += frame;  
        return frame.length;
        */
    }
});


// -----------------------------------------------------------------------------
// MXHR Base64 MJPEG Engine
//
// - Multipart data must be base64 encoded to use this engine.
// - Base64 encoded data is 37% larger than raw data.
// - Provides last resort playback in browsers that don't support MJPEG natively.
// - Chrome doesn't support multipart/x-mixed-replace over XMLHttpRequest,
//   which is required for some older browsers to trigger readyState == 3.
//   Server side for Chrome should just push data to the client (HTTP Streaming). 
// - Safari WebKit, and Firefox (tested on 15.0.1) parses and removes chunk
//   headers and boundaries for us.
// - The server must use Transfer-Encoding: chunked. Plain old HTTP streaming is
//   not sufficient as packets may be modified by the client.
//
Symple.Media.registerEngine({
    id: 'MJPEGBase64MXHR',
    name: 'MJPEG Base64 MXHR',
    formats: 'MJPEG',
    defaults: {
        framing: 'chunked',
        encoding: 'Base64'
    },
    preference: 30,
    support: (function() {
        return 'XMLHttpRequest' in window;
    })()
});


Symple.Player.Engine.MJPEGBase64MXHR = Symple.Player.Engine.extend({
    init: function(player) {
        this._super(player);
        this.xhrID = 0;
        this.xhrConn = null;
        this.contentType = null;
        this.img = null;
        this.errors = 0;
    },

    play: function(params) {      
        if (this.xhr)
            throw 'Streaming already initialized'
          
        //params.framing = 'chunked';
        //params.encoding = 'Base64';
        this._super(params);
        
        // TODO: Playback timer to set error if not playing after X
        
        //Symple.log('MJPEGBase64MXHR: Play: ', this.params)                
        this.rotateConnection();
    },

    stop: function() {  
        if (this.xhrConn) {
            this.freeXHR(this.xhrConn);
            this.xhrConn = null;
        }             
        //if (this.parser)            
        //    this.parser.flush();
        this.freeImage(this.img);
        this.img = null;
        this.player.screen.html('');
        this.setState('stopped');
    },
    
    rotateConnection: function() {               
        if (!this.params.url)
            throw 'Invalid streaming URL'  
                 
        this.xhrID++;
        var self = this, xhr = this.createXHR();
        
        //Symple.log('MJPEGBase64MXHR: Connecting:', this.xhrID)
        
        xhr.xhrID = this.xhrID;
        xhr.connecting = true;
        xhr.cancelled = false;        
        xhr.onreadystatechange = function() {     
          // Send to onReadyState for parsing media
          self.onReadyState.call(self, this);  
          
          // Connection management logic         
          if (this.readyState == 3) {  
          
              // When the connection is ready we close the old one,
              // and set it as the new media connection.
              if (this.connecting) {
                  this.connecting = false;
                  //Symple.log('MJPEGBase64MXHR: Loaded:', this.xhrID)
                  
                  // Close the old connection (if any)
                  if (self.xhrConn) {
                      //Symple.log('MJPEGBase64MXHR: Freeing Old XHR:', self.xhrConn.xhrID)
                      if (self.xhrConn.xhrID == this.xhrID)
                          throw 'XHR ID mismatch'                          
                      if (self.xhrConn === this)
                          throw 'XHR instance mismatch'
                      
                      // Assign a null callback so we don't receive
                      // readyState 4 for the cancelled connection.
                      self.xhrConn.onreadystatechange = new Function;
                      self.xhrConn.abort();
                      delete self.xhrConn.responseText;
                      self.xhrConn = null;
                  }
                  
                  // Set the new media connection
                  self.xhrConn = this;    
              } 
              
              // Keep memory usage down by recreateing the connection
              // when the XHR responseText buffer gets too large. 
              // Works a treat in Chrome (27.0.1453.110).
              else if (this.cancelled === false && 
                  this.responseText && 
                  this.responseText.length > (1048576 * 2)) {
                  this.cancelled = true;
                  //Symple.log('MJPEGBase64MXHR: Switching Connection:', this.xhrID, this.responseText.length)
                  self.rotateConnection();
              }
          }
        }
        xhr.open('GET', this.params.url, true);
        xhr.send(null);
        xhr = null; // Dereference to ensure destruction
    },

    draw: function(frame) {
        //Symple.log('MJPEGBase64MXHR: Draw:', this.contentType, frame.length) //, frame
                
        if (!this.img) {
            this.img = this.createImage()
            this.player.screen.prepend(this.img);
        }
                    
        this.img.src = 'data:' + this.contentType + ';base64,' + frame;
        this.displayFPS();
    }, 
        
    createXHR: function() {        
        // These versions of XHR are known to work with MXHR
        try { return new ActiveXObject('MSXML2.XMLHTTP.6.0'); } catch(nope) {
            try { return new ActiveXObject('MSXML3.XMLHTTP'); } catch(nuhuh) {
                try { return new XMLHttpRequest(); } catch(noway) {
                    throw new Error('Could not find supported version of XMLHttpRequest.');
                }
            }
        }
    },
    
    freeXHR: function(xhr) {           
        //Symple.log('MJPEGBase64MXHR: Freeing XHR:', xhr.xhrID)
        xhr.canceled = true;
        xhr.abort();    
        xhr.onreadystatechange = new Function;
        delete xhr.responseText;
        xhr = null;
    },
    
    createImage: function(img) {      
        var img = new Image();
        img.self = this;           
        img.style.zIndex = -1; // hide until loaded    
        img.onload = function() {
            Symple.log('MJPEGBase64MXHR: Onload');
            if (this.self.player.state == 'loading')
                this.self.setState('playing');
            this.self.errors = 0; // reset error count
        }        
        img.onerror = function() {              
            Symple.log('MJPEGBase64MXHR: Bad frame: ', frame.length, 
                frame.substr(0, 50), 
                frame.substr(frame.length - 50, frame.length)); // for debuggering
        
            // Set error state after 5 consecutive failures
            this.self.errors++;
            if (this.self.errors == 5 &&
                this.self.player.state == 'loading')
                this.self.setError("Streaming ended. Invalid media format.");
         }
         return img;
    },
    
    freeImage: function(img) {  
        ////Symple.log('MJPEGBase64MXHR: Remove:', img.seq);        
        img.onload = new Function;
        img.onerror = new Function;
        if (img.parentNode)
            img.parentNode.removeChild(img);  
        img = null;   
    },
    
    onReadyState: function(xhr) {
        ////Symple.log('MJPEGBase64MXHR: Ready State Change: ',  xhr.readyState, xhr.xhrID, xhr.numParsed)         
        if (xhr.readyState == 2) {
        
            // If a multipart/x-mixed-replace header is received then we will
            // be parsing the multipart response ourselves.
            var contentTypeHeader = xhr.getResponseHeader("Content-Type");
            //Symple.log('MJPEGBase64MXHR: Content Type Header: ', contentTypeHeader)
            if (contentTypeHeader &&
                contentTypeHeader.indexOf("multipart/") != -1) {
                // TODO: Handle boundaries enclosed in commas
                this.parser = new Symple.MultipartParser(this);
                this.parser.boundary = '--' + contentTypeHeader.split('=')[1];
            }
            
            // If no multipart header was given we are using HTTP streaming 
            // or chunked encoding, our job just got a lot easier!
            else {
                this.parser = new Symple.ChunkedParser(this);
            }
        }
        else if (xhr.readyState == 3) {
            //Symple.log('MJPEGBase64MXHR: Data: ', xhr.readyState)     
        
            if (isNaN(xhr.numParsed)) {
                xhr.numParsed = 0;
            
                // Set playing state when we get the initial packet
                //if (!this.player.playing) {
                //    this.setState('playing');
                //}
            }
            
            if (!this.contentType)
                this.contentType = xhr.getResponseHeader("Content-Type") ? 
                    xhr.getResponseHeader("Content-Type") : 'image/jpeg';                    
        
            // TODO: Reset XHR every now and again to free responseText buffer
            var length = xhr.responseText.length,
                frame = xhr.responseText.substring(xhr.numParsed, length);
            if (frame.length)          
                xhr.numParsed += this.parser.process(frame);   
        }
        else if (xhr.readyState == 4) {
            this.onComplete(xhr.status);
            
            // Free the XHR: http://phptouch.com/2011/08/02/xmlhttprequest-leak-in-ie-78/
            xhr.onreadystatechange = new Function; //empty function
            xhr = null;
        }
    },
    
    onComplete: function(status) {
        //Symple.log('MJPEGBase64MXHR: Complete: ', status)        
        if (this.player.playing) {
            stop();
            this.player.displayMessage('info', 'Streaming ended: Connection closed by peer.');
            return;
        }
        
        if (status == 200)
            this.setError('Streaming connection failed: Not a multipart stream.' + 
                Symple.Media.BrowserCompatabilityMsg);
        else
            this.setError('Streaming connection failed.' + 
                Symple.Media.BrowserCompatabilityMsg);
    }
});


// -----------------------------------------------------------------------------
// Pseudo MJPEG Engine
// 
// - No memory leaks in Chrome (others untested)
// - One image per request
// - Can acheive seamless playback with reasonable framerates
//
Symple.Media.registerEngine({
    id: 'PseudoMJPEG',
    name: 'Pseudo MJPEG',
    formats: 'MJPEG, JPEG',
    preference: 0, // too crap to be auto chosen
    support: (function() {
        return true;
    })()
});

Symple.Player.Engine.PseudoMJPEG = Symple.Player.Engine.extend({
    init: function(player) {
        this._super(player);
        this.lastImage = null;
        if (!this.player.options.threads)
            this.player.options.threads = 2;

        $.ajaxSetup({cache: false});
    },

    play: function(params) {
        this._super(params);        
        Symple.log('PseudoMJPEG: Play: ', this.params)     
        
        // Load an image for each thread
        for (var i = 0; i < this.player.options.threads; ++i)
            this.loadNext();
    },

    stop: function() {
        Symple.log('Symple PseudoMJPEG: stop');
        this.player.playing = false;
        if (this.lastImage) {
            this.free(this.lastImage);
            this.lastImage = null;
        }
        this.player.screen.html('');
        this.setState('stopped');
    },

    loadNext: function() {
        var self = this;
        var img = new Image();
        img.seq = this.seq;
        img.self = this;
        img.style.position = "absolute";
        img.style.left = 0;
        img.style.zIndex = -1; // hide until loaded    
        img.style.width = '100%';
        img.style.height = '100%';
        //img.width = this.player.options.screenWidth;
        //img.height = this.player.options.screenHeight;
        img.onload = function() {
            Symple.log('Symple PseudoMJPEG: Onload');
            
            // Set playing state when the first image loads
            if (self.player.state == 'loading')        
                self.setState('playing');       
            
            self.show.call(self, this);
        }
        Symple.log('Symple PseudoMJPEG: loadNext', this.seq );
        if (this.seq < 5) {
            img.onerror = function() {
                Symple.log('Symple PseudoMJPEG: OnError');
                self.free(img);
                self.setError('Streaming connection failed.');
            }
        }
        //img.onload = this.onError;
        img.src = this.params.url + "&seq=" + this.seq;
        this.player.screen.prepend(img);
    },

    show: function(img) {
         Symple.log('Symple PseudoMJPEG: Show');
        if (!this.player.playing)        
            return;

        // drop stale fames to avoid jerky playback
        if (this.lastImage &&
            this.lastImage.seq > img.seq) {
            this.free(img);
            Symple.log('Symple PseudoMJPEG: Dropping: ' + img.seq + ' < ' + this.lastImage.seq);
            return;
        }

        // bring new image to front
        img.style.zIndex = img.seq;

        // free last image
        if (this.lastImage)
            this.free(this.lastImage);

        this.lastImage = img;   
        this.displayFPS(); // required to increment seq
        this.loadNext();
    },

    free: function(img) {
        img.parentNode.removeChild(img);
    },
        
    setError: function(error) {
        Symple.log('Symple PseudoMJPEG: Error:', error);
        this.setState('error', error);
    }
});



    
    /*

    onLoad: function() {
        var self = this.self;
        Symple.log('Symple PseudoMJPEG: Onload: ', self.seq);
        
        // Set playing state when the firtst image loads
        if (self.player.state == 'loading')        
            self.setState('playing');            
            return;
        
        self.show.call(self, this);
    },
    
    // NOTE: This never fires in latest chrome  
    // when the remote side disconnects stream.
    onError: function() {
        var self = this.self;
        self.setError('Streaming connection failed.');
    },
    */
    /*
    resize: function(width, height) {
        if (this.img) {
            this.img.width = width;
            this.img.height = height;
        }
    }
    */

        
            
        //if (this.lastImage) {
            //this.img.style.display = 'none';
            //this.img.src = "#"; // closes socket in ff, but not safari
            //this.img = null;
            //this.player.screen[0].removeChild(this.img);
        //}
                
                /*
                    //if (self.img.style)
                    //    self.img.style.display = 'inline';
                self.processChunk();
    processChunk: function() {        
        
        // Take the substring that we haven't seen yet.
        //var data = this.xhr.responseText.substring(request.numParsed);
        //this.xhr.numParsed = this.xhr.responseText.length;
        this.parser.process(frame);
        // HTTP Streaming
        if (!this.parsing) {
        }
        
        // Multipart
        else {
        }
    },
        */
    /*
    url: function() {            
        return this.params.url + "&seq=" + this.seq + "&rand=" + Math.random();
    },
    
    resize: function(width, height) {
        // nothing to do
    },
    */

        
//return "http://" + this.player.options.host + ":" + this.player.options.port + this.player.options.uri +
//    "&width=" + this.player.options.encodeWidth + "&height=" +
//    this.player.options.encodeHeight + "&seq=" + (++this.seq) + "&rand=" + Math.random()

//img.self = this;
//img.width = this.player.options.screenWidth;
//img.height = this.player.options.screenHeight;