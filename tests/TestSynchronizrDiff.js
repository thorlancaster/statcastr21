class TestSynchronizrDiff extends UnitTest {
	constructor(root, text) {
		super(root, text);
	}

	// Reimplementation of receiver's bytecode parser
	getResult(arr, bytecode) {
		var t = this;
		var rtn = [];
		var ptr = 0;
		var endLastRun = 0;
		while (ptr < bytecode.length) {
			var op = bytecode[ptr++];
			let startRun, endRun;
			switch (op) {
				case 255: // Short Run
					startRun = endLastRun + bytecode[ptr++];
					endRun = startRun + bytecode[ptr++];
					endLastRun = endRun;
					for (let x = startRun; x <= endRun; x++)
						rtn.push(t.byteArrToStr(arr[x]));
					break;
				case 254: // Negative Short Run
					startRun = endLastRun - bytecode[ptr++];
					endRun = startRun + bytecode[ptr++];
					endLastRun = endRun;
					for (let x = startRun; x <= endRun; x++)
						rtn.push(t.byteArrToStr(arr[x]));
					break;
				case 253: // Long Run
					startRun = bytecode[ptr++] * 256 + bytecode[ptr++];
					endRun = bytecode[ptr++] * 256 + bytecode[ptr++];
					endLastRun = endRun;
					for (let x = startRun; x <= endRun; x++)
						rtn.push(t.byteArrToStr(arr[x]));
					break;
				case 252: // Singular Short Run [1 element long]
					startRun = endLastRun + bytecode[ptr++];
					endLastRun = startRun;
					rtn.push(t.byteArrToStr(arr[startRun]));
					break;
				default: // Just a normal string literal
					let len = op * 256 + bytecode[ptr++];
					var str = "";
					for (let x = 0; x < len; x++) {
						str += String.fromCharCode(bytecode[ptr++]);
					}
					rtn.push(str);
					break;
			}
		}
		return rtn;
	}

	byteArrToStr(byteArr){
		return SynchronizrUtils.byteArrToStr(byteArr);
	}

	strArrToByteArrArr(strArr){
		var rtn = [];
		for(var x = 0; x < strArr.length; x++){
			var itm = strArr[x];
			var rti = new Uint8Array(itm.length);
			for(var y = 0; y < itm.length; y++){
				rti[y] = itm.charCodeAt(y);
			}
			rtn.push(rti);
		}
		return rtn;
	}
	// byteArrArrToStrArr(byteArr){
	// 	var rtn = [];
	// 	for(var x = 0; x < byteArr.length; x++){
	// 		var itm = byteArr[x];
	// 		var rti = "";
	// 		for(var y = 0; x < itm.length; y++){
	// 			rti += String.fromCharCode(itm[y]);
	// 		}
	// 	}
	// }

	test() {
		try {
			var t = this;
			// Detailed test setup
			var str1 = "The sly quick brown fox jumped over the obese lazy dog after chewing on a juicy bone";
			// var str1 = "The quick brown fox Foo".split(" ");
			// var str1 = "1 2 3 4 5 6 7 Fizz Buzz Zip Zzzip ".split(" "); // Old
			str1 = t.strArrToByteArrArr(str1.split(" "));
			var str1Orig = [...str1];
			var str2 = "The orange fluffy kitten jumped the lazy dog and ran off with his juicy bone of beef";
			// var str2 = "Jumped over the lazy dog Foo".split(" ");
			// var str2 = "3 2 1 5 4 Fizz Zzzip Zip".split(" "); // New
			var str2Orig = str2;
			str2 = t.strArrToByteArrArr(str2.split(" "));
			var d = SynDiff.genDiffInfo(str1, str2);
			var result = t.getResult(str1Orig, d).join(" ");
			console.log(d);
			console.log(str1Orig);
			console.log(result);
			t.assertEquals(result, str2Orig);
			// Other tests

			str1 = t.strArrToByteArrArr("The brown quick fox jumped".split(" "));
			str1Orig = [...str1];
			str2 = t.strArrToByteArrArr("The quick brown fox jumped".split(" "));
			var foo2 = SynDiff.genDiffInfo(str1, str2);
			var str3 = t.getResult(str1Orig, foo2).join(" ");
			t.assertEquals("The quick brown fox jumped", str3);

		} catch (e) {
			console.error(e);
			return e;
		}
		return undefined;
	}
}