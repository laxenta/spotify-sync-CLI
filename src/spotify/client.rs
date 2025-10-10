// Copyright (C) 2025  laxenta
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

use reqwest::Client;
use anyhow::Result;
use crate::spotify::models::{Track, SimplifiedPlaylist, Album, SavedAlbum};

pub struct SpotifyClient {
    client: Client,
    access_token: String,
}

pub struct LibraryStats {
    pub liked_songs: u32,
    pub playlists: u32,
    pub total_songs: u32,
}

impl SpotifyClient {
    pub fn new(account_name: &str) -> Result<Self> {
        let tokens = crate::storage::tokens::load_tokens(account_name)?;
        
        Ok(Self {
            client: Client::new(),
            access_token: tokens.access_token,
        })
    }

    pub async fn get_library_stats(&self) -> Result<LibraryStats> {
        // User's liked songs count ehe
        let liked_response: serde_json::Value = self.client
            .get("https://api.spotify.com/v1/me/tracks?limit=1")
            .bearer_auth(&self.access_token)
            .send()
            .await?
            .json()
            .await?;
        
        let liked_songs = liked_response["total"].as_u64().unwrap_or(0) as u32;

        // Get playlists
        let playlists_response: serde_json::Value = self.client
            .get("https://api.spotify.com/v1/me/playlists")
            .bearer_auth(&self.access_token)
            .send()
            .await?
            .json()
            .await?;

        let playlists = playlists_response["total"].as_u64().unwrap_or(0) as u32;

        Ok(LibraryStats {
            liked_songs,
            playlists,
            total_songs: liked_songs, // Simplified for now ( wil add playlists later on ngl )
        })
    }

    pub async fn get_liked_songs(&self) -> Result<Vec<Track>> {
        let mut tracks = Vec::new();
        let mut offset = 0;
        let limit = 50;

        loop {
            let response: serde_json::Value = self.client
                .get(format!(
                    "https://api.spotify.com/v1/me/tracks?limit={}&offset={}",
                    limit, offset
                ))
                .bearer_auth(&self.access_token)
                .send()
                .await?
                .json()
                .await?;

            let items = response["items"].as_array().unwrap();
            
            if items.is_empty() {
                break;
            }

            for item in items {
                let track: Track = serde_json::from_value(item["track"].clone())?;
                tracks.push(track);
            }

            offset += limit;
        }

        Ok(tracks)
    }

    pub async fn add_liked_songs(&self, track_ids: &[String]) -> Result<()> {
        // Spotify API allows max 50 tracks per request
        for chunk in track_ids.chunks(50) {
            self.client
                .put("https://api.spotify.com/v1/me/tracks")
                .bearer_auth(&self.access_token)
                .json(&serde_json::json!({
                    "ids": chunk
                }))
                .send()
                .await?;
        }

        Ok(())
    }

    /// Get all user's playlists
    pub async fn get_playlists(&self) -> Result<Vec<SimplifiedPlaylist>> {
        let mut playlists = Vec::new();
        let mut offset = 0;
        let limit = 50;

        loop {
            let response: serde_json::Value = self.client
                .get(format!(
                    "https://api.spotify.com/v1/me/playlists?limit={}&offset={}",
                    limit, offset
                ))
                .bearer_auth(&self.access_token)
                .send()
                .await?
                .json()
                .await?;

            let items = response["items"].as_array().unwrap();
            
            if items.is_empty() {
                break;
            }

            for item in items {
                let playlist: SimplifiedPlaylist = serde_json::from_value(item.clone())?;
                playlists.push(playlist);
            }

            offset += limit;
            
            // Check if there are more pages
            if response["next"].is_null() {
                break;
            }
        }

        Ok(playlists)
    }

    /// Get all tracks from a specific playlist
    pub async fn get_playlist_tracks(&self, playlist_id: &str) -> Result<Vec<Track>> {
        let mut tracks = Vec::new();
        let mut offset = 0;
        let limit = 100;

        loop {
            let response: serde_json::Value = self.client
                .get(format!(
                    "https://api.spotify.com/v1/playlists/{}/tracks?limit={}&offset={}",
                    playlist_id, limit, offset
                ))
                .bearer_auth(&self.access_token)
                .send()
                .await?
                .json()
                .await?;

            let items = response["items"].as_array().unwrap();
            
            if items.is_empty() {
                break;
            }

            for item in items {
                if let Some(track_data) = item.get("track") {
                    if !track_data.is_null() {
                        let track: Track = serde_json::from_value(track_data.clone())?;
                        tracks.push(track);
                    }
                }
            }

            offset += limit;
            
            if response["next"].is_null() {
                break;
            }
        }

        Ok(tracks)
    }

    /// Create a new playlist in the target !!!!!69
    pub async fn create_playlist(
        &self,
        name: &str,
        description: Option<&str>,
        public: bool,
    ) -> Result<String> {
        // First we get user ID
        let user_response: serde_json::Value = self.client
            .get("https://api.spotify.com/v1/me")
            .bearer_auth(&self.access_token)
            .send()
            .await?
            .json()
            .await?;

        let user_id = user_response["id"].as_str().unwrap();

        // Create playlist
        let response: serde_json::Value = self.client
            .post(format!("https://api.spotify.com/v1/users/{}/playlists", user_id))
            .bearer_auth(&self.access_token)
            .json(&serde_json::json!({
                "name": name,
                "description": description.unwrap_or(""),
                "public": public
            }))
            .send()
            .await?
            .json()
            .await?;

        Ok(response["id"].as_str().unwrap().to_string())
    }

    /// Add tracks to a playlist
    pub async fn add_tracks_to_playlist(
        &self,
        playlist_id: &str,
        track_uris: &[String],
    ) -> Result<()> {
        // Spotify allows max 100 tracks per request so yeah
        for chunk in track_uris.chunks(100) {
            self.client
                .post(format!(
                    "https://api.spotify.com/v1/playlists/{}/tracks",
                    playlist_id
                ))
                .bearer_auth(&self.access_token)
                .json(&serde_json::json!({
                    "uris": chunk
                }))
                .send()
                .await?;
        }

        Ok(())
    }

    /// Get all saved albums from the user's library
    pub async fn get_saved_albums(&self) -> Result<Vec<Album>> {
        let mut albums = Vec::new();
        let mut offset = 0;
        let limit = 50;

        loop {
            let response: serde_json::Value = self.client
                .get(format!(
                    "https://api.spotify.com/v1/me/albums?limit={}&offset={}",
                    limit, offset
                ))
                .bearer_auth(&self.access_token)
                .send()
                .await?
                .json()
                .await?;

            let items = response["items"].as_array().unwrap();
            
            if items.is_empty() {
                break;
            }

            for item in items {
                let saved_album: SavedAlbum = serde_json::from_value(item.clone())?;
                albums.push(saved_album.album);
            }

            offset += limit;
            
            if response["next"].is_null() {
                break;
            }
        }

        Ok(albums)
    }

    /// Save albums to user's library
    pub async fn save_albums(&self, album_ids: &[String]) -> Result<()> {
        // Spotify allows max 50 albums per request
        for chunk in album_ids.chunks(50) {
            self.client
                .put("https://api.spotify.com/v1/me/albums")
                .bearer_auth(&self.access_token)
                .json(&serde_json::json!({
                    "ids": chunk
                }))
                .send()
                .await?;
        }

        Ok(())
    }
}