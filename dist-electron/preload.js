"use strict";
// import { contextBridge, ipcRenderer } from 'electron';
Object.defineProperty(exports, "__esModule", { value: true });
// contextBridge.exposeInMainWorld('electron', {
//   setWallpaper: (imagePath: string) => ipcRenderer.invoke('set-wallpaper', imagePath),
//   getWallpaper: () => ipcRenderer.invoke('get-wallpaper'),
// });
const electron_1 = require("electron");
// Expose to renderer process
electron_1.contextBridge.exposeInMainWorld('electron', {
    // Generic invoke for any service call
    invoke: (channel, ...args) => electron_1.ipcRenderer.invoke(channel, ...args),
    // Typed helpers
    wallpaper: {
        set: (path) => electron_1.ipcRenderer.invoke('wallpaper:setWallpaperFromPath', path),
        get: () => electron_1.ipcRenderer.invoke('wallpaper:getCurrentWallpaper'),
    },
    safebooru: {
        fetchWallpapers: (tags, limit) => electron_1.ipcRenderer.invoke('safebooru:fetchWallpapers', tags, limit),
        searchByTags: (tags, page, limit) => electron_1.ipcRenderer.invoke('safebooru:searchByTags', tags, page, limit),
    },
    cache: {
        downloadImage: (url, options) => electron_1.ipcRenderer.invoke('cache:downloadImage', url, options),
        getPath: () => electron_1.ipcRenderer.invoke('cache:getCachePath'),
        clear: () => electron_1.ipcRenderer.invoke('cache:clearCache'),
        getSize: () => electron_1.ipcRenderer.invoke('cache:getCacheSize'),
    },
    animeWallpaper: {
        search: (options) => electron_1.ipcRenderer.invoke('anime-wallpaper:searchWallpapers', options),
        live2d: (query) => electron_1.ipcRenderer.invoke('anime-wallpaper:fetchLive2d', query),
    },
});
//# sourceMappingURL=preload.js.map