/**
 * Encodes the numeric types of plays that can be sent over the wire
 * and stored in BasketballPBPItem objects
 */
/**
 * WARNING: Make sure to add all these in BasketballTeam.js as well or
 * THINGS WILL BREAK as a GAME-ENDING BUG
 */
const BasketballPlayType = {
	FOUL_P: 1,
	FOUL_T: 2,
	FT_MADE: 3,
	FT_MISS: 4,
	P2_MADE: 5,
	P2_MISS: 6,
	DUNK_MADE: 7,
	DUNK_MISS: 8,
	P3_MADE: 9,
	P3_MISS: 10,
	REB_OFF: 11,
	REB_DEF: 12,
	REB_UNK: 13,
	ASSIST: 14,
	BLOCK: 15,
	STEAL: 16,
	TURNOVER: 17,
	SET_CLOCK: 18,
	SUB: 19,
	CHARGE_TAKEN: 20,
	longStr: [
		"INVALID",
		"Foul",
		"Technical Foul",
		"Made Free Throw",
		"Missed Free Throw",
		"Made 2-Pointer",
		"Missed 2-Pointer",
		"Made Dunk",
		"Missed Dunk",
		"Made 3-Pointer",
		"Missed 3-Pointer",
		"Offensive Rebound",
		"Defensive Rebound",
		"Rebound",
		"Assist",
		"Block",
		"Steal",
		"Turnover",
		"Clock Set",
		"Substitution",
		"Charge Taken"
	],
	shortStr: [
		"INVALID",
		"Foul",
		"Tech FL",
		"Made FT",
		"Miss FT",
		"Made 2",
		"Miss 2",
		"Made Dunk",
		"Miss Dunk",
		"Made 3",
		"Miss 3",
		"Off Reb",
		"Def Reb",
		"Rebound",
		"Assist",
		"Block",
		"Steal",
		"T-over",
		"CLK Set",
		"Sub",
		"Chg Taken"
	],
	/**
	 * Return the points of this play
	 * @param {Number} x BasketballPlayType value
	 */
	pointsOf: function(x){
		var t = this;
		switch(x){
			case t.FT_MADE: return 1;
			case t.P2_MADE: case t.DUNK_MADE: return 2;
			case t.P3_MADE: return 3;
			default:
				return 0;
		}
	},
	/**
	 * Return a human-readable description of this play
	 * @param {*} x BasketballPlayType value
	 */
	toLongStr: function(x){return this.longStr[x];},
	/**
	 * Return a human-readable, abbreviated description of this play
	 * @param {*} x BasketballPlayType value
	 */
	toShortStr: function(x){return this.shortStr[x];},
	isValid: function(x){
		return x >= 1 && x <= 20;
	}
}

class BasketballGameModel extends GameModel {
	constructor(dummy) {
		super();
		var t = this;
		t.type = "bbgame";
		t.clock = new CountdownGameClock();
		if(dummy){
			t.team = new TestBasketballTeam({name: "Redhawks", town: "Froid-Lake", abbr: "FML"});
			t.opp = new TestBasketballTeam({name: "Warriors", town: "Fairview", abbr: "FV"});
		}
		else{
			t.team = new BasketballTeam();
			t.opp = new BasketballTeam();
		}
		t.pbp = new BasketballPlayByPlay();
		t.PBP_CLASS = BasketballPBPItem;
		t.pbpCacheLength = 0; // For debugging assert() and sanity checks
		t.initSubStats();
	}
	initSubStats() {
		var t = this;
		t.subStats = [];
		for (var x = 0; x < 9; x++) {
			t.subStats.push(new BasketballSubStats(t.team, t.opp, { period: x + 1 }));
		}
	}

	getTeam(tid){
		return tid ? this.team : this.opp;
	}

	updateFromSynchronizr(syn, chg){
		var t = this;
		// 0 is no change
		// 1 is an instant clock change
		// 2 is a play was appended
		// 3 is plays blown away
		// 4 is everything blown away
		var updLvl = 0;
		// getDataAt
		// getDataLength
		if(chg[0]){ // Event Info
			// updLvl = Math.max(updLvl, 4);
			// 4 is maybe excessive here
			GameModel._updSynEvtInfo(syn.getDataAt(0, 1), this);
		}
		if(chg[1]){ // Team Rosters
			updLvl = Math.max(updLvl, 4);
			this._updSynRoster(syn, 1, true);
		}
		if(chg[2]){ // Opponent Rosters
			updLvl = Math.max(updLvl, 4);
			this._updSynRoster(syn, 2, false);
		}
		if(chg[3]){ // Instant clock
			updLvl = Math.max(updLvl, 1);
		}
		if(chg[4] === 1){ // Play appended
			updLvl = Math.max(updLvl, 2);
			this._updSynPlay(syn, true);

		} else if(chg[4]){ // Plays changed
			updLvl = Math.max(updLvl, 3);
			this._updSynPlay(syn, false);
		}
		if(updLvl > 0){
			if(updLvl === 1){
				t._updateClockFromSyn(syn, false);
			}
			if(updLvl === 2){
				t.updateFromPBP();
				t._updateClockFromSyn(syn, true);
			}
			if(updLvl === 3){
				t.reloadFromPBP();
				t._updateClockFromSyn(syn, true);
			}
			if(updLvl === 4){
				t.reloadRosters();
				t.reloadFromPBP();
				t._updateClockFromSyn(syn, true);
			}
		}
	}

	/**
	 * 	Helper function to update the instant clock (in the GameModel) from the bytecode (in the Synchronizr)
	 * 	@param syn SynchronizrManager to update from
	 * 	@param onlyIfLater Time will only be updated if it is later in the game than it already is
 	 */
	_updateClockFromSyn(syn, onlyIfLater){
		var clockData = syn.getDataAt(3, 0);
		if(clockData)
			this.clock.fromByteArray(clockData, onlyIfLater);
	}
	
	/// Helper stub function to update plays
	_updSynPlay(syn, isAppend){
		var t = this;
		var len = syn.getDataLength(4);
		if(isAppend){
			var play = new BasketballPBPItem();
			play.fromByteArray(syn.getDataAt(4, len - 1));
			t.pbp.plays.push(play);
		} else {
			t.pbp.plays.length = 0;
			for(var x = 0; x < len; x++){
				var play = new BasketballPBPItem();
				play.fromByteArray(syn.getDataAt(4, x));
				t.pbp.plays.push(play);
			}
		}
	}


	/// Helper stub function to update roster
	_updSynRoster(syn, arrNum, isTeam){
		var t = this;
		var len = syn.getDataLength(arrNum);
		var team = isTeam ? t.team : t.opp;
		var starters = [];
		team.removeAllPlayers();
		for(var x = 0; x < len; x++){
			var dat = syn.getDataAt(arrNum, x);
			var str = SynchronizrUtils.byteArrToStr(dat);
			var idx = str.indexOf(' ');
			var pid = str.substring(0, idx);
			if(pid.startsWith('s')){
				pid = pid.substring(1);
				starters.push(pid);
			}
			var name = str.substring(idx + 1);
			team.addPlayer(new BasketballPlayer(pid, name));
		}
		team.setStarters(starters);
	}


	/**
	 * Call every 100ms or so to tick the clock
	 * @returns True if anything changed
	 */
	tick() {
		var t = this;
		var r1 = t.clock.tick();
		return r1; // OR tickables together for return value
	}


	/**
	 * Get human-readable information on a Play-by-Play
	 * @param {*} pbp PBPItem object
	 * @param {Number} html 0 for plaintext everything, 1 for HTML players only, 2 for HTML players and teams
	 * @param {Boolean} abbrs True to use abbreviated play names, false for full
	 * @returns information on the play (team, time, score, play, and linked [which is another PBPInfo, as a linked list])
	 */
	getPBPInfo(pbp, html, abbrs) {
		var obj = { team: {} };
		var tm = pbp.team == null ? null : (pbp.team ? this.team : this.opp);
		var tmc = pbp.team == null ? '' : (pbp.team ? "Team" : "Opp");
		var T = BasketballPlayType;
		var timeStr = pbp.getTimeStr();
		if (tm) {
			if(html > 1){
				obj.team.name = "<span class='scPlayer"+tmc+"'>" + tm.name + "</span>";
				obj.team.abbr = "<span class='scPlayer"+tmc+"'>" + tm.abbr + "</span>";
			} else {
				obj.team.name = tm.name;
				obj.team.abbr = tm.abbr;
			}
			obj.team.img = tm.image;
		} else {
			obj.team.name = obj.team.abbr = "--";
		}
		obj.time = "P" + pbp.period + " " + timeStr;
		obj.score = pbp.rTeamScore + "-" + pbp.rOppScore;
		if (pbp.type === T.SET_CLOCK) {
			if (pbp.millis === 0)
				obj.play = "End of period " + pbp.period;
			else
				obj.play = "Clock set: P" + pbp.period + " " + pbp.getTimeStr();
		}
		else if (pbp.type === T.SUB) {
			var nPly = tm.players[pbp.pid];
			var oPly = tm.players[pbp.pid2];
			if (html)
				obj.play = "Sub: <span class='scPlayer"+tmc+"'>#" + nPly.id + ' ' + nPly.name +
					"</span> in for <span class='scPlayer"+tmc+"'>#" + oPly.id + ' ' + oPly.name + "</span>";
			else
				obj.play = "Sub: #" + nPly.id + ' ' + nPly.name + " in for #" + oPly.id + ' ' + oPly.name;
		}
		else {
			var nPly = tm.players[pbp.pid];
			var typeStr = abbrs ? T.toShortStr(pbp.type) : T.toLongStr(pbp.type);
			if (html)
				obj.play = typeStr + " by <span class='scPlayer"+tmc+"'>#" + nPly.id + ' ' +
					nPly.name + "</span>";
			else
				obj.play = typeStr + " by #" + nPly.id + ' ' + nPly.name;
		}

		if(pbp.linked && pbp.linkedPlay)
			obj.linked = this.getPBPInfo(pbp.linkedPlay, html, abbrs);
		return obj;
	}

	getLastPlayerFoul(millisBack) {
		var t = this;
		var pls = t.pbp.plays;
		var lastPlay = pls[pls.length - 1];
		for (var x = pls.length - 1; x >= 0; x--) {
			var p = pls[x];
			if (Math.abs(p.millis - lastPlay.millis) > millisBack || p.period !== lastPlay.period)
				break;

			if (p.type === BasketballPlayType.FOUL_P || p.type === BasketballPlayType.FOUL_T) {
				var fls = (p.team ? t.team : t.opp).players[p.pid].fouls;
				return { player: p.pid, fouls: fls };
			}
		}
		return null;
	}

	/**
	 * Reloads all of the team scoring data from the play-by-play
	 * This rebuilds all cached data and takes quite a while.
	 * Use updateFromPBP() instead if possible
	 */
	reloadFromPBP() {
		// console.warn("PBP cache blown. Must reload " + this.pbp.plays.length);
		var t = this;
		t.team.reset();
		t.opp.reset();
		for (var y = 0; y < t.subStats.length; y++)
			t.subStats[y].reset();
		t.pbpCacheLength = 0;
		for (var x = 0; x < t.pbp.plays.length; x++) {
			t.updateFromPBP(x);
		}
	}

	/**
	 * Reloads all roster-related data.
	 * Call this function after the roster changes
	 * and BEFORE calling reloadFromPBP();
	 */
	reloadRosters() {
		this.initSubStats();
	}

	/**
	 * Loads the last play in pbp into the cache
	 * @param {Number} playNum Overrides "last play in pbp". If negative, is relative to length.
	 */
	updateFromPBP(playNum) {
		var t = this;
		var x = playNum;
		if (playNum == null) {
			x = t.pbp.plays.length - 1;
		} else if (playNum < 0) {
			x = t.pbp.plays.length + playNum;
		}
		t.pbpCacheLength++;
		if (playNum == null) {
			DEBUGGR.assert(t.pbpCacheLength === t.pbp.plays.length, "PBP cache length mismatch");
		}
		var p = t.pbp.plays[x]; // Current Play
		var lp = t.pbp.plays[x - 1]; // Last Play
		if (p.millis) t.clock.millisLeft = p.millis;
		if (p.period) t.clock.period = p.period;
		p.linkedPlay = p.linked ? lp : null; // Link last play

		for (var y = 0; y < t.subStats.length; y++)
			t.subStats[y].doPlay(p);

		t.team.doPlay(p, p.team !== true, false);
		t.opp.doPlay(p, p.team !== false, false);

		if (p.team === true) {
			p.rTeamScore = (lp ? lp.rTeamScore : 0) + BasketballPlayType.pointsOf(p.type);
			p.rOppScore = lp ? lp.rOppScore : 0;
		} else if (p.team === false) {
			p.rTeamScore = lp ? lp.rTeamScore : 0;
			p.rOppScore = (lp ? lp.rOppScore : 0) + BasketballPlayType.pointsOf(p.type);
		}
		else { // Play does not belong to either team, must be game mgmt
			p.rTeamScore = lp ? lp.rTeamScore : 0;
			p.rOppScore = lp ? lp.rOppScore : 0;

			switch (p.type) {
				case BasketballPlayType.SET_CLOCK:
					// t.clock.period = p.pid;
					break;
				default:
					DEBUGGR.assert(false, "Unrecognized null-team play type");
					break;
			}
		}
	}

	getClock() {
		return this.clock;
	}
}

class CountdownGameClock extends GameClock {
	constructor() {
		super();
		var t = this;
		t.period = 0;
		t.millisLeft = 0;
		t.nudge = 0;
		t._timer = null;
		t._lastMs = null;
	}

	setRunning(r) {
		var t = this;
		t.running = r;
	}

	/**
	 * Call every 100ms or so to tick the clock
	 * @returns True if anything changed
	 */
	tick() {
		var t = this;
		var ms = Date.now();
		var rtn = false;
		if (t.running && t._lastMs) {
			var oSecond = Math.floor(t.millisLeft / 1000);
			t.millisLeft -= (ms - t._lastMs);
			var nSecond = Math.floor(t.millisLeft / 1000);
			rtn = (oSecond !== nSecond);
			if (t.millisLeft < 0) {
				t.millisLeft = 0;
				t.running = false;
			}
		}
		t._lastMs = ms;
		return rtn;
	}

	getTime() {
		var ml = Math.max(0, this.millisLeft + this.nudge);
		return {
			minutes: Math.floor(ml / 60000),
			seconds: Math.floor(ml / 1000) % 60,
			millis: ml % 1000
		};
	}
	/// [m][m]m:ss
	getTimeStr(){
		var tm = this.getTime();
		var secs = tm.seconds < 10 ? '0' + tm.seconds : tm.seconds;
		return tm.minutes + "" + secs;
	}
	// Format: period ms ms ms
	toByteArray() {
		var ms = this.millisLeft;
		var rtn = new Uint8Array(4);
		rtn[0] = Math.min(this.period, 127) + (this.running ? 128 : 0);
		rtn[1] = ms >> 16;
		rtn[2] = ms >> 8;
		rtn[3] = ms;
		return rtn;
	}

	/**
	 * Deserialize this Clock from a byte array
	 * @param arr Byte array
	 * @param onlyIfLater If true, time will only be set if it is later than the existing time
	 */
	fromByteArray(arr, onlyIfLater) {
		var t = this;
		var bytecodePd = arr[0] & 127;
		var bytecodeMs = arr[1] * 65536 + arr[2] * 256 + arr[3];

		t.running = arr[0] >= 128;
		if(!onlyIfLater || (t.period < bytecodePd) || (t.period === bytecodePd && t.millisLeft > bytecodeMs)) {
			t.millisLeft = bytecodeMs;
			t.period = bytecodePd;
		}
	}
}

class BasketballPBPItem extends PBPItem {
	/**
	 * @param period see PBPItem
	 * @param millis see PBPItem
	 * @param pid see PBPItem
	 * @param pid2 see PBPItem
	 * @param team see PBPItem
	 * @param type a valid play type (from BasketballPlayType)
	 */
	constructor(period, millis, pid, team, type, pid2) {
		super(period, millis, pid, team, pid2);
		if (type != null)
			DEBUGGR.assert(BasketballPlayType.isValid(type), "Invalid Play Type");
		this.type = type;
	}

	// The following functions are required for Synchronizr serialization / deserialization
	// Binary format (byte-wise): (linked[MSB] period[6LSB]) millis[MSB] millis[NSB] millis[LSB]  pid  byte(team, type) RESERVED RESERVED
	// RESERVED tentative format: (SubOut# || ShotChartX) ShotChartY
	toByteArray() {
		var t = this;
		var a = new Uint8Array(8);
		var tflag = t.team === true ? 128 : (t.team === false ? 64 : 0)
		a[0] = (t.period & 127) + (t.linked ? 128 : 0);
		a[1] = t.millis >> 16;
		a[2] = t.millis >> 8;
		a[3] = t.millis;
		a[4] = t.pid === "00" ? "255" : parseInt(t.pid);
		a[5] = tflag + (t.type & 63);
		a[6] = t.type === BasketballPlayType.SUB ? t.pid2 : 0;
		a[7] = 0;
		return a;
	}

	fromByteArray(a) {
		DEBUGGR.assert(a.length === 8, "Illegal Array Length");
		var t = this;
		t.period = a[0] & 127;
		t.linked = a[0] >= 128;
		t.millis = a[1] * 65536 + a[2] * 256 + a[3];
		t.pid = a[4] === 255 ? "00" : "" + a[4];
		t.type = a[5] & 63;
		var tflag = a[5] & 192;
		t.team = tflag === 128 ? true : (tflag === 64 ? false : null);
		if (t.type === BasketballPlayType.SUB)
			t.pid2 = a[6] === 255 ? "00" : "" + a[6];
		return this;
	}
}

class BasketballPlayByPlay extends PlayByPlay {
	constructor() {
		super();
	}

	addPlay(p) {
		DEBUGGR.assert(p.constructor.name === "BasketballPBPItem");
		this.plays.push(p);
	}

	/**
	 * Remove a play from the list of plays
	 * @param {Number} x Index of play to remove
	 * @param {Boolean} cascade True to cascade delete linked plays
	 */
	removePlay(x, cascade) {
		if (x == null)
			x = this.plays.length - 1;

		var num = 1; // Number of plays to remove
		for (var i = x; i >= 0; i--) {
			if (this.plays[i].linked)
				num++;
			else
				break;
		}
		this.plays.splice((x + 1) - num, num);
	}
}



class BasketballPlayer extends Player{
	constructor(number, name){
		super(number, name);
		this.reset();
	}
	reset(){
		super.reset();
		var t = this;

		t.pFouls = 0;
		t.tFouls = 0;

		t.ftMade = 0;
		t.ftMiss = 0;
		t.p2NormMade = 0;
		t.p2NormMiss = 0;
		t.dunkMade = 0;
		t.dunkMiss = 0;
		t.p3Made = 0;
		t.p3Miss = 0;

		t.offReb = 0;
		t.defReb = 0;
		t.unkReb = 0;
		t.assists = 0;
		t.blocks = 0;
		t.steals = 0;
		t.turnovers = 0;
		t.charges = 0;
	}
	get p2Made(){return this.p2NormMade + this.dunkMade}
	get p2Miss(){return this.p2NormMiss + this.dunkMiss}
	get points(){return this.ftMade + this.p2Made * 2 + this.p3Made * 3}
	get fouls(){return this.pFouls + this.tFouls}
	get rebounds(){return this.offReb + this.defReb + this.unkReb}
	get fgMade(){return this.p2Made + this.p3Made}
	get fgMiss(){return this.p2Miss + this.p3Miss}
	get fgTotal(){return this.fgMade + this.fgMiss}
	get ftTotal(){return this.ftMade + this.ftMiss}
	get shotsMade(){return this.ftMade + this.fgMade}
	get shotsMiss(){return this.ftMiss + this.fgMiss}
	get shotsTotal(){return this.shotsMade + this.shotsMiss}
	get fgPercentage(){return this.fgMade / this.fgTotal * 100}
	get ftPercentage(){return this.ftMade / this.ftTotal * 100}
	get fgStr(){return this.fgMade + " / " + this.fgTotal}
	get ftStr(){return this.ftMade + " / " + this.ftTotal}

	get numNameStr(){
		var sid = this.id;
		// if(sid.length == 1) sid = "0" + sid;
		return '#' + sid + ' ' + this.name;
	}
	get numNameStrHtmlT(){// Get Num/Name Str as HTML, Team
		return "<span class='scPlayerTeam'>" + this.numNameStr + "</span>";
	}
	get numNameStrHtmlO(){// Get Num/Name Str as HTML, Opponent
		return "<span class='scPlayerOpp'>" + this.numNameStr + "</span>";
	}
	get nbaEfficiency(){
		var t = this;
		return t.points + t.rebounds + t.assists + t.steals + t.blocks - (t.fgMiss + t.ftMiss + t.turnovers);
	}
	getPlayTime(msLeft){
		var m = this.playMs;
		if(msLeft && this.lastMs){
			m += Math.max(0, this.lastMs - msLeft);
		}
		var min = Math.floor(m / 60000);
		var sec = Math.floor(m % 60000 / 1000);
		var ms = m % 1000;
		return{min: min, sec: sec, ms: ms};
	}

	getPlayTimeStr(msLeft){
		var p = this.getPlayTime(msLeft);
		if(p.sec < 10) return p.min + ":0" + p.sec;
		else return p.min + ":" + p.sec;
	}
}


/**
 * Class to keep track of the stats of a team given a filter.
 * This class is not used to keep track of the whole game.
 * BasketballGameModel does that by itself.
 */
class BasketballSubStats{
	constructor(team, opp, filter){
		var t = this;
		t.srcTeam = team;
		t.srcOpp = opp;
		t.team = new BasketballTeam();
		t.team.copyRoster(t.srcTeam);
		t.opp = new BasketballTeam();
		t.opp.copyRoster(t.srcOpp);
		t.filter = filter;
	}
	/**
	 * Reset this model to clear the effects of all the plays it ever received
	 * and reset the starters. Should be called only when the Model invalidates
	 * it's cache prior to rebuilding it
	 */
	reset(){
		this.team.starters = this.srcTeam.starters;
		this.team.reset();
		this.opp.starters = this.srcOpp.starters;
		this.opp.reset();
	}

	getTeam(tid){
		return tid ? this.team : this.opp;
	}

	setFilter(filter){
		this.filter = filter;
	}

	/**
	 * Apply a play to this sub-stats view. All plays in the game should be
	 * passed to this function as they arrive, this class will take care of
	 * filtering.
	 * @param {PBPItem} play
	 */
	doPlay(play){
		var t = this;
		var filterFail = false;
		for(var x in t.filter){
			if(t.filter[x] !== play[x]){
				filterFail = true;
				break;
			}
		}
		t.team.doPlay(play, play.team !== true, filterFail);
		t.opp.doPlay(play, play.team !== false, filterFail);
	}
}


class BasketballTeam extends Team {
	constructor(info) {
		super(info);
		this.PLAYER_CLASS = BasketballPlayer;
	}
	doPlayForTime(p) {
		var t = this;
		// debugger;
		var dTime = t.lastPlayTime.ms - p.millis;
		if (dTime > 0) {
			for (var x in t.players) {
				var pl = t.players[x];
				if (pl.onCourt)
					pl.playMs += dTime; // Playing time
				pl.lastMs = p.millis; // Time when playing time was last updated
				// if(pl.id == '1'){
				//   console.log(pl.playMs)
				// }
			}
		}
		t.lastPlayTime.ms = p.millis;
		t.lastPlayTime.pd = p.period;
	}

	/**
	 * Apply a PBP play to this team's status
	 * @param {*} p Play to apply
	 * @param {*} otherTeam True if play is for other team
	 * @param {*} otherFilter True if play does not match the filter.
	 */
	doPlay(p, otherTeam, otherFilter) {
		var t = this;
		try {
			if (!otherFilter) {
				t.doPlayForTime(p);
			}

			if (!otherTeam) {
				var pl = t.players[p.pid];
				var pl2 = t.players[p.pid2];
				DEBUGGR.assert(pl != null, "Player for doPlay DNE");
				const T = BasketballPlayType;
				if (!otherFilter) {
					switch (p.type) {
						case T.FOUL_P: pl.pFouls++; break;
						case T.FOUL_T: pl.tFouls++; break;
						case T.FT_MADE: pl.ftMade++; break;
						case T.FT_MISS: pl.ftMiss++; break;
						case T.P2_MADE: pl.p2NormMade++; break;
						case T.P2_MISS: pl.p2NormMiss++; break;
						case T.DUNK_MADE: pl.dunkMade++; break;
						case T.DUNK_MISS: pl.dunkMiss++; break;
						case T.P3_MADE: pl.p3Made++; break;
						case T.P3_MISS: pl.p3Miss++; break;
						case T.REB_OFF: pl.offReb++; break;
						case T.REB_DEF: pl.defReb++; break;
						case T.REB_UNK: pl.unkReb++; break;
						case T.ASSIST: pl.assists++; break;
						case T.BLOCK: pl.blocks++; break;
						case T.STEAL: pl.steals++; break;
						case T.TURNOVER: pl.turnovers++; break;
						case T.SUB: pl.onCourt = true; pl2.onCourt = false; break;
						case T.CHARGE_TAKEN: pl.charges++; break;
						default: DEBUGGR.assert(false, "Unrecognized play type: " + p.type);

					}
				} else {
				}
			}
		} catch (e) {
			console.error("CRITICAL: Failed to parse play", e);
		}
	}
	copyRoster(srcTeam) {
		this.players.length = 0;
		for (var x in srcTeam.players) {
			var p = srcTeam.players[x];
			this.addPlayer(new BasketballPlayer(p.id, p.name));
		}
	}
}


class TestBasketballTeam extends BasketballTeam{
	constructor(info){
		super(info);
		var t = this;
		var p1 = new BasketballPlayer("1", "Isaac Johnson");
		var p2 = new BasketballPlayer("3", "Javonne Nesbit");
		var p3 = new BasketballPlayer("21", "Colt Miller");
		var p4 = new BasketballPlayer("24", "Mason Dethman");
		var p5 = new BasketballPlayer("44", "Bode Miller");
		var p6 = new BasketballPlayer("45", "Brett Stentoft");
		p6.onCourt = false;
		t.addPlayer(p1);
		t.addPlayer(p2);
		t.addPlayer(p3);
		t.addPlayer(p4);
		t.addPlayer(p5);
		t.addPlayer(p6);
		t.starters = ["1", "3", "21", "24", "44"];
	}
}

