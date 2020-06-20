var express = require("express");
var bodyParser = require("body-parser");
var axios = require("axios");
var fs = require("fs");
var app = express();

app.listen(3000, function () {
  console.log("Example app listening on port 3000!");
});

app.use(bodyParser.json());

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

app.get("/", function (req, res) {
  if(req.header("Content-Type") == "application/json") {
    var players = req.body.players;
    var encounters = req.body.encounters;
    if(Array.isArray(players) && players.length > 0 && Array.isArray(encounters) && encounters.length > 0) {
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
        res.json({
          reqEncounters: encounters,
          genEncounters: encounterList
        });
      });
    } else {
      res.statusCode = 400;
      res.json({status: 400, Description: "Bad Request", Details: "Player levels array and encounter difficulty array expected"});
    }
  } else {
    res.statusCode = 400;
    res.json({status: 400, Description: "Bad Request", Details: "application/json expected"});
  }
});

function fetchEncounter(encIndex, players, encounters, tmpRes, tmpExp) {
  return new Promise((resolve) => {
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
      var encUrl = "http://localhost:3002/";
      var rewUrl = "http://localhost:3001/";
      console.log("enc req here");
      axios.get(encUrl, {data: encReqJson, headers: {"Content-Type": "application/json"}}).then(function(encResponse){
        console.log("enc res received");
        console.log("rew req here");
        axios.get(rewUrl, {data: {monsters: encResponse.data.monsters}, headers: {"Content-Type": "application/json"}}).then(function(rewResponse){
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
        });
      });
  });
}