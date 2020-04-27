var express = require("express");
var bodyParser = require("body-parser")
var app = express();

app.listen(3000, function () {
  console.log("Example app listening on port 3000!");
});

app.use(bodyParser.json())

app.get("/", function (req, res) {
  if(req.header("Content-Type") == "application/json") {
    console.log(req.body)
    res.send("Good request")
  } else {
    res.statusCode = 400;
    res.json({status: 400, Description: "Bad Request", Details: "application/json expected"});
  }
});