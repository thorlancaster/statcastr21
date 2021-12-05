class SynPriorityQueue{
	constructor(comparator) {
		var t = this;
		t.c = comparator;
		t.arr = []; // Binary heap, for efficient remove
		t.size = 0;
		t.keys = {}; // Set, to keep track of item indices
	}

	compare(v1, v2){
		if(this.c)
			return this.c(v1, v2);
		return v1 > v2;
	}

	add(key, weight, data){
		var t = this;
		var v = t.keys[key];
		var x0 = -1;
		var xLow = false; // True to check lower (child) nodes
		if (v === undefined) { // Value does not already exist, insert
			t.keys[key] = t.size;
			t.arr[t.size++] = {v: weight, k: key, d: data}; // Add at end
			x0 = t.size - 1;
		} else { // Value already exists
			if (weight !== t.arr[v].v) {
				x0 = v;
				xLow = true;
			}
			t.arr[v] = {v: weight, k: key, d: data};
		}
		for(var x = x0; x >= 0 && x < t.size;){
			var nx = (x-1) >> 1;
			if(nx < 0 || t.compare(t.arr[x].v, t.arr[nx].v)){
				if (xLow) { // Look at child nodes if necessary
					var lx = (x << 1) + 1;
					var rx = (x << 1) + 2;
					if (rx >= t.size || t.compare(t.arr[rx].v, t.arr[lx].v))
						nx = lx;
					else
						nx = rx;
					if (nx >= t.size || (t.compare(t.arr[nx].v, t.arr[x].v)))
						break;
				} else break;
			}
			// noinspection DuplicatedCode
			var tmp = t.arr[x];
			var tmp2 = t.arr[nx];
			// Swap items in the heap
			t.arr[x] = tmp2;
			t.arr[nx] = tmp;
			// Swap items in the map
			var foo = t.keys[tmp.k];
			t.keys[tmp.k] = t.keys[tmp2.k];
			t.keys[tmp2.k] = foo;
			// Next iteration
			x = nx;
		}
	}

	peek(){
		return this.arr[0];
	}

	pop(){
		var t = this;
		if(t.size <= 0)
			return undefined;
		var rtn = t.arr[0]; // Grab first item
		// Place last item at index 0
		t.arr[0] = t.arr[t.size -1];
		t.keys[t.arr[0].k] = 0;
		t.size--;
		t.arr.length--;
		t.keys[rtn.k] = undefined;
		for(var x = 0; x < t.size;){
			var lx = (x << 1) + 1;
			var rx = (x << 1) + 2;
			var nx;
			if(rx >= t.size || t.compare(t.arr[rx].v, t.arr[lx].v))
				nx = lx;
			else
				nx = rx;
			if(nx >= t.size || (rx >= t.size && t.compare(t.arr[nx].v, t.arr[x].v)))
				break;
			// noinspection DuplicatedCode
			var tmp = t.arr[x];
			var tmp2 = t.arr[nx];
			// Swap items in the heap
			t.arr[x] = tmp2;
			t.arr[nx] = tmp;
			// Swap items in the map
			var foo = t.keys[tmp.k];
			t.keys[tmp.k] = t.keys[tmp2.k];
			t.keys[tmp2.k] = foo;
			// Next iteration
			x = nx;
		}
		return rtn;
	}
}