/**
 * Class that handles setting up / tearing down / association of Synchronizrs,
 * ReliableChannels, and sessions between client and server
 *
 * In here, data is encapsulated by:
 * * Game layer - game info to literals
 * * SynDiff layer - literals to information and diff info
 * * Synchronizr later - add arrNum selection to above
 * * Manager layer - Each packet has a byte prepended to signify type
 */
class SynchronizrManager{
	constructor() {
		var t = this;
	}

}