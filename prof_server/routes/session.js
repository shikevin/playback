var express = require('express');
var router = express.Router();
var shortId = require('short-id');
var fs = require('fs');

router.get('/', function(req, res) {
  var uniquePage;
  do {
    uniquePage = shortId.generate();
  } while (uniquePage in allSessions);
  fs.mkdir('./screenshots/' + uniquePage);
  allSessions[uniquePage] = 0;
  res.send(uniquePage); 
});

module.exports = router; 
