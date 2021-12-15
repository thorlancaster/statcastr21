/**
 * Class that handles setting up / tearing down / association of Synchronizrs,
 * ReliableChannels, and sessions between client and server
 *
 * In here, data is encapsulated by:
 * * Game layer - game info to literals
 * * SynDiff layer - literals to information and diff info
 * * Synchronizr later - add arrNum selection to above
 * * Manager layer - Each packet has a byte prepended to signify type
 */
class SynchronizrManager extends SynchronizrOpsClass{
	/**
	 * Declare internal opcodes.
	 * See BYTECODE.txt for details
	 * @private
	 */
	_declOps(){
		var t = this;
		t._OP_STANDARD = 255;
		t._OP_MANAGERIAL = 254;

		t._OP_QUERY_EVENT = 254;
		t._OP_QUERY_ALL = 253;
		t._OP_SQL = 252;
		// 251: Reserved
		t._OP_SET_CREDENTIALS = 250;
		t._OP_CREATE_EVENT = 249; // Or join as admin
		t._OP_SPECTATE_EVENT = 248;

		t._PROP_EVENTID = 255;
		t._PROP_EVENTSIZE = 254;
		t._PROP_EVENTNAME = 253; // Name and Info grab from
		t._PROP_EVENTINFO = 252; // [0][0] and [0][1] respectively
		t._PROP_ADMINCONNECTED = 248;
		t._PROP_PRIVILIGELEVEL = 247;
		t._PROP_FORCEJOIN = 246;
	}

	constructor() {
		super();
		var t = this;

		// How many seconds of backpressure we will try to limit ourselves to
		t._MTU_SECONDS = 3;
		t._declOps();
		// Connection variables
		t._server = undefined;
		t._serverChanged = false;

		// Variables for transmit / admin
		t._isTX = false;
		t._isTXCurrent = false;
		t._TXChanged = false;
		t._lastVerifySuccess = undefined;

		// Variables for authentication / state handling
		t._username = undefined;
		t._password = undefined;
		t._event = undefined;
		t._lastSynEvent = undefined;
		t._eventChanged = true;
		t._credsChanged = false;

		// Variables for underlying objects and information
		t._synchronizr = undefined;
		t._channel = undefined;
		t._MTU = 0;

		// Callbacks
		t._receiveHandler = undefined;

	}

	close(){
		if(this._channel)
			this._channel.close();
	}

	/** Set the handler that will be called when the (spectating) Synchronizr receives data
	 * The function will be called with the Synchronizr as the first argument
	 * and the Changes array as the second argument
	 * @param fn Callback function
	 */
	setReceiveHandler(fn){
		this._receiveHandler = fn;
	}

	/**
	 * Set the server to connect to.
	 * Only takes effect after a call to connect()
	 * @param server URL of server
	 */
	setServer(server){
		var t = this;
		if(t._server !== server){
			t._server = server;
			t._serverChanged = true;
		}
	}

	/**
	 * Set the event to connect to.
	 * If the event has changed, saves and reloads the synchronizr.
	 * @param evt Event ID, will be converted to a String if not already
	 */
	setEvent(evt){
		evt = "" + evt;
		var t = this;
		if(t._event !== evt){
			t._event = evt;
			t._eventChanged = true;
			if(t._channel)
				t.send();
		}
	}

	/**
	 * Set the transmit/receive mode
	 * Only takes effect after a call to connect()
	 * @param tx True to TX, false to RX
	 */
	setTX(tx){
		var t = this;
		if(t._isTX !== tx){
			t._isTX = tx;
			t._TXChanged = true;
		}
	}

	/**
	 * Connect to the server and begin synchronizing events.
	 * NOTE: Previous Synchronizr will be closed
	 * if anything has changed
	 * @param reconnect {Boolean} true if connection was lost
	 *  and we are calling connect() to try and re-establish it
	 */
	connect(reconnect){
		// TODO attempt to resume session when using reconnect
		// TODO each connection will have a session id
		//  on both client and server
		var t = this;
		if(t._serverChanged || t._TXChanged){
			t._isTXCurrent = t._isTX;
			if(t._isTX)
				t._synchronizr = new SynchronizrTransmitter();
			else
				t._synchronizr = new SynchronizrReceiver();
			if(t._channel)
				t._channel.close();
			t._channel = ReliableChannel.create(t._server);
			t._channel.setReceiveHandler(t._receiveHandlerInternal.bind(t));
			t._channel.connect();
			t._MTU = Math.ceil(t._channel.getBandwidth() * t._MTU_SECONDS);

			t._serverChanged = false;
			t._TXChanged = false;

			t._eventChanged = true;
			t._credsChanged = !!(t._username || t._password);

			t.send();
		}
	}

	/**
	 * Send any pending manager data down the channel.
	 * Although Synchronizr data is sent with a timer callback,
	 * this method can (and should) be used to attempt an immediate send
	 * whenever the data in Synchronizr is manually changed
	 */
	send() {
		// OpBuffer will be filled regardless of MTU
		var t = this;
		var s = t._synchronizr
		if(!t._channel)
			throw "connect() must be called before send()";

		// OpBuffer will be filled with all pending managerial data
		var opBuffer = [t._OP_MANAGERIAL];
		if (t._credsChanged) {
			t._credsChanged = false;
			t._pushUsernamePassword(opBuffer, t._username, t._password);
		}
		if(t._eventChanged){
			t._eventChanged = false;
			if(t._lastSynEvent)
				s.save(t._lastSynEvent);
			s.resetReceiver();
			s.load(t._event);
			if(s.isTransmitter())
				t._pushCreateJoinEvent(opBuffer, t._event);
			else
				t._pushSpectateEvent(opBuffer, t._event);

		}
		if(opBuffer.length > 1){
			t._channel.write(opBuffer);
		}

		// Limit updates to prevent excessive backpressure the resulting lagginess
		var effMTU = t._MTU - t._channel.getBackpressure();
		// SynBuffer will be filled with data from Synchronizr if we have room for more
		if(s.isTransmitter() && effMTU - opBuffer.length > 3){
			var synBuffer = t._synchronizr.sendRemote(effMTU - opBuffer.length, [t._OP_STANDARD]);
			if(synBuffer.length > 1){
				t._channel.write(synBuffer);
			}
		}
	}

	_receiveHandlerInternal(e){
		var t = this;
		if(e)
			console.log("New Status: " + e);
		var changesFromLast = undefined;
		while(t._channel.available()){
			var pendingAfter = t._channel.available() > 1;
			var ops = t._channel.read();
			console.log(">> " + ops);
			if(DEBUGGR)
				changesFromLast =
					DEBUGGR.invokeProtected(t._applyOpcodes.bind(t), t, ops, changesFromLast, pendingAfter);
			else
				changesFromLast = t._applyOpcodes(ops, changesFromLast, pendingAfter);
		}
		if(t._receiveHandler){
			if(DEBUGGR)
				DEBUGGR.invokeProtected(t._receiveHandler.bind(t), t, t._synchronizr, changesFromLast);
			else
				t._receiveHandler(t._synchronizr, changesFromLast);
		}
	}

	/**
	 * Apply bytecode from the server
	 * @param ops {Uint8Array} Incoming bytecode
	 * @param changesFromLast See Synchronizr
	 * @param pendingAfter See Synchronizr
	 * @private
	 */
	_applyOpcodes(ops, changesFromLast, pendingAfter){
		var t = this;
		var op0 = ops[0];
		ops = ops.slice(1);
		switch(op0){
			case 255: // Synchronizr
				changesFromLast = t._synchronizr.applyOpcodes(ops, changesFromLast, pendingAfter);
				break;
			case 254:
				t._applyManagerial(ops);
				break;
			case 83:
				t._handleServerError(ops, true);
				break;
			case 82:
				t._handleServerError(ops, false);
				break;
			default:
				throw "Invalid Opcode " + op0;
		}
		return changesFromLast;
	}

	_applyManagerial(ops){
		var t = this;
		var sendBuf = [];
		var ptr = 0;
		while(ptr < ops.length){
			var op = ops[ptr++];
			switch(op){
				case 240: // Verify Hash Request
					// Needs implemented for server-initiated hash requests
					break;

				case 239: // Verify Hash Response
					var len = ops[ptr++];
					var actHash = [];
					for(var x = 0; x < len; x++){
						actHash.push(ops[ptr++]);
					}
					t._onVerifyHash(len ? actHash : undefined);
					break;
				default:
					throw "Invalid Opcode " + op;
			}
		}
	}

	_handleServerError(ops, wasFatal){
		if(wasFatal)
			console.error("Fatal Server Error: " + ops);
		else
			console.error("Non-Fatal Server Error: " + ops);
	}

	lastVerifySuccess(){
		return this._lastVerifySuccess;
	}


	/**
	 * Calls setData of the underlying SynchronizrTransmitter to write data
	 * If the underlying synchronizr is a Receiver, an exception will be thrown
	 * @param num Number of internal array to write to
	 * @param idx Index in the array to write to
	 * @param val Array or Uint8Array to write.
	 * @param mode 0 for write, 1 for insert, 2 for delete, 3 for append
	 */
	setData(num, idx, val, mode){
		var t = this;
		if(!t._synchronizr || !t._synchronizr.isTransmitter())
			throw "SynchronizrManager not initialized as Transmitter";
		t._synchronizr.setData(num, idx, val, mode);
	}

	/**
	 * Set the credentials that will be used when trying to connect to the server
	 * Takes effect on the next send() call
	 * @param uname Username
	 * @param pw Password
	 */
	setCredentials(uname, pw){
		var t = this;
		if(t._username !== uname || t._password !== pw){
			t._credsChanged = true;
			t._username = uname;
			t._password = pw;
		}
	}

	/**
	 * Immediately send a managerial message to the server
	 * to check if the remote receiver state matches the local
	 * receiver state.
	 *
	 * If the server responds with a FAILURE response, onHashFailure() will be called
	 * and the error will be corrected automatically.
	 * // TODO do this
	 */
	verifyHash(){
		var thisHash = SynchronizrHashr.hash(this._synchronizr.getHashTarget(), 16);
		var buf = [254, 240, 16]; // Manager/VerifyHash/Len=16
		for(var x = 0; x < thisHash.length; x++){
			buf.push(thisHash[x]);
		}
		console.log(U.printStr(thisHash, true));
		this._channel.write(buf);
	}

	/**
	 * After the above function is called, the server sends back some bytecode
	 * that results in the below function getting called
	 * @param actualHash Undefined if success, Hash of server if failure
	 * @private
	 */
	_onVerifyHash(actualHash){
		var t = this;
		if(!actualHash){
			t._lastVerifySuccess = true;
			console.log("Verify Hash Successful");
		} else {
			t._lastVerifySuccess = false;
			console.log("Verify Hash Successfull: ");
			console.log(actualHash);
		}
	}


	// TODO LOW_PRIORITY move below pushing code to separate class
	//  and have all classes that push opcodes inherit/use it
	_pushUsernamePassword(buf, uname, pw){
		var t = this;
		t._pushOpcode(buf, t._OP_SET_CREDENTIALS);
		t._pushString(buf, uname);
		t._pushString(buf, pw);
	}

	_pushCreateJoinEvent(buf, eventId){
		var t = this;
		t._pushOpcode(buf, t._OP_CREATE_EVENT);
		var buf2 = [];
		t._pushOpcode(buf2, t._PROP_EVENTID);
		t._pushString(buf2, eventId);
		t._pushOpcode(buf2, t._PROP_PRIVILIGELEVEL);
		t._pushOpcode(buf2, 0); // Privilege level 0 = public
		t._pushString(buf, buf2);
	}

	_pushSpectateEvent(buf, eventId){
		var t = this;
		t._pushOpcode(buf, t._OP_SPECTATE_EVENT);
		t._pushString(buf, eventId);
	}

	_pushOpcode(buf, op){
		buf.push(op);
	}

	/**
	 * Push a Synchronizr-string or array to a buffer
	 * @param buf Buffer to write to
	 * @param str String or array to write
	 * @private
	 */
	_pushString(buf, str){
		var len = str.length;
		buf.push((len << 8) & 0xFF);
		buf.push((len) & 0xFF);
		if(typeof str === "string"){
			for(var x = 0; x < str.length; x++)
				buf.push(str.charCodeAt(x));
		}
		else {
			for(var x = 0; x < str.length; x++)
				buf.push(str[x]);
		}
	}
}