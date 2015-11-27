var fs = require('fs');
var http = require('http');
var nodemailer = require('nodemailer');
var moment = require('moment');

var config = require('./config.json');

var emailEnabled = config.email && config.email.enabled || false;

var transport;
if (emailEnabled){
  transport = nodemailer.createTransport(config.email.transport);
}

var PORT = parseInt(process.env.PORT, 10) || 5000;
var timer, wasDown = false;

function log(msg, data){
  console.log(msg);
  if (data){
    console.dir(data);
  }
}

var server = http.createServer(function(req, res){

  var method = req.method.toLowerCase();

  switch(method){

    case 'post':
      var ip = req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress;

        var body;
        req.on('data', function(chunk) {
          body = chunk.toString();
        });

        req.on('end', function() {
          try {
            body = JSON.parse(body);
          } catch (e) {
            log('error on parsing request body', e);
            res.statusCode = 403;
            res.end('Forbidden');
          }

          if (body.secret !== config.secret){
            log('Request body secret disallowed!', { ip: ip, secret_received: body.secret });
            res.statusCode = 403;
            res.end('Forbidden');
            return;
          }

          updateState(ip, function(){
            res.end();
          });
        });
      break;

    case 'get':
      fs.readFile('ip.json', function (err, data) {
        if (err) {
          log('ERROR on reading ip.json >> ', err);
          return;
        }

        data = JSON.parse(data);
        data.isDown = wasDown;
        res.end(JSON.stringify(data));
      });
      break;
  }

});

function updateState(ip, done) {
  var info = {
    ip: ip,
    timestamp: moment().toDate()
  };

  fs.writeFile('ip.json', JSON.stringify(info), function (err) {
    if (err) {
      log('ERROR on writing ip.json >> ', err);
      return;
    }
    log('Got alive call >> ', info);
    done();
  });
}

server.listen(PORT, function(){
  log("Server listening on: http://localhost:" + PORT);
});

function sendEmail(type){
  log('sending email Server is ' + type);

  if (!emailEnabled){
    return;
  }

  var emailCfg = config.email.notify;
  var state = type.toUpperCase();

  var mailOpts = {
    from: emailCfg.sendAs,
    to: emailCfg.sendTo,
    subject: 'Alive Notifier: ' + state,
    text : 'Server is ' + state,
    html : 'Server is ' + state
  };

  transport.sendMail(mailOpts, function (err, response) {
    if (err) {
      log('error on sending email >> ', err);
      return;
    }
  });
}

function checkStatus(){

  fs.readFile('ip.json', function (err, data) {
    if (err) {
      log('ERROR on reading ip.json >> ', err);
      return;
    }

    var data;
    try {
      data = JSON.parse(data);
    }
    catch (e){
      log('ERROR on parsing ip.json >> ', e);
    }

    var prev = moment().subtract(config.interval, 'minutes');
    var last = moment(data.timestamp);

    log('PREV ' + prev);
    log('LAST ' + last);

    if (last < prev && !wasDown){
      wasDown = true;
      sendEmail('down');
    }
    else if (last > prev && wasDown){
      wasDown = false;
      sendEmail('up');
    }
  });
}

timer = setInterval(checkStatus, (config.interval || 10) *1000*60 );
