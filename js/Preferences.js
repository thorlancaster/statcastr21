
class PreferencesClass {
    constructor(name) {
        var t = this;
        t._name = name;
    }
    getSaveName() {
        return this._name + ".preferences";
    }
    toJSON() {
        var result = {};
        for (var x in this)
            if (x !== "_name")
                result[x] = this[x];
        return JSON.stringify(result);
    }
    save() {
        localStorage.setItem(this.getSaveName(), this.toJSON());
    }
    delete() {
        localStorage.removeItem(this.getSaveName());
    }
    load() {
        var o = null;
        try {
            o = JSON.parse(localStorage.getItem(this.getSaveName()));
        } catch (e) {
            console.warn("Preferences failed to load", e);
        }
        this.setFrom(o);
    }
    /**
     * For all values in a given object, apply them to this Preferences object.
     * This is not a deep copy
     * @param {Object} obj 
     */
    setFrom(obj){
        if (obj != null) {
            for(var x in obj){
                this[x] = obj[x];
            }
        }
    }

    defaults(){
        var p1 = new PreferencesClass();
        for(var x in this){
            if(x !== "_name")
            delete this[x];
        }
        for(var x in p1){
            if(x !== "_name")
            this[x] = p1[x];
        }
    }
}

class MainPreferencesClass extends PreferencesClass{
    constructor(name){
        super(name);
        var t = this;
        t.playersAreColored = true;
        t.useAbbrsOnMobile = true;
        t.enlargeFonts = true;
        t.defaultView = "scoreboard";
    }

    renameFn(str){
        switch(str){
            case "playersAreColored": return "Highlight player names";
            case "useAbbrsOnMobile": return "Abbreviate on small screens";
            case "enlargeFonts": return "Larger font";
            case "defaultView": return null;
        }
        return str;
    }
}

class CredentialsPreferencesClass extends PreferencesClass{
    constructor(name){
        super(name);
        var t = this;
        t.username = "";
        t.password = "";
    }
    hasCredentials(){
        return this.username.length + this.password.length > 0;
    }

    renameFn(str){
        if(str === "username" || str === "password")
            return str;
        return false;
    }
}

// Used to hold a list of events. Used by Admin when they can't connect
// Unused if the admin queries the db correctly. Should do that if possible
// class EventListPreferencesClass extends PreferencesClass{
//     constructor(name){
//         super(name);
//         var t = this;
//         t.events = null;
//     }
// }