var express = require('express');
var router = express.Router();
var fs = require('fs');

router.post('/', function (req, res) {
  var session = req.body.session;
  var saveNumber = allSessions[session];
  var saveLocation = './screenshots/' + session + '/' 
    + saveNumber + '.html';
  var saveText = req.body.page;
  saveNumber++;
  allSessions[session]++;
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

  // I hate this
  var injectedJavascript = "<script src=http://code.jquery.com/jquery-1.11.2.min.js type='text/javascript'></script>" +
  "<script type='text/javascript'>" +
    jquerySelector + ".css({'color':'red', 'border': '5px solid red'});"+ 
    jquerySelector + ".click(function(){" +
    "window.location = '/screenshots/" + session + '/' + saveNumber + ".html'" + "});" + 
    "setTimeout(function(){alert('go to next page'); window.location = '/screenshots/" +
    session + '/' +
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
