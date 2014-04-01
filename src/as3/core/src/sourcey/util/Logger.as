package sourcey.util
{	
	import sourcey.util.ILogger;

	public class Logger
	{		
		// Log Levels
		public static const DEBUG:String = "debug";	
		public static const INFO:String = "info";
		public static const ERROR:String = "error";				
		
		/**
		 *  @private
		 *  Storage for the impl getter.
		 *  This gets initialized on first access,
		 *  not at static initialization time, in order to ensure
		 *  that the Singleton registry has already been initialized.
		 */
		private static var _impl:ILogger = null;		
		
		
		/**
		 *  @private
		 *  The singleton instance of DragManagerImpl which was
		 *  registered as implementing the IDragManager interface.
		 */
		private static function get impl():ILogger
		{
			if (!_impl)
				_impl = new LoggerImpl();
			
			return _impl;
		}
		
		
		public function Logger() 
		{
			if (_impl != null)
				throw new Error("Please use the instance property to access."); 
		}		
		
		//function addListener(type:String, listener:Function):void;
		//function removeListener(type:String, listener:Function):void;		
		
		public static function addListener(level:String, listener:Function):void
		{
			impl.addEventListener(level, listener);
		}
		
		public static function removeListener(level:String, listener:Function):void
		{
			impl.removeEventListener(level, listener);
		}		
		
		public static function send(level:String, text:String):void
		{
			impl.send(level, text);
		}
	}
}