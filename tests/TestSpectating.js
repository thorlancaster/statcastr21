class TestSpectating extends UnitTest {
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
			sm.setTX(false);
			// sm.setCredentials(U.TESTING_USERNAME, U.TESTING_PASSWORD);
			sm.setEvent("fmlbbtest2101");
			sm.setReceiveHandler(this.spectatorCb.bind(this));
			sm.connect();
		} catch (e) {
			console.error(e);
			return e;
		}
		return undefined;
	}

	spectatorCb(syn, chgs){
		console.log("Changes: " + chgs);
		syn.printState();
		console.log();
	}
}