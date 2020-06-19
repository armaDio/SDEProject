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
      fetchEncounter(0, players, encounters);
    } else {
      res.statusCode = 400;
      res.json({status: 400, Description: "Bad Request", Details: "Player levels array and encounter difficulty array expected"});
    }
  } else {
    res.statusCode = 400;
    res.json({status: 400, Description: "Bad Request", Details: "application/json expected"});
  }
});

function fetchEncounter(encIndex, players, encounters) {
  return new Promise((resolve) => {
    var reqJson = {
      difficulty: encounters[encIndex],
      players: players
    };
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