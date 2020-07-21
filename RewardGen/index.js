var express = require("express");
var bodyParser = require("body-parser");
var fs = require("fs");
var axios = require("axios");
var htmlParser = require("htmlparser");
var app = express();
var cors = require('cors');

//importing CSVs
{
  var expRaw = fs.readFileSync(__dirname+"/data/exp.csv", "utf8");
  tmplines = expRaw.split(/\r?\n/);
  var expTable = {};
  tmplines.forEach(function(line){
    var tmpvals = line.split(/,/);
    var cr = tmpvals[0];
    expTable[""+cr] = parseFloat(tmpvals[1]);
  });

  var i04raw = fs.readFileSync(__dirname+"/data/I04.csv", "utf8");
  var tmplines = i04raw.split(/\r?\n/);
  var i04table = [];
  tmplines.forEach(function(line){
    var tmpvals = line.split(/,/);
    var range = tmpvals[0];
    var item = {};
    item["roll"] = tmpvals[0];
    item["CP"] = tmpvals[1];
    item["SP"] = tmpvals[2];
    item["EP"] = tmpvals[3];
    item["GP"] = tmpvals[4];
    item["PP"] = tmpvals[5];
    i04table.push(item);
  });

  var i510raw = fs.readFileSync(__dirname+"/data/I510.csv", "utf8");
  var tmplines = i510raw.split(/\r?\n/);
  var i510table = [];
  tmplines.forEach(function(line){
    var tmpvals = line.split(/,/);
    var range = tmpvals[0];
    var item = {};
    item["roll"] = tmpvals[0];
    item["CP"] = tmpvals[1];
    item["SP"] = tmpvals[2];
    item["EP"] = tmpvals[3];
    item["GP"] = tmpvals[4];
    item["PP"] = tmpvals[5];
    i510table.push(item);
  });

  var i1116raw = fs.readFileSync(__dirname+"/data/I1116.csv", "utf8");
  var tmplines = i1116raw.split(/\r?\n/);
  var i1116table = [];
  tmplines.forEach(function(line){
    var tmpvals = line.split(/,/);
    var range = tmpvals[0];
    var item = {};
    item["roll"] = tmpvals[0];
    item["CP"] = tmpvals[1];
    item["SP"] = tmpvals[2];
    item["EP"] = tmpvals[3];
    item["GP"] = tmpvals[4];
    item["PP"] = tmpvals[5];
    i1116table.push(item);
  });

  var i17raw = fs.readFileSync(__dirname+"/data/I17.csv", "utf8");
  var tmplines = i17raw.split(/\r?\n/);
  var i17table = [];
  tmplines.forEach(function(line){
    var tmpvals = line.split(/,/);
    var range = tmpvals[0];
    var item = {};
    item["roll"] = tmpvals[0];
    item["CP"] = tmpvals[1];
    item["SP"] = tmpvals[2];
    item["EP"] = tmpvals[3];
    item["GP"] = tmpvals[4];
    item["PP"] = tmpvals[5];
    i17table.push(item);
  });
}


app.listen(3001, function () {
  console.log("Example app listening on port 3001!");
});


app.use(cors());

app.use(bodyParser.json());

app.get("/", function (req, res) {
  var tortn = {};
  if(req.header("Content-Type") == "application/json") {
    var monsters = req.body.monsters;
    //console.log(monsters);
    var rtnMonsters= [];var Loot_fetches= [];
    getLootList().then(function(list){
      monsters.forEach(monster => {
        var rtnMonster ={};
        rtnMonster.name = monster.name;
        rtnMonster.challenge_rating = monster.challenge_rating;
        //console.error(monster); 
        
        var XPreward = getXPreward(monster.challenge_rating);
        rtnMonster.XPreward = XPreward;

        var randIdx = Math.floor(Math.random()*Math.floor(list.count));
        
        //getLootReward(monster.challenge_rating);
        var lootpromise = getLootDetails(list.results[randIdx].url).then(function(item){
          rtnMonster.LootReward = {money: getLootReward(monster.challenge_rating), items : item};
          rtnMonsters.push(rtnMonster);
          //console.error(rtnMonster);
        });
        Loot_fetches.push(lootpromise);
      });
      Promise.all(Loot_fetches).then(function(responseArray){
        var totalXP = 0;
          rtnMonsters.forEach(element => {
            console.log(element.XPreward);
            totalXP = totalXP+element.XPreward;
          });
          console.warn(totalXP);
          //console.log(rtnMonsters);
        res.statusCode = 200;
        res.json({TotalXP: totalXP, rewards: rtnMonsters});
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
      res.json({status: 400, Description: "Bad Request", Details: "application/json expected"});
  }
});

function getXPreward(attr) {
  //console.log(expTable[attr]);
  return expTable[attr];
}

function getLootReward(attr){
  eval("var cr = "+attr+";");
  var dice = roll("1d100");
  var reward = {};
  if(cr<=4){
    for (let i = 0; i < Object.keys(i04table).length; i++) {
      if(dice<=i04table[i]["roll"]){
        reward["CP"] = eval(i04table[i]["CP"]);
        reward["SP"] = eval(i04table[i]["SP"]);
        reward["EP"] = eval(i04table[i]["EP"]);
        reward["GP"] = eval(i04table[i]["GP"]);
        reward["PP"] = eval(i04table[i]["PP"]);
        //console.log("roll: "+dice+" index: "+i );
        break;
      }
      
    }
  }else if(cr <=10){
    for (let i = 0; i < Object.keys(i510table).length; i++) {
      if(dice<=i510table[i]["roll"]){
        reward["CP"] = eval(i510table[i]["CP"]);
        reward["SP"] = eval(i510table[i]["SP"]);
        reward["EP"] = eval(i510table[i]["EP"]);
        reward["GP"] = eval(i510table[i]["GP"]);
        reward["PP"] = eval(i510table[i]["PP"]);
        //console.log("roll: "+dice+" index: "+i );
        break;
      }
      
    }
  }else if(cr <=16){
    for (let i = 0; i < Object.keys(i1116table).length; i++) {
      if(dice<=i1116table[i]["roll"]){
        reward["CP"] = eval(i1116table[i]["CP"]);
        reward["SP"] = eval(i1116table[i]["SP"]);
        reward["EP"] = eval(i1116table[i]["EP"]);
        reward["GP"] = eval(i1116table[i]["GP"]);
        reward["PP"] = eval(i1116table[i]["PP"]);
        //console.log("roll: "+dice+" index: "+i );
        break;
      }
      
    }
  }else{
    for (let i = 0; i < Object.keys(i17table).length; i++) {
      if(dice<=i17table[i]["roll"]){
        reward["CP"] = eval(i1116table[i]["CP"]);
        reward["SP"] = eval(i1116table[i]["SP"]);
        reward["EP"] = eval(i1116table[i]["EP"]);
        reward["GP"] = eval(i1116table[i]["GP"]);
        reward["PP"] = eval(i1116table[i]["PP"]);
        //console.log("roll: "+dice+" index: "+i );
        break;
      }
      
    }
  }
  return reward;
}

function getLootList(){
  return new Promise((resolve, reject) => {
    var url = "https://www.dnd5eapi.co/api/equipment/";
    axios.get(url).then(function(response){
      resolve(response.data);
      //console.log(response.data);
    }, function(error){
      reject(error);
    });
  });

}

function getLootDetails(item){
  return new Promise((resolve, reject) => {
    var url = "https://www.dnd5eapi.co"+item;
    axios.get(url).then(function(response){
      //console.error(response.data);
      //console.error(url);
      var data = [];
      var chance = roll("1d100")
      if(chance <35)
        data.push(response.data);
      resolve(data);
    }, function(error){
      reject(error);
    });
  });

}

function roll(dice) {
  var tmp = dice.split("d");
  var tortn = 0;
  //console.log("Rolling "+dice)
  for (let n = 0; n < tmp[0]; n++) {
    var val = Math.floor(Math.random()*Math.floor(tmp[1]))+1;
    tortn += val;
    //console.log("\t\t " + val)
  }
  return tortn;
}
