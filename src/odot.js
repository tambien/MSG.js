/*
 * odot
 *
 * OSC-style mediator pattern
 * audio rate scheduler for time crucial messages
 * callback is invoked shortly before it is scheduled and includes the exact scheduling time
 * pattern matching
 */
( function() {

	//create an audio context in the window
	//should do this in some future proof way
	window.audioContext = window.audioContext || new webkitAudioContext();
	var audioContext = window.audioContext;

	//some audio globals
	var sampleRate = audioContext.sampleRate;
	//this buffer size yeilds ~6ms accurate timer at 44100 sample rate
	var bufferSize = 256;
	var bufferTime = bufferSize / sampleRate;

	//the odot object
	window.o = window.o || {};

	/**************************************************************************
	 SCHEDULING
	 *************************************************************************/

	//the priority queue of scheduled msgs
	var scheduledMsgs = [];

	//the jsnode which does the schedule loop
	var scheduler = o.scheduler = audioContext.createJavaScriptNode(bufferSize, 1, 1);
	scheduler.connect(audioContext.destination);
	//the scheduler loop
	var schedulerLoop = scheduler.onaudioprocess = function(event) {
		//when are they going to implement the playbackTime?
		var playbackTime = event.playbackTime || audioContext.currentTime;
		var bufferPeriod = playbackTime + bufferTime;
		//route all of the message's whose timetag is <= the current time period
		while(scheduledMsgs.length > 0 && scheduledMsgs[0].timetag <= bufferPeriod) {
			var msg = scheduledMsgs.shift();
			match(msg);
		}
	};
	//the scheduledMsgs sort function to maintain the priority queue
	function sortScheduledMsgs() {
		scheduledMsgs.sort(function(a, b) {
			//if the timetags are the same, go by priority
			return a.timetag - b.timetag;
		});
	};

	function schedule(msg) {
		//insert the message in the right position
		var insertIndex = 0;
		var len = scheduledMsgs.length;
		while(insertIndex < len) {
			var testMsg = scheduledMsgs[insertIndex];
			if(testMsg.timetag > msg.timetag) {
				//scheduledMsgs.splice(m - 1, 0, msg);
				break;
			}
			insertIndex++;
		}
		scheduledMsgs.splice(insertIndex - 1, 0, msg);
		//scheduledMsgs.push(msg);
		//sortScheduledMsgs();
	};

	/**************************************************************************
	 ROUTING
	 *************************************************************************/

	//the array of listeners waiting for a msg
	var routes = [];

	//the route function adds a listener to a pattern
	//and invokes the callback when a msg matching that pattern is scheduled
	o.route = function(pattern, callback) {
		//add a listener to the queue
		var router = {
			pattern : regExpFromPattern(pattern),
			callback : callback,
		}
		routes.push(router);
		return router;
	};
	//remove a route from the list
	o.unroute = function(pattern, callback) {

	}
	//the match function called by the scheduler when a msgs is invoked
	function match(msg) {
		for(var r = 0, len = routes.length; r < len; r++) {
			var router = routes[r];
			msg.match(router.pattern, router.callback);
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
	 MSG
	 *************************************************************************/

	o.msg = function(args) {
		//messages must have an address
		this.address = args.address || console.error("the message needs an address");
		//the data
		this.data = args.data;
		//handle the timetag
		var timetag = args.timetag;
		//if it's a number, that's the timetag
		if( typeof timetag === 'number') {
			this.timetag = timetag;
		} else if( typeof timetag === 'string') {
			//it could be a relative value: "+1.2"
			if(timetag.charAt(0) === "+") {
				var num = timetag.slice(1);
				this.timetag = audioContext.currentTime + parseFloat(num);
			} else {
				//or just a number as a string
				this.timetag = parseFloat(timetag);
			}
		} else {
			//otherwise it's 0
			this.timetag = 0;
		}
		//add the message to the scheduler
		schedule(this);
	};
	//o.msg methods
	o.msg.prototype = {
		//invokes the callback if the address matches the pattern
		match : function(pattern, callback) {
			if(pattern.test(this.address)) {
				callback(this);
				return true;
			}
		},
		//sets the timetag of an existing msg
		setTimetag : function(timetag) {
			this.timetag = timetag;
			//sort the scheduledMessages
			sortScheduledMsgs();
		},
	};
}());
