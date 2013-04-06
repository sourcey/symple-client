package sourcey.symple.player
{		
	import flash.events.Event;
	import flash.events.IOErrorEvent;
	import flash.media.ID3Info;
	import flash.media.Sound;
	import flash.media.SoundTransform;
	import flash.net.URLRequest;
	
	import sourcey.symple.player.parsers.Parser;
	import sourcey.ui.Element;
	import sourcey.util.Logger;
	import sourcey.util.Util;
	
	public class SoundElement extends Element implements IVideoElement
	{
		public var session:MediaSession;
		public var url:String;
		public var protocol:String;
			
		private var _sound:Sound;
		private var _req:URLRequest;
		
		public function SoundElement(session:MediaSession, url:String = "", protocol:String = "Raw")
		{
			Logger.send(Logger.DEBUG, "[SoundElement] Creating");
			
			super();
			
			this.session = session;
			this.url = url;
			this.protocol = protocol;
					
			_sound = new Sound();
			_sound.addEventListener(IOErrorEvent.IO_ERROR, ioErrorHandler);
			_sound.addEventListener(Event.ID3, id3Handler);
		}
		
		public function destroy():void 
		{
			Logger.send(Logger.DEBUG, "[SoundElement] Destroying");
			if (_sound)
				_sound.close();			
		}
		
		public function play():void 
		{
			Logger.send(Logger.DEBUG, "[SoundElement] Playing: " + this.url);
			
			if (protocol != "Raw")
				throw Error("This component only handles raw media streams.");
			
			_req = new URLRequest(this.url);	
			_sound.load(_req);
			_sound.play();
			
		}
		
		public function stop():void 
		{
			Logger.send(Logger.DEBUG, "[SoundElement] Stopping: " + this.url);
			
			_sound.close();
		}
		
		public function pause():void
		{	
			// can't do this
		}
		
		public function resume():void
		{	
			// can't do this
		}
		
		public function get paused():Boolean
		{	
			return false;
		}
		
		public function get fps():Number
		{
			return 0; //_sound.currentFPS;
		}
		
		public function get parser():Parser
		{
			// None required, using native decoder 
			return null;
		}
		
		private function ioErrorHandler(event:IOErrorEvent):void
		{
			Logger.send(Logger.ERROR, "[SoundElement] Error: " + event.text);
		}
		
		private function id3Handler(event:Event):void {
			var id3:ID3Info = _sound.id3;			
			for (var propName:String in id3) {
				Logger.send(Logger.DEBUG, "[SoundElement] Metadata: " + propName + " = " + id3[propName]);
			}
		}
	}
}