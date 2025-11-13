'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { Search, Download, Trash2, HardDrive, Loader2, AlertCircle, CheckCircle, Terminal, X, Image, Play } from 'lucide-react';

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

interface DebugLog {
  time: string;
  type: 'info' | 'success' | 'error' | 'warn';
  message: string;
}

const API_BASE_URL = 'https://pic.re';
const DEFAULT_FETCH_COUNT = 20;

const SOURCE_OPTIONS: { value: WallpaperSourceOption; label: string; description: string }[] = [
  { value: 'all', label: 'All Sources', description: 'Mix of Wallhaven, Zerochan, Wallpapers.com, Moewalls, WallpaperFlare' },
  { value: 'wallhaven', label: 'Wallhaven', description: 'High quality community wallpapers' },
  { value: 'zerochan', label: 'Zerochan', description: 'Curated anime fan art' },
  { value: 'wallpapers', label: 'Wallpapers.com', description: 'Editorial collections' },
  { value: 'moewalls', label: 'Moewalls Live2D', description: 'Animated Live2D previews (opens video)' },
  { value: 'wallpaperflare', label: 'WallpaperFlare', description: 'Straightforward HD downloads' },
  { value: 'picre', label: 'pic.re API', description: 'Original JSON API (fast, tag-based)' },
];

export default function WallpaperEngine() {
  const [wallpapers, setWallpapers] = useState<WallpaperItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTags, setSearchTags] = useState('anime landscape');
  const [excludeTags, setExcludeTags] = useState('');
  const [cacheInfo, setCacheInfo] = useState({ sizeMB: '0', fileCount: 0 });
  const [currentWallpaper, setCurrentWallpaper] = useState('');
  const [settingWallpaper, setSettingWallpaper] = useState<string | null>(null);
  const [debugLogs, setDebugLogs] = useState<DebugLog[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  const [selectedSource, setSelectedSource] = useState<WallpaperSourceOption>('all');
  const selectedSourceMeta = useMemo(
    () => SOURCE_OPTIONS.find((option) => option.value === selectedSource),
    [selectedSource]
  );

  const addLog = (type: 'info' | 'success' | 'error' | 'warn', message: string) => {
    const time = new Date().toLocaleTimeString();
    setDebugLogs(prev => [...prev, { time, type, message }].slice(-50));
    console.log(`[${type.toUpperCase()}] ${message}`);
  };

  useEffect(() => {
    addLog('info', 'Wallpaper Engine initialized');
    if (typeof window !== 'undefined' && (window as any).electron) {
      loadCacheInfo();
      loadCurrentWallpaper();
    }
  }, []);

  const loadCacheInfo = async () => {
    try {
      if (!(window as any).electron?.cache?.getSize) {
        addLog('warn', 'Cache API not available (running in browser mode)');
        return;
      }
      
      const result = await (window as any).electron.cache.getSize();
      if (result.success) {
        setCacheInfo({
          sizeMB: result.sizeMB,
          fileCount: result.fileCount
        });
        addLog('success', `Cache: ${result.sizeMB}MB, ${result.fileCount} files`);
      }
    } catch (error) {
      addLog('error', `Cache load failed: ${error}`);
    }
  };

  const loadCurrentWallpaper = async () => {
    try {
      if (!(window as any).electron?.wallpaper?.get) {
        return;
      }
      
      const result = await (window as any).electron.wallpaper.get();
      if (result.success) {
        setCurrentWallpaper(result.path);
        addLog('info', `Current wallpaper: ${result.path.split('/').pop()}`);
      }
    } catch (error) {
      addLog('error', `Wallpaper get failed: ${error}`);
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
      metadata: {
        author: image.author,
        hasChildren: image.has_children,
      },
      original: image,
    };
  };

  const fallbackId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

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
    const imageUrl: string = ensureAbsoluteUrl(item?.imageUrl ?? item?.thumbnailUrl ?? '');
    const thumbnailUrl: string = ensureAbsoluteUrl(item?.thumbnailUrl ?? item?.imageUrl ?? '');

    return {
      id: item?.id ?? fallbackId(source),
      source,
      title: item?.title ?? item?.metadata?.title ?? item?.id ?? source.toUpperCase(),
      imageUrl,
      thumbnailUrl,
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
        addLog('info', `Fetching from pic.re API with tags: [${includeTags.join(', ')}]`);
        if (excludeTagsArray.length > 0) {
          addLog('info', `Excluding tags: [${excludeTagsArray.join(', ')}]`);
        }

        const params: Record<string, string> = { compress: 'false' };
        if (includeTags.length > 0) params.in = includeTags.join(',');
        if (excludeTagsArray.length > 0) params.of = excludeTagsArray.join(',');

        const promises = Array(DEFAULT_FETCH_COUNT).fill(null).map(() => 
          fetch(`${API_BASE_URL}/image?${new URLSearchParams(params)}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'AnimeWallpaperApp/1.0'
            }
          }).then(res => res.json())
        );

        const results = await Promise.allSettled(promises);
        const images = results
          .filter((r): r is PromiseFulfilledResult<PicReImage> => r.status === 'fulfilled' && r.value)
          .map(r => r.value);

        if (images.length === 0) {
          addLog('warn', 'No images found. Try different tags.');
          alert('No images found matching your criteria');
        } else {
          const normalized = images.map(normalizePicReImage);
          setWallpapers(normalized);
          addLog('success', `Loaded ${images.length} wallpapers from pic.re`);
        }
        return;
      }

      addLog('info', `Fetching from ${selectedSource === 'all' ? 'all sources' : selectedSource} with query: "${queryString || 'random'}"`);      
      if (excludeTagsArray.length > 0) {
        addLog('info', `Exclude filters: [${excludeTagsArray.join(', ')}]`);
      }

      if (!queryString && ['wallhaven', 'zerochan', 'wallpapers'].includes(selectedSource)) {
        addLog('warn', 'This source requires a search query. Please enter keywords to continue.');
        alert('Please enter a search query for this source.');
        return;
      }

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
        const errors: string[] = response?.errors ?? [];
        const errorMsg = errors.length > 0 ? errors.join('; ') : 'No items returned from scraper.';
        addLog('warn', errorMsg);
        alert(errorMsg);
        return;
      }

      const normalized = (response.items as any[]).map(normalizeExternalItem).filter(item => item.imageUrl);
      if (normalized.length === 0) {
        addLog('warn', 'Sources returned results but no usable image URLs were found.');
        alert('No usable images returned. Try different filters.');
        return;
      }

      setWallpapers(normalized);
      addLog('success', `Loaded ${normalized.length} wallpapers from ${selectedSource === 'all' ? 'multi-source bundle' : selectedSource}`);

      if (response.errors && response.errors.length > 0) {
        response.errors.forEach((err: string) => addLog('warn', `Source warning: ${err}`));
      }
    } catch (error) {
      addLog('error', `Fetch failed: ${error}`);
      alert('Error fetching wallpapers: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const extractExtension = (url: string) => {
    try {
      const cleanUrl = url.split('?')[0];
      const ext = cleanUrl.split('.').pop() ?? 'jpg';
      if (ext.length > 5) return 'jpg';
      return ext || 'jpg';
    } catch {
      return 'jpg';
    }
  };

  const sanitizeFileName = (value: string) =>
    value.replace(/[^a-z0-9-_]/gi, '_').replace(/_+/g, '_').slice(0, 48);

  const setAsWallpaper = async (image: WallpaperItem) => {
    if (!(window as any).electron) {
      addLog('warn', 'Electron API not available - opening image in new tab');
      window.open(image.imageUrl, '_blank');
      return;
    }

    if (image.type === 'video') {
      addLog('warn', 'Live2D wallpaper detected. Opening preview video instead of setting static wallpaper.');
      const videoUrl = (image.metadata as Record<string, string> | undefined)?.videoUrl as string | undefined;
      window.open(videoUrl ?? image.imageUrl, '_blank');
      return;
    }

    setSettingWallpaper(image.id);
    
    try {
      addLog('info', `Downloading image ${image.id} (${image.source})...`);
      
      const downloadOptions: Record<string, unknown> = {
        filename: `wallpaper-${sanitizeFileName(image.id)}.${extractExtension(image.imageUrl)}`,
      };

      if (image.source === 'wallpaperflare') {
        const metadata = (image.metadata ?? {}) as Record<string, unknown>;
        const referer =
          (metadata.resolvedFrom as string | undefined) ??
          (metadata.detailUrl as string | undefined) ??
          'https://www.wallpaperflare.com/';
        downloadOptions.referer = referer;
        downloadOptions.convertToPng = true;
      }

      const downloadResult = await (window as any).electron.cache.downloadImage(
        image.imageUrl,
        downloadOptions
      );
      
      if (!downloadResult.success) {
        addLog('error', `Download failed: ${downloadResult.error}`);
        alert('Failed to download image: ' + downloadResult.error);
        return;
      }

      addLog('success', `Downloaded: ${downloadResult.path.split('/').pop()}`);
      
      const setResult = await (window as any).electron.wallpaper.set(downloadResult.path);
      
      if (setResult.success) {
        setCurrentWallpaper(downloadResult.path);
        addLog('success', 'Wallpaper set successfully! 🎨');
        await loadCacheInfo();
      } else {
        addLog('error', `Set wallpaper failed: ${setResult.error}`);
        alert('Failed to set wallpaper: ' + setResult.error);
      }
    } catch (error) {
      addLog('error', `Error: ${error}`);
      alert('Error setting wallpaper: ' + error);
    } finally {
      setSettingWallpaper(null);
    }
  };

  const clearCache = async () => {
    if (!confirm('Clear all cached wallpapers?')) return;
    
    try {
      addLog('info', 'Clearing cache...');
      const result = await (window as any).electron.cache.clear();
      
      if (result.success) {
        addLog('success', `Cleared ${result.filesDeleted} files`);
        alert(`Cache cleared: ${result.filesDeleted} files deleted`);
        await loadCacheInfo();
      }
    } catch (error) {
      addLog('error', `Clear cache failed: ${error}`);
      alert('Failed to clear cache: ' + error);
    }
  };

  const getLogIcon = (type: string) => {
    switch(type) {
      case 'success': return <CheckCircle className="w-3 h-3 text-emerald-400" />;
      case 'error': return <AlertCircle className="w-3 h-3 text-red-400" />;
      case 'warn': return <AlertCircle className="w-3 h-3 text-yellow-400" />;
      default: return <div className="w-3 h-3 rounded-full bg-blue-400" />;
    }
  };

  const getLogColor = (type: string) => {
    switch(type) {
      case 'success': return 'text-emerald-300';
      case 'error': return 'text-red-300';
      case 'warn': return 'text-yellow-300';
      default: return 'text-slate-300';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="bg-slate-900/95 backdrop-blur-xl border-b border-slate-800 sticky top-0 z-10 shadow-2xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-lg">
                <Image className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-100">
                  Wallpaper Engine
                </h1>
                <p className="text-xs text-slate-500">
                  {selectedSourceMeta?.label ?? 'Wallpaper Sources'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-2 rounded-lg border border-slate-700">
                <HardDrive className="w-4 h-4 text-slate-400" />
                <span className="text-slate-300">{cacheInfo.sizeMB} MB</span>
                <span className="text-slate-500">({cacheInfo.fileCount})</span>
              </div>
              <button
                onClick={clearCache}
                className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-2 rounded-lg transition-all border border-red-500/20 hover:border-red-500/30"
              >
                <Trash2 className="w-4 h-4" />
                Clear
              </button>
              <button
                onClick={() => setShowDebug(!showDebug)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all border ${
                  showDebug 
                    ? 'bg-violet-500/20 text-violet-300 border-violet-500/30' 
                    : 'bg-slate-800/50 text-slate-400 border-slate-700 hover:bg-slate-800'
                }`}
              >
                <Terminal className="w-4 h-4" />
                Debug
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mt-4 space-y-3">
            <div className="flex gap-3 flex-wrap md:flex-nowrap">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="text"
                  value={searchTags}
                  onChange={(e) => setSearchTags(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && fetchWallpapers()}
                  placeholder="Include tags (e.g., anime landscape scenery)"
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg pl-11 pr-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                />
              </div>
              <div className="w-full md:w-60">
                <label className="sr-only" htmlFor="wallpaper-source">Wallpaper source</label>
                <div className="relative">
                  <select
                    id="wallpaper-source"
                    value={selectedSource}
                    onChange={(e) => setSelectedSource(e.target.value as WallpaperSourceOption)}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all appearance-none"
                    title={selectedSourceMeta?.description}
                  >
                    {SOURCE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-xs uppercase">
                    Src
                  </span>
                </div>
                {selectedSourceMeta?.description && (
                  <p className="mt-1 text-[11px] text-slate-500">
                    {selectedSourceMeta.description}
                  </p>
                )}
              </div>
              <button
                onClick={fetchWallpapers}
                disabled={loading}
                className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50 disabled:cursor-not-allowed px-8 py-3 rounded-lg font-medium transition-all flex items-center gap-2 shadow-lg shadow-violet-500/25"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    Search
                  </>
                )}
              </button>
            </div>
            
            <div className="relative">
              <X className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                value={excludeTags}
                onChange={(e) => setExcludeTags(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && fetchWallpapers()}
                placeholder="Exclude tags (optional)"
                className="w-full bg-slate-800/30 border border-slate-700/50 rounded-lg pl-11 pr-4 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all text-sm"
              />
            </div>
          </div>

          {currentWallpaper && (
            <div className="mt-3 text-xs text-slate-500 flex items-center gap-2">
              <CheckCircle className="w-3 h-3 text-emerald-500" />
              Active: {currentWallpaper.split('/').pop()}
            </div>
          )}
        </div>
      </div>

      {/* Debug Console */}
      {showDebug && (
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-slate-800/50 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-violet-400" />
                <h3 className="text-sm font-semibold text-slate-200">Debug Console</h3>
                <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
                  {debugLogs.length} logs
                </span>
              </div>
              <button
                onClick={() => setDebugLogs([])}
                className="text-xs text-slate-400 hover:text-slate-300 transition-colors"
              >
                Clear
              </button>
            </div>
            <div className="p-4 max-h-64 overflow-y-auto font-mono text-xs space-y-1.5 bg-slate-950/50">
              {debugLogs.length === 0 ? (
                <div className="text-slate-600 italic">No logs yet...</div>
              ) : (
                debugLogs.map((log, i) => (
                  <div key={i} className="flex items-start gap-2 hover:bg-slate-800/30 px-2 py-1 rounded transition-colors">
                    <span className="text-slate-600 shrink-0">{log.time}</span>
                    <div className="shrink-0 mt-0.5">{getLogIcon(log.type)}</div>
                    <span className={`${getLogColor(log.type)} break-all`}>
                      {log.message}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {wallpapers.length === 0 && !loading && (
          <div className="text-center py-20">
            <div className="inline-block p-4 bg-slate-800/50 rounded-2xl mb-4">
              <Image className="w-16 h-16 text-slate-600" />
            </div>
            <p className="text-slate-400 text-lg font-medium mb-2">
              Search for anime wallpapers
            </p>
            <p className="text-slate-600 text-sm">
              Try: anime, landscape, scenery, nature, 1girl
            </p>
          </div>
        )}

        {loading && (
          <div className="text-center py-20">
            <Loader2 className="w-16 h-16 mx-auto text-violet-500 animate-spin mb-4" />
            <p className="text-slate-400 text-lg">Fetching wallpapers...</p>
          </div>
        )}

        {/* Wallpaper Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {wallpapers.map((image) => (
            <div
              key={image.id}
              className="group relative bg-slate-900 rounded-xl overflow-hidden border border-slate-800 hover:border-violet-500/50 transition-all cursor-pointer shadow-lg hover:shadow-violet-500/20"
              onClick={() => setAsWallpaper(image)}
            >
              {/* Image */}
              <div className="aspect-video relative overflow-hidden bg-slate-950">
                <img
                  src={(image.thumbnailUrl || image.imageUrl || '').startsWith('http') ? (image.thumbnailUrl || image.imageUrl) : `https://${image.thumbnailUrl || image.imageUrl}`}
                  alt={image.title ?? `Wallpaper ${image.id}`}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  loading="lazy"
                  onError={(e) => {
                    addLog('error', `Failed to load image ${image.id}: ${image.imageUrl}`);
                    e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%230f172a" width="400" height="300"/%3E%3Ctext fill="%23475569" x="50%25" y="50%25" text-anchor="middle" dy=".3em" font-family="sans-serif"%3EImage Error%3C/text%3E%3C/svg%3E';
                  }}
                />
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                  {settingWallpaper === image.id ? (
                    <div className="flex items-center gap-2 text-sm bg-slate-900 px-4 py-2 rounded-lg">
                      <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
                      <span className="text-slate-300">Setting...</span>
                    </div>
                  ) : image.type === 'video' ? (
                    <div className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 rounded-lg text-sm font-medium shadow-lg">
                      <Play className="w-4 h-4" />
                      Open Live2D
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 rounded-lg text-sm font-medium shadow-lg">
                      <Download className="w-4 h-4" />
                      Set Wallpaper
                    </div>
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="p-3 bg-slate-900/95">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span className="font-medium uppercase tracking-wide text-violet-300 text-[11px]">
                    {image.source}
                  </span>
                  <span className="text-slate-500 truncate max-w-[120px]">
                    {image.width && image.height ? `${image.width} × ${image.height}` : image.id.replace(/^.*?-/, '')}
                  </span>
                </div>
                <div className="text-xs text-slate-300 truncate min-h-[18px]" title={image.title ?? undefined}>
                  {image.title ?? 'Untitled wallpaper'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}