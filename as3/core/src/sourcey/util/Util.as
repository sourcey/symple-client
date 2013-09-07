package sourcey.util
{
	import flash.display.DisplayObject;
	import flash.geom.Point;

 	public final class Util 
	{
		public static function randomString(length:uint = 1, userAlphabet:String = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"):String
		{
		  	var alphabet:Array = userAlphabet.split("");
		  	var alphabetLength:int = alphabet.length;
		  	var randomLetters:String = "";
		  	for (var i:uint = 0; i < length; i++){
				randomLetters += alphabet[int(Math.floor(Math.random() * alphabetLength))];
		  	}
		  	return randomLetters;
		}
		
		public static function assertObjectProperties(obj:Object, props:Array, message:String = "Not found"):void 
		{
			if (!obj) 
				throw new Error(message);
			for (var i:uint = 0; i < props.length; i++){
				if (!obj.hasOwnProperty(props[i]))
					throw new Error(message + ': ' + props[i]);
			}			
		}
		
		public static function rescale(srcW:Number, srcH:Number, maxW:Number, maxH:Number):Array 
		{
			var maxRatio:Number = maxW / maxH;
			var srcRatio:Number = srcW / srcH; // 1.33
			if (srcRatio < maxRatio) {
				srcH = maxH;
				srcW = srcH * srcRatio;
			} else {
				srcW = maxW;
				srcH = srcW / srcRatio;
			}
			
			//return [Math.round(srcW), Math.round(srcH)];
			return [srcW, srcH];
		}		
		
		public static function isVisible(object:DisplayObject):Boolean 
		{
			var point:Point = object.localToGlobal(new Point(5, 5));
			var objects:Array = object.stage.getObjectsUnderPoint(point);
			if (objects.length > 0) {
				if (isDescendantOf(object, objects[objects.length - 1] as DisplayObject)) {
					return true;
				}
			}
			return false;
		}
				
		public static function isDescendantOf(parent:DisplayObject, child:DisplayObject):Boolean  
		{
			while (child.parent != null) {
				if (child.parent === parent) {
					return true;
				} else {
					child = child.parent;
				}
			}
			return false;
		}
		
		public static function wordUppercase(s:String):String 
		{
			var firstChar:String = s.substr(0, 1); 
			var restOfString:String = s.substr(1, s.length); 			
			return firstChar.toUpperCase()+restOfString.toLowerCase(); 
		}
	}
}
