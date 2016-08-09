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

// Upvote a track in the list, adds a track to track list
// if it's not in the list
app.get('/upvote', function(req, res) {

  // Track ID
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

// Downvotes a track in the list
app.get('/downvote', function(req, res) {

  // Track ID
  track_id = req.query.track_id;

  var track_index = tracks[track_id];
  if (track_index != null) {
    
    console.log(track_index);
    console.log(track_list);

    var track = track_list[track_index];
    console.log(track);

    track.vote_count = track.vote_count - 1;

    // Check order of track list
    if (track_index < track_list.length - 1) {
      if (track_list[track_index].vote_count < 
          track_list[track_index+1].vote_count) {

        // Change order in track list
        var temp = track_list[track_index+1];
        track_list[track_index+1] = track_list[track_index];
        track_list[track_index] = temp;

        // Update HashMap
        tracks[track_id] = track_index+1;
        tracks[temp.id] = track_index;
      }
    }

    res.send(JSON.stringify(track_list));
  } 
});

/* Returns the track list */
app.get('/list', function(req, res) {
  res.send(JSON.stringify(track_list));
});

// Hash mapping track id to a play count
played_count = {};

played_count['4'] = 3;
played_count['9'] = 9;
played_count['2'] = 1;
played_count['5'] = 8;
played_count['1'] = 4;



/* Returns the next song (the highest scoring) in the list*/
app.get('/nextSong', function(req,res) {

  if (track_list.length != 0) { // check that the list isn't empty
    var getElemRemove = track_list[0];
    var track_id = getElemRemove.id;
    delete tracks[track_id];

    track_list.splice(0,1); // removes the top element (track)

    for (var key in tracks) {
      tracks[key] = tracks[key] - 1;
    }

    // When the song has stopped playing we add 
    // the track or increment the count in the hash map
    if (played_count[track_id] != null) {
      played_count[track_id] = played_count[track_id] + 1;
    } else {
      played_count[track_id] = 1;
    }

    res.send(track_id);
  } else {
    res.send('error');
  }
});

console.log('Listening on 8888');
app.listen(8888);

/* A graphic scoreboard of the most played tracks*/ 
app.get('/scoreBoard', function(req,res) {

  // function to transfer the hash values into an array and sort them
  sorted_list = []; 
  for (var key in played_count) {
    // Checks if sorted_list is empty
    if (sorted_list.length != 0) {
      var i;
      for (i = 0; i < sorted_list.length; i++) {
        if (played_count[key] > played_count[sorted_list[i]]) {
          sorted_list.splice(i,0,key);
          break;
        }
      }
      if (i == sorted_list.length) {
        sorted_list.push(key);
      }
    } else {
      // Insert key in sorted list when it's empty
      sorted_list.push(key);
    }
  }

  res.send(sorted_list);
});