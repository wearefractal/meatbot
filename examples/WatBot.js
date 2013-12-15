var util = require('util');
var MeatBot = require('meatbot');

var watfile = require('./wat');

function WatBot() {
  MeatBot.call(this);
}

util.inherits(WatBot, MeatBot);

// this is what it will respond to
// this is required
WatBot.prototype.name = "watbot";

// this is how people will be able to mute it
// this is required
WatBot.prototype.fingerprint = 69;

// this is what people will see
// the web client supports http urls
// but mobile clients will only be able to see
// base64 uris
WatBot.prototype.avatar = "http://25.media.tumblr.com/b28416bb5c4a367617cf7b54a424dac1/tumblr_mr682n5BFU1saaocno1_400.gif";

// this takes in a message that somebody sent
// and you return out txt to respond with
WatBot.prototype.getResponse = function(msg, cb) {
  // pick a random string from the file
  var txt = watfile[Math.floor(Math.random() * watfile.length)];
  return cb(null, txt);
};


module.exports = WatBot;