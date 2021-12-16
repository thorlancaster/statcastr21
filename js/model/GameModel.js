class GameModel {
	constructor(team, opp, pbp) {
		this.team = team;
		this.opp = opp;
		this.pbp = pbp;
		this.PBP_CLASS = null;
		this.gender = null;
		this.location = null;
		this.desc = null;
		this.type = null;
	}

	clear(){
		this.pbp.clear();
		this.reloadFromPBP();
	}

	static parseSingleEvent(bytecode){
		// TODO parse the bytecode
		return {hAbbr: "FML", gAbbr: "FV", gender: "[GENDER]", startTime: "4:20 PM"}
	}

	static getSportName(str){
		switch(str){
			case "fbgame":
				return "Football";
			case "vbgame":
				return "Volleyball";
			case "bbgame":
				return  "Basketball";
		}
	}

	/**
	* Parse an array of bytecode (Synchronizr.EVENT for PBP)
	* and apply the result to this model.
	* @param {Array} arrs Bytecode as Synchronizr.EVENT
	* @param {Integer} limit How many plays to update (from end). 0 = all
	*/
	parsePBPBytecode(arrs, limit) {
		var t = this;
		var pls = t.pbp.plays;
		var l = arrs.length;
		var lower = limit == 0 ? 0 : l - limit;
		for (var x = l - 1; x >= lower; x--) {
			if (!pls[x])
				pls[x] = new t.PBP_CLASS();
			pls[x].fromByteArray(arrs[x]);
		}
		if (limit == 0 && pls.length > arrs.length) {
			pls.length = arrs.length;
		}
	}
	genPBPBytecode(limit) {
		var t = this;
		var rtn = [];
		var pls = t.pbp.plays;
		for (var x = 0; x < pls.length; x++) {
			rtn[x] = pls[x].toByteArray();
		}
		return rtn;
	}

	parseDynamicBytecode(arrs) {
		var t = this;
		if (arrs[0])
			t.clock.fromByteArray(arrs[0]);
		var desc = arrs[1];
		// TODO put game description on page
	}

	/**
	 * Parse an array of bytecode (Synchronizr.STATIC for events)
	 * and apply the result to this model. Data contains team names, game
	 * description (tournaments etc.) and rosters.
	 * @param {Array} arrs Bytecode as Synchronizr.STATIC
	 */
	parseStaticBytecode(arrs) {
		var t = this;
		var hasParsedStatic = t.hasParsedStatic;
		t.hasParsedStatic = true;
		// Parse the bytecode
		var hTown = '', hMascot = '', hAbbr = '', hImg = '', gTown = '', gMascot = '', gAbbr = '', gImg = '', hPlyrs = [], gPlyrs = [];
		t.location = ''; t.desc = ''; t.startTime = ''; t.gender = '';
		var ptr = [0];
		// t.type = Synchronizr.byteArrToStr(arrs[0]);
		// Type is no longer inferred from the stream. It is set directly by the subclass and not changed.
		// If the stream's type changes, the entire model must be reloaded. Classes are not compatible.
		try {
			hTown = Synchronizr.byteArrToStr(Synchronizr.parseField(arrs[1], ptr));
			hMascot = Synchronizr.byteArrToStr(Synchronizr.parseField(arrs[1], ptr));
			hAbbr = Synchronizr.byteArrToStr(Synchronizr.parseField(arrs[1], ptr));
			hImg = Synchronizr.byteArrToStr(Synchronizr.parseField(arrs[1], ptr));
			ptr[0] = 0;
			gTown = Synchronizr.byteArrToStr(Synchronizr.parseField(arrs[2], ptr));
			gMascot = Synchronizr.byteArrToStr(Synchronizr.parseField(arrs[2], ptr));
			gAbbr = Synchronizr.byteArrToStr(Synchronizr.parseField(arrs[2], ptr));
			gImg = Synchronizr.byteArrToStr(Synchronizr.parseField(arrs[2], ptr));

			t.location = Synchronizr.byteArrToStr(arrs[3]);
			t.desc = Synchronizr.byteArrToStr(arrs[4]);
			t.startTime = Synchronizr.byteArrToStr(arrs[5]);
			t.gender = Synchronizr.byteArrToStr(arrs[6]);

			ptr[0] = 0;
			while (true) {
				var s = Synchronizr.byteArrToStr(Synchronizr.parseField(arrs[8], ptr));
				if (s) hPlyrs.push(s); else break;
			}
			ptr[0] = 0;
			while (true) {
				var s = Synchronizr.byteArrToStr(Synchronizr.parseField(arrs[9], ptr));
				if (s) gPlyrs.push(s); else break;
			}
			t.rpcStr = Synchronizr.byteArrToStr(arrs[10]);
		} catch (e) {
			console.warn("Error parsing static bytecode, using default values for remaining");
		}
		// Apply the results

		t.team.town = hTown;
		t.team.name = hMascot;
		t.team.abbr = hAbbr;
		t.team.image = hImg;
		t.opp.town = gTown;
		t.opp.name = gMascot;
		t.opp.abbr = gAbbr;
		t.opp.image = gImg;

		t.team.setPlayers(hPlyrs);
		t.opp.setPlayers(gPlyrs);

		// console.log(type, { hTown, hMascot, hAbbr }, { gTown, gMascot, gAbbr }, location, desc, startTime, gender, hPlyrs, gPlyrs);
		// debugger;

		if(hasParsedStatic){ // Only call RPC if it happens during the event, not on load
			if(t.rpcStr && t.rpcStr != t.oldRpc){
				var cmd = t.rpcStr.substring(t.rpcStr.indexOf('-') + 1);
				BUS.publish(new MBMessage("upd", "rpc", cmd));
			}
		} else {
			t.oldRpc = t.rpcStr;
		}
	}

	/**
	 * @returns an Object one level deep, suitable for passing to a PreferencesField to edit the game stats
	 */
	getEditData() {
		var t = this;
		return {
			hTown: t.team.town,
			hName: t.team.name,
			hAbbr: t.team.abbr,
			hImg: t.team.image,
			gTown: t.opp.town,
			gName: t.opp.name,
			gAbbr: t.opp.abbr,
			gImg: t.opp.image,
			gender: t.gender,
			location: t.location,
			startTime: t.startTime,
			desc: t.desc
		};
	}
	/**
	 * Applies an object (from getEditData) to this GameModel's state
	 * @param obj Object from getEditData
	 */
	putEditData(obj) {
		var t = this;
		if (!obj) return;
		if (obj.hTown != undefined) t.team.town = obj.hTown;
		if (obj.hName != undefined) t.team.name = obj.hName;
		if (obj.hAbbr != undefined) t.team.abbr = obj.hAbbr;
		if (obj.hImg != undefined) t.team.image = obj.hImg;
		if (obj.gTown != undefined) t.opp.town = obj.gTown;
		if (obj.gName != undefined) t.opp.name = obj.gName;
		if (obj.gAbbr != undefined) t.opp.abbr = obj.gAbbr;
		if (obj.gImg != undefined) t.opp.image = obj.gImg;
		if (obj.gender != undefined) t.gender = obj.gender;
		if (obj.location != undefined) t.location = obj.location;
		if (obj.startTime != undefined) t.startTime = obj.startTime;
		if (obj.desc != undefined) t.desc = obj.desc;
	}

	editDataRenameFunction(name) {
		switch (name) {
			case "hTown": return "Team Town";
			case "hName": return "Team Mascot";
			case "hAbbr": return "Team Abbr.";
			case "hImg": return "Team Image";
			case "gTown": return "Opp Town";
			case "gName": return "Opp Mascot";
			case "gAbbr": return "Opp Abbr.";
			case "gImg": return "Opp Image";
			case "gender": return "Gender";
			case "location": return "Location";
			case "startTime": return "Start Time";
			case "desc": return "Special Desc.";
		}
		return name;
	}

	setRPC(cmd){
		var rand = (""+Math.random()).substring(2);
		this.rpcStr = rand + "-" + cmd;
		this.invalidateStatic();
	}

	genEventBytecode() {
		var t = this;
		var rtn = [];
		rtn[0] = Synchronizr.strToByteArr(t.type);
		rtn[1] = t.genEventBytecode0(t.team);
		rtn[2] = t.genEventBytecode0(t.opp);
		rtn[3] = Synchronizr.strToByteArr(t.location);
		rtn[4] = Synchronizr.strToByteArr(t.desc);
		rtn[5] = Synchronizr.strToByteArr(t.startTime);
		rtn[6] = Synchronizr.strToByteArr(t.gender);
		rtn[7] = [];
		rtn[8] = t.genRosterBytecode0(t.team);
		rtn[9] = t.genRosterBytecode0(t.opp);
		rtn[10] = Synchronizr.strToByteArr(t.rpcStr);
		return rtn;
	}
	genRosterBytecode0(team) {
		var len = 0;
		for (var x in team.players) {
			var ply = team.players[x];
			var sta = team.starters.includes(ply.id);
			len += ("" + ply.id).length;
			len += ply.name.length + 1 + 2 + (sta ? 1 : 0);
		}
		var rtn = new Uint8Array(len);
		var ptr = 0;
		for (var x in team.players) {
			var ply = team.players[x];
			var sta = team.starters.includes(ply.id);
			var itm = Synchronizr.strToByteArr((sta ? "S" : "") + ply.id + " " + ply.name);
			rtn[ptr++] = itm.length >> 8;
			rtn[ptr++] = itm.length & 0xFF;
			Synchronizr.memcpy(rtn, itm, ptr, itm.length);
			ptr += itm.length;
		}
		return rtn;
	}
	genEventBytecode0(team) {
		var town = Synchronizr.strToByteArr(team.town);
		var name = Synchronizr.strToByteArr(team.name);
		var abbr = Synchronizr.strToByteArr(team.abbr);
		var img = Synchronizr.strToByteArr(team.image);
		return Synchronizr.joinArrs([town, name, abbr, img]);
	}

	genDynamicBytecode() {
		return [this.clock.toByteArray(), new Uint8Array(0)];
		// TODO second element is message to fans
	}

	/* Stuff for Synchronizr compatibliity */
	getStaticData() {
		this.synSInvalid = false;
		return this.genEventBytecode();
	}
	getDynamicData() {
		this.synDInvalid = false;
		return this.genDynamicBytecode();
	}
	getEventData() {
		var e = this.synEInvalid;
		this.synEInvalid = false;
		return this.genPBPBytecode(e);
	}
	isStaticInvalid() {
		return this.synSInvalid;
	}
	isDynamicInvalid() {
		return this.synDInvalid;
	}
	isEventInvalid() {
		return this.synEInvalid;
	}
	invalidateStatic() {
		this.synSInvalid = true;
	}
	invalidateDynamic() {
		this.synDInvalid = true;
	}
	invalidateEvent(e) {
		if (e == null)
			e = true;
		var t = this;
		if (e === true)
			t.synEInvalid = e;
		else if (t.synEInvalid !== true) {
			t.synEInvalid |= 0;
			t.synEInvalid += e;
		}
	}
	revalidateStatic() {
		this.synSInvalid = false;
	}
	revalidateDynamic() {
		this.synDInvalid = false;
	}
	revalidateEvent(e) {
		this.synEInvalid = false;
	}
	updateStaticData(d) {
		// Set the rosters, names, etc.
		this.parseStaticBytecode(d);
	}
	updateDynamicData(d) {
		// set the clock, etc from d
		this.parseDynamicBytecode(d);
	}
	updateEventData(d, n) {
		// Set the last n PBPs from the last n of d
		if (!n) n = 0;
		this.parsePBPBytecode(d, n);
	}
}

class GameClock {
	constructor() {
		this.period = 0;
		this.numPeriods = 0;
	}
}

/**
 * Class to hold a list of plays
 */
class PlayByPlay {
	constructor() {
		this.plays = [];
	}
	addPlay(p) {
		throw "Abstract Method";
	}
	removePlay(x) {
		throw "Abstract Method";
	}
	clear(){
		this.plays.length = 0;
	}
	/**
	 * Get plays from this list. If args is null, returns the n most recent plays, sorted by recency (most recent = index 0)
	 * @param {Integer} length Maximum number of plays to return
	 * @param {Object} args Filter that plays must match to be returned
	 * @returns an Array where the first item is an array of plays and the second item is an array of indices
	 */
	getPlays(length, args) {
		var t = this;
		var rtn = [];
		var idxs = [];
		if (args != null) {
			var keys = Object.keys(args);
			for (var x = t.plays.length - 1; x >= 0; x--) {
				var play = t.plays[x];
				var add = true;
				for (var y = 0; y < keys.length; y++) {
					if (play[keys[y]] !== args[keys[y]]) {
						add = false; break;
					}
				}
				if (add) {
					rtn.push(play);
					idxs.push(x);
				}
				if (length > 0 && rtn.length == length)
					break;
			}
			return [rtn, idxs];
		}
		if (length > 0) {
			for (var x = t.plays.length-1; x >= 0; x--) {
				rtn.unshift(t.plays[x]);
				idxs.unshift(x);
				if (rtn.length == length)
					return [rtn, idxs];
			}
			return [rtn, idxs];
		}
		idxs.length = t.plays.length;
		for (var x = 0; x < idxs.length; x++)
			idxs[x] = x;
		return [t.plays, idxs];
	}
}

class PBPItem {
	/**
	* @param period Period of in the game (Integer)
	* @param millis Milliseconds since start of Period / until end of Period (Integer)
	* @param pid Player jersey # (String), or Period (Integer), when setting time
	* @param team true if Team, false if Opponent, null if neither
	* @param pid2 [optional] Player jersey # for 2-player plays
	*/
	constructor(period, millis, pid, team, pid2) {
		var t = this;
		t.period = period;
		t.millis = millis;
		t.pid = pid;
		t.pid2 = (pid2 != null) ? pid2 : 0;
		t.team = team;
		t.rTeamScore = 0; // Running team and Opponent scores after this play
		t.rOppScore = 0; // These are to be computed by sport-specific Game Models
		t.linked = false;
	}
	getTime() {
		return {
			minutes: Math.floor(this.millis / 60000),
			seconds: Math.floor((this.millis / 1000) % 60),
			millis: this.millis % 1000
		};
	}

	/**
	* Set whether this play is linked to the last one
	* @param linked true if this was created at the same time as the last one.
	*     Used by Admin for keeping track of undo, not serialized or stored persistently
	*/
	setLinked(linked) {
		this.linked = (linked == true);
	}
	getTimeStr() {
		var t = this.getTime();
		return "" + t.minutes + (t.seconds < 10 ? ":0" + t.seconds : ":" + t.seconds);
	}
}


class Team {
	constructor(info) {
		var t = this;
		t.PLAYER_CLASS = null;
		if (info) {
			t.town = info.town; // Ex. "Froid-Lake"
			t.name = info.name; // Ex. "Redhawks"
			t.abbr = info.abbr; // Ex. "FML";
			t.image = info.image; // "Ex resources/mascots/froidmedicinelake.png"
		} else {
			t.town = "--";
			t.name = "--";
			t.abbr = "--";
			t.image = "";
		}
		t.players = []; // Associative array by player #
		t.starters = []; // Array of player #s (ids) who are starters
		t.lastPlayTime = {};
		t.lastPlayTime.pd = 0;
		t.lastPlayTime.ms = 0;
	}

	/**
	 * Get the path
	 */
	getImagePath() {
		var i = this.image;
		if (i && i.includes('/')) // Full path
			return i;
		return Constants.mascotPath + i;
	}

	addPlayer(p) {
		this.players[p.id] = p;
	}
	removePlayer(p) {
		this.players[p.id] = null;
	}
	/**
	 * Set this team's roster and starters
	 * @param {Array} rostArr Array of Strings in format [S=Starter]<ID> <First>[ <Middle>[ <Last>]]
	 */
	setPlayers(rostArr) {
		this.players.length = 0;
		this.starters.length = 0;
		for (var x = 0; x < rostArr.length; x++) {
			var p = rostArr[x];
			var i = p.indexOf(" ");
			var pid = p.substring(0, i);
			var n = p.substring(i + 1);
			var ply = new this.PLAYER_CLASS();
			var st = false;
			if (pid[0] == 'S') { st = true; pid = pid.substring(1); }
			ply.id = pid;
			ply.name = n;
			ply.onCourt = true;
			if (st)
				this.starters.push(pid);
			this.addPlayer(ply);
		}
	}
	copyRoster(srcTeam) {
		assert(false, "Abstract Method");
	}
	/**
	 * Reset the state of this team to the beginning of the game
	 */
	reset() {
		for (var p in this.players) {
			this.players[p].reset();
			this.players[p].onCourt = this.starters.includes(this.players[p].id);
		}
	}
	/**
	 * Return how many of a stat the team has
	 * @param {String} name name of stat to get
	 */
	getStat(name) {
		var rtn = 0;
		for (var x in this.players) {
			rtn += this.players[x][name];
		}
		return rtn;
	}

	onCourt() { // Moved from BasketballTeam.js
		var rtn = [];
		for (var x in this.players) {
			if (this.players[x].onCourt)
				rtn.push(this.players[x]);
		}
		return rtn;
	}

	onCourtIds(){
		var rtn = [];
		var pls = this.onCourt();
		for(var x in pls)
			rtn.push(pls[x].id);
		return rtn;
	}

	/**
	 * @param {Array<PBPItem>} pbp Play-by-play array
	 * @param {Boolean} whichTeam True for team, False for opponent
	 * @returns The player on the court who has least recently played. A usefull heuristic for emergency substitutions.
	 */
	getLeastActive(pbp, whichTeam) {
		var pls = [...this.onCourtIds()];
		for(var x = pbp.length - 1; x >= 0; x--){
			var play = pbp[x];
			if(play.team == whichTeam){
				var idx = pls.indexOf(play.pid);
				if(idx >= 0){
					pls.splice(idx, 1);
				}
				if(pls.length == 1)
					break;
			}
		}
		return this.players[pls[0]];
	}
}


class Player {
	constructor(number, name) {
		var t = this;
		t.id = number; // Per-team Player ID. (Jersey #);
		if (name == null) t.name = "[Player]"
		else t.name = name;
		// Milliseconds of playing time
		t.playMs = 0;
		// Is the player currently playing
		t.onCourt = true;
	}

	// When extending make sure to call super.reset();
	reset() {
		this.playMs = 0;
	}

	/**
	 * Return how long this player has been on the court, 
	 * EXCLUDING the time that has elapsed from the most recent
	 * play
	 */
	getPlayTime() {
		return {
			minutes: Math.floor(this.playMs / 60000),
			seconds: Math.floor((this.playMs / 1000) % 60),
			millis: this.playMs % 1000
		};
	}
	getPlayTimeStr() {
		var t = this.getPlayTime();
		return "" + t.minutes + (t.seconds < 10 ? ":0" + t.seconds : ":" + t.seconds);
	}
}
