class Debuggr{
	constructor() {
		var t = this;
	}

	assert(b) {
		if(!b)
			this.logError("Assertion Failed", null);
	}

	/**
	 * Log an Exception that occurs during program execution
	 * @param e Exception that occured
	 * @param dbgRoot Root element for the error log
	 */
	logError(e, dbgRoot){
		// TODO implement a real error log
		console.error(e);
		console.warn(dbgRoot);
	}

	/**
	 * Invoke a function, and log the exception if thrown.
	 * This function should ALWAYS be used when calling callback handlers
	 * or whenever two different components of the program need to communicate.
	 * @param fn Function to invoke
	 * @param dbgRoot Root object for debug log - cannot be null
	 * @param arg Argument to pass to fn
	 * @param arg2 Argument to pass to fn
	 * @param arg3 Argument to pass to fn
	 * @param arg4 Argument to pass to fn
	 */
	invokeProtected(fn, dbgRoot, arg, arg2, arg3, arg4){
		try{
			if(!dbgRoot)
				throw "dbgRoot is null";
			return fn(arg, arg2, arg3, arg4);
		} catch(e){
			this.logError(e, dbgRoot);
		}
	}

	/**
	 * TODO send compressed error packet
	 */
	getErrorPacket(){

	}
}
var DEBUGGR = new Debuggr();