class TestMockGame extends UnitTest {
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

			var gameInfo = new Uint8Array([0, 1])
			sm.setData(0, 0, this.str2arr("bbgame"), sm.MODE_WRITE); // Game Type
			sm.setData(0, 0, gameInfo, sm.MODE_WRITE); // Game Info

			sm.setData(1, 0, this.str2arr("foo"), sm.MODE_APPEND);
			sm.setData(1, 0, null, sm.MODE_DELETE);

			sm.setData(2, 0, this.str2arr("fbgame"), sm.MODE_APPEND);
			sm.setData(2, 0, this.str2arr("2.0.0"), sm.MODE_APPEND);
			sm.setData(2, 0, this.str2arr("GET BUG SPRAYED %s %s %s %s %s"), sm.MODE_APPEND);

			sm.send();

			sm.verifyHash();

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