import axios from 'axios';
import * as cheerio from 'cheerio';

type WallpaperSource = 'wallhaven' | 'zerochan' | 'wallpapers' | 'moewalls' | 'wallpaperflare';

export interface WallpaperItem {
  id: string;
  source: WallpaperSource;
  title?: string;
  imageUrl: string;
  thumbnailUrl?: string;
  type?: 'image' | 'video';
  width?: number;
  height?: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface SearchOptions {
  query?: string;
  excludeTags?: string[];
  sources?: WallpaperSource[];
  page?: number;
  type?: 'sfw' | 'sketchy' | 'both';
  aiArt?: boolean;
  limitPerSource?: number;
  resolution?: string;
  randomize?: boolean;
}

export interface SearchResponse {
  success: boolean;
  items: WallpaperItem[];
  errors?: string[];
}

class WallError extends Error {
  constructor(message: string) {
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
  } as Record<string, string>,
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
  } as Record<string, number>,
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

const DEFAULT_SOURCES: WallpaperSource[] = ['wallhaven', 'zerochan', 'wallpapers', 'moewalls', 'wallpaperflare'];

export async function searchWallpapers(options: SearchOptions = {}): Promise<SearchResponse> {
  const {
    sources = DEFAULT_SOURCES,
    limitPerSource = 10,
    randomize = true,
    query,
    excludeTags = [],
    page = 1,
    type = 'sfw',
    aiArt = false,
    resolution,
  } = options;

  const tasks = sources.map(async (source) => {
    switch (source) {
      case 'wallhaven':
        return await scrapeFromWallHaven({
          query,
          page,
          aiArt,
          type: type as 'sfw' | 'sketchy' | 'both',
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
  const items: WallpaperItem[] = [];
  const errors: string[] = [];

  for (const result of settled) {
    if (result.status === 'fulfilled') {
      items.push(...result.value);
    } else {
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

export async function fetchLive2d(query?: string): Promise<SearchResponse> {
  try {
    const items = await scrapeFromMoewall({ query, limit: 50, includeVideos: true });
    return { success: true, items };
  } catch (error) {
    return {
      success: false,
      items: [],
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}

interface WallhavenOptions {
  query?: string;
  page?: number;
  aiArt?: boolean;
  type?: 'sfw' | 'sketchy' | 'both';
  limit?: number;
}

async function scrapeFromWallHaven(options: WallhavenOptions): Promise<WallpaperItem[]> {
  const { query, page = 1, aiArt = false, type = 'sfw', limit = 24 } = options;

  if (!query) {
    throw new WallError('Wallhaven search requires a query.');
  }

  const params = new URLSearchParams();
  params.set('q', query);
  params.set('page', String(page));
  params.set('purity', CONFIG.type[type] ?? CONFIG.type.sfw);
  params.set('ai_art_filter', aiArt ? '0' : '1');

  const { data } = await axios.get(`${CONFIG.wallHaven}/search`, {
    params,
    headers: REQUEST_HEADERS,
    timeout: 15000,
  });

  const $ = cheerio.load(data);
  const items: WallpaperItem[] = [];

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

interface ZerochanOptions {
  query?: string;
  limit?: number;
}

async function scrapeFromZeroChan(options: ZerochanOptions): Promise<WallpaperItem[]> {
  const { query, limit = 24 } = options;

  if (!query) {
    throw new WallError('Zerochan search requires a query.');
  }

  const { data } = await axios.get(`${CONFIG.zerochan}/${encodeURIComponent(query)}`, {
    headers: REQUEST_HEADERS,
    timeout: 15000,
  });

  const $ = cheerio.load(data);
  const items: WallpaperItem[] = [];

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

interface WallpapersDotComOptions {
  query?: string;
  limit?: number;
}

async function scrapeFromWallpapersDotCom(options: WallpapersDotComOptions): Promise<WallpaperItem[]> {
  const { query, limit = 24 } = options;

  if (!query) {
    throw new WallError('Wallpapers.com search requires a query.');
  }

  const { data } = await axios.get(`${CONFIG.wallpapers}/search/${encodeURIComponent(query)}`, {
    headers: REQUEST_HEADERS,
    timeout: 15000,
  });

  const $ = cheerio.load(data);
  const items: WallpaperItem[] = [];

  $('.tab-content ul.kw-contents li').each((_, element) => {
    if (items.length >= limit) {
      return false;
    }

    const figure = $(element).find('figure');
    const title = figure.data('title') as string | undefined;
    const key = figure.data('key') as string | undefined;
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

  const enriched = await Promise.all(
    items.map(async (item) => {
      const detailUrl = (item.metadata?.detailUrl as string | undefined) ?? '';
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
      } catch (error) {
        // ignore and return baseline item
      }

      return item;
    })
  );

  return enriched;
}

interface WallpaperFlareOptions {
  query?: string;
  limit?: number;
}

function pickImageSource(value?: string): string {
  if (!value) return '';
  const firstSegment = value.split(',')[0]?.trim() ?? '';
  return firstSegment.replace(/^url\(["']?/, '').replace(/["']?\)$/, '');
}

function normalizeWallpaperFlareHref(raw?: string): string | null {
  if (!raw) return null;
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
  } catch {
    return null;
  }
}

function parseResolution(text?: string | null): { width?: number; height?: number } {
  if (!text) return {};
  const match = text.match(/(\d{3,5})\s*[x×]\s*(\d{3,5})/i);
  if (!match) return {};
  const width = parseInt(match[1], 10);
  const height = parseInt(match[2], 10);
  if (Number.isNaN(width) || Number.isNaN(height)) {
    return {};
  }
  return { width, height };
}

async function scrapeFromWallpaperFlare(options: WallpaperFlareOptions = {}): Promise<WallpaperItem[]> {
  const { query, limit = 24 } = options;

  if (!query) {
    throw new WallError('WallpaperFlare search requires a query.');
  }

  const searchUrl = `https://www.wallpaperflare.com/search?wallpaper=${encodeURIComponent(query)}`;

  const { data } = await axios.get(searchUrl, {
    headers: {
      ...REQUEST_HEADERS,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      Referer: 'https://www.wallpaperflare.com/',
      'Upgrade-Insecure-Requests': '1',
    },
    timeout: 20000,
  });

  const $ = cheerio.load(data);
  const items: WallpaperItem[] = [];

  const seenIds = new Set<string>();

  const collectItem = (hrefValue: string | undefined, mediaNode: cheerio.Cheerio<any>) => {
    if (items.length >= limit) {
      return;
    }

    const normalizedHref = normalizeWallpaperFlareHref(hrefValue);
    if (!normalizedHref) {
      return;
    }

    const thumb = pickImageSource(
      mediaNode.attr('data-src') ||
      mediaNode.attr('data-original') ||
      mediaNode.attr('data-srcset') ||
      mediaNode.attr('srcset') ||
      mediaNode.attr('src')
    );

    if (!thumb) {
      return;
    }

    const normalizedThumb = absoluteUrl(thumb, 'https://www.wallpaperflare.com');
    const detailUrl = normalizedHref;
    const id =
      normalizedHref.split('/').pop()?.replace(/[^a-zA-Z0-9_-]/g, '') ??
      Math.random().toString(36).slice(2, 10);

    if (seenIds.has(id)) {
      return;
    }
    seenIds.add(id);

    const title =
      mediaNode.attr('alt') ||
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

  const resolved = await Promise.all(
    items.map(async (item) => {
      const detailUrl = (item.metadata?.detailUrl as string | undefined) ?? '';
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
      } catch (error) {
        // keep thumbnail if resolution fails
      }

      return item;
    })
  );

  return resolved;
}

interface MoewallsOptions {
  query?: string;
  limit?: number;
  includeVideos?: boolean;
}

async function scrapeFromMoewall(options: MoewallsOptions = {}): Promise<WallpaperItem[]> {
  const { query, limit = 24, includeVideos = false } = options;

  const params = new URLSearchParams();
  if (query) {
    params.set('s', query);
  }

  const url = `${CONFIG.moewall}${query ? '' : '/'}`;
  const { data } = await axios.get(url, {
    params: query ? params : undefined,
    headers: REQUEST_HEADERS,
    timeout: 15000,
  });

  const $ = cheerio.load(data);
  const items: WallpaperItem[] = [];

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

async function resolveWallpapersDownload(detailUrl: string): Promise<{ imageUrl: string; width?: number; height?: number } | null> {
  const absolute = absoluteUrl(detailUrl, CONFIG.wallpapers);
  const { data } = await axios.get(absolute, {
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

async function resolveWallpaperFlareDownload(detailUrl: string): Promise<{ imageUrl: string; width?: number; height?: number } | null> {
  const absolute = absoluteUrl(detailUrl, 'https://www.wallpaperflare.com');
  const { data } = await axios.get(absolute, {
    headers: {
      ...REQUEST_HEADERS,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      Referer: 'https://www.wallpaperflare.com/',
      'Upgrade-Insecure-Requests': '1',
    },
    timeout: 20000,
  });

  const $ = cheerio.load(data);

  const directLink =
    pickImageSource($('a[download]').attr('href')) ||
    pickImageSource($('img[itemprop="contentUrl"]').attr('src')) ||
    pickImageSource($('meta[property="og:image"]').attr('content')) ||
    '';

  if (!directLink) {
    // continue trying to discover download links from the page
  }

  const metaDescription = $('meta[itemprop="description"]').attr('content') || '';
  const originalResolution = parseResolution(metaDescription);

  const candidates: Array<{ url: string; width?: number; height?: number }> = [];

  $('a[href*="/download"]').each((_, element) => {
    const rawHref = $(element).attr('href');
    if (!rawHref) return;

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
    if (!candidate.url) return;

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

function absoluteUrl(href: string, base: string) {
  if (!href) return '';
  try {
    return new URL(href, base).toString();
  } catch {
    return href;
  }
}

function shuffleArray<T>(array: T[]): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function dedupeById(items: WallpaperItem[]): WallpaperItem[] {
  const map = new Map<string, WallpaperItem>();
  for (const item of items) {
    if (!map.has(item.id)) {
      map.set(item.id, item);
    }
  }
  return Array.from(map.values());
}

export type { WallpaperSource };


