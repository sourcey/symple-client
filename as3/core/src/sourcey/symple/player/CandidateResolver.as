package sourcey.symple.player
{	
	import flash.events.DataEvent;
	import flash.events.EventDispatcher;
	
	import sourcey.net.StatefulSocket;
	import sourcey.util.Logger;
	import sourcey.util.Util;
	
	[Event(name="onCandidate", type="sourcey.symple.player.CandidateEvent")]	
	
	// This class checks provided candidates are accessible
	// from this network, and selected the best one.
	// TODO: Proper latency checking to determine best candidate
	public class CandidateResolver extends EventDispatcher
	{
		public var candidates:Array = [];
		
		public function CandidateResolver()
		{
		}
		
		public function resolve(candidate:Object):void
		{
			Util.assertObjectProperties(candidate, 
				[ "protocol", "address", "uri" ], 
				"Candidate missing");
			
			candidate.url = (candidate.protocol + '://' + candidate.address + candidate.uri);
			candidate.connection = new MediaConnection(candidate.url);
			candidate.connection.addEventListener(StatefulSocket.STATE_CHANGED, onConnectionState);
			candidate.connection.play();
			candidate.time = new Date().getTime();
			candidates.push(candidate);
			Logger.send(Logger.DEBUG, "[CandidateResolver] Resolving: " + candidate.url);
		}
		
		public function terminate():void
		{				
			for each(var c:Object in candidates) {
				if (c.connection) {
					c.connection.removeEventListener(StatefulSocket.STATE_CHANGED, onConnectionState);
					c.connection.close();
					delete c.connection;					
				}
			}
	 	}
		
		public function get bestCandidate():Object 
		{   
			var candidate:Object = null;
			for each(var o:Object in candidates) {
				if (!candidate || (candidate.success && 
					o.time && o.time < candidate.time))
					candidate = o;
			}
			return candidate;			
		}
		
		public function get gatheringComplete():Boolean 
		{   
			for each(var o:Object in candidates) {
				if (o.connection)
					return false;
			}		
			return true;
		}
		
		protected function onConnectionState(event:DataEvent):void 
		{		
			Logger.send(Logger.DEBUG, "[CandidateResolver] Connection state changed to '" + event.data + "'");
			var connection:MediaConnection = event.currentTarget as MediaConnection;
			if (connection.state == StatefulSocket.STATE_CONNECTING)
				return;
			else if (connection.state == StatefulSocket.STATE_CONNECTED ||
				connection.state == StatefulSocket.STATE_DISCONNECTED) {
				connection.removeEventListener(StatefulSocket.STATE_CHANGED, onConnectionState);
				connection.close();
				var candidate:Object = getByConnection(connection);
				if (candidate) {
					candidate.time = (new Date().getTime()) - candidate.time;
					candidate.success = (event.data == StatefulSocket.STATE_CONNECTED);
					candidate.connection.close();
					delete candidate.connection;
					Logger.send(Logger.DEBUG, "[CandidateResolver] Candidate result: " + candidate.success + ": " + candidate.time);
					dispatchEvent(new CandidateEvent(CandidateEvent.CANDIDATE, candidate));
				}
				else
					Logger.send(Logger.DEBUG, "[CandidateResolver] Error: Task not found");
			}
			else
				Logger.send(Logger.DEBUG, "[CandidateResolver] Error: Bad candidate state");
			
			if (gatheringComplete) {
				Logger.send(Logger.DEBUG, "[CandidateResolver] Gathering Complete");
				dispatchEvent(new CandidateEvent(CandidateEvent.GATHERING_COMPLETE, bestCandidate));	
			}
		}		
		
		protected function getByConnection(connection:MediaConnection):Object 
		{   
			for each(var c:Object in candidates) {
				if (c.connection == connection)
					return c;
			}
			return null;
		}
	}
}



/*
protected function onResult(event:DataEvent):void 
{	

}
*/
/*
switch (event.data)
{
case StatefulSocket.STATE_CONNECTED:
connection.addEventListener(StatefulSocket.STATE_CHANGED, onConnectionState);
connection.close();
break;

case StatefulSocket.STATE_DISCONNECTED:
connection.addEventListener(StatefulSocket.STATE_CHANGED, onConnectionState);
connection.close();
dispatchEvent(new DataEvent(STATE_CHANGED, false, false, _state));

error = event.currentTarget.error;
if (error && error.length)
state = Session.STATE_FAILED;
else
state = Session.STATE_INACTIVE;
break;
}	
*/