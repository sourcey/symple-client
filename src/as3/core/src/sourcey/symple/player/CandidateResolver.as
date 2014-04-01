package sourcey.symple.player
{	
	import flash.events.EventDispatcher;
	import flash.events.DataEvent;
	import flash.events.TimerEvent;
	import flash.utils.Timer;
	
	import sourcey.net.StatefulSocket;
	import sourcey.util.Logger;
	import sourcey.util.Util;
	
	[Event(name="onCandidate", type="sourcey.symple.player.CandidateEvent")]	
	[Event(name="onTimeout", type="sourcey.symple.player.CandidateEvent")]	
	
	// This class checks the network availability of provided
	// streaming candidates, and selects the best one to use.
	// TODO: Improve latency checking and best candidate selection
	public class CandidateResolver extends EventDispatcher
	{
		public var candidates:Array = [];
		public var resolverTimeout:int = 12; // 12 seconds to resolve candidate
		public var resolverTimer:Timer;
		
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
			candidate.connection._request = ""; // Send no data!
			candidate.connection.addEventListener(StatefulSocket.STATE_CHANGED, onConnectionState);
			candidate.connection.play();
			candidate.time = new Date().getTime();
			candidates.push(candidate);
			Logger.send(Logger.DEBUG, "[CandidateResolver] Resolving: " + candidate.url);
					
			// Keep restarting the resolving timeout until we have a successful candidate. 
			// If the timeout expires then candidate resolving is considered to have failed. 
			if (!bestCandidate)
				resetResolvingTimeout();
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
		
		// Return the best candidate by latency
		public function get bestCandidate():Object 
		{   			
			var candidate:Object = null;
			for each(var o:Object in candidates) {
				if (!candidate || (candidate.success && 
					o.latency && o.latency < candidate.latency))
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
			Logger.send(Logger.DEBUG, "[CandidateResolver] Connection state changed: " + event.data);
			var connection:MediaConnection = event.currentTarget as MediaConnection;
			if (connection.state == StatefulSocket.STATE_CONNECTING)
				return;
			else if (connection.state == StatefulSocket.STATE_CONNECTED ||
				connection.state == StatefulSocket.STATE_DISCONNECTED) {
				connection.removeEventListener(StatefulSocket.STATE_CHANGED, onConnectionState);
				connection.close();
				var candidate:Object = getByConnection(connection);
				if (candidate) {
					candidate.latency = (new Date().getTime()) - candidate.time;
					candidate.success = (event.data == StatefulSocket.STATE_CONNECTED);
					candidate.connection.close();
					delete candidate.connection;
					Logger.send(Logger.DEBUG, "[CandidateResolver] Candidate result: " + candidate.success + ": " + candidate.latency);
					dispatchEvent(new CandidateEvent(CandidateEvent.CANDIDATE, candidate));
					
					// Cancel the timer on successful candiate
					if (candidate.success)
						cancelResolvingTimeout();
				}
				else
					Logger.send(Logger.DEBUG, "[CandidateResolver] Error: Task not found");
			}
			else
				Logger.send(Logger.DEBUG, "[CandidateResolver] Error: Bad candidate state");
			
			//if (gatheringComplete) {
			//	Logger.send(Logger.DEBUG, "[CandidateResolver] Gathering complete");
			//	dispatchEvent(new CandidateEvent(CandidateEvent.GATHERING_COMPLETE, bestCandidate));	
			//}
		}	
				
		public function resetResolvingTimeout():void
		{			
			cancelResolvingTimeout();
			resolverTimer = new Timer(resolverTimeout * 1000, 1);
			resolverTimer.addEventListener(TimerEvent.TIMER, onResolvingTimeout);
			resolverTimer.start();
		}		
		
		protected function cancelResolvingTimeout():void 
		{
			if (resolverTimer) {
				resolverTimer.removeEventListener(TimerEvent.TIMER, onResolvingTimeout);	
				resolverTimer.stop();
				resolverTimer = null;
			}				
		}
		
		protected function onResolvingTimeout(event:TimerEvent):void 
		{
			Logger.send(Logger.ERROR, 
				"[CandidateResolver] Timeout");	
			
			dispatchEvent(new CandidateEvent(CandidateEvent.TIMEOUT));	
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