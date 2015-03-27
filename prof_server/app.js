var express = require('express');
var app = express();
var monk = require('monk');
var body_parser = require('body-parser');
var db = monk('localhost:27017/hackweek');
var cookie_parser = require('cookie-parser');
var path = require('path');

var chromeRoute = require('./routes/chrome');

inbound_requests = db.get('requests');

app.set('port', 3000);

// uses the .html extension instead of renaming views to *.ejs
app.engine('.html', require('ejs').__express);
 
// sets folder to where html pages are kept
app.set('views', __dirname + '/views');

app.use('/screenshots', express.static(path.join(__dirname, 'screenshots')));
app.use(cookie_parser());
app.use(body_parser.json({limit: '50mb'}));
app.use(body_parser.urlencoded({ extended: true, limit: '50mb'}));

 
// allows filename to be passed to render function without extension
app.set('view engine', 'html');

app.use('/chrome', chromeRoute);

app.post('/response', function(req, res) {
  console.log(req.headers);
  console.log(req.body);
  var newRequest = {
    request_url: req.url,
    headers: req.headers,
    cookies: req.cookies,
    body: req.body
  }

  if (req.url == '/test') {
    next();
    return;
  }

  inbound_requests.insert(newRequest, function(err, doc) {
    if (err) {
      console.log(err);
    } else {
        res.status(200).send(doc);
    }
  });
});

app.get('/test', function (req, res) {
  requests = inbound_requests.find({ $query: {}, $orderby: {_id:-1}}, function(err, doc) {
    if (err) {
      console.log(err);
    } else {
      res.send(doc);
    }
  })
});

app.listen(app.get('port'));
console.log("app listening on port: " + app.get('port'));
