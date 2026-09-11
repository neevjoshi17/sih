import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  GripVertical,
} from 'lucide-react';
import { RealImageComparisonPanel } from './RealImageComparisonPanel';
import type { CompareViewMode } from './LeftDockToolbar';

export interface KushControls {
  resetCamera: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  toggleAutoRotate: () => void;
  toggleWireframe: () => void;
}

interface KushSurfaceViewerProps {
  fileUrl?: string;
  fileName?: string;
  autoRotate?: boolean;
  wireframe?: boolean;
  darkMode?: boolean;
  compareMode?: CompareViewMode;
  onCompareModeChange?: (mode: CompareViewMode) => void;
  comparisonImageSrc?: string;
  comparisonImageName?: string;
  onComparisonImageChange?: (url: string, name: string) => void;
  onControlsReady?: (controls: KushControls) => void;
}

export const KushSurfaceViewer: React.FC<KushSurfaceViewerProps> = ({
  fileUrl = '/kushimage.html',
  fileName = 'kushimage.html',
  autoRotate = false,
  wireframe = false,
  darkMode = true,
  compareMode = 'side-by-side',
  onCompareModeChange,
  comparisonImageSrc = '/final_color_image.png',
  comparisonImageName = 'final_color_image_8bit.tif',
  onComparisonImageChange,
  onControlsReady,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Split view dragging state (percentage of width given to the 3D viewer)
  const [splitPercent, setSplitPercent] = useState<number>(50);
  const [isDraggingSplit, setIsDraggingSplit] = useState<boolean>(false);

  // Wipe overlay state (0 to 100% position of wipe divider)
  const [wipePosition, setWipePosition] = useState<number>(50);
  const [isDraggingWipe, setIsDraggingWipe] = useState<boolean>(false);

  // When fileUrl changes, reset loaded state
  useEffect(() => {
    setIsLoaded(false);
  }, [fileUrl]);

  // Synchronize theme to iframe via both postMessage and same-origin DOM styling
  const syncThemeToIframe = (isDark: boolean) => {
    try {
      iframeRef.current?.contentWindow?.postMessage(
        { action: 'set_theme', darkMode: isDark },
        '*'
      );
    } catch {
      // Ignore
    }

    try {
      const doc = iframeRef.current?.contentDocument;
      if (doc && doc.body) {
        doc.body.classList.toggle('dark-theme', isDark);
        doc.body.classList.toggle('light-theme', !isDark);

        let themeStyle = doc.getElementById('viewer-injected-theme') as HTMLStyleElement | null;
        if (!themeStyle) {
          themeStyle = doc.createElement('style');
          themeStyle.id = 'viewer-injected-theme';
          doc.head?.appendChild(themeStyle);
        }
        themeStyle.textContent = `
          body.light-theme, body.light-theme text, body.light-theme .gtitle, body.light-theme .hovertext text {
            fill: #0f172a !important;
            color: #0f172a !important;
          }
          body.light-theme .modebar-btn svg path, body.light-theme .modebar-btn svg {
            fill: #475569 !important;
          }
          body.light-theme .modebar-btn:hover svg path, body.light-theme .modebar-btn:hover svg {
            fill: #0f172a !important;
          }
          body.light-theme .modebar-btn.active svg path, body.light-theme .modebar-btn.active svg {
            fill: #2563eb !important;
          }
          body.light-theme .modebar-btn--logo svg path, body.light-theme .modebar-btn--logo svg path[fill="#FFF"], body.light-theme .modebar-btn--logo svg path[fill="#fff"] {
            fill: #0f172a !important;
          }
          body.light-theme .modebar-btn--logo svg rect {
            fill: #e2e8f0 !important;
          }
          body.light-theme .modebar-group {
            background-color: rgba(255, 255, 255, 0.88) !important;
            border: 1px solid rgba(0, 0, 0, 0.12) !important;
          }
          body.dark-theme, body.dark-theme text, body.dark-theme .gtitle, body.dark-theme .hovertext text {
            fill: #f8fafc !important;
            color: #f8fafc !important;
          }
          body.dark-theme .modebar-btn svg path, body.dark-theme .modebar-btn svg {
            fill: #94a3b8 !important;
          }
          body.dark-theme .modebar-btn:hover svg path, body.dark-theme .modebar-btn:hover svg {
            fill: #ffffff !important;
          }
          body.dark-theme .modebar-btn.active svg path, body.dark-theme .modebar-btn.active svg {
            fill: #60a5fa !important;
          }
          body.dark-theme .modebar-btn--logo svg path, body.dark-theme .modebar-btn--logo svg path[fill="#FFF"], body.dark-theme .modebar-btn--logo svg path[fill="#fff"] {
            fill: #ffffff !important;
          }
          body.dark-theme .modebar-btn--logo svg rect {
            fill: #000000 !important;
          }
          body.dark-theme .modebar-group {
            background-color: rgba(0, 0, 0, 0.75) !important;
            border: 1px solid rgba(255, 255, 255, 0.2) !important;
          }
          .main-svg, .plotly-graph-div, .plot-container, .gl-container, .svg-container {
            background: transparent !important;
          }
        `;

        const svg = doc.querySelector('.main-svg') as SVGElement | null;
        if (svg) svg.style.background = 'transparent';

        const logoPaths = doc.querySelectorAll('.modebar-btn--logo svg path, .plotlyjsicon svg path');
        logoPaths.forEach((p: any) => {
          p.style.fill = isDark ? '#ffffff' : '#0f172a';
        });
        const logoRects = doc.querySelectorAll('.modebar-btn--logo svg rect, .plotlyjsicon svg rect');
        logoRects.forEach((r: any) => {
          r.style.fill = isDark ? '#000000' : '#e2e8f0';
        });
        const svgTexts = doc.querySelectorAll('svg text');
        svgTexts.forEach((t: any) => {
          t.style.fill = isDark ? '#f8fafc' : '#0f172a';
        });
      }
    } catch {
      // Cross-origin fallback
    }
  };

  const triggerIframeResize = useCallback(() => {
    try {
      iframeRef.current?.contentWindow?.postMessage({ action: 'resize' }, '*');
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    if (onControlsReady) {
      onControlsReady({
        resetCamera: () => {
          iframeRef.current?.contentWindow?.postMessage({ action: 'reset_camera' }, '*');
        },
        zoomIn: () => {
          iframeRef.current?.contentWindow?.postMessage({ action: 'zoom_in' }, '*');
        },
        zoomOut: () => {
          iframeRef.current?.contentWindow?.postMessage({ action: 'zoom_out' }, '*');
        },
        toggleAutoRotate: () => {
          iframeRef.current?.contentWindow?.postMessage({ action: 'toggle_autorotate' }, '*');
        },
        toggleWireframe: () => {
          iframeRef.current?.contentWindow?.postMessage({ action: 'toggle_contours' }, '*');
        },
      });
    }
  }, [onControlsReady]);

  // Sync darkMode state
  useEffect(() => {
    if (isLoaded) {
      syncThemeToIframe(darkMode);
      const t1 = setTimeout(() => syncThemeToIframe(darkMode), 120);
      const t2 = setTimeout(() => syncThemeToIframe(darkMode), 450);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [darkMode, isLoaded]);

  // Sync autoRotate state
  useEffect(() => {
    if (isLoaded) {
      iframeRef.current?.contentWindow?.postMessage(
        { action: 'set_autorotate', enabled: autoRotate },
        '*'
      );
    }
  }, [autoRotate, isLoaded]);

  // Sync wireframe state with darkMode
  useEffect(() => {
    if (isLoaded) {
      iframeRef.current?.contentWindow?.postMessage(
        { action: 'set_wireframe', enabled: wireframe, darkMode },
        '*'
      );
    }
  }, [wireframe, darkMode, isLoaded]);

  // Handle Split View drag
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingSplit && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const newPercent = Math.min(Math.max(20, (offsetX / rect.width) * 100), 80);
        setSplitPercent(newPercent);
        triggerIframeResize();
      } else if (isDraggingWipe && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const newPercent = Math.min(Math.max(5, (offsetX / rect.width) * 100), 95);
        setWipePosition(newPercent);
      }
    };

    const handleMouseUp = () => {
      if (isDraggingSplit) {
        setIsDraggingSplit(false);
        triggerIframeResize();
        setTimeout(triggerIframeResize, 50);
      }
      if (isDraggingWipe) {
        setIsDraggingWipe(false);
      }
    };

    if (isDraggingSplit || isDraggingWipe) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingSplit, isDraggingWipe, triggerIframeResize]);

  // Also trigger iframe resize when compareMode switches
  useEffect(() => {
    const t = setTimeout(triggerIframeResize, 100);
    return () => clearTimeout(t);
  }, [compareMode, splitPercent, triggerIframeResize]);

  return (
    <div
      ref={containerRef}
      id="kush-3d-viewer-container"
      className={`relative w-full h-full flex flex-col items-center justify-center select-none overflow-hidden transition-colors duration-300 ${
        darkMode ? 'bg-black text-white' : 'bg-[#f8fafc] text-slate-900'
      }`}
    >
      {/* Drag Overlay blocker (prevents iframe from stealing pointer events during split dragging) */}
      {(isDraggingSplit || isDraggingWipe) && (
        <div className="absolute inset-0 z-50 cursor-col-resize select-none" />
      )}

      {/* Main Viewport Area Based on compareMode */}
      <div className="relative w-full h-full flex flex-row overflow-hidden">
        {/* --- A. 3D Surface Pane --- */}
        <div
          id="pane-3d-surface"
          style={{
            width:
              compareMode === 'side-by-side'
                ? `${splitPercent}%`
                : compareMode === 'image-only'
                ? '0%'
                : '100%',
            display: compareMode === 'image-only' ? 'none' : 'block',
          }}
          className="relative h-full transition-[width] duration-0 overflow-hidden"
        >
          {/* 3D Surface Iframe */}
          <iframe
            key={fileUrl}
            ref={iframeRef}
            src={fileUrl}
            title={`3D Surface Viewer - ${fileName}`}
            onLoad={() => {
              setIsLoaded(true);
              syncThemeToIframe(darkMode);
              setTimeout(() => syncThemeToIframe(darkMode), 150);
              setTimeout(() => syncThemeToIframe(darkMode), 500);
            }}
            className={`w-full h-full border-0 block m-0 p-0 transition-opacity duration-300 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              display: 'block',
              background: 'transparent',
              colorScheme: darkMode ? 'dark' : 'light',
            }}
          />

          {/* Loading Skeleton */}
          {!isLoaded && (
            <div
              className={`absolute inset-0 flex flex-col items-center justify-center gap-3 z-10 ${
                darkMode ? 'bg-black' : 'bg-[#f8fafc]'
              }`}
            >
              <div
                className={`w-10 h-10 border-2 rounded-full animate-spin ${
                  darkMode ? 'border-white/20 border-t-white' : 'border-slate-300 border-t-slate-800'
                }`}
              />
              <p
                className={`text-xs font-mono animate-pulse ${
                  darkMode ? 'text-white' : 'text-slate-700'
                }`}
              >
                Loading 3D Model: {fileName}
              </p>
            </div>
          )}
        </div>

        {/* --- B. Draggable Split Divider (Side-by-Side Mode) --- */}
        {compareMode === 'side-by-side' && (
          <div
            id="comparison-split-divider"
            onMouseDown={(e) => {
              e.preventDefault();
              setIsDraggingSplit(true);
            }}
            className={`group relative z-30 flex items-center justify-center cursor-col-resize transition-colors w-3 hover:w-3.5 -mx-1.5 ${
              darkMode ? 'bg-neutral-800 hover:bg-indigo-500' : 'bg-slate-300 hover:bg-indigo-500'
            } ${isDraggingSplit ? 'bg-indigo-500 w-3.5 ring-2 ring-indigo-400' : ''}`}
            title="Drag left/right to resize panes. Double-click to reset 50/50."
            onDoubleClick={() => {
              setSplitPercent(50);
              triggerIframeResize();
            }}
          >
            {/* Center Grip Handle */}
            <div
              className={`flex items-center justify-center w-6 h-12 rounded-full border shadow-2xl transition-all ${
                darkMode
                  ? 'bg-neutral-900 border-white/20 text-white group-hover:scale-110'
                  : 'bg-white border-neutral-300 text-neutral-800 shadow-md group-hover:scale-110'
              }`}
            >
              <GripVertical className="w-3.5 h-3.5 text-neutral-400 group-hover:text-white" />
            </div>

            {/* Quick Snap Chip on Hover */}
            <div className="absolute top-16 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap bg-black/90 text-white text-[10px] font-mono px-2 py-1 rounded-md border border-white/20 shadow-xl">
              {Math.round(splitPercent)}% / {Math.round(100 - splitPercent)}%
            </div>
          </div>
        )}

        {/* --- C. Real Image Comparison Pane (Side-by-Side or Image-Only) --- */}
        {(compareMode === 'side-by-side' || compareMode === 'image-only') && (
          <div
            id="pane-real-image"
            style={{
              width:
                compareMode === 'side-by-side'
                  ? `${100 - splitPercent}%`
                  : '100%',
            }}
            className="relative h-full overflow-hidden"
          >
            <RealImageComparisonPanel
              imageSrc={comparisonImageSrc}
              imageFileName={comparisonImageName}
              darkMode={darkMode}
              onImageChange={onComparisonImageChange}
            />
          </div>
        )}

        {/* --- D. Wipe / Blend Mode (Curtain Overlay) --- */}
        {compareMode === 'wipe' && (
          <div
            id="pane-wipe-overlay"
            className="absolute inset-0 z-20 pointer-events-none overflow-hidden"
          >
            {/* Right Curtain: Real Satellite Image clipped by wipePosition */}
            <div
              className="absolute inset-0 pointer-events-auto"
              style={{
                clipPath: `inset(0 0 0 ${wipePosition}%)`,
              }}
            >
              <RealImageComparisonPanel
                imageSrc={comparisonImageSrc}
                imageFileName={comparisonImageName}
                darkMode={darkMode}
                onImageChange={onComparisonImageChange}
              />
            </div>

            {/* Draggable Vertical Wipe Line */}
            <div
              style={{ left: `${wipePosition}%` }}
              onMouseDown={(e) => {
                e.preventDefault();
                setIsDraggingWipe(true);
              }}
              className="absolute top-0 bottom-0 w-1 bg-white cursor-col-resize pointer-events-auto z-40 shadow-[0_0_12px_rgba(255,255,255,0.8)] -translate-x-1/2 flex items-center justify-center group"
            >
              <div className="w-8 h-8 rounded-full bg-white text-neutral-900 border-2 border-indigo-600 shadow-2xl flex items-center justify-center font-mono text-[10px] font-bold group-hover:scale-125 transition-transform">
                ◧
              </div>
            </div>

            {/* Floating Wipe Helper / Opacity Slider above bottom coordinates bar */}
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex items-center gap-3 px-4 py-2 rounded-2xl border shadow-2xl backdrop-blur-xl bg-black/85 border-white/20 text-white text-xs">
              <span className="text-neutral-400 font-mono">3D Mesh</span>
              <input
                type="range"
                min="0"
                max="100"
                value={wipePosition}
                onChange={(e) => setWipePosition(Number(e.target.value))}
                className="w-36 sm:w-48 accent-indigo-500 cursor-pointer"
              />
              <span className="text-emerald-400 font-mono">Real Satellite PNG</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
