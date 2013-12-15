var util = require('util');
var EventEmitter = require('events').EventEmitter;

var request = require('request');
var io = require('socket.io-client');
var crypto = require('crypto');
var cheerio = require('cheerio');

var clockDrift = 30000;
var defaultMeats = "https://chat.meatspac.es";
var defaultMessage = "My author gave me nothing to say";

function Bot() {
  EventEmitter.call(this);

  if (!this.name) throw new Error("missing name");
  if (!this.fingerprint) throw new Error("missing fingerprint");
  this.jar = request.jar();
}

util.inherits(Bot, EventEmitter);

Bot.prototype.connect = function(host) {
  this.host = host || defaultMeats;
  this.socket = io.connect(this.host);
  this.socket.on("connect", this.emit.bind(this, "connect"));
  this.socket.on("disconnect", this.emit.bind(this, "disconnect"));
  this._setup(function(err) {
    if (err) return cb(err);
    this.socket.on("message", this._handleMessage.bind(this));
  }.bind(this));
  return this;
};

Bot.prototype.getAvatar = function(cb) {
  cb(null, this.avatar);
};

Bot.prototype.getResponse = function(msg, cb) {
  cb(null, defaultMessage);
};

Bot.prototype.sendMessage = function(pic, msgTxt, cb) {
  var userId = this.fingerprint + this.ip;
  userId = crypto.createHash('md5')
    .update(userId)
    .digest('hex');
  
  var url = this.host + "/add/chat";
  var body = {
    picture: pic,
    message: msgTxt,
    fingerprint: this.fingerprint,
    userid: userId,
    _csrf: this.csrf
  };
  var ropt = {
    method: 'POST',
    url: url,
    json: body,
    jar: this.jar
  };

  request(ropt, function(err, res, body) {
    if (err) return cb(err);
    if (res.statusCode !== 200) {
      return cb(new Error("failed to send message " + res.statusCode));
    }
    this.emit('response', pic, msgTxt);
    cb();
  }.bind(this));
  return this;
};

Bot.prototype.respond = function(msg, cb) {
  this.getAvatar(function(err, pic) {
    if (err) return cb(err);

    this.getResponse(msg, function(err, msgTxt) {
      if (err) return cb(err);
      this.sendMessage(pic, msgTxt, cb);
    }.bind(this));

  }.bind(this));
  return this;
};

/* internal garb */
Bot.prototype._handleMessage = function(d) {
  var msg = d.chat.value;
  msg.message = String(msg.message).trim();

  // dont show old msgs
  msg.drift = Date.now() - msg.created;
  if (msg.drift > clockDrift) return;

  this.emit("message", msg);

  if (msg.message.indexOf(this.name) !== -1) {
    this.respond(msg, function(err) {
      if (err) this.emit('error', err);
    }.bind(this));
  }
  return this;
};

Bot.prototype._setup = function(cb) {
  this._setIp(function(err, ip) {
    if (err) return cb(err);
    this.emit('ip', ip);
    this.ip = ip;
    this._setCsrf(function(err, csrf) {
      if (err) return cb(err);
      this.emit('csrf', csrf);
      this.csrf = csrf;
      return cb(null, ip, csrf);
    }.bind(this));
  }.bind(this));
  return this;
};

Bot.prototype._setCsrf = function(cb) {
  var ropt = {
    url: this.host,
    jar: this.jar
  };
  request(ropt, function(err, res, body) {
    if (err) return cb(err);
    var $ = cheerio.load(body);
    var csrf = $("input[name='_csrf']").val();
    cb(null, csrf);
  });
  return this;
};

Bot.prototype._setIp = function(cb) {
  var ropt = {
    url: this.host + "/ip",
    json: true,
    jar: this.jar
  };
  return request(ropt, function(err, res, body) {
    if (err) return cb(err);
    var ip = body.ip;
    return cb(null, ip);
  });
  return this;
};

module.exports = Bot;
