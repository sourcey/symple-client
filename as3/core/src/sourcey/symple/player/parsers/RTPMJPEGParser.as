package sourcey.symple.player.parsers
{	
	import flash.utils.ByteArray;
	
	// ALPHA CODE: Do not use
	public class RTPMJPEGParser extends Parser
	{
		private var buffer:ByteArray;
		
		public function RTPMJPEGParser()
		{
			super();
			
			buffer = new ByteArray();
		}
		
		override public function parse(input:ByteArray):void 
		{	
			var headerSize:int = 12;
			var packetSize:int = 1462;
			
			//trace("RTPPacket: Buffer Length: " + input.length);	
			
			while (input.bytesAvailable > 12) {
				var bytesToRead:int = Math.min(input.bytesAvailable, packetSize);
				
				//trace("RTPPacket: Bytes To Read: " + bytesToRead);	
				
				var hasMarker:Boolean = (input[input.position + 1] >> 7) == 1;
				input.position = input.position + 12;
				input.readBytes(buffer, buffer.length, bytesToRead - 12);
				
				// Flush the frame if the RTP marker is set
				if (hasMarker)	{
					
					// The input now contains the previous image. 
					if (buffer.length > 100 &&
						buffer[0] == 255 && 
						buffer[1] == 216 && 
						buffer[buffer.length - 2] == 255 && 
						buffer[buffer.length - 1] == 217) {	
						trace("RTPPacket: VALID JPEG: " + buffer.length);						
						send(buffer);
					} 
					else {
						trace("RTPPacket: INVALID JPEG");			
					}
					buffer = new ByteArray();
				}
			}
		}   
		
	}
}