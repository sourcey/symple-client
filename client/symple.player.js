// ----------------------------------------------------------------------------
//
//  Symple Player
//
//  Example Markup:
//  <div id="player">
//    <div id="player-message">
//    </div>
//    <div id="player-status">
//    </div>
//    <div id="player-screen">
//    </div>
//    <div id="player-controls">
//      <a class="play-btn" rel="play" href="#">Play</a>
//      <a class="stop-btn" rel="stop" href="#">Stop</a>
//    </div>
//  </div>
//
// ----------------------------------------------------------------------------
Symple.Player = function(options) {
    this.options = $.extend({
        htmlRoot:       '/assetpipe/symple',
        element:        '#player',
        engine:         'auto',       // auto or engine class name
        screenWidth:    '100%',       // percentage or pixel value
        screenHeight:   '100%',       // percentage or pixel value

        // Streaming Parameters
        params: {
            format:      'MJPEG',
            protocol:    'HTTP'
        },

        // Callbacks
        onCommand:       function(player, cmd) { },
        onStateChange:   function(player, state) { }

    }, options);

    this.element = $(this.options.element);
    if (!this.element.length)
        throw 'The player element doesn\'t exist';
    
    this.screen = this.element.find('#player-screen');

    if (this.options.engine == 'auto')
        this.selectBestEngine(); // FIXME
    this.engine = new Symple.Player.Engine[this.options.engine](this);
    this.engine.create();

    this.playing = false;

    this.bindEvents();
    this.setState('stopped');

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
        if (this.state != 'playing' &&
            this.state != 'loading') {
            this.setState('loading');
            this.engine.play(); // engine updates state to playing
        }
    },

    stop: function() {
        if (this.state != 'stopped') {
            if (this.engine)
                this.engine.stop(); // engine updates state to stopped
        }
    },

    destroy: function() {
        if (this.engine)
            this.engine.destroy();
    },

    setState: function(state) {
        console.log('[Symple:Player] Setting State from ' + this.state + ' to ' + state)
        if (this.state == state)
            return;

        this.state = state;
        this.displayStatus('');
        this.displayMessage('');
        this.playing = state == 'playing';
        /*
        switch (state) {
            case 'stopped':
                break;
            case 'loading':
                break;
            case 'playing':
                break;
            case 'paused':
                break;
            case 'error':
                break;
        }
        */
        this.refresh();
        this.options.onStateChange(this, state);
    },

    //
    // Helpers
    //
    displayStatus: function(data) {
        this.element.find('#player-status').html(data);
    },

    // Display an overlayed player message
    // error, warning, info
    displayMessage: function(type, message) {
        if (type != '') {
            this.element.find('#player-message').attr('class', type).html('<p>' + message + '</p>');
            this.element.find('#player-message').show();
        }
        else {
            this.element.find('#player-message').html('');
            this.element.find('#player-message').hide();
        }
    },


    getButton: function(cmd) {
      return this.element.find('#player-controls a[rel="' + cmd + '"]');
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
        console.log('[Symple:Player] Rescale Video: ', srcW, srcH, maxW, maxH);

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
        /*
        //var e = this.element.find('#player-screen');
            //console.log('refresh: scaled:', size)
            console.log('refresh: screenWidth:', this.options.screenWidth)
            console.log('refresh: width:', this.screen.width())
            console.log('refresh: screenHeight:', this.options.screenHeight)
            console.log('refresh: height:', this.screen.height())
            console.log('refresh: css:', css)
        */
        console.log('[Symple:Player] Setting Size: ', css);

        this.screen.css(css);
    },

    bindEvents: function() {
        var self = this;
        this.element.find('#player-controls a').unbind().bind('click tap', function() {
            self.sendCommand(this.rel);
            return false;
        })

        /*
        // Support JQuery Mobile button markup
        this.element.find('#player-controls .ui-btn-text').click(function() {
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
    },

    // FIXME
    selectBestEngine: function() {
        var ua = navigator.userAgent;
        //var forcePseudo = this.options.engine == 'pseudo';

        // Safari has great MJPEG support.
        // BUG: The MJPEG socket is not closed until the page is refreshed.
        if (ua.match(/(Safari|iPhone|iPod|iPad)/))
            this.options.engine = 'mjpeg';

        // Android's WebKit has disabled multipart HTTP requests for
        // some stupid reason: http://code.google.com/p/android/issues/detail?id=301
        // Android support will have to wait untill Spot goes mjpeg.
        else if(ua.match(/(Android)/))
            this.options.engine = 'pseudo';

        // BlackBerry doesn't understand multipart/x-mixed-replace ... duh
        else if(ua.match(/(BlackBerry)/))
            this.options.engine = 'pseudo';

        // Internet Explorer... nuff said
        else if(ua.match(/(MSIE)/))
            this.options.engine = 'pseudo';

        // Firefox to the rescue! Nag user's to install firefox if mjpeg
        // streaming is unavailable.
        else if(ua.match(/(Mozilla)/))
            this.options.engine = 'mjpeg';

        // Opera does not support mjpeg MJPEG, but their home grown image
        // processing library is super fast so pseudo streaming is nearly
        // as fast as other mjpeg implementations!
        else if(ua.match(/(Opera)/))
            this.options.engine = 'pseudo';

        // Display a nag screen to install a real browser if we are is
        // pseudo streaming mode.
        if (this.options.engine == 'pseudo') { //!forcePseudo &&
            this.displayMessage('warning',
                'Unfortunately your browser does not support native streaming so playback preformance will be severely limited. ' +
                'For the best streaming experience <a href="http://www.mozilla.org/en-US/firefox/">click here</a> to download the firefox web browser.');
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

    create: function() {},
    destroy: function() {},
    play: function() {},
    stop: function() {},
    resize: function(w, h) {}
});


// -----------------------------------------------------------------------------
//
// Flash Engine
//
// -----------------------------------------------------------------------------
Symple.Player.Engine.Flash = Symple.Player.Engine.extend({
    init: function(player) {
        console.log("Flash Player: Init");
        this._super(player);
        this.initialized = false;
        this.playOnInit = false;
    },

    create: function(/*fn*/) {
        console.log("Flash Player: Create");
        this.initialized = false;
        //this.initFn = fn;
        this.player.screen.prepend('<div id="playerSwf">Flash version 10.0.0 or newer is required.</div>');
        JFlashBridge.bind('playerSwf', this);
        swfobject.embedSWF(this.player.options.htmlRoot + '/symple.player.swf', 'playerSwf',
            this.player.options.screenWidth, this.player.options.screenHeight, '10.0.0',
            this.player.options.htmlRoot + '/playerProductInstall.swf', {
            }, {
                quality: 'high',
                wmode: 'transparent',
                allowScriptAccess: 'sameDomain',
                allowFullScreen: 'true'
            }, {
                name: 'playerSwf'
            });        
    },

    play: function() {
        console.log("Flash Player: Play");
        if (this.initialized) {
            this.swf().open(this.player.options.params);
            this.player.setState('playing'); // TODO: Flash callback set state
        }
        else
            this.playOnInit = true;
    },

    stop: function() {
        console.log("Flash Player: Stop");
        if (this.initialized) {
            this.swf().stop();
            this.player.setState('stopped');
        }
    },

    swf: function() {
        return getSWF('playerSwf');
    },

    isJSReady: function() {
        console.log("JavaScript Ready Status: " + $.isReady);
        return $.isReady;
    },

    onSWFLoaded: function() {
        console.log("Flash Player Loaded");
        this.initialized = true;
        //if (this.initFn)
        //    this.initFn(true);
        if (this.playOnInit)
            this.play();
    },

    onPlayerState: function(state) {
        console.log("Flash Player State: ", state);
    },

    onMetadata: function(data) {
        //console.log("Flash Player Metadata: ", data);
        if (data&& data.length) {
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
        console.log(type, 'Flash Player: ' + text);
    }
});


// -----------------------------------------------------------------------------
//
// Native MJPEG Engine
//
// FIXME
//
// -----------------------------------------------------------------------------
Symple.Player.Engine.MJPEG = Symple.Player.Engine.extend({
    init: function(player) {
        this._super(player);
        this.img = null;
        this.prevTime = new Date().getTime();
        this.fps = 0;
        this.seq = 0;
    },

    create: function() {
    },

    play: function() {
        img =  document.getElementById("image");
        img.onload = this.onload;
        img.width = this.player.options.screenWidth;
        img.height = this.player.options.screenHeight;
        //img.style.width = '100%';
        //img.style.height = '100%';
        img.src = player.options.url + "&rand=" + Math.random();

        this.player.setState('playing');
    },

    stop: function() {
        if (img) {
            img.style.display = 'none';
            img.src = "#"; // closes socket in ff, but not safari
            img = null;
        }

        this.player.setState('stopped');
    },

    update: function() {
        // Only display status if we receive onload events for each image.
        // Only firefox appears does this.
        if (player && seq > 0) {
            var now = new Date().getTime();
            var delta = prevTime ? now - prevTime : 0;
            fps = (1000.0 / delta).toFixed(3);
            player.displayStatus(delta + " ms (" + fps + " fps)");
            prevTime  = now;
        }

        seq++;
    },

    onload: function() {
        if (this.style)
            this.style.display = 'block';

        update.call(window)
    }
});


// -----------------------------------------------------------------------------
//
// MXHR Base64 MJPEG Engine
//
// - Multipart data MUST be base64 encoded to use this engine.
// - Safari/WebKit parses and removes chunk headers and boundaries for us.
//
// -----------------------------------------------------------------------------
Symple.Player.Engine.MJPEGBase64MXHR = Symple.Player.Engine.extend({
    init: function(player) {
        this._super(player);
        this.xhr = null;
        this.img = null;
        this.prevTime = new Date().getTime();
        this.fps = 0;
        this.parsed = 0;
        this.boundary = 0;
    },

    create: function(fn) {
    },

    play: function() {
        var self = this;

        this.img = new Image();
        this.img.style.width = '100%';
        this.img.style.height = '100%';
        this.player.screen.prepend(this.img);

        // These versions of XHR are known to work with MXHR
        try { this.xhr = new ActiveXObject('MSXML2.XMLHTTP.6.0'); } catch(nope) {
            try { this.xhr = new ActiveXObject('MSXML3.XMLHTTP'); } catch(nuhuh) {
                try { this.xhr = new XMLHttpRequest(); } catch(noway) {
                    throw new Error('Could not find supported version of XMLHttpRequest.');
                }
            }
        }

        // If possible don't let the browser parse any data
        if (this.xhr.overrideMimeType)
            this.xhr.overrideMimeType('text/plain; charset=x-user-defined');
        this.xhr.onreadystatechange = function() {
            //console.log('[Symple.Player.Engine.MJPEGBase64MXHR] Ready State Change: ', self.xhr.readyState )

            // Safari does not return initial headers here, only chunk headers.
            if (self.xhr.readyState == 2 && !navigator.userAgent.match(/(AppleWebKit)/)) {
                var contentTypeHeader = self.xhr.getResponseHeader("Content-Type");
                if (contentTypeHeader &&
                    contentTypeHeader.indexOf("multipart/") == -1) {
                    // ERROR: Not multipart
                    self.player.displayMessage('error', 'Bad multipart response');
                    //xhr.abort(); // safari windows crash
                    return;
                } else
                    // TODO: Boundaries enclosed in commas
                    self.boundary = '--' + contentTypeHeader.split('=')[1];
            }
            else if (self.xhr.readyState == 3) {
                self.processChunk();
            }
            if (self.xhr.readyState == 4) {
                self.onComplete(self.xhr.status);
            }
        };
        this.xhr.open('GET', this.player.options.url, true);
        this.xhr.send(null);

        this.player.setState('playing');
    },

    stop: function() {
        if (this.xhr) {
            this.xhr.abort();
        }
        if (this.img) {
            this.img.style.display = 'none';
            this.img.src = "#"; // closes socket in ff, but not safari
            this.img = null;
        }
        this.player.setState('stopped');
    },

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

    processChunk: function() {
        var length = this.xhr.responseText.length,
            buffer = this.xhr.responseText.substring(this.parsed, length);

        if (navigator.userAgent.match(/(AppleWebKit)/)) {
            var mime = this.xhr.getResponseHeader("Content-Type");
            this.draw(mime, buffer);
            this.parsed += buffer.length;
        }
        else {
            // [this.parsed_length, header_and_payload]
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
        //console.log('processPart')
        part = part.replace(this.boundary + "\r\n", '');
        var lines = part.split("\r\n");
        var mime = null;
        var headers = {};
        while(/^[-a-z0-9]+:/i.test(lines[0])) {
            var header = lines.shift().split(':');
            headers[header[0]] = header[1].trim();
            if (header[0] == 'Content-Type')
                mime = header[1].trim();
        }

        var payload = lines.join("\r\n");
        this.draw(mime, payload);
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

    draw: function(mime, data) {
        //console.log('draw', mime, data.length)
        if (this.img.style)
            this.img.style.display = 'block';

        this.img.src = 'data:' + mime + ';base64,' + data;

        this.update();
    },

    onComplete: function(status) {
        this.processChunk();
        // ERROR
        this.player.displayMessage('info', 'The stream has ended');
        /*
        if (status >= 200 && status < 300) {
            invoke('complete', status);
        } else {
            invoke('error', status);
        }
        */
    }
    
    /*,

    resize: function(width, height) {
        if (img) {
            img.width = width;
            img.height = height;
        }
    }
    */
});




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

        this.displayStatus('');
        this.displayMessage('');

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
        '<iframe id="player-frame" ' +
            //' width="' + this.options.screenWidth + '" height="' + this.options.screenHeight + '" ' +
            ' marginwidth="0" marginheight="0" frameBorder="0" scrolling="no" ' +
            ' hspace="0" vspace="0">Your browser does not support iframes.</iframe>');

    this.element.find('#player-screen').html(this.iframe);
    //this.screen = window.document.frames["player-frame"].window;
    */