OSC.js is a library for organizing modules within large applications using the publish/subscribe pattern and OSC-style communication.

The pub/sub pattern promotes loose coupling of modules by keeping parts of the code from referring to other parts explicitly, but instead interaction is mediated through a central object. OSC.js builds on this idea by putting OSC-style addresses, routing, and scheduling into the mediator making the interaction between modules simpler and more powerful. 

//subscribe to an address
OSC.route("/address", callback);

//publish a message
OSC.send("/pattern", data);

//sends pattern at a specific time
OSC.schedule(time, "/pattern", data);