odot.js is an OSC-style mediator pattern with audio-rate scheduling for time-critical message passing.

Using Web Audio as the timing scheduler, odot.js achieves scheduling consistency and accuracy which 
setTimeout and requestAnimationFrame cannot. It is perfect for scheduling audio events (or any events).  

Features include:
 * audio rate scheduler for time crucial messages (using Web Audio API)
 * callback is invoked shortly before it is scheduled and includes the exact scheduling time (relative to audio context's currentTime);
 * OSC-style pattern matching
 * relative and absolute timetags


Creating a message automatically adds it to the scheduler to be invoked right before the timetag
`````javascript
var msg = new o.msg({
	address : "/soundEffect/splat",
	//timetags are in seconds relative to the start of the audio context
	timetag : 10,
	//add any data to the message
	data : "splat.wav",
});
`````

In another part of your code, listen for that message. Use OSC-style pattern matching. 

`````javascript
//'*' matches any string
o.route("/soundEffect/*", function(msg){
	playSound(msg.data, msg.timetag);
});
`````