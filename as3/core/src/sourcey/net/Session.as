package sourcey.net
{	
	import flash.events.EventDispatcher;
	
	import sourcey.events.BasicEvent;
	
	[Event(name="stateChanged", type="sourcey.events.BasicEvent")]
	
	public class Session extends EventDispatcher
	{
		public static const STATE_CHANGED:String 		= "stateChanged";
		
		public static const STATE_INACTIVE:String 		= "Inactive";
		public static const STATE_NEGOTIATING:String 	= "Negotiating";
		public static const STATE_ACTIVE:String 		= "Active";
		public static const STATE_ERROR:String 			= "Error";
		
		public var error:String; 	// Stores any errors encountered along the way...	
		
		public function Session()
		{
		}
		
		// Implements the session state machine
		private var _state:String = STATE_INACTIVE;		
		public function get state():String { return _state; }
		public function set state(value:String):void 
		{
			if (_state == value)
				return;
			
			//Logger.send(Logger.DEBUG, 
			//	"[MessageSession] Setting state from '" + _state + "' to '" + value + "'");
			_state = value;
			
			dispatchEvent(new BasicEvent(STATE_CHANGED, _state));
		}
	}
}