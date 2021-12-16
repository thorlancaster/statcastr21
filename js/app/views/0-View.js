class View extends UIPanel{
	constructor(app) {
		super();
		var t = this;
		t.app = app;
		t.addClass("view");
	}
	delete(){
		this.getElement().parentElement.removeChild(this.getElement());
	}
	tick(){
	}
}