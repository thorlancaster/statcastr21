class AdminView extends View {
	constructor(app, isMobile) {
		super(app);
		var t = this;
		t.widget = new AdminWidget(app, isMobile);
		t.appendChild(t.widget);
		t.widget.update();
	}
	onKey(e){
		var t = this;
		if(e.type === "keydown")
			t.widget.onKey(e.key.toLowerCase(), true);
		if(e.type === "keyup")
			t.widget.onKey(e.key.toLowerCase(), false);
	}
	update(){
		this.widget.update();
	}
	tick(){
		this.widget.tick();
	}
	onGesture(e){
		this.widget.onGesture(e);
	}
}


class AdminWidget extends UIPanel {
	constructor(app, isMobile) {
		super();
		console.log("Admin: Mobile: " + isMobile);
		var t = this;
		t.ROSTER_NAMESPACE = "Statcastr.roster" + ".";
		t.SPACER_SZ = "0.3em";
		t.VIBE_SUCCESS = [400];
		t.VIBE_BTN_HOLD = [60];
		t.VIBE_FAILURE = [150, 100, 150, 100, 150];
		t.VIBE_CANCEL = [70, 60, 70];
		t.VIBE_CLOCK_START = [30, 100, 30, 70, 30, 65, 30, 45, 30, 30, 20, 20, 10, 10];
		t.VIBE_CLOCK_STOP = [10, 10, 20, 20, 30, 30, 30, 45, 30, 60, 30, 80, 30, 120, 20];
		t.model = app.getModel();
		t.app = app;
		t.addClass("adminWidget");
		t.setStyle("flexDirection", "column");
		t.setStyle("fontSize", "1.3em");
		t.element.style.setProperty("--btnh", "2.2em");
		// PDT - PBP display table for viewing recent plays
		t.pdt = new TableField(["Time", "Score", "Play"]);
		t.appendChild(t.pdt);
		// Top panel - contains miscellaneous buttons
		t.topPanel = new UIPanel();
		t.appendChild(t.topPanel);
		t.topPanel.setStyle("transition", "background 0.15s");
		t.gameRosBtn = new ButtonField("Rosters");
		t.gameRosBtn.addClickListener(t.onGameRosBtn.bind(t));
		t.topPanel.appendChild(t.gameRosBtn);
		t.gameEditBtn = new ButtonField("Edit");
		t.gameEditBtn.addClickListener(t.onGameEditBtn.bind(t));
		t.topPanel.appendChild(t.gameEditBtn);
		t.switchTeamBtn = new ButtonField("Switch");
		t.switchTeamBtn.setButtonStyle("background", "#00000030");
		t.switchTeamBtn.addClickListener(t.onSwitchTeam.bind(t));
		t.topPanel.appendChild(t.switchTeamBtn);
		t.topPanel.appendChild(new UIPanel().setStyle("width", t.SPACER_SZ)
			.setStyle("background", "var(--main-bg2").setElasticity(0));
		t.synStatus = new ProgressBarField("Conn Status");
		t.synStatus.setColors("#271", "#710");
		t.synStatus.setStyle("flexGrow", "0")
			.setStyle("width", "7em");
		t.synStatus.setProgress(50);
		t.topPanel.appendChild(t.synStatus);
		// Spacer1
		t.spacer1 = new UIPanel().setStyle("background", "var(--main-bg2)")
			.setStyle("height", t.SPACER_SZ).setElasticity(0);
		t.appendChild(t.spacer1);
		t.actionBtns = []; // Array with all the action buttons in it
		var ab = t.actionBtns;
		ab.push(t.gameRosBtn, t.gameEditBtn, t.switchTeamBtn);

		// Player selection buttons. Kept out of the way of drunken fingers
		t.playerSelLbNum = new UIPanel().setStyle("flexDirection", "row").setStyle("fontSize", "1.2em");
		// Two TextFields for current play and #
		t.playReplacementLbl = new TextField("").setStyle("fontSize", "1.2em");
		// TextField to describe play that's going to be replaced
		t.playerSelLbl = new TextField("").setStyle("width", "100%");
		t.playerSelNum = new TextField("").setStyle("marginRight", "0.5em");
		t.playerSel = new PlayerSelectionWidget(7, 5, "var(--btnh)");
		t.playerSel.setOnSelection(t.onPSWSelect.bind(t));
		t.playerSel.setOnSelectionMulti(t.onPSWSelectMulti.bind(t));
		t.playerSelLbNum.appendChild(t.playerSelLbl);
		t.playerSelLbNum.appendChild(t.playerSelNum);
		t.appendChild(t.playReplacementLbl);
		t.appendChild(t.playerSelLbNum);
		t.appendChild(t.playerSel);

		// Play Selection Panel - Select play or Foul
		t.playSel = new UIPanel();
		t.p1Btn = t.createBtn(1); t.playSel.appendChild(t.p1Btn);
		t.p2Btn = t.createBtn(2); t.playSel.appendChild(t.p2Btn);
		t.p3Btn = t.createBtn(3); t.playSel.appendChild(t.p3Btn);
		t.pfBtn = t.createBtn('F'); t.playSel.appendChild(t.pfBtn);
		t.subBtn = t.createBtn('SU<u>B</u>', true);
		t.playSel.appendChild(t.subBtn);
		t.appendChild(t.playSel);
		// Action Selection Panel - Select Other action
		t.actSel = new UIPanel();
		t.rbBtn = t.createBtn('RB'); t.actSel.appendChild(t.rbBtn);
		t.stlBtn = t.createBtn('ST'); t.actSel.appendChild(t.stlBtn);
		t.toBtn = t.createBtn('TO<u>V</u>', true); t.actSel.appendChild(t.toBtn);
		t.chBtn = t.createBtn('C<u>H</u>ARGE', true).setFontSize("0.8em");
		t.actSel.appendChild(t.chBtn);
		t.ckBtn = t.createBtn('CLOCK').setFontSize("0.8em");
		t.actSel.appendChild(t.ckBtn);
		t.appendChild(t.actSel);
		// Action Selection panel 2 - Select other action or game management
		t.actSel2 = new UIPanel();
		t.delBtn = t.createBtn("DEL"); t.actSel2.appendChild(t.delBtn);
		t.repBtn = t.createBtn("REP"); t.actSel2.appendChild(t.repBtn);
		t.xxBtn2 = t.createBtn("--"); t.actSel2.appendChild(t.xxBtn2);
		t.xxBtn3 = t.createBtn("--"); t.actSel2.appendChild(t.xxBtn3);
		t.xxBtn4 = t.createBtn("LOG OUT").setFontSize("0.8em"); t.actSel2.appendChild(t.xxBtn4);
		t.xxBtn4.addClickListener(function () { new Toast("Hold to log out"); });
		t.xxBtn4.addLongClickListener(function () {
			t.vibrate(t.VIBE_BTN_HOLD);
			t.logout();
		});
		ab.push(t.p1Btn, t.p2Btn, t.p3Btn, t.pfBtn, t.subBtn);
		ab.push(t.rbBtn, t.stlBtn, t.toBtn, t.chBtn, t.ckBtn);
		ab.push(t.delBtn, t.repBtn, t.xxBtn2, t.xxBtn3, t.xxBtn4);

		t.appendChild(t.actSel2);

		t.p1Btn.addClickListener(function () { t.onPlayX(1); });
		t.p2Btn.addClickListener(function () { t.onPlayX(2); });
		t.p3Btn.addClickListener(function () { t.onPlayX(3); });
		t.pfBtn.addClickListener(function () { t.onPlayX('foul'); });
		t.ckBtn.addClickListener(t.onClockX.bind(t));
		t.ckBtn.addLongClickListener(function () {
			t.onClockXLong();
			t.vibrate(t.VIBE_BTN_HOLD);
		});
		t.ckBtn.setAdjustDivider(2);
		t.ckBtn.addAdjustListener(t.onClockNudgeX.bind(t));

		t.rbBtn.addClickListener(function () { t.onPlayX('rebound'); });
		t.stlBtn.addClickListener(function () { t.onPlayX('steal'); });
		t.toBtn.addClickListener(function () { t.onPlayX('turnover'); });
		t.chBtn.addClickListener(function () { t.onPlayX('charge'); });
		t.subBtn.addClickListener(t.onSubX.bind(t));

		t.delBtn.addClickListener(t.onDelX.bind(t));
		t.repBtn.addClickListener(t.onReplaceX.bind(t));

		t.setEntryBusy(false);
	}

	addPlayToGame(play){
		console.log("addPlayToGame", play);
		var syn = this.app.getManager();
		// Add the play that just occurred
		syn.setData(4, 0, play.toByteArray(), syn.MODE_APPEND);
		// Update the instant clock so the clock doesn't jump around
		syn.setData(3, 0, this.model.clock.toByteArray(), syn.MODE_WRITE);
		syn.updateLocal();
		syn.save();
		syn.send();
	}
	removePlayFromGame(){
		console.log("removePlayFromGame");
		var syn = this.app.getManager();
		// Remove the last play
		syn.setData(4, -1, null, syn.MODE_DELETE);
		// Update the instant clock so the clock doesn't jump around
		syn.setData(3, 0, this.model.clock.toByteArray(), syn.MODE_WRITE);
		syn.updateLocal();
		syn.save();
		syn.send();
	}
	setClockOfGame(clock){
		console.log("setClockOfGame", clock);
		var syn = this.app.getManager();
		syn.setData(3, 0, clock.toByteArray(), syn.MODE_WRITE);
		syn.updateLocal();
		syn.save();
		syn.send();
	}

	tick(){
		var st = this.synStatus;
		var ss = this.app.getManager().getStatus();
		if(ss === -1){
			st.setText("Disconnected");
			st.setProgress(0);
		} else {
			if(ss === 0) {
				st.setText("Connected");
				st.setProgress(100);
			}
			else {
				st.setText(ss);
				st.setProgress(100 / ((ss * 0.01) + 1));
			}
		}
	}

	/**
	 * Roster save function. Checks table or saves table to synchronizr.
	 * If pbp is specified, a check is performed. Otherwise, rosters are written
	 * If check fails, returns a String. Otherwise, returns false.
	 * @param {EditableTableField} tbl
	 * @param {Boolean} isTeam Which team is being validated, used for PBP foreign key validation
	 * @param {Object} pbp Play-by-Play of game, used for foreign key validation
	 */
	addRosterToGame(tbl, isTeam, pbp){
		console.log("addRosterToGame", isTeam, tbl, pbp);
		var t = this;
		var syn = t.app.getManager();
		var subNum = isTeam ? 1 : 2; // SubArray number for roster, see LAYOUT.txt
		var rosters = t.getRostersFromTable(tbl);
		var ids = [];
		for(var x in rosters)
			ids.push(rosters[x].nbr);
		if (typeof rosters === "string") {
			return rosters;
		}
		if (pbp) {
			for (var x = 0; x < pbp.plays.length; x++) {
				var p = pbp.plays[x];
				if (isTeam != null && p.team === isTeam && !ids.includes(p.pid)) {
					return "Cannot remove player #" + p.pid + " that has plays";
				}
			}
		}
		else{
			syn.setData(subNum, 0, null, syn.MODE_CLEAR);
			for(var x in rosters){
				var ply = rosters[x];
				var bc = (ply.sta ? "s" : "") + ply.nbr + " " + ply.nam;
				syn.setData(subNum, 0, bc, syn.MODE_APPEND);
			}
			syn.updateLocal();
			syn.save();
			syn.send();
		}
	}

	/**
	 * Game data save function.
	 * Sets the game data (eventInfo in LAYOUT.txt) in the synchronizr data
	 * @param data Game data object
	 */
	addDataToGame(data){
		console.log("addDataToGame", data);
		var buf = [];
		SynchronizrUtils.pushString(buf, data.hTown);
		SynchronizrUtils.pushString(buf, data.hName);
		SynchronizrUtils.pushString(buf, data.hAbbr);
		SynchronizrUtils.pushString(buf, data.hImg);

		SynchronizrUtils.pushString(buf, data.gTown);
		SynchronizrUtils.pushString(buf, data.gName);
		SynchronizrUtils.pushString(buf, data.gAbbr);
		SynchronizrUtils.pushString(buf, data.gImg);

		SynchronizrUtils.pushString(buf, data.gender);
		SynchronizrUtils.pushString(buf, data.location);
		SynchronizrUtils.pushString(buf, data.startTime);
		SynchronizrUtils.pushString(buf, data.desc);

		var syn = this.app.getManager();
		syn.setData(0, 0, "bbgame", syn.MODE_WRITE);
		syn.setData(0, 1, buf, syn.MODE_WRITE);

		syn.updateLocal();
		syn.save();
		syn.send();
	}

	logout() {
		console.warn("TODO implement log out");
	}

	update() {
		super.update();
		var t = this;
		t.updatePDT();
		t.updateCkBtnSelState();
	}

	updatePDT(){
		var t = this;
		var tmp = t.model.pbp.getPlays(3, null)[0];
		t.pdt.setLength(tmp.length);
		for(var x = 0; x < tmp.length; x++){
			var ply = tmp[x];
			var ifo = t.model.getPBPInfo(ply, 1, true)
			t.pdt.setCell(0, x, ifo.time);
			t.pdt.setCell(1, x, ifo.score);
			t.pdt.setCell(2, x, ifo.play, true);
		}
	}

	vibrate(pattern) {
		window.navigator.vibrate(pattern);
	}

	setEntryBusy(b) {
		var t = this;
		t.entryBusy = b;
		for (var x = 0; x < t.actionBtns.length; x++)
			t.actionBtns[x].setEnabled(!b);
		if (b) {
			t.entryNum1 = null;
			t.entryNum2 = null;
		}
	}

	updateSelTeam() {
		var t = this;
		var bgc = null;
		if (t.selTeam === true) {
			bgc = "var(--team-color1)";
		} else if (t.selTeam === false) {
			bgc = "var(--opp-color1)";
		}
		t.topPanel.setStyle("background", bgc);
	}

	onGesture(obj) {
		// console.log(obj);
		var d = obj.direction;
		var t = this;
		if (obj.fromEnd) // Swiping from top/bottom is for system UI, not this app
			return;
		if (t.entryBusy && obj.touches === 4 && (d.includes("up") || d.includes("down"))) t.onNumberX(5); // 4 dragged = 5
		else if (t.entryBusy && obj.touches === 1 && d.includes("wiggle")) t.onNumberX(0); // 1 wiggled = 0
		else if (d === "") {
			if (t.entryBusy) {
				if ((obj.touches === 2 && obj.taps !== 0)) {
					// Tap number entry
					if (obj.taps <= 5) {
						// console.log("NBR " + obj.taps);
						t.onNumberX(obj.taps);
					}
				}
				else { // Multi-fingered number entry for numbers >= 2
					if (obj.touches <= 5) {
						// console.log("NBR " + obj.touches);
						t.onNumberX(obj.touches);
					}
				}
			} else {
				if (obj.touches === 2 && obj.taps === 0)
					t.onClockX(); // Two finger tap when idle toggles clock
			}
		} else {
			if (!t.entryBusy) { // Not busy entering, swipes act as taps on buttons
				if (d.includes("up")) { // 1, 2, 3, F
					switch (obj.touches) {
						case 1: t.p1Btn.click(); break;
						case 2: t.p2Btn.click(); break;
						case 3: t.p3Btn.click(); break;
						case 4: t.pfBtn.click(); break;
					}
				}
				else if (d.includes("down")) { // RB, ST, TO, CHARGE
					switch (obj.touches) {
						case 1: t.rbBtn.click(); break;
						case 2: t.stlBtn.click(); break;
						case 3: t.toBtn.click(); break;
						case 4: t.chBtn.click(); break;
					}
				} else if (d.includes("left")) {
					t.onSelTeam(false);
				}
				else if (d.includes("right")) {
					t.onSelTeam(true);
				}
			} else { // If busy entering, swipes act as cancel/commit
				if (obj.touches === 1) { // Messy multi-finger taps can be mistakenly counted as swipes
					if (d.includes("down")) {
						t.onExpandAction();
					}
					else if (d.includes("up")) {
						t.onToggleMade();
					}
					else if (d.includes("left")) {// Cancel action
						t.onBackAction();
					} else if (d.includes("right")) { // Commit action
						t.onCommitNewPlay();
					}
				}
			}
		}
	}
	onKey(char, down) {
		var t = this;
		if (down) {
			// console.log(char);
			if (t.entryBusy) {
				switch (char) {
					case '0': case '1': case '2': case '3': case '4': case '5':
						t.onNumberX(parseInt(char)); break;
					case 'tab':
						t.onExpandAction(); break;
					case "enter":
						t.onCommitNewPlay(); break;
					case "escape":
						t.onBackAction(); break;
					case "m":
						t.onToggleMade();
				}
			} else {
				switch (char) {
					case 't': case 'o':
						t.onSelTeam(char === 't'); break;

					case '1': t.p1Btn.click(); break;
					case '2': t.p2Btn.click(); break;
					case '3': t.p3Btn.click(); break;
					case 'f': t.pfBtn.click(); break;
					case 'c': t.ckBtn.click(); break;
					case 'C': t.onClockXLong(); break;

					case 'r': t.rbBtn.click(); break;
					case 's': t.stlBtn.click(); break;
					case 'v': t.toBtn.click(); break;
					case 'h': t.chBtn.click(); break;
					case 'b': t.subBtn.click(); break;
				}
			}
		}
	}

	onPDTClick(rowNum) { // Called when a play in the PBP Display Table is clicked
		// TODO play replacement
	}

	onCommitNewPlay() {
		// Commit new current play to game state.
		// This will also result in the play getting sent down the pipe.
		var t = this;
		var lps = t.lastPlaySelection;
		if (lps === "Sub") {
			if (!t.selPlayers || t.selPlayers.length < 5) {
				new Toast("Not Enough Players");
				t.vibrate(t.VIBE_FAILURE);
				return;
			}
			if (t.selPlayers.length > 5) {
				new Toast("Too Many Players");
				t.vibrate(t.VIBE_FAILURE);
				return;
			}
		} else {
			if (!t.selPlayers || t.selPlayers.length === 0) {
				new Toast("No Players Selected");
				t.vibrate(t.VIBE_FAILURE);
				return;
			}
			else if (t.selPlayers.length > 1) {
				new Toast("Multiple Players Selected");
				t.vibrate(t.VIBE_FAILURE);
				return;
			}
		}
		var playType = null;
		var bpt = BasketballPlayType;
		var made = this.lastPlayMade;
		switch (lps) {
			case "1": playType = made ? bpt.FT_MADE : bpt.FT_MISS; break;
			case "2": playType = made ? bpt.P2_MADE : bpt.P2_MISS; break;
			case "3": playType = made ? bpt.P3_MADE : bpt.P3_MISS; break;
			case "Foul": playType = made ? bpt.FOUL_P : bpt.FOUL_T; break;
			case "Rebound": playType = bpt.REB_UNK; break;
			case "Steal": playType = bpt.STEAL; break;
			case "Turnover": playType = bpt.TURNOVER; break;
			case "Charge": playType = bpt.CHARGE_TAKEN; break;
			case "Sub":
				break;
			default:
				DEBUGGR.assert(false, "lastPlaySelection invalid");
		}
		var clk = t.model.clock;
		if (lps === "Sub") {
			// Calculate pOld and pNew, representing the existing and new onCourt player ids
			var onCourt = t.selTeam ? t.model.team.onCourt() : t.model.opp.onCourt();
			var pOld = [];
			for (var c in onCourt) pOld.push(onCourt[c].id);
			var pNew = t.selPlayers;

			// Calculate plays required to make pOld = pNew
			var subOut = []; // Players to sub out
			var subIn = []; // ... in
			for (var x = 0; x < pOld.length; x++)
				if (!pNew.includes(pOld[x]))
					subOut.push(pOld[x]);
			for (var x = 0; x < pNew.length; x++)
				if (!pOld.includes(pNew[x]))
					subIn.push(pNew[x]);

			if (subIn.length !== subOut.length) { // I can just see a bug coming. This will prevent it from being a game-ender.
				// TODO remove this jank after a couple of games without problems
				console.error("Number of players to sub in does not match number of players to sub out.\n----THIS SHOULD NEVER HAPPEN----");
				new Toast("Internal substitution error");
				throw "SubErr";
			}
			var cpd = clk.period;
			var cms = clk.millisLeft;
			// Submit subs and update PBP after all but last play
			var totLen = Math.max(subIn.length, subOut.length);
			for (var x = 0; x < totLen; x++) {
				var numIn = subIn[Math.min(x, subIn.length - 1)];
				var numOut = subOut[Math.min(x, subOut.length - 1)];
				var pItm = new BasketballPBPItem(t.entryPd, t.entryMs, numIn, t.selTeam, bpt.SUB, numOut);
				if (x > 0) pItm.setLinked(true);
				t.addPlayToGame(pItm);
			}
			clk.period = cpd;
			clk.millisLeft = cms;
			new Toast("Subs Submitted");
		}
		else {
			var sub = false;
			var plyr = t.selPlayers[0];
			var team = t.selTeam ? t.model.team : t.model.opp;
			if (!team.onCourtIds().includes(plyr)) {
				sub = true;
				var numOut = team.getLeastActive(t.model.pbp.plays, t.selTeam).id;
				var subPlay = new BasketballPBPItem(t.entryPd, t.entryMs, plyr, t.selTeam, bpt.SUB, numOut);
				t.addPlayToGame(subPlay);
			}
			var play = new BasketballPBPItem(t.entryPd, t.entryMs, plyr, t.selTeam, playType);
			if (sub)
				play.setLinked(true);
			t.addPlayToGame(play);
			new Toast("Submitted: " + BasketballPlayType.toLongStr(playType) + " " + plyr + (sub ? " [SUB REQUIRED]" : ""));
		}

		t.vibrate(t.VIBE_SUCCESS);
		t.clearAction();
	}
	onExpandAction() {
		var t = this;
		var plyrs = t.selTeam ? t.model.team.players : t.model.opp.players;
		var color = t.selTeam ? "var(--team-color1)" : "var(--opp-color1)";
		t.setPlayerEntry(plyrs, color, true, false);
		t.selPlayers = t.playerSel.setFilter(t.entryNum2, t.entryNum1);
	}
	onBackAction() {
		this.clearAction();
		this.vibrate(this.VIBE_CANCEL);
	}
	clearAction() {
		var t = this;
		t.setEntryBusy(false);
		t.selPlayers = null;
		t.setPlayerEntry(null);
		t.playerSelLbl.setText("");
		t.playerSelNum.setText("");
		t.playReplacementLbl.setText("");
		t.playToReplace = null;
	}
	onPSWSelect(num2, num1) {
		// Called when a player selection button is pressed
		this.onNumberX(num2);
		this.onNumberX(num1);
	}
	onPSWSelectMulti(plyrs) {
		this.selPlayers = plyrs;
	}
	onDelX() { // Called when delete button is pressed
		var t = this;
		var m = t.model;
		var d = new ConfirmationDialog("Delete last play?", function () {
			d.remove();
			t.removePlayFromGame(true);
			new Toast("Last play deleted");
			t.vibrate(t.VIBE_SUCCESS);
		});
		// TODO use preferences to set second argument to playersAreColored
		var pbpInfo = m.getPBPInfo(m.pbp.plays[m.pbp.plays.length - 1], 2, true);
		while (pbpInfo) {
			d.body.prependChild(new TextField(pbpInfo.time + "&emsp;" + pbpInfo.play, true));
			pbpInfo = pbpInfo.linked;
		}
		d.show();
	}
	onReplaceX() { // Called when replace button is pressed

	}
	onNumberX(num) {
		// Called when a number gesture happens
		var t = this;
		if (!t.entryBusy)
			return;
		if (!t.playerSel.isMulti()) {
			t.entryNum2 = t.entryNum1;
			t.entryNum1 = num;
			t.playerSelNum.setText((t.entryNum2 == null ? "_" : t.entryNum2) + "" + t.entryNum1);
			t.selPlayers = t.playerSel.setFilter(t.entryNum2, t.entryNum1);
		}
	}
	onPlayX(sc) {
		// Called when a play selection button is pressed or gestured
		var t = this;
		if (t.selTeam == null) {
			t.vibrate(t.VIBE_FAILURE);
			return;
		}
		var lps = null; // Last Play Type
		var lpm = null; // Last play made?
		switch (sc) {
			case 1: lps = "1"; lpm = true; break;
			case 2: lps = "2"; lpm = true; break;
			case 3: lps = "3"; lpm = true; break;
			case "foul": lps = "Foul"; lpm = true; break;
			case "rebound": lps = "Rebound"; break;
			case "steal": lps = "Steal"; break;
			case "turnover": lps = "Turnover"; break;
			case "charge": lps = "Charge"; break;
			default: console.warn("Invalid play type for onPlayX: " + sc);
				return;
		}
		var plyrs = t.selTeam ? t.model.team.players : t.model.opp.players;
		var color = t.selTeam ? "var(--team-color1)" : "var(--opp-color1)";
		t.setPlayerEntry(plyrs, color, false, false);
		t.playerSelNum.setText("__");
		t.lastPlaySelection = lps;
		t.lastPlayMade = lpm;
		t.entryPd = t.model.clock.period;
		t.entryMs = t.model.clock.millisLeft;
		t.updatePlayerSelLbl();
		t.setEntryBusy(true);
	}
	updatePlayerSelLbl() {
		var t = this;
		var tdesc = t.selTeam ? t.model.team.abbr : t.model.opp.abbr;
		var lps = t.lastPlaySelection;
		var mm = t.lastPlayMade == null ? '' : t.lastPlayMade ? " made" : " miss";
		if (lps === "Foul") mm = t.lastPlayMade ? '' : " TECH";
		t.playerSelLbl.setHtml('[' + tdesc + ' ' + lps + mm + "]&emsp;Enter Player #");
	}
	onToggleMade() {
		var t = this;
		if (t.lastPlayMade === true || t.lastPlayMade === false) {
			this.lastPlayMade = !this.lastPlayMade;
			new Toast("Made: " + this.lastPlayMade);
			if (t.lastPlayMade)
				t.vibrate(t.VIBE_SUCCESS);
			else
				t.vibrate(t.VIBE_FAILURE);
			t.updatePlayerSelLbl();
		}
	}

	setPlayerEntry(plyrs, c, b, multi, multis) {
		// Set the player entry fields with {players, color, includeBench, allowMulti, existingSelectionForMulti}
		this.playerSel.setPlayers(plyrs, c, b, multi, multis);
	}
	onSubX() {
		// Called when the player substitution button is pressed
		var t = this;
		if (t.selTeam == null) {
			t.vibrate(t.VIBE_FAILURE);
			return;
		}
		var onCourt = t.selTeam ? t.model.team.onCourt() : t.model.opp.onCourt();
		var plyrs = t.selTeam ? t.model.team.players : t.model.opp.players;
		var color = t.selTeam ? "var(--team-color1)" : "var(--opp-color1)";
		var courtArr = [];
		for (var c in onCourt) courtArr[onCourt[c].id] = true;
		t.setPlayerEntry(plyrs, color, true, true, courtArr);
		t.lastPlaySelection = "Sub";
		t.entryPd = t.model.clock.period;
		t.entryMs = t.model.clock.millisLeft;

		var tdesc = t.selTeam ? t.model.team.abbr : t.model.opp.abbr;
		t.playerSelLbl.setHtml('[' + tdesc + "] Substitutions");
		t.setEntryBusy(true);
	}
	onClockX() {
		// Called when the clock toggle button is pressed
		// Starts/Stops the clock
		var t = this, c = t.model.clock;
		c.running = !c.running;
		t.setClockOfGame(c);
		t.updateCkBtnSelState();
		if (c.running)
			t.vibrate(t.VIBE_CLOCK_START);
		else
			t.vibrate(t.VIBE_CLOCK_STOP);
	}
	onClockNudgeX(x, amt, done, diff, dTime) { // Called when the clock toggle button is nudged
		// var t = this, c = t.model.clock;
		// if (done) {
		// 	c.millisLeft = Math.max(0, c.millisLeft + c.nudge);
		// 	c.nudge = 0;
		// 	t.update-All(4);
		// }
		// else {
		// 	var scale = -0.5 * (Math.tanh((dTime - 150) / 100)) + 0.7;
		// 	c.nudge += -200 * diff * scale;
		// 	// TODO scoreboard update calback
		// }
	}
	onClockXLong() {
		// Called when the clock toggle button is held
		// Shows dialog for setting the clock
		var t = this, c = this.model.clock, syn = t.app.getManager();
		t.showSetClockDialog(function (pd, ms, addPlay) {
			c.period = pd;
			c.millisLeft = ms;
			if (addPlay) {
				var pItm = new BasketballPBPItem(pd, ms, 0, null, BasketballPlayType.SET_CLOCK);
				t.addPlayToGame(pItm);
			}
			t.setClockOfGame(c);
		}, c);
	}

	updateCkBtnSelState() {
		this.ckBtn.setSelected(this.model.clock.running);
	}


	showSetClockDialog(callback, clk) {
		var t = this;
		var time = clk.getTime();
		var ms0 = clk.millisLeft;
		console.log(time);
		var tStr = time.minutes + ":" + (time.seconds < 10 ? '0' : '') + (time.seconds + Math.round(time.millis / 100) / 10);
		var d = new Dialog("Set Clock");
		d.body.setStyle("fontSize", "1.3em");
		var pd = new UIPanel();
		pd.appendChild(new TextField("Period").setStyle("width", "40%").setStyle("flexGrow", "0"));
		var f1 = new EditTextField(clk.period, 9);
		pd.appendChild(f1);
		var tm = new UIPanel();
		tm.appendChild(new TextField("Time").setStyle("width", "40%").setStyle("flexGrow", "0"));
		var f2 = new EditTextField(tStr, 9);
		tm.appendChild(f2);
		var chkh = new UIPanel().setStyle("marginTop", "0.5em");
		var chk = new CheckboxField();
		chkh.appendChild(new TextField("Add play"))
		chkh.appendChild(chk);
		var bth = new UIPanel().setStyle("marginTop", "0.5em");
		var btn = new ButtonField("Submit");
		bth.appendChild(btn);
		d.appendChild(pd);
		d.appendChild(tm);
		d.appendChild(chkh);
		d.appendChild(bth);
		btn.addClickListener(function () {
			var pd = parseInt(f1.getText());
			var ms = ms0;
			if (f2.getText() !== tStr)
				ms = t.parseTime(f2.getText());
			if (pd < 0 || pd > 9 || isNaN(ms) || ms < 0) {
				new Toast("Invalid time");
				return;
			}
			callback(pd, ms, chk.getValue());
			d.remove();
		});
		d.show();
	}

	parseTime(str) {
		console.log(str);
		var idx = str.indexOf(':');
		if (idx === -1) return NaN;
		var s1 = str.substring(0, idx);
		var s2 = str.substring(idx + 1);
		return Math.round(1000 * (parseInt(s1) * 60 + parseFloat(s2)));
	}

	onGameEditBtn() {
		var t = this;
		var dlg = new Dialog("Edit Game");
		var form = new PreferencesField(t.model.getEditData(), t.model.editDataRenameFunction);
		var submit = new ButtonField("Submit");
		submit.addClickListener(function () {
			dlg.close();
			t.addDataToGame(form.getState());
		});
		dlg.appendChild(form);
		dlg.appendChild(submit);
		dlg.show();
	}

	onGameRosBtn() {
		var t = this;
		var dlg = new Dialog("Edit Rosters");
		var txt1 = new TextField("Team Rosters");
		var txt2 = new TextField("Opponent Rosters");
		var tbl1 = new EditableTableField(["ST", "#", "Name"], ["check", 4, null]);
		var tbl2 = new EditableTableField(["ST", "#", "Name"], ["check", 4, null]);

		var svLd1 = t.createSvLdPanel("Team", tbl1);
		var svLd2 = t.createSvLdPanel("Opponent", tbl2);

		var submit = new ButtonField("Submit");
		submit.addClickListener(function () {
			var valid = (tbl1.isAllValid() && tbl2.isAllValid());
			if (!valid) {
				new Toast("Some entries are invalid");
				return;
			}
			var chk1 = t.addRosterToGame(tbl1, true, t.model.pbp);
			var chk2 = t.addRosterToGame(tbl2, false, t.model.pbp);
			if (chk1 || chk2) { // Check for errors
				if (chk1)
					new Toast(chk1);
				else
					new Toast(chk2);
				return;
			}
			t.addRosterToGame(tbl1, true);
			t.addRosterToGame(tbl2, false);
			new Toast("Submitted rosters");
			t.vibrate(t.VIBE_SUCCESS);
			dlg.remove();
		});
		dlg.appendChild(txt1);
		dlg.appendChild(tbl1);
		dlg.appendChild(svLd1);
		dlg.appendChild(new UIPanel().setStyle("height", "1em"));
		dlg.appendChild(txt2);
		dlg.appendChild(tbl2);
		dlg.appendChild(svLd2);
		dlg.appendChild(new UIPanel().setStyle("height", "1em"));
		dlg.appendChild(submit);
		tbl1.setValidator(t.rosValFn);
		tbl2.setValidator(t.rosValFn);
		t.rosLdFn(tbl1, t.model.team);
		t.rosLdFn(tbl2, t.model.opp);
		dlg.show();
	}
	createSvLdPanel(teamName, tbl) {
		var t = this;
		var rtn = new UIPanel();
		var sav = new ButtonField("Save");
		var ld = new ButtonField("Load");
		sav.addClickListener(function () {
			t.onGameRosSvBtn(teamName, tbl);
		});
		ld.addClickListener(function () {
			t.onGameRosLdBtn(teamName, tbl);
		});
		rtn.appendChild(sav);
		rtn.appendChild(ld);
		return rtn;
	}
	onGameRosLdBtn(name, tbl) {
		var t = this;
		var d = new Dialog(name + ": Load roster");
		var nLbl = new TextField("Enter name");
		var loadList = t.createLocalRosterList();
		var saveName = new EditTextField("");
		var submit = new ButtonField("Submit");
		submit.addClickListener(function () {
			var name = saveName.getValue();
			var data = t.loadRosterLocally(name);
			if (!data) {
				new Toast("Roster does not exist");
				return;
			}
			t.rosLdFnLocal(tbl, data);
			new Toast("Roster loaded");
			d.close();
		});
		d.appendChild(loadList)
		d.appendChild(new UIPanel().setStyle("height", "1em"));
		d.appendChild(nLbl);
		d.appendChild(saveName);
		d.appendChild(submit);
		d.show();
	}
	onGameRosSvBtn(name, tbl) {
		var t = this;
		var d = new Dialog(name + ": Save roster");
		var nLbl = new TextField("Enter name");
		var loadList = t.createLocalRosterList();
		var saveName = new EditTextField("");
		var submit = new ButtonField("Submit");
		submit.addClickListener(function () {
			var name = saveName.getValue();
			var data = t.getRostersFromTable(tbl);
			if (typeof data === "string") {
				new Toast(data); // Roster validation error
				return;
			}
			t.saveRosterLocally(name, data);
			new Toast("Saved roster " + name);
			d.close();
		});
		d.appendChild(loadList)
		d.appendChild(new UIPanel().setStyle("height", "1em"));
		d.appendChild(nLbl);
		d.appendChild(saveName);
		d.appendChild(submit);
		d.show();
	}
	saveRosterLocally(key, value) {
		localStorage.setItem(this.ROSTER_NAMESPACE + key, JSON.stringify(value));
	}
	loadRosterLocally(key) {
		var json = localStorage.getItem(this.ROSTER_NAMESPACE + key);
		return JSON.parse(json);
	}
	createLocalRosterList() {
		var rtn = new UIPanel();
		var rosterList = this.listRostersLocally();
		for(var x = 0; x < rosterList.length; x++){
			var tName = new TextField(rosterList[x]);
			rtn.appendChild(tName);
		}
		return rtn;
	}
	listRostersLocally(){
		var rtn = [];
		for(var k in localStorage){
			if(k.startsWith(this.ROSTER_NAMESPACE))
				rtn.push(k.substring(this.ROSTER_NAMESPACE.length));
		}
		console.log(rtn);
		return rtn;
	}

	// rosSvFn(tbl, team, pbp, isTeam) {
	// 	// var t = this;
	// 	var len = tbl.getLength();
	// 	var arr = [];
	// 	var ids = [];
	// 	var numSta = 0;
	// 	var badNum = false;
	// 	for (var x = 0; x < len; x++) {
	// 		if (tbl.isRowBlank(tbl.getRow(x)))
	// 			continue;
	// 		var nbr = tbl.getCell(1, x); // Player #
	// 		var iNbr = parseInt(nbr);
	// 		if (nbr.length === 0 || nbr.length > 2 || iNbr > 55 || iNbr % 10 > 5)
	// 			badNum = true;
	// 		var nam = tbl.getCell(2, x); // Player name
	// 		var sta = tbl.getCell(0, x) !== false; // Is player starting
	// 		if (sta) numSta++;
	// 		arr.push({ nbr, nam, sta });
	// 		if (ids.includes(nbr))
	// 			return "Duplicate player #" + nbr;
	// 		ids.push(nbr);
	// 	}
	// 	if (badNum)
	// 		return "Player numbers must be 0-55";
	// 	if (numSta !== 5)
	// 		return "5 starters per team required";
	// 	if (pbp) {
	// 		for (var x = 0; x < pbp.plays.length; x++) {
	// 			var p = pbp.plays[x];
	// 			if (isTeam != null && p.team === isTeam && !ids.includes(p.pid)) {
	// 				return "Cannot remove player #" + p.pid + " that has plays";
	// 			}
	// 			if (isTeam != null && p.team === isTeam && p.pid2 && !ids.includes(p.pid2)) {
	// 				return "Cannot remove player #" + p.pid + " that has substitution usage";
	// 			}
	// 		}
	// 	}
	// 	if (team) {
	// 		var pls = team.players;
	// 		var sts = team.starters;
	// 		pls.length = 0;
	// 		sts.length = 0;
	// 		for (var x = 0; x < arr.length; x++) {
	// 			pls[arr[x].nbr] = new team.PLAYER_CLASS(arr[x].nbr, arr[x].nam);
	// 			if (arr[x].sta)
	// 				sts.push(arr[x].nbr);
	// 		}
	// 	}
	// 	return false;
	// }
	//
	getRostersFromTable(tbl) {
		// var t = this;
		var len = tbl.getLength();
		var arr = [];
		var ids = [];
		var numSta = 0;
		var badNum = false;
		for (var x = 0; x < len; x++) {
			if (tbl.isRowBlank(tbl.getRow(x)))
				continue;
			var nbr = tbl.getCell(1, x); // Player #
			var iNbr = parseInt(nbr);
			if (nbr.length === 0 || nbr.length > 2 || iNbr > 55 || iNbr % 10 > 5)
				badNum = true;
			var nam = tbl.getCell(2, x); // Player name
			var sta = tbl.getCell(0, x) !== false; // Is player starting
			if (sta) numSta++;
			arr.push({ nbr, nam, sta });
			if (ids.includes(nbr))
				return "Duplicate player #" + nbr;
			ids.push(nbr);
		}
		if (badNum)
			return "Player numbers must be 0-55";
		if (numSta !== 5)
			return "5 starters per team required";
		return arr;
	}

	rosLdFn(tbl, team) { // Roster load function. Loads rosters into table
		// var t = this;
		var pls = team.players;
		var ptr = 0;
		for (var x in pls) {
			var ply = pls[x];
			var sta = team.starters.includes(ply.id);
			tbl.setCell(0, ptr, sta ? "X" : "");
			tbl.setCell(1, ptr, ply.id);
			tbl.setCell(2, ptr, ply.name);
			ptr++;
		}
		tbl.setCell(0, ptr, "");
		tbl.validateAll();
	}
	rosLdFnLocal(tbl, plArr) { // Roster load function for local roster saves
		// var t = this;
		var ptr = 0;
		for (var x in plArr) {
			var ply = plArr[x];
			tbl.setCell(0, ptr, ply.sta ? "X" : "");
			tbl.setCell(1, ptr, ply.nbr);
			tbl.setCell(2, ptr, ply.nam);
			ptr++;
		}
		tbl.setCell(0, ptr, "");
		tbl.validateAll();
	}
	rosValFn(x, y, txt) { // Roster validation function. See EditableTableField in TableField.js
		if (x === 0) return true;
		if (x === 1) { // Player #
			var t = txt.replace(/\D/g, '');
			if (t.length > 2) {
				return t.substring(t.length - 2);
			}
			return txt.length > 0 ? t : false;
		} else if (x === 2) { // Player name
			return txt.length > 0;
		}
	}

	createBtn(txt, useHTML) {
		return new ButtonField(txt, true, useHTML)
			.setStyle("height", "var(--btnh)").setStyle("width", "3em");
	}
	onSwitchTeam() {
		this.onSelTeam(!this.selTeam);
	}
	onSelTeam(tm) {
		var t = this;
		t.selTeam = tm;
		t.updateSelTeam();
	}
}

class PlayerSelectionWidget extends UIPanel {
	constructor(rows, cols, h) {
		super();
		var t = this;
		t.setStyle("flexDirection", "column");
		t.rows = [];
		t.bptr = 0;
		t.selMulti = false;
		t.width = cols;
		t.height = rows;
		t._onSelection = null;
		t._onMSelection = null;
		for (var x = 0; x < rows; x++) {
			t.rows[x] = t.generateRow(cols, h);
			t.appendChild(t.rows[x]);
		}
		t.setPlayers(null);
	}
	setOnSelection(fun) {
		this._onSelection = fun;
	}
	setOnSelectionMulti(fun) {
		this._onMSelection = fun;
	}
	generateRow(cols, h) {
		var t = this;
		var row = new UIPanel();
		for (var x = 0; x < cols; x++) {
			var b = new ButtonField("XX").addClass("fullSize")
				.setStyle("height", h).setStyle("width", "3em");
			b.addClickListener(t.onBtn.bind(t));
			row.appendChild(b);
		}
		return row;
	}

	onBtn(btn) {
		var x = btn.getText();
		var t = this;
		if (this.selMulti) {
			var s = t.sels;
			s[x] = !s[x];
			if (t._onMSelection)
				t._onMSelection(t.setFilter(s));
			else
				t.setFilter(s);
		}
		else {
			if (x.length === 0) return;
			var num1 = parseInt(x.charAt(x.length - 1));
			var num2 = x.length === 2 ? parseInt(x.charAt(x.length - 2)) : null;
			// this.setFilter(num2, num1);
			if (t._onSelection)
				t._onSelection(num2, num1);
		}
	}

	setFilter(num2, num1) {
		var t = this;
		var rtn = [];
		if (t.selMulti) { // Multi-select mode uses a list of players
			for (var x = 0; x < t.bptr; x++) {
				var btn = t.rows[Math.floor(x / 5)].children[x % 5];
				var txt = btn.getText();
				if (num2[txt]) {
					btn.setSelected(true);
					rtn.push(txt);
				}
				else {
					btn.setSelected(false);
				}
			}
		}
		else { // Single-select mode uses two numbers to select one player
			var nStr = "";
			if (num2 === 0 && num1 !== 0)
				num2 = null;
			if (num2 != null) nStr += num2;
			if (num1 != null) nStr += num1;
			for (var x = 0; x < t.bptr; x++) {
				var btn = t.rows[Math.floor(x / 5)].children[x % 5];
				var txt = btn.getText();
				if (txt === nStr) {
					btn.setSelected(true);
					rtn.push(txt);
				}
				else {
					btn.setSelected(false);
				}
			}
		}
		return rtn;
	}

	isMulti() {
		return this.selMulti;
	}

	setPlayers(players, color, includeBench, selMulti, sels) {
		var t = this;
		if (players == null) {
			for (var x = 0; x < t.rows.length; x++)
				t.rows[x].setStyle("display", "none");
			return;
		}
		t.selMulti = selMulti;
		t.sels = sels ? [...sels] : null;
		t.bptr = 0; // Button Pointer
		var rptr = 0; // Row pointer
		var cptr = 0; // Col pointer
		for (var x = 0; x < players.length; x++) {
			var p = players[x];
			if (!p || !(p.onCourt || includeBench)) continue;
			var rptr = Math.floor(t.bptr / 5);
			var cptr = t.bptr % 5;
			var btn = t.rows[rptr].children[cptr];
			if (cptr === 0) // Avoid needless style sets
				t.rows[rptr].setStyle("visibility", null).setStyle("display", null);
			btn.setStyle("visibility", null);
			btn.setSelected(false);
			btn.setBorderColor(color);
			btn.setText(p.id);
			t.bptr++;
		}
		for (var x = cptr + 1; x < t.width; x++) {
			var btn = t.rows[rptr].children[x];
			btn.setStyle("visibility", "hidden");
		}
		for (var x = rptr + 1; x < t.height; x++) {
			t.rows[x].setStyle("display", "none");
		}
		if (selMulti) {
			if (t._onMSelection)
				t._onMSelection(t.setFilter(t.sels));
			else
				t.setFilter(t.sels);
		}
	}
}