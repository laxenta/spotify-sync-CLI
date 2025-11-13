"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.proxyImage = proxyImage;
exports.proxyMultipleImages = proxyMultipleImages;
exports.getImageUrl = getImageUrl;
exports.checkImageAccessible = checkImageAccessible;
const electron_1 = require("electron");
const API_BASE_URL = 'https://pic.re';
/**
 * Proxy images through main process to avoid CORS and 404 issues
 */
async function proxyImage(imageUrl) {
    try {
        console.log(`🖼️ Proxying image: ${imageUrl}`);
        // Try using electron's net module first (better for binary data)
        const response = await electron_1.net.fetch(imageUrl, {
            headers: {
                'User-Agent': 'AnimeWallpaperApp/1.0',
                'Referer': 'https://pic.re/',
                'Accept': 'image/*'
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        // Detect MIME type from response or URL
        const contentType = response.headers.get('content-type') ||
            imageUrl.endsWith('.png') ? 'image/png' :
            imageUrl.endsWith('.jpg') || imageUrl.endsWith('.jpeg') ? 'image/jpeg' :
                imageUrl.endsWith('.gif') ? 'image/gif' : 'image/jpeg';
        const base64 = buffer.toString('base64');
        const dataUrl = `data:${contentType};base64,${base64}`;
        return {
            success: true,
            data: dataUrl,
            mimeType: contentType
        };
    }
    catch (error) {
        console.error('❌ Image proxy failed:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}
/**
 * Fetch and proxy multiple images in batch
 */
async function proxyMultipleImages(imageUrls) {
    const results = {};
    // Process images in parallel with limited concurrency
    const concurrency = 5;
    const batches = [];
    for (let i = 0; i < imageUrls.length; i += concurrency) {
        batches.push(imageUrls.slice(i, i + concurrency));
    }
    for (const batch of batches) {
        const batchPromises = batch.map(async (url) => {
            results[url] = await proxyImage(url);
        });
        await Promise.all(batchPromises);
    }
    return results;
}
/**
 * Get direct image URL with proper headers (for use in <webview> or when CORS works)
 */
async function getImageUrl(imageUrl) {
    try {
        // Just return the URL - let the renderer handle it with proper CORS
        return {
            success: true,
            url: imageUrl
        };
    }
    catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}
/**
 * Check if image URL is accessible
 */
async function checkImageAccessible(imageUrl) {
    try {
        const response = await electron_1.net.fetch(imageUrl, { method: 'HEAD' });
        return {
            accessible: response.ok,
            status: response.status
        };
    }
    catch (error) {
        return {
            accessible: false
        };
    }
}
//# sourceMappingURL=image-proxy.service.js.map