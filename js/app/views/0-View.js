class View extends UIPanel{
	constructor(app) {
		super();
		var t = this;
		t.app = app;
		t.addClass("view");
	}
	delete(){
		var e = this.getElement();
		if(e && e.parentElement)
			e.parentElement.removeChild(e);
	}
	tick(){
	}
}