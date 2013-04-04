/*
 * MSG
 *
 * OSC-style mediator pattern
 * audio rate scheduler for time crucial messages
 * callback is invoked shortly before it is scheduled and includes the exact scheduling time
 * pattern matching
 */
 ( function() {

	if ( window.webkitAudioContext ) {
		var ac = new webkitAudioContext();
	} else if ( window.AudioContext ) {
		var ac = new AudioContext();
	}
	window.audioContext = window.audioContext || ac;
	var audioContext = window.audioContext;

	//browser doesn't support web audio
	if (!audioContext){
		console.log("MSG uses Web Audio for precise timing");
		//make a shim so that other browsers don't throw errors
		window.MSG = window.MSG || {
			schedule : function(){

			},
			unschedule : function(){

			},
			route : function(){
				
			},
			unroute : function(){
				
			}, 
			routeOnce : function(){

			}
		};
		return;
	}

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
	//the scheduler loop, make it global so safari doesn't garbage collect it
	_MSGscheduler = scheduler.onaudioprocess = function(event) {
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
			//if the next message is bigger, put it right before
			if(testMsg.timetag >= msg.timetag) {
				break;
			}
			insertIndex++;
		}
		scheduledMsgs.splice(insertIndex, 0, msg);
		return msg;
	};

	MSG.unschedule = function(msg) {
		//first check if the msg is in the array

		//else remove the msg(s) with the same address and timetag
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
			pattern : pattern,
			regExp : regExpFromPattern(pattern),
			callback : callback,
		}
		routes.push(router);
		return router;
	};
	//like route, but get's removed from the route array after it's routed
	MSG.routeOnce = function(pattern, callback) {
		//add a listener to the queue
		var router = {
			pattern : pattern,
			regExp : regExpFromPattern(pattern),
			callback : callback,
			once : true,
		}
		routes.push(router);
		return router;
	};
	//remove a route from the list
	MSG.unroute = function(router) {
		for(var i = 0, len = routes.length; i < len; i++) {
			var testRouter = routes[i];
			if(testRouter === router) {
				routes.splice(i, 1);
				break;
			}
		}
	}
	//the match function called by the scheduler when a msgs is invoked
	function match(msg) {
		var newRoutes = [];
		for(var r = 0, len = routes.length; r < len; r++) {
			var router = routes[r];
			if(router.regExp.test(msg.address)) {
				router.callback(msg);
				//if it's a 'once', don't add it to the newRoutes list
				if(!router.once) {
					newRoutes.push(router);
				}
			} else {
				newRoutes.push(router);
			}
		}
		routes = newRoutes;
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
