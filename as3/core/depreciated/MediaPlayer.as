package com.sourcey.symple.player
{
	//import com.anionu.Environment;
	//import com.anionu.EnvironmentVars;
	//import com.sourcey.net.Session;
	//import com.anionu.models.Channel;
	//import com.sourcey.symple.player.parsers.Parser;
	//import com.sourcey.symple.player.parsers.RawMJPEGParser;
	//import com.sourcey.symple.player.parsers.SpotMJPEGParser;
	import flash.display.Sprite;
	import com.sourcey.util.Logger;
	
	import flash.events.DataEvent;
	
	//import mx.events.PropertyChangeEvent;
	
	//import spark.components.Sprite;
	
	public class MediaPlayer extends Sprite
	{
		//[Bindable] public var channel:Channel;
		
		/*
		private var _channel:Channel;		
		[Bindable (event="propertyChange")]
		public function get channel():Channel { return _channel; }
		public function set channel(value:Channel):void 
		{     
			if (value != _channel)
			{
				_channel = value;
				dispatchEvent(new PropertyChangeEvent(PropertyChangeEvent.PROPERTY_CHANGE));
			}
		}
		*/

		public var session:MediaSession;	
		public var video:IVideoElement;		
		public var parser:Parser;	
		
		//protected var message:LoadingMessage;		
		
		public function MediaPlayer()
		{			
			//session = Environment.spot.createMediaSession();
			session.addEventListener(Session.STATE_CHANGED, handleMediaSessionState);
		}	
		
		/*
		public function setup(channel:Channel):void //, params:Object
		{
			this.channel = channel;
			//this.params = params;	
			play();
		}
		*/
		
		public function play():void
		{
			trace('[StreamPlayer] Playing');
			
			try {
				/*
				if (!channel)
					throw Error("Streaming failed: No remote channel.");
				
				if (!channel.video || channel.video.id == -1)
					throw Error("Streaming failed: The remote channel has no video device configured.");	
				*/
				
				//if (!params)
				//	throw Error("Streaming failed: No streaming parameters.");			
				
				
				// Initialize the session if it is inactive or failed.	
				//session.params = params;
				//session.terminate(); 
				session.initialize();
			} 
			catch (error:Error) {	
				showMessage("failed", error.message);
			}
		}	
		
		// The player must ALWAYS be destroyed.
		public function destroy():void 
		{	
			trace('[StreamPlayer] Destroying');
			if (session) {
				session.removeEventListener(Session.STATE_CHANGED, handleMediaSessionState);
				session.terminate();
			}
			if (video)
				video.destroy();
		}
		
		protected function handleMediaSessionState(event:DataEvent):void 
		{
			Logger.send(Logger.DEBUG, 
				"[StreamPlayer] Media Session State " + event.data);
			
			//event.data = Session.STATE_FAILED;
			//session.error = "Testing failed state";
			
			switch (event.data)
			{
				case Session.STATE_INACTIVE:	
					removeVideo();	
					removeMessage();		
					break;	
				
				case Session.STATE_NEGOTIATING:
					showMessage("loading", "Negotiating video session with peer.");					
					break;
				
				case Session.STATE_ACTIVE:
					//removeVideo();		
					//video = new Video(this.width, this.height);
					//video = session.video;
					//video.percentWidth = 100;
					//video.percentHeight = 100;
					//videoDisplay.addChild(video);
					//params = session.params;
					try {
						initializeComponents();
						//video.attachNetStream(session.stream);
						removeMessage();
					} 
					catch (error:Error) {	
						showMessage("failed", error.message);
					}
					break;
				
				case Session.STATE_FAILED:	
					removeVideo();	
					showMessage("failed", session.error);
					
					// Is this the right thing to do here?
					// Terminate needs to be called but flex offers no destructor.
					//session.terminate();
					break;
			}
		}	
		
		/*
		protected function initializeParser():void
		{		
			if (parser)
				return;
			
			if (session.params["video.codec"] == "MJPEG") 
			{
				switch (session.params["transport"])
				{
					case "Raw":	
						parser = new RawMJPEGParser();
						break;
					
					case "HTTP":
						parser = new SpotMJPEGParser();
						break;
				}
			} 
			else if (
				session.params["video.codec"] == "FLV" || 
				session.params["video.codec"] == "H263" || 
				session.params["video.codec"] == "H263p" || 
				session.params["video.codec"] == "H264") 
			{
				switch (session.params["transport"])
				{
					case "Raw":	
						parser = new Parser();
						break;					   
				}
			}	
			
			if (!parser)
				throw new Error("Unable to initialize parser for " +  
					session.params["video.codec"] + " over " +
					session.params["transport"]);
		}
		*/
		
		protected function createVideoElement():IVideoElement 
		{		
			var video:IVideoElement;	
			/*	
			if (session.params["video.codec"] == "MJPEG") 
			{
				video = new MJPEGElement(
					EnvironmentVars.SPOT_HOST, 
					EnvironmentVars.SPOT_MEDIA_PORT,
					session.params["token"],
					session.params["transport"]);
			} 
			else if (
				session.params["video.codec"] == "FLV" || 
				session.params["video.codec"] == "H263" || 
				session.params["video.codec"] == "H263p" || 
				session.params["video.codec"] == "H264") 
			{
				video = new FLVElement(
					EnvironmentVars.SPOT_HOST, 
					EnvironmentVars.SPOT_MEDIA_PORT,
					session.params["token"],
					session.params["transport"]);
			}		
			*/
			
			if (!video)
				throw new Error("No appropriate media video available for " + 
					session.params["video.codec"]);			
			
			return video;			
		}
		
		protected function initializeComponents():void 
		{		
			Logger.send(Logger.DEBUG, 
				"[MediaSession] Initializing media video: " + session.params["format"]);
			
			if (video)
				return;			
			
			//initializeParser();	
			
			// TODO: Creare via session?
			//var connection:MediaConnection = new MediaConnection(parser,
			//													 EnvironmentVars.SPOT_HOST, 
			//													 EnvironmentVars.SPOT_MEDIA_PORT,
			//													 session.token);	
			
			var element:IVideoElement = createVideoElement();	
			element.play();
			//element.connection = new MediaConnection(parser,
			//	EnvironmentVars.SPOT_HOST, 
			//	EnvironmentVars.SPOT_MEDIA_PORT,
			//	session.token);	
			setVideo(element);
		}
		
		protected function showMessage(type:String, text:String):void 
		{
			removeMessage();
			message = new LoadingMessage;
			message.setMessage(type, text)
			message.percentWidth = 100;
			message.percentHeight = 100;	
			addElement(message);
		}
		
		protected function removeMessage():void 
		{	
			if (message) {				
				removeElement(message);
				message = null;
			}
		}
		
		protected function setVideo(element:IVideoElement):void 
		{
			//removeVideo();		
			if (element) {
				//element.percentWidth = 100;
				//element.percentHeight = 100;
				addElement(element);	
				video = element;
			}
			
			invalidateDisplayList();
		}
		
		protected function removeVideo():void 
		{
			if (video) {
				video.destroy();
				removeElement(video);
				video = null;
			}
		}		
		
		/*
		override protected function createChildren():void 
		{
		super.createChildren();
		//videoDisplay = new Spr
		//addChild(video);
		}
				
		override protected function updateDisplayList(unscaledWidth:Number, unscaledHeight:Number):void 
		{
			super.updateDisplayList(unscaledWidth, unscaledHeight);
			
			trace("[Player] updateDisplayList: " + unscaledWidth + ":" + unscaledHeight);	
			
			if (video) {
				video.width = unscaledWidth;
				video.height = unscaledHeight;					
			}
		}
		*/
	}
}