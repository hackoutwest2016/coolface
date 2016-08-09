/* coolface server */

var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var querystring = require('querystring');
var cookieParser = require('cookie-parser');

var client_id = '5dfc349eb3dc4052a6cb6907a5fb0454'; // Your client id
var client_secret = '332107a93cda42eb8f1e9e304c08d446'; // Your secret
var redirect_uri = 'http://localhost:8888/callback'; // Your redirect uri

var stateKey = 'spotify_auth_state';

var app = express();

app.use(express.static(__dirname + '/public'))
   .use(cookieParser());

app.get('/search', function(req, res) {

  // Search string
  search_string = req.query.text;

  // Get track id from Spotify API
  var options = {
        url: 'https://api.spotify.com/v1/search',
        qs: {
            q: search_string,
            limit: 2,
            offset: 0,
            type: 'track'
          },
        json: true
      };

  request.get(options, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      console.log(body.tracks.items);
      res.send(body.tracks.items);
    }
  });
  
});

console.log('Listening on 8888');
app.listen(8888);