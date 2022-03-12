// noinspection JSSuspiciousNameCombination

class UIPanel {
	constructor() {
		this.element = U.DCE("div", "uiPanel");
		this.children = [];
	}

	appendChild(el) {
		if (el instanceof UIPanel) {
			this.element.appendChild(el.element);
			if (!this.children.includes(el))
				this.children.push(el);
		}
		else
			this.element.appendChild(el);
		return this;
	}

	prependChild(el) {
		if (el instanceof UIPanel) {
			this.element.prepend(el.element);
			if (!this.children.includes(el))
				this.children.unshift(el);
		}
		else
			this.element.prepend(el);
		return this;
	}

	removeChild(el) {
		try {
			if (el instanceof UIPanel) {
				this.element.removeChild(el.element);
				var idx = this.children.indexOf(el);
				if (idx !== -1)
					this.children.splice(idx, 1);
			}
			else
				this.element.removeChild(el);
			return this;
		} catch (e) {
			return this;
		}
	}

	removeAll() {
		this.children.length = 0;
		var e = this.element;
		while (e.firstChild) {
			e.firstChild.remove();
		}
	}

	/**
	 * Function to call when this element's size changes.
	 * This function recursively calculates the size for all children,
	 * and then recursively applies the sizes.
	 * @caution To avoid layout thrashing, call this function on the root if possible
	 */
	resize() {
		this.calcSize();
		this.applySize();
	}

	/**
	 * Apply a JSON-based style to this object and its children.
	 * The style can either be a JSON object in the form of
	 * {class: {key1: value1, key2:value2...}, class2...}
	 * or an array of such objects.
	 * @param obj JSON style object
	 */
	applyStyle(obj) {
		if (Array.isArray(obj)) {
			for (var i = 0; i < obj.length; i++) {
				for (var x = 0; x < this.children.length; x++) {
					this.children[x].applyStyle(obj[i]);
				}
			}
		} else {
			for (var x = 0; x < this.children.length; x++) {
				this.children[x].applyStyle(obj);
			}
		}
	}
	update() {
		for (var x = 0; x < this.children.length; x++) { this.children[x].update(); }
	}
	calcSize() {
		for (var x = 0; x < this.children.length; x++) { this.children[x].calcSize(); }
	}
	applySize() {
		for (var x = 0; x < this.children.length; x++) { this.children[x].applySize(); }
	}

	/**
	 * Get a property from a style object
	 * @param obj style object
	 * @param property name of property to get
	 * @param oldVal value to return if style not found
	 */
	getApplyStyle(obj, property, oldVal) {
		var cls = this.element.classList;
		for (var x = 0; x < cls.length; x++) {
			var c = cls[x];
			if (obj[c] && obj[c][property]) {
				return obj[c][property];
			}
		}
		return oldVal;
	}

	getElement() {
		return this.element;
	}

	addClass(name) {
		this.element.classList.add(name); return this;
	}
	removeClass(name) {
		this.element.classList.remove(name); return this;
	}
	hasClass(name) {
		return this.element.classList.contains(name);
	}

	hide() { this.setStyle("display", "none"); }
	show() { this.setStyle("display", null); }
	align(side) {this.setStyle("justify-content", side); }

	setStyle(name, value) { this.element.style[name] = value; return this; }
	setStyles(n1, n2, v) {
		this.setStyle(n1, v);
		this.setStyle(n2, v);
		return this;
	}
	// Shortcut to set flex-grow and flex-shrink.
	// Higher values makes the element more stretchy
	setElasticity(x) {
		this.setStyle("flexGrow", x);
		this.setStyle("flexShrink", x);
		return this;
	}
}


class TextField extends UIPanel{
	constructor(txt, useHtml){
		super();
		this.addClass("textField");
		if(txt != null){
			if(useHtml) this.setHtml(txt);
			else this.setText(txt);
		}
	}
	getHtml(){
		return this.element.innerHTML;
	}
	getText(){
		return this.element.textContent;
	}
	setText(txt){
		this.element.textContent = txt; return this;}
	setHtml(html){
		this.element.innerHTML = html; return this;}
}

class LoadingField extends TextField{
	constructor(){
		super("<div class='lds-ring'><div></div><div></div><div></div><div></div></div>", true);
		this.setStyle("textAlign",  "center");
	}
}

class EditTextField extends UIPanel{
	constructor(txt, sz){
		super();
		var t = this;
		t.addClass("editTextField");
		t.input = U.DCE("input");
		t.input.type = "text";
		t.element.appendChild(t.input);
		if(txt != null)
			t.setText(txt);
		if(sz != null)
			t.setSize(sz);
	}
	getText(){
		return this.input.value;
	}
	getValue(){
		return this.getText();
	}
	setText(txt){
		this.input.value = txt; return this;
	}
	setSize(x){
		this.input.size = x;
	}
}

// TODO we need a SimpleButtonField with less weight
class ButtonField extends UIPanel {
	constructor(btnText, fullSize, useHtml) {
		super();
		var t = this;
		t.LONG_PRESS_TIME = 500;
		t.clickListeners = [];
		t.longClickListeners = [];
		t.adjustListeners = [];
		t.setFullSize(fullSize);
		t.btn = U.DCE("button");
		t.mouseTmr = 0; // Timer for long press - mouse
		t.touchTmr = 0; // Timer for long press - touch
		t._origY = null; // Original y-coordinate for button drag
		t.adjustDivider = 1;
		t.addClass("buttonField");
		t.appendChild(t.btn);
		if (useHtml)
			t.setHtml(btnText);
		else
			t.setText(btnText);
		t.btn.addEventListener("click", t.click.bind(t));
		t.btn.addEventListener("mousedown", function (e) {
			t.mouseTmr = setTimeout(t.longClickMouse.bind(t), t.LONG_PRESS_TIME);
			t.mouseLKD = false;
		});
		t.btn.addEventListener("mouseleave", t.LCMCancel.bind(t));
		t.btn.addEventListener("mouseup", t.LCMCancel.bind(t));

		t.btn.addEventListener("touchstart", function(e){
			t.touchTmr = setTimeout(t.longClickTouch.bind(t), t.LONG_PRESS_TIME);
			t.touchLKD = false;
		});
		t.btn.addEventListener("touchmove", function(e){
			// console.log("TouchMove", e);
			if(e.targetTouches.length > 1)
				t.LCTCancel();
			else {
				var touch = e.targetTouches[0];
				var el = document.elementFromPoint(touch.clientX, touch.clientY);
				if(touch.target !== el){
					t.LCTCancel();
					if(t._origY == null){
						t._origY = touch.screenY;
						t._adivDx = 0;
						t._adjMs = Date.now();
					}
				}
				if(t._origY != null){
					var diff = touch.screenY - t._origY;
					var diffDiv = Math.round(diff / t.adjustDivider);
					if(diffDiv !== t._adivX){
						var o = t._adivX | 0;
						var tm = Date.now();
						t._adivX = diffDiv;
						t.adjust(diffDiv, false, t._adivX - o, tm - t._adjMs);
						t._adjMs = tm;
					}
				}
			}
		});
		t.btn.addEventListener("touchend", function (e) {
			if(t._origY != null){
				t.adjust(t._adivX, true, 0, Date.now() - t._adjMs);
			}
			t._origY = null;
			t._adivX = null;
			t.LCTCancel();
			if (!t.enabled) return;
			e.uCanceledBy = t;
		});
		t.enabled = true;
	}

	setButtonStyle(name, value){
		this.btn.style[name] = value;
		return this;
	}

	LCMCancel(){ // Long Click - Mouse - Cancel
		var t = this;
		if (t.mouseTmr) clearTimeout(t.mouseTmr); t.mouseTmr = 0;
	}

	LCTCancel(){ // Long Click - Touch - Cancel
		var t = this;
		if (t.touchTmr) clearTimeout(t.touchTmr); t.touchTmr = 0;
	}

	longClickMouse(){
		if(this.mouseLKD) return;
		this.mouseLKD = true;
		this.longClick();
	}
	longClickTouch(){
		if(this.touchLKD) return;
		this.touchLKD = true;
		this.longClick();
	}

	longClick(){
		for (var x = 0; x < this.longClickListeners.length; x++)
			this.longClickListeners[x](this);
	}

	adjust(amt, done, diff, dTime){
		for (var x = 0; x < this.adjustListeners.length; x++)
			this.adjustListeners[x](this, amt, done, diff, dTime);
	}
	setAdjustDivider(a){
		this.adjustDivider = a;
	}

	click(e) {
		var t = this;
		if (!t.kbSupported && e && e.offsetX === 0 && e.offsetY === 0 && e.pageX === 0 && e.pageY === 0
			&& e.screenX === 0 && e.screenY === 0)
			return;
		if (!t.enabled)
			return; // Disabled
		if(t.mouseLKD) // Long Click disable
			return;
		// console.log("Click");
		for (var x = 0; x < t.clickListeners.length; x++)
			t.clickListeners[x](this);
		t.btn.classList.add("click");
		if (t.timeout)
			clearTimeout(t.timeout);
		t.timeout = setTimeout(function () {
			t.btn.classList.remove("click");
		}, 100);
	}
	setKeyboardSupport(x) {
		this.kbSupported = x;
	}
	setBorderColor(col) {
		this.btn.style.borderColor = col;
		return this;
	}
	setBgColor(col) {
		this.btn.style.background = col;
		return this;
	}
	setfgColor(col) {
		this.btn.style.color = col;
		return this;
	}
	setBorder(bd) {
		this.btn.style.border = bd;
		return this;
	}
	setEnabled(e) {
		var t = this;
		t.enabled = e;
		if (!e) t.btn.classList.add("disabled");
		else t.btn.classList.remove("disabled");
	}
	setSelected(sel) {
		var c = this.btn.classList;
		if (sel) c.add("sel");
		else c.remove("sel");
	}
	setFullSize(sz) {
		if (sz) this.addClass("fullSize");
		else this.removeClass("fullSize");
		return this;
	}
	setText(t) {
		this.btn.innerText = t;
		return this;
	}
	getText() {
		return this.btn.innerText;
	}
	setHtml(t) {
		this.btn.innerHTML = t;
		return this;
	}
	setFontSize(sz) {
		this.btn.style.fontSize = sz;
		return this;
	}
	addClickListener(f) {
		if (!this.clickListeners.includes(f))
			this.clickListeners.push(f);
		return this;
	}
	addLongClickListener(f) {
		if (!this.longClickListeners.includes(f))
			this.longClickListeners.push(f);
		return this;
	}
	addAdjustListener(f) {
		if (!this.adjustListeners.includes(f))
			this.adjustListeners.push(f);
		return this;
	}
}


class CheckboxField extends UIPanel {
	constructor(initVal) {
		super();
		var t = this;
		var label = U.DCE("label", "switch");
		var input = U.DCE("input");
		t.box = input;
		input.type = "checkbox";
		if(initVal)
			input.checked = true;
		var span = U.DCE("span", "slider");
		label.appendChild(input);
		label.appendChild(span);
		t.element.appendChild(label);
		t.addClass('checkboxField');
	}
	setValue(bool){
		this.box.checked = bool;
	}
	getValue(){
		return this.box.checked;
	}
}


class Dialog{
	constructor(name){
		// console.log("Dialog " + name);
		var t = this;
		t.panel = new UIPanel().addClass("dialog"); // Covers the page
		t.panel.setStyle("position", "fixed").setStyles("width", "height", "100%")
			.setStyle("top", "0")
			.setStyle("fontSize", "1.0em")
			.setStyle("background", "var(--semitransparent-bg)")
			.setStyle("display", "flex")
			.setStyles("align-items", "justify-content", "center");
		t.box = new UIPanel().addClass("dialogBox")
			.setStyle("minWidth", "16em")
			.setStyle("minHeight", "8em")
			.setStyles("maxWidth", "maxHeight",  "95%")
			.setStyle("background", "var(--main-bg2)")
			.setStyle("position", "absolute")
			.setStyle("flex-direction", "column");
		t.panel.appendChild(t.box);
		t.titleHolder = new UIPanel().setStyle("height", "1.2em")
			.setStyle("border-bottom", "1px solid var(--main-bg1)")
			.setStyles("flex-grow", "flex-shrink", "0")
			.setStyle("fontSize", "1.5em");
		t.titleBar = new TextField(name, true);
		t.titleHolder.appendChild(t.titleBar);
		t.closeBtn = new ButtonField("X").setStyle("flexGrow", "0")
			.setBgColor("#F00").setBorder("0px");
		t.titleHolder.appendChild(t.closeBtn);
		t.box.appendChild(t.titleHolder);
		t.body = new UIPanel().setStyle("overflow", "visible")
			.setStyle("padding", "0.5em").setStyle("flexDirection", "column")
			.setStyle("height", "-moz-fit-content").setStyle("height", "fit-content")
			.setStyle("height", "-webkit-fit-content");
		var hldr = new UIPanel().setStyle("overflow", "auto");
		hldr.appendChild(t.body);
		t.box.appendChild(hldr);

		t.closeBtn.addClickListener(function(){
			t.close();
		});
	}
	setId(id){
		this.panel.element.id = id;
	}
	appendChild(el){this.body.appendChild(el);}
	prependChild(el){this.body.prependChild(el);}
	removeChild(el){this.body.removeChild(el);}
	setCloseEnabled(n){
		this.closeBtn.setEnabled(n);
	}
	close(){
		var t = this;
		var res = t.onClose ? t.onClose() : null;
		if(res !== false)
			t.remove();
	}
	setTitle(str){
		this.titleBar.setText(str);
	}
	show(){
		var t = this;
		setTimeout(function(){
			t.panel.addClass("showing");
		}, 0);
		document.body.appendChild(t.panel.element);
	}
	remove(){
		var t = this;
		t.panel.removeClass("showing");
		t.box.setStyle("pointerEvents", "none");
		setTimeout(function(){
			var e = t.panel.element;
			if(e.parentElement)
				e.parentElement.removeChild(e);
		}, 150);
	}
	static isOpen(){
		return document.getElementsByClassName("dialogBox").length;
	}

	static isOpenById(str){
		var el = DGE(str);
		return el != null;
	}

	static removeById(str){
		var el = DGE(str);
		if(el){
			el.classList.remove("showing");
			setTimeout(function(){if(el.parentElement) el.parentElement.removeChild(el)}, 150);
		}
	}
}

class ConfirmationDialog extends Dialog{
	constructor(name, fn){
		super(name);
		var btn = new ButtonField("Confirm").setStyle("fontSize", "1.3em").setStyle("marginTop", "1em");
		this.body.appendChild(btn);
		btn.addClickListener(fn);
	}
}

class OkayDialog extends Dialog{
	constructor(name, text){
		super(name);
		var t = this;
		var btn = new ButtonField("OK").setStyle("fontSize", "1.3em").setStyle("marginTop", "1em");
		var txt = new TextField(text, true);
		t.body.appendChild(txt);
		t.body.appendChild(btn);
		btn.addClickListener(function(){
			t.remove();
		});
	}
}



/**
 * Class to display an Image element, maintaining its aspect ratio
 */
class ImageField extends UIPanel{
	constructor(url){
		super();
		var t = this;
		if(url == null)
			url = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="; // Blank image
		t.landscape = true;
		t.addClass("imageField");
		t.setStyle("justifyContent", "center");
		t.image = U.DCE("img");
		t.image.src = url;
		t.lastSrc = url;
		t.element.appendChild(t.image);
		t.setResizePolicy();
	}

	calcSize(){
		super.calcSize();
		this.landscape = (this.element.clientWidth > this.element.clientHeight);
	}

	applySize(){
		super.applySize();
		this.setResizePolicy();
	}

	setSrc(src){
		if(this.lastSrc !== src){
			this.image.src = src;
			this.lastSrc = src;
		}
	}

	setResizePolicy(){
		var t = this;
		if(t.landscape !== t._pLandscape){
			var is = t.image.style;
			if(t.landscape){
				is.height = "100%";
				is.width = "auto";
				t.setStyle("flexDirection", "row");
			} else {
				is.height = "auto";
				is.width = "100%";
				t.setStyle("flexDirection", "column");
			}
		}
		t._pLandscape = t.landscape;
	}
}



class NumberField extends UIPanel{
	constructor(format){
		super();
		var t = this;
		t.format = format;
		t.value = 0;
		t.litColorOverride = null;
		t.litColor = "#FFF";
		t.unlitColor = "#111"
		t.bgColor = "#000";
		t.addClass("numberField");
		t.canvas = U.DCE("canvas");
		t.element.appendChild(t.canvas);
		var s = t.canvas.style;
		s.width = "100%";
		s.height = "100%";
		t.ctx = t.canvas.getContext("2d");
	}

	/**
	 * Set a color to override the default lit color
	 * If null, the behavior will return to default
	 * @param c Color as CSS color
	 */
	setLitColorOverride(c){
		this.litColorOverride = c;
	}

	setValue(num){
		this.value = parseInt(num);
	}

	applyStyle(obj){
		super.applyStyle(obj);
		var t = this;
		t.litColor = super.getApplyStyle(obj, "litColor", t.litColor);
		t.unlitColor = super.getApplyStyle(obj, "unlitColor", t.unlitColor);
		t.bgtColor = super.getApplyStyle(obj, "bgColor", t.bgtColor);
	}

	getDigit(pos){
		var t = this;
		var f = t.format;
		var fChar = f.charAt(f.length-pos-1);
		var rtn;
		switch(fChar){
			case "X": rtn = 0; break; // Number or '0'
			case "x": rtn = -1; break; // Number or ' ' if leading zero
			case "n": rtn = -2; break; // Number or ' ' if zero
			case "1": rtn = -3; break; // Number, omit if leading zero
			default: rtn = fChar; break;
		}
		if(typeof rtn == "number"){
			var apos = pos; // Get actual position in the number
			for(var x = pos; x >= 0; x--){
				var c = f.charAt(f.length-x-1);
				if(!(c === 'x' || c === 'X' || c === '1' || c === 'n'))
					apos--;
			}
			switch(fChar){
				case "X":
					return Math.floor(t.value / Math.pow(10, apos) % 10);
				case "x":
				case "1":
					var val = t.value / Math.pow(10, apos);
					if(val >= 1)
						return Math.floor(val % 10);
					else return -1;
				case "n":
					var val = Math.floor(t.value / Math.pow(10, apos) % 10);
					if(val >= 1)
						return val;
					else return -1;
				default:
					return rtn;
			}
		}

		return fChar;
	}
	// @Override
	calcSize(){
		super.calcSize(); var t = this;
		t.width = t.element.clientWidth;
		t.height = t.element.clientHeight;
	}
	// @Override
	applySize(){
		super.applySize(); var t = this;
		t.canvas.width = t.width;
		t.canvas.height = t.height;
		t.update();
	}
	// @Override
	update(){
		super.update();
		var t = this;
		var cw = t.canvas.width;
		var ch = t.canvas.height;
		var ctx = t.ctx;
		if(t.bgColor){
			ctx.fillStyle = t.bgColor;
			ctx.fillRect(0, 0, cw, ch);
		} else {
			ctx.clearRect(0, 0, cw, ch);
		}
		// -------- Digit Length Calculation
		var numDigits = t.format.length; // # of digits in display
		var numGiven = Math.ceil(Math.log(t.value + 0.1) / Math.log(10)); // # of digits in value
		var numLeading = 0; // # of digits that can be tacked on to display if required
		for(var x = 0; x < t.format.length; x++){
			if(t.format.charAt(x) === '1'){
				numLeading++; numDigits--;
			} else break;
		}
		// Tack on leading digits if necessary
		if(numGiven > numDigits){
			numDigits = Math.min(numGiven, numDigits + numLeading);
		}

		// -------- Layout Calculation
		var xStart = cw * 0.1, xEnd = cw * (1-0.1), yStart = ch * 0.1, yEnd = ch*(1-0.1);
		var acw = xEnd - xStart, ach = yEnd - yStart;
		var space = 0.67; // How many digit heights to advance each number
		var fullWidth = ach*space*numDigits - ach*(space-0.5)// Width of all the numbers
		var fullHeight = ach; // Height of all the numbers
		var numStartY = yStart; // Y-coordinate where numbers start
		if(fullWidth > acw){ // Maintain aspect ratio
			var squish = acw / fullWidth;
			fullHeight *= squish;
			fullWidth = acw;
			numStartY += (1-squish)*ach/2;
		}
		// --------Drawing
		// +1 to offset Math.floor() later
		var numStartX = xStart + (acw-fullWidth)/2 + 1; // X-coordinate where numbers start
		for(var x = 0; x < numDigits; x++){
			var thisNum = t.getDigit(numDigits-x-1);
			if(thisNum !== "-" && thisNum !== ":" && thisNum !== " "){
				ctx.fillStyle = t.unlitColor;
				t.drawDigit(ctx, numStartX+x*fullHeight*space, numStartY, fullHeight/2, fullHeight, 8, null);
			}
			ctx.fillStyle = t.litColorOverride ? t.litColorOverride : t.litColor;
			t.drawDigit(ctx, numStartX+x*fullHeight*space, numStartY, fullHeight/2, fullHeight, thisNum, null);
		}
	}

	drawDigit(ctx, xpos, ypos, nw, nh, snum, spChars){
		// Set up variables for drawing
		xpos = Math.floor(xpos); ypos = Math.floor(ypos);
		nw = Math.floor(nw); var nh2 = Math.floor(nh/2);
		nh = Math.floor(nh);
		var sw = Math.floor(nh/8); var svh = Math.floor(nh/2);
		var num = parseInt(snum);
		var sa=num&1,sb=num&2,sc=num&4,sd=num&8,se=num&16,sf=num&32,sg=num&64;
		if(!spChars) sa=sb=sc=sd=se=sf=sg=0;
		// Determine which segments need lit
		if(!spChars && num >= 0 && num <= 10){
			if(num !== 1 && num !== 4 && num !== 10) sa = true;
			if(num !== 5 && num !== 6 && num !== 10) sb = true;
			if(num !== 2 && num !== 10) sc = true;
			if(num !== 1 && num !== 4 && num !== 7 && num !== 9 && num !== 10) sd = true;
			if(num === 0 || num === 2 || num === 6 || num === 8) se = true;
			if(num === 0 || num === 4 || num === 5 || num === 6 || num === 8 || num === 9) sf = true;
			if(num !== 0 && num !== 1 && num !== 7 && num !== 10) sg = true;
			if(num === 10){
				ctx.fillRect(Math.floor(xpos+nw/2-sw/2), ypos+sw, sw, sw);
				ctx.fillRect(Math.floor(xpos+nw/2-sw/2), ypos+nh-sw*2, sw, sw);
			}
		} else if(!spChars && snum === "P"){
			sa=1;sb=1;sc=0;sd=0;se=1;sf=1;sg=1;
		}
		// Draw the lit segments
		if(sa) ctx.fillRect(xpos, ypos, nw, sw);
		if(sb) ctx.fillRect(xpos+nw-sw, ypos, sw, svh);
		if(sc) ctx.fillRect(xpos+nw-sw, ypos+nh2, sw, svh);
		if(sd) ctx.fillRect(xpos, Math.floor(ypos+nh*0.875+1), nw, sw);
		if(se) ctx.fillRect(xpos, ypos+nh2, sw, svh);
		if(sf) ctx.fillRect(xpos, ypos, sw, svh);
		if(sg) ctx.fillRect(xpos, Math.floor(ypos+nh*0.4375+1), nw, sw);
		else if(snum === "-"){
			ctx.fillRect(xpos, Math.floor(ypos+nh*0.4375+1), nw, sw);
		}
		else if(snum === ":"){
			ctx.fillRect(Math.floor(xpos+(nw-sw)/2), Math.floor(ypos+(nh-sw)*0.25),sw,sw);
			ctx.fillRect(Math.floor(xpos+(nw-sw)/2), Math.floor(ypos+(nh-sw)*0.75),sw,sw);
		}
	}
}



class PreferencesField extends UIPanel {
	/**
	 * Field for editing properties of an object
	 * @param {Object} obj Object to edit properties of
	 * @param {Function} renameFn Optional function to rename the object's keys.
	 * 		If the function returns null for a key, that key will not be shown.
	 */
	constructor(obj, renameFn) {
		super();
		var t = this;
		t.addClass("preferencesField");
		t.setStyle("flexDirection", "column");
		t.table = new TableField(["Setting", "Value"]);
		t.table.setHeaderVisible(false);
		t.appendChild(t.table);
		t.keys = []; // Keys
		t.ctrls = []; // Controls
		for (var k in obj) {
			if (k.startsWith('_'))
				continue;
			if (renameFn) {
				var ren = renameFn(k);
				if (ren) {
					var val = obj[k];
					if (val == null)
						val = "";
					t.ctrls.push(t.addRow(ren, val));
					t.keys.push(k);
				}
			}
			else {
				t.ctrls.push(t.addRow(k, obj[k]));
				t.keys.push(k);
			}
		}
	}
	addRow(k, v) {
		var t = this.table;
		var vObj = v;
		switch (typeof v) {
			case "boolean":
				vObj = new CheckboxField(v).setStyle("fontSize", "1.3em"); break;
			case "number": case "string":
				vObj = new EditTextField(v); break;
			case "undefined": case "object":
				vObj = new EditTextField("null"); break;
		}
		t.setRow(t.getLength(), [k, vObj], false);
		return vObj;
	}
	getState() {
		var t = this, rtn = {};
		for (var x = 0; x < t.keys.length; x++) {
			var k = t.keys[x];
			var vObj = t.ctrls[x];
			rtn[k] = vObj.getValue();
		}
		return rtn;
	}
	isValid(){
		return true; // Preferences fields with no validation are valid by default
	}
}



class ProgressBarField extends TextField{
	constructor(txt){
		super(txt);
		var t = this;
		t.addClass("progressBarField");
	}
	setColors(col1, col2){
		this.color1 = col1;
		this.color2 = col2;
		this.style();
	}
	setProgress(pct){
		this.progress = pct;
		this.style();
	}
	style(){
		this.setStyle("background", "linear-gradient(90deg, "+this.color1+" "+
			(this.progress-0.05)+"%, "+this.color2+" "+(this.progress+0.05)+"%)");
	}
	addClickListener(f){
		this.element.addEventListener("click", f);
	}
}



/**
 * UI component that holds a Table
 */
class TableField extends UIPanel {
	constructor(columns) {
		super();
		var t = this;
		t.addClass("tableField");
		t.table = U.DCE("table");
		var ts = t.table.style;
		ts.width = "100%";
		t.appendChild(t.table);
		t.setColumns(columns);
		t.clickListener = null;
		t.clearHighlightsOnUpdate = false;
	}

	/**
	 * Enables a click listener for each row of this table.
	 * Provided function will be called with row # when table is clicked.
	 * To disable the Click Listener, provide null as the argument.
	 * @param {Function} callback
	 */
	enableClickListener(callback) {
		var t = this;
		t.clickListener = callback;

		var clk = (callback == null);
		var len = t.getLength();
		for (var x = 0; x < len; x++) {
			t.getRow(x).style.cursor = clk ? "pointer" : "default";
		}
	};

	/**
	 * Sets the columns of this table by name.
	 * NOTE: This also clears the contents of the table,
	 * and anything it the <colgroup>
	 * @param {Array} columns array of column names
	 */
	setColumns(columns) {
		var t = this;
		t.columns = columns;
		U.CLEAR(t.table);
		t.colgroup = U.DCE("colgroup");
		t.table.appendChild(t.colgroup);
		t.thead = t.createRow(t.columns, true);
		t.thead.style.fontSize = "1.2em";
		t.table.appendChild(t.thead);
	}

	/**
	 * Add a given number of rows to the table
	 * @param num Number of rows to add
	 * @param start Starting row number for click handling
	 */
	createRows(num, start) {
		for (var x = 0; x < num; x++) {
			this.table.appendChild(this.createRow(this.columns.length, false, start + x));
		}
	}
	/**
	 * Create and return a table row.
	 * This function does not append to the table's DOM.
	 * @param {Number | Array} cols Number of columns, or array of columns
	 * @param {Boolean} head True to create a <th>, false for a <td>
	 * @param {Number} num Number of this row for click handling
	 */
	createRow(cols, head, num) {
		var t = this;
		var el = U.DCE("tr");
		el.dataset.cNum = num;
		var colsIsNum = (typeof cols == "number");
		var len = colsIsNum ? cols : cols.length;
		for (var x = 0; x < len; x++) {
			var itm = head ? U.DCE("th") : U.DCE("td");
			if (!colsIsNum)
				itm.textContent = cols[x];
			el.appendChild(itm);
		}
		if (!head) {
			el.style.cursor = t.clickListener ? "pointer" : "default";
			el.addEventListener("click", function () {
				if (!t.clickListener) return;
				t.onRowClick(parseInt(this.dataset.cNum));
			});
			el.addEventListener("touchend", function (e) {
				if (!t.clickListener) return;
				e.uCanceledBy = t;
			});
		}
		return el;
	}

	onRowClick(num) {
		this.clickListener(num);
	}

	/**
	 * Unhighlight all of the rows of this table
	 */
	clearHighlights() {
		var t = this;
		var len = t.getLength();
		for (var x = 0; x < len; x++) {
			t.getRow(x).classList.remove("highlight");
		}
	}
	/**
	 * Set the highlight status of a row of this table
	 * @param {Number | Object} row Number of row or Row Object
	 * @param {Boolean} state True to highlight, false to unhighlight
	 */
	setHighlight(row, state) {
		if (typeof row == "number")
			row = this.getRow(row);
		if (state)
			row.classList.add("highlight");
		else
			row.classList.remove("highlight");
	}
	/**
	 * Get the highlight status of a row of this table
	 * @param {Number} row Number of row or Row Object
	 */
	getHighlight(row) {
		if (typeof row == "number")
			row = this.getRow(row);
		return row.classList.contains("highlight");
	}

	// Setting element textContent is much faster than creating a new set
	// of DOM nodes every time the table needs resized.
	/**
	 * Set the contents of a table cell
	 * @param x x-coordinate of cell to set
	 * @param y y-coordinate of cell to set
	 * @param {String} text contents of the cell
	 * @param {Boolean} useHTML True to interpret contents of the cell as HTML. Use false if possible.
	 */
	setCell(x, y, text, useHTML) {
		var t = this;
		t.ensureLength(y);
		var r = t.getRow(y);
		if (t.clearHighlightsOnUpdate && t.getHighlight(r)) {
			t.setHighlight(r, false);
		}
		if (useHTML) r.children[x].innerHTML = text;
		else r.children[x].innerText = text;
	}

	getCell(x, y, useHTML) {
		var t = this;
		var r = t.getRow(y);
		if (useHTML) return r.children[x].innerHTML;
		else return r.children[x].innerText;
	}

	/**
	 * Set a row of the table to an array of Strings (or <E extends UIPanel>s)
	 * @param {Number} y Row #
	 * @param {String[]} texts Array of content
	 * @param {Boolean} useHTML True to set HTML, false for just text
	 */
	setRow(y, texts, useHTML) {
		var t = this;
		t.ensureLength(y);
		var r = t.getRow(y);
		if (t.clearHighlightsOnUpdate && t.getHighlight(r)) {
			t.setHighlight(r, false);
		}
		var ch = t.getRow(y).children;
		for (var x = 0; x < ch.length && x < texts.length; x++) {
			var txt = texts[x];
			if (typeof txt == 'object') {
				ch[x].innerHTML = '';
				ch[x].appendChild(txt.element);
			}
			else if (useHTML)
				ch[x].innerHTML = txt;
			else
				ch[x].textContent = txt;
		}
	}

	setHeaderVisible(val) {
		this.table.children[1].style.display = val ? "" : "none";
	}

	getRow(y) {
		return this.table.children[y + 2];
	}
	/**
	 * Return the number of rows in the table, excluding the header
	 */
	getLength() {
		return this.table.childElementCount - 2;
	}
	/**
	 * Set the number of rows in the table, excluding the header
	 * @param {Number} l length to set the table to
	 */
	setLength(l) {
		this.ensureLength(l);
		this.truncate(l);
	}
	/** Same as setLength(), but only adds */
	ensureLength(l) {
		var t = this;
		var len = t.getLength();
		if (l + 1 > len) t.createRows(l + 1 - t.getLength(), len);
	}
	/** Same as setLength(), but only removes */
	truncate(l) {
		var t = this.table;
		while (this.getLength() > l) {
			t.removeChild(t.lastChild);
		}
	}

	/** Clears the entire table */
	clear(){
		this.truncate(0);
	}
}



class EditableTableField extends TableField {
	/** Create a new, blank table field with the given column labels and sizes
	 * @param cols Column labels
	 * @param sizes Column sizes. <number>, null for default, and "check" for a checkbox instead
	 */

	constructor(cols, sizes) {
		super(cols);
		var t = this;
		t.fSizes = sizes; // Field sizes
		t.updateSize();
	}

	/**
	 * Set the function used to validate user-inputted data.
	 * The function will be called with the following parameters:
	 * -x: the x-position of the cell
	 * -y: the y-position of the cell
	 * -content: the cell's current contents
	 * The function shall return one of the following values:
	 * -true if the cell validates successfully
	 * -false if the cell has validation errors
	 * - [optional] a String representing the corrected content
	 * @param {Function} fn validation function
	 */
	setValidator(fn) {
		var t = this;
		t.valFn = fn;
		t.validateAll();
	}
	validateAll() {
		var t = this;
		var len = t.getLength();
		for (var x = 0; x < len; x++) {
			t.validateRow(t.getRow(x));
		}
	}

	getCell(x, y) {
		var ch = this.getRow(y).children[x].children[0]; // Contents of table cell
		if(ch._custCtl)
			return ch._custCtl.getValue();
		return ch.value;
	}

	// noinspection JSCheckFunctionSignatures
	setCell(x, y, value) {
		this.ensureLength(y);
		var ch = this.getRow(y).children[x].children[0]; // Contents of table cell
		if(ch._custCtl) // If custom (radio / checkbox) control
			ch._custCtl.setValue(value && value.length > 0);
		ch.value = value;
	}

	isAllValid() {
		return this.element.getElementsByClassName("invalid").length === 0;
	}

	validateRow(r) {
		var t = this;
		if (t.isRowBlank(r) || !(typeof t.valFn == "function")) {
			t.setRowInvalid(r, false);
			return;
		}
		var lrc = r.children;
		for (var x = 0; x < lrc.length; x++) {
			var el = lrc[x].children[0];
			var res = t.valFn(x, r.rowIndex, el.value);
			if (typeof res == "string") {
				el.value = res;
				el.classList.remove("invalid");
			} else if (res === false) {
				el.classList.add("invalid");
			} else if (res === true) {
				el.classList.remove("invalid");
			}
			if (t.isRowBlank(r)) {
				t.setRowInvalid(r, false);
			}
		}
	}

	/*
	* Change the size of the table so that there is exactly one blank row at the end
	*/
	updateSize() {
		var t = this;
		var len = t.getLength();
		if (len === 0) {
			t.setLength(1);
		} if (len > 0) {
			var needsNew = !t.isRowBlank(t.getRow(len - 1));
			if (needsNew)
				t.setLength(len + 1);
			else if (len > 1) {
				var needsRem = t.isRowBlank(t.getRow(len - 1));
				if (needsRem) {
					t.setLength(len - 1);
					t.updateSize();
				}
			}
		}
	}


	isRowBlank(rowEl) {
		var lrc = rowEl.children;
		for (var x = 0; x < lrc.length; x++) {
			var input = lrc[x].children[0];
			if (!input._custCtl && input.value && input.value.length > 0) {
				return false;
			}
		}
		return true;
	}

	setRowInvalid(rowEl, state) {
		var lrc = rowEl.children;
		for (var x = 0; x < lrc.length; x++) {
			var input = lrc[x].children[0];
			if (state) input.classList.add("invalid");
			else input.classList.remove("invalid");
		}
		return true;
	}

	/**
	 * Create and return a table row.
	 * This method OVERRIDES createRow in TableField.
	 * This function does not append to the table's DOM.
	 */
	createRow(cols, head, num) {
		var t = this;
		var el = U.DCE("tr");
		el.dataset.cNum = num;
		var colsIsNum = (typeof cols == "number");
		var len = colsIsNum ? cols : cols.length;
		for (var x = 0; x < len; x++) {
			var itm = head ? U.DCE("th") : U.DCE("td");
			if (!colsIsNum)
				itm.textContent = cols[x];
			if (!head) {
				var size = t.fSizes[x];
				if (size === "check") { // Checkbox field
					var field = new CheckboxField();
					field.element._custCtl = field;
					itm.appendChild(field.element);
				}
				else { // Normal field
					var field = U.DCE("input");
					field.type = "text";
					if (size)
						field.size = size;
					itm.appendChild(field);
					field.addEventListener("input", function () {
						t.validateRow(this.parentElement.parentElement);
						t.updateSize();
					});
				}
			}
			el.appendChild(itm);
		}
		if (!head) {
			el.style.cursor = t.clickListener ? "pointer" : "default";
			el.addEventListener("click", function () {
				if (!t.clickListener) return;
				t.onRowClick(parseInt(this.dataset.cNum));
			});
			el.addEventListener("touchend", function (e) {
				if (!t.clickListener) return;
				e.uCanceledBy = t;
			});
		}
		return el;
	}
}



class TabSelector extends UIPanel {
	constructor() {
		super();
		var t = this;
		t._autosel = true;
		t.addClass("tabSelector");
		t.element.style.setProperty("--ts-height", "1.5em");
		t.setElasticity(0)
			.setStyle("height", "var(--ts-height)")
			.setStyle("width", "100%")
			.setStyle("borderBottom", "0.1em solid #000")
			.setStyle("overflow", "visible");
		t.items = [];
		t.selObvs = new Set(); // Selection Observers
		t.selected = "";
		t.mobile = new TabSelectorMobile(this);
		t.appendChild(t.mobile);
		t.setMobileMode(false);
	}

	/**
	 * Set whether clicking the tab automatically selects it.
	 * Defaults to true
	 */
	setAutoSelect(x){
		this._autosel = x;
	}

	addIcon(img) {
		var t = this;
		if (t._iconField)
			t.removeIcon();
		if (!img)
			return;
		var addend = new ImageField(img).setElasticity(0)
			.setStyles("marginLeft", "marginRight", "0.2em");
		t._iconField = addend;
		t.prependChild(addend);
	}

	removeIcon() {
		var t = this;
		if (t._iconField) {
			t.removeChild(t._iconField);
			t._iconField = null;
		}
	}

	addTab(html, name, noSelect) {
		var t = this;
		var addend = new TabSelectorItem(html, name, t);
		addend.setSelectable(!noSelect);
		t.appendChild(addend);
		t.items.push(addend);
	}
	addSelectionListener(func) {
		if (typeof func == "function") this.selObvs.add(func);
	}
	removeSelectionListener(func) { this.selObvs.remove(func) }
	notifySelect(x) {
		this.selObvs.forEach(function (f) {
			f.call(null, x);
		});
	}

	setMaxVisible(num) {
		for (var x = 0; x < this.items.length; x++) {
			this.items[x].setStyle("display", x >= num ? "none" : "");
		}
	}

	/**
	 * Set a selection by calling the (normally click-triggered) selection handler
	 * This will still work even if autoSel is disabled by setAutoSelect()
	 * @param name Name of tab to click on
	 */
	setSelectedClick(name) {
		this.onSelect(name, true, true);
	}

	/**
	 * Selection handler
	 * @param name Event that was clicked
	 * @param noUpdate True to not call notifySelect()
	 * @param noClick True if not caused by click. Use to override autoSel
	 */
	onSelect(name, noUpdate, noClick) {
		var t = this;
		var i = t.getItem(name);
		if (t.selected !== name) {
			if (i.selectable && (t._autosel || noClick)) {
				t.selected = name;
				t.setHighlighted(name);
			}
			if(!noUpdate)
				t.notifySelect(name);
		}
	}
	getItem(name) {
		for (var x = 0; x < this.items.length; x++) {
			var i = this.items[x];
			if (i.element.dataset.name === name)
				return i;
		}
	}
	setHighlighted(name) {
		for (var x = 0; x < this.items.length; x++) {
			var i = this.items[x];
			if (i.element.dataset.name === name) {
				i.setSelected(true);
				this.mobile.setLabel(i.getHtml() + " &#9660;");
			} else {
				i.setSelected(false);
			}
		}
	}

	calcSize() {
		var t = this;
		t._cWid = t.element.clientWidth;
		t._sWid = t.element.scrollWidth;
	}

	applySize() {
		this.setMobileMode(this._sWid > this._cWid + 1);
	}

	setMobileMode(mbl){
		var t = this;
		t.mobile.setStyle("display", mbl?"":"none");
		for(var x = 0; x < t.items.length; x++)
			t.items[x].element.style.visibility = mbl?"hidden":"";
	}
}

class TabSelectorMobile extends UIPanel {
	constructor(tsMain) {
		super();
		var t = this;
		t.tsMain = tsMain;
		t.setStyles("flexGrow", "flexShrink", "0")
			.setStyle("position", "relative")
			.setStyle("overflow", "visible");
		t.main = new UIPanel();
		t.main.setStyle("position", "absolute")
			.setStyle("alignItems", "baseline")
			.setStyle("flexDirection", "column");
		t.main.addClass("tabSelectorMobile");
		t.appendChild(t.main);
		t.curLbl = new TabSelectorItem("Uhh...", null, t);
		t.main.appendChild(t.curLbl);
		t.dropdown = new UIPanel()
			.setStyle("flexDirection", "column")
			.setStyle("position", "fixed")
			.setStyle("zIndex", "2")
			.setStyle("transform", "translateY(1.5em)")
			.addClass("tabSelectorMobileDD");
		t.main.appendChild(t.dropdown);
		t.element.setAttribute("tabindex", "0");
		t.element.addEventListener("focusout", t.onFocusOut.bind(t));

		if (!window.TAB)
			window.TAB = t;
	}

	setLabel(curr) {
		var c = this.curLbl;
		c.setHtml(curr);
	}

	onFocusOut(){
		this.showing = true;
		this.onSelect("null");
	}
	onSelect(name) {
		var t = this;
		t.showing = !t.showing;
		if (!t.showing) {
			t.dropdown.removeAll();
			t.dropdown.setStyle("borderTop", "");
		}
		else {
			t.dropdown.setStyle("borderTop", "1px solid #000");
			var itms = t.tsMain.items;
			for (var x = 0; x < itms.length; x++) {
				// if(!itms[x].isDisplayable())
				// 	continue;
				var ts = new TabSelectorItem(itms[x].getHtml(), itms[x].getName(), this)
					.setStyle("width", "100%")
					.setStyle("justifyContent", "left")
					.setStyles("paddingTop", "paddingBottom", "0.5em");
				if (itms[x].isSelected())
					ts.setSelected(true);
				t.dropdown.appendChild(ts);
			}
		}
		if (name !== "null") {
			t.tsMain.onSelect(name);
		}
	}
}

class TabSelectorItem extends TextField {
	constructor(str, name, parent) {
		super();
		var t = this;
		t.setHtml(str).addClass("tabSelectorItem").setElasticity(0);
		t.setStyles("paddingLeft", "paddingRight", "0.6em");
		t.setStyle("cursor", "pointer");
		t.parent = parent;
		t.element.dataset.name = name;
		t.selectable = true;
		t.element.addEventListener("mouseenter", t.enter.bind(t));
		t.element.addEventListener("mouseleave", t.leave.bind(t));
		t.element.addEventListener("click", t.click.bind(t));
	}
	getName() {
		return this.element.dataset.name;
	}
	setSelected(val) {
		if (val) this.addClass("selected");
		else this.removeClass("selected");
	}
	isSelected() {
		return this.hasClass("selected");
	}

	/**
	 * @Deprecated
	 * @returns {boolean} Whether the element should be displayed on the screen
	 */
	isDisplayable(){
		return this.element.style.display !== "none";
	}
	setSelectable(val) {
		this.selectable = val;
	}
	enter(e) {
		this.setStyle("background", "var(--sel-bg)").setStyle("color", "var(--sel-fg)");
	}
	leave(e) {
		this.setStyle("background", "").setStyle("color", "");
	}
	click(e) {
		this.clickEl(e.target);
	}
	clickEl(e) {
		if (e.dataset.name)
			this.parent.onSelect(e.dataset.name);
		else
			this.clickEl(e.parentElement);
	}
}


class TabbedPane extends UIPanel {
	constructor(item) {
		super();
		var t = this;
		t.selector = new TabSelector();
		t.item = item;
		t.appendChild(t.selector);
		t.appendChild(item);
	}
}




// Toast objects are created to inform the user that something has happened.
// The constructor attaches the toast to the end of the DOM, shows automatically,
// and deletes itself when done.
class Toast {
	constructor(message, delay1) {
		if(!delay1) delay1 = 2500;
		var delay2 = 500;
		var oldEl = U.DGE("toastEl");
		if(oldEl){
			oldEl.parentElement.removeChild(oldEl);
			clearTimeout(oldEl.tTmrId);
		}
		var el = U.DCE("div", "toast");
		el.id = "toastEl";
		var el2 = U.DCE("span");
		el2.innerText = message;
		el.appendChild(el2);
		// if (!window.Toast_ToastRoot)
			document.body.appendChild(el);
		// else
		// 	window.Toast_ToastRoot.appendChild(el);
		el.tTmrId = setTimeout(function(){
			el.classList.add("ending");
			setTimeout(function(){
				if(el.parentElement)
					el.parentElement.removeChild(el);
			}, delay2);
		}, delay1);
	}
}

// function ToastSetRoot(id) {
//     window.Toast_ToastRoot = DGE(id);
// }