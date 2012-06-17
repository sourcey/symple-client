package sourcey.symple.player.parsers
{
	import flash.utils.ByteArray;
	
	import sourcey.symple.player.MediaEvent;
	import sourcey.util.Logger;
	
	public class MJPEGParser extends Parser
	{		
		public static const STATE_NONE:int 		= 0;
		public static const STATE_BOUNDARY:int 	= 1;
		public static const STATE_HEADERS:int 	= 2;
		public static const STATE_FRAME:int 	= 3;
		
		private var buffer:ByteArray;
		public var state:int = STATE_NONE;
		public var headers:Array = [];		
		
		public function MJPEGParser()
		{
			super();
			
			buffer = new ByteArray()
		}
		
		public function onHeader(header:String):void 
		{
			//Logger.send(Logger.DEBUG, "[MJPEGParser] Header: " + header);
			
			// Skip non custom headers. 
			// This might change later.
			if (header.indexOf('X-') == 0) {
				var arr:Array = header.split(':');
				if (arr.length == 2)
					headers.push([
						String(arr[0]).replace(/-/g, ' ').substring(2, arr[0].length), 
						String(arr[1]).substring(1, arr[1].length)]);
			}
		}	
		
		public function onError(err:String):void 
		{
			trace("[MJPEGParser] ERROR: ", err);
			// can be overridden
		}
		
		public function setState(value:int):void 
		{
			if (state == value)
				return;
			
			////Logger.send(Logger.DEBUG, 
			//	"[MJPEGParser] Setting state from '" + state + "' to '" + value + "'");

			state = value;
			onState(state);
		}
		
		public function onState(value:int):void 
		{			
			if (state == STATE_FRAME) {				
				//Logger.send(Logger.DEBUG, "[MJPEGParser] Headers '" + headers);
				dispatchEvent(new MediaEvent(MediaEvent.METADATA, headers));	
				headers = [];
			}
		}
		
		override public function parse(input:ByteArray):void 
		{		
			Logger.send(Logger.DEBUG, "[MJPEGParser] Parsing Data: " + input.length);				
			var offset:int = input.position;
			if (!input.length)
				return;	
		
			var frameStart:int = 0;
			var headerStart:int = 0;
			//var boundaryPos:int = 0;
			for (var x:int = offset; x < input.length - 1; x++) {				
				
				//public static const STATE_NONE:int 		= 0;
				//public static const STATE_BOUNDARY:int 	= 1;
				//public static const STATE_HEADERS:int 	= 2;
				//public static const STATE_FRAME:int 	= 3;
				switch (state) {
					case STATE_NONE: 
						// Look for boundary marker beginning with "--"
						if (//boundaryPos == 0 &&
							input[x] == 45 &&
							input[x + 1] == 45) {
							x += 2;
							//boundaryPos = x;
							Logger.send(Logger.DEBUG, "[MJPEGParser] Boundary Start At: " + x);
						}
						
						// The first carriage returns marks the beginning
						// of chunk headers.
						else if (//boundaryPos > 0 &&
							input[x] == 13 && 
							input[x + 1] == 10) {
							x += 2;
							/*
							input.position = headerStart;					
							onHeader(input.readUTFBytes(x - headerStart));
							headerStart = (x += 2);
							*/
							headerStart = x;
							setState(STATE_HEADERS);
							Logger.send(Logger.DEBUG, "[MJPEGParser] Boundary End At: " + x);	
						}
						
						break;
					
					case STATE_HEADERS: 
						if (//!started &&
							//headerStart > 0 &&
							input[x] == 13 && 
							input[x + 1] == 10) {
							input.position = headerStart;							
							onHeader(input.readUTFBytes(x - headerStart));
							headerStart = (x += 2);
							Logger.send(Logger.DEBUG, "[MJPEGParser] Boundary End At: " + headerStart);	
						}
							
						// Find the JPEG start code
						else if (//!started &&							
							input[x] == 255 && 
							input[x + 1] == 216) {
							Logger.send(Logger.DEBUG, "[MJPEGParser] JPEG Start At: " + x);	
							Logger.send(Logger.DEBUG, "[MJPEGParser] JPEG Data Remaining: " + (input.length - x));	
							frameStart = x;
							//started = true;
							setState(STATE_FRAME);
						}
						
						break;
					
					case STATE_FRAME: 
						if (input[x] == 255 && 
							input[x + 1] == 217) {
							if (input.length >= x + 2) {
								x += 2;
								Logger.send(Logger.DEBUG, "[MJPEGParser] JPEG End At: " + x);	
								//Logger.send(Logger.DEBUG, "[MJPEGParser] JPEG End At: Input Length: " + input.length);	
								//Logger.send(Logger.DEBUG, "[MJPEGParser] JPEG End At: Reading From: " + frameStart);	
								buffer.writeBytes(input, frameStart, x - frameStart);
								
								// If the buffer contains a valid
								// image then broadcast it. 
								if (buffer.length > 100 &&
									buffer[0] == 255 && 
									buffer[1] == 216 && 
									buffer[buffer.length - 2] == 255 && 
									buffer[buffer.length - 1] == 217) {		
									//Logger.send(Logger.DEBUG, "[MJPEGParser] Valid JPEG: " + buffer.length);							
									send(buffer);
								}
								else
									onError("Bad packet");
								
								buffer.clear();
								frameStart = -1;
								setState(STATE_NONE);
								//started = false;
							}
						}
						break;
				}
				
				/*
				if (!started &&
					headerStart == 0 &&
					input[x] == 45 &&
					input[x + 1] == 45) {
					headerStart = (x += 2);
					//Logger.send(Logger.DEBUG, "[MJPEGParser] Boundary Start At: " + headerStart);								
				}
				
				// Parse carriage returns until JPEG start code
				else if (!started &&
					headerStart > 0 &&
					input[x] == 13 && 
					input[x + 1] == 10) {
					input.position = headerStart;					
					onHeader(input.readUTFBytes(x - headerStart));
					headerStart = (x += 2);
					//Logger.send(Logger.DEBUG, "[MJPEGParser] Boundary End At: " + headerStart);	
				}
				
				// Find the JPEG start code
				else if (!started &&							
					input[x] == 255 && 
					input[x + 1] == 216) {
					//Logger.send(Logger.DEBUG, "[MJPEGParser] JPEG Start At: " + x);	
					//Logger.send(Logger.DEBUG, "[MJPEGParser] JPEG Data Remaining: " + (input.length - x));	
					frameStart = x;
					started = true;
				}
				
				else if (started &&	
					input[x] == 255 && 
					input[x + 1] == 217) {
					if (input.length >= x + 2) {
						x += 2;
						//Logger.send(Logger.DEBUG, "[MJPEGParser] JPEG End At: " + x);	
						//Logger.send(Logger.DEBUG, "[MJPEGParser] JPEG End At: Input Length: " + input.length);	
						//Logger.send(Logger.DEBUG, "[MJPEGParser] JPEG End At: Reading From: " + frameStart);	
						buffer.writeBytes(input, frameStart, x - frameStart);
						
						// If the buffer contains a valid image then
						// broadcast it. 
						if (buffer.length > 100 &&
							buffer[0] == 255 && 
							buffer[1] == 216 && 
							buffer[buffer.length - 2] == 255 && 
							buffer[buffer.length - 1] == 217) {		
							//Logger.send(Logger.DEBUG, "[MJPEGParser] Valid JPEG: " + buffer.length);							
							send(buffer);
							buffer.clear();
							setState(STATE_NONE);
						}
						else {
							onError("Bad packet");								
							buffer.clear(); // nonbo									
						}
						
						frameStart = -1;
						started = false;
					}
				}
				*/
			}
					
			// The packet may have been fragmented
			if (state == STATE_FRAME && frameStart >= 0) {		
				buffer.writeBytes(input, frameStart, input.length - frameStart);	
				Logger.send(Logger.DEBUG, "[MJPEGParser] Continuing JPEG: Appending: " + (input.length - frameStart));	
				//Logger.send(Logger.DEBUG, "[MJPEGParser] Continuing JPEG: Buffer Length: " + buffer.length);
			}
		}
	}
}