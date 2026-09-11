import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import {
  Search,
  Upload,
  Layers,
  Compass,
  ArrowRight,
  Sun,
  Moon,
  Sparkles,
  Mountain,
  Globe2,
  Map as MapIcon,
  X,
  ChevronDown,
  Image as ImageIcon,
  MapPin,
  Loader2,
  FileImage,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { Globe3D, GLOBE_LOCATIONS, type GlobeMarker } from './Globe3D';
import { Map2D } from './Map2D';

// ─── Nominatim Geocoding ──────────────────────────────────────────────────────

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  class: string;
  importance: number;
  address?: {
    country?: string;
    state?: string;
    city?: string;
    town?: string;
    village?: string;
  };
}

async function geocodeSearch(query: string): Promise<NominatimResult[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=8&addressdetails=1`;
  const res = await fetch(url, {
    headers: { 'Accept-Language': 'en', 'User-Agent': 'Terra3D-SIH/1.0' },
  });
  if (!res.ok) throw new Error('Geocoding request failed');
  return res.json();
}

function formatPlaceName(result: NominatimResult): { primary: string; secondary: string } {
  const parts = result.display_name.split(', ');
  const primary = parts.slice(0, 2).join(', ');
  const secondary = parts.slice(2, 4).join(', ');
  return { primary, secondary };
}

// ─── TIF Preview Modal ────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

interface TifPreviewModalProps {
  file: File;
  darkMode: boolean;
  onConfirm: (file: File, mode: 'geo' | 'non-geo') => void;
  onCancel: () => void;
}

const TifPreviewModal: React.FC<TifPreviewModalProps> = ({ file, darkMode, onConfirm, onCancel }) => {
  const isGeo =
    file.name.toLowerCase().endsWith('.tif') ||
    file.name.toLowerCase().endsWith('.tiff') ||
    file.name.toLowerCase().endsWith('.geotiff');
  const isPng =
    file.name.toLowerCase().endsWith('.png') ||
    file.name.toLowerCase().endsWith('.jpg') ||
    file.name.toLowerCase().endsWith('.jpeg') ||
    file.name.toLowerCase().endsWith('.webp');

  const [pngPreviewUrl, setPngPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isPng) {
      const url = URL.createObjectURL(file);
      setPngPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file, isPng]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onCancel} />
      <div
        className={`relative z-10 w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${
          darkMode
            ? 'bg-neutral-950/95 border-white/10 text-neutral-100'
            : 'bg-white/97 border-neutral-200 text-neutral-900'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-5 py-4 border-b ${
            darkMode ? 'border-white/8' : 'border-neutral-100'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                darkMode ? 'bg-indigo-500/15 text-indigo-400' : 'bg-indigo-50 text-indigo-600'
              }`}
            >
              <FileImage className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold leading-tight">File Ready to Upload</div>
              <div className="text-[11px] text-neutral-400 mt-0.5">
                {isGeo ? 'GeoTIFF / Terrain Image' : 'Optical Image'}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className={`p-1.5 rounded-lg transition-colors ${
              darkMode ? 'hover:bg-white/10 text-neutral-400' : 'hover:bg-neutral-100 text-neutral-500'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Preview */}
        <div className="p-5 space-y-4">
          <div
            className={`w-full h-44 rounded-2xl overflow-hidden flex items-center justify-center border relative ${
              darkMode ? 'bg-neutral-900 border-white/8' : 'bg-neutral-50 border-neutral-200'
            }`}
          >
            {isPng && pngPreviewUrl ? (
              <img src={pngPreviewUrl} alt="Preview" className="w-full h-full object-cover" />
            ) : isGeo ? (
              <>
                <svg
                  className="absolute inset-0 w-full h-full opacity-20"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 400 176"
                  preserveAspectRatio="xMidYMid slice"
                >
                  <defs>
                    <linearGradient id="topo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="50%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                  {[20, 40, 60, 80, 100, 120, 140].map((y, i) => (
                    <path
                      key={i}
                      d={`M0,${y} Q50,${y - 15 + (i % 3) * 8} 100,${y + 10 - (i % 2) * 12} T200,${y - 8 + (i % 4) * 5} T300,${y + 12 - (i % 3) * 9} T400,${y}`}
                      fill="none"
                      stroke="url(#topo-grad)"
                      strokeWidth="1.5"
                    />
                  ))}
                </svg>
                <div className="relative z-10 flex flex-col items-center gap-2 text-center">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                      darkMode ? 'bg-indigo-500/20' : 'bg-indigo-50'
                    }`}
                  >
                    <Mountain className="w-6 h-6 text-indigo-400" />
                  </div>
                  <div className="text-xs font-semibold text-neutral-300">GeoTIFF Terrain Data</div>
                  <div className="text-[10px] text-neutral-500">3D DEM preview via Google Colab</div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Eye className="w-8 h-8 text-neutral-400" />
                <div className="text-xs text-neutral-400">No preview available</div>
              </div>
            )}
          </div>

          {/* File metadata */}
          <div
            className={`rounded-xl border p-3.5 space-y-2 text-xs ${
              darkMode ? 'bg-neutral-900/60 border-white/8' : 'bg-neutral-50 border-neutral-200'
            }`}
          >
            <div className="flex justify-between">
              <span className="text-neutral-400">Filename</span>
              <span className="font-mono font-medium truncate max-w-[55%] text-right">{file.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">File Size</span>
              <span className="font-mono font-medium">{formatBytes(file.size)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Type</span>
              <span className="font-mono font-medium">
                {isGeo ? 'GeoTIFF / DEM Elevation' : 'Optical Raster Image'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Processing</span>
              <span className={`font-medium ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                Google Colab 3D Renderer
              </span>
            </div>
          </div>

          {isGeo && (
            <div
              className={`flex items-start gap-2.5 rounded-xl p-3 text-xs border ${
                darkMode
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                GeoTIFF files are processed as elevation data. Ensure your Google Colab server is running.
              </span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2.5 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all active:scale-95 ${
                darkMode
                  ? 'bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10'
                  : 'bg-neutral-100 border-neutral-200 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onConfirm(file, isGeo ? 'geo' : 'non-geo')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 flex items-center justify-center gap-2 ${
                darkMode
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/40'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Upload &amp; Process</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface HomeScreenProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onEnterViewer: () => void;
  onFileUpload: (fileUrl: string, fileName: string) => void;
  onProcessImageFile?: (file: File, modeHint?: 'geo' | 'non-geo') => void;
  isProcessing?: boolean;
  processingStatus?: string;
  currentFileName: string;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  darkMode,
  onToggleDarkMode,
  onEnterViewer,
  onFileUpload,
  onProcessImageFile,
  isProcessing = false,
  processingStatus = '',
  currentFileName: _currentFileName,
}) => {
  const [viewMode, setViewMode] = useState<'globe' | 'map2d'>('globe');
  const [map2dZoom, setMap2dZoom] = useState<number>(9);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>('kush');
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lon: number }>({
    lat: 36.0,
    lon: 71.2,
  });
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isUploadMenuOpen, setIsUploadMenuOpen] = useState(false);

  // Geocoding state
  const [geocodeResults, setGeocodeResults] = useState<NominatimResult[]>([]);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const [navigateToCoords, setNavigateToCoords] = useState<{ lat: number; lon: number } | null>(null);
  const geocodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // TIF preview state
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const nonGeoFileInputRef = useRef<HTMLInputElement>(null);
  const geoFileInputRef = useRef<HTMLInputElement>(null);
  const uploadMenuRef = useRef<HTMLDivElement>(null);

  // Close upload popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (uploadMenuRef.current && !uploadMenuRef.current.contains(e.target as Node)) {
        setIsUploadMenuOpen(false);
      }
    };
    if (isUploadMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUploadMenuOpen]);

  // Debounced geocoding search
  useEffect(() => {
    if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current);
    const trimmed = searchQuery.trim();
    if (!trimmed || trimmed.length < 2) {
      setGeocodeResults([]);
      setGeocodeError(null);
      setIsGeocoding(false);
      return;
    }
    setIsGeocoding(true);
    setGeocodeError(null);
    geocodeTimerRef.current = setTimeout(async () => {
      try {
        const results = await geocodeSearch(trimmed);
        setGeocodeResults(results);
        setGeocodeError(null);
      } catch {
        setGeocodeError('Failed to fetch results. Check your connection.');
        setGeocodeResults([]);
      } finally {
        setIsGeocoding(false);
      }
    }, 500);
    return () => {
      if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current);
    };
  }, [searchQuery]);

  // Filtered local GLOBE_LOCATIONS
  const filteredLocalLocations = useMemo(() => {
    if (!searchQuery.trim()) return GLOBE_LOCATIONS;
    const query = searchQuery.toLowerCase().trim();
    return GLOBE_LOCATIONS.filter(
      (loc) =>
        loc.name.toLowerCase().includes(query) ||
        loc.region.toLowerCase().includes(query) ||
        loc.elev.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const handleSelectLocation = (loc: GlobeMarker) => {
    setSelectedMarkerId(loc.id);
    setCurrentCoords({ lat: loc.lat, lon: loc.lon });
    setSearchQuery(loc.name);
    setIsSearchFocused(false);
    setGeocodeResults([]);
  };

  const handleSelectGeocodeResult = useCallback((result: NominatimResult) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    const { primary } = formatPlaceName(result);
    setCurrentCoords({ lat, lon });
    setNavigateToCoords({ lat, lon });
    setSearchQuery(primary);
    setIsSearchFocused(false);
    setGeocodeResults([]);
    setSelectedMarkerId(null);
    if (viewMode === 'map2d') setMap2dZoom(12);
  }, [viewMode]);

  const handleZoomInToMap = (coords: { lat: number; lon: number; zoom: number }) => {
    setCurrentCoords({ lat: coords.lat, lon: coords.lon });
    setMap2dZoom(coords.zoom || 9);
    setViewMode('map2d');
  };

  // Show preview modal before processing
  const handleFileWithPreview = useCallback((file: File) => {
    setPendingFile(file);
    setIsUploadMenuOpen(false);
  }, []);

  const handleConfirmUpload = useCallback((file: File, mode: 'geo' | 'non-geo') => {
    setPendingFile(null);
    if (onProcessImageFile) {
      onProcessImageFile(file, mode);
    } else {
      const url = URL.createObjectURL(file);
      onFileUpload(url, file.name);
      onEnterViewer();
    }
  }, [onProcessImageFile, onFileUpload, onEnterViewer]);

  const handleNonGeoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileWithPreview(file);
    if (e.target) e.target.value = '';
  };

  const handleGeoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileWithPreview(file);
    if (e.target) e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(true);
  };

  const handleDragLeave = () => {
    setIsDraggingFile(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileWithPreview(file);
  };

  const showGeocodeResults = isSearchFocused && searchQuery.trim().length >= 2;
  const showLocalResults = isSearchFocused && searchQuery.trim().length < 2;

  return (
    <div
      id="home-screen-root"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative w-screen h-screen overflow-hidden select-none transition-colors duration-300 font-sans ${
        darkMode ? 'bg-[#09090b] text-neutral-100' : 'bg-[#f4f4f5] text-neutral-900'
      }`}
    >
      {/* Hidden file inputs for Non-Geo and Geo-Referenced Images */}
      <input
        ref={nonGeoFileInputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.webp,.bmp,.tiff,.tif,.html,.htm,.dem,.asc"
        className="hidden"
        onChange={handleNonGeoFileSelect}
      />
      <input
        ref={geoFileInputRef}
        type="file"
        accept=".tif,.tiff,.geotiff,.dem,.img,.png,.jpg,.html,.htm"
        className="hidden"
        onChange={handleGeoFileSelect}
      />

      {/* 1. Top Navigation Bar: Left Branding, Center Floating Upload Button, Right Theme Toggle */}
      <header
        id="home-top-navbar"
        className="absolute top-0 left-0 right-0 z-40 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3 pointer-events-auto"
      >
        {/* Left Branding */}
        <div className="flex items-center gap-2.5 shrink-0 z-10">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-sm border transition-colors backdrop-blur-xl ${
              darkMode
                ? 'bg-black/60 border-white/10 text-neutral-200 shadow-black/40'
                : 'bg-white/70 border-neutral-200/80 text-neutral-800'
            }`}
          >
            <Globe2 className="w-5 h-5" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-sm font-bold tracking-tight flex items-center gap-1.5">
              <span>TERRA 3D</span>
              <span
                className={`px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md border backdrop-blur-md ${
                  darkMode
                    ? 'bg-white/5 text-neutral-300 border-white/10'
                    : 'bg-black/5 text-neutral-700 border-neutral-200'
                }`}
              >
                PRO
              </span>
            </h1>
            <p className="text-[10px] text-neutral-400">Geospatial Terrain & Elevation Engine</p>
          </div>
        </div>

        {/* Centre: Floating Upload Button with Non-Geo & Geo-Referenced Options */}
        <div
          ref={uploadMenuRef}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-auto"
        >
          <div className="relative">
            <button
              id="home-floating-upload-btn"
              type="button"
              disabled={isProcessing}
              onClick={() => !isProcessing && setIsUploadMenuOpen((prev) => !prev)}
              className={`flex items-center gap-2.5 px-5 sm:px-6 py-2.5 sm:py-3 rounded-2xl border shadow-xl font-semibold text-sm sm:text-base transition-all duration-150 backdrop-blur-xl active:scale-95 ${
                isProcessing
                  ? 'bg-indigo-600/30 border-indigo-400/50 text-white cursor-wait'
                  : isUploadMenuOpen
                  ? darkMode
                    ? 'bg-neutral-900/80 border-white/20 text-white ring-2 ring-white/10 shadow-black/70'
                    : 'bg-white/90 border-neutral-400 text-neutral-900 ring-2 ring-black/5 shadow-neutral-200'
                  : darkMode
                  ? 'bg-black/60 hover:bg-neutral-900/70 border-white/10 text-neutral-200 hover:text-white shadow-black/50'
                  : 'bg-white/70 hover:bg-white/85 border-neutral-200/80 text-neutral-800 shadow-neutral-200/60'
              }`}
              title={isProcessing ? processingStatus || 'Processing with Google Colab...' : 'Upload image options'}
            >
              {isProcessing ? (
                <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin shrink-0" />
              ) : (
                <Upload className="w-5 h-5 text-neutral-400 shrink-0" />
              )}
              <span className="tracking-tight">
                {isProcessing ? 'Processing with Colab...' : 'Upload Image'}
              </span>
              {!isProcessing && (
                <ChevronDown
                  className={`w-4 h-4 text-neutral-400 transition-transform duration-200 ${
                    isUploadMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              )}
            </button>

            {/* Dropdown Options */}
            {isUploadMenuOpen && (
              <div
                id="home-upload-dropdown-menu"
                className={`absolute left-1/2 -translate-x-1/2 top-full mt-2.5 w-80 sm:w-96 rounded-2xl border shadow-2xl backdrop-blur-2xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150 ${
                  darkMode
                    ? 'bg-black/75 border-white/10 text-neutral-100 shadow-black/80'
                    : 'bg-white/85 border-neutral-200 text-neutral-900 shadow-neutral-300/60'
                }`}
              >
                <div className="space-y-1.5">
                  {/* Option 1: Non-Geo Referenced Image */}
                  <button
                    id="btn-upload-non-geo"
                    type="button"
                    onClick={() => {
                      setIsUploadMenuOpen(false);
                      nonGeoFileInputRef.current?.click();
                    }}
                    className={`w-full flex items-start gap-3.5 p-3 rounded-xl text-left transition-all duration-150 border border-transparent ${
                      darkMode
                        ? 'hover:bg-white/10 hover:border-white/10 text-neutral-200'
                        : 'hover:bg-neutral-100/90 hover:border-neutral-300 text-neutral-800'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border ${
                        darkMode
                          ? 'bg-white/5 border-white/10 text-neutral-300'
                          : 'bg-neutral-100 border-neutral-200 text-neutral-700'
                      }`}
                    >
                      <ImageIcon className="w-4.5 h-4.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold leading-tight">
                        Upload Non-Geo Referenced Image
                      </div>
                      <p className="text-xs text-neutral-400 mt-1 leading-snug">
                        Elevation map, heightmap, standard satellite photo, or raw raster
                      </p>
                    </div>
                  </button>

                  {/* Option 2: Geo-Referenced Image */}
                  <button
                    id="btn-upload-geo"
                    type="button"
                    onClick={() => {
                      setIsUploadMenuOpen(false);
                      geoFileInputRef.current?.click();
                    }}
                    className={`w-full flex items-start gap-3.5 p-3 rounded-xl text-left transition-all duration-150 border border-transparent ${
                      darkMode
                        ? 'hover:bg-white/10 hover:border-white/10 text-neutral-200'
                        : 'hover:bg-neutral-100/90 hover:border-neutral-300 text-neutral-800'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border ${
                        darkMode
                          ? 'bg-white/5 border-white/10 text-neutral-300'
                          : 'bg-neutral-100 border-neutral-200 text-neutral-700'
                      }`}
                    >
                      <Compass className="w-4.5 h-4.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold leading-tight">
                        Upload Geo-Referenced Image
                      </div>
                      <p className="text-xs text-neutral-400 mt-1 leading-snug">
                        GeoTIFF, spatial DEM, or image with embedded spatial coordinates
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Actions: View Mode Switcher & Theme Toggle */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 z-10">
          {/* Mode Switcher Segmented Pill */}
          <div
            id="view-mode-pill"
            className={`flex items-center p-1 rounded-2xl border shadow-sm backdrop-blur-xl ${
              darkMode
                ? 'bg-black/60 border-white/10 text-neutral-400'
                : 'bg-white/70 border-neutral-200/80 text-neutral-600'
            }`}
          >
            <button
              type="button"
              id="view-mode-globe-btn"
              onClick={() => setViewMode('globe')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                viewMode === 'globe'
                  ? darkMode
                    ? 'bg-white/20 text-white shadow-sm'
                    : 'bg-white text-neutral-900 shadow-sm border border-neutral-200/60'
                  : 'hover:text-white'
              }`}
              title="3D Earth Globe View"
            >
              <Globe2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">3D Globe</span>
            </button>
            <button
              type="button"
              id="view-mode-map-btn"
              onClick={() => setViewMode('map2d')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                viewMode === 'map2d'
                  ? darkMode
                    ? 'bg-white/20 text-white shadow-sm'
                    : 'bg-white text-neutral-900 shadow-sm border border-neutral-200/60'
                  : 'hover:text-white'
              }`}
              title="2D Free Map View (OpenStreetMap / Satellite)"
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">2D Map</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onToggleDarkMode}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors border shadow-sm backdrop-blur-xl ${
              darkMode
                ? 'bg-black/60 hover:bg-neutral-900/70 border-white/10 text-neutral-300 hover:text-white shadow-black/40'
                : 'bg-white/70 hover:bg-white/85 border-neutral-200/80 text-neutral-700'
            }`}
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* 2. Centre Viewport: 3D Globe or 2D Free Map */}
      <main id="home-viewport" className="w-full h-full relative">
        {viewMode === 'globe' ? (
          <Globe3D
            darkMode={darkMode}
            targetMarkerId={selectedMarkerId}
            onSelectMarker={handleSelectLocation}
            onCoordinatesChange={(lat, lon) => setCurrentCoords({ lat, lon })}
            onZoomInToMap={handleZoomInToMap}
            navigateToCoords={navigateToCoords}
          />
        ) : (
          <Map2D
            center={currentCoords}
            zoom={map2dZoom}
            darkMode={darkMode}
            targetMarkerId={selectedMarkerId}
            onSelectMarker={handleSelectLocation}
            onOpen3DModel={(_id) => onEnterViewer()}
            onReturnToGlobe={() => setViewMode('globe')}
            onCoordinatesChange={(lat, lon) => setCurrentCoords({ lat, lon })}
          />
        )}
      </main>

      {/* 3. Floating Bottom Controls: Temporary Surface App Button & Search Bar */}
      <footer
        id="home-bottom-dock"
        className="absolute bottom-7 left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex flex-col items-center gap-3 max-w-2xl w-[92vw]"
      >
        {/* Button to temporarily open the surface app */}
        <button
          id="home-temporary-surface-app-btn"
          type="button"
          onClick={onEnterViewer}
          className={`flex items-center justify-center gap-2.5 px-5 sm:px-6 py-2.5 sm:py-3 rounded-2xl text-sm sm:text-base font-semibold tracking-wide transition-all duration-150 border shadow-xl active:scale-95 backdrop-blur-xl ${
            darkMode
              ? 'bg-black/60 hover:bg-neutral-900/70 border-white/10 text-neutral-200 hover:text-white shadow-black/50'
              : 'bg-white/70 hover:bg-white/85 border-neutral-200/80 text-neutral-800 shadow-neutral-200/70'
          }`}
          title="Open 3D Surface Model & Real Satellite Image Comparison"
        >
          <Layers className="w-5 h-5 text-neutral-400 shrink-0" />
          <span>Open 3D Viewer & Side-by-Side Comparison</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono hidden sm:inline">
            3D + Real Satellite PNG
          </span>
          <ArrowRight className="w-4 h-4 text-neutral-400 shrink-0" />
        </button>

        <div id="home-search-container" className="relative w-full">
          {/* Search Dropdown (Opens Upward) */}
          {isSearchFocused && (
            <div
              id="globe-search-dropdown"
              className={`absolute left-0 right-0 bottom-full mb-3 rounded-2xl border shadow-2xl backdrop-blur-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2 duration-150 ${
                darkMode
                  ? 'bg-black/85 border-white/10 text-neutral-200'
                  : 'bg-white/90 border-neutral-200 text-neutral-800'
              }`}
            >
              <div className="max-h-80 overflow-y-auto">
                {/* ── Nominatim geocode results (real places) ── */}
                {showGeocodeResults && (
                  <>
                    <div
                      className={`sticky top-0 px-4 py-2 text-[10px] font-bold uppercase tracking-wider flex items-center justify-between ${
                        darkMode
                          ? 'bg-black/70 text-neutral-400 border-b border-white/8'
                          : 'bg-white/80 text-neutral-500 border-b border-neutral-100'
                      }`}
                    >
                      <span>Search Results</span>
                      {isGeocoding && <Loader2 className="w-3 h-3 animate-spin text-neutral-400" />}
                    </div>

                    {isGeocoding && geocodeResults.length === 0 ? (
                      <div className="flex items-center justify-center gap-2 py-6 text-xs text-neutral-400">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Searching places...</span>
                      </div>
                    ) : geocodeError ? (
                      <div className="px-4 py-4 text-xs text-center text-red-400 flex items-center justify-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{geocodeError}</span>
                      </div>
                    ) : geocodeResults.length === 0 ? (
                      <div className="px-4 py-5 text-xs text-center text-neutral-400">
                        No places found for &ldquo;{searchQuery}&rdquo;
                      </div>
                    ) : (
                      <div className="p-2 space-y-0.5">
                        {geocodeResults.map((result) => {
                          const { primary, secondary } = formatPlaceName(result);
                          const lat = parseFloat(result.lat);
                          const lon = parseFloat(result.lon);
                          return (
                            <button
                              key={result.place_id}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleSelectGeocodeResult(result);
                              }}
                              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition-colors ${
                                darkMode
                                  ? 'hover:bg-white/10 text-neutral-200'
                                  : 'hover:bg-neutral-50 text-neutral-800'
                              }`}
                            >
                              <div
                                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                  darkMode ? 'bg-white/8 text-neutral-300' : 'bg-neutral-100 text-neutral-600'
                                }`}
                              >
                                <MapPin className="w-3.5 h-3.5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold leading-tight truncate">{primary}</div>
                                {secondary && (
                                  <div className="text-[11px] text-neutral-400 truncate mt-0.5">{secondary}</div>
                                )}
                              </div>
                              <div className="text-[10px] font-mono text-neutral-500 shrink-0">
                                {lat.toFixed(2)}°, {lon.toFixed(2)}°
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Divider before local POIs */}
                    {filteredLocalLocations.length > 0 && (
                      <div
                        className={`px-4 py-2 text-[10px] font-bold uppercase tracking-wider ${
                          darkMode
                            ? 'bg-black/50 text-neutral-500 border-t border-white/8'
                            : 'bg-neutral-50 text-neutral-400 border-t border-neutral-100'
                        }`}
                      >
                        Terrain POIs
                      </div>
                    )}
                  </>
                )}

                {/* ── Local GLOBE_LOCATIONS ── */}
                {(showLocalResults || (showGeocodeResults && filteredLocalLocations.length > 0)) && (
                  <>
                    {showLocalResults && (
                      <div
                        className={`sticky top-0 px-4 py-2 text-[10px] font-bold uppercase tracking-wider ${
                          darkMode
                            ? 'bg-black/70 text-neutral-400 border-b border-white/8'
                            : 'bg-white/80 text-neutral-500 border-b border-neutral-100'
                        }`}
                      >
                        Geological Points of Interest ({filteredLocalLocations.length})
                      </div>
                    )}
                    <div className="p-2 space-y-0.5">
                      {filteredLocalLocations.map((loc) => (
                        <button
                          key={loc.id}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelectLocation(loc);
                          }}
                          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-colors text-left ${
                            selectedMarkerId === loc.id
                              ? darkMode
                                ? 'bg-white/15 text-white'
                                : 'bg-neutral-100 text-neutral-900'
                              : darkMode
                              ? 'hover:bg-white/10 text-neutral-200'
                              : 'hover:bg-neutral-50 text-neutral-800'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                darkMode ? 'bg-white/10 text-neutral-300' : 'bg-neutral-100 text-neutral-700'
                              }`}
                            >
                              {loc.hasActiveModel ? (
                                <Sparkles className="w-3.5 h-3.5 text-neutral-300" />
                              ) : (
                                <Mountain className="w-3.5 h-3.5 text-neutral-400" />
                              )}
                            </div>
                            <div>
                              <div className="text-sm font-semibold flex items-center gap-1.5">
                                <span>{loc.name}</span>
                                {loc.hasActiveModel && (
                                  <span
                                    className={`px-1.5 py-0.5 text-[9px] font-bold rounded border ${
                                      darkMode
                                        ? 'bg-white/10 text-neutral-300 border-white/15'
                                        : 'bg-neutral-100 text-neutral-700 border-neutral-300'
                                    }`}
                                  >
                                    3D DEM READY
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-neutral-400">{loc.region}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2.5 shrink-0">
                            <span className="text-xs font-mono text-neutral-400">{loc.elev}</span>
                            {loc.hasActiveModel ? (
                              <button
                                type="button"
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  onEnterViewer();
                                }}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors shadow-sm flex items-center gap-1.5 ${
                                  darkMode
                                    ? 'bg-white hover:bg-neutral-200 text-neutral-900'
                                    : 'bg-neutral-900 hover:bg-neutral-800 text-white'
                                }`}
                              >
                                <span>Open 3D</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <span className="text-xs text-neutral-400 font-medium">Focus</span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Search Bar Input */}
          <div
            id="globe-search-bar"
            className={`relative flex items-center gap-3 px-5 py-3 sm:py-3.5 rounded-2xl border transition-all duration-200 shadow-xl backdrop-blur-xl w-full ${
              isSearchFocused
                ? darkMode
                  ? 'bg-black/80 border-white/25 ring-2 ring-white/10 shadow-black/70'
                  : 'bg-white/90 border-neutral-400 ring-2 ring-black/5 shadow-neutral-200/80'
                : darkMode
                ? 'bg-black/60 border-white/10 hover:border-white/20 shadow-black/50'
                : 'bg-white/70 border-neutral-200/80 hover:border-neutral-300 shadow-neutral-200/60'
            }`}
          >
            {isGeocoding ? (
              <Loader2 className="w-5 h-5 shrink-0 text-neutral-400 animate-spin" />
            ) : (
              <Search className="w-5 h-5 shrink-0 text-neutral-400" />
            )}
            <input
              id="globe-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => {
                setTimeout(() => setIsSearchFocused(false), 220);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setIsSearchFocused(false);
                  setSearchQuery('');
                  setGeocodeResults([]);
                }
                if (e.key === 'Enter' && geocodeResults.length > 0) {
                  handleSelectGeocodeResult(geocodeResults[0]);
                }
              }}
              placeholder="Search any place — city, mountain, country, coordinates..."
              className="w-full bg-transparent border-0 outline-none text-sm sm:text-base placeholder:text-neutral-500 font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setGeocodeResults([]);
                  setNavigateToCoords(null);
                }}
                className="p-1 rounded-md text-neutral-400 hover:text-neutral-200 hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <kbd
              className={`hidden md:inline-flex items-center px-2 py-0.5 text-xs font-mono rounded border ${
                darkMode
                  ? 'bg-white/5 border-white/10 text-neutral-400'
                  : 'bg-neutral-100 border-neutral-200 text-neutral-500'
              }`}
            >
              ⌘K
            </kbd>
          </div>
        </div>
      </footer>

      {/* 4. Drag and Drop Overlay */}
      {isDraggingFile && (
        <div
          id="drag-drop-overlay"
          className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md border-4 border-dashed border-white/20 flex flex-col items-center justify-center pointer-events-none animate-in fade-in duration-150"
        >
          <div className="p-6 rounded-3xl bg-neutral-900/90 text-white flex flex-col items-center gap-3 shadow-2xl border border-white/10">
            <Upload className="w-12 h-12 text-neutral-300 animate-bounce" />
            <h3 className="text-lg font-bold">Drop your file here</h3>
            <p className="text-xs text-neutral-300">
              GeoTIFF, PNG, JPG or HTML — automatically processed
            </p>
          </div>
        </div>
      )}

      {/* 5. TIF / Image Preview Modal */}
      {pendingFile && (
        <TifPreviewModal
          file={pendingFile}
          darkMode={darkMode}
          onConfirm={handleConfirmUpload}
          onCancel={() => setPendingFile(null)}
        />
      )}
    </div>
  );
};
