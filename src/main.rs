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

mod spotify;
mod storage;
mod transfer;
mod tui;
use clap::{Parser, Subcommand};

#[derive(Parser)]
#[command(name = "spotify-sync")]
#[command(about = "Transfer Spotify playlists between accounts")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// FIRST of all -> Login to a Spotify account #spotifyistrash
    Login { 
        /// Account name (source/target) Source is where the songs come from, target is where they go. Simple af
        name: String 
    },
    /// List logged in accounts
    List,
    /// Preview what will be transferred
    Preview { 
        source: String 
    },
    /// Transfer playlists from source to target
    Transfer { 
        source: String,
        target: String,
    },
    /// Launch interactive TUI interface
    Tui,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenv::dotenv().ok();
    let cli = Cli::parse();

    match cli.command {
        Commands::Login { name } => {
            println!("🎵 Logging in to account '{}'...", name);
            spotify::auth::login(&name).await?;
            println!("successfully logged in!");
        }
        Commands::List => {
            let accounts = storage::tokens::list_accounts()?;
            println!("logged in accounts:");
            for account in accounts {
                println!("  - {}", account);
            }
        }
        Commands::Preview { source } => {
            let client = spotify::client::SpotifyClient::new(&source)?;
            let stats = client.get_library_stats().await?;
            
            println!(" Library Stats for '{}':", source);
            println!("  Liked Songs: {}", stats.liked_songs);
            println!("  Playlists: {}", stats.playlists);
            println!("  Total Songs: {}", stats.total_songs);
        }
        Commands::Transfer { source, target } => {
            println!("starting transfer from '{}' to '{}'...", source, target);
            transfer::sync::transfer_all(&source, &target).await?;
            println!("✨ Transfer complete!");
        }
        Commands::Tui => {
            run_tui().await?;
        }
    }

    Ok(())
}

async fn run_tui() -> anyhow::Result<()> {
    use crossterm::{
        event::{self, DisableMouseCapture, EnableMouseCapture, Event, KeyCode},
        execute,
        terminal::{disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen},
    };
    use ratatui::{backend::CrosstermBackend, Terminal};
    use std::io;

    // Setup terminal
    enable_raw_mode()?;
    let mut stdout = io::stdout();
    execute!(stdout, EnterAlternateScreen, EnableMouseCapture)?;
    let backend = CrosstermBackend::new(stdout);
    let mut terminal = Terminal::new(backend)?;

    let mut app = tui::app::App::new()?;

    loop {
        terminal.draw(|f| tui::ui::draw::<CrosstermBackend<io::Stdout>>(f, &app))?;

        if let Event::Key(key) = event::read()? {
            match key.code {
                KeyCode::Char('q') | KeyCode::Char('Q') => {
                    app.quit();
                }
                KeyCode::Up => {
                    app.previous_account();
                }
                KeyCode::Down => {
                    app.next_account();
                }
                KeyCode::Enter => {
                    app.select_current_account();
                }
                KeyCode::Char('t') | KeyCode::Char('T') => {
                    if app.can_start_transfer() {
                        app.start_transfer().await?;
                    }
                }
                _ => {}
            }
        }

        if app.should_quit {
            break;
        }
    }

    // Restore terminal
    disable_raw_mode()?;
    execute!(
        terminal.backend_mut(),
        LeaveAlternateScreen,
        DisableMouseCapture
    )?;
    terminal.show_cursor()?;

    Ok(())
}