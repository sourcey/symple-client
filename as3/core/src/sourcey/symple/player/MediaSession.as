package sourcey.symple.player
{	
	import sourcey.net.Session;
	import sourcey.util.Logger;
	import sourcey.util.Util;
	
	public class MediaSession extends Session
	{
		public var params:Object;
		public var resolver:CandidateResolver;
		
		public function MediaSession(params:Object = null)
		{		
			super();
			
			this.params = params ? params : {};
			this.resolver = new CandidateResolver();
			this.resolver.addEventListener(CandidateEvent.CANDIDATE, onCandidateResolved);
			this.resolver.addEventListener(CandidateEvent.TIMEOUT, onResolverTimeout);
			
			dispatchEvent(new CandidateEvent(CandidateEvent.TIMEOUT));	
		}
		
		public function initialize():Boolean
		{
			try {
				Util.assertObjectProperties(params, 
					[ "token" ], //"protocol", "candidates"
					"Streaming parameters missing");
				
				Logger.send(Logger.DEBUG, 
					"[MediaSession] Initializing: " + params.token);				
				
				// Set STATE_ACTIVE if a URL was rovided
				if (params.url) {
					state = Session.STATE_ACTIVE;
				}
				
				// Set STATE_NEGOTIATING while candidates are resolved
				else if (params.candidates) {
					for each(var candidate:Object in params.candidates) {
						addCandidate(candidate);
					}
				}
					
				// Set STATE_INACTIVE while we wait for candidates
				// addCandidate should be called as candidates arrive
				else {
					Logger.send(Logger.DEBUG, 
						"[MediaSession] Waiting for candidates.");	
					state = Session.STATE_INACTIVE;
					
					// Start the timeout; if no cnadidates arrive within   
					// the alotted time frame the session will fail.
					resolver.resetResolvingTimeout();
				}					
				return true;
			} 
			catch (e:Error) {				
				setError(e.toString());
			}
			
			return false;
		}
		
		// The session must ALWAYS be terminated.
		public function terminate():void
		{				
			if (resolver)
				resolver.terminate();
			state = Session.STATE_INACTIVE;
		}
		
		public function addCandidate(candidate:Object):void
		{
			if (!candidate.protocol)
				candidate.protocol = candidate.type == "relay" ? 
					"turn" : params.transport == "SSL" ? 
					"https" : "http";
			
			Logger.send(Logger.DEBUG, 
				"[MediaSession] Adding candidates: " + candidate.protocol);	
						
			resolver.resolve(candidate);
			
			// Transition to _NEGOTIATING state if currently inactive
			if (state == STATE_INACTIVE)
				state = Session.STATE_NEGOTIATING;
		}
		
		public function onCandidateResolved(event:CandidateEvent):void
		{
			Logger.send(Logger.DEBUG, 
				"[MediaSession] Candidate resolved: " + state + ": " + event.data.success + ": " + event.data.url + ": " + event.data.latency);
			
			// KLUDGE: Currently we just use the first candidate that resolves
			// successfully. Ideally we would suport changing candidates mid-stream
			// if a higher priority or lower latency candidate becomes available.			
			if (state == STATE_ACTIVE)
				return;	
			
			// TODO: User resolver.bestCandidate
			
			var candidate:Object = event.data as Object;
			if (candidate && 
				candidate.success && 
				candidate.url) {
				params.url = candidate.url;
				state = Session.STATE_ACTIVE;
			}
		}
		
		public function onResolverTimeout(event:CandidateEvent):void
		{
			// Set the stream to error state on timeout.
			setError("Connection to streaming host timed out.");			
		}
		
		public function createVideoElement():IVideoElement 
		{		
			Logger.send(Logger.DEBUG, 
				"[MediaSession] Creating Video Element");
			
			if (!params.url)
				throw new Error("No streaming candidate.");
			
			if (params.video == null)
				throw new Error("No streaming video params.");	
			
			var video:IVideoElement;		
			if (params.video.codec == "MJPEG") {
				video = new MJPEGElement(this,
					params.url,
					params.protocol);
			} 
			else if (
				params.video.codec == "FLV" || 
				//params.video.codec == "H263" || 
				//params.video.codec == "H263p" || 
				params.video.codec == "H264") {
				//video = new FLVElement(this, params.url, params.protocol);
				video = new FLVStreamElement(this, params.url, params.protocol);
			}			
			if (!video)
				throw new Error("Unsupported video format " + params.video.codec);
			
			return video;			
		}
		
		public function createAudioElement():IVideoElement 
		{		
			Logger.send(Logger.DEBUG, 
				"[MediaSession] Creating Audio Element");
			
			//var candidate:Object = resolver.bestCandidate;
			if (!params.url)
				throw new Error("No streaming candidate.");
			
			if (params.audio == null)
				throw new Error("No streaming audio params.");	
			
			// TODO: We need to check that the container format
			// is FLV otherwise we can't use the FLVElement.
			var audio:IVideoElement;		
			if (params.audio.codec == "Speex" ||
				params.audio.codec == "Nellymoser"
			) {				
				audio = new FLVElement(this, params.url, params.protocol);
			} 
			else if (
				params.audio.codec == "MP3"
			) {				
				audio = new SoundElement(this, params.url, params.protocol);
			} 
			
			if (!audio)
				throw new Error("Unsupported audio format " + 
					params.audio.codec);
			
			return audio;			
		}
		
		public function setError(error:String):void
		{	
			Logger.send(Logger.ERROR, 
				"[MediaSession] Error: " + error);
			this.error = error;
			state = Session.STATE_ERROR;			
		}
		
		public function get token():String
		{	
			return params.token;
		}	
	}
}

/*
else {				
error = "Cannot connect to streaming host.";
//if (bastCandidate)
//	error += ": " + bastCandidate.url;
state = Session.STATE_ERROR;		
Logger.send(Logger.ERROR, 
"[MediaSession] Session Failed: " + error);	
}

//Logger.send(Logger.DEBUG, 
//	"[MediaSession] Candidates resolved: OK: " + state + ": " + event.data);
*/