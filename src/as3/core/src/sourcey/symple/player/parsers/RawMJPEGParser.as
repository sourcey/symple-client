package sourcey.symple.player.parsers
{
	import sourcey.symple.player.MediaEvent;
	
	import flash.utils.ByteArray;

	// This class provides parsing for MJPEG streams with no HTTP encapsulation.
	public class RawMJPEGParser extends Parser
	{
		private var buffer:ByteArray;
		
		public function RawMJPEGParser()
		{
			super();
			
			buffer = new ByteArray();
		}
		
		override public function parse(input:ByteArray):void 
		{
			if (input.length < 2)
				return;				
			
			var wantStartCode:Boolean = buffer.length == 0;
			var start:int = -1;
			var end:int = -1;
			
			for (var x:int = 0; x < input.length - 1; x++) {	
				
				// Grab the start code if unset
				if (wantStartCode && //start == -1 &&
					input[x] == 255 && 
					input[x + 1] == 216) {
					start = x;
					trace("[RawMJPEGParser] JPEG Start: ", start, x);		
				}
				
				else if (
					input[x] == 255 && 
					input[x + 1] == 217) {
					
					// Must be end of packet, or before next start code
					if (x + 2 == input.length || (
						input[x + 2] == 255 && 
						input[x + 3] == 216)) {
						end = x + 2; 
						trace("[RawMJPEGParser] JPEG End: ", end, x, input.length);	
						break;							
					}	
					else						
						trace("[RawMJPEGParser] JPEG Invalid End: ", x, input.length);	
				}
			}

			//trace("[RawMJPEGParser] Frame: ", input.length, ":", buffer.length, ":", start, ":", end);
			
			// Wait for a start code
			// TODO: Debug warning
			if (wantStartCode && start == -1) {
				trace("[RawMJPEGParser] Skipping frame: No start code");
				return;			
			}
			
			// Bufer incomplete frames
			else if (end == -1) {
				if (buffer.length > 0)
					buffer.writeBytes(input);	
				else if (start >= 0)
					buffer.writeBytes(input, start);		
				else
					throw Error('Parser logic error');
				
				trace("[RawMJPEGParser] Buffering frame: " + buffer.length);
			}
				
			// Dispatch complete frames
			else {
				buffer.writeBytes(input, 0, end);
				
				//var gotStartCode:Boolean = 
				//	buffer[0] == 255 && 
				//	buffer[1] == 216;
				
				//var gotEndCode:Boolean = 
				//	buffer[buffer.length - 2] == 255 &&
				//	buffer[buffer.length - 1] == 217;
				
				trace("[RawMJPEGParser] Complete frame: ", buffer.length); //, gotStartCode, gotEndCode
				send(buffer);
				buffer.clear();				
				
				// Send the remaining buffer through the parser
				if ((input.length - end) > 2) {
					var next:ByteArray = new ByteArray;
					next.writeBytes(input, end, input.length - end);
					parse(next);
				}
			}
		}
	}
}



/*
var gotStartCode:Boolean = 
input[0] == 255 && 
input[1] == 216;

var gotEndCode:Boolean = 
input[input.length - 2] == 255 &&
input[input.length - 1] == 217;

trace("[RawMJPEGParser] gotStartCode: " + gotStartCode);				
trace("[RawMJPEGParser] gotEndCode: " + gotEndCode);	

// Attempt to parse the full image from the input buffer.
if (gotStartCode && gotEndCode) {

trace("[RawMJPEGParser] Valid Full JPEG: " + input.length);	
send(input);
}

// The image is fragmented, extra parsing will be required.
else if (
gotStartCode && !gotEndCode) {
buffer.writeBytes(input);
}
else if (!gotStartCode && gotEndCode) {
buffer.writeBytes(input); //, 0, input.length

trace("[RawMJPEGParser] Valid JPEG: " + buffer.length);	
send(buffer);
buffer.clear();
}
else {
buffer.writeBytes(input); //, 0, input.length				
}

trace("[RawMJPEGParser] ERROR: Invalid JPEG: " + input.length);	
*/