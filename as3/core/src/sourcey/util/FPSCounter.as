package sourcey.util
{
	//import flash.display.Sprite;
	//import flash.events.Event;
	//import flash.text.TextField;
	//import flash.text.TextFieldAutoSize;
	import flash.utils.getTimer;
	
	public class FPSCounter// extends Sprite
	{
		public var fps:Number = 0;
		
		private var last:uint = getTimer();
		private var frames:uint = 0;
		//private var tf:TextField;
		
		public function FPSCounter() 
		{ 
			//xPos:int=0, yPos:int=0, color:uint=0xffffff, fillBackground:Boolean=false, backgroundColor:uint=0x000000
			/*
			x = xPos;
			y = yPos;
			tf = new TextField();
			tf.textColor = color;
			tf.text = "----- fps";
			tf.selectable = false;
			tf.background = fillBackground;
			tf.backgroundColor = backgroundColor;
			tf.autoSize = TextFieldAutoSize.LEFT;
			addChild(tf);
			width = tf.textWidth;
			height = tf.textHeight;
			addEventListener(Event.ENTER_FRAME, tick);
			evt:Event
			*/
		}
		
		public function tick():void
		{
			frames++;
			var now:uint = getTimer();
			var delta:uint = now - last;
			if (delta >= 1000) {
				//trace(frames / delta * 1000+" frames:"+frames+" delta:"+delta);
				fps = frames / delta * 1000;
				//tf.text = fps.toFixed(1) + " fps";
				frames = 0;
				last = now;
			}
		}
	}
}