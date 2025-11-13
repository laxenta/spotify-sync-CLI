import type { ElectronAPI as PreloadElectronAPI } from '../electron/preload';

export type ElectronAPI = PreloadElectronAPI;

declare global {
  interface Window {
    electron: PreloadElectronAPI;
  }
}

export {};

