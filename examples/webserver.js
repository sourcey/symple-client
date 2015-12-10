var express = require('express'),
  path = require('path'),
  redis = require('redis'),
  client = redis.createClient(),
  app = express();

app.set('view engine', 'ejs');
app.set('views', './');
app.use(express.static('./'));
app.use(express.static('../'));

app.get('/', function (req, res) {
  var token = '' + Math.random();
  var peer = {
    user: 'demo',
    name: 'Demo User',
    group: 'public'
  }
  client.set('symple:demo:' + token, JSON.stringify(peer), redis.print);
  res.render('client', { token: token, peer: peer });
})

app.listen(4000);
