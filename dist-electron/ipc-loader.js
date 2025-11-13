"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerServices = registerServices;
// electron/ipc-loader.ts
const electron_1 = require("electron");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
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
async function registerServices(servicesDir) {
    const serviceFiles = fs_1.default
        .readdirSync(servicesDir)
        .filter(file => file.endsWith('.service.js') || file.endsWith('.service.ts'));
    console.log('🔌 Registering IPC services...');
    for (const file of serviceFiles) {
        const servicePath = path_1.default.join(servicesDir, file);
        const serviceName = file.replace('.service.ts', '').replace('.service.js', '');
        try {
            // Dynamic import
            const serviceModule = await Promise.resolve(`${servicePath}`).then(s => __importStar(require(s)));
            // Register each exported function as IPC handler
            for (const [functionName, handler] of Object.entries(serviceModule)) {
                // Skip non-functions and default exports
                if (typeof handler !== 'function' || functionName === 'default')
                    continue;
                const ipcChannel = `${serviceName}:${functionName}`;
                electron_1.ipcMain.handle(ipcChannel, async (_event, ...args) => {
                    try {
                        return await handler(...args);
                    }
                    catch (error) {
                        console.error(`❌ Error in ${ipcChannel}:`, error);
                        return { success: false, error: String(error) };
                    }
                });
                console.log(`  ✅ ${ipcChannel}`);
            }
        }
        catch (error) {
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
//# sourceMappingURL=ipc-loader.js.map