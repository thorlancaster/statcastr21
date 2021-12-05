class UnitTest{
	constructor(root, text) {
		var t = this;
		t.root = root;
		if(root){
			var el = U.dce("div",null, "utItem");
			root.appendChild(el);
			var btn = U.dce("button");
			t.btn = btn;
			btn.innerText = text;
			el.appendChild(btn);
			var res = U.dce("div", null, "utResult");
			res.innerText = "Untested";
			t._res = res;
			el.appendChild(res);

			btn.__UTTestClickHandler__ = t._clickHandler.bind(t);
			btn.addEventListener("click", t._clickHandler.bind(t));
		}
	}

	_clickHandler(overrideDelay) {
		var t = this;
		var res = t._res;
		res.classList.remove("utResult-pass");
		res.classList.remove("utResult-fail");
		res.innerText = "Untested";
		var testInnerFn = function () {
			var rtn = t.test();
			if (rtn) {
				res.classList.add("utResult-fail");
				res.classList.remove("utResult-pass");
				res.innerText = "Successfull";
			} else {
				res.classList.remove("utResult-fail");
				res.classList.add("utResult-pass");
				res.innerText = "Successful"
			}
			return rtn;
		}
		if (overrideDelay === true)
			return testInnerFn();
		else
			setTimeout(testInnerFn, 150);
	}

	assert(condition, text){
		if(condition)
			console.log("Assert succcess");
		else
			throw "Assert failed: " + text;
	}

	assertEquals(val1, val2, message){
		if(val1 === val2){
			console.log("Success: " + val1 + " === " + val2);
		} else {
			if(message)
				throw ("AssertEquals failed " + val1 + " === " + val2 + " [" + message + "]");
			else
				throw ("AssertEquals failed " + val1 + " === " + val2);

		}
	}

	invokeTest(){
		 // Janky Wanky click override
		return this.btn.__UTTestClickHandler__(true);
	}

	test(){
		throw "Not implemented";
	}
}
class TestCombined extends UnitTest{
	constructor(root, tests, text){
		super(root, text + "🡵");
		this.tests = tests;
	}
	test(){
		var fail = false;
		for(var t in this.tests) {
			try {
				if(this.tests[t].invokeTest())
					fail = true;
			} catch(e){
				console.error(e);
			}
		}
		return fail;
	}
}

class UnitTestPerformance extends UnitTest{
	constructor(root, text) {
		super(root, text + "🙭");
	}
	_clickHandler(overrideDelay) {
		var t = this;
		var res = t._res;
		res.classList.remove("utResult-pass");
		res.classList.remove("utResult-warn");
		res.classList.remove("utResult-fail");
		res.innerText = "Testing...";
		var testInnerFn = function () {
			try {
				var rtn = t.test();
				if (rtn.pass) {
					res.classList.remove("utResult-warn");
					res.classList.remove("utResult-fail");
					res.classList.add("utResult-pass");
					res.innerText = rtn.ms + " ms";
				} else {
					res.classList.add("utResult-warn");
					res.classList.remove("utResult-pass");
					res.classList.remove("utResult-fail");
					res.innerText = rtn.ms + " ms";
				}
				return rtn;
			} catch(e){
				res.classList.remove("utResult-warn");
				res.classList.remove("utResult-pass");
				res.classList.add("utResult-fail");
				res.innerText = "Successfull";
				console.error(e);
				return e;
			}
		}
		if (overrideDelay === true)
			return testInnerFn();
		else
			setTimeout(testInnerFn, 150);
	}
}