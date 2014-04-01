package sourcey.symple.player
{
	//import com.anionu.EnvironmentVars;
	
	import flash.display.Bitmap;
	import flash.display.BitmapData;
	import flash.display.IBitmapDrawable;
	import flash.events.AsyncErrorEvent;
	import flash.events.IOErrorEvent;
	import flash.events.NetStatusEvent;
	import flash.events.ProgressEvent;
	import flash.events.SecurityErrorEvent;
	import flash.geom.Matrix;
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
	import sourcey.util.Logger;
	import sourcey.util.Util;
	
	//import mx.core.UIComponent;
	//import mx.graphics.ImageSnapshot;
	//import mx.graphics.codec.JPEGEncoder;
	//import mx.utils.ObjectUtil;
	
	//import spark.components.Group;
	
	public class FLVElement extends Element implements IVideoElement
	{
		public var scaleToFit:Boolean = true;
		public var alignToCenter:Boolean = true;
		
		public var session:MediaSession;
		public var url:String;
		//public var host:String;
		//public var port:int;
		//public var token:String;
		public var protocol:String;
		public var _paused:Boolean = false;
		public var _stopped:Boolean = false;
		
		private var _video:Video;		
		private var _nc:NetConnection;
		private var _ns:NetStream;
		
		public function FLVElement(session:MediaSession, url:String = "", protocol:String = "Raw")
		{
			Logger.send(Logger.DEBUG, "[FLVElement] Creating");
			
			super();
			
			this.session = session;
			this.url = url;
			this.protocol = protocol;
			
			_nc = new NetConnection();
			_nc.addEventListener(NetStatusEvent.NET_STATUS, onConnectionStatus);
			_nc.addEventListener(SecurityErrorEvent.SECURITY_ERROR, onConnectionSecurityError);
			_nc.addEventListener(IOErrorEvent.IO_ERROR, onConnectionIoError);
			_nc.addEventListener(AsyncErrorEvent.ASYNC_ERROR, onConnectionAsyncError);
			//var a:AsyncErrorEvent
			//flash.events.AsyncErrorEvent.ASYNC_ERROR
			_nc.connect(null);
		}
		
		public function play():void 
		{
			Logger.send(Logger.DEBUG, "[FLVElement] Playing: " + this.url);
			
			if (protocol != "Raw")
				throw Error("This component only handles raw media streams.");
			
			_stopped = false;
			_ns.play(this.url);
		}
				
		public function stop():void 
		{
			Logger.send(Logger.DEBUG, "[FLVElement] Stopping: " + this.url);
			
			_stopped = true;
			_ns.close();
		}
		
		public function pause():void
		{	
			_ns.pause();
		}
		
		public function resume():void
		{	
			_ns.resume();
		}
		
		public function get paused():Boolean
		{	
			return _paused;
		}
		
		public function get fps():Number
		{
			return _ns.currentFPS;
		}
		
		public function destroy():void 
		{
			Logger.send(Logger.DEBUG, "[FLVElement] Destroying");
			_stopped = true;
			if (_ns)
				_ns.close();		
			if (_nc)
				_nc.close();			
		}
		
		override protected function invalidate():void
		{
			Logger.send(Logger.DEBUG, "[FLVElement] Invalidating: " + width + "x" + height);
			
			if (_video && width && height) {
				if (scaleToFit) {
					var size:Array = Util.rescale(_video.width, _video.height, width, height);
					if (size[0] && 
						size[1]) {
						_video.width = size[0];
						_video.height = size[1];
					}					
				}			
				if (alignToCenter) {
					_video.x = (width / 2) - (_video.width / 2);
					_video.y = (height / 2) - (_video.height / 2);
				}
			}			
			
			super.invalidate();
		}
		
		protected function connectStream():void 
		{						
			_video = new Video();
			addChild(_video);
			
			_ns = new NetStream(_nc);
			_ns.addEventListener(NetStatusEvent.NET_STATUS, onStreamStatus);
			_ns.client = this;		
			
			_video.attachNetStream(_ns);			
		}
		
		protected function onConnectionAsyncError(event:AsyncErrorEvent):void 
		{
			Logger.send(Logger.DEBUG, "[FLVElement] Connection IO Error");			
			session.setError("Peer closed the connection");
		}
		
		protected function onConnectionIoError(event:IOErrorEvent):void 
		{
			Logger.send(Logger.DEBUG, "[FLVElement] Connection IO Error");			
			session.setError("Peer closed the connection");
		}
		
		protected function onConnectionStatus(event:NetStatusEvent):void 
		{
			Logger.send(Logger.DEBUG, "[FLVElement] Connection Status: " + event.info.code);
			switch (event.info.code) {
				case "NetConnection.Connect.Success":
					connectStream();
					break;
				case "NetConnection.Connect.Failed":
					session.setError("Connection failed");
					break;
				
				// This callback is unreliable
				case "NetConnection.Connect.Closed":
					session.setError("Connection closed by remote peer");
					break;
			}
		}
		
		protected function onConnectionSecurityError(event:NetStatusEvent):void
		{
			Logger.send(Logger.DEBUG, "[FLVElement] Connection Security Error: " + event.info.code);
			session.setError("Security error");
		}
		
		public function onMetaData(info:Object):void 
		{ 
			for (var propName:String in info) {
				Logger.send(Logger.DEBUG, "[FLVElement] Metadata: " + propName + " = " + info[propName]);
				
				// resize only if not explicitly set
				if (!_video.width || !_video.height) {
					_video.width = info['width'];
					_video.height = info['height'];					
				}
			}
		}
		
		public function onStreamStatus(event:NetStatusEvent):void
		{
			Logger.send(Logger.DEBUG, "[FLVElement] Net Status Handler: " + event.info.code);
			
			if (event.info.code == "NetStream.FileStructureInvalid") {
				Logger.send(Logger.DEBUG, "The MP4's file structure is invalid.");
			}
			else if (event.info.code == "NetStream.NoSupportedTrackFound") {
				Logger.send(Logger.DEBUG, "The MP4 doesn't contain any supported tracks");
			}
			
			// HACK: NetConnection.Connect.Closed is unreliable, so
			// we can use the NetStream.Play.Stop event to determine
			// if the connection was closed without user interaction.
			// If this is the case we explicitly close the netstream 
			// to trigger NetConnection.Connect.Closed
			else if (event.info.code == "NetStream.Play.Stop") {
				if (!_stopped)
					_nc.close();				
			}
		}
		
		public function get parser():Parser
		{
			// None required, using native decoder 
			return null;
		}
		
		
		/*
		public function saveSnapshot(filename:String, width:Number, height:Number):void 
		{	
			Logger.send(Logger.DEBUG, "[FLVElement] takeSnapshot");			
			var data:BitmapData = new BitmapData(width, height);
			
			var mat:Matrix = new Matrix();
			mat.scale(width / 320, height / 240);
			data.draw(_video, mat);			
			
			var bitmap:Bitmap = new Bitmap(data);				
			var encoder:JPEGEncoder = new JPEGEncoder(100);
			var snapshot:ImageSnapshot = ImageSnapshot.captureImage(bitmap, 0, encoder);
			var fileRef:FileReference = new FileReference();			
			fileRef.save(snapshot.data, filename);	
		}
		
		
		override protected function createChildren():void 
		{
			super.createChildren();
			
			_videoUI.addChild(_video);	
			_videoUI.percentWidth = 100;
			_videoUI.percentHeight = 100;		
			addElement(_videoUI);
		}		
		
		override protected function updateDisplayList(unscaledWidth:Number, unscaledHeight:Number):void 
		{			
			// Rescale the _video element to fit the container
			// maintaining 3:4 aspect ratio.
			if (unscaledWidth >= (unscaledHeight * 1.25)) { // scale horizontally
				Logger.send(Logger.DEBUG, "[FLVElement] scale horizontally");	
				_video.width = unscaledHeight * 1.25;
				_video.height = unscaledHeight;	
			}
			else {
				Logger.send(Logger.DEBUG, "[FLVElement] scale vertically");	
				_video.width = unscaledWidth;
				_video.height = unscaledWidth * 0.75;					
			}
			
			_video.x = (unscaledWidth / 2) - (_video.width / 2);
			_video.y = (unscaledHeight / 2) - (_video.height / 2);
		}
		*/
	}
}