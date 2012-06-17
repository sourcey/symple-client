package sourcey.symple
{
	public class MessageListener
	{			
		public var klass:*;
		public var callback:Function;
		public var priority:Number;		
		public var clientData:*;
		
		// Listeners that do not use the useOnce flag
		// will need to be explicitly destroyed.
		public var useOnce:Boolean;
		public var cancelled:Boolean = false;
		
		public function MessageListener(klass:*, callback:Function, useOnce:Boolean = false, priority:Number = 0) 
		{
			this.klass = klass;
			this.callback = callback;
			this.priority = priority;
			this.useOnce = useOnce;	
		}
		
		public function accepts(data:Object):Boolean 
		{
			return true;
		}
		
		public function notify(data:Object):void 
		{	
			callback(data);
			if (useOnce)
				cancelled = true;
		}
		
		public function equals(other:*):Boolean 
		{
			trace("MessageListener == other")
			if (//other is MessageListener && 
				other.klass == klass &&
				other.callback == callback)
				return true;
			return false;
		}
	}
}