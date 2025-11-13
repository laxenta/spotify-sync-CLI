import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import sharp from 'sharp';
import { app } from 'electron';

const CACHE_DIR = path.join(app.getPath('userData'), 'wallpaper-cache');

type DownloadImageOptions =
  | string
  | {
      filename?: string;
      referer?: string;
      headers?: Record<string, string>;
      forceExtension?: string;
      convertToPng?: boolean;
    };

const IMAGE_CONTENT_TYPE_MAP: Record<string, string> = {
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

function normalizeOptions(options?: DownloadImageOptions) {
  if (!options) {
    return {
      filename: undefined as string | undefined,
      referer: undefined as string | undefined,
      headers: undefined as Record<string, string> | undefined,
      forceExtension: undefined as string | undefined,
      convertToPng: false,
    };
  }

  if (typeof options === 'string') {
    return {
      filename: options,
      referer: undefined as string | undefined,
      headers: undefined as Record<string, string> | undefined,
      forceExtension: undefined as string | undefined,
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

function inferExtensionFromContentType(contentType?: string): string | undefined {
  if (!contentType) return undefined;
  const normalized = contentType.split(';')[0]?.trim().toLowerCase();
  if (!normalized) return undefined;
  return IMAGE_CONTENT_TYPE_MAP[normalized];
}

function ensureExtension(filename: string, extension?: string) {
  const currentExt = path.extname(filename).replace('.', '').toLowerCase();
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

export async function ensureCacheDir() {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    return { success: true, path: CACHE_DIR };
  } catch (error) {
    console.error('Failed to create cache dir:', error);
    return { success: false, error: String(error) };
  }
}

export async function downloadImage(url: string, options?: DownloadImageOptions) {
  try {
    await ensureCacheDir();

    const normalizedOptions = normalizeOptions(options);
    const urlHasProtocol = /^https?:\/\//i.test(url);
    const fullUrl = urlHasProtocol ? url : `https://${url}`;

    const headers: Record<string, string> = {
      'User-Agent': 'AnimeWallpaperApp/1.0',
      Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      ...normalizedOptions.headers,
    };

    if (normalizedOptions.referer) {
      headers['Referer'] = normalizedOptions.referer;
    } else if (/wallpaperflare\.com/i.test(fullUrl)) {
      headers['Referer'] = 'https://www.wallpaperflare.com/';
    }

    console.log(`📥 Downloading from: ${fullUrl}`);

    const response = await axios.get(fullUrl, {
      responseType: 'arraybuffer',
      timeout: 30000,
      headers,
      validateStatus: status => status >= 200 && status < 400,
    });

    const contentType = response.headers['content-type'] as string | undefined;
    if (!contentType || !contentType.toLowerCase().startsWith('image/')) {
      throw new Error(`Non-image content type received: ${contentType ?? 'unknown'}`);
    }

    const inferredExtension = normalizedOptions.forceExtension ?? inferExtensionFromContentType(contentType);
    const baseFilename =
      normalizedOptions.filename ?? `wallpaper-${Date.now()}`;
    const finalFilename = ensureExtension(baseFilename, inferredExtension);
    const filepath = path.join(CACHE_DIR, finalFilename);

    const buffer = Buffer.from(response.data);
    await fs.writeFile(filepath, buffer);

    let finalPath = filepath;

    const shouldConvertToPng =
      normalizedOptions.convertToPng ||
      /image\/(webp|avif|heic|heif|tiff)/i.test(contentType);

    if (shouldConvertToPng && inferredExtension !== 'png') {
      const pngPath = filepath.replace(/\.[^.]+$/, '.png');
      console.log(`🖼️ Converting ${finalFilename} to PNG for compatibility`);
      await sharp(buffer).png().toFile(pngPath);
      await fs.unlink(filepath).catch(() => {});
      finalPath = pngPath;
    }

    console.log(`✅ Downloaded to: ${finalPath}`);

    return { success: true, path: finalPath };
  } catch (error) {
    console.error('Failed to download image:', error);
    return { success: false, error: String(error) };
  }
}

export function getCachePath() {
  return { success: true, path: CACHE_DIR };
}

export async function clearCache() {
  try {
    const files = await fs.readdir(CACHE_DIR);
    for (const file of files) {
      await fs.unlink(path.join(CACHE_DIR, file));
    }
    return { success: true, filesDeleted: files.length };
  } catch (error) {
    console.error('Failed to clear cache:', error);
    return { success: false, error: String(error) };
  }
}

export async function getCacheSize() {
  try {
    await ensureCacheDir();

    const files = await fs.readdir(CACHE_DIR);
    let totalSize = 0;
    
    for (const file of files) {
      const stats = await fs.stat(path.join(CACHE_DIR, file));
      totalSize += stats.size;
    }
    
    return { 
      success: true, 
      sizeBytes: totalSize,
      sizeMB: (totalSize / 1024 / 1024).toFixed(2),
      fileCount: files.length 
    };
  } catch (error) {
    console.error('Failed to get cache size:', error);
    return { success: false, error: String(error) };
  }
}