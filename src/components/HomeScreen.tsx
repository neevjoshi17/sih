import React, { useState, useRef, useMemo, useEffect } from 'react';
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
} from 'lucide-react';
import { Globe3D, GLOBE_LOCATIONS, type GlobeMarker } from './Globe3D';
import { Map2D } from './Map2D';

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

  // Filter locations based on search query
  const filteredLocations = useMemo(() => {
    if (!searchQuery.trim()) return GLOBE_LOCATIONS;
    const query = searchQuery.toLowerCase().trim();
    return GLOBE_LOCATIONS.filter(
      (loc) =>
        loc.name.toLowerCase().includes(query) ||
        loc.region.toLowerCase().includes(query) ||
        loc.elev.toLowerCase().includes(query) ||
        loc.lat.toString().includes(query) ||
        loc.lon.toString().includes(query)
    );
  }, [searchQuery]);

  const handleSelectLocation = (loc: GlobeMarker) => {
    setSelectedMarkerId(loc.id);
    setCurrentCoords({ lat: loc.lat, lon: loc.lon });
    setSearchQuery(loc.name);
    setIsSearchFocused(false);
  };

  const handleZoomInToMap = (coords: { lat: number; lon: number; zoom: number }) => {
    setCurrentCoords({ lat: coords.lat, lon: coords.lon });
    setMap2dZoom(coords.zoom || 9);
    setViewMode('map2d');
  };

  const handleNonGeoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploadMenuOpen(false);
      if (onProcessImageFile) {
        onProcessImageFile(file, 'non-geo');
      } else {
        const url = URL.createObjectURL(file);
        onFileUpload(url, `[Non-Geo] ${file.name}`);
        onEnterViewer();
      }
    }
    // Reset file input value so re-uploading the same file works
    if (e.target) e.target.value = '';
  };

  const handleGeoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploadMenuOpen(false);
      if (onProcessImageFile) {
        onProcessImageFile(file, 'geo');
      } else {
        const url = URL.createObjectURL(file);
        onFileUpload(url, `[Geo] ${file.name}`);
        onEnterViewer();
      }
    }
    // Reset file input value so re-uploading the same file works
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
    if (file) {
      if (onProcessImageFile) {
        onProcessImageFile(file);
      } else {
        const url = URL.createObjectURL(file);
        onFileUpload(url, file.name);
        onEnterViewer();
      }
    }
  };

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
          {/* Search Dropdown / Autocomplete Results (Opens Upward Above Search Bar) */}
          {isSearchFocused && (
            <div
              id="globe-search-dropdown"
              className={`absolute left-0 right-0 bottom-full mb-3 rounded-2xl border shadow-2xl backdrop-blur-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2 duration-150 ${
                darkMode
                  ? 'bg-black/80 border-white/10 divide-y divide-white/10 text-neutral-200'
                  : 'bg-white/85 border-neutral-200 divide-y divide-neutral-100 text-neutral-800'
              }`}
            >
              <div className="p-2.5 max-h-72 overflow-y-auto space-y-1.5">
                <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center justify-between">
                  <span>Geological Points of Interest ({filteredLocations.length})</span>
                  <span>Click to Focus Globe</span>
                </div>

                {filteredLocations.length === 0 ? (
                  <div className="px-3.5 py-4 text-center text-xs sm:text-sm text-neutral-400">
                    No matching geological locations found for &ldquo;{searchQuery}&rdquo;. Try coordinates like &ldquo;36, 71&rdquo; or &ldquo;Hindu Kush&rdquo;.
                  </div>
                ) : (
                  filteredLocations.map((loc) => (
                    <div
                      key={loc.id}
                      onClick={() => handleSelectLocation(loc)}
                      className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl cursor-pointer transition-colors text-left ${
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
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            darkMode ? 'bg-white/10 text-neutral-300' : 'bg-neutral-100 text-neutral-700'
                          }`}
                        >
                          {loc.hasActiveModel ? (
                            <Sparkles className="w-4 h-4 text-neutral-300" />
                          ) : (
                            <Mountain className="w-4 h-4 text-neutral-400" />
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
                          <div className="text-xs text-neutral-400">{loc.region}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className="text-xs font-mono text-neutral-400">{loc.elev}</span>
                        {loc.hasActiveModel ? (
                          <button
                            type="button"
                            onClick={(e) => {
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
                    </div>
                  ))
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
            <Search className="w-5 h-5 shrink-0 text-neutral-400" />
            <input
              id="globe-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => {
                // Delayed hide to allow clicking result items
                setTimeout(() => setIsSearchFocused(false), 220);
              }}
              placeholder="Search mountains, coordinates (e.g. Hindu Kush, 36° N, 71° E)..."
              className="w-full bg-transparent border-0 outline-none text-sm sm:text-base placeholder:text-neutral-500 font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
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
            <h3 className="text-lg font-bold">Drop your 3D Surface File here</h3>
            <p className="text-xs text-neutral-300">
              Will immediately load into the 3D Surface Viewer
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
