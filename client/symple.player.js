// ----------------------------------------------------------------------------
//
//  Symple Player
//
// ----------------------------------------------------------------------------
Symple.Player = function(options) {
    this.options = $.extend({
        htmlRoot:       '/assetpipe/symple/client',
        element:        '.symple-player:first',
        engine:         'MJPEG',      // engine class name
        screenWidth:    '100%',       // player screen css width (percentage or pixel value)
        screenHeight:   '100%',       // player screen css height (percentage or pixel value)

        // Streaming Parameters
        params: {
            format:      'MJPEG',
            protocol:    'HTTP'
        },

        // Callbacks
        onCommand:       function(player, cmd) { },
        onStateChange:   function(player, state) { },
        
        // Markup
        template: '\
        <div class="symple-player"> \
            <div class="symple-player-message"></div> \
            <div class="symple-player-status"></div> \
            <div class="symple-player-screen"></div> \
            <div class="symple-player-controls"> \
                <a class="play-btn" rel="play" href="#">Play</a> \
                <a class="stop-btn" rel="stop" href="#">Stop</a> \
            </div> \
        </div>'

    }, options);

    this.element = $(this.options.element);
    if (!this.element.hasClass('symple-player')) {
        this.element.html(this.options.template);
        this.element = this.element.children('.symple-player:first');
    }
    if (!this.element.length)
        throw 'Player element not found';
    
    this.screen = this.element.find('.symple-player-screen');
    if (!this.screen.length)
        throw 'Player screen element not found';

    if (typeof Symple.Player.Engine[this.options.engine] == 'undefined')
        throw 'Streaming engine not available';   
    this.engine = new Symple.Player.Engine[this.options.engine](this);
    if (!this.engine.supported())
        throw 'Streaming engine not supported';      
    this.engine.setup();

    this.bindEvents();
    this.playing = false;
    //this.setState('stopped');

    var self = this;
    $(window).resize(function() {
        self.refresh();
    });
}


Symple.Player.prototype = {

    //
    // Player Controls
    //
    play: function() {
        console.log('Symple Player: Play')
        try {    
            if (this.state != 'playing' //&&
                // The player may be set to loading state by the
                // outside application before play is called.
                //this.state != 'loading'
                ) {
                this.setState('loading');
                this.engine.play(); // engine updates state to playing
            }
        } catch (e) {
            this.setState('error');      
            this.displayMessage('error', e)
            throw e;
        } 
    },

    stop: function() {
        console.log('Symple Player: Stop')
        if (this.state != 'stopped') {
            if (this.engine)
                this.engine.stop(); // engine updates state to stopped
        }
    },

    destroy: function() {
        if (this.engine)
            this.engine.destroy();
    },

    setState: function(state, message) {
        console.log('Symple Player: Setting State from ', this.state, ' to ', state)
        if (this.state == state)
            return;
        
        this.state = state;
        this.displayStatus(null);
        this.displayMessage(null);
        this.playing = state == 'playing';
        this.element.removeClass('state-stopped state-loading state-playing state-paused state-error');
        this.element.addClass('state-' + state);
        this.refresh();
        this.options.onStateChange(this, state);
    },

    //
    // Helpers
    //
    displayStatus: function(data) {
        this.element.find('.symple-player-status').html(data ? data : '');
    },

    // Display an overlayed player message
    // error, warning, info
    displayMessage: function(type, message) {
        if (message) {
            console.log('Symple Player: Display Message:', message)
            this.element.find('.symple-player-message').html('<p class="' + type + '">' + message + '</p>');
            this.element.find('.symple-player-message').show();
        }
        else {
            console.log('Symple Player: Hiding Message')
            this.element.find('.symple-player-message').html('');
            this.element.find('.symple-player-message').hide();
        }
    },


    getButton: function(cmd) {
      return this.element.find('.symple-player-controls a[rel="' + cmd + '"]');
    },

    getBestVideoResolution: function() {
        var w = $(window).width();
        var width = w > 800 ?
          800 : w > 640 ?
          640 : w > 480 ?
          400 : w > 320 ?
          320 : w > 240 ?
          240 : w > 160 ?
          160 : w > 128 ?
          128 : 96;
        var height = width * 0.75;
        return [width, height];
    },

    rescaleVideo: function(srcW, srcH, maxW, maxH) {
        console.log('Symple Player: Rescale Video: ', srcW, srcH, maxW, maxH);

        var maxRatio = maxW / maxH;
        var srcRatio = 1.33; //srcW / srcH;
        if (srcRatio < maxRatio) {
            srcH = maxH;
            srcW = srcH * srcRatio;
        } else {
            srcW = maxW;
            srcH = srcW / srcRatio;
        }

        return [srcW, srcH];
    },

    refresh: function() {
        /*
        var css = { position: 'relative' };
        if (this.options.screenWidth == '100%' ||
            this.options.screenHeight == '100%') {
            var size = this.rescaleVideo(this.screen.outerWidth(), this.screen.outerHeight(),
                this.element.outerWidth(), this.element.outerHeight());
            css.width = size[0];
            css.height = size[1];
            css.left = this.element.outerWidth() / 2 - css.width / 2;
            css.top = this.element.outerHeight() / 2 - css.height / 2;
            css.left = css.left ? css.left : 0;
            css.top = css.top ? css.top : 0;
            if (this.engine)
                this.engine.resize(css.width, css.height);
        }
        else {
            css.width = this.options.screenWidth;
            css.height = this.options.screenHeight;
            css.left = this.element.outerWidth() / 2 - this.options.screenWidth / 2;
            css.top = this.element.outerHeight() / 2 - this.options.screenHeight / 2;
            css.left = css.left ? css.left : 0;
            css.top = css.top ? css.top : 0;
        }
        console.log('Symple Player: Setting Size: ', css);

        this.screen.css(css);

        //var e = this.element.find('#player-screen');
            //console.log('refresh: scaled:', size)
            console.log('refresh: screenWidth:', this.options.screenWidth)
            console.log('refresh: width:', this.screen.width())
            console.log('refresh: screenHeight:', this.options.screenHeight)
            console.log('refresh: height:', this.screen.height())
            console.log('refresh: css:', css)
        */
    },

    bindEvents: function() {
        var self = this;
        this.element.find('.symple-player-controls a').unbind().bind('click tap', function() {
            self.sendCommand(this.rel);
            return false;
        })

        /*
        // Support JQuery Mobile button markup
        this.element.find('.symple-player-controls .ui-btn-text').click(function() {
            var cmd = $(this).parents('.ui-btn:first').find('a').attr('rel');
            self[cmd]();
            self.options.onCommand(self, cmd);
            return false;
        })
        */
    },

    sendCommand: function(cmd) {
        if (!this.options.onCommand ||
            !this.options.onCommand(this, cmd)) {

            // If there is no command callback function or the callback returns
            // false then we process these default behaviours.
            switch(cmd) {
              case 'play':
                  this.play();
                  break;
              case 'stop':
                  this.stop();
                  break;
            }
        }
    }
}


// -----------------------------------------------------------------------------
//
// Player Engine Interface
//
// -----------------------------------------------------------------------------
Symple.Player.Engine = Class.extend({
    init: function(player) {
        this.player = player;
    },

    //
    // Methods
    //
    supported: function() { return true; },
    setup: function() {},
    destroy: function() {},
    play: function() {},
    stop: function() {},
    resize: function(w, h) {},

    //
    // Helpers
    //
    setState: function(state) {
        this.player.setState(state);
    },
    
    setError: function(reason) {
        this.setState('error');
        if (reason)
            this.player.displayMessage('error', reason)
    },

    updateFPS: function() {
        if (typeof this.fps == 'undefined') {
            this.fps = 0;
            this.seq = 0;
            this.prevTime = new Date().getTime();
        }
        else if (this.seq > 0) {
            var now = new Date().getTime();
            this.delta = this.prevTime ? now - this.prevTime : 0;
            this.fps = (1000.0 / this.delta).toFixed(3);
            this.prevTime  = now;
        }
        this.seq++;
    },
    
    displayFPS: function() {
        this.updateFPS()
        this.player.displayStatus(this.delta + " ms (" + this.fps + " fps)");
    }
});


// -----------------------------------------------------------------------------
//
// Flash Engine
//
// -----------------------------------------------------------------------------
Symple.Player.Engine.Flash = Symple.Player.Engine.extend({
    init: function(player) {
        console.log("Symple Flash Player: Init");
        this._super(player);
        this.initialized = false;
        this.playOnInit = false;
        this.id = "symple-player-" + Sourcey.randomString(6)
    },

    setup: function(/*fn*/) {
        console.log("Symple Flash Player: Create");
        this.initialized = false;
        //this.initFn = fn;
        this.player.screen.prepend('<div id="' + this.id + '">Flash version 10.0.0 or newer is required.</div>');
        JFlashBridge.bind(this.id, this);
        swfobject.embedSWF(this.player.options.htmlRoot + '/symple.player.swf', this.id,
            this.player.options.screenWidth, this.player.options.screenHeight, '10.0.0',
            this.player.options.htmlRoot + '/playerProductInstall.swf', {
            }, {
                quality: 'high',
                wmode: 'transparent',
                allowScriptAccess: 'sameDomain',
                allowFullScreen: 'true'
            }, {
                name: this.id //'playerSwf'
            });        
    },

    play: function() {
        console.log("Symple Flash Player: Play");
        if (this.initialized) {
            this.swf().open(this.player.options.params);
            this.setState('playing'); // TODO: Flash callback set state
        }
        else
            this.playOnInit = true;
    },

    stop: function() {
        console.log("Symple Flash Player: Stop");
        if (this.initialized) {
            this.swf().stop();
            this.setState('stopped');
        }
    },

    swf: function() {
        return getSWF(this.id);
    },

    isJSReady: function() {
        //console.log("Symple Flash Player: JavaScript Ready: " + $.isReady);
        return $.isReady;
    },

    onSWFLoaded: function() {
        console.log("Symple Flash Player: Loaded");
        this.initialized = true;
        //if (this.initFn)
        //    this.initFn(true);
        if (this.playOnInit)
            this.play();
    },

    onPlayerState: function(state) {
        //console.log("Symple Flash Player: State: ", state);
    },

    onMetadata: function(data) {
        //console.log("Symple Flash Player: Metadata: ", data);
        if (data && data.length) {
            var status = '';
            for (var i = 0; i < data.length; ++i) {
                status += data[i][0];
                status += ': ';
                status += data[i][1];
                status += '<br>';
            }
            this.player.displayStatus(status);
        }
    },

    onLogMessage: function(type, text) {
        console.log(type, 'Symple Flash Player: ' + text);
    }
});


// -----------------------------------------------------------------------------
//
// Native MJPEG Engine
//
// -----------------------------------------------------------------------------
Symple.Player.Engine.MJPEG = Symple.Player.Engine.extend({
    init: function(player) {
        this._super(player);
        this.img = null;
    },

    supported: function() {  
        // There must be a better way, 
        // but this will do for now.
        var ua = navigator.userAgent;
        return !ua.match(/(Android|BlackBerry|MSIE|Opera)/);
    },

    play: function() {      
        console.log("Symple MJPEG Player: Play");
        
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
            // NOTE: Using init flag since Firefox calls onload
            // on each multipart image load. 
            // Most browsers inclusing WebKit just call it once.
            if (init) {
                if (self.img)
                    self.img.style.display = 'inline';
                self.setState('playing');
                init = false;
            }
            else
                self.displayFPS();
        }
        this.img.onerror = function() {
            self.setError('Failed to load stream')
        }
        this.img.src = this.player.options.url + "&rand=" + Math.random();
        this.player.screen.prepend(this.img);        
    },

    stop: function() {
        console.log("Symple MJPEG Player: Stop");
        if (this.img) {
            this.img.style.display = 'none';
            this.img.src = "#"; // closes socket in ff, but not safari
            this.img.onload = null;
            this.img.onerror = null;
            console.log("Symple MJPEG Player: Stop: ", this.img);
            this.player.screen[0].removeChild(this.img);
            this.img = null;
        }
        console.log("Symple MJPEG Player: Stop: OK");
        this.setState('stopped');
    }
});


// -----------------------------------------------------------------------------
//
// MXHR Base64 MJPEG Engine
//
// - Multipart data MUST be base64 encoded to use this engine.
// - Provides smooth playback in browsers that don't support MJPEG natively.
// - Chrome doesn't support multipart/x-mixed-replace over XMLHttpRequest,
//   which is required for some older browsers to trigger readyState == 3.
//   Server side for Chrome should just push data to the client (HTTP Streaming). 
// - Safari WebKit, and Firefox (tested on 15.0.1) parses and removes chunk
//   headers and boundaries for us.
//
// -----------------------------------------------------------------------------
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
          
        //console.log('Symple MJPEGBase64MXHR: Play: ', this.player.options.url)
        
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
        console.log('processPart: ', this.boundary)
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
        console.log('incrParse:', buffer.length)
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
            this.player.displayMessage('info', 'The stream has ended');
        }
        else if (status == 200)
            this.setError('Not a multipart stream');
        else
            this.setError('Streaming failed');
    },

    resize: function(width, height) {
        if (this.img) {
            this.img.width = width;
            this.img.height = height;
        }
    }
});


          
        
        //
        
        // TODO: error?        
        /*                
        if (status >= 200 && status < 300) {
            invoke('complete', status);
        } else {
            invoke('error', status);
        }
        */
        // If possible don't let the browser parse any data
        //if (this.xhr.overrideMimeType)
        //    this.xhr.overrideMimeType('text/plain; charset=x-user-defined');


            
                // For other browsers we need to parse the multipart response ourselves.
                
                // If no multipart header was given we can still support
                // HTTP streaming, so long as the browser does.
                //else {
                    // ERROR: Not a multipart response
                    //self.setError('Bad multipart response');
                    //xhr.abort(); // safari windows crash
                    //return;
                //}
                                  
                // Safari WebKit handles multipart responses internally, and does not 
                // return initial headers here, only chunk headers, so there is no 
                // need to determine the boundary for parsing.
                //if (navigator.userAgent.match(/(AppleWebKit)/))
                //    return;   

        
        /* //navigator.userAgent.match(/(Chrome)/)) {
            //var mime = this.xhr.getResponseHeader("Content-Type");
            //console.log('##### Symple MJPEGBase64MXHR: Chrome: ', buffer)
            //console.log('Symple MJPEGBase64MXHR:  Access-Control-Allow-Origin: ', this.xhr.getResponseHeader("Cache-Control"))
        // Safari
        // TODO: Test latest version
        else if (navigator.userAgent.match(/(AppleWebKit)/)) {        
            this.draw(mime, buffer);
            this.parsed += buffer.length;
        }
        */

    /*
    update: function() {
        if (this.player && this.seq > 0) {
            var now = new Date().getTime();
            var delta = this.prevTime ? now - prevTime : 0;
            this.fps = (1000.0 / delta).toFixed(3);
            this.player.displayStatus(delta + " ms (" + this.fps + " this.fps)");
            this.prevTime  = now;
        }

        this.seq++;
    },
    */
    
    /*
    */


        
        /*
        if (this.player && this.seq > 0) {
            var now = new Date().getTime();
            var delta = this.prevTime ? now - this.prevTime : 0;
            this.fps = (1000.0 / delta).toFixed(3);
            this.player.displayStatus(delta + " ms (" + fps + " fps)");
            this.prevTime  = now;
        }        

        this.seq++;
        */  
    /*
    ,
    onload: function() {
        if (this.style)
            this.style.display = 'inline';

        this.update().call(window)
    }
    */







        
        //this.onload;
        //this.img.width = this.player.options.screenWidth;
        //this.img.height = this.player.options.screenHeight;
        //this.img = document.getElementById("image");
        //this.img.style.width = '100%';
        //this.img.style.height = '100%';




/*
Symple.Player.Engine.Flash = function(player) {
    this.player = player;
    //this.playing = false;
}

Symple.Player.Engine.Flash.prototype = {
*/
/*
// -----------------------------------------------------------------------------
//
// Pseudo MJPEG Engine
//
// -----------------------------------------------------------------------------
function PseudoMJPEGEngine(player) {
    this.player = player;
    this.playing = false;
    this.lastImage = null;
    this.fps = 0;
    this.seq = 0;

    $.ajaxcreate({cache: false});
}

PseudoMJPEGEngine.prototype = {

    play: function() {
        //console.log('PseudoMJPEGEngine:play');
        this.playing = true;
        for (var i = 0; i < this.player.options.threads; ++i) {
            this.loadNext();
        }
    },

    stop: function() {
        //console.log('PseudoMJPEGEngine:stop');
        this.playing = false;
        //this.player.element.find('#player-screen').html('');
    },

    resize: function(width, height) {
        // nothing to do
    },

    loadNext: function() {
        var img = new Image();
        img.style.position = "absolute";
        img.style.zIndex = -1;
        img.onload = this.onload; //Symple.Player.
        img.width = this.player.options.screenWidth;
        img.height = this.player.options.screenHeight;
        img.src = this.url();
        img.self = this;
        img.seq = this.seq;
        this.player.screen.prepend(img);
    },

    onload: function() {
        ////console.log('PseudoMJPEGEngine:onload');
        this.self.update.call(this.self, this);
    },

    update: function(img) {
        ////console.log('PseudoMJPEGEngine:update');

        if (!this.playing)
            return;

        // drop old fames to avoid jerky playback
        if (this.lastImage &&
            this.lastImage.seq > img.seq) {
            this.free(img);
            ////console.log('PseudoMJPEGEngine:Dropping: ' + img.seq + ' < ' + this.lastImage.seq);
            return;
        }

        // bring new image to front!
        img.style.zIndex = img.seq;

        var now = new Date().getTime();
        var delta = 0;
        if (this.lastImage) {
            this.free(this.lastImage);
            delta = now - this.lastImage.time;
            this.fps = (1000.0 / delta).toFixed(3);
        }

        this.player.displayStatus(delta + " ms (" + this.fps + " fps)");
        this.lastImage = img;
        this.lastImage.time = now;
        this.loadNext();
    },

    free: function(img) {
        img.parentNode.removeChild(img);
        this.lastImage.src = "#";
    },

    url: function() {
        return "http://" + this.player.options.spotIP + ":" + this.player.options.spotPort + this.player.options.url +
            "?channel=" + this.player.options.channel + "&width=" + this.player.options.encodeWidth + "&height=" +
            this.player.options.encodeHeight + "&seq=" + (++this.seq) + "&rand=" + Math.random()
    }
}


// -----------------------------------------------------------------------------
//
// Native MJPEG Engine
//
// -----------------------------------------------------------------------------
function NativeMJPEGEngine(player) {
    this.player = player;
    this.prevTime = new Date().getTime();
    this.fps = 0;
}

NativeMJPEGEngine.prototype = {

    play: function() {
        //console.log('NativeMJPEGEngine:play');
        this.img = new Image();
        this.img.onload = this.onload;
        //this.img.width = this.player.options.screenWidth;
        //this.img.height = this.player.options.screenHeight;
        $(this.img).width('100%');
        $(this.img).height('100%');
        this.img.src = this.url();
        this.img.self = this;
        this.player.screen.html(this.img);
    },

    stop: function() {
        console.log('NativeMJPEGEngine:stop');
        if (this.img) {
            console.log('NativeMJPEGEngine:stop this.img.src: ' + this.img.src);
            this.img.src = "#"; // closes socket in ff, but not safari
            this.img.parentNode.removeChild(this.img);
            this.img = null;
        }
        this.player.reload(); //element.find('#player-screen').html('');
    },

    resize: function(width, height) {
        if (this.img) {
            this.img.width = width;
            this.img.height = height;
        }
    },

    onload: function() {
        this.self.update.call(this.self, this);
    },

    update: function(img) {
        ////console.log('NativeMJPEGEngine::onload');
        var now = new Date().getTime();
        var delta = this.prevTime ? now - this.prevTime : 0;
        this.fps = (1000.0 / delta).toFixed(3);
        this.player.displayStatus(delta + " ms (" + this.fps + " fps)");
        this.prevTime  = now;
    },

    url: function() {
        return "http://" + this.player.options.spotIP + ":" + this.player.options.spotPort + this.player.options.url +
            "?format=" + this.player.options.format + "&transport=" + this.player.options.transport + "&channel=" + this.player.options.channel +
            "&width=" + this.player.options.encodeWidth + "&height=" + this.player.options.encodeHeight + "&rand=" + Math.random()
    }
}

*/


    /*
    reload: function(fn) {
        var self = this;

        //if (this.engine)
        //    this.engine.stop();

        this.displayStatus(null);
        this.displayMessage(null);

        if (fn)
            fn.call(this, self);

        this.iframe.hide();
        this.iframe.attr('src', this.options.htmlRoot + '/symple.player.frame.html'); //http://localhost:3000/' + this.options.engine + '?' + Math.random()
        this.iframe.one('load', function() {
            console.log('onload');
            self.iframe.show();
            //self.engine = this.contentWindow;
            //self.engine.player = self;
            //self.screen = self.iframe.contents().find('body');
            self.refresh();
            if (fn)
                fn.call(this, self);
        });
    },
    */

    /*
    //this.playing = false;
    //this.refresh();
        //encodeWidth:  'auto',     // auto, value
        //encodeHeight: 'auto',     // auto, value
        // Pseudo MJPEG Streaming
        //url:            '/snapshot',
        //threads:            1,
        // Recording
        //recordingURI: '/record',
    this.iframe = $(
        '<iframe class="symple-player-frame" ' +
            //' width="' + this.options.screenWidth + '" height="' + this.options.screenHeight + '" ' +
            ' marginwidth="0" marginheight="0" frameBorder="0" scrolling="no" ' +
            ' hspace="0" vspace="0">Your browser does not support iframes.</iframe>');

    this.element.find('#player-screen').html(this.iframe);
    //this.screen = window.document.frames["player-frame"].window;
    */