var express = require('express');
var router = express.Router();
var fs = require('fs');

var saveNumber = 20;
router.post('/', function (req, res) {
  var saveLocation = './screenshots/' + saveNumber + '.html';
  var saveText = req.body.page;
  saveNumber++;
  var attributes = JSON.parse(req.body.element);

  var jquerySelector = "$(\"";

  function addClassAttr (classes) {
    for (style in classes) {
      if (!(isNaN(style)) && classes.hasOwnProperty(style)) {
        jquerySelector +="[class~='"+classes[style]+"']";
      }
    }
  }
    
  for (attr in attributes) {
    if (attributes.hasOwnProperty(attr)) {
      if (attr == 'class') {
        addClassAttr(attributes[attr]);
      } else {
        jquerySelector += "["+attr+"='"+attributes[attr]+"']";
      }
    }
  }
  jquerySelector+="\")";

  var injectedJavascript = "<script src=http://code.jquery.com/jquery-1.11.2.min.js type='text/javascript'></script>" +
  "<script type='text/javascript'>" +
    jquerySelector + ".css({'color':'red', 'border': '5px solid red'});"+ 
    jquerySelector + ".click(function(){" +
    "window.location = '/screenshots/" + saveNumber + ".html'" + "});" + 
    "setTimeout(function(){alert('go to next page'); window.location = '/screenshots/" + 
    saveNumber + ".html';" + "}, 30000);" + "</script>";

  console.log(injectedJavascript);

  saveText += injectedJavascript;
  fs.writeFile(saveLocation, saveText, function(err) {
    if (err) {
      return console.log(err);
    }

    res.send('success!');

    console.log("the file was saved");
  });
});

module.exports = router;
