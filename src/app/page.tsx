'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Search, Download, Trash2, HardDrive, Loader2, CheckCircle, Image, Play, X, ZoomIn, ZoomOut } from 'lucide-react';
type WallpaperSourceOption = 'all' | 'picre' | 'wallhaven' | 'zerochan' | 'wallpapers' | 'moewalls' | 'wallpaperflare';

interface PicReImage {
  file_url: string;
  md5: string;
  tags: string[];
  width: number;
  height: number;
  source: string;
  author: string;
  has_children: boolean;
  _id: number;
}
interface WallpaperItem {
  id: string;
  source: WallpaperSourceOption;
  title?: string;
  imageUrl: string;
  thumbnailUrl?: string;
  type?: 'image' | 'video';
  width?: number;
  height?: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
  original?: unknown;
}
const API_BASE_URL = 'https://pic.re';
const DEFAULT_FETCH_COUNT = 20;
const MAX_INPUT_LENGTH = 100;

const SOURCE_OPTIONS: { value: WallpaperSourceOption; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'wallhaven', label: 'Wallhaven' },
  { value: 'zerochan', label: 'Zerochan' },
  { value: 'wallpapers', label: 'Wallpapers' },
  { value: 'moewalls', label: 'Live2D' },
  { value: 'wallpaperflare', label: 'WPFlare' },
  { value: 'picre', label: 'pic.re' },
];
const GlobeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);
const PaletteIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <circle cx="8" cy="10" r="1" fill="currentColor"/>
    <circle cx="12" cy="8" r="1" fill="currentColor"/>
    <circle cx="16" cy="10" r="1" fill="currentColor"/>
    <circle cx="14" cy="14" r="1" fill="currentColor"/>
    <path d="M12 22c1.5-2 3-3.5 3-6a3 3 0 0 0-6 0c0 2.5 1.5 4 3 6z"/>
  </svg>
);
const StarIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);
const CameraIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
);
const SparklesIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4"/>
  </svg>
);
const FlameIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
  </svg>
);

const BoltIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
);

const getSourceIcon = (source: WallpaperSourceOption) => {
  switch (source) {
    case 'all': return <GlobeIcon />;
    case 'wallhaven': return <PaletteIcon />;
    case 'zerochan': return <StarIcon />;
    case 'wallpapers': return <CameraIcon />;
    case 'moewalls': return <SparklesIcon />;
    case 'wallpaperflare': return <FlameIcon />;
    case 'picre': return <BoltIcon />;
    default: return <CameraIcon />;
  }
};
const LaxentaLogo = () => (
  <svg width="28" height="28" viewBox="0 0 40 40" className="animate-pulse-slow">
    <defs>
      <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#6366f1" />
      </linearGradient>
    </defs>
    <circle cx="20" cy="20" r="18" fill="url(#logoGradient)" opacity="0.2"/>
    <path d="M12 12 L28 20 L12 28 Z" fill="url(#logoGradient)" className="animate-float"/>
    <circle cx="20" cy="20" r="3" fill="#3b82f6" className="animate-ping-slow"/>
  </svg>
);
const ImageModal = ({ 
  image, 
  onClose, 
  onSetWallpaper, 
  isLoading 
}: { 
  image: WallpaperItem; 
  onClose: () => void; 
  onSetWallpaper: () => void;
  isLoading: boolean;
}) => {
  const [zoom, setZoom] = useState(1);
  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 bg-gray-900/80 hover:bg-gray-800 rounded-full transition-colors"
      >
        <X className="w-6 h-6 text-gray-400" />
      </button>

      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setZoom(Math.min(zoom + 0.25, 3));
          }}
          className="p-2 bg-gray-900/80 hover:bg-gray-800 rounded-full transition-colors"
        >
          <ZoomIn className="w-5 h-5 text-gray-400" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setZoom(Math.max(zoom - 0.25, 0.5));
          }}
          className="p-2 bg-gray-900/80 hover:bg-gray-800 rounded-full transition-colors"
        >
          <ZoomOut className="w-5 h-5 text-gray-400" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setZoom(1);
          }}
          className="px-3 py-2 bg-gray-900/80 hover:bg-gray-800 rounded-full transition-colors text-xs text-gray-400"
        >
          Reset
        </button>
      </div>

      <div 
        className="relative max-w-7xl max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {!imgLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
          </div>
        )}
        
        <img
          src={image.imageUrl}
          alt={image.title || 'Wallpaper'}
          className="max-w-full max-h-[90vh] object-contain transition-all duration-300"
          style={{ transform: `scale(${zoom})` }}
          onLoad={() => setImgLoaded(true)}
        />

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3">
          <a
            href={image.imageUrl}
            download
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-2 bg-gray-900/90 hover:bg-gray-800 text-white px-6 py-3 rounded-full transition-all font-medium shadow-xl"
          >
            <Download className="w-5 h-5" />
            Download
          </a>
          
          {image.type !== 'video' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSetWallpaper();
              }}
              disabled={isLoading}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white px-6 py-3 rounded-full transition-all font-medium shadow-xl shadow-blue-500/30"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Mhmm Setting...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Set as Wallpaper?
                </>
              )}
            </button>
          )}
        </div>

        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-gray-900/90 backdrop-blur-md px-4 py-2 rounded-full">
          <p className="text-sm text-gray-300 font-medium">{image.title || 'Untitled'}</p>
        </div>
      </div>
    </div>
  );
};
const ImageCard = ({ image, onSelect }: { 
  image: WallpaperItem; 
  onSelect: () => void; 
}) => {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && imgRef.current && !imgRef.current.src) {
          // (perf update uwu) thumbnail if available, otherwise use main image, some scraped ones do provide thumbnails yes
          const src = image.thumbnailUrl || image.imageUrl;
          imgRef.current.src = src;
        }
      },
      { rootMargin: '100px' }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [image]);

  return (
    <div
      className="group relative bg-gray-950/70 rounded-xl overflow-hidden border border-gray-900/50 hover:border-blue-500/30 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-xl hover:shadow-blue-500/10 backdrop-blur-sm animate-fadeIn"
      onClick={onSelect}
    >
      <div className="aspect-video relative overflow-hidden bg-black/50">
        {!imgLoaded && !imgError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
          </div>
        )}
        
        <img
          ref={imgRef}
          alt={image.title ?? `Wallpaper ${image.id}`}
          className={`w-full h-full object-cover group-hover:scale-105 transition-all duration-500 ${
            imgLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          loading="lazy"
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgError(true)}
        />
        
        {imgError && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-700">
            <div className="text-center">
              <Image className="w-6 h-6 mx-auto mb-2 opacity-50" />
              <span className="text-xs">Failed to load</span>
            </div>
          </div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
          {image.type === 'video' ? (
            <div className="flex items-center gap-2 bg-emerald-500/90 px-4 py-2 rounded-full text-sm font-semibold">
              <Play className="w-4 h-4" />
              View Live2D
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-blue-500/90 px-4 py-2 rounded-full text-sm font-semibold">
              <ZoomIn className="w-4 h-4" />
              View Full Size
            </div>
          )}
        </div>
      </div>

      <div className="p-3 bg-gray-950/90 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-1.5">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
            {getSourceIcon(image.source)}
            <span>{image.source}</span>
          </span>
          {image.width && image.height && (
            <span className="text-xs text-gray-600 font-mono">
              {image.width}×{image.height}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 truncate" title={image.title}>
          {image.title || 'Untitled'}
        </p>
      </div>
    </div>
  );
};

export default function WallpaperEngine() {
  const [wallpapers, setWallpapers] = useState<WallpaperItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTags, setSearchTags] = useState('demon slayer');
  const [excludeTags, setExcludeTags] = useState('');
  const [cacheInfo, setCacheInfo] = useState({ sizeMB: '0', fileCount: 0 });
  const [currentWallpaper, setCurrentWallpaper] = useState('');
  const [settingWallpaper, setSettingWallpaper] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<WallpaperSourceOption>('all');
  const [selectedImage, setSelectedImage] = useState<WallpaperItem | null>(null);
  const [isHeaderCompact, setIsHeaderCompact] = useState(false);
  const [showExpandedHeader, setShowExpandedHeader] = useState(true);
  const lastScrollY = useRef(0);
  useEffect(() => {
    console.log('[INFO] Wallpaper Engine initialized');
    if (typeof window !== 'undefined' && (window as any).electron) {
      loadCacheInfo();
      loadCurrentWallpaper();
    }
  }, []);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          
          if (currentScrollY > 100 && currentScrollY > lastScrollY.current) {
            setIsHeaderCompact(true);
            setShowExpandedHeader(false);
          } else if (currentScrollY < lastScrollY.current || currentScrollY < 50) {
            setIsHeaderCompact(false);
            setShowExpandedHeader(true);
          }
          
          lastScrollY.current = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const loadCacheInfo = async () => {
    try {
      if (!(window as any).electron?.cache?.getSize) {
        console.warn('[WARN] Cache API not available');
        return;
      }
      
      const result = await (window as any).electron.cache.getSize();
      if (result.success) {
        setCacheInfo({ sizeMB: result.sizeMB, fileCount: result.fileCount });
        console.log(`[SUCCESS] Cache: ${result.sizeMB}MB, ${result.fileCount} files`);
      }
    } catch (error) {
      console.error('[ERROR] Cache load failed:', error);
    }
  };

  const loadCurrentWallpaper = async () => {
    try {
      if (!(window as any).electron?.wallpaper?.get) return;
      
      const result = await (window as any).electron.wallpaper.get();
      if (result.success) {
        setCurrentWallpaper(result.path);
        console.log(`[INFO] Current wallpaper: ${result.path.split('/').pop()}`);
      }
    } catch (error) {
      console.error('[ERROR] Wallpaper get failed:', error);
    }
  };

  const normalizePicReImage = (image: PicReImage): WallpaperItem => {
    const fullUrl = image.file_url.startsWith('http') ? image.file_url : `https://${image.file_url}`;
    return {
      id: `picre-${image._id}-${image.md5}`,
      source: 'picre',
      title: image.source || `Wallpaper ${image._id}`,
      imageUrl: fullUrl,
      thumbnailUrl: fullUrl,
      type: 'image',
      width: image.width,
      height: image.height,
      tags: image.tags,
      metadata: { author: image.author, hasChildren: image.has_children },
      original: image,
    };
  };

  const ensureAbsoluteUrl = (value: string) => {
    if (!value) return '';
    if (value.startsWith('data:') || value.startsWith('blob:')) return value;
    if (value.startsWith('http://') || value.startsWith('https://')) return value;
    if (value.startsWith('//')) return `https:${value}`;
    if (value.startsWith('/')) return `https://${value.replace(/^\/+/, '')}`;
    return `https://${value}`;
  };

  const normalizeExternalItem = (item: any): WallpaperItem => {
    const source = (item?.source ?? 'wallhaven') as WallpaperSourceOption;
    return {
      id: item?.id ?? `${source}-${Math.random().toString(36).slice(2, 10)}`,
      source,
      title: item?.title ?? item?.metadata?.title ?? item?.id ?? source.toUpperCase(),
      imageUrl: ensureAbsoluteUrl(item?.imageUrl ?? item?.thumbnailUrl ?? ''),
      thumbnailUrl: ensureAbsoluteUrl(item?.thumbnailUrl ?? item?.imageUrl ?? ''),
      type: item?.type === 'video' ? 'video' : 'image',
      width: item?.width,
      height: item?.height,
      tags: Array.isArray(item?.tags) ? item.tags : [],
      metadata: item?.metadata ?? {},
      original: item,
    };
  };

  const fetchWallpapers = async () => {
    setLoading(true);
    setWallpapers([]);
    
    try {
      const includeTags = searchTags.split(' ').filter(t => t.trim());
      const excludeTagsArray = excludeTags.split(' ').filter(t => t.trim());
      const queryString = includeTags.join(' ');

      if (selectedSource === 'picre' || !(window as any).electron?.animeWallpaper) {
        console.log(`[INFO] Fetching from pic.re: [${includeTags.join(', ')}]`);
        const params: Record<string, string> = { compress: 'false' };
        if (includeTags.length > 0) params.in = includeTags.join(',');
        if (excludeTagsArray.length > 0) params.of = excludeTagsArray.join(',');

        const promises = Array(DEFAULT_FETCH_COUNT).fill(null).map(() => 
          fetch(`${API_BASE_URL}/image?${new URLSearchParams(params)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'User-Agent': 'WallpaperApp/1.0' }
          }).then(res => res.json())
        );

        const results = await Promise.allSettled(promises);
        const images = results
          .filter((r): r is PromiseFulfilledResult<PicReImage> => r.status === 'fulfilled' && r.value)
          .map(r => r.value);
        if (images.length === 0) {
          console.warn('[WARN] No images found');
          alert('No images found. Try different tags.');
        } else {
          setWallpapers(images.map(normalizePicReImage));
          console.log(`[SUCCESS] Loaded ${images.length} wallpapers`);
        }
        return;
      }
      console.log(`[INFO] Fetching from ${selectedSource}: "${queryString}"`);
      const searchOptions: Record<string, unknown> = {
        query: queryString || undefined,
        excludeTags: excludeTagsArray,
        limitPerSource: DEFAULT_FETCH_COUNT,
        randomize: true,
        page: 1,
        type: 'sfw',
        aiArt: false,
      };

      if (selectedSource !== 'all') {
        searchOptions.sources = [selectedSource];
      }
      const response = await (window as any).electron.animeWallpaper.search(searchOptions);
      if (!response?.items || response.items.length === 0) {
        console.warn('[WARN] No items returned');
        alert('No wallpapers found. Try different filters.');
        return;
      }

      const normalized = (response.items as any[]).map(normalizeExternalItem).filter(item => item.imageUrl);
      if (normalized.length === 0) {
        console.warn('[WARN] No usable image URLs');
        alert('No usable images found.');
        return;
      }

      setWallpapers(normalized);
      console.log(`[SUCCESS] Loaded ${normalized.length} wallpapers from ${selectedSource}`);
    } catch (error) {
      console.error('[ERROR] Fetch failed:', error);
      alert('Error fetching wallpapers: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const setAsWallpaper = async (image: WallpaperItem) => {
    if (!(window as any).electron) {
      console.warn('[WARN] Electron API not available');
      window.open(image.imageUrl, '_blank');
      return;
    }

    if (image.type === 'video') {
      console.log('[INFO] Opening Live2D video');
      const videoUrl = (image.metadata as Record<string, string> | undefined)?.videoUrl as string | undefined;
      window.open(videoUrl ?? image.imageUrl, '_blank');
      return;
    }

    setSettingWallpaper(image.id);
    
    try {
      console.log(`[INFO] Downloading ${image.id}...`);
      
      const downloadOptions: Record<string, unknown> = {
        filename: `wallpaper-${image.id.replace(/[^a-z0-9-_]/gi, '_')}.${image.imageUrl.split('.').pop()?.split('?')[0] || 'jpg'}`,
      };

      if (image.source === 'wallpaperflare') {
        const metadata = (image.metadata ?? {}) as Record<string, unknown>;
        downloadOptions.referer = (metadata.resolvedFrom as string) ?? 'https://www.wallpaperflare.com/';
        downloadOptions.convertToPng = true;
      }

      const downloadResult = await (window as any).electron.cache.downloadImage(image.imageUrl, downloadOptions);
      
      if (!downloadResult.success) {
        console.error('[ERROR] Download failed:', downloadResult.error);
        alert('Failed to download: ' + downloadResult.error);
        return;
      }

      console.log('[SUCCESS] Downloaded');
      
      const setResult = await (window as any).electron.wallpaper.set(downloadResult.path);
      
      if (setResult.success) {
        setCurrentWallpaper(downloadResult.path);
        console.log('[SUCCESS] Wallpaper set! 🎨');
        setSelectedImage(null);
        await loadCacheInfo();
      } else {
        console.error('[ERROR] Set wallpaper failed:', setResult.error);
        alert('Failed to set wallpaper: ' + setResult.error);
      }
    } catch (error) {
      console.error('[ERROR]', error);
      alert('Error: ' + error);
    } finally {
      setSettingWallpaper(null);
    }
  };

  const clearCache = async () => {
    if (!confirm('Clear all cached wallpapers?')) return;
    
    try {
      const result = await (window as any).electron.cache.clear();
      if (result.success) {
        console.log(`[SUCCESS] Cleared ${result.filesDeleted} files`);
        alert(`Cache cleared: ${result.filesDeleted} files deleted`);
        await loadCacheInfo();
      }
    } catch (error) {
      console.error('[ERROR] Clear cache failed:', error);
      alert('Failed to clear cache: ' + error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-gray-100 relative">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out forwards;
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
        .animate-float {
          animation: float 2s ease-in-out infinite;
        }
        @keyframes ping-slow {
          75%, 100% {
            transform: scale(2);
            opacity: 0;
          }
        }
        .animate-ping-slow {
          animation: ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* modal to look at the image in zoom before setting ig */}
      {selectedImage && (
        <ImageModal
          image={selectedImage}
          onClose={() => setSelectedImage(null)}
          onSetWallpaper={() => setAsWallpaper(selectedImage)}
          isLoading={settingWallpaper === selectedImage.id}
        />
      )}

      {/* comp header bar */}
      <div 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-out ${
          isHeaderCompact 
            ? 'translate-y-0 opacity-100' 
            : '-translate-y-full opacity-0'
        }`}
      >
        <div className="bg-gray-950/95 backdrop-blur-xl border-b border-gray-800/50 shadow-2xl">
          <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between">
            <button
              onClick={() => {
                setIsHeaderCompact(false);
                setShowExpandedHeader(true);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
            >
              <LaxentaLogo />
              <span className="text-base font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                ColorWall
              </span>
            </button>
            
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-2 bg-gray-900/50 px-3 py-1.5 rounded-lg border border-gray-800/50">
                <HardDrive className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-xs font-semibold text-gray-400">{cacheInfo.sizeMB} MB</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div 
        className={`bg-gray-950/95 backdrop-blur-xl border-b border-gray-800/50 sticky top-0 z-40 shadow-2xl transition-all duration-500 ease-out ${
          showExpandedHeader ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 py-4 relative z-10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <LaxentaLogo />
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                  ColorWall
                </h1>
                <p className="text-xs text-gray-600">
                  by Laxenta Inc
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-2 bg-gray-900/50 backdrop-blur-sm px-3 py-2 rounded-lg border border-gray-800/50">
                <HardDrive className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-semibold text-gray-400">{cacheInfo.sizeMB} MB</span>
                <span className="text-xs text-gray-600">({cacheInfo.fileCount})</span>
              </div>
              <button
                onClick={clearCache}
                className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-2 rounded-lg transition-all border border-red-500/20 hover:border-red-500/40 text-sm font-medium"
              >
                <Trash2 className="w-4 h-4" />
                Clear
              </button>
            </div>
          </div>

          {/* Source Tabs */}
          <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-2 scrollbar-hide">
            {SOURCE_OPTIONS.map((source) => (
              <button
                key={source.value}
                onClick={() => setSelectedSource(source.value)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold text-sm transition-all whitespace-nowrap ${
                  selectedSource === source.value
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30'
                    : 'bg-gray-900/50 text-gray-500 hover:bg-gray-900 hover:text-gray-400 border border-gray-800/50'
                }`}
              >
                {getSourceIcon(source.value)}
                <span>{source.label}</span>
              </button>
            ))}
          </div>

          {/* search bar */}
          <div className="space-y-2.5">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-600" />
              <input
                type="text"
                value={searchTags}
                onChange={(e) => setSearchTags(e.target.value.slice(0, MAX_INPUT_LENGTH))}
                onKeyPress={(e) => e.key === 'Enter' && fetchWallpapers()}
                placeholder="anime..."
                maxLength={MAX_INPUT_LENGTH}
                className="w-full bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-lg pl-11 pr-4 py-3 text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all text-sm"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-700 font-mono">
                {searchTags.length}/{MAX_INPUT_LENGTH}
              </span>
            </div>
            
            <div className="flex gap-2.5">
              <input
                type="text"
                value={excludeTags}
                onChange={(e) => setExcludeTags(e.target.value.slice(0, MAX_INPUT_LENGTH))}
                onKeyPress={(e) => e.key === 'Enter' && fetchWallpapers()}
                placeholder="Exclude tags (optional)"
                maxLength={MAX_INPUT_LENGTH}
                className="flex-1 bg-gray-900/30 border border-gray-800/50 rounded-lg px-3.5 py-2.5 text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500/50 text-sm"
              />
              <button
                onClick={fetchWallpapers}
                disabled={loading}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2.5 rounded-lg font-bold transition-all flex items-center gap-2 shadow-lg shadow-blue-500/30 text-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4.5 h-4.5 animate-spin" />
                    a moment please...
                  </>
                ) : (
                  <>
                    <Search className="w-4.5 h-4.5" />
                    Search?
                  </>
                )}
              </button>
            </div>
          </div>

          {currentWallpaper && (
            <div className="mt-2.5 flex items-center gap-2 text-xs text-gray-600">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              Active: <span className="text-gray-500 font-medium">{currentWallpaper.split('/').pop()}</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6 relative z-10">
        {wallpapers.length === 0 && !loading && (
          <div className="text-center py-24 animate-fadeIn">
            <div className="inline-block p-5 bg-gray-900/30 backdrop-blur-sm rounded-2xl mb-4 border border-gray-800/50">
              <Image className="w-16 h-16 text-gray-700" />
            </div>
            <h2 className="text-xl font-bold text-gray-400 mb-2">Search for wallpapers</h2>
            <p className="text-gray-600 text-sm">Try: anime, landscape, rain, furina?, ganyu?</p>
          </div>
        )}

        {loading && (
          <div className="text-center py-24 animate-fadeIn">
            <Loader2 className="w-14 h-14 mx-auto text-blue-500 animate-spin mb-4" strokeWidth={1.5} />
            <p className="text-lg font-semibold text-gray-500">Fetching wallpapers...</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {wallpapers.map((image) => (
            <ImageCard
              key={image.id}
              image={image}
              onSelect={() => setSelectedImage(image)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
