package sourcey.symple.player
{
	import sourcey.symple.player.parsers.Parser;

	//import mx.core.IUIComponent;
	//import mx.core.IVisualElement;

	public interface IVideoElement// extends IVisualElement
	{
		function play():void;
		function stop():void;
		
		function pause():void;
		function resume():void;
		
		function get paused():Boolean;
		function get fps():Number;
		
		function destroy():void;
				
		function get parser():Parser;
		//function saveSnapshot(filename:String, width:Number, height:Number):void;
		//function get connection():MediaConnection;
		//function set connection(value:MediaConnection):void;
	}
}