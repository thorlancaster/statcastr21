class GameModel {
	constructor(team, opp, pbp) {
		this.team = team;
		this.opp = opp;
		this.pbp = pbp;
		this.PBP_CLASS = null;
		this.gender = null;
		this.location = null;
		this.startTime = null;
		this.desc = null;
		this.type = null;
		this.subStats = null; // Needs to be overridden by subclass
	}

	getSubStats(idx){
		return this.subStats[idx];
	}

	clear(){
		this.pbp.clear();
		this.reloadFromPBP(); // Implemented by subclass
	}

	reloadFromPBP(){
		throw "Not Implemented";
	}

	static parseSingleEvent(bc) {
		var rtn = {};
		this._updSynEvtInfo(bc, rtn);
		return rtn;
	}

	/**
	 * 	Helper stub function to update event info.
	 * 	Since event descriptor is common among all events, code is in the common superclass
	 * 	@param dat Bytecode from synchronizr
	 * 	@param obj Set the properties of the provided object
	 */
	static _updSynEvtInfo(dat, obj){
		var t = obj;
		if(!t.team)
			t.team = {};
		if(!t.opp)
			t.opp = {};

		var ptr = [0];
		t.team.town = SynchronizrUtils.getString(dat, ptr, true);
		t.team.name = SynchronizrUtils.getString(dat, ptr, true);
		t.team.abbr = SynchronizrUtils.getString(dat, ptr, true);
		t.team.image = SynchronizrUtils.getString(dat, ptr, true);
		t.opp.town = SynchronizrUtils.getString(dat, ptr, true);
		t.opp.name = SynchronizrUtils.getString(dat, ptr, true);
		t.opp.abbr = SynchronizrUtils.getString(dat, ptr, true);
		t.opp.image = SynchronizrUtils.getString(dat, ptr, true);

		t.gender = SynchronizrUtils.getString(dat, ptr, true);
		t.location = SynchronizrUtils.getString(dat, ptr, true);
		t.startTime = SynchronizrUtils.getString(dat, ptr, true);
		t.desc = SynchronizrUtils.getString(dat, ptr, true);
	}


	static getSportName(str){
		switch(str){
			case "fbgame":
				return "Football";
			case "vbgame":
				return "Volleyball";
			case "bbgame":
				return  "Basketball";
			default:
				return str;
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
		if (!!obj.hTown) t.team.town = obj.hTown;
		if (!!obj.hName) t.team.name = obj.hName;
		if (!!obj.hAbbr) t.team.abbr = obj.hAbbr;
		if (!!obj.hImg) t.team.image = obj.hImg;
		if (!!obj.gTown) t.opp.town = obj.gTown;
		if (!!obj.gName) t.opp.name = obj.gName;
		if (!!obj.gAbbr) t.opp.abbr = obj.gAbbr;
		if (!!obj.gImg) t.opp.image = obj.gImg;
		if (!!obj.gender) t.gender = obj.gender;
		if (!!obj.location) t.location = obj.location;
		if (!!obj.startTime) t.startTime = obj.startTime;
		if (!!obj.desc) t.desc = obj.desc;
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
	 * @param {Number} length Maximum number of plays to return
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
				if (length > 0 && rtn.length === length)
					break;
			}
			return [rtn, idxs];
		}
		if (length > 0) {
			for (var x = t.plays.length-1; x >= 0; x--) {
				rtn.unshift(t.plays[x]);
				idxs.unshift(x);
				if (rtn.length === length)
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
		t.linked = false; // True if this play is linked to previous play
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
	* @param l true if this was created at the same time as the last one.
	*     Used by Admin for keeping track of undo, not serialized or stored persistently
	*/
	setLinked(l) {
		this.linked = l;
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

	getName(){
		return this.name;
	}
	getTown(){
		return this.town;
	}
	getAbbr(){
		return this.abbr;
	}
	getImage(){
		return this.image;
	}
	getImagePath(){
		return "../resources/mascots/" + this.image;
	}
	getPlayers(){
		return this.players;
	}

	/**
	 * Set the starters for the game
	 * @param starterArr Array of player ids of starting players
	 */
	setStarters(starterArr){
		this.starters = starterArr;
	}
	addPlayer(p) {
		this.players[p.id] = p;
	}
	removePlayer(p) {
		this.players[p.id] = null;
	}
	removeAllPlayers(){
		this.players.length = 0;
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
			if (pid[0] === 'S') { st = true; pid = pid.substring(1); }
			ply.id = pid;
			ply.name = n;
			ply.onCourt = true;
			if (st)
				this.starters.push(pid);
			this.addPlayer(ply);
		}
	}
	copyRoster(srcTeam) {
		throw "Abstract Method";
	}
	/**
	 * Reset the state of this team to the beginning of the game.
	 * Useful for reloading from scratch
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

	/**
	 * @returns {[]} Array of players who are currently playing
	 */
	onCourt() {
		var rtn = [];
		for (var x in this.players) {
			if (this.players[x].onCourt)
				rtn.push(this.players[x]);
		}
		return rtn;
	}

	/**
	 * @returns {[]} Array of Ids of players who are currently playing
	 */
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
	 * @returns The player on the court who has least recently made a play.
	 * A usefull heuristic for emergency substitutions.
	 */
	getLeastActive(pbp, whichTeam) {
		var pls = [...this.onCourtIds()];
		for(var x = pbp.length - 1; x >= 0; x--){
			var play = pbp[x];
			if(play.team === whichTeam){
				var idx = pls.indexOf(play.pid);
				if(idx >= 0){
					pls.splice(idx, 1);
				}
				if(pls.length === 1)
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
	 * Return a String used for displaying the player's name and number
	 * @param HTMLTeam Pass True or False to wrap the string in a span signifying player's team
	 * @returns Formatted string
	 */
	getStr(HTMLTeam){
		var t = this;
		var rtn = t.id ? ("#" + t.id + " " + t.name) : t.name;
		if(HTMLTeam === true)
			rtn = "<span class='scPlayerTeam'>" + rtn + "</span>";
		if(HTMLTeam === false)
			rtn = "<span class='scPlayerOpp'>" + rtn + "</span>";
		return rtn;
	}
}
