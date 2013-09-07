package sourcey.util
{	
	import flash.events.IEventDispatcher;
	
	public interface ILogger extends IEventDispatcher
	{		
		function addListener(level:String, listener:Function):void;
		function removeListener(level:String, listener:Function):void;
		function send(level:String, text:String):void;
	}	
}
