class BasketballPBPItem extends PBPItem {
	/**
	* @param period see PBPItem
	* @param millis see PBPItem
	* @param pid see PBPItem
	* @param team see PBPItem
	* @param type a valid play type (from BasketballPlayType)
	*/
	constructor(period, millis, pid, team, type, pid2) {
		super(period, millis, pid, team, pid2);
		if (type != null)
			assert(BasketballPlayType.isValid(type), "Invalid Play Type");
		this.type = type;
	}
	// The following functions are required for Synchronizr serialization / deserialization
	// Binary format (byte-wise): (linked[MSB] period[6LSB]) millis[MSB] millis[NSB] millis[LSB]  pid  byte(team, type) RESERVED RESERVED
	// RESERVED tentative format: (SubOut# || ShotChartX) ShotChartY
	toByteArray() {
		var t = this;
		var a = new Uint8Array(8);
		var tflag = t.team == true ? 128 : (t.team == false ? 64 : 0)
		a[0] = (t.period & 127) + (t.linked ? 128 : 0);
		a[1] = t.millis >> 16;
		a[2] = t.millis >> 8;
		a[3] = t.millis;
		a[4] = t.pid == "00" ? "255" : parseInt(t.pid);
		a[5] = tflag + (t.type & 63);
		a[6] = t.type == BasketballPlayType.SUB ? t.pid2 : 0;
		a[7] = 0;
		return a;
	}
	fromByteArray(a) {
		assert(a.length == 8, "Illegal Array Length");
		var t = this;
		t.period = a[0] & 127;
		t.linked = a[0] >= 128;
		t.millis = a[1] * 65536 + a[2] * 256 + a[3];
		t.pid = a[4] == 255 ? "00" : "" + a[4];
		t.type = a[5] & 63;
		var tflag = a[5] & 192;
		t.team = tflag == 128 ? true : (tflag == 64 ? false : null);
		if (t.type == BasketballPlayType.SUB)
			t.pid2 = a[6] == 255 ? "00" : "" + a[6];
		else { } // This is where shot chart position will be loaded
		return this;
	}
}

class BasketballPlayByPlay extends PlayByPlay {
	constructor() {
		super();
	}
	addPlay(p) {
		assert(p.constructor.name == "BasketballPBPItem");
		this.plays.push(p);
	}
	/**
	 * Remove a play from the list of plays
	 * @param {Integer} x Index of play to remove
	 * @param {Boolean} cascade True to cascade delete if linked=true
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
