class AdminApp extends StatcastrGenericApp{
	constructor(rootEl, overrideServer) {
		super(rootEl, overrideServer);
		this.isAdmin = true;
	}

	/**
	 * Invoked from the Loader embedded into the page.
	 * Starts the entire app.
	 */
	start(eventId, view){
		var t = this;
		t.syn.setTX(true);

		var vs = t.viewSelector;
		vs.addTab("<u>E</u>VENTS", "events");
		vs.addTab("<u>S</u>COREBOARD", "scoreboard");
		// vs.addTab("SPLIT&nbsp;<u>B</u>OX", "splitBox");
		vs.addTab("<u>T</u>EAM STATS", "teamStats");
		vs.addTab("<u>O</u>PPONENT STATS", "opponentStats");
		vs.addTab("<u>P</u>LAYS", "plays");
		// vs.addTab("S<u>C</u>ORING", "scoring");
		// vs.addTab("SHOOTIN<u>G</u>", "shooting");
		vs.addTab("<u>H</u>ELP", "help", true);
		vs.addTab("<u>A</u>DMIN", "admin");
		if(!eventId)
			t.onViewSelected("events");
		else if(view)
			t.onViewSelected(view)
		else
			t.onViewSelected("admin");

		t.applyPreferences();
		t.startTickTimer();
		t.syn.setCredentials(t.credentials.username, t.credentials.password);
		t.syn.tryLoad();
		t.syn.connect(true);
		t.onResize();

		if(eventId)
			t.setEvent(eventId, false);
	}

	/**
	 * Called from elsewhere (typically the event selector).
	 * Sets the event and credentials, loads from LocalStorage if present, and connects to the server.
	 * Also sets the view to "admin" so the user can begin running the game
	 * @param id ID of event
	 * @param changeURL If true, change the URL of the page
	 */
	setEvent(id, changeURL) {
		var t = this;
		if(changeURL)
			U.modifyURL("event", id);
		t.syn.setEvent(id);
		t.syn.setCredentials(t.credentials.username, t.credentials.password);
		t.syn.tryLoad();
		t.syn.connect(false);
		t.syn.send();
		t.onViewSelected("admin");
	}

	startTickTimer(){
		var t = this;
		t._now = Date.now();
		setInterval(function(){
			var dtime = Date.now() - t._now;
			t._now += dtime;
			t.tick(dtime);
		}, 100);
	}

	tick(dtime){
		var t = this;
		var mTick = false; // Did anything change?
		if(t.model)
			mTick = t.model.tick(dtime);
		if(t.view)
			t.view.tick(dtime);

		if(mTick){
			t.view.update();
			t.header.setStateFromModel(t.model);
			t.header.update();
		}
	}

	onGesture(e){
		console.log(e);
		var t = this;
		if(!Dialog.isOpen() && t.view.onGesture){
			t.view.onGesture(e);
		}
	}

	onViewSelected(e) {
		var t = this;
		if(e === "help"){
			t.showHelpDialog();
			return;
		}
		t.viewSelector.setSelectedClick(e);
		t.createAndLoadView(e);
		if(e !== "help" && e !== "admin" && e !== "events"){
			t.preferences.defaultView = e;
			t.preferences.save();
		}
	}


	/**
	 * Internal callback for when SynchronizrManager receives
	 * @param syn Synchronizr object
	 * @param chgs Changes array from Snychronizr
	 * @param newStatus New Synchronizr status
	 * @private
	 */
	_synReceive(syn, chgs, newStatus) { // After Synchronizr data received
		var t = this;
		if(newStatus) {
			console.log("AdminApp SynchronizrReceive-newStatus", newStatus);
			if(newStatus === ReliableChannel.STATUS_LOST){
				if(!t.connFail)
					new Toast("Connection Lost");
				t.connFail = true;
				// If there is a fatal error in the synchronizr, don't try and reconnect.
				if(!t.syn.hasFatalError()){
					t.reconnTimeout = setTimeout(function(){
						t.syn.connect();
					}, 3000);
				} else {
					console.warn("AdminApp Not reconnecting the SynchronizrManager due to fatal error");
				}
			}
			if(newStatus === ReliableChannel.STATUS_CONNECTED){
				clearTimeout(t.reconnTimeout);
				t.connFail = false;
				new Toast("Connected to " + t.syn.getServer());
			}
		}
		if(chgs) {
			console.log("AdminApp SynchronizrReceive", chgs);
			t.model.updateFromSynchronizr(t.syn, chgs);
			t.view.update();
			t.header.setStateFromModel(t.model);
			t.header.update();
		}
	}

	_synInfo(data) { // After SynchronizrManager data received
		var t = this;
		switch(data.type){
			case 239: // Verify hash response
				// TODO reply if necessary
				break;
			case 234: // Query event response
				// TODO reply if necessary
			case 233: // Query All Events response
				if(t.view.updateEventList)
					t.view.updateEventList(data.data);
				break;
		}
	}

}