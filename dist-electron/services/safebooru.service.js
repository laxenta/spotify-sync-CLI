"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchWallpapers = fetchWallpapers;
exports.getRandomImage = getRandomImage;
exports.fetchImageById = fetchImageById;
exports.getTags = getTags;
exports.getDirectImageUrl = getDirectImageUrl;
const axios_1 = __importDefault(require("axios"));
const API_BASE_URL = 'https://pic.re';
/**
 * Fetch random anime images with optional filters
 * RENAMED: This is the main function called by 'safebooru:fetchWallpapers'
 * @param includeTags - Tags to include (e.g., ['long_hair', 'blonde_hair'])
 * @param excludeTags - Tags to exclude (e.g., ['short_hair'])
 * @param limit - Number of images to fetch (will make multiple calls)
 * @param minSize - Minimum image size (width/height)
 * @param maxSize - Maximum image size (default: 6144)
 * @param compress - Use WebP format for faster loading (default: true)
 */
async function fetchWallpapers(includeTags = [], excludeTags = [], limit = 20, minSize, maxSize, compress = true) {
    try {
        const params = {
            compress: compress
        };
        if (includeTags.length > 0) {
            params.in = includeTags.join(',');
        }
        if (excludeTags.length > 0) {
            params.of = excludeTags.join(',');
        }
        if (minSize) {
            params.mix_size = minSize;
        }
        if (maxSize) {
            params.max_size = maxSize;
        }
        // Fetch multiple images by making multiple calls
        const promises = Array(limit).fill(null).map(() => axios_1.default.post(`${API_BASE_URL}/image`, null, {
            params,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'AnimeWallpaperApp/1.0'
            },
            timeout: 10000
        }));
        const responses = await Promise.allSettled(promises);
        const images = responses
            .filter((r) => r.status === 'fulfilled' && r.value?.data)
            .map(r => r.value.data);
        if (images.length === 0) {
            return {
                success: false,
                posts: [],
                error: 'No images found matching your criteria'
            };
        }
        return {
            success: true,
            posts: images
        };
    }
    catch (error) {
        console.error('Image fetch failed:', error.message);
        let errorMessage = 'Failed to fetch images';
        if (error.response?.status === 404) {
            errorMessage = 'No images found matching your criteria';
        }
        else if (error.response?.status === 400) {
            errorMessage = 'Invalid parameters';
        }
        else if (error.code === 'ECONNABORTED') {
            errorMessage = 'Request timeout';
        }
        return {
            success: false,
            posts: [],
            error: errorMessage
        };
    }
}
/**
 * Get a single random anime image
 * @param includeTags - Tags to include
 * @param excludeTags - Tags to exclude
 * @param compress - Use WebP format for faster loading (default: true)
 */
async function getRandomImage(includeTags = [], excludeTags = [], compress = true) {
    try {
        const params = {
            compress: compress
        };
        if (includeTags.length > 0) {
            params.in = includeTags.join(',');
        }
        if (excludeTags.length > 0) {
            params.of = excludeTags.join(',');
        }
        const response = await axios_1.default.post(`${API_BASE_URL}/image`, null, {
            params,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'AnimeWallpaperApp/1.0'
            },
            timeout: 10000
        });
        return response.data || null;
    }
    catch (error) {
        console.error('Image fetch failed:', error.message);
        return null;
    }
}
/**
 * Fetch a random image by ID
 * @param id - Specific image ID to fetch
 */
async function fetchImageById(id) {
    try {
        const response = await axios_1.default.post(`${API_BASE_URL}/image`, null, {
            params: { id },
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'AnimeWallpaperApp/1.0'
            },
            timeout: 10000
        });
        return response.data || null;
    }
    catch (error) {
        console.error('Fetch by ID failed:', error.message);
        return null;
    }
}
/**
 * Get available tags from the database
 * @returns Array of tags with their usage count
 */
async function getTags() {
    try {
        const response = await axios_1.default.get(`${API_BASE_URL}/tags`, {
            headers: {
                'User-Agent': 'AnimeWallpaperApp/1.0'
            },
            timeout: 5000
        });
        if (!Array.isArray(response.data)) {
            return [];
        }
        return response.data;
    }
    catch (error) {
        console.error('Tag fetch failed:', error);
        return [];
    }
}
/**
 * Get direct image URL (uses 301 redirect to CDN)
 * Recommended for reducing server load
 * @param includeTags - Tags to include
 * @param excludeTags - Tags to exclude
 * @returns Direct CDN URL
 */
function getDirectImageUrl(includeTags = [], excludeTags = [], compress = true) {
    const params = new URLSearchParams();
    if (includeTags.length > 0) {
        params.append('in', includeTags.join(','));
    }
    if (excludeTags.length > 0) {
        params.append('of', excludeTags.join(','));
    }
    params.append('compress', compress.toString());
    return `${API_BASE_URL}/images?${params.toString()}`;
}
//# sourceMappingURL=safebooru.service.js.map