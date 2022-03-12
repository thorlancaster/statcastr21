class ScoreboardView extends View {
	constructor(app, isMobile) {
		super(app);
		var t = this;
		t.addClass("viewFull");
		t.addClass("scoreboard");
		t.leftPFP = new ScoreboardPFP();
		t.rightPFP = new ScoreboardPFP();
		t.mainScore = new ScoreboardMain();

		t.leftPFP.setStyle("width", "20%");
		t.mainScore.setStyle("width", "60%");
		t.rightPFP.setStyle("width", "20%");
		t.setStyle("borderBottom", "var(--border-large) solid var(--border-color)");

		t.element.style.setProperty("--border-large", "4px");
		t.element.style.setProperty("--border-small", "2px");
		t.element.style.setProperty("--border-color", "#AAA");

		t.appendChild(t.leftPFP);
		t.appendChild(t.mainScore);
		t.appendChild(t.rightPFP);

		t.applyStyle(app.getStyle());
		t.resize();
		t.update();
	}

	update() {
		var t = this;
		var m = t.app.getModel();
		t._updatePBP(t.leftPFP, m.team.onCourt());
		t._updatePBP(t.rightPFP, m.opp.onCourt());
		t.mainScore.updateModel(m);
		super.update();
	}

	_updatePBP(pbpEl, players) {
		var t = this;
		for (var x = 0; x < pbpEl.items.length; x++) {
			pbpEl.items[x].updatePlayer(players[x]);
		}
	}

	resize() {
		super.resize();
		var w = window.innerWidth;
		var h = window.innerHeight;
		if(h > w * 0.7) h = w * 0.7;
		if(h < w * 0.3) h = w * 0.3;
		try{
			h -= document.getElementsByClassName("mainTabSelector")[0].scrollHeight
		} catch(e){} // TODO this is a dirty(ish) bodge
		h-=2; // And so is this
		this.setStyle("height", h + "px").setStyle("fontSize", w * 0.014 + "px");
	}
}

class ScoreboardPFP extends UIPanel {
	constructor() {
		super();
		var t = this;
		t.addClass("scoreboardPFP");
		t.setStyle("flexDirection", "column");
		t.items = [];
		var header = new ScoreboardPFPHeader();
		header.setStyle("height", "1.5em");
		header.setElasticity(0);
		t.appendChild(header);
		for (var x = 0; x < 5; x++) {
			t.items[x] = new ScoreboardPFPItem();
			t.appendChild(t.items[x]);
		}
	}
}

class ScoreboardPFPHeader extends UIPanel {
	constructor() {
		super();
		var t = this;
		t.addClass("scoreboardPFPHeader");
		t.plLabel = new TextField("#");
		t.flLabel = new TextField("FLS");
		t.ptLabel = new TextField("PTS");
		var c = [t.plLabel, t.flLabel, t.ptLabel];
		for (let x in c) {
			c[x].setStyle("fontSize", "1.8em").setStyle("width", "33.34%").setElasticity(0);
			t.appendChild(c[x]);
		}
	}
}

class ScoreboardPFPItem extends UIPanel {
	constructor() {
		super();
		var t = this;
		t.addClass("scoreboardPFPItem");
		t.setStyle("flexDirection", "column");
		t.setStyle("border-top", "var(--border-small) solid var(--border-color)");
		t.playerName = new TextField("Player Name");
		t.playerName.setElasticity(0)
			.setStyle("fontSize", "1.5em")
			.setStyle("height", "1em")
			.setStyle("justifyContent", "left")
			.setStyle("paddingLeft", "0.1em");
		t.playerNum = new NumberField("XX").addClass("scoreboardPFPPlayerNum");
		t.foulsNum = new NumberField("XX").addClass("scoreboardPFPPlayerFouls");
		t.pointsNum = new NumberField("XX").addClass("scoreboardPFPPlayerPoints");
		var nums = new UIPanel()
		t.appendChild(t.playerName);
		t.appendChild(nums);
		nums.appendChild(t.playerNum);
		nums.appendChild(new UIPanel().setStyle("width", "8%").setElasticity(0));
		nums.appendChild(t.foulsNum);
		nums.appendChild(new UIPanel().setStyle("width", "8%").setElasticity(0));
		nums.appendChild(t.pointsNum);
	}

	updatePlayer(ply) {
		var t = this;
		if (!ply) return;
		t.playerName.setText(ply.name);
		t.playerNum.setValue(ply.id);
		t.foulsNum.setValue(ply.fouls);
		t.pointsNum.setValue(ply.points);
	}
}

/**
 * Displays the period number and a label called period.
 * TODO add possession arrow?
 */
class ScoreboardPeriodArea extends UIPanel {
	constructor() {
		super();
		var t = this;
		t.setStyle("flexDirection", "column");
		t.setStyle("fontSize", "2em");
		t.label = new TextField("PERIOD")
		t.label.setStyle("height", "1.1em");
		t.label.setElasticity(0);
		t.number = new NumberField("X").addClass("scoreboardPeriod");
		t.appendChild(t.label);
		t.appendChild(t.number);
	}

	setValue(val) {
		this.number.setValue(val);
	}
}

/**
 * Displays the main body of the scoreboard, excluding Player-Fouls-Points
 */
class ScoreboardMain extends UIPanel {
	constructor() {
		super();
		var t = this;
		t.addClass("scoreboardMain");
		t.setStyle("flexDirection", "column");
		t.setStyles("border-left", "border-right", "var(--border-large) solid var(--border-color)");
		t.homeImage = new ImageField();
		t.guestImage = new ImageField();
		t.clock = new NumberField("xX:XX").addClass("scoreboardClock");
		t.homeName = new TextField("TEAM").setStyle("fontSize", "1.5em");
		t.guestName = new TextField("OPPONENT").setStyle("fontSize", "1.5em");
		t.homeScore = new NumberField("xxX").addClass("scoreboardHomeScore");
		t.period = new ScoreboardPeriodArea().setStyle("width", "20%").setElasticity(0);
		t.guestScore = new NumberField("xxX").addClass("scoreboardGuestScore");
		t.homeFouls = new NumberField("xX").setElasticity(0).setStyle("width", "20%").addClass("scoreboardHomeFouls");
		t.playerFoul = new NumberField("XX X").setStyle("width", "30%");
		t.guestFouls = new NumberField("xX").setElasticity(0).setStyle("width", "20%").addClass("scoreboardGuestFouls");

		t.row1 = new UIPanel(); // HomeImage Clock GuestImage
		t.row1.element.classList.add("scoreboardRow1");
		t.homeImage.setStyle("width", "30%");
		t.clock.setStyle("width", "40%");
		t.guestImage.setStyle("width", "30%");
		t.row1.setStyle("height", "25%");
		t.row1.appendChild(t.homeImage);
		t.row1.appendChild(t.clock);
		t.row1.appendChild(t.guestImage);

		t.row2 = new UIPanel();
		t.row2.element.classList.add("scoreboardRow2");
		t.gameLbl = new TextField("Uhhh");
		t.homeName.setStyle("width", "30%");
		t.guestName.setStyle("width", "30%");
		t.gameLbl.setStyle("width", "40%");
		t.row2.setStyle("height", "5%");
		t.row2.appendChild(t.homeName);
		t.row2.appendChild(t.gameLbl);
		t.row2.appendChild(t.guestName);

		t.row3 = new UIPanel(); // HomeScore Period GuestScore
		t.row3.element.classList.add("scoreboardRow3");
		t.row3.setStyle("height", "30%");
		t.row3.appendChild(t.homeScore);
		t.row3.appendChild(new UIPanel().setStyle("width", "1.5%").setElasticity(0));
		t.row3.appendChild(t.period.setStyle("width", "25%"));
		t.row3.appendChild(new UIPanel().setStyle("width", "1.5%").setElasticity(0));
		t.row3.appendChild(t.guestScore);

		t.row4 = new UIPanel();
		t.row4.element.classList.add("scoreboardRow4");
		t.row4.setStyle("height", "10%");

		t.row5 = new UIPanel();
		t.row5.element.classList.add("scoreboardRow5");
		t.row5.setStyle("height", "5%");
		t.row5.appendChild(new TextField("FOULS").setStyle("fontSize", "1.5em"));
		t.row5.appendChild(new UIPanel().setElasticity(0).setStyle("width", "15%"));
		t.row5.appendChild(new TextField("PLAYER - FOUL").setStyle("fontSize", "1.5em"));
		t.row5.appendChild(new UIPanel().setElasticity(0).setStyle("width", "15%"));
		t.row5.appendChild(new TextField("FOULS").setStyle("fontSize", "1.5em"));

		t.row6 = new UIPanel(); // HomeFouls [EMPTY] Player-Foul [EMPTY] GuestFouls
		t.row6.element.classList.add("scoreboardRow6");
		t.row6.setStyle("height", "20%");
		t.row6.appendChild(t.homeFouls);
		t.row6.appendChild(new UIPanel().setElasticity(0).setStyle("width", "15%"));
		t.row6.appendChild(t.playerFoul);
		t.row6.appendChild(new UIPanel().setElasticity(0).setStyle("width", "15%"));
		t.row6.appendChild(t.guestFouls);

		t.appendChild(t.row1);
		t.appendChild(t.row2);
		t.appendChild(t.row3);
		t.appendChild(t.row4);
		t.appendChild(t.row5);
		t.appendChild(t.row6);
	}

	updateModel(m) {
		var t = this;
		t.clock.setValue(m.clock.getTimeStr());
		if (m.team.image)
			t.homeImage.setSrc(m.team.getImagePath());
		if (m.opp.image)
			t.guestImage.setSrc(m.opp.getImagePath());

		t.gameLbl.setText(m.gender);
		t.homeName.setText(m.team.name);
		t.guestName.setText(m.opp.name);

		t.period.setValue(m.clock.period);
		t.homeScore.setValue(m.team.getStat("points"));
		t.guestScore.setValue(m.opp.getStat("points"));

		t.playerFoul.setValue(m.getLastPlayerFoul(120000));
		t.homeFouls.setValue(m.team.getStat("fouls"));
		t.guestFouls.setValue(m.opp.getStat("fouls"));
	}
}


















