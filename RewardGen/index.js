var express = require("express");
var bodyParser = require("body-parser");
var fs = require("fs");
var axios = require("axios");
var htmlParser = require("htmlparser");
var app = express();

app.listen(3001, function () {
  console.log("Example app listening on port 3001!");
});

app.use(bodyParser.json());

app.get("/", function (req, res) {
  
});
