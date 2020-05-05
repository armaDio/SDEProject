var express = require("express");
var bodyParser = require("body-parser");
var fs = require("fs");
var axios = require("axios");
var htmlParser = require("htmlparser");
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
      fetchMonsters(avgPlayerLevel, 7, difficulty).then(function(monsterListArrayRaw){
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
        var currentMonsterExp = 0;
        var monsterCountByCr = {};
        console.log(crList);
        console.log(totalPlayerExp + " " + avgPlayerLevel);
        console.log(adjustedPlayerExp + " " + monsterCount);
        for(var i = 0; i<crList.length; i++) {
          monsterCountByCr[""+crList[i]] = 0;
        }
        for(var i = 0; i<monsterCount; i++) {
          var avgExpPerMonster = Math.floor(adjustedPlayerExp / monsterCount);
          var threshold = Math.floor(adjustedPlayerExp * 0.05);
          console.log("Monster " + (i+1) + " difference = " + Math.abs(currentMonsterExp - avgExpPerMonster * i) + " threshold = " + threshold);
          if(Math.abs(currentMonsterExp - avgExpPerMonster * i) < threshold && i != monsterCount-1) {
            var selectedCr = 0;
            do {
              selectedCr = Math.floor(Math.random() * crList.length);
            } while(expTable[crList[selectedCr]] + expTable[crList[crList.length-1]] * (monsterCount - (i+1)) > adjustedPlayerExp + threshold);
            monsterCountByCr[crList[selectedCr]]++;
            currentMonsterExp += expTable[crList[selectedCr]];
            console.log("Randomly selected " + expTable[crList[selectedCr]]);
          } else {
            var minIndex = 0;
            crList.forEach(function(cr, index){
              if(Math.abs((currentMonsterExp + expTable[cr]) - avgExpPerMonster * (i+1)) < Math.abs((currentMonsterExp + expTable[crList[minIndex]]) - avgExpPerMonster * (i+1))) {
                minIndex = index;
              }
            });
            monsterCountByCr[crList[minIndex]]++;
            currentMonsterExp += expTable[crList[minIndex]];
            console.log("Forced selection " + expTable[crList[minIndex]]);
          }
        }
        console.log(monsterCountByCr);
        var encounterMonsters = [];
        var responseCRList = {};
        var sum = 0;
        for(var key of Object.keys(monsterCountByCr)) {
          sum += monsterCountByCr[key] * expTable[key];
          if(monsterCountByCr[key] > 0) {
            responseCRList[key] = monsterCountByCr[key];
          }
          for(var i = 0; i<monsterCountByCr[key]; i++) {
            var randomIndex = Math.floor(Math.random() * monsterListByCR[key].length);
            encounterMonsters.push(monsterListByCR[key][randomIndex]);
          }
        }
        console.log(sum);
        fetchNames(encounterMonsters.length).then(function(names){
          customMonsterList = [];
          namesList = names.split(/\r?\n/);
          console.log(namesList);
          encounterMonsters.forEach(function(monster, index){
            var newName = namesList[index]+" ("+monster.name+")";
            var newMonster = {
              name: newName,
              size: monster.size,
              type: monster.type,
              alignment: monster.alignment,
              armor_class: monster.armor_class,
              hit_points: monster.hit_points,
              hit_dice: monster.hit_dice,
              speed: monster.speed,
              stats: {
                strength: monster.strength,
                dexterity: monster.dexterity,
                constitution: monster.constitution,
                intelligence: monster.intelligence,
                wisdom: monster.wisdom,
                charisma: monster.charisma
              },
              challenge_rating: monster.challenge_rating
            }
            customMonsterList.push(newMonster);
          });
          res.json({
            difficulty: difficulty,
            playerCount: players.length,
            avgPartyLevel: avgPlayerLevel,
            monstersCRList: responseCRList,
            monsters: customMonsterList
          });
        });
        
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

function fetchMonsters(level, interval, difficulty) {
  return new Promise((resolve) => {
    var difficultyOffset = 0;
    switch(difficulty) {
      case("hard"): difficultyOffset = 1; 
      break;
      case("deadly"): difficultyOffset = 2;
      break;
      default: difficultyOffset = 0;
      break;
    }
    var intervalValue = interval-difficultyOffset;
    var monsterCRLevels = []
    for(var i = level+difficultyOffset; i>-3 && i>level-intervalValue; i--) {
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
      monsterCRLevels[level-(i-difficultyOffset)] = cr;
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

function fetchNames(count) {
  return new Promise((resolve) => {
    var url = "https://donjon.bin.sh/name/rpc-name.fcgi?type=Draconic+Male&n="+count;
    axios.get(url).then(function(response){
      resolve(response.data);
    });
  });
}