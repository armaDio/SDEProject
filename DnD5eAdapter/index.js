var express = require("express");
var bodyParser = require("body-parser");
var axios = require("axios");
var fs = require("fs");
var app = express();
var cors = require('cors');

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
        results: response
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