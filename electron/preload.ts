// import { contextBridge, ipcRenderer } from 'electron';

// contextBridge.exposeInMainWorld('electron', {
//   setWallpaper: (imagePath: string) => ipcRenderer.invoke('set-wallpaper', imagePath),
//   getWallpaper: () => ipcRenderer.invoke('get-wallpaper'),
// });

import { contextBridge, ipcRenderer } from 'electron';

// Type definitions for frontend
export interface DownloadImageOptions {
  filename?: string;
  referer?: string;
  headers?: Record<string, string>;
  forceExtension?: string;
  convertToPng?: boolean;
}

export interface ElectronAPI {
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  
  // Typed helpers for better DX
  wallpaper: {
    set: (path: string) => Promise<any>;
    get: () => Promise<any>;
  };
  
  safebooru: {
    fetchWallpapers: (tags: string[], limit?: number) => Promise<any>;
    searchByTags: (tags: string[], page?: number, limit?: number) => Promise<any>;
  };
  
  cache: {
    downloadImage: (url: string, options?: string | DownloadImageOptions) => Promise<any>;
    getPath: () => Promise<any>;
    clear: () => Promise<any>;
    getSize: () => Promise<any>;
  };

  animeWallpaper: {
    search: (options?: Record<string, unknown>) => Promise<any>;
    live2d: (query?: string) => Promise<any>;
  };
}

// Expose to renderer process
contextBridge.exposeInMainWorld('electron', {
  // Generic invoke for any service call
  invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
  
  // Typed helpers
  wallpaper: {
    set: (path: string) => ipcRenderer.invoke('wallpaper:setWallpaperFromPath', path),
    get: () => ipcRenderer.invoke('wallpaper:getCurrentWallpaper'),
  },
  
  safebooru: {
    fetchWallpapers: (tags: string[], limit?: number) => 
      ipcRenderer.invoke('safebooru:fetchWallpapers', tags, limit),
    searchByTags: (tags: string[], page?: number, limit?: number) =>
      ipcRenderer.invoke('safebooru:searchByTags', tags, page, limit),
  },
  
  cache: {
    downloadImage: (url: string, options?: string | DownloadImageOptions) =>
      ipcRenderer.invoke('cache:downloadImage', url, options),
    getPath: () => ipcRenderer.invoke('cache:getCachePath'),
    clear: () => ipcRenderer.invoke('cache:clearCache'),
    getSize: () => ipcRenderer.invoke('cache:getCacheSize'),
  },

  animeWallpaper: {
    search: (options?: Record<string, unknown>) =>
      ipcRenderer.invoke('anime-wallpaper:searchWallpapers', options),
    live2d: (query?: string) =>
      ipcRenderer.invoke('anime-wallpaper:fetchLive2d', query),
  },
} as ElectronAPI);