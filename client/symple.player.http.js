// -----------------------------------------------------------------------------
// Native MJPEG Engine
//
// - No longer works in iOS 6
//
Symple.Player.Engine.MJPEG = Symple.Player.Engine.extend({
    init: function(player) {
        this._super(player);
        this.img = null;
    },

    supported: function() {  
        // There must be a better way, but this will do for now.
        // TODO: iOS 6 does not support this anymore :(
        var ua = navigator.userAgent;
        return !ua.match(/(Android|BlackBerry|MSIE|Opera)/);
    },
    
    cleanup: function() {
        if (this.img) {
            this.img.style.display = 'none';
            this.img.src = "#"; // closes socket in ff, but not safari
            this.img.onload = null;
            this.img.onerror = null;
            this.player.screen[0].removeChild(this.img);
            this.img = null;
        }
    },

    play: function(params) {      
        this.params = params;
        console.log("Symple MJPEG Player: Play", params);
        
        if (this.img)
          throw 'Streaming already initialized'
        if (!this.player.options.url)
          throw 'Invalid streaming URL'
        
        var self = this;
        var init = true;
        this.img = new Image();
        //this.img.style.width = '100%';
        this.img.style.height = '100%';
        //this.img.width = this.player.options.screenWidth;
        //this.img.height = this.player.options.screenHeight;
        this.img.style.display = 'none';
        this.img.onload = function() {
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
            self.setError('Failed to load stream')
            this.setError(
              'Could not initialize video streaming.<br>\
              Download the latest version <a href="www.google.com/chrome/">Chrome</a> or \
              <a href="http://www.apple.com/safari/">Safari</a> to view this video stream.');
        }
        this.img.src = this.player.options.url + "&rand=" + Math.random();
        this.player.screen.prepend(this.img);        
    },
    
    setError: function(error) {
        console.log('Symple MJPEG Engine: Error:', error);
        this.cleanup();
        this.setState('error', error);
    },

    stop: function() {
        console.log("Symple MJPEG Player: Stop");
        this.cleanup();
        this.setState('stopped');
    }
});


// -----------------------------------------------------------------------------
//
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
//
Symple.Player.Engine.MJPEGBase64MXHR = Symple.Player.Engine.extend({
    init: function(player) {
        this._super(player);
        this.xhr = null;
        this.img = null;
        this.mime = null;
        this.parsing = false;
        this.parsed = 0;
        this.boundary = 0;
    },

    play: function() {
        if (this.img)
          throw 'Streaming already initialized'
        if (!this.player.options.url)
          throw 'Invalid streaming URL'

        // These versions of XHR are known to work with MXHR
        try { this.xhr = new ActiveXObject('MSXML2.XMLHTTP.6.0'); } catch(nope) {
            try { this.xhr = new ActiveXObject('MSXML3.XMLHTTP'); } catch(nuhuh) {
                try { this.xhr = new XMLHttpRequest(); } catch(noway) {
                    throw new Error('Could not find supported version of XMLHttpRequest.');
                }
            }
        }
          
        console.log('Symple MJPEGBase64MXHR: Play: ', this.player.options.url)
        
        this.img = new Image();
        //this.img.style.width = '100%';
        this.img.style.height = '100%';
        //this.img.width = this.player.options.screenWidth;
        //this.img.height = this.player.options.screenHeight;
        this.player.screen.prepend(this.img);

        var self = this;
        var init = true;
        this.xhr.onreadystatechange = function() {
            //console.log('Symple MJPEGBase64MXHR: Ready State Change: ', self.xhr.readyState)

            // If a multipart/x-mixed-replace header is received then we will
            // be parsing the multipart response ourselves. 
            // Some browsers like Safari WebKit (not Chrome) handle this internally
            // so we don't require any fancy parsing. 
            // The same is also the case for HTTP Streaming.
            if (self.xhr.readyState == 2) {             
                var contentTypeHeader = self.xhr.getResponseHeader("Content-Type");
                console.log('Symple MJPEGBase64MXHR: Content Type Header: ', contentTypeHeader)
                if (contentTypeHeader &&
                    contentTypeHeader.indexOf("multipart/") != -1) {
                    // TODO: Handle boundaries enclosed in commas
                    self.boundary = '--' + contentTypeHeader.split('=')[1];
                    self.parsing = true;
                }
            }
            else if (self.xhr.readyState == 3) {
                self.processChunk();
                if (init) {
                    init = false;
                    if (self.img.style)
                        self.img.style.display = 'inline';
                    self.setState('playing');
                }
            }
            if (self.xhr.readyState == 4) {
                self.onComplete(self.xhr.status);
            }
        };
        this.xhr.open('GET', this.player.options.url, true);
        this.xhr.send(null);
    },

    stop: function() {
        if (this.xhr) {
            this.xhr.abort();
        }
        if (this.img) {
            this.player.screen[0].removeChild(this.img);
            this.img.style.display = 'none';
            this.img.src = "#"; // closes socket in ff, but not safari
            this.img = null;
        }
        this.setState('stopped');
    },
        
    processChunk: function() {
        var length = this.xhr.responseText.length,
            buffer = this.xhr.responseText.substring(this.parsed, length);

        if (!buffer.length) 
            return;
            
        // HTTP Streaming
        if (!this.parsing) {
            (!this.mime)
              this.mime = this.xhr.getResponseHeader("Content-Type") ? 
                  this.xhr.getResponseHeader("Content-Type") : 'image/jpeg';   
            this.draw(buffer);
            this.parsed += buffer.length;
        }
        
        // Multipart
        else {
            var res = this.incrParse(buffer);
            if (res[0] > 0) {
                this.processPart(res[1]);
                this.parsed += res[0];
                if (length > this.parsed)
                    this.processChunk();
            }
        }
    },

    processPart: function(part) { 
        //console.log('processPart: ', this.boundary)
        part = part.replace(this.boundary + "\r\n", '');
        var lines = part.split("\r\n");
        var headers = {};
        while(/^[-a-z0-9]+:/i.test(lines[0])) {
            var header = lines.shift().split(':');
            headers[header[0]] = header[1].trim();
            if (!this.mime) {
                if (header[0] == 'Content-Type')
                    this.mime = header[1].trim();
            }
        }
        var payload = lines.join("\r\n");
        this.draw(payload);
    },

    incrParse: function(buffer) {
        //console.log('incrParse:', buffer.length)
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
    },

    draw: function(data) {
        //console.log('Symple MJPEGBase64MXHR: Draw:', this.mime, data.length)
        this.img.src = 'data:' + this.mime + ';base64,' + data;
        this.displayFPS();
    },

    onComplete: function(status) {
        console.log('Symple MJPEGBase64MXHR: Complete: ', status)
        
        if (this.player.playing) {
            stop();
            this.processChunk();
            this.player.displayMessage('info', 'Streaming connection closed by remote peer');
        }
        else if (status == 200)
            this.setError('Not a multipart stream');
        else
            this.setError(
              'Could not initialize video streaming.<br>\
              Download the latest version <a href="www.google.com/chrome/">Chrome</a> or \
              <a href="http://www.apple.com/safari/">Safari</a> to view this video stream.');
    }
    
    /*
    resize: function(width, height) {
        if (this.img) {
            this.img.width = width;
            this.img.height = height;
        }
    }
    */
});