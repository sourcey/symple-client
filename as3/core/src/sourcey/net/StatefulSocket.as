package sourcey.net
{
	//import com.anionu.utils.Logger;
	
	import flash.errors.*;
	import flash.events.*;
	import flash.net.Socket;
	import flash.utils.ByteArray;
	import flash.utils.IDataInput;
	import flash.utils.Timer;
	import flash.utils.clearInterval;
	import flash.utils.setInterval;
	import flash.system.Security;
	
	[Event(name="stateChanged", type="flash.events.Event")]	
	
	public class StatefulSocket extends Socket
	{
		public static const STATE_CHANGED:String 		= "stateChanged";
		
		public static const STATE_NONE:String 			= "None";
		public static const STATE_CONNECTING:String 	= "Connecting";
		public static const STATE_CONNECTED:String 		= "Connected";
		public static const STATE_DISCONNECTED:String 	= "Disconnected"; // Possibly with error
		
		public var host:String; 
		public var port:int;
		
		public var error:String; 	
			// Stores any errors encountered along the way...	
		
		public var connectionTimeout:int = 5;
		public var connectionTimer:Timer;
		public var reconnectOnDisconnect:Boolean = false;
		public var reconnectDelay:int = 5;
		
		public function StatefulSocket(host:String = null, port:int = 0)
		{
			this.host = host;
			this.port = port;		
			
			super(host, port);
			
			configureListeners();	
		}
		
		// override public function 
		private function configureListeners():void 
		{
			addEventListener(Event.CLOSE, onDisconnect);
			addEventListener(Event.CONNECT, onConnect);
			addEventListener(IOErrorEvent.IO_ERROR, onIoError);
			addEventListener(SecurityErrorEvent.SECURITY_ERROR, onSecurityError);
			addEventListener(ProgressEvent.SOCKET_DATA, onReceiveData);
		}
		
		// Implements the state machine
		private var _state:String = STATE_NONE;		
		public function get state():String { return _state; }
		public function set state(value:String):void 
		{			
			if (reconnectOnDisconnect && 
				value == STATE_DISCONNECTED &&
				(state == STATE_CONNECTING || 
				 state == STATE_CONNECTED)) {
				tryReconnect();
			}
			
			if (_state == value)
				return;
			
			trace("[StatefulSocket] Setting state from '" + _state + "' to '" + value + "'");
			_state = value;
			
			cancelTimeout();
			dispatchEvent(new DataEvent(STATE_CHANGED, false, false, _state));
		}
		
		override public function connect(host:String, port:int):void
		{			
			if (connected)
				throw new Error("The socket is already connected.");
			
			if (host == null || port == 0)
				throw new Error("The host and port must be set.");	
			
			trace("StatefulSocket[" + host + ":" + port + "] Connecting");		
			state = STATE_CONNECTING;
			
			this.host = host;
			this.port = port;
			
			//Security.loadPolicyFile('http://' + 
			//		this.host + ':' + 
			//		this.port.toString() + '/crossdomain.xml');	
			
			super.connect(host, port);
			
			// Since flash does not raise a security error for a 
			// good 20 secs we will implement our own connection
			// timer.			
			connectionTimer = new Timer(connectionTimeout * 1000, 0);
			connectionTimer.addEventListener(TimerEvent.TIMER, onTimeout);
			connectionTimer.start();
			/*
			readyTimer.start();
			var delay:uint = setInterval(function():void {	
				clearInterval(delay);			
				onTimeout();
			}, connectionTimeout * 1000);
			*/
		}
		
		override public function close():void
		{		
			trace("StatefulSocket[" + host + ":" + port + "] Closing");				
			state = STATE_NONE;	
			if (super.connected)
				super.close();				
		}
			
		// Starts a connection timer which fires after [x] secconds..  
		protected function tryReconnect():void
		{
			var delay:uint = setInterval(function():void {	
				clearInterval(delay);			
				connect(host, port);
			}, reconnectDelay * 1000);
		}
		
		public function sendUTF(data:String):void
		{	
			writeUTFBytes(data);
			flush();			
		}
		
		public function send(data:*):void
		{
			writeObject(data);
			flush();
		}	
		
		protected function cancelTimeout():void 
		{
			if (connectionTimer) {
				connectionTimer.removeEventListener(TimerEvent.TIMER, onTimeout);	
				connectionTimer = null;
			}				
		}
		
		//
		// Overridable Socket Callback Methods
		// NOTE: Sub-classes must call super on overridden methods.
		//
		protected function onConnect(event:Event):void 
		{	
			trace("StatefulSocket[" + host + ":" + port + "] Connected: " + event);
			
			state = STATE_CONNECTED;
		}			
		
		protected function onReceiveData(event:ProgressEvent):void 
		{				
			onData(this as IDataInput);
		}		
		
		protected function onData(buffer:IDataInput):void 
		{			
			// Designed to be overridden...
			// ProgressEvent.SOCKET_DATA can also be delegated.
		}
		
		protected function onDisconnect(event:Event):void 
		{
			trace("StatefulSocket[" + host + ":" + port + "] Disconnected: " + event);
			
			error = "";
			state = STATE_DISCONNECTED;
		}
		
		protected function onIoError(event:IOErrorEvent):void 
		{
			trace("StatefulSocket[" + host + ":" + port + "] IO Error: " + event);
			
			error = "IO Error on " + host + ":" + port;
			state = STATE_DISCONNECTED;
		}
		
		protected function onSecurityError(event:SecurityErrorEvent):void 
		{
			trace("StatefulSocket[" + host + ":" + port + "] Security Error: " + event);
			
			// Generally we will be timed out by the time we
			// make it here, but at least we can update the 
			// error message.
			error = "Security Error: Failed to connect to " + host + ":" + port;
			state = STATE_DISCONNECTED;
		}
		
		protected function onTimeout(event:TimerEvent):void 
		{
			trace("StatefulSocket[" + host + ":" + port + "] Timeout: " + connectionTimeout);
			
			error = "Timeout: Failed to connect to " + host + ":" + port;
			state = STATE_DISCONNECTED;
		}
	}
}


/*

//public var sockBuffer:ByteArray;	
//this.sockBuffer = new ByteArray();
readBytes(sockBuffer, sockBuffer.length);	
trace("StatefulSocket[" + host + ":" + port + "] onRecv: " + sockBuffer.length);	
//try {	
//} 
//catch (error:Error) {	
//	Logger.send(Logger.ERROR, "StatefulSocket[" + host + ":" + port + "] " + error.toString());				
//}
sockBuffer.clear();
trace("StatefulSocket[" + host + ":" + port + "] Buffer Cleared: " + sockBuffer.length);
trace("StatefulSocket[" + host + ":" + port + "] Available After Clear: " + bytesAvailable);
*/