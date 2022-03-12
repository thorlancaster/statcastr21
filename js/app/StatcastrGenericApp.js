// Superclass of Fan and Admin apps
class StatcastrGenericApp {
	/**
	 * Create a new StatcastrGenericApp
	 * @param rootEl AppRoot to generate the HTML in
	 * @param overrideServer Optional. Overides the default stat server from utils
	 */
	constructor(rootEl, overrideServer) {
		var t = this;
		// GUI / HTML / CSS stuff
		t.rootEl = rootEl; // Root element that the app will occupy
		t.isMobile = U.isMobile(); // Mobile / Desktop device detection
		if(t.isMobile){
			t.rootEl.classList.add("mobile");
		}
		t.rootEl.classList.add("appRoot");
		t.viewSelector = t.createViewSelector(); // Tabs at the top of the main window
		t.view = null; // Set by subclass
		t.header = new ScoreDisplayHeader();
		t.rootEl.appendChild(t.viewSelector.getElement());
		var vc = new UIPanel().setStyle("flexDirection", "column");
		vc.appendChild(t.header);
		t.viewContainer = vc;
		vc.addClass("viewContainer");
		t.rootEl.appendChild(vc.getElement());
		var tm = new TouchManager(rootEl);
		t.touchManager = tm;
		tm.addGestureListener(t.onGesture.bind(t));
		tm.start();
		// GUI code for Coocentfull reconnect button
		var rcb = new ButtonField("Reconnect").setStyles("bottom", "right", "0.5em")
			.setStyle("position", "absolute").setStyle("fontSize", "1.5em")
		rcb.btn.classList.add("kxAlert");

		rcb.addClickListener(function(){
			t.syn.connect();
			rcb.setStyle("display", "none");
		})
		t.btnKxReconnect = rcb;
		t.rootEl.appendChild(t.btnKxReconnect.element);

		window.addEventListener("resize", t.onResize.bind(t));
		window.addEventListener("keydown", t.onKey.bind(t));
		window.addEventListener("keyup", t.onKey.bind(t));

		t.jsStyle = [{"numberField": {"litColor": "#F81"}}, {
			"scoreboardHomeScore": {"litColor": "#F01"},
			"scoreboardGuestScore": {"litColor": "#F01"},
			"scoreboardPFPPlayerNum": {"litColor": "#F01"},
			"scoreboardHomeFouls": {"litColor": "#F01"},
			"scoreboardGuestFouls": {"litColor": "#F01"},
			"scoreboardClock": {"litColor": "#FD0"},
			"scoreboardPeriod": {"litColor": "#FD0"}
		}];
		t.header.applyStyle(t.jsStyle);

		// Load saved data / preferences to start
		t.preferences = new MainPreferencesClass("Statcastr");
		t.credentials = new CredentialsPreferencesClass("Statcastr.credentials");
		t.sessionPrefs = new SessionPreferences();
		t.preferences.load();
		t.credentials.load();
		t.isAdmin = false;

		// Child classes for MVC
		t.syn = new SynchronizrManager("Statcastr2");
		window.SYN = t.syn;
		t.syn.setReceiveHandler(
			function(a, b, c){
				t._synReceive(a, b, c);
				t._synReceiveForReconnBtn(a, b, c);
				t._synReceiveForPlugins(a, b, c);
			}
		);
		t.syn.setInfoHandler(t._synInfo.bind(t));
		t.syn.setErrorHandler(t._synError.bind(t));
		t.syn.setServer(overrideServer ? overrideServer : U.DEFAULT_SERVER);
		t.model = undefined; // This gets created when the server responds with game type
		t.model = new BasketballGameModel(); // TODO create this model when Synchronizr starts (when we do multi-sport)

		// Initialize plugins
		t.spiritSquad = new SpiritSquad(this);
		t.spiritSquad.test();
	}

	setEvent(id){
		console.warn("Need to subclass setEvent()")
	}

	getStyle() {
		return this.jsStyle;
	}

	_synReceive() {
		console.warn("Need to subclass _synReceive()")
	}

	_synReceiveForReconnBtn(){
		if(this.syn.getStatus() < 0){ // If the connection dies, show the button
			this.btnKxReconnect.setStyle("display", "");
		} else {
			this.btnKxReconnect.setStyle("display", "none");
		}
	}

	_synReceiveForPlugins(){
		var t = this;
		if(DEBUGGR){
			DEBUGGR.invokeProtected(t.spiritSquad.onNewPlay, t, t.model);
		} else{
			t.spiritSquad.onNewPlay(t.model);
		}
	}

	_synInfo() {
		console.warn("Need to subclass _synInfo()")
	}

	getManager() {
		return this.syn;
	}

	getPrefs(){
		return this.preferences;
	}

	getSessionPrefs() {
		return this.sessionPrefs;
	}

	getModel() {
		return this.model;
	}

	onResize() {
		if (this.view && this.view.resize)
			this.view.resize();
		this.header.resize();
		if (this.view && this.view.resize)
			this.view.resize();
		this.viewSelector.resize();
	}
	onKey(e) {
		if(Dialog.isOpen())
			return;
		if (this.view && this.view.onKey)
			this.view.onKey(e);
	}

	createViewSelector() {
		var t = this;
		var vs = new TabSelector();
		// vs.setMobileMode(t.isMobile); It does this itself
		vs.setAutoSelect(false);
		vs.addClass("mainTabSelector");
		vs.setStyle("flexShrink", "0");
		vs.setStyles("top", "left", "0px");
		vs.addIcon("../resources/ico/favicon-192.png");
		vs.addSelectionListener(t.onViewSelected.bind(t));
		return vs;
	}

	createAndLoadView(viewId){
		var t = this;
		if(t.view) // Remove existing view from the screen
			t.view.delete();

		t.header.hide();
		switch(viewId){
			case "events":
				t.view = new EventListView(t, t.isAdmin, t.isMobile);
				break;
			case "scoreboard":
				t.view = new ScoreboardView(t, t.isMobile);
				break;
			case "teamStats":
				t.view = new TeamStatsView(t, true, t.isMobile);
				t.header.show();
				break;
			case "opponentStats":
				t.view = new TeamStatsView(t, false, t.isMobile);
				t.header.show();
				break;
			case "plays":
				t.view = new PlayByPlayView(t, t.isMobile);
				t.header.show();
				break;
			case "help":
				break;
			case "admin":
				t.view = new AdminView(t, t.isMobile);
				t.header.show();
				break;
		}
		t.viewContainer.appendChild(t.view);
		t.onResize();
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
			if(t.showCredentialsDialog)
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

	_synError(errNum, errCode, errAdvice, errFix) {
		var t = this;
		t.showErrorDialog(errNum, errCode, errAdvice, errFix);
	}
	showErrorDialog(errNum, errCode, errAdvice, errFix){
		var t = this;
		// Don't show full error for just empty creds
		if(t.credentials.username === "" && t.credentials.password === ""){
			t.showCredentialsDialog(true, true);
			return;
		}
		var d = new Dialog("An error occurred");
		d.body.appendChild(new TextField("<strong>" + errCode + "</strong>", true));
		d.body.appendChild(new TextField(errAdvice));
		d.body.appendChild(new TextField("<em>" + errFix + "</em>", true));
		var btnRow = new UIPanel();
		var btnReconnect = new ButtonField("Reconnect");
		var btnCreds = new ButtonField("Credentials...");
		var btnIgnore = new ButtonField("Ignore");
		btnReconnect.addClickListener(function(){
			t.syn.connect();
			d.close();
		})
		btnCreds.addClickListener(function(){
			t.showCredentialsDialog(true, false);
			d.close();
		})
		btnIgnore.addClickListener(function(){
			d.close();
		})
		btnRow.appendChild(btnReconnect);
		btnRow.appendChild(btnCreds);
		btnRow.appendChild(btnIgnore);
		d.body.appendChild(new UIPanel().setStyle("height", "1em"));
		d.body.appendChild(btnRow);
		d.show();
	}

	showCredentialsDialog(reconnOnSubmit, hideX){
		var t = this;
		var d = new Dialog("Credentials");
		var prefs = new PreferencesField(t.credentials);
		d.appendChild(prefs);
		if(hideX)
			d.setCloseEnabled(false);
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
			if(reconnOnSubmit){
				t.syn.connect();
			}
		});
		d.appendChild(submitBtn);
		d.show();
	}


	applyPreferences(){
		// TODO apply preferences
		console.warn("TODO apply preferences");
	}

	onGesture(e) {
		// console.warn("Subclass should override onGesture"); This is optional
	}

	onViewSelected(e) {
		console.warn("Subclass should override onViewSelected");
	}
}