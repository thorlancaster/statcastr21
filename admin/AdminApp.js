class AdminApp{
	constructor(rootEl) {
		this.rootEl = rootEl;
	}

	/**
	 * Invoked from the Loader embedded into the page.
	 * Starts the entire app.
	 */
	start(){
		var t = this;
		t.mgr = new SynchronizrManager();
		t.mainPanel = new UIPanel();
		t.rootEl.appendChild(t.mainPanel.getElement());
	}
}