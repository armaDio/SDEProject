var express = require("express");
var bodyParser = require("body-parser");
var fs = require("fs");
var axios = require("axios");
var htmlParser = require("htmlparser");
const { rejects } = require("assert");
var app = express();
var cors = require('cors');


app.listen(3008, function () {
  console.log("Example app listening on port 3008!");
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

var monsterCacheTimer = {};
var monsterCache = {};
var itemsCache = null;
var itemsCacheTimer = Date.now();

app.get("/monsters", function (req, res) {
  var crArray = req.query.cr;
  if(validateCrs(crArray)) {
      console.log(crArray);
      fetchMonsters(crArray).then(function(monsterListArray){
        res.statusCode = 200;
        res.json({
          results: monsterListArray
        });
      }, function(error){
        res.statusCode = 500;
        res.json({status: 500, Description: "Internal Error", Details: error});
      });
    } else {
      res.statusCode = 400;
      res.json({status: 400, Description: "Bad Request", Details: "Monster cr expected as an array of integers between 0 and 30"});
    }
});

app.get("/names", function (req, res) {
  console.log(req.body);
  console.log(req);
  var count = req.query.count;
  if(validateCount(count)) {
    count = parseInt(count);
    fetchNames(count).then(function(namesRaw){
      var namesList = namesRaw.results;
      res.statusCode = 200;
      res.json({
        results: namesList
      });
    }, function(error){
      res.statusCode = 500;
      res.json({status: 500, Description: "Internal Error", Details: error});
    });
  } else {
    res.statusCode = 400;
    res.json({status: 400, Description: "Bad Request", Details: "Name count expected as an integer between 1 and 50"});
  }
});

app.get("/items", function (req, res) {
  //console.log(req.body);
  //console.log(req);
  var path = req.query.path;
  if(path == undefined) {
    fetchAllItems().then(function(response){
      var itemList = response.results;
      res.statusCode = 200;
      res.json({
        count: response.count,
        results: itemList
      });
    }, function(error){
      res.statusCode = 500;
      res.json({status: 500, Description: "Internal Error", Details: error});
    });
  } else {
    console.log(path);
    if((Math.floor(Math.random()*Math.floor(100))+1)<50){
      res.statusCode = 200;
      res.json({
        results: {}
      });
    }else{
      fetchItem(path).then(function(response){
        console.log("RESPONSE***************************************");
        console.log(response.results);
        res.statusCode = 200;
        res.json({
          results: response.results
        });
      }, function(error){
        res.statusCode = 500;
        res.json({status: 500, Description: "Internal Error", Details: error});
      });
    }
  }
});

function fetchMonsters(crArray) {
  return new Promise((resolve, reject) => {
    var requestsArr = [];
    var dataArray = [];
    for(var i = 0; i<crArray.length; i++) {
      if(monsterCache[crArray[i]] == undefined || (Date.now() - monsterCacheTimer[crArray[i]]) > 360000) {
        var url = "http://localhost:3010/monsters?cr="+crArray[i];
        requestsArr[i] = axios.get(url);
        monsterCache[crArray[i]] = null;
      } else {
        requestsArr[i] = new Promise((resolve) => { var index = i; resolve({ data: monsterCache[crArray[index]]}) });
        console.log("USING MONSTER CACHE HERE");
      }
    }
    Promise.all(requestsArr).then(function(responseArray){
      responseArray.forEach(function(response, index){
        dataArray[index] = response.data;
        var responseCr = response.data.results[0].challenge_rating;
        if(monsterCache[responseCr] == null) {
          monsterCache[responseCr] = response.data;
          console.log("SAVING MONSTER DATA HERE");
          monsterCacheTimer[responseCr] = Date.now();
        }
      });
      resolve(dataArray);
    }, function(error){
      reject(error);
    });
  });
}

function fetchNames(count) {
  return new Promise((resolve, reject) => {
    var url = "http://localhost:3011/names?count="+count;
    axios.get(url).then(function(response){
      resolve(response.data);
    }, function(error){
      reject(error);
    });
  });
}

function fetchAllItems() {
  return new Promise((resolve, reject) => {
    var request = null;
    if(itemsCache == null || (Date.now() - itemsCacheTimer) > 360000) {
      var url = "http://localhost:3012/items";
      request = axios.get(url);
      itemsCache = null;
    } else {
      request = new Promise((resolve) => {resolve({ data: itemsCache}) });
      console.log("USING ITEMS CACHE HERE");
    }
    request.then(function(response){
      if(itemsCache == null)
      {
        itemsCache = response.data;
        console.log("SAVING ITEMS DATA HERE");
        itemsCacheTimer = Date.now();
      }
      resolve(response.data);
    }, function(error){
      reject(error);
    });
  });
}

function fetchItem(path) {
  return new Promise((resolve, reject) => {
    var url = "http://localhost:3012/items?path="+path;
    axios.get(url).then(function(response){
      resolve(response.data);
    }, function(error){
      reject(error);
    });
  });
}

function validateCrs(crArray) {
  if(Array.isArray(crArray) && crArray.length > 0) {
    crArray.forEach(function(cr){
      if(!((["0", "1/8", "1/4", "1/2"].includes(cr)) || ((Number.isInteger(parseInt(cr))) && cr > 0 && cr < 31))) {
        return false;
      }
    });
  } else {
    if(crArray != undefined) {
      if((["0", "1/8", "1/4", "1/2"].includes(crArray)) || ((Number.isInteger(parseInt(crArray))) && crArray > 0 && crArray < 31)) {
        return true;
      }
    }
    return false;
  }
  return true;
}

function validateCount(count) {
  if(count != undefined) {
    if(((Number.isInteger(parseInt(count))) && count > 0 && count < 51)) {
      return true;
    }
  }
  return false;
}