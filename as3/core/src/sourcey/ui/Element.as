package sourcey.ui
{
	import flash.display.DisplayObjectContainer;
	import flash.display.Sprite;
	import flash.display.Stage;
	import flash.display.StageAlign;
	import flash.display.StageScaleMode;
	import flash.events.Event;
	import flash.filters.DropShadowFilter;
	
	[Event(name="resize", type="flash.events.Event")]
	public class Element extends Sprite
	{
		protected var _width:Number = 0;
		protected var _height:Number = 0;
		protected var _backgroundColor:uint = 0;
		protected var _backgroundAlpha:Number = 1.0;

		
		//
		// Constructor
		// @param parent The parent DisplayObjectContainer on which to add this element.
		// @param x The x position to place this element.
		// @param y The y position to place this element.
		// 
		public function Element(parent:DisplayObjectContainer = null, x:Number = 0, y:Number =  0)
		{
			super();
			move(x, y);
			init();
			if (parent != null)
				parent.addChild(this);
		}
		
		//
		// Initilizes the element.
		// 
		protected function init():void
		{
			addChildren();
			invalidate();
		}
		
		//
		// Overriden in subclasses to create child display objects.
		// 
		protected function addChildren():void
		{			
		}
		
		//
		// DropShadowFilter factory method, used in many of the elements.
		// @param dist The distance of the shadow.
		// @param knockout Whether or not to create a knocked out shadow.
		// 
		protected function getShadow(dist:Number, knockout:Boolean = false):DropShadowFilter
		{
			return new DropShadowFilter(dist, 45, 0x000000, 1, dist, dist, .3, 1, knockout);
		}
		
		//
		// Marks the element to be redrawn on the next frame.
		// 
		protected function invalidate():void
		{
			addEventListener(Event.ENTER_FRAME, onInvalidate);
		}
				
		
		//
		// Public methods
		//
		
		//
		// Utility method to set up usual stage align and scaling.
		// 
		public static function initStage(stage:Stage):void
		{
			stage.align = StageAlign.TOP_LEFT;
			stage.scaleMode = StageScaleMode.NO_SCALE;
		}
		
		//
		// Moves the element to the specified position.
		// @param x the x position to move the element
		// @param y the y position to move the element
		// 
		public function move(x:Number, y:Number):void
		{
			this.x = x;
			this.y = y;
		}
		
		//
		// Sets the size of the element.
		// @param w The width of the element.
		// @param h The height of the element.
		// 
		public function setSize(w:Number, h:Number):void
		{
			_width = w;
			_height = h;
			dispatchEvent(new Event(Event.RESIZE));
			invalidate();
		}
		
		//
		// Abstract draw function.
		// 
		public function draw():void
		{
			if (_backgroundColor &&
				_width && _height) {
				graphics.clear();
				graphics.beginFill(_backgroundColor, _backgroundAlpha);
				graphics.drawRect(0, 0, _width, _height);
			}
		}
		
		
		
		
		//
		// Event handlers
		//
		
		//
		// Called one frame after invalidate is called.
		// 
		protected function onInvalidate(event:Event):void
		{
			removeEventListener(Event.ENTER_FRAME, onInvalidate);
			draw();
		}
		
		
		
		
		//
		// Getters/Setters
		//
		
		//
		// Sets/gets the width of the element.
		// 
		override public function set width(w:Number):void
		{
			_width = w;
			invalidate();
			dispatchEvent(new Event(Event.RESIZE));
		}
		
		override public function get width():Number
		{
			return _width;
		}
		
				
		//
		// Sets/gets the height of the element.
		// 
		override public function set height(h:Number):void
		{
			_height = h;
			invalidate();
			dispatchEvent(new Event(Event.RESIZE));
		}
		
		override public function get height():Number
		{
			return _height;
		}
		
		
		//
		// Sets/gets the background color of the element.
		// 
		public function set backgroundColor(code:uint):void
		{			
			_backgroundColor = code;
			invalidate();
		}
		
		public function get backgroundColor():uint
		{
			return _backgroundColor;
		}
		
		
		//
		// Sets/gets the background alpha of the element.
		// 
		public function set backgroundAlpha(value:Number):void
		{			
			_backgroundAlpha = value;
			invalidate();
		}
		
		public function get backgroundAlpha():Number
		{
			return _backgroundAlpha;
		}
		
		
		
		
		//
		// Overrides the setter for x to always place the element on a whole pixel.
		// 
		override public function set x(value:Number):void
		{
			super.x = Math.round(value);
		}
		
		//
		// Overrides the setter for y to always place the element on a whole pixel.
		// 
		override public function set y(value:Number):void
		{
			super.y = Math.round(value);
		}		
	}
}