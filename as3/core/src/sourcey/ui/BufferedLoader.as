package sourcey.ui
{
	import flash.display.Bitmap;
	import flash.display.Loader;
	import flash.display.LoaderInfo;
	import flash.events.Event;
	import flash.utils.ByteArray;
	
	import sourcey.util.Logger;
	import sourcey.util.Util;
	
	public class BufferedLoader extends Element
	{		
		public var scaleToFit:Boolean;
		public var alignToCenter:Boolean;
		
		[ArrayElementType("flash.display.Loader")]		
		protected var sources:Array = [];
		protected var currentIndex:int = 0;
		protected var contentWidth:int = 0;
		protected var contentHeight:int = 0;
		protected var numBuffers:int;
		
		public function BufferedLoader(numBuffers:int = 2, scaleToFit:Boolean = true, alignCenter:Boolean = true)
		{
			this.scaleToFit = scaleToFit;
			this.alignToCenter = alignCenter;			
			this.numBuffers = numBuffers;
			this.currentIndex = 0;		
			this.mouseChildren = false;
			this.mouseEnabled = false;
			
			super();			
		}
		
		override protected function addChildren():void
		{
			super.addChildren();
			
			for (var x:int = 0; x < numBuffers; x++) {
				var source:Loader = new Loader();
				source.mouseChildren = false;
				source.mouseEnabled = false;
				source.contentLoaderInfo.addEventListener(Event.COMPLETE, onLoaderLoadComplete);
				addChild(source);
				sources[x] = source;
			}			
		}
				
		public function get currentSource():Loader 
		{
			return sources[currentIndex];
		}
		
		public function loadBytes(bytes:ByteArray):void 
		{				
			var currentSource:Loader = sources[currentIndex];
			currentSource.unloadAndStop(true); // frees memory
			currentSource.loadBytes(bytes);
			
			//Logger.send(Logger.DEBUG, "[BufferedLoader] Load Bytes: " + currentIndex + 
			//	"\n\tSource: " + currentSource.width + "x" + currentSource.height
			//);	
			
			setChildIndex(currentSource, numChildren - 1);
			if (currentIndex < numBuffers - 1)
				currentIndex++;
			else
				currentIndex = 0;
		}
		
		override protected function invalidate():void
		{
			Logger.send(Logger.DEBUG, "[BufferedLoader] Invalidating: " + width + "x" + height);			
			
			super.invalidate();
			//updateLayout(sources[0]);
			
			// TODO: Update every 10 seconds
			for each(var source:Loader in sources) {			
				source.contentLoaderInfo.addEventListener(Event.COMPLETE, onLoaderLoadComplete);
			}
		}
						
		protected function onLoaderLoadComplete(event:Event):void 
		{
			var loaderInfo:LoaderInfo = event.currentTarget as LoaderInfo;
			loaderInfo.removeEventListener(Event.COMPLETE, onLoaderLoadComplete);
			var hasChanged:Boolean = false;
			if (contentWidth != loaderInfo.width ||
				contentHeight != loaderInfo.height) {
				//Logger.send(Logger.DEBUG, "[BufferedLoader] Loader Size Changed: " + 
				//	"\n\tWindow: " + width + "x" + height + 
				//	"\n\tSource: " + loaderInfo.loader.width + "x" + loaderInfo.loader.height +
				//	"\n\tContent: " + contentWidth + "x" + contentHeight
				//);
				contentWidth = loaderInfo.width;
				contentHeight = loaderInfo.height;
				//if (width == 0)
				//	width = contentWidth;
				//if (height == 0)
				//	height = contentHeight;
				hasChanged = true;
			}
			updateLayout(loaderInfo.loader);
			if (hasChanged)
				stage.dispatchEvent(new Event(Event.RESIZE));
		}
		
		protected function updateLayout(loader:Loader):void
		{	
			if (!loader)			
				return;
			
			//Logger.send(Logger.DEBUG, "[BufferedLoader] Update Layout: " + 
			//	"\n\tSource: " + loader.width + "x" + loader.height +
			//	"\n\tContent: " + contentWidth + "x" + contentHeight
			//);
			
			// &&
			//loader.width > 0 || loader.height > 0			
			if (contentWidth > 0 && contentHeight > 0) 
			{			
				var targetWidth:int = scaleToFit ? width ? width : contentWidth : contentWidth;
				var targetHeight:int = scaleToFit ? height ? height : contentHeight : contentHeight;
				var size:Array = [contentWidth, contentHeight];
				if (scaleToFit) {					
					size = Util.rescale(contentWidth, contentHeight,  //loader.width, loader.height, //
						targetWidth, targetHeight);
					//Logger.send(Logger.DEBUG, "[BufferedLoader] Setting Size: " + size[0] + "x" + size[1]);
					if (size[0] && 
						size[1]) {
						loader.width = size[0];
						loader.height = size[1];
					}	
				}				
				if (alignToCenter) {
					loader.x = (targetWidth / 2) - (size[0] / 2);
					loader.y = (targetHeight / 2) - (size[1] / 2);
				}
						
				// Ensure all loaders have the same dimensions.
				if (loader.width &&
					loader.height) {	
					//Logger.send(Logger.DEBUG, "[BufferedLoader] Updating Layout ==: " +
					//	"\n\tSource: " + loader.width + "x" + loader.height +
					//	"\n\tSource Content: " + loader.contentLoaderInfo.width + "x" + loader.contentLoaderInfo.height + 
					//	"\n\tContent: " + contentWidth + "x" + contentHeight
					//);	
					for each(var source:Loader in sources) {							
						try {
							if (source.width != loader.width ||
								source.height != loader.height) {	
								//Logger.send(Logger.DEBUG, "[BufferedLoader] Updating Mismatch Layout: " +
								//	"\n\tSource: " + loader.width + "x" + loader.height +
								//	"\n\tCurrent: " + source.width + "x" + source.height + 
								//	"\n\tContent: " + contentWidth + "x" + contentHeight
								//);
								source.contentLoaderInfo.addEventListener(Event.COMPLETE, onLoaderLoadComplete);
								//source.width = loader.width;
								//source.height = loader.height;
								//source.x = loader.x;
								//source.y = loader.y;	
							}							
						}
						catch (e:Error) {									
							Logger.send(Logger.DEBUG, "[BufferedLoader] Loader Not Ready: " + e.toString());
						}
					}	
				}
				
				/*				
				// Sometimes our our loader dimensions end up as 0x0
				// even though a positive size was set. Listen for the
				// load event so we can update the size.
				else {		
					Logger.send(Logger.DEBUG, "[BufferedLoader] Loader Error: " +
						//"\n\t" + parent.width + "x" + parent.height +
						"\n\tSource: " + width + "x" + height + 
						//"\n\tSource: " + loader.contentLoaderInfo.width + "x" + loader.contentLoaderInfo.height + 
						"\n\tContent: " + contentWidth + "x" + contentHeight// +
						//"\n\tPos: " + loader.x + "x" + loader.y 
					);
				}
				*/
			}
			/*
			Logger.send(Logger.DEBUG, "[BufferedLoader] Loader Height Mismatch: " + 
			loader.width + "x" + loader.height);
			*/
		}
	}
}