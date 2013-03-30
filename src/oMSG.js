/*
 * oMSG
 *
 * OSC-style mediator pattern
 * audio rate scheduler for time crucial messages
 * callback is invoked shortly before it is scheduled and includes the exact scheduling time
 * pattern matching
 */
( function() {

	//create an audio context in the window
	if( typeof AudioContext == "function") {
		var ac = new AudioContext();
	} else if( typeof webkitAudioContext == "function") {
		var ac = new webkitAudioContext();
	}
	window.audioContext = window.audioContext || ac;
	var audioContext = window.audioContext;

	//some audio globals
	var sampleRate = audioContext.sampleRate;
	//this buffer size yeilds ~12ms accurate timer at 44100 sample rate
	var bufferSize = 512;
	var bufferTime = bufferSize / sampleRate;

	//the odot object
	window.MSG = window.MSG || {};

	/**************************************************************************
	 SCHEDULER
	 *************************************************************************/

	//the priority queue of scheduled msgs
	var scheduledMsgs = [];

	//the jsnode which does the schedule loop
	var scheduler = audioContext.createJavaScriptNode(bufferSize, 1, 1);
	scheduler.connect(audioContext.destination);
	//the scheduler loop
	var schedulerLoop = MSG._scheduler = scheduler.onaudioprocess = function(event) {
		//when are they going to implement the playbackTime?
		var playbackTime = event.playbackTime || audioContext.currentTime;
		var bufferPeriod = playbackTime + bufferTime;
		//route all of the message's whose timetag is <= the current time period
		while(scheduledMsgs.length > 0 && scheduledMsgs[0].timetag <= bufferPeriod) {
			var msg = scheduledMsgs.shift();
			match(msg);
		}
	};

	MSG.schedule = function(msg) {
		//make sure the message is formatted correctly
		parseMsg(msg);
		//insert the message in the right position
		var insertIndex = 0;
		var len = scheduledMsgs.length;
		while(insertIndex < len) {
			var testMsg = scheduledMsgs[insertIndex];
			if(testMsg.timetag >= msg.timetag) {
				//scheduledMsgs.splice(m - 1, 0, msg);
				break;
			}
			insertIndex++;
		}
		scheduledMsgs.splice(insertIndex, 0, msg);
	};
	/**************************************************************************
	 ROUTING
	 *************************************************************************/

	//the array of listeners waiting for a msg
	var routes = [];

	//the route function adds a listener to a pattern
	//and invokes the callback when a msg matching that pattern is scheduled
	MSG.route = function(pattern, callback) {
		//add a listener to the queue
		var router = {
			pattern : regExpFromPattern(pattern),
			callback : callback,
		}
		routes.push(router);
		return router;
	};
	//remove a route from the list
	MSG.unroute = function(pattern, callback) {

	}
	//the match function called by the scheduler when a msgs is invoked
	function match(msg) {
		for(var r = 0, len = routes.length; r < len; r++) {
			var router = routes[r];
			if(router.pattern.test(msg.address)) {
				router.callback(msg);
			}
		}
	};

	//translates OSC regular expressions to RegExp
	function regExpFromPattern(pattern) {
		//translate osc-style patterns into RegExp
		pattern = pattern.replace("*", ".+");
		pattern = pattern.replace('{', "(");
		pattern = pattern.replace('}', ")");
		pattern = pattern.replace(',', "|");
		pattern = pattern.replace('?', '.');
		//match '!' only if after '['
		pattern = pattern.replace('[!', '[^');
		//add the end-of-line to the pattern so that it stops matching
		pattern += '$';
		var regExp = new RegExp(pattern);
		return regExp;
	};

	/**************************************************************************
	 MSG PARSER
	 *************************************************************************/

	//make sure all of the fields are in order
	function parseMsg(msg) {
		//messages must have an address
		if(!msg.address) {
			console.error("the message needs an address");
		}
		//handle the timetag
		var timetag = msg.timetag;
		//if it's a string
		if( typeof timetag === 'string') {
			//it could be a relative value: "+1.2"
			if(timetag.charAt(0) === "+") {
				var num = timetag.slice(1);
				msg.timetag = audioContext.currentTime + parseFloat(num);
			} else {
				//or just a number as a string
				msg.timetag = parseFloat(timetag);
			}
		} else if( typeof timetag !== 'number') {
			//otherwise it's 0
			msg.timetag = 0;
		}
	};
}());
