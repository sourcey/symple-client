// -----------------------------------------------------------------------------
// Flash => Javascript Object Bridge
//
var JFlashBridge = {
    items: {},

    bind: function(id, klass) {
        this.items[id] = klass;
    },

    unbind: function(id) {
       delete this.items[id]
    },

    call: function() {
        //console.log('JFlashBridge: Call: ', arguments);
        try {
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
        }
        catch (e) {
            console.log('JFlashBridge Error: ', e);
        }
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
Symple.Player.Engine.Flash = Symple.Player.Engine.extend({
    init: function(player) {
        console.log("Symple Flash Player: Init");
        this._super(player);
        this.initialized = false;
        this.playOnInit = false;
        this.id = "symple-player-" + Symple.randomString(6)
    },

    setup: function(/*fn*/) {
        console.log("Symple Flash Player: Create");
        this.initialized = false;
        //this.initFn = fn;
        this.player.screen.prepend('<div id="' + this.id + '">Flash version 10.0.0 or newer is required.</div>');
        
        // TODO: Implement JFlashBridge locally
        JFlashBridge.bind(this.id, this);
        
        // swfobject.embedSWF(swfUrl, id, width, height, version, expressInstallSwfurl, flashvars, params, attributes, callbackFn)
        swfobject.embedSWF(this.player.options.htmlRoot + '/symple.player.swf', this.id,
            this.player.options.screenWidth, this.player.options.screenHeight, '10.0.0',
            this.player.options.htmlRoot + '/playerProductInstall.swf', {
                //debug: true,
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
        console.log("Symple Flash Player: Play", params);
        this.params = params; // if params
        if (this.initialized) {
            this.swf().open(params); //this.player.options.params
            //this.setState('playing'); // TODO: Flash callback set state
        }
        else
            this.playOnInit = true;
    },

    stop: function() {
        console.log("Symple Flash Player: Stop");
        if (this.initialized) {
            this.swf().stop();
            this.setState('stopped'); // No need to wait for callback
        }
    },

    swf: function() {
        return JFlashBridge.getSWF(this.id);
    },

    isJSReady: function() {
        //console.log("Symple Flash Player: JavaScript Ready: " + $.isReady);
        return $.isReady;
    },

    refresh: function() {
        console.log("Symple Flash Player: Refresh");
        try {
          if (this.initialized)
            this.swf().refresh();
        } catch (e) {}
    },
        
    onSWFLoaded: function() {
        console.log("Symple Flash Player: Loaded");
        this.initialized = true;
        //if (this.initFn)
        //    this.initFn(true);
        if (this.playOnInit)
            this.play(this.params);
    },

    onPlayerState: function(state, error) {
        console.log("Symple Flash Player: State: ", state, error);
        // None, Loading, Playing, Paused, Stopped, Error
        if (state != 'None')
            this.setState(state.lowercase(), error);
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
        console.log('Symple Flash Player: ' + type + ': ' + text);
    }
});