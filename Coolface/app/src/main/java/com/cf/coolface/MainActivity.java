package com.cf.coolface;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.CountDownTimer;
import android.util.Log;
import android.view.View;
import android.widget.Button;
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

import java.util.ArrayList;
import java.util.List;
import java.util.Timer;

import kaaes.spotify.webapi.android.SpotifyApi;
import kaaes.spotify.webapi.android.SpotifyService;
import kaaes.spotify.webapi.android.models.Album;
import kaaes.spotify.webapi.android.models.ArtistSimple;
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
    private static String currentTrackID = "5HSGgWzrQMtUAIZ7z5gF2a";
    private static String nextTrackId = "2QZtBUsFrDOV1Y3tuohEXs";

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

        final Button button = (Button) findViewById(R.id.btn_main_activity);
        button.setOnClickListener(new View.OnClickListener() {
            public void onClick(View v) {
                //displaySongInfo();
            }
        });

        mAc = this;
    }

    private void displaySongInfo(){
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
                final TextView tv_time_left = (TextView) findViewById(R.id.tv_time_left);
                new CountDownTimer(track.duration_ms - 10000, 5000) {

                    public void onTick(long millisUntilFinished) {
                        tv_time_left.setText("suknder kvar till köa av ny låt: " + millisUntilFinished / 1000);
                    }

                    public void onFinish() {
                        tv_time_left.setText("Dagd sstt byta låt!");
                        mPlayer.queue("spotify:track:" + nextTrackId);
                        currentTrackID = nextTrackId;
                    }
                }.start();
            }

            @Override
            public void failure(RetrofitError error) {
                tv_main_activity.setText("DENNA LÅTEN FINNS INTE TÖNT");
            }
        });
    }

    private void getNextTrack(){

        // Instantiate the RequestQueue.
        RequestQueue queue = Volley.newRequestQueue(this);
        String url ="localhost:8080";

        final TextView tv_time_left = (TextView) findViewById(R.id.tv_time_left);
        // Request a string response from the provided URL.
        StringRequest stringRequest = new StringRequest(Request.Method.GET, url,
                new com.android.volley.Response.Listener<String>() {
                    @Override
                    public void onResponse(String response) {
                        // Display the first 500 characters of the response string.
                        tv_time_left.setText("Response is: "+ response.substring(0,500));
                    }
                }, new com.android.volley.Response.ErrorListener() {
            @Override
            public void onErrorResponse(VolleyError error) {
                tv_time_left.setText("That didn't work!");
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

                Config playerConfig = new Config(this, response.getAccessToken(), CLIENT_ID);
                Spotify.getPlayer(playerConfig, this, new Player.InitializationObserver() {
                    @Override
                    public void onInitialized(Player player) {
                        mPlayer = player;
                        mPlayer.addConnectionStateCallback(MainActivity.this);
                        mPlayer.addPlayerNotificationCallback(MainActivity.this);
                        mPlayer.play("spotify:track:5HSGgWzrQMtUAIZ7z5gF2a");
                        mPlayer.setRepeat(true);
                        mPlayer.setShuffle(true);
                        System.out.println("Nur är saker på g!");
                        displaySongInfo();
                    }

                    @Override
                    public void onError(Throwable throwable) {
                        Log.e("MainActivity", "Could not initialize player: " + throwable.getMessage());
                    }
                });
            }
        }
    }

    @Override
    public void onLoggedIn() {
        Log.d("MainActivity", "User logged in");
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
            displaySongInfo();
        }
        Log.d("MainActivity", "Playback event received: " + eventType.name());
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
}