package sourcey.symple
{
	public class MessageSessionListener extends MessageListener
	{
		public var sessionID:String;
		public var cancelOnComplete:Boolean;
		
		public function MessageSessionListener(klass:*, 
											   sessionID:String, 
											   callback:Function, 
											   cancelOnComplete:Boolean = true, 
											   priority:Number = 0)
		{
			this.sessionID = sessionID;
			this.cancelOnComplete = cancelOnComplete;
			super(klass, callback, false, priority);
		}
		
		override public function accepts(message:Object):Boolean 
		{			
			if (message.id != sessionID)
				return false;
			
			return true;
		}
		
		override public function notify(message:Object):void 
		{			
			super.notify(message);
			
			// Destroy when the message status is completed
			if (cancelOnComplete &&
				message.status != 202)
				cancelled = true;
		}
		
		override public function equals(other:*):Boolean 
		{
			if (other is MessageSessionListener && 				
				other.callback == callback &&
				other.sessionID == sessionID)
				return true;
			return false;
		}
	}
}