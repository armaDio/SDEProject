var express = require("express");
var bodyParser = require("body-parser");
var app = express();

app.listen(3000, function () {
  console.log("Example app listening on port 3000!");
});

app.use(bodyParser.json());

app.get("/", function (req, res) {
  if(req.header("Content-Type") == "application/json") {
    var players = req.body.players;
    var encounters = req.body.encounters;
    if(Array.isArray(players) && players.length > 0 && Array.isArray(encounters) && encounters.length > 0) {
      console.log(players + " " + encounters);
    } else {
      res.statusCode = 400;
      res.json({status: 400, Description: "Bad Request", Details: "Player levels array and encounter difficulty array expected"});
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