class ViewerApp extends StatcastrGenericApp{
	constructor(rootEl) {
		super(rootEl);
	}

	/**
	 * Invoked from the Loader embedded into the page.
	 * Starts the entire app.
	 */
	start(eventId, view){
		var t = this;
		t.mgr = new SynchronizrManager();
		if(eventId)
			t.mgr.setEvent(eventId);
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
			t.onViewSelected("scoreboard");

		t.applyPreferences();
		t.startTickTimer();
		t.syn.connect();
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
		if(this.model)
			this.model.tick(dtime);
		if(this.view)
			this.view.tick(dtime);
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
	}

	createAndLoadView(viewId){
		var t = this;
		if(t.view) // Remove existing view from the screen
			t.view.delete();

		switch(viewId){
			case "events":
				t.view = new EventListView(this);
				break;
			case "scoreboard":
				t.view = new ScoreboardView(this);
				break;
			case "teamStats":
				break;
			case "opponentStats":
				break;
			case "plays":
				break;
			case "help":
				break;
			case "admin":
				alert("Go away Brett");
				break;
		}
		t.viewContainer.appendChild(t.view);
	}

	_synReceive(data) { // After Synchronizr data received
		console.log("ViewerApp SynchronizrReceive", data);
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
			case 230: // Admin joined
				break;
			case 229: // Admin left
				break;
			case 228: // Admin lost connection
				break;

		}
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
		d.appendChild(new ImageField("../ico/favicon-192.png").setStyle("height", "5em"));
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

	showCredentialsDialog(){
		var t = this;
		var d = new Dialog("Credentials");
		var prefs = new PreferencesField(t.credentials);
		d.appendChild(prefs);
		var submitBtn = new ButtonField("Submit");
		submitBtn.addClickListener(function () {
			if (!prefs.isValid()) {
				new Toast("Invalid values");
				return;
			}
			d.close();
			t.credentials.setFrom(prefs.getState());
			t.credentials.save();
			new Toast("Credentials saved");
		});
		d.appendChild(submitBtn);
		d.show();
	}
}