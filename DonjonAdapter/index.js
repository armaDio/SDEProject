var express = require("express");
var bodyParser = require("body-parser");
var axios = require("axios");
var fs = require("fs");
var app = express();
var cors = require('cors');

app.listen(3011, function () {
  console.log("Example app listening on port 3011!");
});

app.use(cors());

app.use(//function(req, res, next) {  
  bodyParser.json()
  //res.header("Access-Control-Allow-Origin", "*"); // update to match the domain you will make the request from
  //res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  //next();
/*}*/);

app.get("/names", function (req, res) {
  console.log(req.body);
  console.log(req);
  var count = req.query.count;
  if(validateCount(count)) {
    count = parseInt(count);
    fetchNames(count).then(function(namesRaw){
      var namesList = namesRaw.split(/\r?\n/);
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

function fetchNames(count) {
  return new Promise((resolve, reject) => {
    var url = "https://donjon.bin.sh/name/rpc-name.fcgi?type=Draconic+Male&n="+count;
    axios.get(url).then(function(response){
      resolve(response.data);
    }, function(error){
      reject(error);
    });
  });
}

function validateCount(count) {
  if(count != undefined) {
    if(((Number.isInteger(parseInt(count))) && count > 0 && count < 51)) {
      return true;
    }
  }
  return false;
}