var express = require("express");
var bodyParser = require("body-parser");
var fs = require("fs");
var axios = require("axios");
var htmlParser = require("htmlparser");
const { rejects } = require("assert");
var app = express();
var cors = require('cors');


app.listen(3002, function () {
  console.log("Example app listening on port 3002!");
});



app.use(cors());
app.use(bodyParser.json());

var thresholdRaw = fs.readFileSync(__dirname+"/data/threshold.csv", "utf8");
var expRaw = fs.readFileSync(__dirname+"/data/exp.csv", "utf8");
var multRaw = fs.readFileSync(__dirname+"/data/multipliers.csv", "utf8");
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
tmplines = expRaw.split(/\r?\n/);
var expTable = {};
tmplines.forEach(function(line){
  var tmpvals = line.split(/,/);
  var cr = tmpvals[0];
  expTable[""+cr] = parseFloat(tmpvals[1]);
});
tmplines = multRaw.split(/\r?\n/);
var multTable = {};
tmplines.forEach(function(line){
  var tmpvals = line.split(/,/);
  var npcCount = tmpvals[0];
  multTable[""+npcCount] = parseFloat(tmpvals[1]);
});

app.post("/encounter", function (req, res) {
  console.log("Req received");
  console.log(req.body);
  if(req.header("Content-Type") == "application/json") {
    var players = req.body.players;
    var difficulty = req.body.difficulty;
    if(validateLevels(players)) {
      if(validateDifficulty(difficulty)) {
        console.log(difficulty);
        console.log(players);
        var totalPlayerExp = 0;
        var avgPlayerLevel = 0;
        players.forEach(function(level){
          totalPlayerExp += thresholdTable[level][difficulty];
          avgPlayerLevel += parseInt(level);
        });
        avgPlayerLevel = Math.floor(avgPlayerLevel/players.length);
        fetchMonsters(avgPlayerLevel, 12, difficulty).then(function(monsterListArrayRaw){
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
          var avgExpPerMonster = Math.floor(adjustedPlayerExp / monsterCount);
          var threshold = Math.floor(adjustedPlayerExp * 0.05);
          for(var i = 0; i<monsterCount; i++) {
            console.log("Monster " + (i+1) + " difference = " + Math.abs(currentMonsterExp - avgExpPerMonster * i) + " threshold = " + threshold);
            var crByChance = {}
            var totDiff = 0;
            if(Math.abs(currentMonsterExp - avgExpPerMonster * i) < threshold && i != monsterCount-1) {
              for(var j = 0; j<crList.length; j++) {
                totDiff += Math.abs((currentMonsterExp + expTable[crList[j]]) - avgExpPerMonster * (i+1));
                crByChance[""+totDiff] = crList[j];
              }
              var selectedCr = 0;
              do {
                var min = 0;
                var randomVal = Math.floor(Math.random() * (totDiff+1));
                for(var key of Object.keys(crByChance)) {
                  if(randomVal > min && randomVal <= parseInt(key)) {
                    selectedCr = crList.findIndex((cr) =>{return cr == crByChance[key]});
                  }
                  min = parseInt(key);
                }
                //selectedCr = Math.floor(Math.random() * crList.length);
              } while(currentMonsterExp + expTable[crList[selectedCr]] + expTable[crList[crList.length-1]] * (monsterCount - (i+1)) > adjustedPlayerExp + threshold);
              monsterCountByCr[crList[selectedCr]]++;
              currentMonsterExp += expTable[crList[selectedCr]];
              console.log("Randomly selected " + expTable[crList[selectedCr]]);
            } else {
              var minIndex = 0;
              crList.forEach(function(cr, index){
                if(Math.abs((currentMonsterExp + expTable[cr]) - avgExpPerMonster * (i+1)) < Math.abs((currentMonsterExp + expTable[crList[minIndex]]) - avgExpPerMonster * (i+1)) /*&& currentMonsterExp + expTable[cr] <= adjustedPlayerExp + threshold*/) {
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
          fetchNames(encounterMonsters.length).then(function(response){
            var customMonsterList = [];
            var namesList = response.results;
            console.log(namesList);
            encounterMonsters.forEach(function(monster, index){
              var newName = namesList[index]+" ("+monster.name+")";
              var newMonster = monster;
              newMonster.name = newName;
              customMonsterList.push(newMonster);
            });
            res.json({
              difficulty: difficulty,
              playerCount: players.length,
              avgPartyLevel: avgPlayerLevel,
              monstersCRList: responseCRList,
              monsters: customMonsterList
            });
          }, function(error){
            res.statusCode = 500;
            res.json({status: 500, Description: "Internal Error", Details: error});
          });
        }, function(error){
          res.statusCode = 500;
          res.json({status: 500, Description: "Internal Error", Details: error});
        });
      } else {
        res.statusCode = 400;
        res.json({status: 400, Description: "Bad Request", Details: "Difficulty expected as value among 'easy', 'medium', 'hard' or 'deadly'"});
      }
    } else {
      res.statusCode = 400;
      res.json({status: 400, Description: "Bad Request", Details: "Player levels array expected as array of integers ranging from 1 to 20"});
    }
  } else {
    res.statusCode = 400;
    res.json({status: 400, Description: "Bad Request", Details: "application/json expected"});
  }
});

function fetchMonsters(level, interval, difficulty) {
  return new Promise((resolve, reject) => {
    var difficultyOffset = 0;
    switch(difficulty) {
      case("hard"): difficultyOffset = 2; 
      break;
      case("deadly"): difficultyOffset = 3;
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
    var queryString = "?";
    for(var i = 0; i<monsterCRLevels.length; i++) {
      queryString += "cr=";
      queryString += monsterCRLevels[i];
      if(i != monsterCRLevels.length-1) {
        queryString += "&";
      }
    }
    var url = "http://localhost:3008/monsters"+queryString;
    axios.get(url).then(function(response){
        data = response.data.results;
      resolve(data);
    }, function(error){
      reject(error);
    });
  });
}

/*
function fetchMonsters(level, interval, difficulty) {
  return new Promise((resolve, reject) => {
    var difficultyOffset = 0;
    switch(difficulty) {
      case("hard"): difficultyOffset = 2; 
      break;
      case("deadly"): difficultyOffset = 3;
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
    Promise.all(requestsArr).then(function(responseArray){
      responseArray.forEach(function(response, index){
        dataArray[index] = response.data;
      });
      resolve(dataArray);
    }, function(error){
      reject(error);
    });
  });
}
*/

function fetchNames(count) {
  return new Promise((resolve, reject) => {
    var url = "http://localhost:3008/names?count="+count;
    axios.get(url).then(function(response){
      resolve(response.data);
    }, function(error){
      reject(error);
    });
  });
}

function validateLevels(players) {
  var toRtn = true;
  if(Array.isArray(players) && players.length > 0) {
    players.forEach(function(player){
      if(!(Number.isInteger(player)) || player < 1 || player > 20) {
        toRtn = false;
      }
    });
  } else {
    toRtn = false;
  }
  return toRtn;
}

function validateDifficulty(difficulty) {
  if(difficulty != undefined) {
    if(["easy", "medium", "hard", "deadly"].includes(difficulty)) {
      return true;
    }
  }
  return false;
}
