/**
 * Synchronizer Receiver Class
 * This class is the Model in the MVC architecture of the fan side.
 * Incoming network _data should be passed into applyOpcodes()
 * and the receive handler (set by setReceiveHandler()) will automatically
 * be called as described below.
 */
class SynchronizrReceiver {
	constructor() {
		var t = this;
		t.reset();
	}

	reset(){
		var t = this;
		t._data = []; // Up to 256 separate data arrays
		t._arrNum = -1;
		for (var x = 0; x < 256; x++)
			t._data[x] = [];
	}

	/**
	 * ONLY CALL THIS FROM THE TRANSMITTER. Used for diff generation
	 * @returns data
	 */
	getDataForTxUseOnly() {
		return this._data;
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
		if (typeof val === "number") {
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

	/**
	 * Set a function to be called whenever a bowl-clearing opcode is detected in a packet.
	 * The function will be called at the end of the packet, giving the application a fresh
	 * start.
	 * Using this method may not be needed in some applications
	 * @param f Bowl clear handler function
	 */
	setBowlClearHandler(f) {
		this._bowlClearHandler = f;
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
	applyOpcodes(bytecode, changesFromLast, pendingAfter) {
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
			if(ptr === -1) op = 251; // Inject an opcode to SET ARRAY
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
					if(ptr === 0) arrNum = t._arrNum; // Inject an argument for the SET ARRAY opcode
					t._arrNum = arrNum;
					readArr = t._data[arrNum]; // Assign new
					readArrAccesses = [];
					writeArr = undefined; // Clear old
					break;
				case 249: // Direct Append (Beginning)
					startRun = 0;
					endRun = readArr.length - 1;
					endLastRun = endRun;
					if(seenOpAfterSet)
						changeType = true;
					if(writeArr === undefined) writeArr = [];
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
						for (var x = 0; x < 255; x++) {
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
					// If tacking onto end and not true, increment
					if (writeArr === undefined) writeArr = [];
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
			t._data [arrNum] = writeArr; // Write the last data value

		if (pendingAfter) {
			// If more packets are coming, don't apply changes immediately
			return changes;
		} else { // If no more packets are coming...
			if (t._receiveHandler) // If any receive handler is specified, call it with the changes
				if(window.DEBUGGR)
					DEBUGGR.invokeProtected(t._receiveHandler, t._dbgRoot, changes);
				else
					t._receiveHandler(changes);
		}

// Call bowl clear handler after everything else is done
		if (bowlCleared && t._bowlClearHandler)
			t._bowlClearHandler();
	}
}


/**
 * Synchronizr Transmitter class.
 * This class is the Model in the MVC architecture of the admin side.
 * Model is updated by calling setData
 * Changes are pushed to the view by calling sendLocal()
 * Packets are generated for the network by calling sendRemote(MTU)
 *     MTU - Maximum amount of data to send at once.
 * SendRemote() sends the highest priority changes first
 */
class SynchronizrTransmitter {
	constructor() {
		var t = this;
		// // Constants
		t.MODE_WRITE = 0; // Overwrite
		t.MODE_INSERT = 1; // Insert _data, move other
		t.MODE_DELETE = 2; // Delete _data, move other
		t.MODE_APPEND = 3; // Add _data to end

		t._safeMode = 0; // Safe mode simplfies the output to try and suppress bugs
		t._data = []; // Current local state
		t._modifiedLocal = []; // Set entries to true upon state modification, used for local receive handler
		t._modifiedRemote = []; // Same as above, but for keeping track WRT remote state. True only.
		t._rx = new SynchronizrReceiver(); // Dummy receiver for keeping track of what has changed
		for (var x = 0; x < 256; x++) {
			t._data[x] = [];
		}
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
	 * call sendLocal() to call the receive handler
	 * and sendRemote() whenever the transmit channel is free
	 * @param num Number of internal array to write to
	 * @param idx Index in the array to write to
	 * @param val Array or Uint8Array to write.
	 * @param mode 0 for write, 1 for insert, 2 for delete, 3 for append
	 */
	setData(num, idx, val, mode) {
		var t = this;
		switch (mode) {
			case 0: // Write
				t._data[num][idx] = new Uint8Array(val);
				t._markModified(num);
				break;
			case 1: // Insert
				t._data[num].splice(idx, 0, new Uint8Array(val));
				t._markModified(num);
				break;
			case 2: // Delete
				t._data[num].splice(idx, 1);
				t._markModified(num);
				break;
			case 3: // Apppend
				t._data[num].push(val);
				t._markModified(num, true);
				break;
			default:
				throw "Invalid mode";
		}
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
	 * Call this function after calling setData() to call the receive handler
	 * and update the View
	 */
	sendLocal() {
		if (this._receiveHandler) {
			if(window.DEBUGGR){
				DEBUGGR.invokeProtected(this._receiveHandler, this._dbgRoot, this._modifiedLocal)
			} else
				this._receiveHandler(this._modifiedLocal);
		}
		this._modifiedLocal = [];
	}


	sendRemote(mtu) {
		var t = this;
		var toker = []; // Holds tokens
		var currLen = 0;
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
				var oData = t._rx.getDataForTxUseOnly()[x];
				var eMtu = mtu - 2;
				if(eMtu <= -2 || isNaN((eMtu))) eMtu = undefined;
				var diffBytecode = SynDiff.genDiffInfo(oData, tData, t._safeMode, eMtu);
				if (mtu > 0 && currLen > 0 && currLen + 2 + diffBytecode.length > mtu)
					break;
				if (diffBytecode.length) { // Only push if there were changes
					if(t._safeMode || rxArrNum !== x){
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
		return rtn;
	}
}