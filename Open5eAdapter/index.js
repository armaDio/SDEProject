var express = require("express");
var bodyParser = require("body-parser");
var axios = require("axios");
var fs = require("fs");
var app = express();
var cors = require('cors');

app.listen(3010, function () {
  console.log("Example app listening on port 3010!");
});

app.use(cors());

app.use(//function(req, res, next) {  
  bodyParser.json()
  //res.header("Access-Control-Allow-Origin", "*"); // update to match the domain you will make the request from
  //res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  //next();
/*}*/);

var expRaw = fs.readFileSync(__dirname+"/data/exp.csv", "utf8");
var tmplines = expRaw.split(/\r?\n/);
var expTable = {};
tmplines.forEach(function(line){
  var tmpvals = line.split(/,/);
  var cr = tmpvals[0];
  expTable[""+cr] = parseFloat(tmpvals[1]);
});

app.get("/monsters", function (req, res) {
  var cr = req.query.cr;
  if(validateCr(cr)) {
    fetchMonsters(cr).then(function(monsters){
      var monsterList = [];
      monsters.results.forEach(function(monster, index){
        var newMonster = {
          name: monster.name,
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
        monsterList.push(newMonster);
      });
      res.statusCode = 200;
      res.json({
        results: monsterList
      });
    }, function(error){
      res.statusCode = 500;
      res.json({status: 500, Description: "Internal Error", Details: error});
    });
  } else {
    res.statusCode = 400;
    res.json({status: 400, Description: "Bad Request", Details: "Monster cr expected as an integer between 0 and 30"});
  }
});

function fetchMonsters(cr) {
  return new Promise((resolve, reject) => {
    var url = "https://api.open5e.com/monsters/?challenge_rating="+cr;
    axios.get(url).then(function(response){
      resolve(response.data);
    }, function(error){
      reject(error);
    });
  });
}

function validateCr(cr) {
  if(cr != undefined) {
    if((["0", "1/8", "1/4", "1/2"].includes(cr)) || ((Number.isInteger(parseInt(cr))) && cr > 0 && cr < 31)) {
      return true;
    }
  }
  return false;
}