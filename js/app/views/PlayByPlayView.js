class PlayByPlayView extends View {
	constructor(app, isMobile) {
		super(app);
		var t = this;
		t.setStyle("flexDirection", "column");
		t.cols = ["Team", "Time", "Score", "Play"];
		t.selector = new PeriodTabSelector("Recent");
		t.appendChild(t.selector);
		t.selector.addSelectionListener(t.onSelect.bind(t))
		t.label = new TextField();
		t.label.setStyle("font-size", "1.5em")
			.setStyle("justifyContent", "left")
			.setStyle("marginLeft", "0.2em");
		t.appendChild(t.label);
		t.table = new TableField(t.cols);
		t.appendChild(t.table);
		var pd = "*";
		t.selector.setHighlighted(pd);
		t.onSelect(pd);
	}
	onSelect(e){
		var t = this;
		t.selected = e;
		t.update();
	}
	update(){
		var t = this;
		var p = t.selected;
		var m = t.app.getModel();
		t.label.setHtml(p === "*" ? "Most Recent Plays" : U.getOrdinal(p, true) + "&nbsp;Period Plays");

		var len = p === "*" ? 15 : 0; // N plays for most recent, otherwise show all
		var args = p === "*" ? null : {period: p|0}; // Select from period
		var tmp = m.pbp.getPlays(len, args)[0];
		t.table.setLength(tmp.length);
		var invertOrder = p === "*";
		for(var x = 0; x < tmp.length; x++){
			var ply = tmp[x];
			var ifo = m.getPBPInfo(ply, 2, true);
			var y = invertOrder ? tmp.length - x - 1 : x;
			t.table.setCell(0, y, ifo.team.abbr, true);
			t.table.setCell(1, y, ifo.time);
			t.table.setCell(2, y, ifo.score);
			t.table.setCell(3, y, ifo.play, true);
		}
	}
}