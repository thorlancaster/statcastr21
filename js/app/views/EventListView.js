class EventListView extends View{
	constructor(app, isAdmin) {
		// TODO left off about to implement isAdmin
		//  First implement a normal list that polls EventListPrefs cache and the server
		//  Second, implement an admin list that feeds off EventListPrefs exclusively
		//  And only updates events from the server if requested.
		//  When updating from the server, this should ask if you want to delete old events
		//  when you fetch and events that you have are gone
		super(app);
		var t = this;
		t.sinceLUD = Number.POSITIVE_INFINITY;
		var lbl = new TextField("Event Manager").setStyle("fontSize", "1.5em");
		var tbl = new TableField(["ID", "Game", "Teams", "Time"]);
		var newEvt;
		var ifoBar;
		if(isAdmin) {
			newEvt = new UIPanel().setStyle("width", "fit-content");
			var newId = new EditTextField();
			var newBtn = new ButtonField("Create by ID");
			var delBtn = new ButtonField("Delete by ID");
			newBtn.addClickListener(function () {
				t.createNewEvent(newId.getValue());
				newId.setText("");
				t.reloadTbl()
			});
			delBtn.addClickListener(function () {
				t.deleteEvent(newId.getValue());
				newId.setText("")
			});
			newEvt.appendChild(newId);
			newEvt.appendChild(newBtn);
			newEvt.appendChild(delBtn);
		}
		else{
			ifoBar = new TextField("--");
			ifoBar.align("left");
		}
		t.lbl = lbl;
		t.tbl = tbl;
		t.setStyle("flexDirection", "column");
		t.appendChild(lbl);
		t.appendChild(tbl);
		if(newEvt)
			t.appendChild(newEvt);
		if(ifoBar)
			t.appendChild(ifoBar);
	}

	tick(dTime){
		var t = this;
		// t.sinceLUD += dTime; // TODO re-enable for production
		if(t.sinceLUD > 20000){
			t.app.getManager().requestEventList();
			t.sinceLUD = 0;
		}
	}

	updateEventList(data){ // Called as interface
		this.updateEvtSelTbl(data);
	}

	// Update the Event Table from received data
	updateEvtSelTbl(arr) {
		var t = this;
		var tbl = t.tbl;
		// tbl.setLength(arr.length);
		var cnt = 0;
		for (var i in arr) {
			var arrx = arr[i];
			debugger;
			var r = GameModel.parseSingleEvent(arrx);
			tbl.setCell(0, cnt, "<span class='link'>" + arrx.id + "</a>", true);
			tbl.setCell(1, cnt, r.gender + " " + GameModel.getSportName(arrx.game));
			tbl.setCell(2, cnt, r.hAbbr + " vs. " + r.gAbbr);
			tbl.setCell(3, cnt, r.startTime);
			cnt++;
		}
	}

	// reloadTbl(){
	// 	this.updateEvtSelTbl(this._syn.listLocalEvents());
	// }
	//
	// deleteEvent(id){
	// 	var t = this;
	// 	var exists = t._syn.canLoadFromStorage(id);
	// 	if(exists){
	// 		var dlg = new ConfirmationDialog("Delete #" + id + '?', function(){
	// 			dlg.close();
	// 			t._syn.deleteLocalEvent(id);
	// 			new Toast("Event #" + id + " deleted");
	// 			t.reloadTbl()
	// 		});
	// 		dlg.show();
	// 	}
	// 	else{
	// 		var dlg = new Dialog("Can't delete event");
	// 		dlg.appendChild(new TextField("Event does not exist"));
	// 		dlg.show();
	// 	}
	// }
	//
	// createNewEvent(id){
	// 	var t = this;
	// 	var rtn = t._syn.createLocalEvent(id, new BasketballGameModel().getTemplate());
	// 	if(!rtn){
	// 		var dlg = new Dialog("Can't create event");
	// 		dlg.appendChild(new TextField("Event Already Exists"));
	// 		dlg.show();
	// 	}
	// }
}