import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import {
  Globe2,
  Layers,
  MapPin,
  Mountain,
  Sparkles,
  Compass,
  Maximize2,
  Minus,
  Plus,
  ArrowRight,
  Info,
} from 'lucide-react';
import { GlobeMarker, GLOBE_LOCATIONS } from './Globe3D';

export interface Map2DProps {
  center: { lat: number; lon: number };
  zoom?: number;
  darkMode: boolean;
  targetMarkerId?: string | null;
  onSelectMarker?: (marker: GlobeMarker) => void;
  onOpen3DModel?: (markerId: string) => void;
  onReturnToGlobe: () => void;
  onCoordinatesChange?: (lat: number, lon: number) => void;
}

type MapLayerType = 'satellite' | 'topo' | 'osm' | 'carto';

const TILE_LAYERS: Record<
  MapLayerType,
  {
    name: string;
    url: (dark: boolean) => string;
    attribution: string;
    maxZoom: number;
  }
> = {
  satellite: {
    name: 'Satellite',
    url: () =>
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxZoom: 19,
  },
  topo: {
    name: 'Topographic',
    url: () => 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution:
      'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
    maxZoom: 17,
  },
  osm: {
    name: 'OpenStreetMap',
    url: () => 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  carto: {
    name: 'Carto Clean',
    url: (dark) =>
      dark
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 19,
  },
};

export const Map2D: React.FC<Map2DProps> = ({
  center,
  zoom = 9,
  darkMode,
  targetMarkerId,
  onSelectMarker,
  onOpen3DModel,
  onReturnToGlobe,
  onCoordinatesChange,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const currentTileLayerRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});

  const [activeLayer, setActiveLayer] = useState<MapLayerType>('satellite');
  const [currentZoom, setCurrentZoom] = useState<number>(zoom);
  const [activeMarker, setActiveMarker] = useState<GlobeMarker | null>(null);
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState<boolean>(false);
  const [showNotification, setShowNotification] = useState<boolean>(true);

  // Auto-dismiss notification after 4.5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowNotification(false);
    }, 4500);
    return () => clearTimeout(timer);
  }, []);

  // Update map center when props change
  useEffect(() => {
    if (mapInstanceRef.current && center) {
      const cur = mapInstanceRef.current.getCenter();
      if (
        Math.abs(cur.lat - center.lat) > 0.001 ||
        Math.abs(cur.lng - center.lon) > 0.001
      ) {
        mapInstanceRef.current.setView([center.lat, center.lon], mapInstanceRef.current.getZoom(), {
          animate: true,
        });
      }
    }
  }, [center]);

  // Focus target marker if specified
  useEffect(() => {
    if (targetMarkerId && markersRef.current[targetMarkerId] && mapInstanceRef.current) {
      const target = GLOBE_LOCATIONS.find((l) => l.id === targetMarkerId);
      if (target) {
        setActiveMarker(target);
        mapInstanceRef.current.flyTo([target.lat, target.lon], 11, {
          duration: 1.2,
        });
      }
    }
  }, [targetMarkerId]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const initialLat = Number.isFinite(center.lat) ? center.lat : 36.0;
    const initialLon = Number.isFinite(center.lon) ? center.lon : 71.2;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLon],
      zoom: zoom,
      minZoom: 2,
      maxZoom: 19,
      zoomControl: false, // We supply our own sleek custom HUD controls
      attributionControl: false, // Custom attribution
    });

    mapInstanceRef.current = map;

    // Add Base Tile Layer
    const layerConfig = TILE_LAYERS[activeLayer];
    const tileUrl = layerConfig.url(darkMode);
    const tileLayer = L.tileLayer(tileUrl, {
      maxZoom: layerConfig.maxZoom,
      subdomains: 'abc',
    }).addTo(map);

    currentTileLayerRef.current = tileLayer;

    // Track mouse coordinates
    map.on('mousemove', (e: L.LeafletMouseEvent) => {
      if (onCoordinatesChange) {
        onCoordinatesChange(parseFloat(e.latlng.lat.toFixed(4)), parseFloat(e.latlng.lng.toFixed(4)));
      }
    });

    // Track zoom changes & return to globe on zoom out <= 2
    map.on('zoomend', () => {
      const z = map.getZoom();
      setCurrentZoom(z);
      if (z <= 2) {
        onReturnToGlobe();
      }
    });

    // Populate Geological Markers with Custom DOM DivIcons
    const markerMap: Record<string, L.Marker> = {};

    GLOBE_LOCATIONS.forEach((loc) => {
      const isSelected = loc.id === 'kush' || loc.id === targetMarkerId;

      const iconHtml = `
        <div class="relative group cursor-pointer flex items-center justify-center">
          <div class="absolute -inset-2 rounded-full ${
            isSelected ? 'bg-amber-400/40 animate-ping' : 'bg-white/20'
          }"></div>
          <div class="w-8 h-8 rounded-xl flex items-center justify-center border shadow-xl backdrop-blur-md transition-transform duration-200 hover:scale-125 ${
            isSelected
              ? 'bg-neutral-900 border-amber-400 text-amber-300'
              : 'bg-neutral-900/90 border-white/30 text-white'
          }">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m8 3 4 8 5-5 5 15H2L8 3z"></path>
            </svg>
          </div>
          <div class="absolute top-9 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded-md text-[10px] font-bold tracking-tight bg-black/80 text-white border border-white/10 shadow-lg pointer-events-none">
            ${loc.name.split(' ')[0]}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: iconHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([loc.lat, loc.lon], { icon: customIcon }).addTo(map);

      marker.on('click', () => {
        setActiveMarker(loc);
        if (onSelectMarker) {
          onSelectMarker(loc);
        }
      });

      markerMap[loc.id] = marker;
    });

    markersRef.current = markerMap;

    // Invalidate size on mount after layout stabilizes
    setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Switch Tile Layer
  const handleLayerChange = (layerKey: MapLayerType) => {
    setActiveLayer(layerKey);
    setIsLayerMenuOpen(false);

    if (mapInstanceRef.current && currentTileLayerRef.current) {
      mapInstanceRef.current.removeLayer(currentTileLayerRef.current);
      const config = TILE_LAYERS[layerKey];
      const newLayer = L.tileLayer(config.url(darkMode), {
        maxZoom: config.maxZoom,
        subdomains: 'abc',
      }).addTo(mapInstanceRef.current);
      currentTileLayerRef.current = newLayer;
    }
  };

  // Switch Tile Layer when dark mode toggles if using carto
  useEffect(() => {
    if (activeLayer === 'carto' && mapInstanceRef.current && currentTileLayerRef.current) {
      mapInstanceRef.current.removeLayer(currentTileLayerRef.current);
      const config = TILE_LAYERS.carto;
      const newLayer = L.tileLayer(config.url(darkMode), {
        maxZoom: config.maxZoom,
        subdomains: 'abc',
      }).addTo(mapInstanceRef.current);
      currentTileLayerRef.current = newLayer;
    }
  }, [darkMode, activeLayer]);

  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    const currentZ = mapInstanceRef.current?.getZoom() || 3;
    if (currentZ <= 3) {
      onReturnToGlobe();
    } else {
      mapInstanceRef.current?.zoomOut();
    }
  };

  const handleResetView = () => {
    mapInstanceRef.current?.setView([center.lat, center.lon], 9, { animate: true });
  };

  return (
    <div id="map-2d-viewport" className="relative w-full h-full select-none overflow-hidden font-sans">
      {/* 1. Leaflet Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0 bg-neutral-950" />

      {/* 2. Top Banner Notification */}
      {showNotification && (
        <div
          id="map2d-zoom-toast"
          className="absolute top-20 left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex items-center gap-2.5 px-4 py-2 rounded-2xl border shadow-2xl backdrop-blur-xl bg-black/75 border-white/15 text-white text-xs font-medium animate-in fade-in slide-in-from-top-3 duration-200"
        >
          <Compass className="w-4 h-4 text-neutral-300 shrink-0" />
          <span>Zoomed into 2D OpenStreetMap / Satellite view</span>
          <span className="text-neutral-400">•</span>
          <span className="text-neutral-300">Zoom out or click &ldquo;Return to Globe&rdquo; anytime</span>
          <button
            type="button"
            onClick={() => setShowNotification(false)}
            className="ml-1 text-neutral-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {/* 3. Top Left: Return to 3D Globe Floating Button */}
      <div className="absolute top-20 left-5 sm:left-7 z-30 pointer-events-auto flex items-center gap-2">
        <button
          id="btn-return-to-globe"
          type="button"
          onClick={onReturnToGlobe}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border shadow-2xl font-semibold text-xs sm:text-sm tracking-tight transition-all duration-150 backdrop-blur-xl active:scale-95 ${
            darkMode
              ? 'bg-black/70 hover:bg-neutral-900/80 border-white/15 text-neutral-100 hover:text-white shadow-black/70'
              : 'bg-white/80 hover:bg-white border-neutral-300 text-neutral-900 shadow-neutral-300/60'
          }`}
          title="Return to 3D Earth Globe View"
        >
          <Globe2 className="w-4 h-4 shrink-0 text-neutral-300" />
          <span>← Return to 3D Globe</span>
        </button>

        {/* Layer Selector Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsLayerMenuOpen((prev) => !prev)}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl border shadow-2xl font-semibold text-xs sm:text-sm tracking-tight transition-all duration-150 backdrop-blur-xl active:scale-95 ${
              darkMode
                ? 'bg-black/70 hover:bg-neutral-900/80 border-white/15 text-neutral-200 shadow-black/70'
                : 'bg-white/80 hover:bg-white border-neutral-300 text-neutral-800 shadow-neutral-300/60'
            }`}
            title="Switch Map Layers (Satellite, Topographic, Street)"
          >
            <Layers className="w-4 h-4 text-neutral-400 shrink-0" />
            <span className="hidden sm:inline">{TILE_LAYERS[activeLayer].name}</span>
          </button>

          {isLayerMenuOpen && (
            <div
              id="map-layers-dropdown"
              className={`absolute top-full mt-2 left-0 w-52 rounded-2xl border shadow-2xl backdrop-blur-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150 ${
                darkMode
                  ? 'bg-black/85 border-white/15 text-neutral-100'
                  : 'bg-white/95 border-neutral-200 text-neutral-900'
              }`}
            >
              <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Map Tile Layers
              </div>
              <div className="space-y-1 mt-1">
                {(Object.keys(TILE_LAYERS) as MapLayerType[]).map((key) => {
                  const cfg = TILE_LAYERS[key];
                  const isCur = activeLayer === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleLayerChange(key)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                        isCur
                          ? darkMode
                            ? 'bg-white/15 text-white font-semibold'
                            : 'bg-neutral-100 text-neutral-900 font-semibold'
                          : darkMode
                          ? 'hover:bg-white/10 text-neutral-300'
                          : 'hover:bg-neutral-50 text-neutral-700'
                      }`}
                    >
                      <span>{cfg.name}</span>
                      {isCur && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Right Side Floating Zoom & Map Controls */}
      <div className="absolute right-5 sm:right-7 top-1/2 -translate-y-1/2 z-30 pointer-events-auto flex flex-col items-center gap-2">
        <div
          className={`flex flex-col rounded-2xl border shadow-2xl backdrop-blur-xl overflow-hidden ${
            darkMode
              ? 'bg-black/70 border-white/15 divide-y divide-white/10 text-neutral-200'
              : 'bg-white/80 border-neutral-300 divide-y divide-neutral-200 text-neutral-800'
          }`}
        >
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-3 hover:bg-white/10 transition-colors"
            title="Zoom in"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-3 hover:bg-white/10 transition-colors"
            title={currentZoom <= 3 ? 'Zoom out to Globe' : 'Zoom out'}
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleResetView}
            className="p-3 hover:bg-white/10 transition-colors"
            title="Reset focus"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        <div
          className={`px-2 py-1 rounded-xl border text-[10px] font-mono shadow-md backdrop-blur-md ${
            darkMode
              ? 'bg-black/60 border-white/10 text-neutral-400'
              : 'bg-white/70 border-neutral-200 text-neutral-600'
          }`}
        >
          Z{currentZoom}
        </div>
      </div>

      {/* 5. Selected Marker Inspection Card */}
      {activeMarker && (
        <div
          id="map2d-marker-card"
          className={`absolute bottom-28 left-1/2 -translate-x-1/2 z-40 pointer-events-auto w-[92vw] max-w-md rounded-2xl border shadow-2xl backdrop-blur-2xl p-4 animate-in fade-in slide-in-from-bottom-3 duration-200 ${
            darkMode
              ? 'bg-black/80 border-white/15 text-neutral-100'
              : 'bg-white/90 border-neutral-200 text-neutral-900'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  darkMode ? 'bg-white/10 text-neutral-200' : 'bg-neutral-100 text-neutral-800'
                }`}
              >
                <Mountain className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold leading-tight flex items-center gap-1.5">
                  <span>{activeMarker.name}</span>
                  {activeMarker.hasActiveModel && (
                    <span
                      className={`px-1.5 py-0.5 text-[9px] font-bold rounded border ${
                        darkMode
                          ? 'bg-amber-400/20 text-amber-300 border-amber-400/30'
                          : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}
                    >
                      3D DEM READY
                    </span>
                  )}
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">{activeMarker.region}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveMarker(null)}
              className="text-neutral-400 hover:text-white p-1 rounded-md transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10 text-xs">
            <div className="flex items-center gap-2 font-mono text-neutral-400">
              <span>ELEV:</span>
              <span className="text-white font-semibold">{activeMarker.elev}</span>
              <span>•</span>
              <span>
                {activeMarker.lat.toFixed(2)}°, {activeMarker.lon.toFixed(2)}°
              </span>
            </div>

            {activeMarker.hasActiveModel && onOpen3DModel && (
              <button
                type="button"
                onClick={() => onOpen3DModel(activeMarker.id)}
                className={`px-3 py-1.5 rounded-xl font-semibold text-xs shadow-md transition-all active:scale-95 flex items-center gap-1.5 ${
                  darkMode
                    ? 'bg-white hover:bg-neutral-200 text-neutral-900'
                    : 'bg-neutral-900 hover:bg-neutral-800 text-white'
                }`}
              >
                <span>Open 3D Model</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 6. Bottom Tile Source Attribution */}
      <div className="absolute bottom-2 right-3 z-20 pointer-events-none text-[9px] text-neutral-400/80 bg-black/40 px-2 py-0.5 rounded backdrop-blur-xs">
        Map tiles: {TILE_LAYERS[activeLayer].name} (Free OSM / Esri / Carto)
      </div>
    </div>
  );
};
