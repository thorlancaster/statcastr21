/**
 * Encodes the numeric types of plays that can be sent over the wire
 * and stored in BasketballPBPItem objects
 */
/**
 * WARNING: Make sure to add all these in BasketballTeam.js as well or 
 * THINGS WILL BREAK as a GAME-ENDING BUG
 */
const BasketballPlayType = {
    FOUL_P: 1,
    FOUL_T: 2,
    FT_MADE: 3,
    FT_MISS: 4,
    P2_MADE: 5,
    P2_MISS: 6,
    DUNK_MADE: 7,
    DUNK_MISS: 8,
    P3_MADE: 9,
    P3_MISS: 10,
    REB_OFF: 11,
    REB_DEF: 12,
    REB_UNK: 13,
    ASSIST: 14,
    BLOCK: 15,
    STEAL: 16,
    TURNOVER: 17,
    SET_CLOCK: 18,
    SUB: 19,
    CHARGE_TAKEN: 20,
    longStr: [
      "INVALID",
      "Foul",
      "Technical Foul",
      "Made Free Throw",
      "Missed Free Throw",
      "Made 2-Pointer",
      "Missed 2-Pointer",
      "Made Dunk",
      "Missed Dunk",
      "Made 3-Pointer",
      "Missed 3-Pointer",
      "Offensive Rebound",
      "Defensive Rebound",
      "Rebound",
      "Assist",
      "Block",
      "Steal",
      "Turnover",
      "Clock Set",
      "Substitution",
      "Charge Taken"
    ],
    shortStr: [
      "INVALID",
      "Foul",
      "Tech FL",
      "Made FT",
      "Miss FT",
      "Made 2",
      "Miss 2",
      "Made Dunk",
      "Miss Dunk",
      "Made 3",
      "Miss 3",
      "Off Reb",
      "Def Reb",
      "Rebound",
      "Assist",
      "Block",
      "Steal",
      "T-over",
      "CLK Set",
      "Sub",
      "Chg Taken"
    ],
    /**
     * Return the points of this play
     * @param {Integer} x BasketballPlayType value
     */
    pointsOf: function(x){
      var t = this;
      switch(x){
        case t.FT_MADE: return 1;
        case t.P2_MADE: case t.DUNK_MADE: return 2;
        case t.P3_MADE: return 3;
        default:
        return 0;
      }
    },
    /**
     * Return a human-readable description of this play
     * @param {*} x BasketballPlayType value
     */
    toLongStr: function(x){return this.longStr[x];},
    /**
     * Return a human-readable, abbreviated description of this play
     * @param {*} x BasketballPlayType value
     */
    toShortStr: function(x){return this.shortStr[x];},
    isValid: function(x){
      return x >= 1 && x <= 20;
    }
  }