var mqtt = require('mqtt');
var log = require('logfmt');

var config = {
  port:         process.env.PORT || 5000,
  mqtt_host:    process.env.MQTT || "127.0.0.1",
  mqtt_login:   process.env.LOGIN|| ""
};

var io  = require('socket.io').listen(config.port);
io.sessionid = 0;
log.log({type: "info", msg: "App server started", port: config.port});

// Connect to the MQTT broker
var host = config.mqtt_host;
host += config.mqtt_login ? config.mqtt_login + "@" : "";
var broker = mqtt.connect('mqtt://' + host);

broker.on('error',function(error){
  log.log({type: "error", msg: error.message});
});

broker.on('connect',function(error){
  log.log({type: "info", msg: "MQTT connected", host: config.mqtt_host});
});

io.on('connection', function(socket){
  this.sessionid = this.sessionid || 0;
  this.sessionid = this.sessionid + 1;
  socket.sessionid = this.sessionid
  log.log({type: "info", msg: "User connected", session: this.sessionid});

  broker.subscribe('appserver/session/' + socket.sessionid + "/#");
  broker.subscribe('appserver/session/all/#');
  //Temp fix
  //socket.mqtt.subscribe('#');
  broker.publish('appserver/session/' + socket.sessionid, "Connected")

  //Subscribe
  socket.on('subscribe', function(data) {
    broker.subscribe(data.topic);
  });

  //Forward all mqtt messages to socket.io
  broker.on('message', function(topic, message) {
    socket.emit('mqtt',{'topic':String(topic),'payload':String(message)});
  });

  //Publish
  socket.on('publish', function(data) {
    broker.publish('appserver/session/' + this.sessionid + "/" + data.topic,data.payload);
  });

  //Disconnection
  socket.on('disconnect', function(){
    log.log({type: "info", msg: "User disconnected", session: this.sessionid});
    broker.publish('appserver/session/' + socket.sessionid,"Disconnected")
  });
});