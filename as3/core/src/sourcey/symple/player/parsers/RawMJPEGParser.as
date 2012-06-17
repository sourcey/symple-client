package sourcey.symple.player.parsers
{
	import sourcey.symple.player.MediaEvent;
	
	import flash.utils.ByteArray;

	// This class provides parsing for MJPEG streams 
	// with no HTTP encapsulation.
	public class RawMJPEGParser extends Parser
	{
		private var buffer:ByteArray;
		
		public function RawMJPEGParser()
		{
			super();
			
			buffer = new ByteArray()
		}
		
		override public function parse(input:ByteArray):void 
		{
			if (input.length < 2)
				return;				
			
			var gotStartCode:Boolean = 
				input[0] == 255 && 
				input[1] == 216;
			
			var gotEndCode:Boolean = 
				input[input.length - 2] == 255 &&
				input[input.length - 1] == 217;
			
			//trace("[RawMJPEGParser] gotStartCode: " + gotStartCode);				
			//trace("[RawMJPEGParser] gotEndCode: " + gotEndCode);	
			
			// Attempt to parse the full image from the input buffer.
			if (gotStartCode && gotEndCode) {
				
				//trace("[RawMJPEGParser] Valid JPEG: " + input.length);	
				send(input);
			}
			
			// The image is fragmented, extra parsing will be required.
			else if (
				gotStartCode && !gotEndCode) {
				buffer.writeBytes(input);
			}
			else if (
				!gotStartCode && gotEndCode) {
				buffer.writeBytes(input); //, 0, input.length
				
				//trace("[RawMJPEGParser] Valid JPEG: " + buffer.length);	
				send(buffer);
				buffer.clear();
			}
			else {
				buffer.writeBytes(input); //, 0, input.length				
			}
				
			//trace("[RawMJPEGParser] ERROR: Invalid JPEG: " + input.length);	
		}
	}
}