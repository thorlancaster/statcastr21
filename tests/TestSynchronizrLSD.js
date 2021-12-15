class TestSynchronizrLSD extends UnitTest {
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

	test() {
		try {
			var sm = new SynchronizrManager();
			sm.setServer(U.DEFAULT_SERVER);
			sm.setTX(true);
			sm.setCredentials(U.TESTING_USERNAME, U.TESTING_PASSWORD);
			sm.setEvent("fmlbbtest2101");
			sm.connect();

			sm.setData(0, 0, this.str2arr("bbgame"), sm.MODE_APPEND);
			sm.setData(0, 0, this.str2arr("3.0.0"), sm.MODE_APPEND);

			sm.setData(1, 0, this.str2arr("foo"), sm.MODE_APPEND);
			sm.setData(1, 0, null, sm.MODE_DELETE);

			sm.setData(2, 0, this.str2arr("fbgame"), sm.MODE_APPEND);
			sm.setData(2, 0, this.str2arr("2.0.0"), sm.MODE_APPEND);
			sm.setData(2, 0, this.str2arr("GET BUG SPRAYED %s %s %s %s %s"), sm.MODE_APPEND);

			sm.send();
			sm._synchronizr.getHashTarget().printState();

			// Test with more complex data, simulate a worst-case for application use
			sm.setData(1, 0, this.str2arr("Play1"), sm.MODE_APPEND);
			sm.send();
			sm._synchronizr.getHashTarget().printState();
			sm.setData(1, 0, this.str2arr("Play3"), sm.MODE_APPEND);
			sm.setData(1, 0, this.str2arr("Play2"), sm.MODE_APPEND);
			sm.setData(1, 0, this.str2arr("Play4"), sm.MODE_APPEND);
			sm.setData(1, 1, this.str2arr("Play2"), sm.MODE_WRITE);
			sm.setData(1, 2, this.str2arr("Play3"), sm.MODE_WRITE);
			sm.send(1);
			sm._synchronizr.getHashTarget().printState();
			sm.setData(1, 0, this.str2arr("Play5"), sm.MODE_APPEND);
			sm.setData(1, 0, this.str2arr("Play6"), sm.MODE_APPEND);
			sm.setData(1, 0, this.str2arr("Play7"), sm.MODE_APPEND);
			sm.send(1);
			sm._synchronizr.getHashTarget().printState();

			sm.send();
			sm._synchronizr.getHashTarget().printState();
			sm.setData(1, 0, this.str2arr("Play9"), sm.MODE_APPEND);
			// TODO something needs to make a SHORT RUN happen (Code Coverage)
			sm.setData(1, 1, this.str2arr("Play22"), sm.MODE_WRITE);
			sm.setData(1, 4, this.str2arr("Play55"), sm.MODE_WRITE);

			sm.send();
			sm._synchronizr.getHashTarget().printState();

			sm.verifyHash();

			if(false) { // Set to true and Synchronizr will disconnect and become a client
				setTimeout(function () { // Give the server a second to process the info
					this.assertEquals(sm.lastVerifySuccess(), true, "Hash Verification");
					console.log("Setting SynchronizrManager to Receiver and reconnecting")
					sm.setTX(false);
					sm.connect();

					sm._synchronizr.getHashTarget().printState();
					setTimeout(function () {
						sm._synchronizr.getHashTarget().printState();
					}, 1000);

				}.bind(this), 1000);
			}


			setTimeout(function (){
				console.log("Closing connection");
				sm.close();
			}, 5000);
		} catch (e) {
			console.error(e);
			return e;
		}
		return undefined;
	}
}