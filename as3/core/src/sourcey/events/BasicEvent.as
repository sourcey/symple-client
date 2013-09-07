package sourcey.events
{
	import flash.events.Event;
	
	public class BasicEvent extends Event
	{	
		public var data:*;		
		public function BasicEvent(type:String, data:* = null, bubbles:Boolean = true, cancelable:Boolean = true)
		{
			this.data = data;
			super(type, bubbles, cancelable);
		}		
	}
}