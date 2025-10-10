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

use ratatui::{
    backend::Backend,
    layout::{Alignment, Constraint, Direction, Layout, Rect},
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Borders, List, ListItem, Paragraph},
    Frame,
};

use super::app::{App, Screen, SelectedAccount};

pub fn draw<B: Backend>(f: &mut Frame, app: &App) {
    match app.screen {
        Screen::AccountSelection => draw_account_selection::<B>(f, app),
        Screen::TransferProgress => draw_transfer_progress::<B>(f, app),
        Screen::Complete => draw_complete::<B>(f, app),
    }
}

fn draw_account_selection<B: Backend>(f: &mut Frame, app: &App) {
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .margin(2)
        .constraints([
            Constraint::Length(3),
            Constraint::Min(0),
            Constraint::Length(3),
        ])
        .split(f.area());

    // Title
    let title = Paragraph::new("🎵 Spotify Sync")
        .style(Style::default().fg(Color::Green).add_modifier(Modifier::BOLD))
        .alignment(Alignment::Center)
        .block(Block::default().borders(Borders::ALL));
    f.render_widget(title, chunks[0]);

    // Account selection area
    let selection_chunks = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Percentage(50), Constraint::Percentage(50)])
        .split(chunks[1]);

    // Source account selection
    let source_title = if matches!(app.selected_account, SelectedAccount::Source) {
        "► FROM Account (Use ↑↓ to select, Enter to confirm)"
    } else {
        "FROM Account"
    };
    
    let source_items: Vec<ListItem> = app
        .available_accounts
        .iter()
        .enumerate()
        .map(|(i, account)| {
            let style = if matches!(app.selected_account, SelectedAccount::Source) 
                && i == app.selected_index 
            {
                Style::default().fg(Color::Yellow).add_modifier(Modifier::BOLD)
            } else {
                Style::default()
            };
            
            let content = if Some(account.clone()) == app.source_account {
                format!("✓ {}", account)
            } else {
                account.clone()
            };
            
            ListItem::new(content).style(style)
        })
        .collect();

    let source_list = List::new(source_items)
        .block(
            Block::default()
                .title(source_title)
                .borders(Borders::ALL)
                .border_style(
                    if matches!(app.selected_account, SelectedAccount::Source) {
                        Style::default().fg(Color::Green)
                    } else {
                        Style::default()
                    }
                )
        );
    f.render_widget(source_list, selection_chunks[0]);

    // Target account selection
    let target_title = if matches!(app.selected_account, SelectedAccount::Target) {
        "► TO Account (Use ↑↓ to select, Enter to confirm)"
    } else {
        "TO Account"
    };
    
    let target_items: Vec<ListItem> = app
        .available_accounts
        .iter()
        .enumerate()
        .map(|(i, account)| {
            let style = if matches!(app.selected_account, SelectedAccount::Target) 
                && i == app.selected_index 
            {
                Style::default().fg(Color::Yellow).add_modifier(Modifier::BOLD)
            } else {
                Style::default()
            };
            
            let content = if Some(account.clone()) == app.target_account {
                format!("✓ {}", account)
            } else {
                account.clone()
            };
            
            ListItem::new(content).style(style)
        })
        .collect();

    let target_list = List::new(target_items)
        .block(
            Block::default()
                .title(target_title)
                .borders(Borders::ALL)
                .border_style(
                    if matches!(app.selected_account, SelectedAccount::Target) {
                        Style::default().fg(Color::Green)
                    } else {
                        Style::default()
                    }
                )
        );
    f.render_widget(target_list, selection_chunks[1]);

    // Instructions
    let instructions = if app.can_start_transfer() {
        "Press 'T' to start transfer | 'Q' to quit"
    } else {
        "Select source and target accounts | 'Q' to quit"
    };
    
    let help = Paragraph::new(instructions)
        .style(Style::default().fg(Color::Cyan))
        .alignment(Alignment::Center)
        .block(Block::default().borders(Borders::ALL));
    f.render_widget(help, chunks[2]);
}

fn draw_transfer_progress<B: Backend>(f: &mut Frame, app: &App) {
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .margin(2)
        .constraints([Constraint::Percentage(50), Constraint::Percentage(50)])
        .split(f.area());

    let status = Paragraph::new(app.transfer_status.as_str())
        .style(Style::default().fg(Color::Yellow))
        .alignment(Alignment::Center)
        .block(
            Block::default()
                .title("Transfer in Progress...")
                .borders(Borders::ALL)
        );
    f.render_widget(status, chunks[0]);
}

fn draw_complete<B: Backend>(f: &mut Frame, _app: &App) {
    let area = centered_rect(60, 20, f.area());

    let text = vec![
        Line::from(""),
        Line::from(Span::styled(
            "✨ Transfer Complete! ✨",
            Style::default().fg(Color::Green).add_modifier(Modifier::BOLD),
        )),
        Line::from(""),
        Line::from("All your music has been transferred successfully."),
        Line::from(""),
        Line::from(Span::styled(
            "Press 'Q' to quit",
            Style::default().fg(Color::Cyan),
        )),
    ];

    let paragraph = Paragraph::new(text)
        .alignment(Alignment::Center)
        .block(Block::default().borders(Borders::ALL).border_style(Style::default().fg(Color::Green)));

    f.render_widget(paragraph, area);
}

fn centered_rect(percent_x: u16, percent_y: u16, r: Rect) -> Rect {
    let popup_layout = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Percentage((100 - percent_y) / 2),
            Constraint::Percentage(percent_y),
            Constraint::Percentage((100 - percent_y) / 2),
        ])
        .split(r);

    Layout::default()
        .direction(Direction::Horizontal)
        .constraints([
            Constraint::Percentage((100 - percent_x) / 2),
            Constraint::Percentage(percent_x),
            Constraint::Percentage((100 - percent_x) / 2),
        ])
        .split(popup_layout[1])[1]
}