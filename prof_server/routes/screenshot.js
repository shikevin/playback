var express = require('express');
var router = express.Router();

router.get('/*', function(req, res) {
  res.send('End of playback.');
});

module.exports = router;
