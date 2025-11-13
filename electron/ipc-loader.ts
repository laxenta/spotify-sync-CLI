// electron/ipc-loader.ts
import { ipcMain } from 'electron';
import fs from 'fs';
import path from 'path';

interface ServiceModule {
  [key: string]: (...args: any[]) => Promise<any>;
}

/**
 * Auto-loads all services from /services folder and registers them as IPC handlers
 * 
 * Example service file structure:
 * // services/wallpaper.service.ts
 * export async function setWallpaper(imagePath: string) { ... }
 * export async function getWallpaper() { ... }
 * 
 * These become IPC handlers:
 * - 'wallpaper:setWallpaper'
 * - 'wallpaper:getWallpaper'
 */
export async function registerServices(servicesDir: string) {
  const serviceFiles = fs
    .readdirSync(servicesDir)
    .filter(file => file.endsWith('.service.js') || file.endsWith('.service.ts'));

  console.log('🔌 Registering IPC services...');

  for (const file of serviceFiles) {
    const servicePath = path.join(servicesDir, file);
    const serviceName = file.replace('.service.ts', '').replace('.service.js', '');
    
    try {
      // Dynamic import
      const serviceModule: ServiceModule = await import(servicePath);
      
      // Register each exported function as IPC handler
      for (const [functionName, handler] of Object.entries(serviceModule)) {
        // Skip non-functions and default exports
        if (typeof handler !== 'function' || functionName === 'default') continue;
        
        const ipcChannel = `${serviceName}:${functionName}`;
        
        ipcMain.handle(ipcChannel, async (_event, ...args) => {
          try {
            return await handler(...args);
          } catch (error) {
            console.error(`❌ Error in ${ipcChannel}:`, error);
            return { success: false, error: String(error) };
          }
        });
        
        console.log(`  ✅ ${ipcChannel}`);
      }
    } catch (error) {
      console.error(`Failed to load service ${serviceName}:`, error);
    }
  }
  
  console.log('🎉 All services registered!\n');
}

// /**
//  * Alternative: Register a single service manually with custom channel names
//  */
// export function registerService(
//   serviceModule: ServiceModule,
//   options: {
//     prefix?: string; // e.g., 'wallpaper' → 'wallpaper:setWallpaper'
//     channelMap?: Record<string, string>; // Custom naming: { setWallpaper: 'set-wp' }
//   } = {}
// ) {
//   const { prefix, channelMap } = options;
  
//   for (const [functionName, handler] of Object.entries(serviceModule)) {
//     if (typeof handler !== 'function') continue;
    
//     const channelName = channelMap?.[functionName] 
//       || (prefix ? `${prefix}:${functionName}` : functionName);
    
//     ipcMain.handle(channelName, async (_event, ...args) => {
//       try {
//         return await handler(...args);
//       } catch (error) {
//         console.error(`Error in ${channelName}:`, error);
//         return { success: false, error: String(error) };
//       }
//     });
    
//     console.log(`✅ Registered: ${channelName}`);
//   }
// }