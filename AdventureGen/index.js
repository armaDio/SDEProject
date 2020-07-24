var express = require("express");
var bodyParser = require("body-parser");
var axios = require("axios");
var fs = require("fs");
var app = express();
var cors = require('cors');
const url = require('url');

app.listen(3000, function () {
  console.log("Example app listening on port 3000!");
});

app.use(cors());

app.use(//function(req, res, next) {  
  bodyParser.json()
  //res.header("Access-Control-Allow-Origin", "*"); // update to match the domain you will make the request from
  //res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  //next();
/*}*/);

var expRaw = fs.readFileSync(__dirname+"/data/exp.csv", "utf8");
var playerExpRaw = fs.readFileSync(__dirname+"/data/playerExp.csv", "utf8");
var tmplines = expRaw.split(/\r?\n/);
var expTable = {};
tmplines.forEach(function(line){
  var tmpvals = line.split(/,/);
  var cr = tmpvals[0];
  expTable[""+cr] = parseFloat(tmpvals[1]);
});
tmplines = playerExpRaw.split(/\r?\n/);
var playerExpTable = {};
tmplines.forEach(function(line){
  var tmpvals = line.split(/,/);
  var level = tmpvals[1];
  playerExpTable[""+level] = tmpvals[0];
});

app.post("/adventure", function (req, res) {
  //console.log(req.body);
  //console.log(req);
  if(req.header("Content-Type") == "application/json") {
    var players = req.body.players;
    var encounters = req.body.encounters;
    var curve = req.body.curve;
    var numEncounters = req.body.numEncounters;
    if(validateLevels(players)) {
      if(curve == undefined) {
        if(validateDifficulties(encounters)) {
          console.log(players + " " + encounters);
          fetchEncounter(0, players, encounters, [], 0).then(function(encArray){
            var encounterList = [];
            encArray.forEach(function(enc, index){
              encounterList.push({
                encIndex: index+1,
                difficulty: enc.genEncounter.difficulty,
                initPlayers: enc.oldPlayers,
                monsters: enc.genEncounter.monsters,
                encounterXP: enc.genReward.TotalXP,
                rewards: enc.genReward.rewards,
                newPlayers: enc.newPlayers
              });
            });
			res.statusCode = 201;
            res.json({
              reqEncounters: encounters,
              genEncounters: encounterList
            });
          }, function(error){
            res.statusCode = 500;
            res.json({status: 500, Description: "Internal Error", Details: error});
          });
        } else {
          res.statusCode = 400;
          res.json({status: 400, Description: "Bad Request", Details: "Encounters expected as array of values among 'easy', 'medium', 'hard' or 'deadly'"});
        }
      } else {
        if(validateCurve(curve)) {
          if(validateNumEnc(numEncounters)) {
            encounters = generateEncounters(curve, numEncounters);
            console.log(players + " " + encounters);
            fetchEncounter(0, players, encounters, [], 0).then(function(encArray){
              var encounterList = [];
              encArray.forEach(function(enc, index){
                encounterList.push({
                  encIndex: index+1,
                  difficulty: enc.genEncounter.difficulty,
                  initPlayers: enc.oldPlayers,
                  monsters: enc.genEncounter.monsters,
                  encounterXP: enc.genReward.TotalXP,
                  rewards: enc.genReward.rewards,
                  newPlayers: enc.newPlayers
                });
              });
			  res.statusCode = 201;
              res.json({
                reqEncounters: encounters,
                genEncounters: encounterList
              });
            }, function(error){
              res.statusCode = 500;
              res.json({status: 500, Description: "Internal Error", Details: error});
            });
          } else {
            res.statusCode = 400;
          res.json({status: 400, Description: "Bad Request", Details: "Curve also expects numEncounters as an integer ranging from 1 to 15"});
          }
        } else {
          res.statusCode = 400;
          res.json({status: 400, Description: "Bad Request", Details: "Curve expected as value among 'standard', 'challenging' or 'impossible'"});
        }
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

function fetchEncounter(encIndex, players, encounters, tmpRes, tmpExp) {
  return new Promise((resolve, reject) => {
      var prevPlayers = [];
      players.forEach(function(player, index){
        prevPlayers[index] = players[index];
        var dividedExp = Math.floor(tmpExp/players.length);
        while((dividedExp - playerExpTable[prevPlayers[index]+1]) >= 0)
        {
          prevPlayers[index]++;
          dividedExp -= playerExpTable[prevPlayers[index]];
        }
      });
      var encReqJson = {
        difficulty: encounters[encIndex],
        players: prevPlayers
      };
      var encUrl = "http://localhost:3002/encounter";
      var rewUrl = "http://localhost:3001/rewards";
      console.log("enc req here");
      console.log(encUrl);
      axios.post(encUrl, encReqJson, { headers: {"Content-Type": "application/json"}}).then(function(encResponse){
        console.log("enc res received");
        console.log("rew req here");
        axios.post(rewUrl, {monsters: encResponse.data.monsters}, { headers: {"Content-Type": "application/json"}}).then(function(rewResponse){
          console.log("rew res received");
          tmpExp += rewResponse.data.TotalXP;
          console.log(Math.floor(tmpExp/players.length));
          var updatedPlayers = [];
          players.forEach(function(player, index){
            updatedPlayers[index] = players[index];
            var dividedExp = Math.floor(tmpExp/players.length);
            while((dividedExp - playerExpTable[updatedPlayers[index]+1]) >= 0)
            {
              updatedPlayers[index]++;
              dividedExp -= playerExpTable[updatedPlayers[index]];
            }
          });
          tmpRes.push({
            oldPlayers: prevPlayers,
            genEncounter: encResponse.data,
            genReward: rewResponse.data,
            newPlayers: updatedPlayers
          });
          encIndex++;
          if(encIndex < encounters.length) {
            resolve(fetchEncounter(encIndex, players, encounters, tmpRes, tmpExp));
          } else {
            resolve(tmpRes);
          }
        }, function(error){
          reject(error);
        });
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

function validateDifficulties(difficulties) {
  var toRtn = true;
  if(Array.isArray(difficulties) && difficulties.length > 0) {
    difficulties.forEach(function(difficulty){
      if(!["easy", "medium", "hard", "deadly"].includes(difficulty)) {
        toRtn = false;
      }
    });
  } else {
    toRtn = false;
  }
  return toRtn;
}

function validateCurve(curve) {
  if(curve != undefined) {
    if(["standard", "challenging", "impossible"].includes(curve)) {
      return true;
    }
  }
  return false;
}

function validateNumEnc(numEncounters) {
  if(numEncounters != undefined) {
    if((Number.isInteger(numEncounters)) && numEncounters > 0 && numEncounters < 16) {
      return true;
    }
  }
  return false;
}

function generateEncounters(curve, numEncounters) {
  var encounters = [];
  switch(curve){
    case 'standard':
      for(var i = 0; i < numEncounters; i++) {
        switch(i % 5) {
          case 0: encounters.push('easy');
            break;
          case 1: encounters.push('easy');
            break;
          case 2: encounters.push('medium');
            break;
          case 3: encounters.push('medium');
            break;
          case 4: encounters.push('hard');
            break;
        }
      }
      break;
    case 'challenging':
      for(var i = 0; i < numEncounters; i++) {
        switch(i % 5) {
          case 0: encounters.push('easy');
            break;
          case 1: encounters.push('medium');
            break;
          case 2: encounters.push('medium');
            break;
          case 3: encounters.push('hard');
            break;
          case 4: encounters.push('deadly');
            break;
        }
      }
      break;
    case 'impossible':
      for(var i = 0; i < numEncounters; i++) {
        switch(i % 5) {
          case 0: encounters.push('medium');
            break;
          case 1: encounters.push('hard');
            break;
          case 2: encounters.push('hard');
            break;
          case 3: encounters.push('deadly');
            break;
          case 4: encounters.push('deadly');
            break;
        }
      }
      break;
  }
  return encounters;
}