package sourcey.symple.player
{
	import sourcey.net.Session;
	import sourcey.util.Logger;
	import sourcey.util.Util;
	
	public class MediaSession extends Session
	{
		// Symple streaming params must have following members
		//	- token (string)
		//	- candidates (array)
		public var params:Object;
		public var resolver:CandidateResolver;
		//public var url:String;
		
		public function MediaSession(params:Object = null)
		{		
			super();
			
			this.params = params ? params : {};
			this.resolver = new CandidateResolver();
			//this.resolver.addEventListener(CandidateEvent.CANDIDATE, onCandidatesGathered);
			this.resolver.addEventListener(CandidateEvent.GATHERING_COMPLETE, onCandidatesGathered);
		}
		
		public function initialize():Boolean
		{
			try {
				Util.assertObjectProperties(params, 
					[ "protocol", "token", "candidates" ], 
					"Parameters missing");
				
				Logger.send(Logger.DEBUG, 
					"[MediaSession] Initializing: " + params.token);				
				
				// Gather candidates if no URL has been set explicitly
				if (!params.url) {
					state = Session.STATE_NEGOTIATING;
					
					for each(var candidate:Object in params.candidates) {
						if (!candidate.protocol)
							candidate.protocol = candidate.type == "relay" ? 
								"turn" : params.transport == "SSL" ? 
									"https" : "http";
						resolver.resolve(candidate);
					}
				}
				else
					state = Session.STATE_ACTIVE;
				
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
		
		public function setError(error:String):void
		{	
			Logger.send(Logger.ERROR, 
				"[MediaSession] Error: " + error);
			this.error = error;
			state = Session.STATE_ERROR;			
		}
		
		public function onCandidatesGathered(event:CandidateEvent):void
		{
			Logger.send(Logger.DEBUG, 
				"[MediaSession] Candidates Gathered: " + state + ": " + event.data.success + ": " + event.data.url);
			
			// TODO: Change candidates mid-stream
			var bastCandidate:Object = event.data as Object;
			if (bastCandidate && 
				bastCandidate.success && 
				bastCandidate.url) {
				params.url = bastCandidate.url;
				state = Session.STATE_ACTIVE;
			}
			else {				
				error = "Unable to resolve peer";
				if (bastCandidate)
					error += ": " + bastCandidate.url;
				state = Session.STATE_ERROR;		
				Logger.send(Logger.ERROR, 
					"[MediaSession] Session Failed: " + error);	
			}
			
			//Logger.send(Logger.DEBUG, 
			//	"[MediaSession] Candidates Gathered: OK: " + state + ": " + event.data);
		}
		
		public function createVideoElement():IVideoElement 
		{		
			Logger.send(Logger.DEBUG, 
				"[MediaSession] Creating Video Element");
			
			if (!params.url)
				throw new Error("No streaming candidate");
			
			if (params.video == null)
				throw new Error("No streaming video params");	
			
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
				video = new FLVElement(this,
					params.url,
					params.protocol);
			}			
			if (!video)
				throw new Error("Unsupported video format " + 
					params.video.codec);
			
			return video;			
		}
		
		public function createAudioElement():IVideoElement 
		{		
			Logger.send(Logger.DEBUG, 
				"[MediaSession] Creating Audio Element");
			
			//var candidate:Object = resolver.bestCandidate;
			if (!params.url)
				throw new Error("No streaming candidate");
			
			if (params.audio == null)
				throw new Error("No streaming audio params");	
			
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
		
		public function get token():String
		{	
			return params.token;
		}	
	}
}