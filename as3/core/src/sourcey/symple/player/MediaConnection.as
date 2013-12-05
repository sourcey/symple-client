package sourcey.symple.player
{	
	import flash.events.Event;
	import flash.utils.ByteArray;
	import flash.utils.IDataInput;
	
	import sourcey.net.StatefulSocket;
	import sourcey.net.URL;
	import sourcey.symple.player.parsers.Parser;
	import sourcey.util.Logger;
	
	public class MediaConnection extends StatefulSocket
	{
		public var _url:URL;
		public var _parser:Parser;
		public var _request:String;
		public var _paused:Boolean = false;
			
		public function MediaConnection(url:String, parser:Parser = null)
		{			
			_url = new URL(url);
			_parser = parser;
			_request = "GET " + _url.pathAndQuery + " HTTP/1.1\r\n\r\n";
			
			super(); //_url.host, _url.port
		}
		
		public function play():void
		{
			Logger.send(Logger.DEBUG, "[MediaConnection] Play: " + _url.host + ":" + _url.port);
			super.connect(_url.host, _url.port);
		}
		
		public function stop():void
		{
			Logger.send(Logger.DEBUG, "[MediaConnection] Stop");
			super.close();
		}		
		
		public function pause():void
		{	
			Logger.send(Logger.DEBUG, "[MediaConnection] Pausing");
			_paused = true;
		}
		
		public function resume():void
		{	
			Logger.send(Logger.DEBUG, "[MediaConnection] Resuming");
			_paused = false;
		}
		
		public function get paused():Boolean
		{	
			return _paused;
		}
		
       	public function sendInitHeader():void 
		{
    		//var request:String = "GET " + _url.pathAndQuery + " HTTP/1.1\r\n\r\n"
			Logger.send(Logger.DEBUG, "[MediaConnection] Sending request: " + _request);
			super.sendUTF(_request);
        }
		
		override protected function onConnect(event:Event):void 
		{			
			Logger.send(Logger.DEBUG, "[MediaConnection] Connected: " + _url.protocol);
			super.onConnect(event);	
			if (_request.length && _url.protocol.toLowerCase() == "http")
				sendInitHeader();			
        }
			
		override protected function onData(data:IDataInput):void 
		{
			if (_parser && !_paused) {
				var buffer:ByteArray = new ByteArray();
				data.readBytes(buffer, buffer.length);
				//Logger.send(Logger.DEBUG, "MediaConnection[" + host + ":" + port + "] onData: " + buffer.length);
				_parser.parse(buffer);
				buffer.clear();				
			}
		}	       
	}
}