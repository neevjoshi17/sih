import React, { useState } from 'react';
import {
  Globe,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Orbit,
  Grid,
  Columns2,
  Maximize2,
  Minimize2,
  Info,
  Mountain,
} from 'lucide-react';

export type CompareViewMode = 'single-3d' | 'side-by-side' | 'wipe' | 'image-only';

interface LeftDockToolbarProps {
  wireframe: boolean;
  onWireframeToggle: () => void;
  onResetCamera: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  autoRotate: boolean;
  onToggleAutoRotate: () => void;
  darkMode?: boolean;
  onGoHome?: () => void;
  compareMode?: CompareViewMode;
  onToggleCompareMode?: () => void;
  colabRenderMode?: '3d-mesh' | 'ground-view';
  onToggleColabRenderMode?: () => void;
  hasUploadedFile?: boolean;
}

export const LeftDockToolbar: React.FC<LeftDockToolbarProps> = ({
  wireframe,
  onWireframeToggle,
  onResetCamera,
  onZoomIn,
  onZoomOut,
  autoRotate,
  onToggleAutoRotate,
  darkMode = true,
  onGoHome,
  compareMode = 'side-by-side',
  onToggleCompareMode,
  colabRenderMode = '3d-mesh',
  onToggleColabRenderMode,
  hasUploadedFile = false,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const dockBg = darkMode
    ? 'bg-black/90 border-white/20 text-white shadow-2xl shadow-black/80'
    : 'bg-white/90 border-slate-200 text-slate-700 shadow-xl shadow-slate-200/50';

  const tooltipBg = darkMode
    ? 'bg-black border-white/25 text-white shadow-2xl'
    : 'bg-white border-slate-200 text-slate-800 shadow-lg';

  const btnHover = darkMode
    ? 'text-white hover:text-white hover:bg-white/15'
    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100';

  return (
    <aside
      id="left-dock-toolbar"
      className={`fixed left-0 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-1.5 p-1.5 backdrop-blur-xl border-y border-r rounded-r-2xl select-none transition-colors duration-200 ${dockBg}`}
      aria-label="3D Viewport Tools Dock"
    >
      {/* 0. Home / Globe Screen Navigation */}
      {onGoHome && (
        <>
          <div className="relative group">
            <button
              id="dock-btn-home"
              type="button"
              onClick={onGoHome}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150 active:scale-95 ${
                darkMode
                  ? 'text-sky-400 hover:text-sky-300 hover:bg-sky-500/20'
                  : 'text-sky-600 hover:text-sky-700 hover:bg-sky-50'
              }`}
              title="Return to 3D Globe Home Screen"
              aria-label="Return to 3D Globe Home Screen"
            >
              <Globe className="w-5 h-5" />
            </button>
            <span
              className={`absolute left-full ml-3 px-2.5 py-1 rounded-lg border text-xs font-medium pointer-events-none opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-2 transition-all duration-150 whitespace-nowrap z-50 ${tooltipBg}`}
            >
              Globe Home Screen
            </span>
          </div>

          <div
            className={`w-6 h-px my-0.5 ${
              darkMode ? 'bg-white/15' : 'bg-slate-200'
            }`}
          />
        </>
      )}

      {/* 1. Re-Center / Reset Camera */}
      <div className="relative group">
        <button
          type="button"
          onClick={onResetCamera}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150 active:scale-95 ${btnHover}`}
          title="Reset / Center View"
          aria-label="Reset Camera View"
        >
          <RotateCcw className={`w-4 h-4 ${darkMode ? 'text-white' : 'text-slate-700 group-hover:text-slate-900'}`} />
        </button>
        <span className={`absolute left-full ml-3 px-2.5 py-1 rounded-lg border text-xs font-medium pointer-events-none opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-2 transition-all duration-150 whitespace-nowrap z-50 ${tooltipBg}`}>
          Center View
        </span>
      </div>

      {/* 2. Zoom In */}
      <div className="relative group">
        <button
          type="button"
          onClick={onZoomIn}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150 active:scale-95 ${btnHover}`}
          title="Zoom In"
          aria-label="Zoom In"
        >
          <ZoomIn className={`w-4 h-4 ${darkMode ? 'text-white' : 'text-slate-700 group-hover:text-slate-900'}`} />
        </button>
        <span className={`absolute left-full ml-3 px-2.5 py-1 rounded-lg border text-xs font-medium pointer-events-none opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-2 transition-all duration-150 whitespace-nowrap z-50 ${tooltipBg}`}>
          Zoom In (+)
        </span>
      </div>

      {/* 3. Zoom Out */}
      <div className="relative group">
        <button
          type="button"
          onClick={onZoomOut}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150 active:scale-95 ${btnHover}`}
          title="Zoom Out"
          aria-label="Zoom Out"
        >
          <ZoomOut className={`w-4 h-4 ${darkMode ? 'text-white' : 'text-slate-700 group-hover:text-slate-900'}`} />
        </button>
        <span className={`absolute left-full ml-3 px-2.5 py-1 rounded-lg border text-xs font-medium pointer-events-none opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-2 transition-all duration-150 whitespace-nowrap z-50 ${tooltipBg}`}>
          Zoom Out (-)
        </span>
      </div>

      <div className={`w-7 h-px my-1 ${darkMode ? 'bg-white/20' : 'bg-slate-200'}`} />

      {/* 4. Turntable Auto-Rotate */}
      <div className="relative group">
        <button
          type="button"
          onClick={onToggleAutoRotate}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150 ${
            autoRotate
              ? darkMode
                ? 'bg-white text-black font-bold shadow-lg ring-2 ring-white/30'
                : 'bg-slate-900 text-white font-bold shadow-md'
              : btnHover
          }`}
          title="Turntable Auto-Rotate"
          aria-label="Toggle Auto-Rotate"
        >
          <Orbit
            className={`w-4 h-4 ${
              autoRotate
                ? darkMode
                  ? 'animate-spin text-black'
                  : 'animate-spin text-white'
                : darkMode
                ? 'text-white'
                : 'text-slate-700 group-hover:text-slate-900'
            }`}
            style={{ animationDuration: '8s' }}
          />
        </button>
        <span className={`absolute left-full ml-3 px-2.5 py-1 rounded-lg border text-xs font-medium pointer-events-none opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-2 transition-all duration-150 whitespace-nowrap z-50 ${tooltipBg}`}>
          Auto-Rotate {autoRotate ? '(On)' : '(Off)'}
        </span>
      </div>

      {/* 5. Wireframe / Contour Overlay Mode */}
      <div className="relative group">
        <button
          type="button"
          onClick={onWireframeToggle}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150 ${
            wireframe
              ? darkMode
                ? 'bg-white text-black font-bold shadow-lg ring-2 ring-white/30'
                : 'bg-slate-900 text-white font-bold shadow-md'
              : btnHover
          }`}
          title="Wireframe & Contours Mode"
          aria-label="Toggle Wireframe and Contours"
        >
          <Grid
            className={`w-4 h-4 ${
              wireframe
                ? darkMode
                  ? 'text-black'
                  : 'text-white'
                : darkMode
                ? 'text-white'
                : 'text-slate-700 group-hover:text-slate-900'
            }`}
          />
        </button>
        <span className={`absolute left-full ml-3 px-2.5 py-1 rounded-lg border text-xs font-medium pointer-events-none opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-2 transition-all duration-150 whitespace-nowrap z-50 ${tooltipBg}`}>
          Contours {wireframe ? '(On)' : '(Off)'}
        </span>
      </div>

      {/* 5b. Side-by-Side Real Image Comparison Mode */}
      {onToggleCompareMode && (
        <div className="relative group">
          <button
            type="button"
            onClick={onToggleCompareMode}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150 ${
              compareMode === 'side-by-side' || compareMode === 'wipe'
                ? darkMode
                  ? 'bg-indigo-600 text-white font-bold shadow-lg ring-2 ring-indigo-400/40'
                  : 'bg-indigo-600 text-white font-bold shadow-md'
                : btnHover
            }`}
            title="Side-by-Side Satellite Comparison"
            aria-label="Toggle Side-by-Side Comparison"
          >
            <Columns2
              className={`w-4 h-4 ${
                compareMode === 'side-by-side' || compareMode === 'wipe'
                  ? 'text-white'
                  : darkMode
                  ? 'text-white'
                  : 'text-slate-700 group-hover:text-slate-900'
              }`}
            />
          </button>
          <span className={`absolute left-full ml-3 px-2.5 py-1 rounded-lg border text-xs font-medium pointer-events-none opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-2 transition-all duration-150 whitespace-nowrap z-50 ${tooltipBg}`}>
            Satellite Comparison {compareMode === 'side-by-side' ? '(Split)' : compareMode === 'wipe' ? '(Wipe)' : '(Off)'}
          </span>
        </div>
      )}

      {/* 5c. Colab Aerial 3D Mesh vs Ground-Level Perspective Mode */}
      {onToggleColabRenderMode && hasUploadedFile && (
        <div className="relative group">
          <button
            type="button"
            onClick={onToggleColabRenderMode}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150 ${
              colabRenderMode === 'ground-view'
                ? darkMode
                  ? 'bg-amber-600 text-white font-bold shadow-lg ring-2 ring-amber-400/40'
                  : 'bg-amber-600 text-white font-bold shadow-md'
                : btnHover
            }`}
            title={colabRenderMode === 'ground-view' ? 'Switch to 3D Topographic Mesh' : 'Switch to Ground-Level Perspective View'}
            aria-label="Toggle Colab View Mode"
          >
            <Mountain
              className={`w-4 h-4 ${
                colabRenderMode === 'ground-view'
                  ? 'text-white'
                  : darkMode
                  ? 'text-white'
                  : 'text-slate-700 group-hover:text-slate-900'
              }`}
            />
          </button>
          <span className={`absolute left-full ml-3 px-2.5 py-1 rounded-lg border text-xs font-medium pointer-events-none opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-2 transition-all duration-150 whitespace-nowrap z-50 ${tooltipBg}`}>
            {colabRenderMode === 'ground-view' ? 'Ground View (Active)' : 'Ground-Level View'}
          </span>
        </div>
      )}

      <div className={`w-7 h-px my-1 ${darkMode ? 'bg-white/20' : 'bg-slate-200'}`} />

      {/* 6. Fullscreen Toggle */}
      <div className="relative group">
        <button
          type="button"
          onClick={toggleFullscreen}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150 ${btnHover}`}
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          aria-label="Toggle Fullscreen"
        >
          {isFullscreen ? (
            <Minimize2 className={`w-4 h-4 ${darkMode ? 'text-white' : 'text-slate-700 group-hover:text-slate-900'}`} />
          ) : (
            <Maximize2 className={`w-4 h-4 ${darkMode ? 'text-white' : 'text-slate-700 group-hover:text-slate-900'}`} />
          )}
        </button>
        <span className={`absolute left-full ml-3 px-2.5 py-1 rounded-lg border text-xs font-medium pointer-events-none opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-2 transition-all duration-150 whitespace-nowrap z-50 ${tooltipBg}`}>
          {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        </span>
      </div>

      {/* 7. Navigation Guide Popover */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsInfoOpen((prev) => !prev)}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150 ${
            isInfoOpen
              ? darkMode
                ? 'bg-white text-black font-bold'
                : 'bg-slate-900 text-white font-bold'
              : btnHover
          }`}
          title="Viewport Navigation Controls"
          aria-label="Navigation Guide"
        >
          <Info
            className={`w-4 h-4 ${
              isInfoOpen
                ? darkMode
                  ? 'text-black'
                  : 'text-white'
                : darkMode
                ? 'text-white'
                : 'text-slate-700 group-hover:text-slate-900'
            }`}
          />
        </button>

        {isInfoOpen && (
          <div className={`absolute left-full ml-3 bottom-0 w-64 rounded-2xl backdrop-blur-xl border p-3.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-150 ${
            darkMode
              ? 'bg-black/95 border-white/25 text-neutral-300 shadow-2xl'
              : 'bg-white/95 border-slate-200 text-slate-700 shadow-xl'
          }`}>
            <p className={`font-semibold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Navigation Controls
            </p>
            <ul className="space-y-1.5 text-[11px]">
              <li className="flex items-center justify-between">
                <span className={darkMode ? 'text-neutral-400' : 'text-slate-500'}>Orbit / Rotate:</span>
                <span className={`font-mono px-1.5 py-0.5 rounded ${darkMode ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-800'}`}>
                  Left-Click + Drag
                </span>
              </li>
              <li className="flex items-center justify-between">
                <span className={darkMode ? 'text-neutral-400' : 'text-slate-500'}>Pan / Move:</span>
                <span className={`font-mono px-1.5 py-0.5 rounded ${darkMode ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-800'}`}>
                  Right-Click + Drag
                </span>
              </li>
              <li className="flex items-center justify-between">
                <span className={darkMode ? 'text-neutral-400' : 'text-slate-500'}>Zoom:</span>
                <span className={`font-mono px-1.5 py-0.5 rounded ${darkMode ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-800'}`}>
                  Scroll Wheel
                </span>
              </li>
            </ul>
          </div>
        )}
      </div>
    </aside>
  );
};
