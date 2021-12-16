
class BasketballPlayer extends Player{
    constructor(number, name){
      super(number, name);
      this.reset();
    }
    reset(){
      super.reset();
      var t = this;
  
      t.pFouls = 0;
      t.tFouls = 0;
  
      t.ftMade = 0;
      t.ftMiss = 0;
      t.p2NormMade = 0;
      t.p2NormMiss = 0;
      t.dunkMade = 0;
      t.dunkMiss = 0;
      t.p3Made = 0;
      t.p3Miss = 0;
  
      t.offReb = 0;
      t.defReb = 0;
      t.unkReb = 0;
      t.assists = 0;
      t.blocks = 0;
      t.steals = 0;
      t.turnovers = 0;
      t.charges = 0;
    }
    get p2Made(){return this.p2NormMade + this.dunkMade}
    get p2Miss(){return this.p2NormMiss + this.dunkMiss}
    get points(){return this.ftMade + this.p2Made * 2 + this.p3Made * 3}
    get fouls(){return this.pFouls + this.tFouls}
    get rebounds(){return this.offReb + this.defReb + this.unkReb}
    get fgMade(){return this.p2Made + this.p3Made}
    get fgMiss(){return this.p2Miss + this.p3Miss}
    get fgTotal(){return this.fgMade + this.fgMiss}
    get ftTotal(){return this.ftMade + this.ftMiss}
    get shotsMade(){return this.ftMade + this.fgMade}
    get shotsMiss(){return this.ftMiss + this.fgMiss}
    get shotsTotal(){return this.shotsMade + this.shotsMiss}
    get fgPercentage(){return this.fgMade / this.fgTotal * 100}
    get ftPercentage(){return this.ftMade / this.ftTotal * 100}
    get fgStr(){return this.fgMade + " / " + this.fgTotal}
    get ftStr(){return this.ftMade + " / " + this.ftTotal}
  
    get numNameStr(){
      var sid = this.id;
      // if(sid.length == 1) sid = "0" + sid;
      return '#' + sid + ' ' + this.name;
    }
    get numNameStrHtmlT(){// Get Num/Name Str as HTML, Team
      return "<span class='scPlayerTeam'>" + this.numNameStr + "</span>";
    }
    get numNameStrHtmlO(){// Get Num/Name Str as HTML, Opponent
      return "<span class='scPlayerOpp'>" + this.numNameStr + "</span>";
    }
    get nbaEfficiency(){
      var t = this;
      return t.points + t.rebounds + t.assists + t.steals + t.blocks - (t.fgMiss + t.ftMiss + t.turnovers);
    }
    getPlayTime(msLeft){
      var m = this.playMs;
      if(msLeft && this.lastMs){
        m += Math.max(0, this.lastMs - msLeft);
      }
      var min = Math.floor(m / 60000);
      var sec = Math.floor(m % 60000 / 1000);
      var ms = m % 1000;
      return{min: min, sec: sec, ms: ms};
    }

    getPlayTimeStr(msLeft){
      var p = this.getPlayTime(msLeft);
      if(p.sec < 10) return p.min + ":0" + p.sec; 
      else return p.min + ":" + p.sec; 
    }
  }
  