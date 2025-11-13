import axios from 'axios';
import { net } from 'electron';

const API_BASE_URL = 'https://pic.re';

export interface ProxyImageResult {
  success: boolean;
  data?: string; // base64 data URL
  error?: string;
  mimeType?: string;
}

export interface FetchImageResult {
  success: boolean;
  url?: string;
  data?: string; // base64 fallback
  error?: string;
}

/**
 * Proxy images through main process to avoid CORS and 404 issues
 */
export async function proxyImage(imageUrl: string): Promise<ProxyImageResult> {
  try {
    console.log(`🖼️ Proxying image: ${imageUrl}`);
    
    // Try using electron's net module first (better for binary data)
    const response = await net.fetch(imageUrl, {
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

  } catch (error: any) {
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
export async function proxyMultipleImages(imageUrls: string[]): Promise<{ [url: string]: ProxyImageResult }> {
  const results: { [url: string]: ProxyImageResult } = {};
  
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
export async function getImageUrl(imageUrl: string): Promise<FetchImageResult> {
  try {
    // Just return the URL - let the renderer handle it with proper CORS
    return {
      success: true,
      url: imageUrl
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Check if image URL is accessible
 */
export async function checkImageAccessible(imageUrl: string): Promise<{ accessible: boolean; status?: number }> {
  try {
    const response = await net.fetch(imageUrl, { method: 'HEAD' });
    return {
      accessible: response.ok,
      status: response.status
    };
  } catch (error) {
    return {
      accessible: false
    };
  }
}