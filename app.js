/* coolface server */

var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
var path = require('path');

var app = express();

app.use(express.static(__dirname + '/public')).use(cookieParser());

app.get('/search', function(req, res) {

  // Search string
  search_string = req.query.text;

  // Get track id from Spotify API
  var options = {
        url: 'https://api.spotify.com/v1/search',
        qs: {
            q: search_string,
            limit: 10,
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

unique_id = 1;
votes = {};

// Set cookie
cookie_name = 'user_id';
app.get('/setcookie', function(req, res){ 
  var user_id = req.cookies ? req.cookies['user_id'] : null;
  if (user_id == null) {
    res.cookie('user_id', unique_id);
    votes[unique_id] = 0;
    unique_id++;
  } else {
    votes[user_id] = 0;
  }
  res.send('Cookie set');
});

app.get('/clearcookie', function(req,res){
     res.clearCookie('user_id');
     res.send('Cookie deleted');
});

// Upvote a track in the list, adds a track to track list
// if it's not in the list
app.get('/upvote', function(req, res) {

  // Check cookie
  var user_id = req.cookies ? req.cookies['user_id'] : null;
  if (user_id == null) {
    res.send('Cookie not set');
  } else {
    vote_count = votes[user_id];
    if (vote_count > 3) {
      res.send('Too many votes');
    } else {
      votes[user_id] = votes[user_id] + 1; 
    }

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
          img = body.album.images.pop().url;
          artists = [];
          for (var i = 0; i < body.artists.length; i++) {
            artists.push({name: body.artists[i].name});
          }
          var track = {img: img, album_name: album_name, artists: artists, id: track_id, track_name: body.name, vote_count: 1}
          track_list.push(track);
          tracks[track_id] = track_list.length - 1;
          res.send(JSON.stringify(track_list));
        }
      });
    }
  }
});

// Downvotes a track in the list
app.get('/downvote', function(req, res) {

  // Check cookie
  var user_id = req.cookies ? req.cookies['user_id'] : null;
  if (user_id == null) {
    res.send('Cookie not set');
  } else {
    vote_count = votes[user_id];
    if (vote_count > 3) {
      res.send('Too many votes');
    } else {
      votes[user_id] = votes[user_id] + 1; 
    }
    // Track ID
    track_id = req.query.track_id;

    var track_index = tracks[track_id];
    if (track_index != null) {

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
  }
});

/* Returns the track list */
app.get('/list', function(req, res) {
  res.send(JSON.stringify(track_list));
});

// Hash mapping track id to a play count
played_count = {};

current_song = undefined;
/* Returns the next song (the highest scoring) in the list*/
app.get('/next_song', function(req,res) {

  if (track_list.length != 0) { // check that the list isn't empty

    // Reset the users votes whenever next_song is called
    for (var key in votes) {
      votes[key] = 0;
    }

    current_song = track_list[0];
    var track_id = current_song.id;
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
    sort_list();

    res.send(track_id);
  } else {
    var tracks = ["1UGiFnaaen7IQGYlv68TI4","2TTsAJrzIySg5xVqVV5s5x", "62oe0gzcGgId4AQjHQllFh", "4oxpQ0HQymKMPaY9QKwYmq", "0dhynfLhSpcbyJnr3xy4hX"];
   
    var tr = tracks[Math.floor(Math.random() * tracks.length)];


    
    res.send(tr);
  }
});

// Query parameter: ?track_id=value
app.get('/set_current_song', function(req,res) {
  // Track ID
  var track_id = req.query.track_id;

  if (!current_song || track_id != current_song.id) {

    // Get track by track id from Spotify API
    var options = {
          url: 'https://api.spotify.com/v1/tracks/' + track_id,
          json: true
    };

    request.get(options, function(error, response, body) {

      if (!error && response.statusCode === 200) {
          album_name = body.album.name;
          img = body.album.images.pop().url;
          artists = [];
          for (var i = 0; i < body.artists.length; i++) {
            artists.push({name: body.artists[i].name});
          }
          var track = {img: img, album_name: album_name, artists: artists, id: track_id, track_name: body.name, vote_count: -1}

          current_song = track;

          res.send('fuck off');
      }
    });
  } else {
    res.send('OK');
  }
});

app.get('/get_current_song', function(req,res) {
  res.send(current_song);
});

/* A graphic scoreboard of the most played tracks*/
sorted_track_count_list = []; 
function sort_list() {

  // function to transfer the hash values into an array and sort them
  sorted_track_count_list = []; 
  for (var key in played_count) {
    // Checks if sorted_list is empty
    if (sorted_track_count_list.length != 0) {
      var i;
      for (i = 0; i < sorted_track_count_list.length; i++) {
        if (played_count[key] > played_count[sorted_track_count_list[i]]) {
          sorted_track_count_list.splice(i,0,key);
          break;
        }
      }
      if (i == sorted_track_count_list.length) {
        sorted_track_count_list.push(key);
      }
    } else {
      // Insert key in sorted list when it's empty
      sorted_track_count_list.push(key);
    }
  }
}

// Query parameter: ?track_id=value
app.get('/track_image', function(req,res) {

  // Track ID
  var track_id = req.query.track_id;

  // Get track by track id from Spotify API
  var options = {
        url: 'https://api.spotify.com/v1/tracks/' + track_id,
        json: true
  };

  request.get(options, function(error, response, body) {
    
    if (!error && response.statusCode === 200) {
      res.send(body.album.images.pop().url);
    }
  });
});

// Query parameter: ?track_id=value
app.get('/artists', function(req,res) {

  // Track ID
  var track_id = req.query.track_id;

  // Get track by track id from Spotify API
  var options = {
        url: 'https://api.spotify.com/v1/tracks/' + track_id,
        json: true
  };

  request.get(options, function(error, response, body) {
    
    if (!error && response.statusCode === 200) {

      // loop over all artists for a track
      artists = [];
      for (var i = 0; i < body.artists.length; i++) {
        artists.push(body.artists[i].id);
      }
      res.send(artists); // send list of artists to client
    }
  });
});

// Query parameter: ?artist_id=value
app.get('/artistimage', function(req, res) {

  // Artist ID
  artist_id = req.query.artist_id;

  // API call for getting an artist by artist ID
  var options = {
        url: 'https://api.spotify.com/v1/artists/' + artist_id,
        json: true
  };

  request.get(options, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      res.send(body.images.pop().url); // send the image url to client.
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {

    console.log(`Our app is running on port ${ PORT }`);
});
