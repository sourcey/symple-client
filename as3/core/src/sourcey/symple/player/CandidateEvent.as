package sourcey.symple.player
{
	public class CandidateEvent extends MediaEvent
	{		
		public static const CANDIDATE:String = "onCandidate";
		public static const GATHERING_COMPLETE:String = "onGatheringComplete";		
		public function CandidateEvent(type:String=DATA, data:*=null, bubbles:Boolean=true, cancelable:Boolean=true)
		{
			super(type, data, bubbles, cancelable);
		}
	}
}