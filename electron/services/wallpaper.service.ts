import { getWallpaper, setWallpaper } from 'wallpaper';
import sharp from 'sharp';
import os from 'os';
import path from 'path';
import fs from 'fs/promises';

export async function setWallpaperFromPath(imagePath: string) {
  try {
    await setWallpaper(imagePath);
    return { success: true };
  } catch (error) {
    console.error('Failed to set wallpaper:', error);

    const errorMessage = String(error ?? '');
    const needsFallback = errorMessage.includes('0x80070057') || errorMessage.toLowerCase().includes('parameter is incorrect');

    if (needsFallback) {
      try {
        console.warn('Retrying wallpaper set with "fit" scale fallback');
        await setWallpaper(imagePath, { scale: 'fit' });
        return { success: true, note: 'Fallback scale applied (fit)' };
      } catch (fallbackError) {
        console.error('Fallback wallpaper set failed:', fallbackError);
        try {
          console.warn('Attempting PNG conversion fallback for wallpaper set');
          const pngPath = await convertImageToPng(imagePath);
          await setWallpaper(pngPath, { scale: 'center' });
          return { success: true, note: 'Converted to PNG and set with center scale' };
        } catch (conversionError) {
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

export async function getCurrentWallpaper() {
  try {
    const path = await getWallpaper();
    return { success: true, path };
  } catch (error) {
    console.error('Failed to get wallpaper:', error);
    return { success: false, error: String(error) };
  }
}

async function convertImageToPng(imagePath: string): Promise<string> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'colorwall-png-'));
  const baseName = path.basename(imagePath, path.extname(imagePath));
  const pngPath = path.join(tempDir, `${baseName}.png`);

  await sharp(imagePath).png().toFile(pngPath);
  return pngPath;
}