
class TestSynchronizrTXRX extends UnitTest{
	constructor(root, text) {
		super(root, text);
	}

	assertArrString(arr, str){
		var str2 = "";
		if(arr)
			for(var x = 0; x < arr.length; x++)
				str2 += String.fromCharCode(arr[x]);
		this.assertEquals(str, str2);
	}

	str2arr(str){
		if(!str) return;
		var len = str.length;
		var rtn = new Uint8Array(len);
		for(var x = 0; x < len; x++){
			rtn[x] = (str.charCodeAt(x));
		}
		return rtn;
	}

	arr2Str(arr){
		if(!arr) return;
		var len = arr.length;
		var rtn = "";
		for(var x = 0; x < len; x++){
			rtn += String.fromCharCode(arr[x]);
		}
		return rtn;
	}

	test(safe){
		try {
			var t = this;
			var tx = new SynchronizrTransmitter();
			if(safe)
				tx.setSafeMode(true);
			var rx = new SynchronizrReceiver();
			tx.setData(0, 0, this.str2arr("bbgame"), tx.MODE_APPEND);
			tx.setData(0, 0, this.str2arr("3.0.0"), tx.MODE_APPEND);

			tx.setData(1, 0, this.str2arr("foo"), tx.MODE_APPEND);
			tx.setData(1, 0, null, tx.MODE_DELETE);

			tx.setData(2, 0, this.str2arr("fbgame"), tx.MODE_APPEND);
			tx.setData(2, 0, this.str2arr("2.0.0"), tx.MODE_APPEND);

			tx.sendLocal();
			tx.clearBowl();
			var send = tx.sendRemote();
			// Simple test
			rx.applyOpcodes(send);
			t.assertEquals(t.arr2Str(rx._data[0][0]), "bbgame");
			t.assertEquals(t.arr2Str(rx._data[0][1]), "3.0.0");
			t.assertEquals(t.arr2Str(rx._data[2][0]), "fbgame");
			t.assertEquals(t.arr2Str(rx._data[2][1]), "2.0.0");
			t.assertEquals(rx._data[1].length, 0);

			// Does clearing the bowl clear the WHOLE BOWL?
			rx.applyOpcodes(send);
			t.assertEquals(t.arr2Str(rx._data[0][0]), "bbgame");
			t.assertEquals(t.arr2Str(rx._data[0][1]), "3.0.0");
			t.assertEquals(t.arr2Str(rx._data[2][0]), "fbgame");
			t.assertEquals(t.arr2Str(rx._data[2][1]), "2.0.0");

			// No short runs, Long runs, Negative short runs, Singular Short Runs
			// Yes Change ArrNum, String Literals
			// Does the synchronizr try to double-send?
			var foo = tx.sendRemote();
			t.assertEquals(foo.length, 0, "Double send when no new data");

			// Test with more complex data, simulate a worst-case for application use
			tx.setData(1, 0, this.str2arr("Play1"), tx.MODE_APPEND);
			rx.applyOpcodes(tx.sendRemote());
			tx.setData(1, 0, this.str2arr("Play3"), tx.MODE_APPEND);
			tx.setData(1, 0, this.str2arr("Play2"), tx.MODE_APPEND);
			tx.setData(1, 0, this.str2arr("Play4"), tx.MODE_APPEND);
			rx.applyOpcodes(tx.sendRemote());
			tx.setData(1, 1, this.str2arr("Play2"), tx.MODE_WRITE);
			tx.setData(1, 2, this.str2arr("Play3"), tx.MODE_WRITE);
			foo = tx.sendRemote(1);
			rx.applyOpcodes(foo);
			tx.setData(1, 0, this.str2arr("Play5"), tx.MODE_APPEND);
			tx.setData(1, 0, this.str2arr("Play6"), tx.MODE_APPEND);
			tx.setData(1, 0, this.str2arr("Play7"), tx.MODE_APPEND);
			foo = tx.sendRemote(1);
			rx.applyOpcodes(foo)
			foo = tx.sendRemote();
			rx.applyOpcodes(foo);

			t.assertEquals(t.arr2Str(rx._data[1][0]), "Play1");
			t.assertEquals(t.arr2Str(rx._data[1][1]), "Play2");
			t.assertEquals(t.arr2Str(rx._data[1][2]), "Play3");
			t.assertEquals(t.arr2Str(rx._data[1][3]), "Play4");
			t.assertEquals(t.arr2Str(rx._data[1][4]), "Play5");
			t.assertEquals(t.arr2Str(rx._data[1][5]), "Play6");
			t.assertEquals(t.arr2Str(rx._data[1][6]), "Play7");

			tx.setData(1, 0, this.str2arr("Play8"), tx.MODE_APPEND);
			foo = tx.sendRemote(0);
			rx.applyOpcodes(foo); // Append to previously written array should have zero overhead
			tx.setData(1, 0, this.str2arr("Play9"), tx.MODE_APPEND);
			foo = tx.sendRemote(0);
			rx.applyOpcodes(foo);
			if(safe)
				t.assertEquals(foo.length, 14, "Append has wrong size, val != 14");
			else
				t.assertEquals(foo.length, 8, "Append has overhead, val > 8");
			t.assertEquals(t.arr2Str(rx._data[1][7]), "Play8");
			t.assertEquals(t.arr2Str(rx._data[1][8]), "Play9");

			tx.setData(1, 1, this.str2arr("Play22"), tx.MODE_WRITE);
			tx.setData(1, 4, this.str2arr("Play55"), tx.MODE_WRITE);

			foo = tx.sendRemote(0);
			rx.applyOpcodes(foo);

			t.assertEquals(t.arr2Str(rx._data[1][0]), "Play1");
			t.assertEquals(t.arr2Str(rx._data[1][1]), "Play22");
			t.assertEquals(t.arr2Str(rx._data[1][2]), "Play3");
			t.assertEquals(t.arr2Str(rx._data[1][3]), "Play4");
			t.assertEquals(t.arr2Str(rx._data[1][4]), "Play55");
			t.assertEquals(t.arr2Str(rx._data[1][5]), "Play6");
			t.assertEquals(t.arr2Str(rx._data[1][6]), "Play7");
			t.assertEquals(t.arr2Str(rx._data[1][7]), "Play8");
			t.assertEquals(t.arr2Str(rx._data[1][8]), "Play9");
			t.assertEquals(t.arr2Str(rx._data[1][9]), undefined);

		}
		catch(e){
			console.error(e);
			return e;
		}
		return undefined;
	}
}

class TestSynchronizrFullSafe extends TestSynchronizrTXRX{
	constructor(root, text) {
		super(root, text);
	}
	test(){
		return super.test(true);
	}
}
