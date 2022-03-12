class ViewerApp extends StatcastrGenericApp{
	constructor(rootEl, overrideServer) {
		super(rootEl, overrideServer);
	}

	/**
	 * Invoked from the Loader embedded into the page.
	 * Starts the entire app.
	 */
	start(eventId, view){
		var t = this;
		t.syn.setTX(false);
		if(eventId)
			t.syn.setEvent(eventId);
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
		if(!eventId)
			t.onViewSelected("events");
		else if(view)
			t.onViewSelected(view)
		else
			t.onViewSelected(t.preferences.defaultView);

		t.applyPreferences();
		t.startTickTimer();
		// Credential will need to be re-enabled if I ever support locked events
		// t.syn.setCredentials(t.credentials.username, t.credentials.password);
		// (The above line is also needed for setEvent as well)
		t.syn.connect();
	}

	/**
	 * Set the event that the viewer is looking at
	 * @param id ID of new event
	 * @param changeURL True to change the ?event= param in the URL
	 */
	setEvent(id, changeURL){
		var t = this;
		if(changeURL)
			U.modifyURL("event", id);
		t.syn.setEvent(id);
		t.syn.connect(false);
		t.syn.send();
		t.onViewSelected(t.preferences.defaultView);
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

	applyPreferences(){
		console.warn("TODO apply preferences");
	}

	onViewSelected(e) {
		var t = this;
		if(e === "help"){
			t.showHelpDialog();
			return;
		}
		t.viewSelector.setSelectedClick(e);
		t.createAndLoadView(e);
		if(e !== "help" && e !== "events") {
			t.preferences.defaultView = e;
			t.preferences.save();
		}
	}

	/**
	 * Internal callback for when SynchronizrManager receives
	 * @param syn Synchronizr object
	 * @param chgs Changes array from Synchronizr
	 * @param newStatus New Synchronizr status
	 * @private
	 */
	_synReceive(syn, chgs, newStatus) { // After Synchronizr data received
		var t = this;
		if(newStatus) {
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
					console.warn("ViewerApp Not reconnecting the SynchronizrManager due to fatal error");
				}
			}
			if(newStatus === ReliableChannel.STATUS_CONNECTED){
				clearTimeout(t.reconnTimeout);
				t.connFail = false;
				new Toast("Connected to " + t.syn.getServer());
			}
		}

		if(chgs) {
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
					t.view.updateEventList(SynchronizrUtils.parseEventQueryResponse(data.data));
				break;
			case 230: // Admin joined
				break;
			case 229: // Admin left
				break;
			case 228: // Admin lost connection
				break;

		}
	}

	_synError(errNum, errCode, errAdvice, errFix) {
		var t = this;
	}

	showHelpDialog(){
		var t = this;
		var d = new Dialog("Help");
		d.appendChild(new TextField("Select \"Events\" From the top menu to select a feed to watch." +
			"<br/>To view the feed in different ways, select one of the tabs at the top.", true)
			.setStyle("whiteSpace", "initial"));
		var aboutBtn = new ButtonField("About Statcastr");
		aboutBtn.addClickListener(function () {
			d.close();
			t.showAboutDialog();
		});
		var prefsBtn = new ButtonField("Preferences");
		prefsBtn.addClickListener(function () {
			d.close();
			t.showPreferencesDialog();
		});
		var btns = new UIPanel();
		btns.appendChild(aboutBtn);
		btns.appendChild(prefsBtn);
		d.appendChild(new UIPanel().setStyle("height", "3em"));
		d.appendChild(btns);
		d.show();
	}

	showAboutDialog(){
		var d = new Dialog("About Statcastr");
		d.appendChild(new ImageField("../resources/ico/favicon-192.png").setStyle("height", "5em"));
		d.appendChild(new TextField("Statcastr version " + AppInfo.VERSION + "<br/>" + AppInfo.COPYRIGHT +
			"<br/>", true).setStyle("whiteSpace", "initial"));
		d.show();
	}

	showPreferencesDialog(){
		var t = this;
		var d = new Dialog("Preferences");
		var prefs = new PreferencesField(t.preferences, t.preferences.renameFn);
		d.appendChild(prefs);
		var credsBtn = new ButtonField("Credentials");
		credsBtn.addClickListener(function(){
			d.close();
			t.showCredentialsDialog();
		})
		var submitBtn = new ButtonField("Submit");
		submitBtn.addClickListener(function () {
			if (!prefs.isValid()) {
				new Toast("Invalid values");
				return;
			}
			d.close();
			t.preferences.setFrom(prefs.getState());
			t.preferences.save();
			t.applyPreferences();
			new Toast("Preferences saved");
		});
		var btm = new UIPanel();
		btm.appendChild(submitBtn);
		btm.appendChild(credsBtn);
		d.appendChild(btm);
		d.show();
	}

	// showCredentialsDialog(){ // TODO XXX moved to StatcastrGenericApp
	// 	var t = this;
	// 	var d = new Dialog("Credentials");
	// 	var prefs = new PreferencesField(t.credentials);
	// 	d.appendChild(prefs);
	// 	var submitBtn = new ButtonField("Submit");
	// 	submitBtn.addClickListener(function () {
	// 		if (!prefs.isValid()) {
	// 			new Toast("Invalid values");
	// 			return;
	// 		}
	// 		d.close();
	// 		t.credentials.setFrom(prefs.getState());
	// 		t.credentials.save();
	// 		new Toast("Credentials saved");
	// 	});
	// 	d.appendChild(submitBtn);
	// 	d.show();
	// }
}