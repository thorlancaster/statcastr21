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
		t.isAdmin = isAdmin;
		t.sinceLUD = Number.POSITIVE_INFINITY;
		var lbl = new TextField(isAdmin ? "Event Manager" : "Event List").setStyle("fontSize", "1.5em");
		var tbl = new TableField([" ", "ID", "Type", "Teams", "Time"]);
		tbl.enableClickListener(t.tableClick.bind(t));
		var newEvt;
		var ifoBar;
		if(isAdmin) {
			newEvt = new UIPanel().setStyle("width", "fit-content").setStyle("padding", "0.5em");
			var newId = new EditTextField();
			var newBtn = new ButtonField("Create by ID");
			var delBtn = new ButtonField("Delete by ID");
			var pullBtn = new ButtonField("Pull from server");
			newBtn.addClickListener(function () {
				if(newId.getValue() !== "")
					t.createNewEvent(newId.getValue());
				newId.setText("");
			});
			delBtn.addClickListener(function () {
				if(newId.getValue() !== "")
					t.confirmDeleteEvent(newId.getValue());
				newId.setText("")
			});
			pullBtn.addClickListener(function () {
				var d = new OkayDialog("TODO implement pull");
				d.show();
				newId.setText("");
			});
			newEvt.appendChild(newId);
			newEvt.appendChild(newBtn);
			newEvt.appendChild(delBtn);
			newEvt.appendChild(pullBtn);
		}
		else{
			// ifoBar = new TextField("--");
			// ifoBar.align("left");
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

		if(isAdmin) {
			t.loadTableFromLocalStorage();
		}
	}

	createNewEvent(id){
		var t = this;
		var d = new Dialog("Create New Event");
		var o = {teamTown: "Froid-Lake", teamMascot: "Redhawks", teamAbbr: "FML", teamImage: "froidlake.png",
				oppTown: "", oppMascot: "", oppAbbr: "", oppImage: "",
				gender: "HS Boys", location: "Sidney", startTime: "Dow Mon xx x:xx PM",
				specialDesc: "", eventType: "bbgame"}
		var p = new PreferencesField(o, function(e){
			switch(e){
				case "teamTown": return "Team Town";
				case "teamMascot": return "Team Mascot";
				case "teamAbbr": return "Team Abbr";
				case "teamImage": return "Team Image";
				case "oppTown": return "Opp. Town";
				case "oppMascot": return "Opp. Mascot";
				case "oppAbbr": return "Opp. Abbr";
				case "oppImage": return "Opp. Image";
				case "startTime": return "Start Time";
				case "specialDesc": return "Special Desc.";
				case "location": return "Location";
				case "eventType": return "Type";
			}
			return e;
		})
		d.appendChild(new TextField("ID: " + id));
		d.appendChild(p);
		var submitBtn = new ButtonField("Submit");
		submitBtn.addClickListener(function(){
			// Create a new, dummy Synchronizr to save the data. This synchronizr does not open a connection.
			var saveSyn = new SynchronizrManager("Statcastr2");
			saveSyn.setEvent(id);
			saveSyn.setEventInfo(p.getState());
			saveSyn.save(id);
			d.close();
			// After saving the data, reload the table of events
			t.loadTableFromLocalStorage();
		});
		d.appendChild(submitBtn);
		d.show();
	}

	// Calls loadEventsFromLocalStorage to load event infos, then displays them
	loadTableFromLocalStorage(){
		var t = this;
		var evts = t.loadEventsFromLocalStorage();
		t.loadTableFromEvents(evts);
	}

	loadTableFromEvents(evts){
		var t = this;
		t.tbl.clear();
		var row = t.tbl.getLength();
		for(var x in evts){
			var evt = evts[x];
			t.tbl.setCell(1, row, "<a>" + evt.id + "</a>", true);
			t.tbl.setCell(2, row, evt.gender + " " + evt.eventType);
			t.tbl.setCell(3, row, evt.teamAbbr + " vs. " + evt.oppAbbr);
			t.tbl.setCell(4, row, evt.startTime);
			row++;
		}
		if(evts.length === 0){
			t.tbl.setCell(2, row, "No events available");
			row++;
		}
	}


	tableClick(row){
		var t = this;
		t.app.setEvent(t.tbl.getCell(1, row, ), true);
	}

	// Loads the event info of all saved Synchronizr events in local storage
	loadEventsFromLocalStorage(){
		var rtn = [];
		var ns = "Statcastr2";
		var loadSyn = new SynchronizrManager(ns);
		for(var key in localStorage){
			var id = loadSyn.getIdFromStorageKey(key);
			if(id){
				loadSyn.clear();
				loadSyn.setEvent(id);
				loadSyn.load(id);
				var rtnx = loadSyn.getEventInfo();
				rtnx.id = id;
				rtn.push(rtnx);
			}
		}
		return rtn;
	}

	confirmDeleteEvent(id){
		var t = this;
		var d = new ConfirmationDialog("Delete " + id + "?", function(){t.doDeleteEvent(id)});
		d.show();
	}

	doDeleteEvent(id){
		alert("TODO delete " + id);
	}

	tick(dTime){
		var t = this;
		if(!t.isAdmin){
			// t.sinceLUD += dTime; // TODO re-enable for production
			if(t.sinceLUD > 20000){
				t.app.getManager().requestEventList();
				t.sinceLUD = 0;
			}
		}
	}

	updateEventList(data){ // Called as interface
		var rtn = [];
		for(var key in data){
			var val = data[key];
			var tblDataEl = SynchronizrUtils.decodeEventData(val.info);
			tblDataEl.eventType = val.game;
			tblDataEl.id = val.id;
			rtn.push(tblDataEl);
		}
		this.loadTableFromEvents(rtn);
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