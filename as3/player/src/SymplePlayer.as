package
{
	import flash.display.DisplayObject;
	import flash.display.LoaderInfo;
	import flash.events.Event;
	import flash.media.Sound;
	import flash.net.URLLoader;
	import flash.net.URLRequest;
	import flash.system.Security;
	import flash.text.Font;
	import flash.text.engine.TextElement;
	import flash.utils.Dictionary;
	
	import sourcey.events.BasicEvent;
	import sourcey.net.StatefulSocket;
	import sourcey.symple.player.FLVElement;
	import sourcey.symple.player.IVideoElement;
	import sourcey.symple.player.MediaConnection;
	import sourcey.symple.player.MediaEvent;
	import sourcey.symple.player.MediaSession;
	import sourcey.symple.player.Player;
	import sourcey.ui.Element;
	import sourcey.util.JFlashBridge;
	import sourcey.util.Logger;
	import sourcey.util.Util;
	
	public class SymplePlayer extends Element
	{
		public var player:Player;
		public var jsBridge:JFlashBridge;
		
		public function SymplePlayer()
		{
			Logger.addListener(Logger.INFO, onLogMessage);
			Logger.addListener(Logger.ERROR, onLogMessage);
			if (LoaderInfo(this.root.loaderInfo).parameters.debug)
				Logger.addListener(Logger.DEBUG, onLogMessage);
			
			jsBridge = new JFlashBridge();
			jsBridge.addMethod("open", open);
			jsBridge.addMethod("close", close);
			jsBridge.addMethod("play", play);
			jsBridge.addMethod("stop", stop);
			jsBridge.addMethod("refresh", invalidate);
			
			super();
			
			Logger.send(Logger.DEBUG, "Initializing");
			jsBridge.initialize();				
			initStage(stage);			
			stage.addEventListener(Event.RESIZE, onResize); 
			
			// http://localhost:3000/assetpipe/symple/as3/player/bin-debug
			// http://localhost:3000/assetpipe/symple/client/tests
			//testFLVSource();
			//testMJPEGHTTPSource();
			//testSpeexSource();
		}
		
		override protected function addChildren():void
		{			
			player = new Player();
			player.addEventListener(Player.STATE_CHANGED, onPlayerState);
			player.backgroundColor = 0x000000;
			player.autoPlay = true;
			player.setSize(stage.stageWidth, stage.stageHeight);
			addChild(player);
			
			super.addChildren();
		}
		
		override protected function invalidate():void
		{
			super.invalidate();
			
			Logger.send(Logger.DEBUG, "[Application] Invalidating: " + stage.stageWidth + "x" + stage.stageHeight);
			player.setSize(stage.stageWidth, stage.stageHeight);
		}
		
		private function onResize(event:Event):void 
		{
			Logger.send(Logger.DEBUG, "Stage resized");
			
			invalidate();
			//Logger.send(Logger.DEBUG, "Resizing: " + stage.stageWidth + "x" + stage.stageHeight);
			//player.setSize(stage.stageWidth, stage.stageHeight);
		}
		
		
		private function onMetadata(event:MediaEvent):void 
		{	
			jsBridge.call("onMetadata", event.data);
		}

		private function open(params:Object):Object
		{
			var r:Object = new Object();
			r.success = true;
			try {
				player.open(params);
			} 
			catch (e:Error) {		
				r.success = false;
				r.message = e.toString();
				Logger.send(Logger.DEBUG, "Load failed: " + e.toString());
			}
			
			return r;
		}		
		
		private function close():Object
		{
			var r:Object = new Object();
			r.success = true;
			try {
				player.close();	
			} 
			catch (e:Error) {		
				r.success = false;
				r.message = e.toString();
				Logger.send(Logger.DEBUG, "Load failed: " + e.toString());
			}
			
			return r;			
		}		
		
		public function play():Object
		{			
			var r:Object = new Object();
			r.success = true;
			r.message = "Video stream initialized.";
			try {
				player.play();	
			} 
			catch (e:Error) {		
				r.success = false;
				r.message = e.toString();
				Logger.send(Logger.DEBUG, "Video stream initialization failed: " + e.toString());
			}
			
			return r;
		} 		
		
		private function stop():Object 
		{		
			Logger.send(Logger.DEBUG, "Stopping");
			var r:Object = new Object();
			r.success = true;
			try {
				// JS call to stop() actually close()s the player
				// player.stop();
				player.close();
			} 
			catch (e:Error) {
				r.success = false;
				r.message = e.toString();
				Logger.send(Logger.DEBUG, "Video stream initialization failed: " + e.toString());
			}
			
			return r;
		} 
		
		protected function onPlayerState(event:BasicEvent):void 
		{	
			Logger.send(Logger.DEBUG, "[Application] Player state " + event.data);
			
			// Always ask for a refresh so we can scale the
			// internal video proportionately to the stage.
			invalidate();
			
			switch (event.data)
			{
				case Player.STATE_NONE:
					if (player.video &&
						player.video.parser)
						player.video.parser.removeEventListener(MediaEvent.METADATA, onMetadata);
					break;	
				
				case Player.STATE_LOADING:		
					break;
				
				case Player.STATE_PLAYING:
					if (player.video &&
						player.video.parser)
						player.video.parser.addEventListener(MediaEvent.METADATA, onMetadata);
					break;
				
				case Player.STATE_ERROR:	
					break;
			}
			
			jsBridge.call("onPlayerState", event.data, 
				event.data == Player.STATE_ERROR ? player.session.error : null);
		}
		
		protected function onLogMessage(event:BasicEvent):void 
		{
			jsBridge.call("onLogMessage", event.type, event.data);
		}
		
				
		//
		// Tests
		//
		

		protected function testMJPEGHTTPSource():void
		{	
			// http://127.0.0.1:328/streaming?format=MJPEG&packetizer=multipart&width=400&height=300
			player.open({
				token: "",
				format: "MJPEG",
				protocol: "HTTP",
				video: {
					codec: "MJPEG"
				},
				candidates: [
					{
						address: "127.0.0.1:328",
						protocol: "http",
						uri: "/streaming?format=MJPEG&packetizer=multipart&width=400&height=300"
					}
				]	
			});
		}
		
		protected function testMJPEGRawSource():void
		{	
			// http://127.0.0.1:328/streaming?format=MJPEG&packetizer=none&width=400&height=300
			player.open({
				token: "",
				format: "MJPEG",
				protocol: "Raw",
				video: {
					codec: "MJPEG"
				},
				candidates: [
					{
						address: "127.0.0.1:328",
						protocol: "http",
						uri: "/streaming?format=MJPEG&packetizer=none&width=400&height=300"
					}
				]	
			});			
		}
		
		protected function testFLVSource():void
		{	
			// http://127.0.0.1:328/streaming?format=FLV&packetizer=none&width=400&height=300
			player.open({
				token: "",
				format: "FLV", //FLV-Speex
				protocol: "Raw", // always raw
				video: {
					codec: "FLV"
				},
				//audio: {
				//	codec: "Speex"
				//},
				candidates: [{
					//address: "127.0.0.1:8080",
					//uri: "/big_buck_bunny.mp4" 
					address: "127.0.0.1:328",
					protocol: "http",
					uri: "/streaming.flv?format=FLV&width=400&height=300" //FLV-Speex
				}]	
			});	
		}
		
		protected function testMP3Source():void
		{
			var req:URLRequest = new URLRequest("http://127.0.0.1:328/streaming.mp3?format=MP3");
			var s:Sound = new Sound();
			s.load(req);
			s.play();			
		}
		
		protected function testSpeexSource():void
		{
			player.open({
				token: "",
				format: "Speex",
				protocol: "Raw",
				audio: {
					codec: "Speex"
				},
				candidates: [
					{
						address: "127.0.0.1:328",
						protocol: "http",
						uri: "/streaming.spx?format=Speex"
					}
				]	
			});					
		}
		
		/*
		//testTURNMediaProvider()
		//var c:MediaConnection
		//var s:MediaConnection = new MediaConnection("http://192.168.1.2:328/crossdomain.xml")
		//s.play();
		
		protected function testFLVSource():void
		{		
			player.open({
				token: "",
				protocol: "Raw",
				video: {
					codec: "FLV"
				},
				//audio: {
				//	codec: "Speex"
				//	codec: "Nellymoser"
				//	codec: "MP3"
				//},
				candidates: [
					{
						address: "127.0.0.1:328",
						protocol: "HTTP",
						//type: "relay",
						uri: ""
					}
				]	
			});	
			
			var req:URLRequest = new URLRequest("http://127.0.0.1:328/spund.mp3");
			//var req:URLRequest = new URLRequest("http://127.0.0.1/enctest.mp3");
			var s:Sound = new Sound();
			s.load(req);
			s.play();
			mp3test.mp3
			var audio:FLVElement = new FLVElement(
				"http://127.0.0.1/vidtest.flv",
				"Raw");
			addChild(audio);
			audio.play();
		}
		
		protected function testTURNMediaProvider():void
		{				
			Logger.send(Logger.INFO, "Test TURN Media Provider");
			
			// Send a GET request to obtain the relayed address.
			var request:URLRequest = new URLRequest();
			request.url = "http://127.0.0.1:800";
			request.method = "GET";			
			var loader:URLLoader = new URLLoader();
			loader.addEventListener(Event.COMPLETE, function loaderCompleteHandler(e:Event):void 
			{
				player.open({
					token: "MJPEG-TURN",
					format: "MJPEG",
					protocol: "HTTP",
					video: {
						codec: "MJPEG"
						//codec: "FLV"
					},
					//audio: {
					//	codec: "Speex"
					//	codec: "Nellymoser"
					//	codec: "MP3"
					//},
					candidates: [
						{
							address: e.target.data, //"127.0.0.1:6781",
							protocol: "turn", // "http"
							type: "relay",
							uri: ""
						}
					]	
				});	
			});
			loader.load(request);
		}
		*/
	}
}