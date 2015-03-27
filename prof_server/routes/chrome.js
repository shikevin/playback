var express = require('express');
var router = express.Router();
var fs = require('fs');

var saveNumber = 0;
router.post('/', function (req, res) {
  var saveLocation = './screenshots/' + saveNumber + '.html';
  var saveText = req.body.page;
  console.log(req.body.event);
  console.log(req.body.element);
  saveNumber++;

  fs.writeFile(saveLocation, saveText, function(err) {
    if (err) {
      return console.log(err);
    }

    res.send('success!');

    console.log("the file was saved");
  });
});

module.exports = router;
