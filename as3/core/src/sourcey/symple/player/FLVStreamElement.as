package sourcey.symple.player
{
	//import com.anionu.EnvironmentVars;
	import flash.display.Bitmap;
	import flash.display.BitmapData;
	import flash.display.IBitmapDrawable;
	import flash.events.IOErrorEvent;
	import flash.events.NetStatusEvent;
	import flash.events.ProgressEvent;
	import flash.media.SoundTransform;
	import flash.media.Video;
	import flash.net.FileReference;
	import flash.net.NetConnection;
	import flash.net.NetStream;
	import flash.net.NetStreamAppendBytesAction;
	import flash.net.URLRequest;
	import flash.net.URLStream;
	import flash.utils.ByteArray;
	
	import sourcey.symple.player.parsers.Parser;
	import sourcey.ui.Element;
	import sourcey.util.FPSCounter;
	
	//import mx.core.UIComponent;
	//import mx.graphics.ImageSnapshot;
	//import mx.graphics.codec.JPEGEncoder;
	//import mx.utils.ObjectUtil;
	
	//import spark.components.Group;
	
	public class FLVStreamElement extends Element implements IVideoElement
	{		
		public var url:String;
		//public var port:int;
		//public var token:String;
		public var protocol:String;
		public var counter:FPSCounter;
		
		//[Bindable]
		private var _video:Video;
		//private var _videoUI:UIComponent
		
		private var _nc:NetConnection;
		private var _ns:NetStream;
		
		private var _connection:MediaConnection;
		private var _parser:Parser;
		
		public function FLVStreamElement(url:String = "", protocol:String = "Raw") //, port:int = 0, token:String = ""
		{
			super();			
			
			this.url = url;
			//this.port = port;
			//this.token = token;
			this.protocol = protocol;
			this.counter = new FPSCounter;
			
			if (this.protocol != "Raw")
				throw Error("FLV stream only supports raw payload.");
						
			_video = new Video();	
			addChild(_video);
			
			_nc = new NetConnection();
			_nc.connect(null);
			
			_ns = new NetStream(_nc);
			_ns.addEventListener(NetStatusEvent.NET_STATUS, onStreamStatus);
			_ns.client = this;			
			_ns.bufferTime = 0; 
			_video.attachNetStream(_ns);
			
			_ns.play(null);
			_ns.appendBytesAction(NetStreamAppendBytesAction.RESET_BEGIN);	
			
			_parser = new Parser;
			_parser.addEventListener(MediaEvent.DATA, onFrame);		
			
			_connection = new MediaConnection(url, _parser);
		}
		
		public function play():void 
		{
			_connection.play();
		}
		
		public function stop():void 
		{
			_connection.stop();
		}
		
		public function pause():void
		{	
			_connection.pause();
		}
		
		public function resume():void
		{	
			_connection.resume();
		}
		
		public function get paused():Boolean
		{	
			return _connection.paused;
		}
		
		
		public function get fps():Number
		{
			return counter.fps; //_ns.currentFPS;
		}
		
		//public function set pause(value:Boolean):void
		//{	
		//	_connection.pause = value;
		//}
		
		public function destroy():void 
		{
			trace("[FLVComponent] Destroying");
			if (_parser)
				_parser.removeEventListener(MediaEvent.DATA, onFrame);
			if (_connection)
				_connection.close();
			if (_ns)
				_ns.close();		
			if (_nc)
				_nc.close();			
		}
				
		public function onMetaData(info:Object):void 
		{ 
			for (var propName:String in info) {
				trace("[FLVComponent] Metadata: " + propName + " = " + info[propName]);
				
				// Do not set the dimensions for the _video object here!
				//_video.width = info['width'];
				//_video.height = info['height'];
			}
		}
		
		public function get parser():Parser 
		{
			return _parser;
		}
		
		public function onStreamStatus(event:NetStatusEvent):void
		{
			//trace("[FLVComponent] Net Status Handler: " + ObjectUtil.toString(event.info));
			
			if (event.info.code == "NetStream.FileStructureInvalid")
			{
				trace("The MP4's file structure is invalid.");
			}
			else if (event.info.code == "NetStream.NoSupportedTrackFound")
			{
				trace("The MP4 doesn't contain any supported tracks");
			}
		}
		
		private function onFrame(event:MediaEvent):void 
		{	
			// Append data from the parser
			// directly to the net stream.
			counter.tick();
			_ns.appendBytes(event.data);			
			//trace("[FLVComponent] onFrame", _ns.currentFPS);			
		}
		
		
		/*
		public function saveSnapshot(filename:String, width:Number, height:Number):void 
		{	
			trace("[FLVComponent] takeSnapshot: " + filename);
			
			throw Error("Snapshots can't be saved in data ganeration mode.");
		}
		
		
		override protected function createChildren():void 
		{
			super.createChildren();
			
			_videoUI.addChild(_video);	
			_videoUI.percentWidth = 100;
			_videoUI.percentHeight = 100;		
			addElement(_videoUI);
			//addElement(_video)
		}
		
		override protected function updateDisplayList(unscaledWidth:Number, unscaledHeight:Number):void 
		{
			//trace("[FLVComponent] updateDisplayList: unscaledWidth " + unscaledWidth);	
			//trace("[FLVComponent] updateDisplayList: unscaledHeight " + unscaledHeight);	
			//trace("[FLVComponent] updateDisplayList: _video.width " + _video.width);	
			//trace("[FLVComponent] updateDisplayList: _video.height " + _video.height);	
			
			// Rescale the _video element to fit the container
			// maintaining 3:4 aspect ratio.
			if (unscaledWidth >= (unscaledHeight * 1.25)) { // scale horizontally
				trace("[FLVComponent] scale horizontally");	
				_video.width = unscaledHeight * 1.25;
				_video.height = unscaledHeight;	
			}
			else {
				trace("[FLVComponent] scale vertically");	
				_video.width = unscaledWidth;
				_video.height = unscaledWidth * 0.75;					
			}
			
			_video.x = (unscaledWidth / 2) - (_video.width / 2);
			_video.y = (unscaledHeight / 2) - (_video.height / 2);
		}
		*/
	}
}


/*

_ns = new NetStream(_nc);
_ns.addEventListener(NetStatusEvent.NET_STATUS, onStreamStatus);
_ns.client={
onMetaData:function(info:Object):void
{
for (var propName:String in info) {
trace("[FLVComponent] Metadata: " + propName + " = " + info[propName]);
}

// Do not set the dimensions for the _video object here!
//_video.width = info['width'];
//_video.height = info['height'];
}
}	
*/

//var request:URLRequest = new URLRequest("http://localhost/H264.mp4");
//var request:URLRequest = new URLRequest("http://localhost/test1.flv");
//var request:URLRequest = new URLRequest("http://" + host + ":" + this.port + "/?token=" + this.token);
//u_ns.load(request);