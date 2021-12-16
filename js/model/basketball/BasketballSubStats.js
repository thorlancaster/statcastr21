
/**
 * Class to keep track of the stats of a team given a filter.
 * This class is not used to keep track of the whole game.
 * BasketballGameModel does that by itself.
 */
class BasketballSubStats{
    constructor(team, opp, filter){
      var t = this;
      t.srcTeam = team;
      t.srcOpp = opp;
      t.team = new BasketballTeam();
      t.team.copyRoster(t.srcTeam);
      t.opp = new BasketballTeam();
      t.opp.copyRoster(t.srcOpp);
      t.filter = filter;
    }
    /**
     * Reset this model to clear the effects of all the plays it ever received
     * and reset the starters. Should be called only when the Model invalidates
     * it's cache prior to rebuilding it
     */
    reset(){
      this.team.starters = this.srcTeam.starters;
      this.team.reset();
      this.opp.starters = this.srcOpp.starters;
      this.opp.reset();
    }
  
    setFilter(filter){
      this.filter = filter;
    }
  
    /**
     * Apply a play to this sub-stats view. All plays in the game should be
     * passed to this function as they arrive, this class will take care of
     * filtering.
     * @param {PBPItem} play 
     */
    doPlay(play){
      var t = this;
      var filterFail = false;
      for(var x in t.filter){
        if(t.filter[x] != play[x]){
          filterFail = true;
          break;
        }
      }
      t.team.doPlay(play, play.team != true, filterFail);
      t.opp.doPlay(play, play.team != false, filterFail);
    }
  }