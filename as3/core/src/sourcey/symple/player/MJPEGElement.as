package sourcey.symple.player
{
	import flash.display.Bitmap;
	import flash.display.BitmapData;
	import flash.display.Loader;
	import flash.display.Stage;
	import flash.events.DataEvent;
	import flash.events.Event;
	import flash.geom.Matrix;
	import flash.net.FileReference;
	//import flash.text.Font;
	//import flash.text.TextField;
	//import flash.text.TextFieldAutoSize;
	//import flash.text.TextFormat;
	import flash.utils.ByteArray;
	
	import sourcey.net.StatefulSocket;
	import sourcey.symple.player.parsers.MJPEGParser;
	import sourcey.symple.player.parsers.Parser;
	import sourcey.symple.player.parsers.RawMJPEGParser;
	import sourcey.ui.BufferedLoader;
	import sourcey.ui.Element;
	import sourcey.util.FPSCounter;
	import sourcey.util.Logger;
	
	public class MJPEGElement extends BufferedLoader implements IVideoElement
	{
		public var session:MediaSession;
		public var url:String;
		public var protocol:String;
		public var counter:FPSCounter;		
		
		//private var fpsCounter:FPSCounter;
		private var _connection:MediaConnection;
		private var _parser:Parser;
		
		public function MJPEGElement(session:MediaSession, url:String = "", protocol:String = "HTTP") //, port:int = 0, token:String = ""
		{	
			this.session = session;
			this.url = url;
			this.protocol = protocol;
			this.counter = new FPSCounter;
			
			super();			
			
			switch (protocol)
			{
				case "Raw":	
					_parser = new RawMJPEGParser;
					break;
				
				case "HTTP":
					_parser = new MJPEGParser;
					break;
			}
			
			if (!_parser)
				throw Error("Streaming failed: Unable to initialize a parser for " + protocol);
			
			_parser.addEventListener(MediaEvent.DATA, onFrame);
			//_parser.addEventListener(MediaEvent.METADATA, onMetadata);
						
			_connection = new MediaConnection(url, _parser);
			_connection.addEventListener(StatefulSocket.STATE_CHANGED, onSocketStateChange);
		}
		
		protected function onSocketStateChange(event:DataEvent):void
		{
			if (event.data == StatefulSocket.STATE_DISCONNECTED) {
				session.setError(_connection.error)
			}
		}
		
		override protected function addChildren():void
		{
			super.addChildren();			
			
			/*			
			//this.loader.setSize(800, 600);
			
			this.mouseEnabled = false;
			fpsCounter = new FPSCounter;
			fpsCounter.top = 5;
			fpsCounter.right = 5;
			fpsCounter.setStyle("color", "0xFFFFFF");
			fpsCounter.setStyle("fontSize", "11");
			fpsCounter.setStyle("fontWeight", "bold");
			//fpsCounter.setStyle("z-index", images.length + 1);
			addElement(fpsCounter);
			//this.loader = new BufferedLoader();			
			//addChild(loader);			
			*/
			/*
			//var a:TextFieldAutoSize
			this.text = new TextField();
			this.text.autoSize = TextFieldAutoSize.LEFT;
			//this.text.embedFonts = true;
			this.text.textColor = 0xFFFFFF;
			//this.text.format 
				
			//var format:TextFormat = new TextFormat();
			var format:TextFormat = new TextFormat("SansSerif",14,0xFFFFFF,true);

			//var mainFont:Font = new Arial();
			//format.font = mainFont.fontName;
			
			//format.font = "Courier";
			//format.size = 11;
			//format.color = 0xFFFFFF;
			this.text.setTextFormat(format);
			
			//format.indent = 50; // Indenting and Leading Text
			//format.leading = 50; // Indenting and Leading Text
			//format.bold = false;
			
			//this.text._width = 122.5;
			//this.text._height = 20;
			//this.text._y = 2;			
			
			addChild(this.text);
			*/
		}
		
		public function destroy():void 
		{
			Logger.send(Logger.DEBUG, "[MJPEGElement] Destroying");
			if (_parser) {
				_parser.removeEventListener(MediaEvent.DATA, onFrame);
				//_parser.removeEventListener(MediaEvent.METADATA, onMetadata);
			}
			if (_connection)
				_connection.close();
		}	
		
		public function get fps():Number
		{
			return counter.fps; //_ns.currentFPS;
			//return video ? video.fps : 0;
		}
		
		public function play():void 
		{
			Logger.send(Logger.DEBUG, "[MJPEGElement] Playing");
			
			_connection.play();
		}
		
		public function stop():void 
		{
			Logger.send(Logger.DEBUG, "[MJPEGElement] Stopping");
			
			_connection.stop();
		}		
		
		public function pause():void
		{	
			Logger.send(Logger.DEBUG, "[MJPEGElement] Pausing");
			_connection.pause();
		}
		
		public function resume():void
		{	
			Logger.send(Logger.DEBUG, "[MJPEGElement] Resuming");
			_connection.resume();
		}
		
		public function get paused():Boolean
		{	
			return _connection.paused;
		}
		
		private function onFrame(event:MediaEvent):void 
		{
			//Logger.send(Logger.DEBUG, "[MJPEGElement] onFrame");
			
			//if (fpsCounter)
			//	fpsCounter.update();
			
			counter.tick();
			loadBytes(event.data);
		}		
		
		public function get parser():Parser 
		{
			return _parser;
		}
		
		/*
		
		private function onMetadata(event:MediaEvent):void 
		{	
		
		}
		
		//headLine.wordWrap = true;
		
		override protected function invalidate():void
		{
			Logger.send(Logger.DEBUG, "[MJPEGElement] Invalidating: " + width + "x" + height);			
			super.invalidate();
			if (this.loader)
				this.loader.setSize(width, height);
			Logger.send(Logger.DEBUG, "[MJPEGElement] Invalidating: OK: " + width + "x" + height);	
		}
		
		public function saveSnapshot(filename:String, width:Number, height:Number):void 
		{		
			Logger.send(Logger.DEBUG, "[MJPEGElement] takeSnapshot:", filename);
			var data:BitmapData = new BitmapData(width, height);
			
			var mat:Matrix = new Matrix();
			mat.scale(width / loader.width, height / loader.height);
			data.draw(loader.currentSource, mat);			
			
			var bitmap:Bitmap = new Bitmap(data);			
			var encoder:JPEGEncoder = new JPEGEncoder(100);
			var snapshot:ImageSnapshot = ImageSnapshot.captureImage(bitmap, 0, encoder);
			var fileRef:FileReference = new FileReference();			
			fileRef.save(snapshot.data, filename);
		} 		
		*/
	}
}