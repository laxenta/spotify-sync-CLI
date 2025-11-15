'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Search, Download, Trash2, HardDrive, Loader2, CheckCircle, Image, Play } from 'lucide-react';

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

// SVG Icons
const GlobeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);

const PaletteIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <circle cx="8" cy="10" r="1" fill="currentColor"/>
    <circle cx="12" cy="8" r="1" fill="currentColor"/>
    <circle cx="16" cy="10" r="1" fill="currentColor"/>
    <circle cx="14" cy="14" r="1" fill="currentColor"/>
    <path d="M12 22c1.5-2 3-3.5 3-6a3 3 0 0 0-6 0c0 2.5 1.5 4 3 6z"/>
  </svg>
);

const StarIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);

const CameraIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
);

const SparklesIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4"/>
  </svg>
);

const FlameIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
  </svg>
);

const BoltIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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

// Animated Laxenta Logo
const LaxentaLogo = () => (
  <svg width="32" height="32" viewBox="0 0 40 40" className="animate-pulse-slow">
    <defs>
      <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#06b6d4" />
        <stop offset="100%" stopColor="#0891b2" />
      </linearGradient>
    </defs>
    <circle cx="20" cy="20" r="18" fill="url(#logoGradient)" opacity="0.2"/>
    <path d="M12 12 L28 20 L12 28 Z" fill="url(#logoGradient)" className="animate-float"/>
    <circle cx="20" cy="20" r="3" fill="#06b6d4" className="animate-ping-slow"/>
  </svg>
);

// Particle Background Component
const ParticleBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: Array<{x: number, y: number, vx: number, vy: number, size: number}> = [];
    const particleCount = 50;

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2 + 1
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.fillStyle = 'rgba(6, 182, 212, 0.3)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />;
};

const ImageCard = ({ image, onSelect, isLoading }: { 
  image: WallpaperItem; 
  onSelect: () => void; 
  isLoading: boolean;
}) => {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && imgRef.current && !imgRef.current.src) {
          imgRef.current.src = image.thumbnailUrl || image.imageUrl;
        }
      },
      { rootMargin: '50px' }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [image]);

  return (
    <div
      className="group relative bg-gray-950/50 rounded-2xl overflow-hidden border border-gray-900/50 hover:border-cyan-500/50 transition-all duration-300 cursor-pointer shadow-xl hover:shadow-2xl hover:shadow-cyan-500/20 backdrop-blur-sm animate-fadeIn"
      onClick={onSelect}
    >
      <div className="aspect-[21/9] relative overflow-hidden bg-black">
        {!imgLoaded && !imgError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
          </div>
        )}
        
        <img
          ref={imgRef}
          alt={image.title ?? `Wallpaper ${image.id}`}
          className={`w-full h-full object-cover group-hover:scale-210 transition-all duration-700 ${
            imgLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          loading="lazy"
          onLoad={() => setImgLoaded(true)}
          onError={(e) => {
            setImgError(true);
            console.error(`img load failed bc of network issues ${image.id}`);
          }}
        />
        
        {imgError && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-700">
            <div className="text-center">
              <Image className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <span className="text-xs">Load failed</span>
            </div>
          </div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end justify-center pb-6">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm bg-gray-950/90 backdrop-blur-md px-6 py-3 rounded-full border border-gray-800">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              <span className="text-gray-300">Setting...</span>
            </div>
          ) : image.type === 'video' ? (
            <div className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 rounded-full text-sm font-semibold shadow-xl shadow-emerald-500/50">
              <Play className="w-4 h-4" />
              Open Live2D
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-teal-500 px-6 py-3 rounded-full text-sm font-semibold shadow-xl shadow-cyan-500/50">
              <Download className="w-4 h-4" />
              Set Wallpaper
            </div>
          )}
        </div>
      </div>

      <div className="p-4 bg-gray-950/80 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-lg">
            {getSourceIcon(image.source)}
            <span>{image.source}</span>
          </span>
          {image.width && image.height && (
            <span className="text-xs text-gray-600 font-mono">
              {image.width}×{image.height}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-400 truncate font-medium" title={image.title}>
          {image.title || 'Untitled'}
        </p>
      </div>
    </div>
  );
};

export default function WallpaperEngine() {
  const [wallpapers, setWallpapers] = useState<WallpaperItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTags, setSearchTags] = useState('anime landscape');
  const [excludeTags, setExcludeTags] = useState('');
  const [cacheInfo, setCacheInfo] = useState({ sizeMB: '0', fileCount: 0 });
  const [currentWallpaper, setCurrentWallpaper] = useState('');
  const [settingWallpaper, setSettingWallpaper] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<WallpaperSourceOption>('all');
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
    <div className="min-h-screen bg-black text-gray-100 relative overflow-x-hidden">
      <ParticleBackground />
      
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
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
          50% { transform: translateY(-5px); }
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

      {/* Compact Header Bar */}
      <div 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-out ${
          isHeaderCompact 
            ? 'translate-y-0 opacity-100' 
            : '-translate-y-full opacity-0'
        }`}
      >
        <div className="bg-black/95 backdrop-blur-2xl border-b border-gray-900/50 shadow-2xl">
          <div className="max-w-[1400px] mx-auto px-6 py-3 flex items-center justify-between">
            <button
              onClick={() => {
                setIsHeaderCompact(false);
                setShowExpandedHeader(true);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <LaxentaLogo />
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">
                  ColorWall
                </span>
                <span className="text-xs text-gray-600">by Laxenta Inc</span>
              </div>
            </button>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-gray-900/50 px-3 py-1.5 rounded-lg border border-gray-800/50">
                <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-xs font-semibold text-gray-400">{cacheInfo.sizeMB} MB</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div 
        className={`bg-black/95 backdrop-blur-2xl border-b border-gray-900/50 sticky top-0 z-40 shadow-2xl transition-all duration-500 ease-out ${
          showExpandedHeader ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
        }`}
      >
        <div className="max-w-[1400px] mx-auto px-6 py-5 relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <LaxentaLogo />
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">
                  ColorWall
                </h1>
                <p className="text-xs text-gray-600">
                  by Laxenta Inc • <a href="https://laxenta.tech" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400 transition-colors">Contact</a>
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2.5 bg-gray-900/50 backdrop-blur-sm px-4 py-2.5 rounded-xl border border-gray-800/50">
                <HardDrive className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-semibold text-gray-400">{cacheInfo.sizeMB} MB</span>
                <span className="text-xs text-gray-600">({cacheInfo.fileCount})</span>
              </div>
              <button
                onClick={clearCache}
                className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 px-4 py-2.5 rounded-xl transition-all border border-red-500/20 hover:border-red-500/40 font-medium"
              >
                <Trash2 className="w-4 h-4" />
                Clear
              </button>
            </div>
          </div>

          <div className="mb-3 text-xs text-gray-600 leading-relaxed">
            ⚠️ Note: Scraped wallpapers may not be high quality. Quality improvements coming in future versions. 
            <a href="https://github.com/shelleyloosespatience/ColorWall" target="_blank" rel="noopener noreferrer" className="text-cyan-500 hover:text-cyan-400 transition-colors ml-1">
              Contribute on GitHub
            </a>
          </div>

          {/* Source Tabs */}
          <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
            {SOURCE_OPTIONS.map((source) => (
              <button
                key={source.value}
                onClick={() => setSelectedSource(source.value)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${
                  selectedSource === source.value
                    ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-lg shadow-cyan-500/50'
                    : 'bg-gray-900/50 text-gray-500 hover:bg-gray-900 hover:text-gray-400 border border-gray-800/50'
                }`}
              >
                <span className="text-base">{getSourceIcon(source.value)}</span>
                <span>{source.label}</span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600" />
              <input
                type="text"
                value={searchTags}
                onChange={(e) => setSearchTags(e.target.value.slice(0, MAX_INPUT_LENGTH))}
                onKeyPress={(e) => e.key === 'Enter' && fetchWallpapers()}
                placeholder="anime landscape scenery..."
                maxLength={MAX_INPUT_LENGTH}
                className="w-full bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl pl-12 pr-4 py-3.5 text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all font-medium"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-700 font-mono">
                {searchTags.length}/{MAX_INPUT_LENGTH}
              </span>
            </div>
            
            <div className="flex gap-3">
              <input
                type="text"
                value={excludeTags}
                onChange={(e) => setExcludeTags(e.target.value.slice(0, MAX_INPUT_LENGTH))}
                onKeyPress={(e) => e.key === 'Enter' && fetchWallpapers()}
                placeholder="Exclude tags (optional)"
                maxLength={MAX_INPUT_LENGTH}
                className="flex-1 bg-gray-900/30 border border-gray-800/50 rounded-xl px-4 py-2.5 text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500/50 text-sm"
              />
              <button
                onClick={fetchWallpapers}
                disabled={loading}
                className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed px-8 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 shadow-xl shadow-cyan-500/30"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    Search
                  </>
                )}
              </button>
            </div>
          </div>

          {currentWallpaper && (
            <div className="mt-3 flex items-center gap-2 text-xs text-gray-600">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              Active: <span className="text-gray-500 font-medium">{currentWallpaper.split('/').pop()}</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1400px] mx-auto px-6 py-8 relative z-10">
        {wallpapers.length === 0 && !loading && (
          <div className="text-center py-32 animate-fadeIn">
            <div className="inline-block p-6 bg-gray-900/30 backdrop-blur-sm rounded-3xl mb-6 border border-gray-800/50">
              <Image className="w-20 h-20 text-gray-700" />
            </div>
            <h2 className="text-2xl font-bold text-gray-400 mb-2">Search for wallpapers</h2>
            <p className="text-gray-600">Try: anime, landscape, scenery, nature, 1girl</p>
          </div>
        )}

        {loading && (
          <div className="text-center py-32 animate-fadeIn">
            <Loader2 className="w-16 h-16 mx-auto text-cyan-500 animate-spin mb-6" strokeWidth={1.5} />
            <p className="text-xl font-semibold text-gray-500">Fetching wallpapers...</p>
          </div>
        )}

        {/* <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"> */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {wallpapers.map((image) => (
            <ImageCard
              key={image.id}
              image={image}
              onSelect={() => setAsWallpaper(image)}
              isLoading={settingWallpaper === image.id}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
