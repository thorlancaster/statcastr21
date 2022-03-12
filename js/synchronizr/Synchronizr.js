class SynchronizrUtils {
	static byteArrToStr(byteArr) {
		var rtn = "";
		for (var x = 0; x < byteArr.length; x++)
			rtn += String.fromCharCode(byteArr[x]);
		return rtn;
	}

	/**
	 * Push a Synchronizr-string or array to a buffer
	 * @param buf Buffer to write to
	 * @param str String or array to write
	 * @param unprefixed If true, omit 2 byte length prefix
	 */
	static pushString(buf, str, unprefixed) {
		var len = str.length;
		if(!unprefixed){
			buf.push((len >> 8) & 0xFF);
			buf.push((len) & 0xFF);
		}
		if (typeof str === "string") {
			for (var x = 0; x < str.length; x++)
				buf.push(str.charCodeAt(x));
		} else {
			for (var x = 0; x < str.length; x++)
				buf.push(str[x]);
		}
	}

	/**
	 * Get a Synchronizr-string or array from a buffer
	 * @param buf Buffer to read from
	 * @param {Array} idxPtr BY REFERENCE index in the buffer. If null, the whole buffer is converted
	 * @param asString true to return result as String, false to return as Byte Array
	 */
	static getString(buf, idxPtr, asString) {
		var ptr = 0;
		var len = 0;
		if(idxPtr) {
			ptr = idxPtr[0];
			len = (buf[ptr++] << 8) + buf[ptr++];
			idxPtr[0] = ptr + len;
		} else {
			ptr = 0;
			len = buf.length;
		}
		if (asString) {
			var rtn = "";
			for (var x = 0; x < len; x++) {
				rtn += String.fromCharCode(buf[ptr++]);
			}
			return rtn;
		} else {
			var rtn = [];
			for (var x = 0; x < len; x++) {
				rtn.push(buf[ptr++]);
			}
			return rtn;
		}
	}

	static decodeEventData(arr){
		var arrPtr = [0];
		var rtn = {};
		rtn.teamTown = SynchronizrUtils.getString(arr, arrPtr, true);
		rtn.teamMascot = SynchronizrUtils.getString(arr, arrPtr, true);
		rtn.teamAbbr = SynchronizrUtils.getString(arr, arrPtr, true);
		rtn.teamImage = SynchronizrUtils.getString(arr, arrPtr, true);

		rtn.oppTown = SynchronizrUtils.getString(arr, arrPtr, true);
		rtn.oppMascot = SynchronizrUtils.getString(arr, arrPtr, true);
		rtn.oppAbbr = SynchronizrUtils.getString(arr, arrPtr, true);
		rtn.oppImage = SynchronizrUtils.getString(arr, arrPtr, true);

		rtn.gender = SynchronizrUtils.getString(arr, arrPtr, true);
		rtn.location = SynchronizrUtils.getString(arr, arrPtr, true);
		rtn.startTime = SynchronizrUtils.getString(arr, arrPtr, true);
		rtn.specialDesc = SynchronizrUtils.getString(arr, arrPtr, true);

		return rtn;
	}

	// Parse an event query response (from the server) into valid JS data
	static parseEventQueryResponse(data) {
		return data;
	}
}


class SynchronizrOpsClass {
	constructor() {
		var t = this;
		t.MODE_WRITE = 0; // Overwrite
		t.MODE_INSERT = 1; // Insert data, move other
		t.MODE_DELETE = 2; // Delete data, move other
		t.MODE_APPEND = 3; // Add data to end
		t.MODE_CLEAR = 4; // Clear all data from this subArray
	}
}

/**
 * Class that holds Synchronizr functions common to both transmitter and receiver
 */
class SynchronizrComFnsClass extends SynchronizrOpsClass {
	constructor(props) {
		super(props);
		var t = this;
		t._modifiedLocal = []; // Set entries to true upon state modification, used for local receive handler
		t._modifiedRemote = []; // Same as above, but for keeping track WRT remote state. True only.
	}

	getData() {
		return this._data;
	}

	/**
	 * Serialize the state of this Synchronizr into a byte array
	 * @returns {number[]}
	 */
	serialize() {
		var rtn = [253, 255, 255, 255, 255]; // Inhale CHEECH CHEECH CHEECH CHEECH
		for (var x = 0; x < 256; x++) {
			var arrx = this._data[x];
			if (arrx.length) {
				rtn.push(251);
				rtn.push(x);
			}
			for (var y = 0; y < arrx.length; y++) {
				var arry = arrx[y];
				if (!arry) arry = []; // Serialize undefined subarrays the sam as empty ones
				var szY = arry.length;
				rtn.push((szY >> 8) & 0xFF);
				rtn.push(szY & 0xFF);
				for (var z = 0; z < szY; z++) {
					rtn.push(arry[z]);
				}
			}
		}
		return rtn;
	}

	/**
	 * Deserialize the state of this Synchronizr from a byte array
	 * @param bc Array from Serialize() or the server
	 */
	deserialize(bc) {
		this.applyOpcodes2(bc, [], false);
		for (var x = 0; x < 256; x++) {
			this._modifiedLocal[x] = true;
			this._modifiedRemote[x] = true;
		}
	}

	/**
	 * Pretty-print the state, for debugging
	 */
	printState() {
		console.log("--------Synchronizr--------")
		for (var x = 0; x < 255; x++) {
			if (this._data[x].length > 0) {
				console.log("[" + x + "]");
				var dat = this._data[x];
				for (var y = 0; y < dat.length; y++) {
					console.log("    [" + y + "]: " + U.printStr(dat[y]));
				}
			}
		}
		console.log("---------------------------")
	}

	/**
	 * Apply opcodes (see SynchronizrSyntax.txt) to this Synchronizr.
	 * If a Receive handler has been set, it will be called as described above.
	 * This function should be called once for each arriving network packet.
	 * The return value from this function should ALWAYS be stored and passed in as changesFromLast,
	 * even if pendingAfter was not manually set. It may be set by a bail opcode in the data (see below).
	 * @param bytecode Bytecode produced by Synchronizr
	 * @param changesFromLast [optional] Change array returned by last invocation
	 * @param pendingAfter [optional] If true, return a change array instead of calling receive handler
	 * * PendingAfter will also be set to true on a bail.
	 */
	applyOpcodes2(bytecode, changesFromLast, pendingAfter) {
		var t = this;
		var changes = changesFromLast ? changesFromLast : [];
		var ptr = -2;
		var endLastRun = 0;
		var arrNum = -1;
		var bowlCleared = false;
		// Set to working data[arrNum] array whenever it is set
		var readArr = [];

		// Used to keep track of the type of changes being made for THIS ArrNum
		// An appends consists of the VERY NEXT OPCODE being a blind copy of old to new
		// Followed by any number of APPEND opcodes.
		// Otherwise the modification should be counted as a general modification.
		// integers are append, true is general modification
		var changeType = undefined;
		var seenOpAfterSet = false;

		// Used to copy old data to new
		var writeArr = undefined;
		// Used for bailing if necessary
		var readArrAccesses = [];
		while (ptr < bytecode.length) {
			var op = bytecode[ptr++];
			if (ptr === -1) op = 251; // Inject an opcode to SET ARRAY
			let startRun, endRun;
			switch (op) {
				case 250: // BAIL, write everything not read from readArr to the end
					for (var x = 0; x < readArr.length; x++) {
						if (!readArrAccesses[x]) {
							if (writeArr === undefined) writeArr = [];
							writeArr.push(readArr[x]);
						}
					}
					break;
				case 251: // Set ArrNum
					if (arrNum >= 0 && writeArr !== undefined) {
						changes[arrNum] = changeType;
						t._data[arrNum] = writeArr; // Write old
					}
					changeType = changes[arrNum] | 0;
					arrNum = bytecode[ptr++]; // Grab new
					if (ptr === 0) arrNum = t._arrNum; // Inject an argument for the SET ARRAY opcode
					t._arrNum = arrNum;
					readArr = t._data[arrNum]; // Assign new
					readArrAccesses = [];
					writeArr = undefined; // Clear old
					break;
				case 249: // Direct Append (Beginning)
					startRun = 0;
					endRun = readArr.length - 1;
					endLastRun = endRun;
					if (seenOpAfterSet)
						changeType = true;
					if (writeArr === undefined) writeArr = [];
					for (let x = startRun; x <= endRun; x++) {
						writeArr.push(readArr[x]);
						readArrAccesses[x] = true;
					}
					break;
				case 255: // Short Run
					startRun = endLastRun + bytecode[ptr++];
					endRun = startRun + bytecode[ptr++];
					endLastRun = endRun;
					if (startRun !== 0 || endRun !== readArr.length || seenOpAfterSet)
						changeType = true;
					if (writeArr === undefined) writeArr = [];
					for (let x = startRun; x <= endRun; x++) {
						writeArr.push(readArr[x]);
						readArrAccesses[x] = true;
					}
					break;
				case 254: // Negative Short Run
					startRun = endLastRun - bytecode[ptr++];
					endRun = startRun + bytecode[ptr++];
					endLastRun = endRun;
					changeType = true;
					if (writeArr === undefined) writeArr = [];
					for (let x = startRun; x <= endRun; x++) {
						writeArr.push(readArr[x]);
						readArrAccesses[x] = true;
					}
					break;
				case 253: // Long Run or CLEAR BOWL
					startRun = bytecode[ptr++] * 256 + bytecode[ptr++];
					endRun = bytecode[ptr++] * 256 + bytecode[ptr++];
					if (startRun === 65535 && endRun === 65535) { // CLEAR BOWL
						bowlCleared = true;
						for (var x = 0; x < 256; x++) {
							t._data[x] = []; // Fully clear that section
							changes[x] = true; // And fully reload. Reload everything
							// If this command is called the application needs a nice green hit
						}
					} else { // Long Run
						endLastRun = endRun;
						if (startRun !== 0 || endRun !== readArr.length || seenOpAfterSet)
							changeType = true;
						if (writeArr === undefined) writeArr = [];
						for (let x = startRun; x <= endRun; x++) {
							writeArr.push(readArr[x]);
							readArrAccesses[x] = true;
						}
					}
					break;
				case 252: // Singular Short Run [1 element long]
					startRun = endLastRun + bytecode[ptr++];
					endLastRun = startRun;
					if (startRun !== 0 || 1 !== readArr.length || seenOpAfterSet)
						changeType = true;
					if (writeArr === undefined) writeArr = [];
					writeArr.push(readArr[startRun]);
					readArrAccesses[startRun] = true;
					break;
				default: // Just a normal string literal
					let len = op * 256 + bytecode[ptr++];
					var dat = [];
					if (writeArr === undefined) writeArr = [];

					// If tacking onto end and not true, increment
					if (changeType === writeArr.length - readArr.length)
						changeType++;
					else
						changeType = true;

					for (let x = 0; x < len; x++) {
						dat.push(bytecode[ptr++]);
					}
					writeArr.push(new Uint8Array(dat));
					break;
			}
			if (op !== 251)
				seenOpAfterSet = true;
		}

		changes[arrNum] = changeType;

		if (writeArr !== undefined && arrNum >= 0)
			t._data[arrNum] = writeArr; // Write the last data value

		if (pendingAfter) {
			// If more packets are coming, don't apply changes immediately
			return changes;
		} else { // If no more packets are coming...
			if (t._receiveHandler) // If any receive handler is specified, call it with the changes
				if (window.DEBUGGR)
					DEBUGGR.invokeProtected(t._receiveHandler, t._dbgRoot, changes);
				else
					t._receiveHandler(changes);
		}
		return changes;
	}

	clearData(){
		for (var x = 0; x < 256; x++) {
			this._data[x] = [];
		}
	}
}


/**
 * Synchronizer Receiver Class
 * This class is the Model in the MVC architecture of the fan side.
 * Incoming network data should be passed into applyOpcodes()
 * and the receive handler (set by setReceiveHandler()) will automatically
 * be called as described below.
 */
class SynchronizrReceiver extends SynchronizrComFnsClass {
	constructor(data) {
		super();
		var t = this;
		t.reset();
		if (data)
			t._data = data;
	}

	isTransmitter() {
		return false
	}

	getHashTarget() {
		return this;
	}

	reset() {
		var t = this;
		t._data = []; // Up to 256 separate data arrays
		t._arrNum = -1;
		for (var x = 0; x < 256; x++)
			t._data[x] = [];
	}

	resetReceiver() {
		this.reset();
	}

	applyOpcodes(bytecode, changesFromLast, pendingAfter) {
		this.applyOpcodes2(bytecode, changesFromLast, pendingAfter);
	}

	/**
	 * Retrieve data from this Synchronizr.
	 * If either parameter is out of bounds, returns undefined
	 * If called with no arguments, returns the data array
	 * @param num ArrNum to retrieve from
	 * @param idx Element in the above array.
	 *  If omitted, returns the length
	 * @returns {Uint8Array} data[num][idx]
	 */
	getData(num, idx) {
		if (num == null && idx == null)
			return this._data;
		var t = this;
		var arr = this._data[num];
		if (idx === undefined)
			return arr.length;
		if (!arr)
			return;
		return arr[idx];
	}

	/**
	 * Used to mark a modification array
	 * Used by both transmitter and receiver
	 * @param arr
	 * @param num
	 * @param append
	 */
	markModified2(arr, num, append) {
		var val = arr[num];
		if (val === true) // Can't get any more modified than fully
			return;
		if (val == null) {
			if (append)
				arr[num] = 1;
			else
				arr[num] = true;
		} else if (typeof val === "number") {
			if (append)
				arr[num]++;
			else
				arr[num] = true;
		} else {
			if (!append)
				arr[num] = true;
		}
	}

	/**
	 * Set the receive handler that will be called whenever new _data arrives.
	 * This function will receive, as an argument, a sparse array.
	 * Each entry in the array corresponds to one selected array.
	 * Each entry will be either:
	 * * A number, representing the number of elements that have been appended
	 * * The value 'true', indicating that the entire sub-array needs reloaded
	 * @param f Receive handler function
	 * @param d Debug root object. Needed when Debuggr is in use
	 */
	setReceiveHandler(f, d) {
		this._receiveHandler = f;
		this._dbgRoot = d;
	}

}


/**
 * Synchronizr Transmitter class.
 * This class is the Model in the MVC architecture of the admin side.
 * Model is updated by calling setData
 * Changes are pushed to the view by calling updateLocal()
 * Packets are generated for the network by calling sendRemote(MTU)
 *     MTU - Maximum amount of data to send at once.
 * SendRemote() sends the highest priority changes first
 * @param data Use data from an old Synchronizer instance. Pass this if reconnecting
 */
class SynchronizrTransmitter extends SynchronizrComFnsClass {
	constructor(data) {
		super();
		var t = this;
		t._safeMode = 0; // Safe mode simplfies the output to try and suppress bugs. Consumes more data
		if (data) {
			t._data = data;
			for (var x = 0; x < 256; x++) {
				if (data[x] && data[x].length) {
					t._modifiedRemote[x] = true;
					t._modifiedLocal[x] = true;
				}
			}
		} else {
			t._data = []; // Initialize Current local state
			for (var x = 0; x < 256; x++) {
				t._data[x] = [];
			}
		}
		t._rx = new SynchronizrReceiver(); // Dummy receiver for keeping track of what has changed
	}


	isTransmitter() {
		return true
	}

	getHashTarget() {
		return this._rx;
	}

	/**
	 * Set the current Safe Mode setting. True should be used after a Synchronizr error
	 * that was not certainly caused by a ReliableChannel failure
	 * @param z Zzzipping level
	 */
	setSafeMode(z) {
		this._safeMode = z;
	}

	/**
	 * @returns {number} Current Safe Mode setting
	 */
	getSafeMode() {
		return this._safeMode;
	}


	/**
	 * Set the receive handler that will be called whenever new _data arrives
	 * @param f Receive handler function
	 * @param d Debug root object. Needed when Debuggr is in use
	 */
	setReceiveHandler(f, d) {
		this._receiveHandler = f;
		this._dbgRoot = d;
	}


	/**
	 * Write data to the internal buffer and queue it for sending.
	 * After this function has been called one or more times,
	 * call updateLocal() to call the receive handler
	 * and sendRemote() whenever the transmit channel is free
	 * @param num Number of internal array to write to
	 * @param idx Index in the array to write to. -1 for delete removes last item.
	 * @param val Array, Uint8Array, or String to write.
	 * @param mode 0 for write, 1 for insert, 2 for delete, 3 for append, 4 for clear
	 */
	setData(num, idx, val, mode) {
		var t = this;
		if (typeof val === "string")
			val = t.str2arr(val);
		else if (Array.isArray(val))
			val = new Uint8Array(val);
		else if (!val instanceof Uint8Array)
			throw "\'val\' is an invalid type";

		switch (mode) {
			case 0: // Write
				t._data[num][idx] = val;
				t._markModified(num);
				break;
			case 1: // Insert
				t._data[num].splice(idx, 0, val);
				t._markModified(num);
				break;
			case 2: // Delete
				if (idx === -1)
					t._data[num].length--;
				else
					t._data[num].splice(idx, 1);
				t._markModified(num);
				break;
			case 3: // Append
				t._data[num].push(val);
				t._markModified(num, true);
				break;
			case 4: // Clear
				t._data[num].length = 0;
				t._markModified(num);
				break;
			default:
				throw "Invalid mode";
		}
	}

	/**
	 * Helper function to convert String to a Uint8Array
	 * @param str Input String
	 * @returns {Uint8Array}
	 */
	str2arr(str) {
		if (!str) return;
		var len = str.length;
		var rtn = new Uint8Array(len);
		for (var x = 0; x < len; x++) {
			rtn[x] = (str.charCodeAt(x));
		}
		return rtn;
	}

	/**
	 * Private function to mark a data array as modified
	 * Appends should be marked whenever possible, as it is often far easier
	 * for the application to process changes when it knows that items have
	 * simply been appended to the end, rather than the whole list having to
	 * be reloaded.
	 * @param num Number of array
	 * @param append True for append, false for other modification.
	 * @private
	 */
	_markModified(num, append) {
		this._rx.markModified2(this._modifiedLocal, num, append);
		this._modifiedRemote[num] = true;
	}

	/**
	 * Clear everything from the receiver, redoing everything from ground zero.
	 * This function is like a "nuclear bomb" and should only be called when
	 * an error has been detected.
	 * Any errors that require this function to be called should be logged.
	 */
	clearBowl() {
		this._bowlCleared = true;
	}

	/**
	 * Same as clearBowl(), but allows for hash-based renegotiation
	 * (Right now it just calls clearBowl())
	 * TODO support hash-based renegotation
	 */
	resetReceiver() {
		this.clearBowl();
	}


	/**
	 * Call this function after calling setData() to call the receive handler
	 * and update the View
	 */
	updateLocal() {
		if (this._receiveHandler) {
			if (window.DEBUGGR) {
				DEBUGGR.invokeProtected(this._receiveHandler, this._dbgRoot, this._modifiedLocal)
			} else
				this._receiveHandler(this._modifiedLocal);
		}
		this._modifiedLocal = [];
	}

	applyOpcodes() {
		throw "SynchronizrTransmitter does not accept opcodes";
	}


	/**
	 * Generate a packet to send over the network.
	 * This packet MUST always be sent in the order it was generated
	 * or errors will occur
	 * @param mtu Target maximum packet length.
	 *  At least one meaningful opcode must always be sent
	 *  and the MTU may be exceeded in some cases
	 * @param prepend {Array} Optional - Used to prepend higher-layer protocol opcode(s)
	 * @returns {Uint8Array} Opcodes to send
	 */
	sendRemote(mtu, prepend) {
		var t = this;
		var currLen = 0;
		var numPrepended = 0;
		var toker = []; // Holds tokens
		if (t._bowlCleared) {
			// Inhale CHEECH CHEECH CHEECH CHEECH
			toker.push([253, 255, 255, 255, 255]);
			currLen += 5;
			t._rx.reset();
			t._bowlCleared = false;
		}
		// TODO each slot / arrNum has its own priority, instead of 0 being highest, descending
		var rxArrNum = t._rx._arrNum;
		for (var x = 0; x < 256; x++) {
			if (t._modifiedRemote[x]) { // For each subArray, check if it needs re-synced
				var tData = t._data[x];
				var oData = t._rx.getData()[x];
				var eMtu = mtu - 2;
				if (eMtu <= -2 || isNaN((eMtu))) eMtu = undefined;
				var diffBytecode = SynDiff.genDiffInfo(oData, tData, t._safeMode, eMtu);
				if (mtu > 0 && currLen > 0 && currLen + 2 + diffBytecode.length > mtu)
					break;
				if (diffBytecode.length) { // Only push if there were changes
					if (t._safeMode || rxArrNum !== x) {
						// NOTE: there used to be an || true at the end because the arrNum would get out of sync
						// Skip initial set of arrNum if it is already cached by the rx.
						// If safe mode, always set arrNum
						toker.push([251, x]); // Set arrNum
						currLen += 2;
						rxArrNum = x;
					}
					toker.push(diffBytecode); // Apply changes to that arrNum
					currLen += diffBytecode.length;
				} else { // If there were no changes, clear the modifedRemote flag
					t._modifiedRemote[x] = false;
				}
			}
		}
		// Combine packets together
		var rtn = new Uint8Array(currLen);
		var ptr = 0;
		for (var x = 0; x < toker.length; x++) {
			for (var y = 0; y < toker[x].length; y++) {
				if (ptr >= rtn.length)
					throw "OOB"; // Should never happen, out-of-bounds access
				rtn[ptr++] = toker[x][y];
			}
		}
		// Apply changes to internal receiver
		t._rx.applyOpcodes(rtn);
		if (prepend) {
			var rtn2 = new Uint8Array(rtn.length + prepend.length);
			var ptr2 = 0;
			for (var x = 0; x < prepend.length; x++)
				rtn2[ptr2++] = prepend[x];
			for (var x = 0; x < rtn.length; x++)
				rtn2[ptr2++] = rtn[x];
			return rtn2;
		}
		return rtn;
	}
}


class SynchronizrHashr {
	/**
	 * Calculate the hash of an event.
	 * This hash IS NOT TO BE USED FOR ANYTHING SECURITY-RELATED WHATSOEVER.
	 * This hash is to be used to detect uninteded discrepancies in state
	 * between client and server due to bugs.
	 *
	 * @param syn Synchronizr or Synchronizr data to hash
	 * @param len {Number} Number of bytes of hash to compute. Currently only 16 is supported.
	 * @returns {Uint8Array} a 128-bit (16-byte) hash
	 */
	static hash(syn, len) {
		if (syn._data)
			syn = syn._data;
		var blob = [];
		for (var x = 0; x < syn.length; x++) {
			var arrx = syn[x];
			for (var y = 0; y < arrx.length; y++) {
				var arry = arrx[y];
				for (var z = 0; z < arry.length; z++) {
					blob.push(arry[z]);
				}
				blob.push(0);
			}
			blob.push(0);
		}
		var rtn = SynchronizrHashr.hashBlob(blob);
		if (rtn.length !== len)
			throw "Only lengths of " + rtn.length + " supported";
		return rtn;
	}

	static hashBlob(blob) {
		return MD5.bmd5(blob);
	}
}