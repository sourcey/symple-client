package sourcey.symple
{
	public class CommandSessionListener extends CommandListener
	{
		public var id:String
		
		public function CommandSessionListener(klass:*, command:Object, callback:Function, useOnce:Boolean = false, priority:Number = 0)
		{
			this.id = command.id;
			super(klass, command.node, callback, useOnce, priority);
		}
		
		override public function accepts(command:Object):Boolean 
		{
			if (id.length > 0 && id != command.id)
				return false;
			
			return super.accepts(command);
		}
				
		override public function equals(other:*):Boolean 
		{
			return other is CommandSessionListener && 	
				other.id == id && 
				super.equals(other);
		}
	}
}