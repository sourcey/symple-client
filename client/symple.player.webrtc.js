// -----------------------------------------------------------------------------
// WebRTC Engine
//
window.RTCPeerConnection = window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
window.RTCSessionDescription = window.mozRTCSessionDescription || window.RTCSessionDescription;
window.RTCIceCandidate = window.mozRTCIceCandidate || window.RTCIceCandidate;
navigator.getUserMedia = navigator.mozGetUserMedia || navigator.webkitGetUserMedia;
window.URL = window.webkitURL || window.URL;

   
Symple.Media.registerEngine({
    id: 'WebRTC',
    name: 'WebRTC Player',
    formats: 'VP8, Opus', 
    preference: 100,
    support: (function() {
        return typeof RTCPeerConnection != "undefined";
    })()
});


Symple.Player.Engine.WebRTC = Symple.Player.Engine.extend({
    init: function(player) {
        console.log("SympleWebRTC: Init");
        this._super(player);
        
        this.rtcConfig = player.options.rtcConfig || {
          iceServers: [
            { url: "stun:stun.l.google.com:19302" }
          ]
        }
        this.rtcOptions = player.options.rtcOptions || {
            optional: [
                {DtlsSrtpKeyAgreement: true} // FF <=> Chrome interop
            ]
        }
        this.mediaConstraints = player.options.mediaConstraints || {}
        //this.mediaConstraints = player.options.mediaConstraints || {
        //  'mandatory': {
        //    'OfferToReceiveAudio':true, 
        //    'OfferToReceiveVideo':true
        //  }
        //};
    },
    
    setup: function() {
        console.log("SympleWebRTC: Create");
        
        // Note: Absolutely position video element so it scales to  
        // the parent element size. Need to test in other browsers.        
        //this.video = $('<video width="100%" height="100%" style="position:absolute;left:0;top:0;"></video>'); // Chrome
        this.video = $('<video></video>'); // style="position:absolute;left:0;top:0;"  width="100%" height="100%"  style="max-width:100%;height:auto;"
        this.player.screen.prepend(this.video);    
    },
      
    destroy: function() {   
        console.log("SympleWebRTC: Destroy");
        this.sendLocalSDP = null;
        this.sendLocalCandidate = null;
        
        if (this.video) {
            this.video[0].src = '';
            this.video[0] = null;
            this.video = null;
            // Anything else required for video cleanup?
        }
                
        if (this.pc) {
            this.pc.close();
            this.pc = null;
            // Anything else required for peer connection cleanup?
        }        
    },

    play: function(params) {        
        console.log("SympleWebRTC: Play", params);
        
        // The 'playing' state will be set when candidates
        // gathering is complete.
        // TODO: Get state events from the video element 
        // to shift from local loading to playing state.        
    },

    stop: function() {
        if (this.video) {
            this.video[0].src = '';
            // Do not nullify
        }
                
        // TODO: Close peer connection?
        if (this.pc) {
            this.pc.close();
            this.pc = null;
        }
            
        this.setState('stopped');
    },
    
    mute: function(flag) {
        // Mute unless explicit false given
        flag = flag === false ? false : true;
        console.log("SympleWebRTC: Mute:", flag);
        
        if (this.video) {
            this.video.prop('muted', flag); //mute
        } 
    },
    
    //
    // Called when local SDP is ready to be sent to the peer.
    sendLocalSDP: new Function,
    
    //
    // Called when a local candidate is ready to be sent to the peer.    
    sendLocalCandidate: new Function,    

    //
    // Called when remote SDP is received from the peer.
    onRemoteSDP: function(desc) {   
        console.log('SympleWebRTC: Recieve remote SDP:', desc)        
        if (!desc || !desc.type || !desc.sdp)
            throw "Invalid SDP data"
        
        if (desc.type != "offer")
            throw "Only SDP offers are supported"
        
        var self = this;      
        this.createPeerConnection(); 
        this.pc.setRemoteDescription(new RTCSessionDescription(desc), 
            function() {
                console.log('SympleWebRTC: SDP success');
            }, 
            function() {
                console.error('SympleWebRTC: SDP error:', message);
                self.setError("Cannot parse remote SDP offer");
            }
        );   
        this.pc.createAnswer(
            function(answer) { // success
                try {
                    console.log("SympleWebRTC: Send answer:", answer);
                    self.pc.setLocalDescription(answer);
                    self.sendLocalSDP(answer);
                } 
                catch (e) {
                    console.log("Failed to create PeerConnection:", e);
                    
                }
            },
            function() { // error
                self.setError("Cannot create local SDP answer");
            },
            null //this.mediaConstraints
        );
    },    
    
    //
    // Called when remote candidate is received from the peer.
    onRemoteCandidate: function(candidate) { 
        console.log("SympleWebRTC: Recieve remote candiate ", candidate);
        if (!this.pc)
            throw 'The peer connection is not initialized' // call onRemoteSDP first
            
        this.pc.addIceCandidate(new RTCIceCandidate({
            //sdpMid: candidate.sdpMid, 
            sdpMLineIndex: candidate.sdpMLineIndex, 
            candidate: candidate.candidate
        }));      
    },    
    
    createPeerConnection: function() {          
        if (this.pc)
            throw 'The peer connection is already initialized'
              
        console.log("SympleWebRTC: Creating peer connection: ", this.rtcConfig);
                
        var self = this;
        this.pc = new RTCPeerConnection(this.rtcConfig, this.rtcOptions);
        this.pc.onicecandidate = function(event) {
            if (event.candidate) {
                console.log("SympleWebRTC: Local candidate gathered:", event.candidate);                
                self.sendLocalCandidate(event.candidate); 
            } 
            else {
                console.log("SympleWebRTC: Local candidate gathering complete");
            }
        };
        this.pc.onaddstream = function(event) {         
            console.log("SympleWebRTC: Remote stream added:", URL.createObjectURL(event.stream));
                
            // Set the state to playing once candidates have completed gathering.
            // This is the best we can do until ICE onstatechange is implemented.
            self.setState('playing');
                
            self.video[0].src = URL.createObjectURL(event.stream);
            self.video[0].play(); 
        };
        this.pc.onremovestream = function(event) { 
            console.log("SympleWebRTC: Remote stream removed:", event);
            self.video[0].stop(); 
        };
        
        // Note: The following state events are completely unreliable.
        // Hopefully when the spec is complete this will change, but
        // until then we need to "guess" the state.
        //this.pc.onconnecting = function(event) { console.log("SympleWebRTC: onconnecting:", event); };
        //this.pc.onopen = function(event) { console.log("SympleWebRTC: onopen:", event); };
        //this.pc.onicechange = function(event) { console.log("SympleWebRTC: onicechange :", event); };
        //this.pc.onstatechange = function(event) { console.log("SympleWebRTC: onstatechange :", event); };
        
        console.log("SympleWebRTC: Created RTCPeerConnnection with config: " + JSON.stringify(this.rtcConfig));
    }
});


//
// Helpers

Symple.Media.iceCandidateType = function(candidateSDP) {
  if (candidateSDP.indexOf("typ relay") != -1)
    return "turn";
  if (candidateSDP.indexOf("typ srflx") != -1)
    return "stun";
  if (candidateSDP.indexOf("typ host") != -1)
    return "host";
  return "unknown";
}