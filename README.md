oMSG.js is an OSC-style mediator pattern with audio-rate scheduling for time-critical message passing.

Using Web Audio as the scheduler, oMSG.js achieves timing consistency and accuracy which 
setTimeout and requestAnimationFrame cannot. It is well-suited for scheduling audio events.  

Features include:
 * audio rate scheduler for time crucial messages (using Web Audio API)
 * callback is invoked shortly before it is scheduled and includes the exact scheduling time
 * OSC-style pattern matching
 * relative and absolute timetags
 

Scheduled messages must have an address. If no timetag is given, it defaults to 0, which means invoke immediately.  
```javascript
MSG.schedule({
	address : "/soundEffect/splat",
	//timetags are in seconds relative to the start of the audio context
	timetag : 10,
	//add any data to the message
	data : "splat.wav",
});
```

In another part of your code, listen for that message using OSC-style pattern matching.  
```javascript
//'/*' matches any address string
MSG.route("/soundEffect/*", function(msg){
	playSound(msg.data, msg.timetag);
});
```

Relative timetags begin with "+",
```javascript
MSG.schedule({
	address : "/in_a_second",
	timetag : "+1",
});
```