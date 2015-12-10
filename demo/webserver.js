var express = require('express'),
  path = require('path'),
  redis = require('redis'),
  client = redis.createClient(),
  app = express();

app.set('port', process.env.PORT || 4450);
app.set('view engine', 'ejs');
app.set('views', './');
app.use(express.static('public'));
app.use(express.static('./'));
app.use(express.static('../'));

app.get('/', function (req, res) {
  // Create a random token to identify this client
  // NOTE: This method of generating unique tokens is not secure, so don't use
  // it in production ;)
  var token = '' + Math.random();

  // Create the arbitrary user session object here
  var session = {
    // user: 'demo',
    // name: 'Demo User',
    group: 'public'
  }

  // Store the user session on Redis
  client.set('symple:session:' + token, JSON.stringify(session), redis.print);

  // Render the response
  res.render('index', { token: token }); //, peer: session
})

app.listen(app.get('port'), function () {
  console.log('Express server listening on port ' + app.get('port'));
});
