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
exports.searchWallpapers = searchWallpapers;
exports.fetchLive2d = fetchLive2d;
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
class WallError extends Error {
    constructor(message) {
        super(message);
        this.name = 'WallError';
    }
}
const CONFIG = {
    free4kWallpaper: 'https://free4kwallpapers.com',
    wallHaven: 'https://wallhaven.cc',
    zerochan: 'https://www.zerochan.net',
    wallpapers: 'https://wallpapers.com',
    moewall: 'https://moewalls.com',
    type: {
        sfw: '100',
        sketchy: '010',
        both: '110',
    },
    resolution: {
        '1080x1920': 180,
        '720x1280': 180,
        '1440x2560': 180,
        '750x1334': 180,
        '1280x800': 160,
        '1920x1080': 159,
        '2560x1440': 140,
        '3840x2160': 144,
        '5120x2880': 52,
        '0': 185,
    },
    desktopResolution: [
        '1920x1080',
        '2560x1440',
        '3840x2160',
        '5120x2880',
    ],
};
const REQUEST_HEADERS = {
    'User-Agent': 'AnimeWallpaperApp/1.0',
    'Accept-Language': 'en-US,en;q=0.9',
};
const DEFAULT_SOURCES = ['wallhaven', 'zerochan', 'wallpapers', 'moewalls', 'wallpaperflare'];
async function searchWallpapers(options = {}) {
    const { sources = DEFAULT_SOURCES, limitPerSource = 10, randomize = true, query, excludeTags = [], page = 1, type = 'sfw', aiArt = false, resolution, } = options;
    const tasks = sources.map(async (source) => {
        switch (source) {
            case 'wallhaven':
                return await scrapeFromWallHaven({
                    query,
                    page,
                    aiArt,
                    type: type,
                    limit: limitPerSource,
                });
            case 'zerochan':
                return await scrapeFromZeroChan({ query, limit: limitPerSource });
            case 'wallpapers':
                return await scrapeFromWallpapersDotCom({ query, limit: limitPerSource });
            case 'moewalls':
                return await scrapeFromMoewall({ query, limit: limitPerSource });
            case 'wallpaperflare':
                return await scrapeFromWallpaperFlare({ query, limit: limitPerSource });
            default:
                return [];
        }
    });
    const settled = await Promise.allSettled(tasks);
    const items = [];
    const errors = [];
    for (const result of settled) {
        if (result.status === 'fulfilled') {
            items.push(...result.value);
        }
        else {
            errors.push(result.reason?.message ?? String(result.reason));
        }
    }
    const unique = dedupeById(items);
    const finalItems = randomize ? shuffleArray(unique) : unique;
    return {
        success: errors.length === 0,
        items: finalItems,
        errors: errors.length > 0 ? errors : undefined,
    };
}
async function fetchLive2d(query) {
    try {
        const items = await scrapeFromMoewall({ query, limit: 50, includeVideos: true });
        return { success: true, items };
    }
    catch (error) {
        return {
            success: false,
            items: [],
            errors: [error instanceof Error ? error.message : String(error)],
        };
    }
}
async function scrapeFromWallHaven(options) {
    const { query, page = 1, aiArt = false, type = 'sfw', limit = 24 } = options;
    if (!query) {
        throw new WallError('Wallhaven search requires a query.');
    }
    const params = new URLSearchParams();
    params.set('q', query);
    params.set('page', String(page));
    params.set('purity', CONFIG.type[type] ?? CONFIG.type.sfw);
    params.set('ai_art_filter', aiArt ? '0' : '1');
    const { data } = await axios_1.default.get(`${CONFIG.wallHaven}/search`, {
        params,
        headers: REQUEST_HEADERS,
        timeout: 15000,
    });
    const $ = cheerio.load(data);
    const items = [];
    $('.thumb-listing-page ul li .thumb').each((_, element) => {
        if (items.length >= limit) {
            return false;
        }
        const previewUrl = $(element).find('.preview').attr('href');
        if (!previewUrl) {
            return;
        }
        const id = previewUrl.split('/').pop();
        if (!id) {
            return;
        }
        const ext = $(element).find('.thumb-info .png span').length > 0 ? '.png' : '.jpg';
        const short = id.slice(0, 2);
        const imageUrl = `https://w.wallhaven.cc/full/${short}/wallhaven-${id}${ext}`;
        const thumb = $(element).find('img').attr('data-src') ?? $(element).find('img').attr('src') ?? '';
        items.push({
            id: `wallhaven-${id}`,
            source: 'wallhaven',
            title: id,
            imageUrl,
            thumbnailUrl: thumb,
            type: 'image',
            metadata: {
                page: previewUrl,
            },
        });
    });
    if (items.length === 0) {
        throw new WallError('Wallhaven returned no results.');
    }
    return items;
}
async function scrapeFromZeroChan(options) {
    const { query, limit = 24 } = options;
    if (!query) {
        throw new WallError('Zerochan search requires a query.');
    }
    const { data } = await axios_1.default.get(`${CONFIG.zerochan}/${encodeURIComponent(query)}`, {
        headers: REQUEST_HEADERS,
        timeout: 15000,
    });
    const $ = cheerio.load(data);
    const items = [];
    $('#wrapper #content ul li').each((index, element) => {
        if (items.length >= limit) {
            return false;
        }
        const imageLink = $(element).find('p a').attr('href') ?? '';
        if (!imageLink) {
            return;
        }
        const title = $(element).find('a img').attr('alt') ?? 'Zerochan Wallpaper';
        const anchorHref = $(element).find('a').attr('href') ?? '';
        const thumbSrc = $(element).find('a img').attr('data-src') ?? $(element).find('a img').attr('src') ?? '';
        const sanitizedHref = anchorHref.replace(/\//g, '');
        const sanitizedImage = imageLink.replace('https://static.zerochan.net', '').replace(/^\/+/, '');
        const baseThumb = sanitizedImage ? `https://s1.zerochan.net/${sanitizedImage}.600.${sanitizedHref}.jpg` : '';
        const imageUrl = absoluteUrl(imageLink, 'https://static.zerochan.net');
        const thumbnailUrl = thumbSrc ? absoluteUrl(thumbSrc, CONFIG.zerochan) : baseThumb;
        items.push({
            id: `zerochan-${index}-${sanitizedHref}`,
            source: 'zerochan',
            title,
            imageUrl,
            thumbnailUrl: thumbnailUrl || thumbSrc,
            type: 'image',
        });
    });
    if (items.length === 0) {
        throw new WallError('Zerochan returned no results.');
    }
    return items;
}
async function scrapeFromWallpapersDotCom(options) {
    const { query, limit = 24 } = options;
    if (!query) {
        throw new WallError('Wallpapers.com search requires a query.');
    }
    const { data } = await axios_1.default.get(`${CONFIG.wallpapers}/search/${encodeURIComponent(query)}`, {
        headers: REQUEST_HEADERS,
        timeout: 15000,
    });
    const $ = cheerio.load(data);
    const items = [];
    $('.tab-content ul.kw-contents li').each((_, element) => {
        if (items.length >= limit) {
            return false;
        }
        const figure = $(element).find('figure');
        const title = figure.data('title');
        const key = figure.data('key');
        const anchor = $(element).find('a').attr('href') ?? '';
        const thumbSrc = $(element).find('img').attr('data-src') ?? $(element).find('img').attr('src') ?? '';
        if (!key) {
            return;
        }
        const detailUrl = absoluteUrl(anchor, CONFIG.wallpapers);
        const thumbnailUrl = thumbSrc ? absoluteUrl(thumbSrc, CONFIG.wallpapers) : detailUrl;
        items.push({
            id: `wallpapers-${key}`,
            source: 'wallpapers',
            title: title ?? key,
            imageUrl: thumbnailUrl,
            thumbnailUrl,
            type: 'image',
            metadata: {
                detailUrl,
                key,
            },
        });
    });
    if (items.length === 0) {
        throw new WallError('Wallpapers.com returned no results.');
    }
    const enriched = await Promise.all(items.map(async (item) => {
        const detailUrl = item.metadata?.detailUrl ?? '';
        if (!detailUrl) {
            return item;
        }
        try {
            const resolved = await resolveWallpapersDownload(detailUrl);
            if (resolved?.imageUrl) {
                return {
                    ...item,
                    imageUrl: resolved.imageUrl,
                    width: resolved.width,
                    height: resolved.height,
                    metadata: {
                        ...item.metadata,
                        resolvedFrom: detailUrl,
                    },
                };
            }
        }
        catch (error) {
            // ignore and return baseline item
        }
        return item;
    }));
    return enriched;
}
function pickImageSource(value) {
    if (!value)
        return '';
    const firstSegment = value.split(',')[0]?.trim() ?? '';
    return firstSegment.replace(/^url\(["']?/, '').replace(/["']?\)$/, '');
}
function normalizeWallpaperFlareHref(raw) {
    if (!raw)
        return null;
    const normalized = absoluteUrl(raw, 'https://www.wallpaperflare.com');
    try {
        const url = new URL(normalized);
        const path = url.pathname.toLowerCase();
        if (!path || path === '/' || path.startsWith('/search') || path.startsWith('/tag') || path.startsWith('/page')) {
            return null;
        }
        if (!path.includes('wallpaper')) {
            return null;
        }
        return url.toString();
    }
    catch {
        return null;
    }
}
function parseResolution(text) {
    if (!text)
        return {};
    const match = text.match(/(\d{3,5})\s*[x×]\s*(\d{3,5})/i);
    if (!match)
        return {};
    const width = parseInt(match[1], 10);
    const height = parseInt(match[2], 10);
    if (Number.isNaN(width) || Number.isNaN(height)) {
        return {};
    }
    return { width, height };
}
async function scrapeFromWallpaperFlare(options = {}) {
    const { query, limit = 24 } = options;
    if (!query) {
        throw new WallError('WallpaperFlare search requires a query.');
    }
    const searchUrl = `https://www.wallpaperflare.com/search?wallpaper=${encodeURIComponent(query)}`;
    const { data } = await axios_1.default.get(searchUrl, {
        headers: {
            ...REQUEST_HEADERS,
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            Referer: 'https://www.wallpaperflare.com/',
            'Upgrade-Insecure-Requests': '1',
        },
        timeout: 20000,
    });
    const $ = cheerio.load(data);
    const items = [];
    const seenIds = new Set();
    const collectItem = (hrefValue, mediaNode) => {
        if (items.length >= limit) {
            return;
        }
        const normalizedHref = normalizeWallpaperFlareHref(hrefValue);
        if (!normalizedHref) {
            return;
        }
        const thumb = pickImageSource(mediaNode.attr('data-src') ||
            mediaNode.attr('data-original') ||
            mediaNode.attr('data-srcset') ||
            mediaNode.attr('srcset') ||
            mediaNode.attr('src'));
        if (!thumb) {
            return;
        }
        const normalizedThumb = absoluteUrl(thumb, 'https://www.wallpaperflare.com');
        const detailUrl = normalizedHref;
        const id = normalizedHref.split('/').pop()?.replace(/[^a-zA-Z0-9_-]/g, '') ??
            Math.random().toString(36).slice(2, 10);
        if (seenIds.has(id)) {
            return;
        }
        seenIds.add(id);
        const title = mediaNode.attr('alt') ||
            mediaNode.attr('title') ||
            mediaNode.parents('[title]').first().attr('title') ||
            'WallpaperFlare Wallpaper';
        items.push({
            id: `wallpaperflare-${id}`,
            source: 'wallpaperflare',
            title,
            imageUrl: normalizedThumb,
            thumbnailUrl: normalizedThumb,
            type: 'image',
            metadata: {
                detailUrl,
            },
        });
    };
    $('a[href*="/wallpaper/"]').each((_, element) => {
        if (items.length >= limit) {
            return false;
        }
        const link = $(element);
        const targetMedia = link.find('img, source').first();
        if (targetMedia.length === 0) {
            return;
        }
        collectItem(link.attr('href'), targetMedia);
    });
    $('a').each((_, element) => {
        if (items.length >= limit) {
            return false;
        }
        const link = $(element);
        const href = normalizeWallpaperFlareHref(link.attr('href'));
        if (!href) {
            return;
        }
        const media = link.find('img, source').first();
        if (media.length === 0) {
            return;
        }
        collectItem(href, media);
    });
    $('img').each((_, element) => {
        if (items.length >= limit) {
            return false;
        }
        const img = $(element);
        const parentLink = img.parents('a[href*="/wallpaper/"]').first();
        if (parentLink.length === 0) {
            return;
        }
        collectItem(parentLink.attr('href'), img);
    });
    $('source').each((_, element) => {
        if (items.length >= limit) {
            return false;
        }
        const sourceNode = $(element);
        const parentLink = sourceNode.parents('a[href*="/wallpaper/"]').first();
        if (parentLink.length === 0) {
            return;
        }
        collectItem(parentLink.attr('href'), sourceNode);
    });
    if (items.length === 0) {
        throw new WallError('WallpaperFlare returned no results.');
    }
    const resolved = await Promise.all(items.map(async (item) => {
        const detailUrl = item.metadata?.detailUrl ?? '';
        if (!detailUrl) {
            return item;
        }
        try {
            const resolvedItem = await resolveWallpaperFlareDownload(detailUrl);
            if (resolvedItem?.imageUrl) {
                return {
                    ...item,
                    imageUrl: resolvedItem.imageUrl,
                    width: resolvedItem.width,
                    height: resolvedItem.height,
                    metadata: {
                        ...item.metadata,
                        resolvedFrom: detailUrl,
                    },
                };
            }
        }
        catch (error) {
            // keep thumbnail if resolution fails
        }
        return item;
    }));
    return resolved;
}
async function scrapeFromMoewall(options = {}) {
    const { query, limit = 24, includeVideos = false } = options;
    const params = new URLSearchParams();
    if (query) {
        params.set('s', query);
    }
    const url = `${CONFIG.moewall}${query ? '' : '/'}`;
    const { data } = await axios_1.default.get(url, {
        params: query ? params : undefined,
        headers: REQUEST_HEADERS,
        timeout: 15000,
    });
    const $ = cheerio.load(data);
    const items = [];
    $('#primary ul li').each((_, element) => {
        if (items.length >= limit) {
            return false;
        }
        const anchor = $(element).find('a');
        const title = anchor.attr('title') ?? 'Moewalls Live2D';
        const urlRef = anchor.attr('href') ?? '';
        const thumbnail = $(element).find('img').attr('src') ?? '';
        if (!thumbnail) {
            return;
        }
        const videoMatch = /\/(\d{4})\/\d{2}\/([a-z0-9-]+)-thumb/i.exec(thumbnail);
        const videoUrl = videoMatch
            ? `https://static.moewalls.com/videos/preview/${videoMatch[1]}/${videoMatch[2]}-preview.mp4`
            : undefined;
        const highResImage = thumbnail
            .replace(/-thumb(?:-\d+)?(?=\.)/i, '')
            .replace(/-poster(?=\.)/i, '');
        items.push({
            id: `moewalls-${videoMatch?.[2] ?? title.replace(/\s+/g, '-').toLowerCase()}`,
            source: 'moewalls',
            title,
            imageUrl: includeVideos && videoUrl ? videoUrl : highResImage,
            thumbnailUrl: thumbnail,
            type: includeVideos && videoUrl ? 'video' : 'image',
            metadata: {
                page: urlRef,
                videoUrl,
                highResImage,
            },
        });
    });
    if (items.length === 0) {
        throw new WallError('Moewalls returned no results.');
    }
    return items;
}
async function resolveWallpapersDownload(detailUrl) {
    const absolute = absoluteUrl(detailUrl, CONFIG.wallpapers);
    const { data } = await axios_1.default.get(absolute, {
        headers: REQUEST_HEADERS,
        timeout: 15000,
    });
    const $ = cheerio.load(data);
    let bestLink = '';
    let bestPixels = 0;
    let bestWidth = 0;
    let bestHeight = 0;
    $('a').each((_, element) => {
        const href = $(element).attr('href') ?? '';
        if (!href.includes('/downloads/') && !href.includes('/images/')) {
            return;
        }
        if (!href.match(/\.(png|jpg|jpeg|webp)$/i)) {
            return;
        }
        const match = href.match(/(\d{3,4})x(\d{3,4})/);
        let currentPixels = 0;
        let currentWidth = 0;
        let currentHeight = 0;
        if (match) {
            currentWidth = parseInt(match[1], 10);
            currentHeight = parseInt(match[2], 10);
            currentPixels = currentWidth * currentHeight;
        }
        if (currentPixels >= bestPixels) {
            bestPixels = currentPixels;
            bestWidth = currentWidth;
            bestHeight = currentHeight;
            bestLink = href;
        }
    });
    if (!bestLink) {
        const fallback = $('meta[property="og:image"]').attr('content') ?? '';
        if (!fallback) {
            return null;
        }
        bestLink = fallback;
    }
    const imageUrl = absoluteUrl(bestLink, CONFIG.wallpapers);
    return {
        imageUrl,
        width: bestWidth || undefined,
        height: bestHeight || undefined,
    };
}
async function resolveWallpaperFlareDownload(detailUrl) {
    const absolute = absoluteUrl(detailUrl, 'https://www.wallpaperflare.com');
    const { data } = await axios_1.default.get(absolute, {
        headers: {
            ...REQUEST_HEADERS,
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            Referer: 'https://www.wallpaperflare.com/',
            'Upgrade-Insecure-Requests': '1',
        },
        timeout: 20000,
    });
    const $ = cheerio.load(data);
    const directLink = pickImageSource($('a[download]').attr('href')) ||
        pickImageSource($('img[itemprop="contentUrl"]').attr('src')) ||
        pickImageSource($('meta[property="og:image"]').attr('content')) ||
        '';
    if (!directLink) {
        // continue trying to discover download links from the page
    }
    const metaDescription = $('meta[itemprop="description"]').attr('content') || '';
    const originalResolution = parseResolution(metaDescription);
    const candidates = [];
    $('a[href*="/download"]').each((_, element) => {
        const rawHref = $(element).attr('href');
        if (!rawHref)
            return;
        const normalized = absoluteUrl(rawHref, 'https://www.wallpaperflare.com');
        if (!normalized.includes('/download')) {
            return;
        }
        const resFromHref = parseResolution(normalized);
        const textContent = $(element).text();
        const resFromText = parseResolution(textContent);
        let candidateUrl = normalized;
        let width = resFromHref.width ?? resFromText.width ?? originalResolution.width;
        let height = resFromHref.height ?? resFromText.height ?? originalResolution.height;
        if (!normalized.includes('/download/')) {
            if (width && height) {
                candidateUrl = `${normalized.replace(/\/$/, '')}/${width}x${height}`;
            }
        }
        candidates.push({
            url: candidateUrl,
            width,
            height,
        });
    });
    if (candidates.length === 0 && directLink) {
        return {
            imageUrl: directLink,
            width: originalResolution.width,
            height: originalResolution.height,
        };
    }
    let bestCandidate = candidates[0] ?? null;
    let bestPixels = 0;
    candidates.forEach((candidate) => {
        if (!candidate.url)
            return;
        const width = candidate.width ?? originalResolution.width ?? 0;
        const height = candidate.height ?? originalResolution.height ?? 0;
        const pixels = (width || 0) * (height || 0);
        if (pixels > bestPixels) {
            bestPixels = pixels;
            bestCandidate = candidate;
        }
    });
    if (bestCandidate) {
        return {
            imageUrl: bestCandidate.url,
            width: bestCandidate.width ?? originalResolution.width,
            height: bestCandidate.height ?? originalResolution.height,
        };
    }
    return {
        imageUrl: directLink,
        width: originalResolution.width,
        height: originalResolution.height,
    };
}
function absoluteUrl(href, base) {
    if (!href)
        return '';
    try {
        return new URL(href, base).toString();
    }
    catch {
        return href;
    }
}
function shuffleArray(array) {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}
function dedupeById(items) {
    const map = new Map();
    for (const item of items) {
        if (!map.has(item.id)) {
            map.set(item.id, item);
        }
    }
    return Array.from(map.values());
}
//# sourceMappingURL=anime-wallpaper.service.js.map