# Spotify Sync CLI
sadly spotify turned off its programme for extension requests, i can still finish this, but everyone gotta put thier own spotify credentials from spotify dashboard for this to work now
   ## (this wont work lmao, sadly yea, spotify blocked localhosts and they dont let us extend now, yea there is no way a normal person can make this code work- will be remaking this fully to smth else)
   
[![Rust](https://img.shields.io/badge/rust-%23000000.svg?style=for-the-badge&logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![Spotify](https://img.shields.io/badge/Spotify-1ED760?style=for-the-badge&logo=spotify&logoColor=white)](https://developer.spotify.com/)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

A goofy command-line tool for seamlessly transferring your Spotify library between accounts. Transfer your liked songs, playlists, and albums with a single command, im also working on a second version as an APP version for windows, mac or linux. Not android i suppose, we will see? i guess?

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Spotify Setup](#spotify-setup)
- [Usage](#usage)
- [How It Works](#how-it-works)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Account Management**: Log in to multiple Spotify accounts and manage them easily
- **Comprehensive Transfer**: Copy liked songs, playlists, and albums
- **Interactive Progress**: Real-time progress bars for transfer operations
- **Beautiful TUI Interface**: Interactive terminal UI for easier account selection and transfer
- **Secure Authentication**: Uses Spotify's OAuth 2.0 flow for secure access
- **Data Persistence**: Safely stores authentication tokens for future use
- **Album Support**: Transfer your saved albums between accounts
- **Comprehensive Transfer**: Copy liked songs, playlists, and albums with progress tracking

## Installation

### Prerequisites

- Rust (1.70.0 or higher)
- Cargo (comes with Rust)
- A Spotify account
- Spotify API credentials (see [Spotify Setup](#spotify-setup))

### Building from Source

```bash
# Clone the repository
git clone https://github.com/laxenta/spotify-sync-CLI
cd spotify-sync-CLI

# Build the project
cargo build --release

# The binary will be available at
./target/release/spotify-sync
```

## Spotify Setup

1. Visit the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Log in with your Spotify account
3. Click "Create App"
4. Fill in the application details:
   - App name: `spotify-sync` (or any name you prefer)
   - Redirect URI: `http://localhost:8888/callback`
   - Website: (optional)
   - Description: (optional)
5. After creating the app, you'll see your:
   - Client ID
   - Client Secret (click "Show Client Secret" to reveal)
6. Create a `.env` file in the project root:
   ```env
   SPOTIFY_CLIENT_ID=your_client_id_here
   SPOTIFY_CLIENT_SECRET=your_client_secret_here
   ```

## Step-by-Step Usage Guide

### 1. First Time Setup

```bash
# Clone the repository
git clone https://github.com/laxenta/spotify-sync-CLI
cd spotify-sync-CLI

# Build the project (this might take a minute)
cargo build --release

# Copy the example environment file
cp .env.example .env
```

### 2. Get Your Spotify API Credentials

1. Open [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) in your browser
2. Click "Log In" and sign in with your Spotify account
3. Click "Create App"
4. Fill in these exact values:
   - App name: `spotify-sync` (or whatever you want)
   - Redirect URI: `http://localhost:8888/callback`
   - Description: (anything you want)
5. Click "Save"
6. Click "Settings" to view your app
7. You'll see:
   - Client ID
   - Client Secret (click "View Client Secret")
8. Copy these values into your `.env` file:
   ```bash
   # Open .env in your favorite editor
   nano .env

   # Paste your values like this:
   SPOTIFY_CLIENT_ID=your_client_id_here
   SPOTIFY_CLIENT_SECRET=your_client_secret_here
   ```

### 3. Run the Transfer Process

```bash
# 1. Log in to your OLD account (the one you want to copy FROM)
./target/release/spotify-sync login source

# 2. A browser will open. Log in with your OLD Spotify account
# 3. Click "Agree" to allow access
# 4. Return to terminal after you see "Success!"

# 5. Log in to your NEW account (the one you want to copy TO)
./target/release/spotify-sync login target

# 6. Browser will open again. This time log in with your NEW account
# 7. Click "Agree" again
# 8. Return to terminal after "Success!"

# 9. Verify both accounts are connected
./target/release/spotify-sync list
# You should see both "source" and "target" listed

# 10. Preview what will be transferred
./target/release/spotify-sync preview source

# 11. Start the transfer! (Choose one method)

# Method 1: Command-line with progress bars
./target/release/spotify-sync transfer source target

# Method 2: Interactive TUI interface
./target/release/spotify-sync tui
```

### What to Expect

1. **During Login**:
   - Browser will open twice (once for each account)
   - Make sure to log in with the correct account each time
   - You'll see a "Success" page after each login

2. **During Preview**:
   - You'll see counts of:
     - How many liked songs will be copied
     - How many playlists will be copied
     - Total number of tracks

3. **During Transfer**:
   - Progress bars will show:
     - Liked songs being copied
     - Each playlist being created
     - Tracks being added to each playlist
     - Albums being saved to library
   - Don't close the terminal until it's done!

4. **Using the TUI Interface**:
   - Run `./target/release/spotify-sync tui` for an interactive interface
   - Use ↑/↓ arrows to select accounts
   - Press Enter to confirm selection
   - Press T to start transfer when ready
   - Press Q to quit at any time
   - Watch real-time progress in a beautiful interface!

### Troubleshooting

If you see an error about the port being in use:
```bash
# Kill any process using port 8888
sudo lsof -ti:8888 | xargs kill -9
```

If login seems stuck:
```bash
# Cancel with Ctrl+C and try again
# Make sure you're using the correct account in browser
```

If transfer seems slow:
- This is normal! Spotify's API has rate limits
- Large playlists take longer
- Just let it run

## How It Works

The application follows this process:

1. **Authentication**
   - Uses Spotify's OAuth 2.0 flow
   - Opens your browser for login
   - Securely stores tokens in `~/.spotify-sync/tokens.json`

2. **Library Analysis**
   - Scans source account for:
     - Liked songs
     - Playlists
     - Albums

3. **Transfer Process**
   - Copies liked songs
   - Creates new playlists in target account
   - Preserves playlist metadata (names, descriptions, public/private status)
   - Copies all tracks to new playlists
   - Saves albums to target library

4. **Progress Tracking**
   - Shows real-time progress bars
   - Displays item counts and estimated time remaining
   - Provides clear success/failure feedback

## Development

### Project Structure

```
spotify-sync/
├── Cargo.toml           # Project dependencies
├── .env                 # API credentials
└── src/
    ├── main.rs          # CLI entry point
    ├── spotify/         # Spotify API interaction
    │   ├── auth.rs      # OAuth handling
    │   ├── client.rs    # API client
    │   └── models.rs    # Data structures
    ├── storage/         # Data persistence
    │   └── tokens.rs    # Token management
    └── transfer/        # Transfer logic
        └── sync.rs      # Core transfer code
        AND MORE, will update as project goes on
```

### Building for Development

```bash
cargo run -- [command]

cargo test

cargo fmt -- --check

cargo clippy
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details. 

This means you are free to:
- Use this software for any purpose
- Change the software to suit your needs
- Share the software with your friends and neighbors
- Share the changes you make

Under the following conditions:
- You must include the original source code when you share the software
- You must share your modifications under the same license
- You must state what changes you made
- You must include the full text of the GPL license
https://developer.spotify.com/dashboard
