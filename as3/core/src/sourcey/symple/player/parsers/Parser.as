package sourcey.symple.player.parsers
{
	import  sourcey.symple.player.MediaEvent;
	
	import flash.events.EventDispatcher;
	import flash.events.IEventDispatcher;
	import flash.utils.ByteArray;
	
	[Event(name="data", type="sourcey.symple.player.MediaEvent")]	
	
	public class Parser extends EventDispatcher
	{
		public var frameNumber:uint = 0;
		
		public function Parser()
		{
			super();
		}
		
		public function parse(input:ByteArray):void 
		{			
			// Default behaviour is just to proxy data.
			send(input);
		}
		
		public function send(output:ByteArray):void 
		{
			frameNumber++;
			dispatchEvent(new MediaEvent(MediaEvent.DATA, output));	
		}
	}
}