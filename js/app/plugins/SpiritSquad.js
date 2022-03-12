class SpiritSquad{
	constructor(){
		var t = this;
	}
	test(){
		// Debugging code goes here. Called after constructor.
	}

	/**
	 * Event handler to call
	 * @param gm GameModel that is being followed
	 */
	onNewPlay(gm){
		console.log(gm);
		var t = this;
		var plays = gm.pbp.plays;
		if(!plays || !plays.length)
			return; // No plays

		var lastPlay = plays[plays.length - 1];

		//*************************************** Calculate Scoring Run ***************************************
		var tScore = lastPlay.rTeamScore;
		var oScore = lastPlay.rOppScore;
		var teamHasRun = false; // Once a run is detected, one of these is set to true
		var oppHasRun = false; // When the other team scores, the run ends
		var runLength = 0; // Keep track of scoring run length
		if(tScore > 0 && oScore > 0) {
			for(var x = plays.length - 1; x >= 0; x--){
				var thisPlay = plays[x];
				var ttScore = thisPlay.rTeamScore;
				var otScore = thisPlay.rOppScore;
				if(ttScore !== tScore){ // Team has scored
					if(oppHasRun){
						runLength = oScore - otScore;
						break;
					} else if(!teamHasRun && !oppHasRun){
						teamHasRun = true;
					}
				}
				if (otScore !== oScore){ // Opp has scored
					if(teamHasRun){
						runLength = tScore - ttScore;
						break;
					} else if(!teamHasRun && !oppHasRun){
						oppHasRun = true;
					}
				}
			}
		} else { // Handle edge case of team having 0 points
			if(tScore > 0){
				runLength = tScore;
				teamHasRun = true;
			} else if(oScore > 0) {
				runLength = oScore;
				oppHasRun = true;
			}
		}
		var runStr = (teamHasRun ? gm.team.town : gm.opp.town) + ": " + runLength + " straight points";
		//************************************** END Calculate Scoring Run *************************************

		// Decide what message to display
		if(runLength >= 6){ // 6r more points is a notable run
			var img = "/resources/mascots/" + (teamHasRun ? gm.team.image : gm.opp.image);
			var ssPanel = new SSToastPanel(runStr, img, img);
			new SSToast(ssPanel);
		} else { // Just for debugging
			console.log(runStr)
		}
	}
}

class SSToastPanel extends UIPanel{
	constructor(msg, img1, img2) {
		super();
		var t = this;
		t.addClass("ssToastPanel");
		if(img1){
			var image1 = new ImageField(img1).setStyle("height", "3em");
			t.appendChild(image1);
		}
		var message = new TextField(msg)
			.setStyle("font-size", "1.5em")
			.setStyle("margin", "0.5em");
		t.appendChild(message);
		if(img2){
			var image2 = new ImageField(img2).setStyle("height", "3em");
			t.appendChild(image2);
		}
	}
}

/**
 * Toast class for Spirit Squad messages
 * Message can either be text or a UIPanel
 */
class SSToast {
	constructor(message, delay1) {
		if(!delay1) delay1 = 2500;
		var delay2 = 500;
		var oldEl = U.DGE("ssToastEl");
		if(oldEl){
			oldEl.parentElement.removeChild(oldEl);
			clearTimeout(oldEl.tTmrId);
		}
		var el = U.DCE("div", "ssToast");
		el.id = "ssToastEl";
		if(typeof message == 'string'){
			var el2 = U.DCE("span");
			el2.innerText = message;
			el.appendChild(el2);
		} else {
			el.appendChild(message.element);
		}
		document.body.appendChild(el);
		el.tTmrId = setTimeout(function(){
			el.classList.add("ending");
			setTimeout(function(){
				if(el.parentElement)
					el.parentElement.removeChild(el);
			}, delay2);
		}, delay1);
		setTimeout(function (){
			el.style.top = "1em";
		}, 1);
	}
}
