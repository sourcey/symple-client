package sourcey.symple
{
	public class EventListener extends MessageListener
	{
		public var name:String;
		
		public function EventListener(klass:*, name:String, callback:Function, useOnce:Boolean = false, priority:Number = 0)
		{
			this.name = name;
			super(klass, callback, useOnce, priority);
		}
		
		override public function accepts(event:Object):Boolean 
		{			
			return name == event.name;
		}
		
		override public function equals(other:*):Boolean 
		{
			trace("EventListener == other", name, other.name)
			
			return other is EventListener && 	
				other.name == name && 
				super.equals(other);
			
			//if (other is EventListener && 				
			//	other.callback == callback &&
			//	other.name == name)
			//	return true;
			//return false;
		}
	}
}