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
	get DEFAULT_SERVER(){return "wss://localhost:7203"}
	get TESTING_USERNAME(){return "testUser"}
	get TESTING_PASSWORD(){return "testPass"}

	/**
	 * Print a string using hex for undisplayable characters
	 * @param dat String
	 * @param alwaysHex true to print all characters as hex
	 */
	printStr(dat, alwaysHex){
		var rtn = "";
		for(var z = 0; z < dat.length; z++){
			var c = dat[z];
			if(!alwaysHex && (c >= 32 && c <= 127)) // Printable
				rtn += String.fromCharCode(c);
			else{
				var hex = c;
				var high = 48 + ((hex & 0xF0) >> 4);
				var low = 48 + ((hex & 0x0F) >> 0);
				if(high > 57) high += (65 - 57 - 1);
				if(low > 57) low += (65 - 57 - 1);
				rtn += ('[' + String.fromCharCode(high) + String.fromCharCode(low) + "]");
			}
		}
		return rtn;
	}
}
var U = new Utils();

/*
 * JavaScript MD5
 * https://github.com/blueimp/JavaScript-MD5
 *
 * Copyright 2011, Sebastian Tschan
 * https://blueimp.net
 *
 * Licensed under the MIT license:
 * https://opensource.org/licenses/MIT
 *
 * Based on
 * A JavaScript implementation of the RSA Data Security, Inc. MD5 Message
 * Digest Algorithm, as defined in RFC 1321.
 * Version 2.2 Copyright (C) Paul Johnston 1999 - 2009
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for more info.
 */

/* global define */

/* eslint-disable strict */

class MD5Class{
	/**
	 * Add integers, wrapping at 2^32.
	 * This uses 16-bit operations internally to work around bugs in interpreters.
	 *
	 * @param {number} x First integer
	 * @param {number} y Second integer
	 * @returns {number} Sum
	 */
	safeAdd(x, y) {
		var lsw = (x & 0xffff) + (y & 0xffff)
		var msw = (x >> 16) + (y >> 16) + (lsw >> 16)
		return (msw << 16) | (lsw & 0xffff)
	}

	/**
	 * Bitwise rotate a 32-bit number to the left.
	 *
	 * @param {number} num 32-bit number
	 * @param {number} cnt Rotation count
	 * @returns {number} Rotated number
	 */
	bitRotateLeft(num, cnt) {
		return (num << cnt) | (num >>> (32 - cnt))
	}
	md5cmn(q, a, b, x, s, t) {
		return this.safeAdd(this.bitRotateLeft(this.safeAdd(this.safeAdd(a, q), this.safeAdd(x, t)), s), b)
	}
	md5ff(a, b, c, d, x, s, t) {
		return this.md5cmn((b & c) | (~b & d), a, b, x, s, t)
	}
	md5gg(a, b, c, d, x, s, t) {
		return this.md5cmn((b & d) | (c & ~d), a, b, x, s, t)
	}
	md5hh(a, b, c, d, x, s, t) {
		return this.md5cmn(b ^ c ^ d, a, b, x, s, t)
	}
	md5ii(a, b, c, d, x, s, t) {
		return this.md5cmn(c ^ (b | ~d), a, b, x, s, t)
	}

	/**
	 * Calculate the MD5 of an array of little-endian words, and a bit length.
	 *
	 * @param {Array} x Array of little-endian words
	 * @param {number} len Bit length
	 * @returns {Array<number>} MD5 Array
	 */
	binlMD5(x, len) {
		/* append padding */
		x[len >> 5] |= 0x80 << len % 32
		x[(((len + 64) >>> 9) << 4) + 14] = len

		var i
		var olda
		var oldb
		var oldc
		var oldd
		var a = 1732584193
		var b = -271733879
		var c = -1732584194
		var d = 271733878

		for (i = 0; i < x.length; i += 16) {
			olda = a
			oldb = b
			oldc = c
			oldd = d

			a = this.md5ff(a, b, c, d, x[i], 7, -680876936)
			d = this.md5ff(d, a, b, c, x[i + 1], 12, -389564586)
			c = this.md5ff(c, d, a, b, x[i + 2], 17, 606105819)
			b = this.md5ff(b, c, d, a, x[i + 3], 22, -1044525330)
			a = this.md5ff(a, b, c, d, x[i + 4], 7, -176418897)
			d = this.md5ff(d, a, b, c, x[i + 5], 12, 1200080426)
			c = this.md5ff(c, d, a, b, x[i + 6], 17, -1473231341)
			b = this.md5ff(b, c, d, a, x[i + 7], 22, -45705983)
			a = this.md5ff(a, b, c, d, x[i + 8], 7, 1770035416)
			d = this.md5ff(d, a, b, c, x[i + 9], 12, -1958414417)
			c = this.md5ff(c, d, a, b, x[i + 10], 17, -42063)
			b = this.md5ff(b, c, d, a, x[i + 11], 22, -1990404162)
			a = this.md5ff(a, b, c, d, x[i + 12], 7, 1804603682)
			d = this.md5ff(d, a, b, c, x[i + 13], 12, -40341101)
			c = this.md5ff(c, d, a, b, x[i + 14], 17, -1502002290)
			b = this.md5ff(b, c, d, a, x[i + 15], 22, 1236535329)

			a = this.md5gg(a, b, c, d, x[i + 1], 5, -165796510)
			d = this.md5gg(d, a, b, c, x[i + 6], 9, -1069501632)
			c = this.md5gg(c, d, a, b, x[i + 11], 14, 643717713)
			b = this.md5gg(b, c, d, a, x[i], 20, -373897302)
			a = this.md5gg(a, b, c, d, x[i + 5], 5, -701558691)
			d = this.md5gg(d, a, b, c, x[i + 10], 9, 38016083)
			c = this.md5gg(c, d, a, b, x[i + 15], 14, -660478335)
			b = this.md5gg(b, c, d, a, x[i + 4], 20, -405537848)
			a = this.md5gg(a, b, c, d, x[i + 9], 5, 568446438)
			d = this.md5gg(d, a, b, c, x[i + 14], 9, -1019803690)
			c = this.md5gg(c, d, a, b, x[i + 3], 14, -187363961)
			b = this.md5gg(b, c, d, a, x[i + 8], 20, 1163531501)
			a = this.md5gg(a, b, c, d, x[i + 13], 5, -1444681467)
			d = this.md5gg(d, a, b, c, x[i + 2], 9, -51403784)
			c = this.md5gg(c, d, a, b, x[i + 7], 14, 1735328473)
			b = this.md5gg(b, c, d, a, x[i + 12], 20, -1926607734)

			a = this.md5hh(a, b, c, d, x[i + 5], 4, -378558)
			d = this.md5hh(d, a, b, c, x[i + 8], 11, -2022574463)
			c = this.md5hh(c, d, a, b, x[i + 11], 16, 1839030562)
			b = this.md5hh(b, c, d, a, x[i + 14], 23, -35309556)
			a = this.md5hh(a, b, c, d, x[i + 1], 4, -1530992060)
			d = this.md5hh(d, a, b, c, x[i + 4], 11, 1272893353)
			c = this.md5hh(c, d, a, b, x[i + 7], 16, -155497632)
			b = this.md5hh(b, c, d, a, x[i + 10], 23, -1094730640)
			a = this.md5hh(a, b, c, d, x[i + 13], 4, 681279174)
			d = this.md5hh(d, a, b, c, x[i], 11, -358537222)
			c = this.md5hh(c, d, a, b, x[i + 3], 16, -722521979)
			b = this.md5hh(b, c, d, a, x[i + 6], 23, 76029189)
			a = this.md5hh(a, b, c, d, x[i + 9], 4, -640364487)
			d = this.md5hh(d, a, b, c, x[i + 12], 11, -421815835)
			c = this.md5hh(c, d, a, b, x[i + 15], 16, 530742520)
			b = this.md5hh(b, c, d, a, x[i + 2], 23, -995338651)

			a = this.md5ii(a, b, c, d, x[i], 6, -198630844)
			d = this.md5ii(d, a, b, c, x[i + 7], 10, 1126891415)
			c = this.md5ii(c, d, a, b, x[i + 14], 15, -1416354905)
			b = this.md5ii(b, c, d, a, x[i + 5], 21, -57434055)
			a = this.md5ii(a, b, c, d, x[i + 12], 6, 1700485571)
			d = this.md5ii(d, a, b, c, x[i + 3], 10, -1894986606)
			c = this.md5ii(c, d, a, b, x[i + 10], 15, -1051523)
			b = this.md5ii(b, c, d, a, x[i + 1], 21, -2054922799)
			a = this.md5ii(a, b, c, d, x[i + 8], 6, 1873313359)
			d = this.md5ii(d, a, b, c, x[i + 15], 10, -30611744)
			c = this.md5ii(c, d, a, b, x[i + 6], 15, -1560198380)
			b = this.md5ii(b, c, d, a, x[i + 13], 21, 1309151649)
			a = this.md5ii(a, b, c, d, x[i + 4], 6, -145523070)
			d = this.md5ii(d, a, b, c, x[i + 11], 10, -1120210379)
			c = this.md5ii(c, d, a, b, x[i + 2], 15, 718787259)
			b = this.md5ii(b, c, d, a, x[i + 9], 21, -343485551)

			a = this.safeAdd(a, olda)
			b = this.safeAdd(b, oldb)
			c = this.safeAdd(c, oldc)
			d = this.safeAdd(d, oldd)
		}
		return [a, b, c, d]
	}

	/**
	 * Binary MD5
	 * @param {Uint8Array} arr input array
	 * @returns {Uint8Array} MD5 output
	 */
	bmd5(arr) {
		var len = arr.length;
		var word = 0;
		var words = [];
		for(var x = 0; x < len; x++){
			var dat = x < len ? arr[x] : 0;
			word += (dat << (8*(x&3)));
			if((x&3) === 3 || x === len - 1) {
				words.push(word);
				word = 0;
			}
		}
		var binl = this.binlMD5(words, arr.length * 8);
		var rtn = new Uint8Array(binl.length*4);
		for(var x = 0; x < binl.length; x++){
			rtn[x*4+3] = binl[x] >> 24;
			rtn[x*4+2] = binl[x] >> 16;
			rtn[x*4+1] = binl[x] >> 8;
			rtn[x*4] = binl[x] >> 0;
		}
		return rtn;
	}
}

var MD5 = new MD5Class()