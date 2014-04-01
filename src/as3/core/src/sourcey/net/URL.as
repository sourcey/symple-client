package sourcey.net
{
	public class URL
	{		
		public var host:String;
		public var port:int;
		public var protocol:String;
		public var path:String;
		public var query:String;
		public var parameters:Object;		
		protected var _url:String;	
		
		public function URL(url:String)
		{
			if (url.length)
				parse(url);
		}
			
		public function set url(value:String):void
		{
			parse(_url);
		}
		
		public function get url():String
		{
			return encodeURI(_url);
		}	
		
		public function get pathAndQuery():String
		{
			var s:String = path;
			if (query.length) {
				s += "?"
				s += query
			}
			if (s.length == 0)
				s = "/"
			return encodeURI(s);
		}	
				
		public function parse(url:String):void
		{
			//trace(url);
			_url = url;			
			var reg:RegExp = /(?P<protocol>[a-zA-Z]+) : \/\/  (?P<host>[^:\/]*) (:(?P<port>\d+))?  ((?P<path>[^?]*))? ((?P<query>.*))? /x;
			var results:Array = reg.exec(_url);
			
			protocol = results.protocol
			host = results.host;
			port = Number(results.port);
			path = results.path;
			query = results.query;				
			
			if (!protocol && !host)
				throw Error("Malformed URL: " + _url);
			
			else if (query.length) {
				parameters = null;
				parameters = new Object();				
				if (query.charAt(0) == "?") {
					query = query.substring(1);
				}
				var params:Array = query.split("&");
				for each (var paramStr:String in params) {
					var param:Array = paramStr.split("=");
					parameters[param[0]] = param[1];
				}
			}			
		}
	}
}