
class BasketballTeam extends Team {
  constructor(info) {
    super(info);
    this.PLAYER_CLASS = BasketballPlayer;
  }
  doPlayForTime(p) {
    var t = this;
    // debugger;
    var dTime = t.lastPlayTime.ms - p.millis;
    if (dTime > 0) {
      for (var x in t.players) {
        var pl = t.players[x];
        if (pl.onCourt)
          pl.playMs += dTime; // Playing time
        pl.lastMs = p.millis; // Time when playing time was last updated
        // if(pl.id == '1'){
        //   console.log(pl.playMs)
        // }
      }
    }
    t.lastPlayTime.ms = p.millis;
    t.lastPlayTime.pd = p.period;
  }

  /**
   * Apply a PBP play to this team's status
   * @param {*} p Play to apply
   * @param {*} otherTeam True if play is for other team
   * @param {*} otherFilter True if play does not match the filter.
   * In this case it would only be used for SUB_IN and SUB_OUT
   */
  doPlay(p, otherTeam, otherFilter) {
    var t = this;
    try {
      if (!otherFilter) {
        t.doPlayForTime(p);
      }

      if (!otherTeam) {
        var pl = t.players[p.pid];
        var pl2 = t.players[p.pid2];
        assert(pl != null, "Player for doPlay DNE");
        const T = BasketballPlayType;
        if (!otherFilter) {
          switch (p.type) {
            case T.FOUL_P: pl.pFouls++; break;
            case T.FOUL_T: pl.tFouls++; break;
            case T.FT_MADE: pl.ftMade++; break;
            case T.FT_MISS: pl.ftMiss++; break;
            case T.P2_MADE: pl.p2NormMade++; break;
            case T.P2_MISS: pl.p2NormMiss++; break;
            case T.DUNK_MADE: pl.dunkMade++; break;
            case T.DUNK_MISS: pl.dunkMiss++; break;
            case T.P3_MADE: pl.p3Made++; break;
            case T.P3_MISS: pl.p3Miss++; break;
            case T.REB_OFF: pl.offReb++; break;
            case T.REB_DEF: pl.defReb++; break;
            case T.REB_UNK: pl.unkReb++; break;
            case T.ASSIST: pl.assists++; break;
            case T.BLOCK: pl.blocks++; break;
            case T.STEAL: pl.steals++; break;
            case T.TURNOVER: pl.turnovers++; break;
            case T.SUB: pl.onCourt = true; pl2.onCourt = false; break;
            case T.CHARGE_TAKEN: pl.charges++; break;
            default: assert(false, "Unrecognized play type"); // TODO support all play types

          }
        } else {
          switch (p.type) {
            case T.SUB_IN: pl.onCourt = true; break;
            case T.SUB_OUT: pl.onCourt = false; break;
          }
        }
      }
    } catch (e) {
      console.error("CRITICAL: Failed to parse play", e);
    }
  }
  copyRoster(srcTeam) {
    this.players.length = 0;
    for (var x in srcTeam.players) {
      var p = srcTeam.players[x];
      this.addPlayer(new BasketballPlayer(p.id, p.name));
    }
  }
}


  // class TestBasketballTeam extends BasketballTeam{
  //   constructor(info){
  //     super(info);
  //     var t = this;
  //     var p1 = new BasketballPlayer("1", "Isaac Johnson");
  //     var p2 = new BasketballPlayer("3", "Javonne Nesbit");
  //     var p3 = new BasketballPlayer("21", "Colt Miller");
  //     var p4 = new BasketballPlayer("24", "Mason Dethman");
  //     var p5 = new BasketballPlayer("44", "Bode Miller");
  //     var p6 = new BasketballPlayer("45", "Brett Stentoft");
  //     p6.onCourt = false;
  //     t.addPlayer(p1);
  //     t.addPlayer(p2);
  //     t.addPlayer(p3);
  //     t.addPlayer(p4);
  //     t.addPlayer(p5);
  //     t.addPlayer(p6);
  //   }
  // }
