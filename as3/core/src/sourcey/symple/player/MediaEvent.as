package sourcey.symple.player
{
	import flash.events.Event;
	
	public class MediaEvent extends Event
	{
		public static const DATA:String = "onData";
		public static const METADATA:String = "onMetadata";		
		public var data:*;		
		public function MediaEvent(type:String = DATA, data:* = null, bubbles:Boolean = true, cancelable:Boolean = true)
		{
			this.data = data;
			super(type, bubbles, cancelable);
		}		
	}
}