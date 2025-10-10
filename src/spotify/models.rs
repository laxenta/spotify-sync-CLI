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

use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Track {
    pub id: String,
    pub name: String,
    pub artists: Vec<Artist>,
    pub uri: String,  // uhm spotify:track:xxxxx
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Artist {
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Playlist {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub public: bool,
    pub tracks: PlaylistTracksWrapper,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PlaylistTracksWrapper {
    pub total: u32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PlaylistTrack {
    pub track: Track,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SimplifiedPlaylist {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub public: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Album {
    pub id: String,
    pub name: String,
    pub artists: Vec<Artist>,
    pub uri: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SavedAlbum {
    pub album: Album,
}