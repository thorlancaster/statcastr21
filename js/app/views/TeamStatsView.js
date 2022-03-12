
class TeamStatsView extends View {
	constructor(app, isTeam, isMobile) {
		super(app);
		var t = this;
		t.isTeam = isTeam;
		t.setStyle("flexDirection", "column");
		t.cols = ["Player", "PTS", "FT", "2", "3", "FLS", "REB", "TO", "ST", "MIN"];
		t.selector = new PeriodTabSelector();
		t.selector.addSelectionListener(t.onSelect.bind(t));
		t.label = new TextField();
		t.label.setStyle("font-size", "1.5em")
			.setStyle("justifyContent", "left")
			.setStyle("marginLeft", "0.2em");
		t.appendChild(t.selector);
		t.appendChild(t.label);
		t.table = new TableField(t.cols);
		t.appendChild(t.table);
		var pd = t.app.getSessionPrefs().get("period", "*");
		t.selector.setHighlighted(pd);
		t.onSelect(pd);
	}
	onSelect(e){
		var t = this;
		t.app.getSessionPrefs().set("period", e);
		t.selected = e;
		t.update();
	}
	update(){
		var t = this;
		var tbl = t.table;
		var s = t.selected;
		var m = t.app.getModel();
		var fullTeam = m.getTeam(t.isTeam);
		var team = s === "*" ? fullTeam : m.getSubStats(s - 1).getTeam(t.isTeam);
		var perStr = s === "*" ? "&nbsp;Full" : "&nbsp;" + U.getOrdinal(s) + "&nbsp;Period";
		t.label.setHtml(fullTeam.getTown() + perStr + "&nbsp;Box Score");
		var pls = team.getPlayers();
		var idx = 0;
		for(var x in pls){
			var p = pls[x];
			tbl.setCell(0, idx, p.getStr(t.isTeam), true);
			tbl.setCell(1, idx, p.points);
			tbl.setCell(2, idx, p.ftStr);
			tbl.setCell(3, idx, p.p2Made);
			tbl.setCell(4, idx, p.p3Made);
			tbl.setCell(5, idx, p.fouls);
			tbl.setCell(6, idx, p.rebounds);
			tbl.setCell(7, idx, p.turnovers);
			tbl.setCell(8, idx, p.steals);
			tbl.setCell(9, idx, p.getPlayTimeStr(m.getClock().millisLeft));
			idx++;
		}
	}
}