package sourcey.symple
{
	public class CommandListener extends MessageListener
	{
		public var node:String;
		public var params:Array;
		
		public function CommandListener(klass:*, node:String, callback:Function, useOnce:Boolean = false, priority:Number = 0)
		{
			this.node = node;
			this.params = node.split(':');
			super(klass, callback, useOnce, priority);
		}
		
		override public function accepts(command:Object):Boolean 
		{
			var xparams:Array = command.node.split(':');			
			for (var i:int = 0; i < xparams.length; i++) {
				
				// Wildcard * matches everything until next parameter.				
				if (params[i] == "*") 
					continue;			
				if (xparams.length <= i)
					return false;
				if (params[i] != xparams[i])
					return false;
			}
			
			return true;
		}
		
		override public function equals(other:*):Boolean 
		{
			return other is CommandListener && 	
				other.node == node && 
				super.equals(other);
			
			//if (other is CommandListener && 				
			//	other.callback == callback &&
			//	other.node == node)
			//	return true;
			//return false;
		}
	}
}