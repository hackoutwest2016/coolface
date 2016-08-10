package com.cf.coolface;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.AsyncTask;
import android.os.Bundle;
import android.os.CountDownTimer;
import android.util.Log;
import android.view.View;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.TextView;

import com.android.volley.Request;
import com.android.volley.RequestQueue;
import com.android.volley.VolleyError;
import com.android.volley.toolbox.StringRequest;
import com.android.volley.toolbox.Volley;
import com.spotify.sdk.android.authentication.AuthenticationClient;
import com.spotify.sdk.android.authentication.AuthenticationRequest;
import com.spotify.sdk.android.authentication.AuthenticationResponse;
import com.spotify.sdk.android.player.Config;
import com.spotify.sdk.android.player.PlayConfig;
import com.spotify.sdk.android.player.PlayerStateCallback;
import com.spotify.sdk.android.player.Spotify;
import com.spotify.sdk.android.player.ConnectionStateCallback;
import com.spotify.sdk.android.player.Player;
import com.spotify.sdk.android.player.PlayerNotificationCallback;
import com.spotify.sdk.android.player.PlayerState;

import java.io.InputStream;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;
import java.util.Timer;

import kaaes.spotify.webapi.android.SpotifyApi;
import kaaes.spotify.webapi.android.SpotifyService;
import kaaes.spotify.webapi.android.models.Album;
import kaaes.spotify.webapi.android.models.ArtistSimple;
import kaaes.spotify.webapi.android.models.Playlist;
import kaaes.spotify.webapi.android.models.PlaylistTrack;
import kaaes.spotify.webapi.android.models.Track;
import retrofit.Callback;
import retrofit.RetrofitError;
import retrofit.client.Response;

public class MainActivity extends Activity implements
        PlayerNotificationCallback, ConnectionStateCallback {

    // TODO: Replace with your client ID
    private static final String CLIENT_ID = "a0e9a63aa5c34bc2bc0722eb7e9a0117";
    // TODO: Replace with your redirect URI
    private static final String REDIRECT_URI = "coolface://callback";

    public static MainActivity mAc;

    // Request code that will be used to verify if the result comes from correct activity
    // Can be any integer
    private static final int REQUEST_CODE = 1337;
    private static String accessToken;
    private static SpotifyApi api;
    private static String currentTrackID = "";
    private static String nextTrackId = "";

    private Player mPlayer;
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        AuthenticationRequest.Builder builder = new AuthenticationRequest.Builder(CLIENT_ID,
                AuthenticationResponse.Type.TOKEN,
                REDIRECT_URI);
        builder.setScopes(new String[]{"user-read-private", "streaming"});
        AuthenticationRequest request = builder.build();

        AuthenticationClient.openLoginActivity(this, REQUEST_CODE, request);

        /*final Button button = (Button) findViewById(R.id.btn_main_activity);
        button.setOnClickListener(new View.OnClickListener() {
            public void onClick(View v) {
                //displaySongInfo();
                //setNextTrack();
            }
        });*/

        mAc = this;
    }

    private void displaySongInfo(){
        System.out.println("display song info called");
        mPlayer.setShuffle(true);
        final TextView tv_main_activity =  (TextView) findViewById(R.id.tv_main_activity);
        SpotifyService spotify = api.getService();

        spotify.getTrack(currentTrackID, new Callback<Track>() {
            @Override
            public void success(Track track, Response response) {
                String artists = "";
                for (ArtistSimple as: track.artists) {
                    if(artists.isEmpty()){
                        artists = as.name;
                    }else{
                        artists += ", " + as.name;
                    }

                };
                tv_main_activity.setText(track.name + " - " + artists);
                try {
                    String imgUrlStr = track.album.images.get(0).url;
                    if(!imgUrlStr.isEmpty())
                        new DownloadImageTask((ImageView) findViewById(R.id.iv_album_cover)).execute(imgUrlStr);
                }catch (Exception e){System.out.println("nått jävla error va " + e);}

                final TextView tv_time_left = (TextView) findViewById(R.id.tv_time_left);
                new CountDownTimer(track.duration_ms - 10000, 1000) {

                    public void onTick(long millisUntilFinished) {
                        tv_time_left.setText("suknder kvar till köa av ny låt: " + millisUntilFinished / 1000);
                    }

                    public void onFinish() {
                        System.out.println("OM JAG ROPAS PÅ FLERA GÅNGER ÄR DET FAN SJUKT!");
                        tv_time_left.setText("Dagd sstt byta låt!");
                        setNextTrack();

                    }
                }.start();
            }

            @Override
            public void failure(RetrofitError error) {
                tv_main_activity.setText("DENNA LÅTEN FINNS INTE TÖNT");
            }
        });


    }

    private void setNextTrack(){
        System.out.println("setting next track");

        // Instantiate the RequestQueue.
        RequestQueue queue = Volley.newRequestQueue(this);
        String url ="http://coolface.herokuapp.com/next_song";

        final TextView tv_time_left = (TextView) findViewById(R.id.tv_time_left);
        // Request a string response from the provided URL.
        StringRequest stringRequest = new StringRequest(Request.Method.GET, url,
                new com.android.volley.Response.Listener<String>() {
                    @Override
                    public void onResponse(String response) {
                        System.out.println("!!!!!!!!!!!!!!Next track response " + response);
                        if(response.equalsIgnoreCase("error")){
                            //nextTrackId = "6KAu1eef7xY0Gkg1WQkpNT";
                        }else {
                            nextTrackId = response;
                            if(nextTrackId.equals(currentTrackID)){
                                System.out.println("SAMMA LÅTE IGEN SKIPPA YO");
                                setNextTrack();
                            }else {
                                mPlayer.queue("spotify:track:" + nextTrackId);
                                currentTrackID = nextTrackId;
                            }
                        }
                    }
                }, new com.android.volley.Response.ErrorListener() {
            @Override
            public void onErrorResponse(VolleyError error) {
                tv_time_left.setText("GICK INTE HÄMTA NÄSTA LÅT");
            }
        });
    // Add the request to the RequestQueue.
        queue.add(stringRequest);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent intent) {
        super.onActivityResult(requestCode, resultCode, intent);

        // Check if result comes from the correct activity
        if (requestCode == REQUEST_CODE) {
            AuthenticationResponse response = AuthenticationClient.getResponse(resultCode, intent);
            if (response.getType() == AuthenticationResponse.Type.TOKEN) {
                accessToken = response.getAccessToken();
                api = new SpotifyApi();
                api.setAccessToken(accessToken);

                final Config playerConfig = new Config(this, response.getAccessToken(), CLIENT_ID);
                Spotify.getPlayer(playerConfig, this, new Player.InitializationObserver() {
                    @Override
                    public void onInitialized(final Player player) {
                        mPlayer = player;
                        mPlayer.addConnectionStateCallback(MainActivity.this);
                        mPlayer.addPlayerNotificationCallback(MainActivity.this);
                        SpotifyService spotify = api.getService();
                        System.out.println("lets start shit");

                        spotify.getPlaylist("davemcgroin", "3YkABRNISMemrLaR02K1sR", new Callback<Playlist>() {
                            @Override
                            public void success(Playlist playlist, Response response) {
                                ArrayList<String> tracks = new ArrayList<String>();
                                tracks.add("spotify:track:7yvF0KrTBRHzoW3glOSlvp");

                                for (PlaylistTrack plt: playlist.tracks.items) {
                                    tracks.add("spotify:track:" + plt.track.id);
                                }
                                PlayConfig pc = PlayConfig.createFor(tracks);
                                System.out.println();

                                currentTrackID = tracks.get(0).substring(14);

                                mPlayer.play(pc);
                                mPlayer.setRepeat(true);
                                System.out.println("Nur är saker på g!");
                            }

                            @Override
                            public void failure(RetrofitError error) {
                                System.out.println("HEJ ERROR " + error.getMessage());
                            }
                        });

                    }

                    @Override
                    public void onError(Throwable throwable) {
                        Log.e("MainActivity", "Could not initialize player: " + throwable.getMessage());
                    }
                });
            }
        }
    }

    private void startShit(){
        SpotifyService spotify = api.getService();
        System.out.println("lets start shit");
        spotify.getPlaylist("1149123130", "0A3rNq9wY6OQ0dYxj0JXqS", new Callback<Playlist>() {
            @Override
            public void success(Playlist playlist, Response response) {
                System.out.print(response.getReason());
                ArrayList<String> tracks = new ArrayList<String>();
                tracks.add("spotify:track:7yvF0KrTBRHzoW3glOSlvp");
                for (PlaylistTrack plt: playlist.tracks.items) {
                    tracks.add(plt.track.id);
                }
                PlayConfig pc = PlayConfig.createFor(tracks);
                pc.withTrackIndex(0);
                currentTrackID = tracks.get(0).substring(14);
                mPlayer.play(pc);
                mPlayer.setRepeat(true);
                mPlayer.setShuffle(true);
                System.out.println("Nur är saker på g!");
            }

            @Override
            public void failure(RetrofitError error) {
                System.out.println("HEJ ERROR " + error.getMessage());
            }
        });
    }

    @Override
    public void onLoggedIn() {
        Log.d("MainActivity", "User logged in");
        //startShit();
    }

    @Override
    public void onLoggedOut() {
        Log.d("MainActivity", "User logged out");
    }

    @Override
    public void onLoginFailed(Throwable error) {
        Log.d("MainActivity", "Login failed");
    }

    @Override
    public void onTemporaryError() {
        Log.d("MainActivity", "Temporary error occurred");
    }

    @Override
    public void onConnectionMessage(String message) {
        Log.d("MainActivity", "Received connection message: " + message);
    }

    @Override
    public void onPlaybackEvent(EventType eventType, PlayerState playerState) {
        if(eventType == EventType.TRACK_CHANGED){
            System.out.println(playerState.trackUri);
            currentTrackID = playerState.trackUri.substring(14);
            updateCurrentSongToBackend();
            displaySongInfo();

        }
        Log.d("MainActivity", "Playback event received: " + eventType.name());
    }

    private void updateCurrentSongToBackend(){
        System.out.println("setting next track");

        // Instantiate the RequestQueue.
        RequestQueue queue = Volley.newRequestQueue(this);
        String url ="http://coolface.herokuapp.com/set_current_song?track_id=" + currentTrackID;

        // Request a string response from the provided URL.
        StringRequest stringRequest = new StringRequest(Request.Method.GET, url,
                new com.android.volley.Response.Listener<String>() {
                    @Override
                    public void onResponse(String response) {
                        System.out.println("Set current song to backend " + response);
                    }
                }, new com.android.volley.Response.ErrorListener() {
            @Override
            public void onErrorResponse(VolleyError error) {
                System.out.println("GICK INTE UPPDATERA CURRENT SONG TILL BACKEND " + error.getMessage());
            }
        });
        // Add the request to the RequestQueue.
        queue.add(stringRequest);
    }

    @Override
    public void onPlaybackError(ErrorType errorType, String errorDetails) {
        Log.d("MainActivity", "Playback error received: " + errorType.name());
    }

    @Override
    protected void onDestroy() {
        Spotify.destroyPlayer(this);
        super.onDestroy();
    }

    private class DownloadImageTask extends AsyncTask<String, Void, Bitmap> {
        ImageView bmImage;

        public DownloadImageTask(ImageView bmImage) {
            this.bmImage = bmImage;
        }

        protected Bitmap doInBackground(String... urls) {
            String urldisplay = urls[0];
            Bitmap mIcon11 = null;
            try {
                InputStream in = new java.net.URL(urldisplay).openStream();
                mIcon11 = BitmapFactory.decodeStream(in);
            } catch (Exception e) {
                Log.e("Error", e.getMessage());
                e.printStackTrace();
            }
            return mIcon11;
        }

        protected void onPostExecute(Bitmap result) {
            bmImage.setImageBitmap(result);
        }
    }
}