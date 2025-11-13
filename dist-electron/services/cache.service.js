"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureCacheDir = ensureCacheDir;
exports.downloadImage = downloadImage;
exports.getCachePath = getCachePath;
exports.clearCache = clearCache;
exports.getCacheSize = getCacheSize;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const axios_1 = __importDefault(require("axios"));
const sharp_1 = __importDefault(require("sharp"));
const electron_1 = require("electron");
const CACHE_DIR = path_1.default.join(electron_1.app.getPath('userData'), 'wallpaper-cache');
const IMAGE_CONTENT_TYPE_MAP = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/bmp': 'bmp',
    'image/avif': 'avif',
    'image/heic': 'heic',
    'image/heif': 'heif',
    'image/tiff': 'tiff',
};
function normalizeOptions(options) {
    if (!options) {
        return {
            filename: undefined,
            referer: undefined,
            headers: undefined,
            forceExtension: undefined,
            convertToPng: false,
        };
    }
    if (typeof options === 'string') {
        return {
            filename: options,
            referer: undefined,
            headers: undefined,
            forceExtension: undefined,
            convertToPng: false,
        };
    }
    return {
        filename: options.filename,
        referer: options.referer,
        headers: options.headers,
        forceExtension: options.forceExtension,
        convertToPng: Boolean(options.convertToPng),
    };
}
function inferExtensionFromContentType(contentType) {
    if (!contentType)
        return undefined;
    const normalized = contentType.split(';')[0]?.trim().toLowerCase();
    if (!normalized)
        return undefined;
    return IMAGE_CONTENT_TYPE_MAP[normalized];
}
function ensureExtension(filename, extension) {
    const currentExt = path_1.default.extname(filename).replace('.', '').toLowerCase();
    if (extension && currentExt !== extension) {
        return `${filename.replace(/\.[^.]+$/, '')}.${extension}`;
    }
    if (!currentExt && extension) {
        return `${filename}.${extension}`;
    }
    if (!currentExt) {
        return `${filename}.jpg`;
    }
    return filename;
}
async function ensureCacheDir() {
    try {
        await promises_1.default.mkdir(CACHE_DIR, { recursive: true });
        return { success: true, path: CACHE_DIR };
    }
    catch (error) {
        console.error('Failed to create cache dir:', error);
        return { success: false, error: String(error) };
    }
}
async function downloadImage(url, options) {
    try {
        await ensureCacheDir();
        const normalizedOptions = normalizeOptions(options);
        const urlHasProtocol = /^https?:\/\//i.test(url);
        const fullUrl = urlHasProtocol ? url : `https://${url}`;
        const headers = {
            'User-Agent': 'AnimeWallpaperApp/1.0',
            Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
            ...normalizedOptions.headers,
        };
        if (normalizedOptions.referer) {
            headers['Referer'] = normalizedOptions.referer;
        }
        else if (/wallpaperflare\.com/i.test(fullUrl)) {
            headers['Referer'] = 'https://www.wallpaperflare.com/';
        }
        console.log(`📥 Downloading from: ${fullUrl}`);
        const response = await axios_1.default.get(fullUrl, {
            responseType: 'arraybuffer',
            timeout: 30000,
            headers,
            validateStatus: status => status >= 200 && status < 400,
        });
        const contentType = response.headers['content-type'];
        if (!contentType || !contentType.toLowerCase().startsWith('image/')) {
            throw new Error(`Non-image content type received: ${contentType ?? 'unknown'}`);
        }
        const inferredExtension = normalizedOptions.forceExtension ?? inferExtensionFromContentType(contentType);
        const baseFilename = normalizedOptions.filename ?? `wallpaper-${Date.now()}`;
        const finalFilename = ensureExtension(baseFilename, inferredExtension);
        const filepath = path_1.default.join(CACHE_DIR, finalFilename);
        const buffer = Buffer.from(response.data);
        await promises_1.default.writeFile(filepath, buffer);
        let finalPath = filepath;
        const shouldConvertToPng = normalizedOptions.convertToPng ||
            /image\/(webp|avif|heic|heif|tiff)/i.test(contentType);
        if (shouldConvertToPng && inferredExtension !== 'png') {
            const pngPath = filepath.replace(/\.[^.]+$/, '.png');
            console.log(`🖼️ Converting ${finalFilename} to PNG for compatibility`);
            await (0, sharp_1.default)(buffer).png().toFile(pngPath);
            await promises_1.default.unlink(filepath).catch(() => { });
            finalPath = pngPath;
        }
        console.log(`✅ Downloaded to: ${finalPath}`);
        return { success: true, path: finalPath };
    }
    catch (error) {
        console.error('Failed to download image:', error);
        return { success: false, error: String(error) };
    }
}
function getCachePath() {
    return { success: true, path: CACHE_DIR };
}
async function clearCache() {
    try {
        const files = await promises_1.default.readdir(CACHE_DIR);
        for (const file of files) {
            await promises_1.default.unlink(path_1.default.join(CACHE_DIR, file));
        }
        return { success: true, filesDeleted: files.length };
    }
    catch (error) {
        console.error('Failed to clear cache:', error);
        return { success: false, error: String(error) };
    }
}
async function getCacheSize() {
    try {
        await ensureCacheDir();
        const files = await promises_1.default.readdir(CACHE_DIR);
        let totalSize = 0;
        for (const file of files) {
            const stats = await promises_1.default.stat(path_1.default.join(CACHE_DIR, file));
            totalSize += stats.size;
        }
        return {
            success: true,
            sizeBytes: totalSize,
            sizeMB: (totalSize / 1024 / 1024).toFixed(2),
            fileCount: files.length
        };
    }
    catch (error) {
        console.error('Failed to get cache size:', error);
        return { success: false, error: String(error) };
    }
}
//# sourceMappingURL=cache.service.js.map