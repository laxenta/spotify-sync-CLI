"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setWallpaperFromPath = setWallpaperFromPath;
exports.getCurrentWallpaper = getCurrentWallpaper;
const wallpaper_1 = require("wallpaper");
const sharp_1 = __importDefault(require("sharp"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
async function setWallpaperFromPath(imagePath) {
    try {
        await (0, wallpaper_1.setWallpaper)(imagePath);
        return { success: true };
    }
    catch (error) {
        console.error('Failed to set wallpaper:', error);
        const errorMessage = String(error ?? '');
        const needsFallback = errorMessage.includes('0x80070057') || errorMessage.toLowerCase().includes('parameter is incorrect');
        if (needsFallback) {
            try {
                console.warn('Retrying wallpaper set with "fit" scale fallback');
                await (0, wallpaper_1.setWallpaper)(imagePath, { scale: 'fit' });
                return { success: true, note: 'Fallback scale applied (fit)' };
            }
            catch (fallbackError) {
                console.error('Fallback wallpaper set failed:', fallbackError);
                try {
                    console.warn('Attempting PNG conversion fallback for wallpaper set');
                    const pngPath = await convertImageToPng(imagePath);
                    await (0, wallpaper_1.setWallpaper)(pngPath, { scale: 'center' });
                    return { success: true, note: 'Converted to PNG and set with center scale' };
                }
                catch (conversionError) {
                    console.error('PNG conversion fallback failed:', conversionError);
                    return {
                        success: false,
                        error: `${errorMessage} | Fallback failed: ${String(fallbackError ?? '')} | PNG conversion failed: ${String(conversionError ?? '')}`,
                    };
                }
            }
        }
        return { success: false, error: errorMessage };
    }
}
async function getCurrentWallpaper() {
    try {
        const path = await (0, wallpaper_1.getWallpaper)();
        return { success: true, path };
    }
    catch (error) {
        console.error('Failed to get wallpaper:', error);
        return { success: false, error: String(error) };
    }
}
async function convertImageToPng(imagePath) {
    const tempDir = await promises_1.default.mkdtemp(path_1.default.join(os_1.default.tmpdir(), 'colorwall-png-'));
    const baseName = path_1.default.basename(imagePath, path_1.default.extname(imagePath));
    const pngPath = path_1.default.join(tempDir, `${baseName}.png`);
    await (0, sharp_1.default)(imagePath).png().toFile(pngPath);
    return pngPath;
}
//# sourceMappingURL=wallpaper.service.js.map