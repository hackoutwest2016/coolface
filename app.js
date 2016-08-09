/**
 * This is an example of a basic node.js script that performs
 * the Authorization Code oAuth2 flow to authenticate against
 * the Spotify Accounts.
 *
 * For more information, read
 * https://developer.spotify.com/web-api/authorization-guide/#authorization_code_flow
 */

var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var querystring = require('querystring');
var cookieParser = require('cookie-parser');

var client_id = '5dfc349eb3dc4052a6cb6907a5fb0454'; // Your client id
var client_secret = '332107a93cda42eb8f1e9e304c08d446'; // Your secret
var redirect_uri = 'http://localhost:8888/callback'; // Your redirect uri

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

var stateKey = 'spotify_auth_state';

var app = express();

app.use(express.static(__dirname + '/public'))
   .use(cookieParser());


app.get('/search', function(request, response) {

  if (request.method == 'GET') {
    // Search string
    search_string = request.query.text;

    // Get track id from Spotify API
    track_id = search_string + '#1234';

    // Response object update
    response.writeHead( 200 );
    response.write('http://localhost:8888/' + 
      JSON.stringify({
        track_id: track_id
      }));
    response.end();
  }
});

console.log('Listening on 8888');
app.listen(8888);
