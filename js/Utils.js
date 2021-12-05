class Utils{
	constructor() {
	}
	dge(n){
		return document.getElementById(n);
	}
	dce(tag, id, cls){
		var rtn = document.createElement(tag);
		if(id) rtn.id = id;
		if(cls) rtn.className = cls;
		return rtn;
	}
}
var U = new Utils();