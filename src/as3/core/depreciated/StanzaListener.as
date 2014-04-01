package sourcey.symple
{
	public class StanzaListener extends MessageListener
	{
		public var name:String
		
		public function StanzaListener(name:String, callback:Function, useOnce:Boolean = false, priority:Number = 0)
		{
			this.name = name;
			super(callback, useOnce, priority);
		}
		
		override public function accepts(xml:XML):Boolean 
		{
			if (name != "*" && xml.name() != name)
				return false;			
			return true;
		}
		
		/*
		
		
		override public function equals(other:*):Boolean 
		{
		if (other is StanzaListener && 				
		other.callback == callback &&
		other.name == name)
		return true;
		return false;
		}
		*/
	}
}