// global.d.ts
declare global {
    interface Window {
      electron: {
        invoke: (channel: string, ...args: any[]) => Promise<any>;
        wallpaper: {
          set: (path: string) => Promise<any>;
          get: () => Promise<any>;
        };
        safebooru: {
          fetchWallpapers: (tags: string[], limit?: number) => Promise<any>;
          searchByTags: (tags: string[], page?: number, limit?: number) => Promise<any>;
        };
        cache: {
          downloadImage: (url: string, options?: string | {
            filename?: string;
            referer?: string;
            headers?: Record<string, string>;
            forceExtension?: string;
            convertToPng?: boolean;
          }) => Promise<any>;
          getPath: () => Promise<any>;
          getSize: () => Promise<any>;
          clear: () => Promise<any>;
        };
        animeWallpaper: {
          search: (options?: Record<string, unknown>) => Promise<any>;
          live2d: (query?: string) => Promise<any>;
        };
      };
    }
  }
  
  export {};