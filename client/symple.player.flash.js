// -----------------------------------------------------------------------------
// Flash => Javascript Object Bridge
//
var JFlashBridge = {
    items: {},

    bind: function(id, klass) {
        console.log('JFlashBridge: Bind: ', id, klass);
        this.items[id] = klass;
    },

    unbind: function(id) {
       delete this.items[id]
    },

    call: function() {
        //console.log('JFlashBridge: Call: ', arguments);
        var klass = this.items[arguments[0]];
        if (klass) {
            var method = klass[arguments[1]];
            if (method)
                method.apply(klass, Array.prototype.slice.call(arguments, 2));
            else
                console.log('JFlashBridge: No method: ', arguments[1]);
        }
        else
            console.log('JFlashBridge: No binding: ', arguments);
    },

    getSWF: function(movieName) {
        if (navigator.appName.indexOf("Microsoft") != -1)
            return window[movieName];
        return document[movieName];
    }
};


// -----------------------------------------------------------------------------
// Flash Engine
//
Symple.Media.registerEngine({
    id: 'Flash',
    name: 'Flash Player',
    // FLV-Speex is also an option, but currently omitted because of 
    // different flash player versions with inconsistent playback.
    formats: 'MJPEG, FLV, Speex', 
    preference: 40,
    support: (function() {
        return true;
    })()
});

Symple.Player.Engine.Flash = Symple.Player.Engine.extend({
    init: function(player) {
        console.log("SympleFlashEngine: Init");
        this._super(player);
        this.initialized = false;
        this.streamOnInit = false;
        this.id = "symple-player-" + Symple.randomString(6);
    },

    setup: function() {
        console.log("SympleFlashEngine: Create");
        this.initialized = false;
        this.player.screen.prepend('<div id="' + this.id + '">Flash version 10.0.0 or newer is required.</div>');
        
        JFlashBridge.bind(this.id, this);
        
        //console.log("SympleFlashEngine: SWF:", this.id, this.player.options.htmlRoot + '/symple.player.swf');
        swfobject.embedSWF(
            this.player.options.swf ? 
                this.player.options.swf : 
                this.player.options.htmlRoot + '/symple.player.swf', 
            this.id, '100%', '100%', '10.0.0',
            this.player.options.htmlRoot + '/playerProductInstall.swf', {
                //debug: true, // enable for debug output
            }, {
                quality: 'high',
                wmode: 'transparent',
                allowScriptAccess: 'sameDomain',
                allowFullScreen: 'true'
            }, {
                name: this.id
            });              
            
        
        // Flash swallows click events, so catch mousedown 
        // events and trigger click on screen element.        
        var self = this;
        this.player.screen.mousedown(function() {
            self.player.screen.trigger('click')
        });      
    },

    play: function(params) {        
        console.log("SympleFlashEngine: Play", params);        
        this.params = params;
        if (this.initialized) {
            console.log("SympleFlashEngine: Opening", params);
            this.swf().open(params);
            
            // Push through any pending candiates
            if (this.candidates) {
                for (var i = 0; i < this.candidates.length; i++) {
                    console.log("SympleFlashEngine: Add stored candidate", this.candidates[i]);
                    this.swf().addCandidate(this.candidates[i]);
                }
            }
        }
        else {            
            console.log("SympleFlashEngine: Waiting for SWF");
            this.streamOnInit = true;
        }
    },

    stop: function() {
        console.log("SympleFlashEngine: Stop");
        if (this.initialized) {
            this.swf().close();
            this.setState('stopped'); // No need to wait for callback
        }
    },

    swf: function() {
        return JFlashBridge.getSWF(this.id);
    },

    isJSReady: function() {
        console.log("SympleFlashEngine: JavaScript Ready: " + $.isReady);
        return $.isReady;
    },

    refresh: function() {
        console.log("SympleFlashEngine: Refresh");
        try {
          if (this.initialized)
            this.swf().refresh();
        } catch (e) {}
    },
    
    onRemoteCandidate: function(candidate) {
        if (this.params && this.params.url)
            throw "Cannot add candiate after explicit URL was provided."
           
        if (this.initialized) {
            console.log("SympleFlashEngine: Adding remote candiate ", candidate);
            this.swf().addCandiate(candidate);
        }        
        else {      
            console.log("SympleFlashEngine: Storing remote candiate ", candidate);
              
            // Store candidates while waiting for flash to load
            if (!this.candidates)
                this.candidates = [];      
            this.candidates.push(candidate);
        }            
    },
        
    onSWFLoaded: function() {
        console.log("SympleFlashEngine: Loaded");
        this.initialized = true;
        if (this.streamOnInit)     
            this.play(this.params);
    },

    onPlayerState: function(state, error) {
        // None, Loading, Playing, Paused, Stopped, Error
        state = state.toLowerCase();
        if (state == 'error' && (!error || error.length == 0))
            error = "Streaming connection to the host was lost."
        console.log("SympleFlashEngine: On state: ", state, error, this.player.state);
        if (state != 'none')
            this.setState(state, error);
    },

    onMetadata: function(data) {
        //console.log("SympleFlashEngine: Metadata: ", data);
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
        console.log('SympleFlashEngine: ' + type + ': ' + text);
    }
});