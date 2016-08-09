/* coolface server */

var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var querystring = require('querystring');
var cookieParser = require('cookie-parser');

var app = express();

app.use(express.static(__dirname + '/public'))
   .use(cookieParser());

app.get('/search', function(request, response) {

  if (request.method == 'GET') {
    // Search string
    search_string = request.query.text;
    search_id = request.query.id;

    // Get track id from Spotify API
    track_id = search_string + '#' + search_id;

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
