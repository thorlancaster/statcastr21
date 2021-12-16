class BasketballGameModel extends GameModel {
	constructor() {
		super();
		var t = this;
		t.type = "bbgame";
		t.clock = new BasketballGameClock();
		t.team = new BasketballTeam();
		t.opp = new BasketballTeam();
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

	/**
	 * @returns Bytecode template for an uninitialized game model. Pass result to Synchronizr loadFromStorage()
	 */
	getTemplate(){
		return {
			static: [
				new Uint8Array([98, 98, 103, 97, 109, 101]), // Type = bbgame
				new Uint8Array([0, 4, 84, 101, 97, 109, 0, 6, 77, 97, 115, 99, 111, 116, 0, 4, 65, 98, 98, 114, 0, 4, 76, 111, 103, 111]), // Team Mascot Abbr Logo
				new Uint8Array([0, 3, 79, 112, 112, 0, 7, 79, 77, 97, 115, 99, 111, 116, 0, 5, 79, 65, 98, 98, 114, 0, 5, 79, 76, 111, 103, 111]), // Opp Mascot Abbr Logo
				new Uint8Array([76, 111, 99, 97, 116, 105, 111, 110]), // Location
				new Uint8Array([]), // Intentionally left blank, Special Desc.
				new Uint8Array([77, 79, 78, 32, 68, 65, 89, 32, 88, 58, 88, 88, 32, 80, 77]), // Date / Time
				new Uint8Array([91, 76, 101, 118, 101, 108, 93, 91, 71, 101, 110, 100, 101, 114, 93]), // Level, Gender
				new Uint8Array([]), // Intentionally left blank
			],
			dynamic: [],
			event: []
		}
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
	 * @param {Boolean} html True to surround players with <span class='scPlayer(Team|Opp)'>
	 * 		elements, false for plaintext
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
			obj.team.name = tm.name;
			obj.team.abbr = tm.abbr;
			obj.team.img = tm.image;
		} else {
			obj.team.name = obj.team.abbr = "--";
		}
		obj.time = "P" + pbp.period + " " + timeStr;
		obj.score = pbp.rTeamScore + "-" + pbp.rOppScore;
		if (pbp.type == T.SET_CLOCK) {
			if (pbp.millis == 0)
				obj.play = "End of period " + pbp.period;
			else
				obj.play = "Clock set: P" + pbp.period + " " + pbp.getTimeStr();
		}
		else if (pbp.type == T.SUB) {
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
	/**
	* Update a roster
	* @param team true for Team, false for Opponent
	* @param pid id of player. (Upsert)
	* @param name name of player, or null to remove
	*/
	updateRoster(team, pid, name) {
		// TODO implement this? Probably not needed?
	}

	getLastPlayerFoul(millisBack) {
		var t = this;
		var pls = t.pbp.plays;
		var lastPlay = pls[pls.length - 1];
		for (var x = pls.length - 1; x >= 0; x--) {
			var p = pls[x];
			if (Math.abs(p.millis - lastPlay.millis) > millisBack || p.period != lastPlay.period)
				break;

			if (p.type == BasketballPlayType.FOUL_P || p.type == BasketballPlayType.FOUL_T) {
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
	 * @param {Integer} playNum Overrides "last play in pbp". If negative, is relative to length.
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
			assert(t.pbpCacheLength == t.pbp.plays.length, "PBP cache length mismatch");
		}
		var p = t.pbp.plays[x]; // Current Play
		var lp = t.pbp.plays[x - 1]; // Last Play
		if (p.millis) t.clock.millisLeft = p.millis;
		if (p.period) t.clock.period = p.period;
		p.linkedPlay = p.linked ? lp : null; // Link last play

		for (var y = 0; y < t.subStats.length; y++)
			t.subStats[y].doPlay(p);

		t.team.doPlay(p, p.team != true, false);
		t.opp.doPlay(p, p.team != false, false);

		if (p.team == true) {
			p.rTeamScore = (lp ? lp.rTeamScore : 0) + BasketballPlayType.pointsOf(p.type);
			p.rOppScore = lp ? lp.rOppScore : 0;
		} else if (p.team == false) {
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
					assert(false, "Unrecognized null-team play type");
					break;
			}
		}
	}
}

// TODO Rename to CountdownGameClock for sport-agnostic edition
class BasketballGameClock extends GameClock {
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
			t.millisLeft -= (ms - t._lastMs);
			rtn = true;
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
	fromByteArray(arr) {
		this.period = arr[0] & 127;
		this.running = arr[0] >= 128 ? true : false;
		this.millisLeft = arr[1] * 65536 + arr[2] * 256 + arr[3];
	}
}
