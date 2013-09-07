package sourcey.net
{
	import flash.utils.ByteArray;
	
	public class RTPPacket
	{
		public var data:ByteArray;		
		
		public function RTPPacket(data:ByteArray)
		{
			this.data = data;
			/*
			trace("RTPPacket: " + data.length + "\n" +
				"Version: " + getVersion() + "\n" +
				"PayloadType: " + getPayloadType() + "\n" +
				"CscrCount: " + getCscrCount() + "\n" +
				"Timestamp: " + getTimestamp() + "\n" +
				"Marker: " + hasMarker() + "\n" +
				"SequenceNumber: " + getSequenceNumber()
				);	
			*/		
		}		
		
		// version (V): 2 bits
		// padding (P): 1 bit
		// extension (X): 1 bit
		// CSRC count (CC): 4 bits
		// marker (M): 1 bit
		// payload type (PT): 7 bits
		// sequence number: 16 bits
		// timestamp: 32 bits
		// SSRC: 32 bits
		// CSRC list: 0 to 15 items, 32 bits each
				
		// Gets the RTP packet length
		public function getLength():uint
		{  
			return data.length;
		}
		
		// Gets the RTP header length
		public function getHeaderLength():uint
		{ 
			return 12; //12+4*getCscrCount();
		}
		
		// Gets the RTP header length
		public function getPayloadLength():uint
		{  
			return getLength()-getHeaderLength();
		}
		
		// Gets the version (V)
		public function getVersion():int
		{
			return (data[0] >> 6) & 0x03;
		}		
		
		// Whether has padding (P)
		public function hasPadding():Boolean
		{  
			return getBit(data[0],5);
		}
		
		// Whether has extension (X)
		public function hasExtension():Boolean
		{  
			return getBit(data[0],4);		
		}
		
		// Gets the CSCR count (CC)
		public function getCscrCount():int
		{  
			return (data[0] >> 6 & 0x0F);
		}
		
		// Whether has marker (M)
		public function hasMarker():Boolean
		{  
			return getBit(data[1],7);
		}
				
		// Gets the payload type (PT)
		public function getPayloadType():int
		{  
			return data[1] & 0x7F;
		}
		
		// Gets the sequence number
		public function getSequenceNumber():uint
		{ 
			return ((data[2]) << 8) | data[3];
		}		
		
		// Gets the timestamp
		public function getTimestamp():Number
		{  
			return readLong(4);
		}		
				
		// Gets the SSCR
		public function getSscr():Number
		{  
			return readLong(8);
		}
		
		// Gets the payload
		public function getPayload():ByteArray
		{  			
			data.position = getHeaderLength();
			var copyTo:ByteArray = new ByteArray();
			data.readBytes(copyTo, 0, getPayloadLength());
			return copyTo;
		}
		
		// Gets the payload, appending it to the output buffer
		public function copyPayloadTo(buf:ByteArray):void
		{  			
			data.position = 0; //getHeaderLength();
			buf.writeBytes(data, getHeaderLength(), getPayloadLength());
		}		
		
		//
		// Utilities
		//
		
		// Gets bit value
		private function getBit(byte:int, bit:int):Boolean
		{  
			return (byte >> bit) == 1;
		}

				
		// Reads a long number from the Byte Array
		public function readLong(pos:int):Number
		{
			//TODO error check length
			data.position = pos;
			return ((data.readByte() & 255) << 56) + 
				((data.readByte() & 255) << 48) +
				((data.readByte() & 255) << 40) + 
				((data.readByte() & 255) << 32) +
				((data.readByte() & 255) << 24) +
				((data.readByte() & 255) << 16) +
				((data.readByte() & 255) << 8) +
				((data.readByte() & 255) << 0);
		}  

	}
}