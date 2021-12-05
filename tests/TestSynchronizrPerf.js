
class TestSynchronizrPerf extends UnitTestPerformance{
	constructor(root, text) {
		super(root, text);
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

	test(){
		var t = this;
		var tx = new SynchronizrTransmitter();
		var rx = new SynchronizrReceiver();

		// Test step 1: Load a representative game
		tx.setData(0, 0, t.str2arr("bbgame"), tx.MODE_WRITE);
		tx.setData(0, 1, t.str2arr("3.0.1"), tx.MODE_WRITE);

		tx.setData(1, 0, t.str2arr("01 SomePlayerxxx 02 SomePlayerxxx 03 SomePlayerxxx 04 SomePlayerxxx 05 SomePlayerxxx 06 SomePlayerxxx"), tx.MODE_WRITE);
		tx.setData(1, 1, t.str2arr("06 SomePlayerxxx 07 SomePlayerxxx 08 SomePlayerxxx 09 SomePlayerxxx 10 SomePlayerxxx 11 SomePlayerxxx"), tx.MODE_WRITE);

		for(var x = 0; x < 1000; x++){
			tx.setData(2, 0, t.str2arr("Play" + x +" " + ((x*(x<<8))%1000) ), tx.MODE_APPEND);
		}

		var start = performance.now();
		for(var x = 0; x < 50; x++){
			tx.clearBowl();
			var foo = tx.sendRemote(0);
			rx.applyOpcodes(foo);
		}
		var end = performance.now();

		var diff = Math.round((end - start)*10) / 10;

		return {ms: diff, pass: diff < 1000};
	}
}
