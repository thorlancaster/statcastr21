class TouchManager {
	constructor(appRoot) {
		this.appRoot = appRoot;
		this.gListeners = [];
		this.T_TOL = 60; // Theta-tolerance for gesture direction (Up, Down, Left, Right);
		this.MIN_TAP_TIME = 60; // Minimum ms between touches to count taps
		this.MIN_ANG_MOVE = 55; // Minimum dx+dy to count angle movement
		this.MAX_EDGE_DIST = 9; // If first touch is closer than this to top/bottom, set "fromEnd" flag
		this.WIGGLE_RATIO = 2.2; // How much longer actual finger path has to be than straight finger path to count as wiggle
	}

	log(m) {
		// console.log("TOUCHMANAGER: " + m);
	}

	end() {
		console.error("TouchManager.end() is not implemented");
	}

	addGestureListener(f) {
		var t = this;
		if (!t.gListeners.includes(f))
			t.gListeners.push(f);
	}

	handleGesture(obj) {
		var t = this;
		for (var x = 0; x < t.gListeners.length; x++)
			t.gListeners[x](obj);
	}

	start() {
		var t = this;
		t.touches = []; // Points the user is currently touching
		t.allTouches = []; // All points the user has touched since taking fingers off screen
		t.startTouches = []; // All points the user has started a touch on initially "" ""
		t.numTaps = 0;
		t._distLx = 0;
		t._distLy = 0;
		t.totalDist = 0;
		t.appRoot.addEventListener("touchstart", function (e) {
			// Add changed touches to touch list
			var cts = e.targetTouches;
			t._distLx = cts[0].pageX;
			t._distLy = cts[0].pageY;
			for (var x = 0; x < cts.length; x++) {
				var ct = cts[x];
				var distFromEnd = Math.min(ct.screenY, screen.height - ct.screenY);
				if (t._dist == null)
					t._dist = distFromEnd;
				// console.log("Start " + ct.identifier);
				ct.tTime = Date.now();
				t.touches[ct.identifier] = ct;
				t.allTouches[ct.identifier] = ct;
				if (!t.startTouches[ct.identifier]) {
					t.startTouches[ct.identifier] = ct;
					t.log("Touch started with ID " + ct.identifier);
				}
			}
			if (!t.firstTouchTime)
				t.firstTouchTime = Date.now();
			// e.preventDefault();
			return false;
		});
		t.appRoot.addEventListener("touchmove", function (e) {
			// Add changed touches to touch list
			var cts = e.targetTouches;
			for (var x = 0; x < cts.length; x++) {
				var ct = cts[x];
				t.touches[ct.identifier] = ct;
				var tc = t.allTouches[ct.identifier];
				ct.tTime = tc ? tc.tTime : Date.now();
				t.allTouches[ct.identifier] = ct;
			}
			if (t.allTouches.length === 1) {
				var x = cts[0].screenX;
				var y = cts[0].screenY;
				t.totalDist += Math.sqrt((x - t._distLx) * (x - t._distLx) + (y - t._distLy) * (y - t._distLy));
				t._distLx = x;
				t._distLy = y;
			}
			// if (e.cancelable) // Used to prevent pull-to-refresh. Caused bugs, moved to CSS
			//     e.preventDefault();
			// console.log(t.touches);
		});
		t.appRoot.addEventListener("touchend", function (e) {
			// Remove nonexistent touches from touch list
			var ts = e.targetTouches;

			var timeSinceFirst = 0;
			for (var x = 0; x < t.touches.length; x++) {
				if (t.touches[x]) {
					var eq = false;
					for (var i = 0; i < ts.length; i++) {
						if (t.touches[x].identifier === ts[i].identifier) {
							eq = true;
							break;
						}
					}
					if (!eq) {
						timeSinceFirst = t.touches[x].tTime - t.firstTouchTime;
						t.log("Touch ended with ID " + t.touches[x].identifier);
						t.touches[x] = undefined;
					}
				}
			}
			// for (var x = 0; x < cts.length; x++) {
			//     var ct = cts[x];
			//     t.touches[ct.identifier] = undefined;
			//     console.log("End " + ct.identifier);
			// }

			var touchCount = t.countArr(t.touches);
			t.log("TouchCount- " + touchCount);
			// var timeSinceFirst = 0;
			// var timeSinceFirst = t.allTouches[touch.identifier].tTime - t.firstTouchTime;
			// NOTE: Maybe check if touchEnd was from fingers getting too close together
			if (timeSinceFirst > t.MIN_TAP_TIME) {
				t.log("NumTaps++ " + t.numTaps + " -> " + (t.numTaps + 1));
				t.numTaps++;
			}
			// If all touches are undefined, parse gesture
			// console.log(t.touches);
			// uCanceledBy (UIFramework Canceled By) is set by objects that don't want to count as a touch
			if (touchCount === 0 && t.allTouches.length !== 0) {
				var fromEnd = t._dist < t.MAX_EDGE_DIST;
				t._dist = null;
				var cancel = e.uCanceledBy;
				if (cancel == null) { // Only parse gesture if last TouchEvent wasn't canceled
					var dx = [], dy = []; // Arrays to keep track of how much each point moved
					var dxSum = 0, dySum = 0;
					for (var x = 0; x < t.allTouches.length; x++) {
						var ax = t.allTouches[x];
						var sx = t.startTouches[x];
						if (!ax || !sx) {
							console.warn("Touch array has blank element");
							dx[x] = dy[x] = 0;
							continue;
						}
						dx[x] = ax.pageX - sx.pageX;
						dy[x] = ax.pageY - sx.pageY;
						dxSum += dx[x];
						dySum += dy[x];
						// console.log(dx[x], dy[x]);
					}
					var rtn = {};
					rtn.touches = t.allTouches.length;
					rtn.dx = dxSum / t.allTouches.length;
					rtn.dy = dySum / t.allTouches.length;
					rtn.ang = Math.atan2(rtn.dy, rtn.dx) * (180 / Math.PI);
					rtn.direction = "";
					var wiggle = t.totalDist / (1 + Math.sqrt(rtn.dx * rtn.dx + rtn.dy * rtn.dy));
					if (rtn.touches === 1 && wiggle > t.WIGGLE_RATIO)
						rtn.direction += "wiggle";
					if (Math.abs(rtn.dy) + Math.abs(rtn.dx) > t.MIN_ANG_MOVE)
						rtn.direction += t.getDirection(rtn.ang);

					// Don't support tapping with more than 3 total fingers.
					// It is ergonomically hard to do right and error-prone.
					rtn.taps = rtn.touches <= 3 ? (t.numTaps !== 0 ? t.numTaps - 1 : 0) : 0;
					rtn.fromEnd = fromEnd;
					t.log(JSON.stringify(rtn));
					t.handleGesture(rtn);
				}
				t.allTouches.length = 0;
				t.startTouches.length = 0;
				t.numTaps = 0;
				t.firstTouchTime = 0;
				t.totalDist = 0;
				t._distLx = 0;
				t._distLy = 0;
			}
			return false;
		});
	}

	// Helper function to return the direction from a dy and a dx
	getDirection(ang) {
		var TT = this.T_TOL;
		var dir = "";
		if (ang < -90 + TT && ang > -90 - TT)
			dir += "up";
		if (ang < 90 + TT && ang > 90 - TT)
			dir += "down";
		if (ang < -180 + TT || ang > 180 - TT)
			dir += "left"
		if (ang < TT && ang > -TT)
			dir += "right";
		return dir;
	}


	/**
	 * @param arr Array to count. Can be a sparse array
	 * @returns {number} Number of non-null elements in arr.
	 */
	countArr(arr) {
		var rtn = 0;
		for (var x = 0; x < arr.length; x++)
			rtn += arr[x] == null ? 0 : 1;
		return rtn;
	}
}
