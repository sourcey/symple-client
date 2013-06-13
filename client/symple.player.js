// ----------------------------------------------------------------------------
//  Symple Player
//
//  Online video streaming for everyone
//  Requires JQuery
//
Symple.Player = Symple.Class.extend({
    init: function(options) {
        // TODO: Use our own options extend
        this.options = $.extend({
            htmlRoot:       '/assetpipe/symple/client',
            element:        '.symple-player:first',
            engine:         'MJPEG',      // engine class name
            screenWidth:    '100%',       // player screen css width (percentage or pixel value)
            screenHeight:   '100%',       // player screen css height (percentage or pixel value)
            showStatus:     false,
            assertSupport:  false,        // throws an exception if no browser support for given engine

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
                    <a class="fullscreen-btn" rel="fullscreen" href="#">Fullscreen</a> \
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

        /*
        //this.setState('stopped');
        var self = this;
        $(window).resize(function() {
            self.refresh();
        });
        */
    },

    //
    // Player Controls
    //
    play: function(params) {
        console.log('Symple Player: Play: ', params)
        try {    
            if (this.state != 'playing' //&&
                // The player may be set to loading state by the
                // outside application before play is called.
                //this.state != 'loading'
                ) {
                this.setState('loading');
                this.engine.play(params); // engine updates state to playing
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
        this.element.remove();
    },

    setState: function(state, message) {
        console.log('Symple Player: Set State:', this.state, '=>', state, message)
        if (this.state == state)
            return;
        
        this.state = state;
        this.displayStatus(null);
        this.playing = state == 'playing';
        if (message)
            this.displayMessage(state == 'error' ? 'error' : 'info', message);
        else
            this.displayMessage(null);
        this.element.removeClass('state-stopped state-loading state-playing state-paused state-error');
        this.element.addClass('state-' + state);
        //this.refresh();
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
        console.log('Symple Player: Display Message:', type, message)
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


    bindEvents: function() {
        var self = this;
        this.element.find('.symple-player-controls a').unbind().bind('click tap', function() {
            self.sendCommand(this.rel, $(this));
            return false;
        })
    },

    sendCommand: function(cmd, e) {
        if (!this.options.onCommand ||
            !this.options.onCommand(this, cmd, e)) {

            // If there is no command callback function or the callback returns
            // false then we process these default behaviours.
            switch(cmd) {
              case 'play':
                  this.play();
                  break;
              case 'stop':
                  this.stop();
                  break;
              case 'fullscreen':
                  this.toggleFullScreen();
                  break;
            }
        }
    },

    getButton: function(cmd) {
      return this.element.find('.symple-player-controls [rel="' + cmd + '"]');
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
    
    // TODO: Toggle actual player element
    toggleFullScreen: function() {  
    	if (Symple.runVendorMethod(document, "FullScreen") || Symple.runVendorMethod(document, "IsFullScreen")) {
          Symple.runVendorMethod(document, "CancelFullScreen");
      }
      else {
          Symple.runVendorMethod(this.element[0], "RequestFullScreen");
      }

        /*
        if (!document.fullscreenElement &&    // alternative standard method
            !document.mozFullScreenElement && !document.webkitFullscreenElement) {  // current working methods
            if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen();
            } else if (document.documentElement.mozRequestFullScreen) {
                document.documentElement.mozRequestFullScreen();
            } else if (document.documentElement.webkitRequestFullscreen) {
                document.documentElement.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
            }
        } 
        else {
            if (document.cancelFullScreen) {
                document.cancelFullScreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.webkitCancelFullScreen) {
                document.webkitCancelFullScreen();
            }
        }
        */
    }

    /*
    refresh: function() {
        if (this.engine)
            this.engine.refresh();
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
    },
    */
})


// -----------------------------------------------------------------------------
// Player Engine Interface
//
Symple.Player.Engine = Symple.Class.extend({
    init: function(player) {
        this.player = player;
    },

    //
    /// Methods
    supported: function() { return true; },
    setup: function() {},
    destroy: function() {},
    play: function(params) {},
    stop: function() {},
    refresh: function() {},

    //
    /// Helpers
    setState: function(state, message) {
        this.player.setState(state, message);
    },
    
    setError: function(error) {
        console.log('Symple Player Engine: Error:', error);
        this.setState('error', error);
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