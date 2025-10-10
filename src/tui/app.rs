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

use anyhow::Result;

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Screen {
    AccountSelection,
    TransferProgress,
    Complete,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum SelectedAccount {
    Source,
    Target,
}

pub struct App {
    pub screen: Screen,
    pub source_account: Option<String>,
    pub target_account: Option<String>,
    pub selected_account: SelectedAccount,
    pub available_accounts: Vec<String>,
    pub selected_index: usize,
    pub transfer_status: String,
    pub should_quit: bool,
}

impl App {
    pub fn new() -> Result<Self> {
        let available_accounts = crate::storage::tokens::list_accounts()?;
        
        Ok(Self {
            screen: Screen::AccountSelection,
            source_account: None,
            target_account: None,
            selected_account: SelectedAccount::Source,
            available_accounts,
            selected_index: 0,
            transfer_status: String::new(),
            should_quit: false,
        })
    }

    pub fn next_account(&mut self) {
        if !self.available_accounts.is_empty() {
            self.selected_index = (self.selected_index + 1) % self.available_accounts.len();
        }
    }

    pub fn previous_account(&mut self) {
        if !self.available_accounts.is_empty() {
            if self.selected_index == 0 {
                self.selected_index = self.available_accounts.len() - 1;
            } else {
                self.selected_index -= 1;
            }
        }
    }

    pub fn select_current_account(&mut self) {
        if self.available_accounts.is_empty() {
            return;
        }

        let account = self.available_accounts[self.selected_index].clone();
        
        match self.selected_account {
            SelectedAccount::Source => {
                self.source_account = Some(account);
                self.selected_account = SelectedAccount::Target;
                self.selected_index = 0;
            }
            SelectedAccount::Target => {
                self.target_account = Some(account);
            }
        }
    }

    pub fn can_start_transfer(&self) -> bool {
        self.source_account.is_some() && self.target_account.is_some()
    }

    pub async fn start_transfer(&mut self) -> Result<()> {
        if let (Some(source), Some(target)) = (&self.source_account, &self.target_account) {
            self.screen = Screen::TransferProgress;
            self.transfer_status = "Starting transfer...".to_string();
            
            // Do the actual transfer
            crate::transfer::sync::transfer_all(source, target).await?;
            
            self.screen = Screen::Complete;
            self.transfer_status = "Transfer complete! 🎉".to_string();
        }
        
        Ok(())
    }

    pub fn quit(&mut self) {
        self.should_quit = true;
    }
}