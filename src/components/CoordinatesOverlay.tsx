import React, { useState, useEffect } from 'react';
import { Navigation } from 'lucide-react';

interface CoordinatesOverlayProps {
  darkMode?: boolean;
  className?: string;
}

export const CoordinatesOverlay: React.FC<CoordinatesOverlayProps> = ({
  darkMode = true,
  className = 'bottom-5 left-1/2 -translate-x-1/2',
}) => {
  // Base geographic reference (Hindu Kush mountain range ~ 36.1524° N, 71.3045° E)
  const BASE_LAT = 36.1524;
  const BASE_LON = 71.3045;
  const BASE_ALT = 3850;

  const [coords, setCoords] = useState({
    lat: BASE_LAT,
    lon: BASE_LON,
    alt: BASE_ALT,
  });

  useEffect(() => {
    // 1. Direct window mouse movement tracking
    const handleMouseMove = (e: MouseEvent) => {
      const normX = (e.clientX / window.innerWidth - 0.5) * 2;
      const normY = -(e.clientY / window.innerHeight - 0.5) * 2;

      const lat = BASE_LAT + normY * 0.385;
      const lon = BASE_LON + normX * 0.492;
      const alt = Math.round(
        BASE_ALT + Math.sin(normX * 2.8) * Math.cos(normY * 2.8) * 780 + Math.abs(normX) * 350
      );

      setCoords({
        lat: parseFloat(lat.toFixed(4)),
        lon: parseFloat(lon.toFixed(4)),
        alt,
      });
    };

    // 2. PostMessage listener for events from inside the 3D surface iframe
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === '3d_coord_move') {
        const { clientX, clientY, innerWidth, innerHeight } = e.data;
        const normX = (clientX / (innerWidth || window.innerWidth) - 0.5) * 2;
        const normY = -(clientY / (innerHeight || window.innerHeight) - 0.5) * 2;

        const lat = BASE_LAT + normY * 0.385;
        const lon = BASE_LON + normX * 0.492;
        const alt = Math.round(
          BASE_ALT + Math.sin(normX * 2.8) * Math.cos(normY * 2.8) * 780 + Math.abs(normX) * 350
        );

        setCoords({
          lat: parseFloat(lat.toFixed(4)),
          lon: parseFloat(lon.toFixed(4)),
          alt,
        });
      } else if (e.data?.type === '3d_surface_point') {
        const { x, y, z } = e.data;
        if (typeof x === 'number' && typeof y === 'number') {
          const normX = (x / 137 - 0.5) * 2;
          const normY = (y / 155 - 0.5) * 2;
          const lat = BASE_LAT + normY * 0.385;
          const lon = BASE_LON + normX * 0.492;
          const alt = typeof z === 'number' ? Math.round(z * 32 + 2500) : BASE_ALT;

          setCoords({
            lat: parseFloat(lat.toFixed(4)),
            lon: parseFloat(lon.toFixed(4)),
            alt,
          });
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const formatLat = (lat: number) => {
    const dir = lat >= 0 ? 'N' : 'S';
    return `${Math.abs(lat).toFixed(4)}° ${dir}`;
  };

  const formatLon = (lon: number) => {
    const dir = lon >= 0 ? 'E' : 'W';
    return `${Math.abs(lon).toFixed(4)}° ${dir}`;
  };

  return (
    <div
      id="coordinates-display-overlay"
      className={`absolute ${className} z-30 pointer-events-none flex items-center gap-3 px-4 py-1.5 rounded-full backdrop-blur-md border text-xs shadow-xl select-none font-mono transition-colors duration-200 ${
        darkMode
          ? 'bg-black/85 border-white/20 text-white shadow-black/50'
          : 'bg-white/90 border-slate-200 text-slate-800 shadow-slate-200/60'
      }`}
    >
      <div className={`flex items-center gap-1.5 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
        <Navigation className="w-3.5 h-3.5 transform -rotate-45" />
      </div>

      <div className="flex items-center gap-3 text-xs">
        <div className="flex items-center gap-1">
          <span className={`text-[10px] font-bold font-sans tracking-wide ${
            darkMode ? 'text-neutral-400' : 'text-slate-500'
          }`}>
            LAT:
          </span>
          <span className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            {formatLat(coords.lat)}
          </span>
        </div>

        <span className={darkMode ? 'text-white/30' : 'text-slate-300'}>•</span>

        <div className="flex items-center gap-1">
          <span className={`text-[10px] font-bold font-sans tracking-wide ${
            darkMode ? 'text-neutral-400' : 'text-slate-500'
          }`}>
            LON:
          </span>
          <span className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            {formatLon(coords.lon)}
          </span>
        </div>

        <span className={`hidden sm:inline ${darkMode ? 'text-white/30' : 'text-slate-300'}`}>•</span>

        <div className="hidden sm:flex items-center gap-1">
          <span className={`text-[10px] font-bold font-sans tracking-wide ${
            darkMode ? 'text-neutral-400' : 'text-slate-500'
          }`}>
            ELEV:
          </span>
          <span className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            {coords.alt.toLocaleString()} m
          </span>
        </div>
      </div>
    </div>
  );
};
