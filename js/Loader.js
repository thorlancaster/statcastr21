class Loader{
	constructor(message) {
		var t = this;
		t.styles = [];
		t.scripts = [];
		t.nScripts = 0;
		t.callback = null;
		t.msg = message;
		t.loadables = [];
	}

	setCallback(f){
		this.callback = f;
	}

	loadStyle(name){
		if(!this.styles.includes(name))
			this.styles.push(name);
	}
	loadScript(name){
		if(!this.scripts.includes(name))
			this.scripts.push(name);
	}
	loadStyles(arr){
		for(var x in arr)
			this.loadStyle(arr[x]);
	}
	loadScripts(arr){
		for(var x in arr)
			this.loadScript(arr[x]);
	}

	dce(n, i){
		var e = document.createElement(n);
		if(i) e.id = i;
		return e;
	}

	/**
	 * Internal callback for when an item loads
	 * @param item
	 */
	ld(item){
		var t = this;
		item.dataset.loaded = "1";
		var sum = 0;
		for(let x in t.loadables){
			if(t.loadables[x].dataset.loaded)
				sum++;
		}
		t.loadBar.style.width = 5+(sum/t.loadables.length)*75 + "%";
		if(sum === t.loadables.length){
			t.nScripts = t.scripts.length;
			t.ldd();
		}
	}

	/**
	 * Internal callback for when all items have loaded
	 * and for loading each script in sequence
	 */
	ldd(){
		var t = this;
		// Insert styles simultaneously
		for(let s in t.styles){
			let e = t.dce("link");
			e.rel = "stylesheet";
			e.href = t.styles[s];
			document.head.appendChild(e);
		}
		t.styles.length = 0;
		// Insert scripts sequentially
		if(t.scripts.length){
			let e = t.dce("script");
			e.src = t.scripts.shift();
			e.addEventListener("load", t.ldd.bind(t));
			t.loadBar.style.width = 100 - 20 * (t.scripts.length / t.nScripts) + "%";
			document.head.appendChild(e);
		}
		else {
			setTimeout(function(){
				t.el.style.opacity = 0;
				t.el.__win__.style.transform = "translate(0, -50vh)";
			}, 200);
			setTimeout(t.ldDone.bind(t), 400);
		}
	}

	ldDone(){
		console.log("Loading complete, starting application...");
		var t = this;
		t.el.parentElement.removeChild(t.el);
		if(t.callback)
			t.callback();
	}

	/**
	 * Shows a splash screen and starts fetching resources in the background
	 * When all resources are fetched, it loads all stylesheets immediately
	 * and scripts sequentially
	 */
	load(){
		var t = this;
		var stl = t.dce("style");
		stl.innerHTML = "@keyframes _ldrMvBg{0%{background-position: 0%;}100%{background-position: 50%;}}";
		var el = t.dce("div");
		el.appendChild(stl);
		el.style.fontFamily = "roboto, sans-serif";
		el.style.color = "#FFF";
		el.style.background = "#334";
		el.style.display = "flex";
		el.style.height = "100vh";
		el.style.justifyContent = "center";
		el.style.alignItems = "center";
		el.style.textAlign = "center";
		el.style.transition = "opacity 0.2s";
		el.style.zIndex = "9999999";
		document.body.appendChild(el);
		var win = t.dce("div");
		win.style.transition = "transform 0.2s";
		win.style.display = "flex";
		win.style.flexDirection = "column";
		win.style.justifyContent = "space-around";
		win.style.height = "8em";
		win.style.width = "14em";
		win.style.maxWidth = "100%";
		el.__win__ = win;
		el.appendChild(win);
		var msg = t.dce("img");
		msg.style.margin = "auto";
		msg.style.marginTop = "0";
		msg.style.width = "5em";
		msg.src = t.msg;
		win.appendChild(msg);
		var barbg = t.dce("div");
		barbg.style.background = "#111";
		barbg.style.border = "1px solid #000";
		var bar = t.dce("div");
		bar.style.width = "5%";
		bar.style.transition = "width 0.2s";
		bar.style.height = "0.5em";
		bar.style.background = "linear-gradient(90deg, #f63, #f13, #f63, #F13, #000, #000)";
		bar.style.backgroundSize = "500%";
		bar.style.animation = "_ldrMvBg 1s linear infinite";
		win.appendChild(barbg);
		barbg.appendChild(bar);
		t.loadBar = bar;
		t.el = el;

		for(let s in t.styles){
			let e = t.dce("link");
			e.rel = "preload";
			e.as = "style";
			e.href = t.styles[s];
			e.addEventListener("load", function(){t.ld(this)});
			t.loadables.push(e);
			document.head.appendChild(e);
		}
		for(let s in t.scripts){
			let e = t.dce("link");
			e.href = t.scripts[s];
			e.rel = "preload";
			e.as = "script";
			e.addEventListener("load", function(){t.ld(this)});
			t.loadables.push(e);
			document.head.appendChild(e);
		}
		if(t.scripts.length === 0 && t.styles.length === 0) {
			t.loadBar.style.width = "100%";
			t.ldd();
		}
	}
}