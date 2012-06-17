package
{
	import flash.display.LoaderInfo;
	import flash.events.Event;
	import flash.text.Font;
	import flash.utils.Dictionary;
	
	import sourcey.symple.player.IVideoElement;
	import sourcey.symple.player.MediaEvent;
	import sourcey.symple.player.MediaSession;
	import sourcey.symple.player.Player;
	import sourcey.events.BasicEvent;
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
			Logger.addListener(Logger.DEBUG, onLogMessage);
			Logger.addListener(Logger.INFO, onLogMessage);
			Logger.addListener(Logger.ERROR, onLogMessage);
			
			jsBridge = new JFlashBridge();
			jsBridge.addMethod("open", open);
			jsBridge.addMethod("close", close);
			jsBridge.addMethod("play", play);
			jsBridge.addMethod("stop", stop);
			
			super();
			
			jsBridge.initialize();
			
			Logger.send(Logger.DEBUG, "Initializing");
			
			initStage(stage);
			
			stage.addEventListener(Event.RESIZE, onResize); 
			
			//
			// Tests
			//
			player.open({
				token: "test-flv",
				format: "FLV",
				protocol: "Raw",
				//video: {
				//	codec: "FLV"
				//},
				audio: {
					codec: "Speex"
				},
				candidates: [
					{
						address: "127.0.0.1:328",
						protocol: "HTTP",
						uri: "/flv"
					}
				]	
			});
			
			/*
			player.open({
				token: "test-mjpeg",
				format: "MJPEG",
				protocol: "HTTP",
				video: {
					codec: "MJPEG"
				},
				candidates: [
					{
						address: "127.0.0.1:328",
						protocol: "HTTP",
						uri: "/mjpeg"
					}
				]	
			});
			*/			
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
			Logger.send(Logger.DEBUG, "Stage Resized");
			
			invalidate();
			//Logger.send(Logger.DEBUG, "Resizing: " + stage.stageWidth + "x" + stage.stageHeight);
			//player.setSize(stage.stageWidth, stage.stageHeight);
		}
		
		
		private function onMetadata(event:MediaEvent):void 
		{	
			/*
			var metadata:Array = event.data as Array;
			var output:String = '';
			for each(var data:String in metadata) {
				if (data.indexOf('X-') == 0) {
					output += data.substring(2,data.length).replace(/-/g, ' '); 
					output += '\n';					
				}
			}
			*/
			
			/*
			Logger.send(Logger.DEBUG, "[onMetadata] this.width: " + this.width);
			Logger.send(Logger.DEBUG, "[onMetadata] this.height: " + this.height);	
			Logger.send(Logger.DEBUG, "[onMetadata] this.currentSource.width: " + this.currentSource.width);
			Logger.send(Logger.DEBUG, "[onMetadata] this.currentSource.height: " + this.currentSource.height);	
			Logger.send(Logger.DEBUG, "[onMetadata] this.session.width: " + (this.parent as Player).session.params.video.width);	
			Logger.send(Logger.DEBUG, "[onMetadata] this.session.height: " + (this.parent as Player).session.params.video.height);	
			Logger.send(Logger.DEBUG, "[onMetadata] this.parent.width: " + (this.parent as Player).width);	
			Logger.send(Logger.DEBUG, "[onMetadata] this.parent.height: " + (this.parent as Player).height);	
			Logger.send(Logger.DEBUG, "[onMetadata] this.parent.parent: " + this.parent.parent);
			Logger.send(Logger.DEBUG, "[onMetadata] this.parent.parent.width: " + this.parent.parent.width);
			Logger.send(Logger.DEBUG, "[onMetadata] this.parent.parent.height: " + this.parent.parent.height);	
			Logger.send(Logger.DEBUG, "[onMetadata] stageWidth: " + stage.stageWidth);
			Logger.send(Logger.DEBUG, "[onMetadata] stageHeight: " + stage.stageHeight);
			//setChildIndex(this.text, numChildren - 1);
			//this.text.text = output; event.data
			var a:Dictionary = new Dictionary();
			a["grrr"] = "aaa";
			a["g rrr"] = "aaa";
			a["g-rrr"] = "aaa";
			*/
			//Logger.send(Logger.INFO, "[onMetadata] output: " + event.data);
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
				Logger.send(Logger.DEBUG, "Load Failed: " + e.toString());
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
				Logger.send(Logger.DEBUG, "Load Failed: " + e.toString());
			}
			
			return r;			
		}		
		
		public function play():Object
		{			
			var r:Object = new Object();
			r.success = true;
			r.message = "Video stream initialized.";
			r.data = "";
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
		
		private function stop(token:String):Object 
		{		
			player.video.destroy();
			var r:Object = new Object();
			r.success = true;
			try {
				player.stop();
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
			Logger.send(Logger.DEBUG, "[Application] Player State " + event.data);
			
			// Always ask for a refresh so we can scale the
			// internal video proportionately to the stage.
			invalidate();
			
			Logger.send(Logger.DEBUG, 
				"[Player] Media Session State " + event.data);
			
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
				
				case Player.STATE_FAILED:	
					break;
			}
			
			jsBridge.call("onPlayerState", event.data);
		}
		
		protected function onLogMessage(event:BasicEvent):void 
		{
			jsBridge.call("onLogMessage", event.type, event.data);
		}
	}
}