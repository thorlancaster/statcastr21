class ReliableChannel{
	static STATUS_INIT = 0;
	static STATUS_CONNECTING = 1;
	static STATUS_CONNECTED = 2;
	static STATUS_LOST = 3;

	constructor() {
		var t = this;
		// When the channel is first created, the status is first created
		t.STATUS_INIT = 0;

		// After connect() is called, the status is this until the connection is made
		t.STATUS_CONNECTING = 1;

		// We can breathe a sigh of relief now, we have bidirectional communication
		t.STATUS_CONNECTED = 2;

		// An unrecoverable error occured. Channel must be destroyed and recreated
		t.STATUS_LOST = 3;
	}

	static create(url){
		if(url.startsWith("wss://"))
			return new WebSocketReliableChannel(url);
		throw "Unsupported protocol for " + url;
	}

	/**
	 * Connect to the address specified in the constructor
	 */
	connect(){
		throw "Not Implemented";
	}

	disconnect(){
		throw "Not Implemented";
	}

	/**
	 * @returns status - one of STATUS_INIT, STATUS_CONNECTING, STATUS_CONNECTED, or STATUS_LOST
	 */
	getStatus(){
		throw "Not Implemented";
	}

	getAddress(){
		throw "Not Implemented";
	}

	/**
	 * Set the function that will be called when new data becomes available
	 * or the connection changes.
	 * On receive, the function will be called with no arguments
	 * On status change, the function will be called with the new status
	 * @param f Receive handler function
	 */
	setReceiveHandler(f){
		throw "Not Implemented";
	}

	/**
	 * @returns Number of bytes queued but not yet sent over the network
	 */
	getBackpressure(){
		throw "Not Implemented";
	}

	/**
	 * Calculate or estimate the number of bytes per second that can be handled by the connection.
	 * Err on the conservative (slow) side - e.g. assume a WebSocket is connected to a crappy
	 * 2g network until proven otherwise
	 * @returns Estimated Bandwidth
	 */
	getBandwidth(){
		throw "Not Implemented";
	}

	/**
	 * @returns the number of messages received but not yet consumed by read() calls
	 */
	available(){
		throw "Not Implemented";
	}

	/**
	 * @returns Next packet in RX queue (as Uint8Array) or undefined if the queue is empty
	 */
	read(){
		throw "Not Implemented";
	}

	/**
	 * Write a Uint8Array to the channel. It will be sent as soom as possible
	 * @param p Packet to send
	 */
	write(p){
		throw "Not Implemented";
	}

	close(){
		console.warn("ReliableChannels should define a close() method for GC")
	}
}

/**
 * WebSocket-based ReliableChannel implementation.
 * Use this one whenever possible
 */
class WebSocketReliableChannel extends ReliableChannel{
	constructor(url) {
		super();
		var t = this;
		t._addr = url;
		t._bandwidth = 50000; // Dial-up, bad 2g (pessimistic)
		t._backPressure = 0;
		t.preOpenSendQueue = []; // Handle sending before socket connects
		t._readQueue = []; // Hold incoming data
	}

	_onClose(){
		this._invokeRxHandler(this.getStatus());
	}
	_onOpen(){
		// Send out any queued-up data from before the open event
		var t = this;
		var posq = t.preOpenSendQueue;
		for(var x = 0; x < posq.length; x++){
			t._ws.send(posq[x]);
		}
		t._invokeRxHandler(t.getStatus());
	}
	_onMessage(e){
		this._readQueue.push(new Uint8Array(e.data));
		this._invokeRxHandler();
	}

	_invokeRxHandler(arg){
		var t =  this;
		if(t._rxHandler) {
			try {
				if (window.DEBUGGR)
					DEBUGGR.invokeProtected(t._rxHandler, this, arg);
				else
					t._rxHandler(arg);
			} catch(e){
				console.error(e);
			}
		}
	}

	connect(){
		var t = this;
		var ws = new WebSocket(t._addr);
		t._ws = ws;
		ws.binaryType = "arraybuffer";
		ws.onclose = t._onClose.bind(t);
		ws.onmessage = t._onMessage.bind(t);
		ws.addEventListener("open", t._onOpen.bind(t));
	}

	close(){
		this.disconnect();
		this._ws = null;
	}

	disconnect(){
		if(this._ws)
			this._ws.close();
	}
	getStatus(){
		var t = this;
		if(!t._ws)
			return t.STATUS_INIT;
		switch(t._ws.readyState){
			case 0: // Connecting
				return t.STATUS_CONNECTING;
			case 1: // Open
				return t.STATUS_CONNECTED;
			case 2: // Closing
			case 3: // Closed
				return t.STATUS_LOST;
		}
	}
	getAddress(){
		if(!this._ws)
			return this._addr;
		return this._ws.url;
	}


	setReceiveHandler(f){
		this._rxHandler = f;
	}


	getBackpressure(){
		if(!this._ws)
			return this._backPressure;
		return this._ws.bufferedAmount;
	}
	getBandwidth(){
		return this._bandwidth;
	}


	available(){
		return this._readQueue.length;
	}
	read(){
		return this._readQueue.shift();
	}
	write(p){
		if(Array.isArray(p))
			p = new Uint8Array(p);
		var t = this;
		if(t.getStatus() < t.STATUS_CONNECTED)
			t.preOpenSendQueue.push(p);
		if(t.getStatus() === t.STATUS_CONNECTED)
			t._ws.send(p);
	}
}




