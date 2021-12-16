class StatcastrGenericApp {
	constructor(rootEl) {
		var t = this;
		// GUI / HTML / CSS stuff
		t.rootEl = rootEl; // Root element that the app will occupy
		t.rootEl.classList.add("appRoot");
		t.viewSelector = t.createViewSelector(); // Tabs at the top of the main window
		t.rootEl.appendChild(t.viewSelector.getElement());
		var vc = new UIPanel();
		t.viewContainer = vc;
		vc.addClass("viewContainer");
		t.rootEl.appendChild(vc.getElement());
		var tm = new TouchManager(rootEl);
		t.touchManager = tm;
		tm.addGestureListener(t.onGesture.bind(t));
		tm.start();

		// Load saved data / preferences to start
		t.preferences = new MainPreferencesClass("Statcastr");
		t.credentials = new CredentialsPreferencesClass("Statcastr.credentials");
		t.preferences.load();
		t.credentials.load();

		// Child classes for MVC
		t.syn = new SynchronizrManager();
		t.syn.setReceiveHandler(t._synReceive.bind(t));
		t.syn.setInfoHandler(t._synInfo.bind(t));
		t.syn.setServer("wss://localhost:7203");
		t.model = undefined; // This gets created when the server responds with game type
	}

	_synReceive() {
		console.warn("Need to subclass _synReceive()")
	}
	_synInfo() {
		console.warn("Need to subclass _synInfo()")
	}

	getManager() {
		return this.syn;
	}

	createViewSelector() {
		var vs = new TabSelector();
		var t = this;
		vs.setAutoSelect(false);
		vs.addClass("mainTabSelector");
		vs.setStyle("flexShrink", "0");
		vs.setStyles("top", "left", "0px");
		vs.addIcon("../ico/favicon-192.png");
		vs.addSelectionListener(t.onViewSelected.bind(t));
		return vs;
	}

	onGesture(e) {
		console.warn("Subclass should override onGesture");
	}

	onViewSelected(e) {
		console.warn("Subclass should override onViewSelected");
	}
}