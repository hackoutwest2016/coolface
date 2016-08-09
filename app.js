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
      //console.log(body.tracks.items);
      //res.send(body.tracks.items);

      items = []
      for (var i = 0; i < body.tracks.items.length; i++) {

        album_name = body.tracks.items[i].album.name;
        artists = [];
        for (var j = 0; j < body.tracks.items[i].artists.length; j++) {
          artists.push({name: body.tracks.items[i].artists[j].name});
        }
        id = body.tracks.items[i].id;
        name = body.tracks.items[i].name;

        items.push({album_name: album_name, artist: artists, id: id, name: name});
      }

      res.send(items);
    }
  });
});

// Sorted list of all tracks
track_list = [];

// Hash mapping track id to a track index in track_list
tracks = {};

app.get('/vote', function(req, res) {

  // Search string
  track_id = req.query.track_id;

  var track_index = tracks[track_id];
  if (track_index != null) {
    var track = track_list[track_index];
    track.vote_count = track.vote_count + 1;

    // Check order of track list
    if (track_index > 0) {
      if (track_list[track_index].vote_count > 
          track_list[track_index-1].vote_count) {

        // Change order in track list
        var temp = track_list[track_index-1];
        track_list[track_index-1] = track_list[track_index];
        track_list[track_index] = temp;

        // Update HashMap
        tracks[track_id] = track_index-1;
        tracks[temp.id] = track_index;
      }
    }

    res.send(JSON.stringify(track_list));
  } else {

    // Get track by track id from Spotify API
    var options = {
          url: 'https://api.spotify.com/v1/tracks/' + track_id,
          json: true
        };

    request.get(options, function(error, response, body) {
      if (!error && response.statusCode === 200) {

        album_name = body.album.name;
        artists = [];
        for (var i = 0; i < body.artists.length; i++) {
          artists.push({name: body.artists[i].name});
        }
        var track = {album_name: album_name, artists: artists, id: track_id, track_name: body.name, vote_count: 1}
        track_list.push(track);
        tracks[track_id] = track_list.length - 1;
        res.send(JSON.stringify(track_list));
      }
    });
  }
});

app.get('/list', function(req, res) {
  res.send(JSON.stringify(track_list));
});

console.log('Listening on 8888');
app.listen(8888);
