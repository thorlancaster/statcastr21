/**
 * TabSelector that is pre-populated with periods 1-9, with 4 periods enabled
 * Used for displaying per-period stats
 */
class PeriodTabSelector extends TabSelector{
	constructor(name){
		super();
		var t = this;
		name = name == null ? "All" : name;
		t.addTab(name, "*");
		for(var x = 1; x < 10; x++){
			t.addTab("P<u>"+x+"</u>", ""+x);
		}
		t.setHighlighted("*");
		t.setMaxVisible(5);
	}
}

/**
 * The header at the top of most views that shows:
 * The home team name and icon,
 * The home team score,
 * The clock,
 * The guest team score,
 * and finally the guest team name and icon.
 */
class ScoreDisplayHeader extends UIPanel{
	constructor(){
		super();
		var t = this;
		t.addClass("scoreDisplayHeader");
		t.setStyle("height", "4em").setStyle("background", "var(--main-bg2)");
		t.home = new ScoreDisplayHeaderTeam("TEAM", "")
			.setStyle("width", "8em").setElasticity(0.001);
		t.guest = new ScoreDisplayHeaderTeam("OPPONENT", "")
			.setStyle("width", "8em").setElasticity(0.001);
		t.homeScore = new NumberField("1xX").setStyle("width", "9em").setElasticity(0.001).addClass("scoreboardHomeScore");
		t.guestScore = new NumberField("1xX").setStyle("width", "9em").setElasticity(0.001).addClass("scoreboardGuestScore");
		t.clock = new NumberField("PX nX:XX").setStyle("width", "24em").setElasticity(0.001);
		t.appendChild(t.home);
		t.appendChild(t.homeScore);
		t.appendChild(new UIPanel());
		t.appendChild(t.clock);
		t.appendChild(new UIPanel());
		t.appendChild(t.guestScore);
		t.appendChild(t.guest);
	}
	calcSize(){
		super.calcSize();
		this.width = this.element.innerWidth;
	}
	applySize(){
		super.applySize();
		this.updateNameText();
		var mobile = false;
		this.setStyle("height", mobile?"3em":"4em");
	}
	setStateFromModel(m){
		var t = this;
		var gTime = m.clock.getTime();
		t.teamName = m.team.name;
		t.teamAbbr = m.team.abbr;
		t.oppName = m.opp.name;
		t.oppAbbr = m.opp.abbr;
		t.home.image.setSrc(m.team.getImagePath());
		t.guest.image.setSrc(m.opp.getImagePath());
		t.updateNameText();
		t.clock.setLitColorOverride(m.clock.running ? "#0F2" : null);
		t.clock.setValue(m.clock.period * 10000 + gTime.minutes * 100 + gTime.seconds);
		t.homeScore.setValue(m.team.getStat("points"));
		t.guestScore.setValue(m.opp.getStat("points"));
	}
	updateNameText(){
		var t = this;
		var ab = true; // TODO use preferred values for mobile and abbreviated
		var mobile = true;
		t.guest.name.setText(ab && mobile ? t.oppAbbr : t.oppName);
		t.home.name.setText(ab && mobile ? t.teamAbbr : t.teamName);
	}
}
class ScoreDisplayHeaderTeam extends UIPanel{
	constructor(name, image){
		super();
		var t = this;
		t.setStyle("flexDirection", "column")
		t.image = new ImageField(image);
		t.name = new TextField(name);
		t.name.setStyle("height", "1em").setElasticity(0);
		t.appendChild(t.image);
		t.appendChild(t.name);
	}
}
