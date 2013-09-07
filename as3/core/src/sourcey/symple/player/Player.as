package sourcey.symple.player
{
	import flash.display.DisplayObject;
	import flash.display.Sprite;
	import flash.events.Event;
	
	import sourcey.events.BasicEvent;
	import sourcey.net.Session;
	import sourcey.symple.player.IVideoElement;
	import sourcey.symple.player.MediaSession;
	import sourcey.ui.Element;
	import sourcey.util.Logger;
	import sourcey.util.Util;
	
	//[Event(name="stateChanged", type="sourcey.events.BasicEvent")]
	
	public class Player extends Element
	{
		public static const STATE_CHANGED:String 	= "stateChanged";
		
		public static const STATE_NONE:String 		= "None";
		public static const STATE_LOADING:String 	= "Loading";
		public static const STATE_PLAYING:String 	= "Playing";
		public static const STATE_PAUSED:String 	= "Paused";
		public static const STATE_STOPPED:String 	= "Stopped";
		public static const STATE_ERROR:String 		= "Error";
		
		public var autoPlay:Boolean = true;
		public var session:MediaSession;
		
		// The video element. 
		// This element may also incorporate audio if we
		// are using a multiplexed format.
		public var video:IVideoElement;
		
		// The audio element. 
		// This element allows for the use of a seperate 
		// audio stream. In the case of audio only formats
		// the video element will remain NULL.
		public var audio:IVideoElement;			
		
		public function Player(params:Object = null)
		{
			super();
			
			session = new MediaSession(params);
			session.addEventListener(Session.STATE_CHANGED, onMediaSessionState);
		}
		
		public function open(params:Object = null):Boolean
		{
			if (params) {
				// TODO: Assert via session params setter
				//Util.assertObjectProperties(params, [ "protocol", "video", "audio", "token", "candidates" ]);	
				session.params = params;
			}
			return session.initialize();
		}
		
		public function close():void
		{
			if (video)
				video.destroy();
			if (audio)
				audio.destroy();
			return session.terminate();
		}
		
		public function play():void
		{
			Logger.send(Logger.DEBUG, "[Player] Playing: " + session.token);
			
			if (session.state != Session.STATE_ACTIVE)
				throw new Error("Failed to play invalid stream.");
			
			if (video)
				video.play();
			if (audio)
				audio.play();
		}
		
		public function stop():void
		{
			Logger.send(Logger.DEBUG, "[Player] Stopping: " + session.token);
			
			if (session.state != Session.STATE_ACTIVE)
				throw new Error("Failed to stop invalid stream.");
			
			if (video)
				video.stop()
			if (audio)
				audio.stop()
		}
		
		protected function showMessage(type:String, text:String):void 
		{
			// override me...
			Logger.send(type == "error" ? Logger.ERROR : Logger.INFO, text);	
		}
		
		protected function hideMessage():void 
		{
			// override me...			
		}
				
		override protected function invalidate():void
		{
			super.invalidate();
			
			Logger.send(Logger.DEBUG, "[Player] Invalidating: " + width + "x" + height);
			
			var element:Element = video as Element;
			if (element && width && height)
				element.setSize(width, height);
		}
		
		protected function setVideo(element:IVideoElement):void 
		{
			removeVideo();		
			if (element) {
				addChild(element as DisplayObject);
				video = element;
				//var sprite:Sprite = element as Sprite;
				//if (sprite)
				//	sprite.addEventListener(Event.RESIZE, onResize);
			}
			
			invalidate();
		}
		
		protected function removeVideo():void 
		{
			if (video) {
				video.destroy();
				removeChild(video as DisplayObject);
				//var sprite:Sprite = video as Sprite;
				//if (sprite)
				//	sprite.removeEventListener(Event.RESIZE, onResize);
				video = null;
			}			
		}
				
		protected function setAudio(element:IVideoElement):void 
		{
			removeAudio();		
			if (element) {
				addChild(element as DisplayObject);
				audio = element;
				//audio.width = 0;
				//audio.height = 0;
				//var sprite:Sprite = element as Sprite;
				//if (sprite)
				//	sprite.addEventListener(Event.RESIZE, onResize);
			}
			
			invalidate();
		}
		
		protected function removeAudio():void 
		{
			if (audio) {
				audio.destroy();
				removeChild(audio as DisplayObject);
				//var sprite:Sprite = audio as Sprite;
				//if (sprite)
				//	sprite.removeEventListener(Event.RESIZE, onResize);
				audio = null;
			}			
		}
		
		public function get fps():Number
		{
			return video ? video.fps : 0;
		}
		
		public function set params(value:Object):void
		{
			session.params = value;
		}
		
		protected function onMediaSessionState(event:BasicEvent):void 
		{
			Logger.send(Logger.DEBUG, 
				"[Player] Media Session State " + event.data);
			
			switch (event.data)
			{
				case Session.STATE_INACTIVE:
					removeVideo();
					removeAudio();
					hideMessage();
					state = STATE_NONE;
					break;	
				
				case Session.STATE_NEGOTIATING:
					showMessage("loading", "Negotiating video session with peer.");
					state = STATE_LOADING;			
					break;
				
				case Session.STATE_ACTIVE:
					try {
						hideMessage();
						
						// TODO: Handle multiplexed streams?
						if (session.params.audio != null) {
							var audio:IVideoElement = session.createAudioElement();
							setAudio(audio);								
						}
						if (session.params.video != null) {
							var video:IVideoElement = session.createVideoElement();
							setVideo(video);							
						}
						if (autoPlay)
							play();
						state = STATE_PLAYING;	
					} 
					catch (error:Error) {	
						showMessage("error", error.toString());
						state = STATE_ERROR;
					}
					break;
				
				case Session.STATE_ERROR:	
					removeVideo();	
					removeAudio();
					showMessage("error", session.error);
					state = STATE_ERROR;
					break;
			}
		}	
		
		/*
		private function onResize(event:Event):void 
		{
		//setSize((video as Element).width, (video as Element).height);
		//var sprite:Sprite = event.currentTarget as Sprite;
		//if (sprite)
		//	setSize(stage.stageWidth, stage.stageHeight);
		}
		*/
		
		// Implements the player state machine
		private var _state:String = STATE_NONE;		
		public function get state():String { return _state; }
		public function set state(value:String):void 
		{
			if (_state == value)
				return;
			
			Logger.send(Logger.DEBUG, 
				"[Player] Setting state from " + _state + " to " + value);
			_state = value;

			dispatchEvent(new BasicEvent(STATE_CHANGED, _state));
		}
	}
}