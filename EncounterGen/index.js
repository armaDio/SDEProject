var express = require("express");
var bodyParser = require("body-parser");
var fs = require("fs");
var axios = require("axios");
var app = express();

app.listen(3000, function () {
  console.log("Example app listening on port 3000!");
});

app.use(bodyParser.json());

app.get("/", function (req, res) {
  if(req.header("Content-Type") == "application/json") {
    var players = req.body.players;
    var difficulty = req.body.difficulty;
    if(Array.isArray(players) && players.length > 0 && difficulty != undefined) {
      console.log(difficulty);
      console.log(players);
      var thresholdRaw = fs.readFileSync(__dirname+"/data/threshold.csv", "utf8");
      var tmplines = thresholdRaw.split(/\r?\n/);
      var thresholdTable = {};
      tmplines.forEach(function(line){
        var tmpvals = line.split(/,/);
        var level = tmpvals[0];
        thresholdTable[level] = {};
        thresholdTable[level]["easy"] = parseInt(tmpvals[1]);
        thresholdTable[level]["medium"] = parseInt(tmpvals[2]);
        thresholdTable[level]["hard"] = parseInt(tmpvals[3]);
        thresholdTable[level]["deadly"] = parseInt(tmpvals[4]);
      });
      var expRaw = fs.readFileSync(__dirname+"/data/exp.csv", "utf8");
      tmplines = expRaw.split(/\r?\n/);
      var expTable = {};
      tmplines.forEach(function(line){
        var tmpvals = line.split(/,/);
        var cr = tmpvals[0];
        expTable[""+cr] = parseFloat(tmpvals[1]);
      });
      var multRaw = fs.readFileSync(__dirname+"/data/multipliers.csv", "utf8");
      tmplines = multRaw.split(/\r?\n/);
      var multTable = {};
      tmplines.forEach(function(line){
        var tmpvals = line.split(/,/);
        var npcCount = tmpvals[0];
        multTable[""+npcCount] = parseFloat(tmpvals[1]);
      });
      var totalPlayerExp = 0;
      var avgPlayerLevel = 0;
      players.forEach(function(level){
        totalPlayerExp += thresholdTable[level][difficulty];
        avgPlayerLevel += parseInt(level);
      });
      avgPlayerLevel = Math.floor(avgPlayerLevel/players.length);
      fetchMonsters(avgPlayerLevel).then(function(monsterListArrayRaw){
        console.log("Requests completed");
        var monsterListByCR = {};
        var crList = [];
        monsterListArrayRaw.forEach(function(list, index){
          crList[index] = list.results[0].challenge_rating;
          monsterListByCR[list.results[0].challenge_rating] = list.results;
        });
        var monsterCount = 0;
        var maxMonsterCount = 20;
        var adjustedPlayerExp = 0;
        do {
          monsterCount = Math.floor(Math.random() * (maxMonsterCount+1))+1;
          var multiplier = multTable["-"];
          var tmpMax = Number.MAX_SAFE_INTEGER;
          for(var key of Object.keys(multTable)) {
            if(key != "-" && monsterCount <= parseInt(key) && parseInt(key) < tmpMax) {
              tmpMax = parseInt(key);
              multiplier = multTable[""+tmpMax];
            }
          }
          adjustedPlayerExp = Math.floor(totalPlayerExp / parseFloat(multiplier));
          if(Math.floor(adjustedPlayerExp / expTable[crList[crList.length-1]]) < monsterCount) {
            monsterCount = 0;
          }
        } while(monsterCount < 1);
        var currentPlayerExp = adjustedPlayerExp;
        var currentMonsterCount = 0;
        var monsterCountByCr = {};
        console.log(crList);
        console.log(totalPlayerExp + " " + avgPlayerLevel);
        console.log(currentPlayerExp);
        console.log(monsterCount);
        for(var i = 0; i<crList.length; i++) {
          monsterCountByCr[""+crList[i]] = 0;
        }
        while(currentMonsterCount < monsterCount) {
          for(var i = 0; i<crList.length; i++) {
            var max = 0;
            while(max+currentMonsterCount < monsterCount && Math.floor((currentPlayerExp - ((max+1) * expTable[crList[i]])) / expTable[crList[crList.length-1]] >= monsterCount - currentMonsterCount)) {
              max++;
            }
            if(max > 0) {
              var count = Math.floor(Math.random() * (max+1));
              monsterCountByCr[""+crList[i]] += count;
              currentPlayerExp -= count * expTable[crList[i]];
              currentMonsterCount += count;
              console.log("CR "+crList[i]+" Max = "+max+" Count = +"+count+" exp = "+currentPlayerExp);
            }
          }
        }
        console.log(monsterCountByCr);
        for(var key of Object.keys(monsterCountByCr)) {
          
        }
        res.send("Good request")
      });
    } else {
      res.statusCode = 400;
      res.json({status: 400, Description: "Bad Request", Details: "Player levels array and encounter difficulty expected"});
    }
  } else {
    res.statusCode = 400;
    res.json({status: 400, Description: "Bad Request", Details: "application/json expected"});
  }
});

function fetchMonsters(level) {
  return new Promise((resolve,reject) => {
    var monsterCRLevels = []
    for(var i = level; i>-3 && i>level-7; i--) {
      var cr = "";
      switch(i) {
        case 0: cr = "1/2";
        break;
        case -1: cr = "1/4";
        break;
        case -2: cr = "1/8";
        break;
        default: cr = ""+i;
      }
      monsterCRLevels[level-i] = cr;
    }
    var requestsArr = [];
    var dataArray = [];
    for(var i = 0; i<monsterCRLevels.length; i++) {
      var url = "https://api.open5e.com/monsters/?challenge_rating="+monsterCRLevels[i];
      requestsArr[i] = axios.get(url);
    }
    Promise.all(requestsArr).then((responseArray) => {
      responseArray.forEach(function(response, index){
        dataArray[index] = response.data;
      })
      resolve(dataArray);
    });
  });
}