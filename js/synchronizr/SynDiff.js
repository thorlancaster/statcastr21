class SynDiff {
	/**
	 * Adapted by Thor Lancaster for the Synchronizr project
	 */

	/**
	 * Get bytecode to send out over the network to the receiver.
	 * Safe mode: When this mode is specified, no compression will be applied and the data
	 * will consist solely of Long Runs and Literals.
	 * * If a bowl clearing is required, safe mode should be used for the rest of the connection
	 * @param o Array of old data
	 * @param n Array of new data
	 * @param s True for safe mode, false for normal operation
	 * @param mtu If specified, limits the output size to either one operation or the mtu,
	 * whichever is larger. If omitted, an infinite MTU is used
	 * TODO implement the above zzzipping level
	 * @returns {Uint8Array}
	 */
	static genDiffInfo(o, n, s, mtu) {
		o = [...o]; // Make copies of arrays to prevent originals from being corrupted
		n = [...n];
		var ops = []; // Strings or Arrays for Literals or Runs
		var bytecode = [];
		var diff = this.diff(o, n);
		// The below for loop generates the sequence of opcodes and literals
		for (var x = 0; x < diff.n.length; x++) {
			var itm = diff.n[x];
			var row = itm.row;
			if (itm.row === undefined) { // Raw insertion of literal
				ops.push(itm);
			} else { // RLE
				var last = ops[ops.length - 1];
				var created = false;
				// If the last item is not this run, start one
				if (typeof last !== 'object') {
					ops.push([row, row]);
					created = true;
					last = ops[ops.length - 1];
				}
				// If current item would make run longer, do it
				if (last[1] === itm.row - 1)
					last[1]++;
				else if (!created) { // Otherwise, start a new run
					ops.push([row, row]);
				}
			}
		}
		// Handle edge case of arrays being same length and new being equal to old.length
		// This would only happen when new and old were exactly the same, thus no changes
		if (Array.isArray(ops) && ops.length === 1 && ops[0][0] === 0 && ops[0][1] === o.length - 1)
			return new Uint8Array([]); // In this case no changes need to be made

		// The below for loop generates bytecode
		// TODO based on the Zzzip level, further compress literals
		var endLastRun = 0; // End of last run, for further compressing short/relative runs
		var meaningfulData = false; // Used for MTU limiting, always need at least one meaningful
		// operation or we won't get anywhere
		var hadToBreakForMtu = false;

		// For use below
		var allExceptFirstLiteral = true;

		for (var x = 0; x < ops.length; x++) {
			var op = ops[x];
			// noinspection NegatedIfStatementJS
			if (!Array.isArray(op)) {
				// Literal has <length:2byte> <content>
				// Literal is always meaningful
				var len = op.length;
				if(meaningfulData && bytecode.length + len + 2 + 1 > mtu) {
					// If adding the existing length + new data + opcode + bail opcode makes it longer than MTU
					hadToBreakForMtu = true;
					break;
				}
				bytecode.push(len >> 8);
				bytecode.push(len & 255);
				for (var y = 0; y < len; y++) {
					bytecode.push(op[y]);
				}
				meaningfulData = true;
			} else {
				if(x !== 0) // If we see a run in any position except the first (0th)
					allExceptFirstLiteral = false;
				var startRun = op[0];
				var endRun = op[1];
				var runLength = endRun - startRun;
				// Singular reference has [252] <startFromEndLastRun:byte>
				// Short/relative run has [255] <startFromEndLastRun:byte><len:byte>
				// Short/relative negRun has [254] <startFromBeforeEndLastRun:byte><len:byte>
				//// Just like a normal relative run, but counting backwards from the end
				// Long/absolute run has [253] <startFromEndLastRun:byte><len:byte>

				/*
				To reduce the size of append packets, the first run-signaling opcode can be replaced
				by a Direct Append opcode when the following conditions are true:
				* The Run-signalling opcode is the first opcode
				* The Run-signalling opcode's run encompasses all of the old data
				* All other opcodes are Literals
				This opcode has the same effect as the 3- or 5-byte sequence that it replaced, including
				updating the endLastRun variable
				 */
				if(!s && allExceptFirstLiteral && x === 0 && startRun === 0 && endRun === o.length - 1){
					bytecode.push(249);
					endLastRun = endRun;
				}
				else if (!s && runLength === 0 && startRun >= endLastRun && startRun < 256 + endLastRun) {
					// Singular reference
					if(meaningfulData && bytecode.length + 2 + 1 > mtu) {
						hadToBreakForMtu = true;
						break;
					}
					bytecode.push(252);
					bytecode.push(startRun - endLastRun);
					endLastRun = endRun;
					if(startRun > 0)
						meaningfulData = true;
				} else if (!s && runLength < 256 && startRun >= endLastRun && startRun < 256 + endLastRun) {
					// Short/Relative run
					if(meaningfulData && bytecode.length + len + 3 + 1 > mtu) {
						hadToBreakForMtu = true;
						break;
					}
					bytecode.push(255); // Opcode for short run
					bytecode.push(startRun - endLastRun); // Relative start
					bytecode.push(runLength); // Length of run
					endLastRun = endRun;
					if(startRun > 0)
						meaningfulData = true;
				} else if (!s && runLength < 256 && startRun <= endLastRun && startRun > endLastRun - 256) {
					// Short NegRun
					if(meaningfulData && bytecode.length + len + 3 + 1 > mtu) {
						hadToBreakForMtu = true;
						break;
					}
					bytecode.push(254); // Opcode for negative short run
					bytecode.push(endLastRun - startRun); // Relative negative start
					bytecode.push(runLength); // Length of run
					endLastRun = endRun;
					meaningfulData = true; // Negative runs are always meaningful
				} else { // All else fails, long run it is...
					if(meaningfulData && bytecode.length + len + 5 + 1 > mtu) {
						hadToBreakForMtu = true;
						break;
					}
					bytecode.push(253);
					bytecode.push(startRun >> 8);
					bytecode.push(startRun & 255);
					bytecode.push(endRun >> 8);
					bytecode.push(endRun & 255);
					endLastRun = endRun;
					if(startRun > 0)
						meaningfulData = true;
				}
			}
		}
		if(hadToBreakForMtu){
			bytecode.push(250); // BAIL opcode means copy all remaining BC we'll get back to it later
		}
		// var opsReadable = []; // Code for debugging only
		// for(var x = 0; x < ops.length; x++){
		// 	if(Array.isArray(ops[x])) {
		// 		opsReadable.push(ops[x])
		// 	} else {
		// 		var len = ops[x].length;
		// 		var str = "";
		// 		for(var y = 0; y < len; y++){
		// 			str += String.fromCharCode(ops[x][y]);
		// 		}
		// 		opsReadable.push(str);
		// 	}
		// }
		// return ops;
		// return {bc: new Uint8Array(bytecode), op: ops, readable: opsReadable};
		return new Uint8Array(bytecode);
	}

	/**
	 * Based on John Resig's implementation of the Diff algorithm
	 * * Released under the MIT license.
	 * @param o Old data
	 * @param n New data
	 */
	static diff(o, n) {
		var ns = {};
		var os = {};

		for (var i = 0; i < n.length; i++) {
			if (ns[n[i]] == null)
				ns[n[i]] = {rows: [], o: null};
			ns[n[i]].rows.push(i);
		}

		for (var i = 0; i < o.length; i++) {
			if (os[o[i]] == null)
				os[o[i]] = {rows: [], n: null};
			os[o[i]].rows.push(i);
		}

		for (var i in ns) {
			if (ns[i].rows.length == 1 && typeof (os[i]) != "undefined" && os[i].rows.length == 1) {
				n[ns[i].rows[0]] = {text: n[ns[i].rows[0]], row: os[i].rows[0]};
				o[os[i].rows[0]] = {text: o[os[i].rows[0]], row: ns[i].rows[0]};
			}
		}

		for (var i = 0; i < n.length - 1; i++) {
			if (n[i].text != null && n[i + 1].text == null && n[i].row + 1 < o.length && o[n[i].row + 1] != null &&
				o[n[i].row + 1].text == null &&
				n[i + 1] == o[n[i].row + 1]) {
				n[i + 1] = {text: n[i + 1], row: n[i].row + 1};
				o[n[i].row + 1] = {text: o[n[i].row + 1], row: i + 1};
			}
		}

		for (var i = n.length - 1; i > 0; i--) {
			if (n[i].text != null && n[i - 1].text == null && n[i].row > 0 && o[n[i].row - 1] != null &&
				o[n[i].row - 1].text == null &&
				n[i - 1] == o[n[i].row - 1]) {
				n[i - 1] = {text: n[i - 1], row: n[i].row - 1};
				o[n[i].row - 1] = {text: o[n[i].row - 1], row: i - 1};
			}
		}

		return {o: o, n: n};
	}
}