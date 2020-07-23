var express = require("express");
var bodyParser = require("body-parser");
var axios = require("axios");
var fs = require("fs");
var app = express();
var cors = require('cors');
const { json } = require("express");

app.listen(3012, function () {
  console.log("Example app listening on port 3012!");
});

app.use(cors());

app.use(//function(req, res, next) {  
  bodyParser.json()
  //res.header("Access-Control-Allow-Origin", "*"); // update to match the domain you will make the request from
  //res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  //next();
/*}*/);

app.get("/items", function (req, res) {
  console.log(req.body);
  console.log(req);
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
    fetchItem(path).then(function(response){
      res.statusCode = 200;
      res.json({
        results: marshal(response)
      });
    }, function(error){
      res.statusCode = 500;
      res.json({status: 500, Description: "Internal Error", Details: error});
    });
  }
});

function fetchAllItems() {
  return new Promise((resolve, reject) => {
    var url = "https://www.dnd5eapi.co/api/equipment/";
    axios.get(url).then(function(response){
      resolve(response.data);
    }, function(error){
      reject(error);
    });
  });
}

function fetchItem(path) {
  return new Promise((resolve, reject) => {
    var url = "https://www.dnd5eapi.co"+path;
    axios.get(url).then(function(response){
      resolve(response.data);
    }, function(error){
      reject(error);
    });
  });
}

function marshal(rawitem){
    var newitem = new JSON();
    newitem.name = rawitem.name;
    newitem.weight = rawitem.weight;
    newitem.cost = rawitem.cost;

    newitem.equipment_category= rawitem.equipment_category.name;
    switch(newitem.equipment_category){
      case "Weapon":
          newitem.weapon_category = rawitem.weapon_category;
          newitem.weapon_range = rawitem.weapon_range;
          break;
      case "Armor":
          newitem.armor_category = rawitem.armor_category;
          newitem.armor_class = rawitem.armor_class.base;
          break;
      case "Tools":
          newitem.tool_category = rawitem.tool_category;
          newitem.desc = rawitem.desc;
          break;
      case "Adventuring Gear":
          newitem.desc = rawitem.desc;
          newitem.gear_category = rawitem.gear_category;
          if(newitem.gear_category == "Equipment Pack")
            newitem.contents = rawitem.contents;
          break;
      case "Mounts and Vehicles":
          newitem.vehicle_category = rawitem.vehicle_category;
          if(newitem.gear_category == "Mounts and Other Animals")
            newitem.capacity = rawitem.capacity;
          if(newitem.gear_category == "Mounts and Other Animals" || newitem.gear_category == "Waterborne Vehicles")
            newitem.speed = rawitem.speed;
          break;

    }

}