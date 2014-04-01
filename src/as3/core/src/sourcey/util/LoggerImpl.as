package sourcey.util
{
	import flash.events.EventDispatcher;
	import sourcey.events.BasicEvent;
	import sourcey.util.ILogger;
	
	[ExcludeClass]
	
	public class LoggerImpl extends EventDispatcher implements ILogger
	{
		public function LoggerImpl()
		{
		}
		
		public function addListener(level:String, listener:Function):void
		{
			addEventListener(level, listener);
		}
		
		public function removeListener(level:String, listener:Function):void
		{
			removeEventListener(level, listener);
		}
		
		public function send(level:String, text:String):void
		{
			trace('Logger: [' + level + '] ' + text);
			dispatchEvent(new BasicEvent(level, text));		
		}
	}
}