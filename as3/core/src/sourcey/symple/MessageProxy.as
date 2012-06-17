package sourcey.symple
{
	import sourcey.util.Logger;

	public class MessageProxy
	{
		public var listeners:Array = [];
		
		public function MessageProxy()
		{
		}
		
		public function addListener(listener:MessageListener):void 
		{
			this.listeners.push(listener);
		}	
		
		public function removeListener(listener:MessageListener):void 
		{
			for (var i:int = 0; i < listeners.length; i++) {
				if (listeners[i].equals(listener)) {
					listeners.splice(i, 1);
					return;
				}
			}
		}
		
		public function removeListeners(klass:*):void 
		{
			for (var i:int = 0; i < listeners.length; i++) {
				if (listeners[i].klass == klass) {
					listeners.splice(i, 1);
				}
			}
		}
		
		public function onMessage(message:Object):void
		{
			for (var i:int = 0; i < listeners.length; i++) {
				if (listeners[i].cancelled) {
					listeners[i].splice(i, 1);
					continue;
				}
				Logger.send(Logger.DEBUG, 
					"[MessageProxy] On Message: " + message.node);
				
				if (listeners[i].accepts(message)) {
					listeners[i].callback(message);
				}				
			}
		}		
	}
}