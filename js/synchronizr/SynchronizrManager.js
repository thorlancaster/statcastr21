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
class SynchronizrManager extends SynchronizrOpsClass {
	/**
	 * Declare internal opcodes.
	 * See BYTECODE.txt for details
	 * @private
	 */
	_declOps() {
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
		t._PROP_EVENTGAMENAME = 253; // Name and Info grab from
		t._PROP_EVENTINFO = 252; // [0][0] and [0][1] respectively
		t._PROP_ADMINCONNECTED = 248;
		t._PROP_PRIVILIGELEVEL = 247;
		t._PROP_FORCEJOIN = 246;

		// Error types
		t.ERR_BAD_TYPE = 1;
		t.ERR_BAD_MGROP = 2;
		t.ERR_BAD_EVPROP = 3;
		t.ERR_BAD_SYNOP = 4;
		t.ERR_NO_EVENT_SET = 5;
		t.ERR_EVENT_NOT_AVAILABLE = 6;
		t.ERR_NOT_ADMIN = 7;
		t.ERR_ADMIN_EVENT_NOTCONNECTED = 8;
		t.ERR_STRING_OOB = 16;
		t.ERR_WS_BAD_OPCODE = 24;
	}

	constructor(saveNamespace) {
		super();
		var t = this;
		DEBUGGR.assert(saveNamespace != null);

		// How many seconds of backpressure we will try to limit ourselves to
		t._MTU_SECONDS = 3;
		t._declOps();
		// Connection variables
		t._server = undefined;
		t._serverChanged = false;
		t._hasFatalError = false;

		// Variables for transmit / admin
		t._isTX = false;
		t._isTXCurrent = false;
		t._TXChanged = false;
		t._lastVerifySuccess = undefined;
		t._saveNamespace = saveNamespace;

		// Variables for authentication / state handling
		t._username = undefined;
		t._password = undefined;
		t._event = undefined;
		t._lastSynEvent = undefined;
		t._eventChanged = true;
		t._credsChanged = false;

		// Variables for underlying objects and information
		t._synchronizr = new SynchronizrTransmitter();
		t._channel = undefined;
		t._MTU = 0;

		// Callbacks
		t._errHandler = undefined;
		t._receiveHandler = undefined;
		t._infoHandler = undefined;
	}

	/**
	 * Gets the length of a sub-array
	 * @param subArr Sub-array to get length of
	 * @returns {Number}
	 */
	getDataLength(subArr) {
		var d = this._synchronizr.getData();
		return d[subArr].length;
	}

	/**
	 * Get data in the subArray subArr at index idx
	 * @param subArr
	 * @param idx
	 */
	getDataAt(subArr, idx) {
		return this._synchronizr.getData()[subArr][idx];
	}

	close() {
		if (this._channel)
			this._channel.close();
	}

	getChannelStatus(){
		return this._channel.getStatus();
	}

	/** Set the handler that will be called when the (spectating) Synchronizr receives data
	 * The function will be called with the Synchronizr as the first argument
	 * and the Changes array as the second argument
	 * @param fn Callback function
	 */
	setReceiveHandler(fn) {
		this._receiveHandler = fn;
	}

	/**
	 * Set the handler that will be called whenever an error/warning message will be received
	 * Argument of the function will be the error opcode as a byte, error opcode as a string,
	 * user-readable error cause, and a short piece of advice to fix the error.
	 */
	setErrorHandler(fn){
		this._errHandler = fn;
	}

	/**
	 * Handler will be called whenever a relevant managerial message is received.
	 * Argument of the function will be {type:string data:[optional]}
	 * @param fn Callback function
	 */
	setInfoHandler(fn) {
		this._infoHandler = fn;
	}

	/**
	 * Set the server to connect to.
	 * Only takes effect after a call to connect()
	 * @param server URL of server
	 */
	setServer(server) {
		var t = this;
		if (t._server !== server) {
			t._server = server;
			t._serverChanged = true;
		}
	}

	getServer(){
		return this._server;
	}

	/**
	 * Set the event to connect to.
	 * Takes effect after a call to connect()
	 * @param evt Event ID, will be converted to a String if not already
	 */
	setEvent(evt) {
		evt = "" + evt;
		var t = this;
		if (t._event !== evt) {
			t._event = evt;
			t._eventChanged = true;
			// if (t._channel)
			// 	t.send();
		}
	}

	/**
	 * Set the transmit/receive mode
	 * Only takes effect after a call to connect()
	 * @param tx True to TX, false to RX
	 */
	setTX(tx) {
		var t = this;
		if (t._isTX !== tx) {
			t._isTX = tx;
			t._TXChanged = true;
		}
	}

	/**
	 * Connect to the server and begin synchronizing events.
	 * NOTE: Previous Synchronizr will be closed and any error flags will be cleared.
	 * if anything has changed
	 * @param nosend {Boolean} If true, don't immediately send event data
	 */
	connect(nosend) {
		var t = this;
		t._hasFatalError = false;
		if (t._serverChanged || t._TXChanged || t._channel.getStatus() === t._channel.STATUS_LOST) {
			t._isTXCurrent = t._isTX;
			var oData = t._synchronizr ? t._synchronizr.getData() : undefined;
			if (t._isTX)
				t._synchronizr = new SynchronizrTransmitter(oData);
			else
				t._synchronizr = new SynchronizrReceiver(oData);
			if (t._channel)
				t._channel.close();
			t._synchronizr.setReceiveHandler(t._receiveHandlerInternal.bind(t), t);
			t._channel = ReliableChannel.create(t._server);
			t._channel.setReceiveHandler(t._channelReceiveHandler.bind(t));
			t._channel.connect();
			t._MTU = Math.ceil(t._channel.getBandwidth() * t._MTU_SECONDS);

			t._serverChanged = false;
			t._TXChanged = false;

			t._eventChanged = true;
			t._credsChanged = !!(t._username || t._password);

			t.send(nosend);
		}
	}

	/**
	 * Get the connection status as a number
	 * @returns -1 if not connected, or the number of bytes queued
	 */
	getStatus(){
		var t = this;
		if(!t._channel)
			return -1;
		var s = t._channel.getStatus();
		if(s !== ReliableChannel.STATUS_CONNECTED)
			return -1;
		return t._channel.getBackpressure();
	}

	/**
	 * Send any pending manager data down the channel.
	 * Although Synchronizr data is sent with a timer callback (?),
	 * this method can (and should) be used to attempt an immediate send
	 * whenever the data in Synchronizr is manually changed
	 * @param nosend If true, send managerial data only
	 */
	send(nosend) {
		// OpBuffer will be filled regardless of MTU
		var t = this;
		var s = t._synchronizr;
		if (!t._channel)
			throw "connect() must be called before send()";

		// OpBuffer will be filled with all pending managerial data
		var opBuffer = [t._OP_MANAGERIAL];
		if (t._credsChanged) {
			t._credsChanged = false;
			t._pushUsernamePassword(opBuffer, t._username, t._password);
		}
		if (t._eventChanged) {
			t._eventChanged = false;
			// if (t._lastSynEvent)
			// 	s.save(t._lastSynEvent);
			s.resetReceiver();
			if (t._event) {
				if (s.isTransmitter()) {
					t._pushCreateJoinEvent(opBuffer, t._event);
				} else
					t._pushSpectateEvent(opBuffer, t._event);
			}
		}
		if (opBuffer.length > 1) {
			t._channel.write(opBuffer);
		}
		if(!nosend) {
			// Limit updates to prevent excessive backpressure and the resulting lagginess
			var effMTU = t._MTU - t._channel.getBackpressure();
			// SynBuffer will be filled with data from Synchronizr if we have room for more
			if (s.isTransmitter() && effMTU - opBuffer.length > 3) {
				var synBuffer = t._synchronizr.sendRemote(effMTU - opBuffer.length, [t._OP_STANDARD]);
				if (synBuffer.length > 1) {
					t._channel.write(synBuffer);
				}
			}
		}
	}

	updateLocal() {
		this.assertTransmitter();
		this._synchronizr.updateLocal();
	}

	/**
	 * Set the information in the fields that corresponds to the event information
	 * @param ifo Object with (team, opp)(Town, Mascot, Abbr, Image), gender, location, startTime, specialDesc, eventType
	 */
	setEventInfo(ifo){
		var t = this;
		var buf00 = []; // Layout.txt -> gameType
		SynchronizrUtils.pushString(buf00, ifo.eventType, true);
		var buf01 = []; // Layout.txt -> eventInfo
		SynchronizrUtils.pushString(buf01, ifo.teamTown);
		SynchronizrUtils.pushString(buf01, ifo.teamMascot);
		SynchronizrUtils.pushString(buf01, ifo.teamAbbr);
		SynchronizrUtils.pushString(buf01, ifo.teamImage);

		SynchronizrUtils.pushString(buf01, ifo.oppTown);
		SynchronizrUtils.pushString(buf01, ifo.oppMascot);
		SynchronizrUtils.pushString(buf01, ifo.oppAbbr);
		SynchronizrUtils.pushString(buf01, ifo.oppImage);

		SynchronizrUtils.pushString(buf01, ifo.gender);
		SynchronizrUtils.pushString(buf01, ifo.location);
		SynchronizrUtils.pushString(buf01, ifo.startTime);
		SynchronizrUtils.pushString(buf01, ifo.specialDesc);

		t._synchronizr.setData(0, 0, buf00, t.MODE_WRITE);
		t._synchronizr.setData(0, 1, buf01, t.MODE_WRITE);
	}

	/**
	 * Get the information in the fields that corresponds to the event information. Inverse of setEventInfo
	 * @returns Object with (team, opp)(Town, Mascot, Abbr, Image), gender, location, startTime, specialDesc, eventType
	 */
	getEventInfo(){
		var t = this;
		var buf00 = t._synchronizr.getData()[0][0];
		var buf01 = t._synchronizr.getData()[0][1];
		var rtn = SynchronizrUtils.decodeEventData(buf01);
		rtn.eventType = SynchronizrUtils.getString(buf00, null, true);
		return rtn;
	}

	// Clear out all data from the underlying synchronizr
	clear(){
		this._synchronizr.clearData();
	}

	/**
	 * Save the contents of this Synchronizr to Local Storage
	 * @param id Id of event to save to. If omitted, is set to the current event
	 */
	save(id) {
		var t = this;
		if(id == null)
			id = t._event;
		DEBUGGR.assert(id != null); // Check if there is a valid place to save

		if(id === "undefined" || id === "null")
			throw "Illegal event name for saving event";

		console.log("Synchronizr saving: " + id);

		var ns = t._saveNamespace;
		var title = ns + "-SynchronizrEvent-" + id;
		var data = t._synchronizr.serialize();
		var base64 = U.uint8ToB64(data);
		localStorage.setItem(title, base64);
	}

	/**
	 * Load the contents of this Synchronizr from Local Storage
	 * @param id Id of event to load from. If omitted, it is set to the current event
	 */
	load(id) {
		var t = this;
		if(id == null)
			id = t._event;
		console.log("Synchronizr is loading event from LocalStorage: " + id);

		var ns = t._saveNamespace;
		var title = ns + "-" + "SynchronizrEvent-" + id;
		var base64 = localStorage.getItem(title);
		var data = U.b64ToUint8(base64);
		t._synchronizr.deserialize(data);
	}

	/**
	 * Get the event ID associated with a key in LocalStorage using the current SaveNamespace.
	 * If no event ID is associated with that key, return undefined
	 * @param key Local Storage key
	 * @returns Event ID or undefined
	 */
	getIdFromStorageKey(key) {
		var t = this;
		var prefix = t._saveNamespace + "-SynchronizrEvent-";
		if(key.startsWith(prefix)){
			return key.substring(prefix.length);
		}
		return undefined;
	}

	/**
	 * Same as load(), but returns false instead of throwing an exception
	 * @param id Id of event to load from. If omitted, it is set to the current event
	 */
	tryLoad(id){
		var t = this;
		if(id == null)
			id = t._event;
		if(id == null)
			return false;
		t.load(id);
	}

	_receiveHandlerInternal(e) {
		var t = this;
		if (t._receiveHandler) {
			if (DEBUGGR)
				DEBUGGR.invokeProtected(t._receiveHandler, this, t._synchronizr, e, undefined);
			else
				t._receiveHandler(e);
		}
	}

	_channelReceiveHandler(newStatus) {
		var t = this;
		// if (e)
		// 	console.log("New Status: " + e);
		var changesFromLast = undefined;
		while (t._channel.available()) {
			var pendingAfter = t._channel.available() > 1;
			var ops = t._channel.read();
			console.log(">> " + ops);
			if (DEBUGGR)
				changesFromLast =
					DEBUGGR.invokeProtected(t._applyOpcodes.bind(t), ops, ops, changesFromLast, pendingAfter);
			else
				changesFromLast = t._applyOpcodes(ops, changesFromLast, pendingAfter);
		}
		// Call receive handler if data was received or the synchronizr status changed
		if ((newStatus != null || changesFromLast) && t._receiveHandler) {
			if (DEBUGGR)
				DEBUGGR.invokeProtected(t._receiveHandler.bind(t), t, t._synchronizr, changesFromLast, newStatus);
			else
				t._receiveHandler(t._synchronizr, changesFromLast, newStatus);
		}
	}

	/**
	 * Apply bytecode from the server
	 * @param ops {Uint8Array} Incoming bytecode
	 * @param changesFromLast See Synchronizr
	 * @param pendingAfter See Synchronizr
	 * @private
	 */
	_applyOpcodes(ops, changesFromLast, pendingAfter) {
		var t = this;
		var op0 = ops[0];
		ops = ops.slice(1);
		switch (op0) {
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

	_applyManagerial(ops) {
		var t = this;
		var sendBuf = [];
		var ptr = 0;
		while (ptr < ops.length) {
			var op = ops[ptr++];
			switch (op) {
				case 240: // Verify Hash Request
					// Needs implemented for server-initiated hash requests
					break;

				case 239: // Verify Hash Response
					var len = ops[ptr++];
					var actHash = [];
					for (var x = 0; x < len; x++) {
						actHash.push(ops[ptr++]);
					}
					t._onVerifyHash(len ? actHash : undefined);
					break;
				case 234: // Query Event Response
					break;
				case 233: // Query All Events response
					var nEvents = ops[ptr++] * 256 + ops[ptr++];
					var rtn = {};
					for (var x = 0; x < nEvents; x++) {
						var lEvent = ops[ptr++] * 256 + ops[ptr++];
						var eventInfo = t.getEventInfoFromBC(ops, ptr, lEvent);
						if (eventInfo.id)
							rtn[eventInfo.id] = eventInfo;
						else console.error("Query all returned event with no ID");
						ptr += lEvent;
					}
					var msg = {type: 233, data: rtn}
					t._invokeManagerInfoCallback(msg);
					break;
				case 230: // Admin joined event
					break;
				case 229: // Admin disconnected intentionally
					break;
				case 228: // Admin lost connection due to network
					break;
				default:
					throw "Invalid Opcode " + op;
			}
		}
	}

	/**
	 * Parse a single event info response (from the server)
	 * @param buf Buffer of raw bytecode
	 * @param ptr Start position in bytecode
	 * @param len Length
	 */
	getEventInfoFromBC(buf, ptr, len) {
		var t = this;
		var id = undefined;
		var size = undefined;
		var game = undefined;
		var info = undefined;
		var admin = undefined;
		var privilege = 0;
		var endPtr = ptr + len;
		while (ptr < endPtr) {
			var op = buf[ptr++];
			switch (op) {
				case 255: //EventId
					var len2 = buf[ptr++] * 256 + buf[ptr++];
					id = t._getString(buf, ptr, len2);
					ptr += len2;
					break;
				case 254: //Size
					size = buf[ptr++] * 65536 + buf[ptr++] * 256 + buf[ptr++];
					break;
				case 253: //Game
					var len2 = buf[ptr++] * 256 + buf[ptr++];
					game = t._getString(buf, ptr, len2);
					ptr += len2;
					break;
				case 252: //Info
					var len2 = buf[ptr++] * 256 + buf[ptr++];
					info = buf.subarray(ptr, ptr + len2);
					ptr += len2;
					break;
				case 248:
					var protocol = buf[ptr++];
					var len2 = buf[ptr++] * 256 + buf[ptr++];
					var uname = t._getString(buf, ptr, len2);
					ptr += len2;
					admin = {protocol, uname};
					break;
				case 247:
					privilege = buf[ptr++];
			}
		}
		var rtn = {};
		if (id) rtn.id = id;
		if (size) rtn.size = size;
		if (game) rtn.game = game;
		if (info) rtn.info = info;
		if (admin) rtn.admin = admin;
		rtn.privilege = privilege;
		return rtn;
	}

	_invokeManagerInfoCallback(data) {
		var t = this;
		if (t._infoHandler) {
			if (DEBUGGR)
				DEBUGGR.invokeProtected(t._infoHandler, t, data);
			else
				t._infoHandler(data);
		}
	}

	/**
	 * Function to handle server errors
	 * @param ops Opcode that describes the error
	 * @param wasFatal True if the error has rendered the connection unusable. Non-fatal = warning
	 * @private
	 */
	_handleServerError(ops, wasFatal) {
		var t = this;
		if (wasFatal){
			console.error("Fatal Server Error: " + ops);
			this._hasFatalError = true;
		}
		else
			console.error("Non-Fatal Server Error: " + ops);

		if (t._errHandler) {
			var eN = ops[0];
			if (DEBUGGR)
				DEBUGGR.invokeProtected(
					t._errHandler, t, eN, t.decodeError(eN), t.decodeErrorUser(eN), t.decodeErrorUserAdvice(eN));
			else
				t._errHandler(eN, t.decodeError(eN), t.decodeErrorUser(eN), t.decodeErrorUserAdvice(eN));
		}
	}

	lastVerifySuccess() {
		return this._lastVerifySuccess;
	}

	hasFatalError(){
		return this._hasFatalError;
	}

	decodeErrorUser(errCode){
		var t = this;
		switch(errCode){
			case t.ERR_BAD_TYPE: return "An invalid or unsupported message type was received by the server.";
			case t.ERR_BAD_MGROP: return "An invalid or unsupported managerial message type was received by the server.";
			case t.ERR_BAD_EVPROP: return "An invalid or unsupported event property was received by the server.";
			case t.ERR_BAD_SYNOP: return "Synchronizr sent an opcode that the server couldn't understand.";
			case t.ERR_NO_EVENT_SET: return "The event to spectate/run has not been set (and it must be).";
			case t.ERR_EVENT_NOT_AVAILABLE: return "The event is not available. Check the event ID. If that fails, please try again later.";
			case t.ERR_NOT_ADMIN: return "You do not have sufficient privileges to perform this action. You may need to log in.";
			case t.ERR_ADMIN_EVENT_NOTCONNECTED: return "It appears you are trying to administer an event that you are not currently administering.";
			case t.ERR_STRING_OOB: return "The server encountered an internal error while parsing a bytecode string.";
			case t.ERR_WS_BAD_OPCODE: return "A bad opcode was received by the WebSocket connection.";
		}
		return "An unknown internal error occurred";
	}
	decodeErrorUserAdvice(errCode){
		var t = this;
		switch(errCode){
			case t.ERR_EVENT_NOT_AVAILABLE: return "If this error persists after the event was supposed to start, the administrator may be having connection difficulties.";
			case t.ERR_NOT_ADMIN: return "If logging in does not help, ensure your account has sufficient permissions.";
			case t.ERR_WS_BAD_OPCODE: return "Ensure you are not behind a proxy that blocks or modifies WebSocket connections. If this error persists, contact the site administrator.";
		}
		return "If this error persists, contact the site administrator.";
	}
	decodeError(errCode){
		var t = this;
		switch(errCode){
			case t.ERR_BAD_TYPE: return "ERR_BAD_TYPE";
			case t.ERR_BAD_MGROP: return "ERR_BAD_MGROP";
			case t.ERR_BAD_EVPROP: return "ERR_BAD_EVPROP";
			case t.ERR_BAD_SYNOP: return "ERR_BAD_SYNOP";
			case t.ERR_NO_EVENT_SET: return "ERR_NO_EVENT_SET";
			case t.ERR_EVENT_NOT_AVAILABLE: return "ERR_EVENT_NOT_AVAILABLE";
			case t.ERR_NOT_ADMIN: return "ERR_NOT_ADMIN";
			case t.ERR_ADMIN_EVENT_NOTCONNECTED: return "ERR_ADMIN_EVENT_NOTCONNECTED";
			case t.ERR_STRING_OOB: return "ERR_STRING_OOB";
			case t.ERR_WS_BAD_OPCODE: return "ERR_WS_BAD_OPCODE";
		}
		return "&lt;UNKNOWN ERROR CODE&gt;";
	}


	/**
	 * Calls setData of the underlying SynchronizrTransmitter to write data
	 * If the underlying synchronizr is a Receiver, an exception will be thrown
	 * @param num Number of internal array to write to
	 * @param idx Index in the array to write to
	 * @param val Array or Uint8Array to write.
	 * @param mode 0 for write, 1 for insert, 2 for delete, 3 for append
	 */
	setData(num, idx, val, mode) {
		this.assertTransmitter();
		this._synchronizr.setData(num, idx, val, mode);
	}

	/**
	 * Request a listing of live events from the server
	 */
	requestEventList() {
		var t = this;
		var buf = [];
		t._pushOpcode(buf, 254); // Type: Managerial
		t._pushOpcode(buf, 253); // Query all events
		t._pushOpcode(buf, 255); // Event ID
		t._pushOpcode(buf, 253); // Game type
		t._pushOpcode(buf, 252); // Info
		t._pushOpcode(buf, 248); // AdminConnected
		t._pushOpcode(buf, 247); // PrivilegeLevel
		t._pushOpcode(buf, 0); // End of query
		t._channel.write(buf);
	}

	/**
	 * Set the credentials that will be used when trying to connect to the server
	 * Takes effect on the next send() call
	 * @param uname Username
	 * @param pw Password
	 */
	setCredentials(uname, pw) {
		var t = this;
		if (t._username !== uname || t._password !== pw) {
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
	 * // TODO do this to implement hash-based auto recovery
	 */
	verifyHash() {
		var thisHash = SynchronizrHashr.hash(this._synchronizr.getHashTarget(), 16);
		var buf = [254, 240, 16]; // Manager/VerifyHash/Len=16
		for (var x = 0; x < thisHash.length; x++) {
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
	_onVerifyHash(actualHash) {
		var t = this;
		if (!actualHash) {
			t._lastVerifySuccess = true;
			console.log("Verify Hash Successful");
		} else {
			t._lastVerifySuccess = false;
			console.log("Verify Hash Successfull: ");
			console.log(actualHash);
		}
	}

	assertTransmitter() {
		if (!this._synchronizr || !this._synchronizr.isTransmitter())
			throw "SynchronizrManager not initialized as Transmitter";
	}

	_getString(buf, idx, len) {
		var rtn = "";
		for (var x = idx; x < idx + len; x++) {
			rtn += String.fromCharCode(buf[x]);
		}
		return rtn;
	}

	_pushUsernamePassword(buf, uname, pw) {
		var t = this;
		t._pushOpcode(buf, t._OP_SET_CREDENTIALS);
		t._pushString(buf, uname);
		t._pushString(buf, pw);
	}

	_pushCreateJoinEvent(buf, eventId) {
		var t = this;
		t._pushOpcode(buf, t._OP_CREATE_EVENT);
		var buf2 = [];
		t._pushOpcode(buf2, t._PROP_EVENTID);
		t._pushString(buf2, eventId);
		t._pushOpcode(buf2, t._PROP_PRIVILIGELEVEL);
		t._pushOpcode(buf2, 0); // Privilege level 0 = public
		t._pushString(buf, buf2);
	}

	_pushSpectateEvent(buf, eventId) {
		var t = this;
		t._pushOpcode(buf, t._OP_SPECTATE_EVENT);
		t._pushString(buf, eventId);
	}

	_pushOpcode(buf, op) {
		buf.push(op);
	}

	/**
	 * Push a Synchronizr-string or array to a buffer
	 * @param buf Buffer to write to
	 * @param str String or array to write
	 * @private
	 */
	_pushString(buf, str) {
		SynchronizrUtils.pushString(buf, str);
	}
}