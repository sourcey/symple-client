package sourcey.util
{
	import flash.events.TimerEvent;
	import flash.external.ExternalInterface;
	import flash.utils.Timer;
	
	public class JFlashBridge
	{
		public var objectName:String = "";
		//public var methodNamespace:String = "";
		public var jsReadyFuncName:String = "isJSReady";
		public var swfLoadedFuncName:String = "onSWFLoaded";		
		
		public function JFlashBridge()
		{
		}
		
		public function initialize():void 
		{
			if (ExternalInterface.available) {
				objectName = getSWFObjectName();
				try {
					// Exposed API methods
					//ExternalInterface.addCallback("loadMedia", loadMedia);
					//ExternalInterface.addCallback("loadSpectrogramData", loadSpectrogramData);	
					
					if (checkReady()) {
						available = true;
					} else {
						trace("JavaScript is not ready yet, creating timer.");
						var readyTimer:Timer = new Timer(100, 0);
						readyTimer.addEventListener(TimerEvent.TIMER, onReadyTimer);
						readyTimer.start();
					}
				} catch (error:SecurityError) {
					trace("A SecurityError occurred: " + error.message);
				} catch (error:Error) {
					trace("An Error occurred: " + error.message);
				}
			} else {
				trace("JavaScript external interface is not available.");
			}
		}
		
		//
		// Adds a callback for receiving method calls from our
		// external JavaScript interface.
		//
		public function addMethod(name:String, callback:Function):void 
		{
			ExternalInterface.addCallback(name, callback);				
		}		
		
		//
		// Calls an external JavaScript method.
		//
		public function call(method:String, ...parameters):* {
			//if (!available)
			//	trace("The JavaScript API is unavailable.");
			var args:Array = [];
			args.push("JFlashBridge.call");
			args.push(objectName);
			args.push(method);
			//args.concat(parameters)
			//methodNamespace
			//	[methodNamespace + method]
			return ExternalInterface.call.apply(ExternalInterface, args.concat(parameters));
		}		
		
		/*
		//
		// Calls an external JavaScript method.
		//
		public function tryCall(method:String, ...parameters):void {
			if (!available)
				trace("The JavaScript API is unavailable.");
			
			ExternalInterface.call(method, parameters);
		}
		*/
		
		public function getSWFObjectName():String 
		{
			// Returns the SWF's object name for getElementById
			
			var js:XML;
			js = <script><![CDATA[
				function(__randomFunction) {
					var check = function(objects){
							for (var i = 0; i < objects.length; i++){
								if (objects[i][__randomFunction]) return objects[i].id;
							}
							return undefined;
						};
		
						return check(document.getElementsByTagName("object")) || check(document.getElementsByTagName("embed"));
				}
			]]></script>;
			
			var __randomFunction:String = "checkFunction_" + Math.floor(Math.random() * 99999); // Something random just so it's safer
			ExternalInterface.addCallback(__randomFunction, getSWFObjectName); // The second parameter can be anything, just passing a function that exists
			
			return ExternalInterface.call(js, __randomFunction);
		}
		
		//
		// Protected
		//
		
		private function checkReady():Boolean 
		{
			//Logger.send(Logger.DEBUG, 
			//	"[JSWFBridge] Check Ready " + call(jsReadyFuncName));
			
			//var isReady:Boolean = ExternalInterface.call("isJSReady");
			//trace("JavaScript ready status: ", isReady);
			var res:* = call(jsReadyFuncName);
			if (res == undefined ||
				res == null) {
				// If no function exists then we return ready.
				return true;
			}			
			return Boolean(res);
		}
		
		private function onReadyTimer(event:TimerEvent):void 
		{
			var isReady:Boolean = checkReady();
			if (isReady) {
				Timer(event.target).stop();
				available = true;
			}
		}	
		
		//
		// Accessors
		//		
		
		private var _available:Boolean = false;	
		public function get available():Boolean { return _available; }			
		public function set available(value:Boolean):void
		{
			if (_available != value) {
				_available = value;
				if (_available) {
					call(swfLoadedFuncName);					
				}
			}
		}
	}
}