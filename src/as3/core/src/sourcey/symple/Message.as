package sourcey.symple
{
	import sourcey.util.Util;	

	dynamic public class Message extends Object
	{
		//public var id:String;
		//public var to:String;
		//public var from:String;
		
		public function Message()
		{
			this.id = Util.randomString(8);
		}
	}
}