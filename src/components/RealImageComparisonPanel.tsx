import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';

export type ImageFilterMode = 'normal' | 'contrast' | 'vegetation';

interface RealImageComparisonPanelProps {
  imageSrc?: string;
  imageFileName?: string;
  darkMode?: boolean;
  onClose?: () => void;
  onImageChange?: (newUrl: string, newName: string) => void;
  onPixelHover?: (info: { x: number; y: number; normX: number; normY: number } | null) => void;
}

export const RealImageComparisonPanel: React.FC<RealImageComparisonPanelProps> = ({
  imageSrc = '/final_color_image.png',
  imageFileName = 'final_color_image_8bit.tif',
  darkMode = true,
  onImageChange,
  onPixelHover,
}) => {
  // Image pan & zoom state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Display modes & filters
  const [filterMode, setFilterMode] = useState<ImageFilterMode>('normal');
  const [crispPixels, setCrispPixels] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Hidden canvas to sample RGB pixel values
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [imgDimensions, setImgDimensions] = useState({ width: 155, height: 137 });

  // When imageSrc changes or loads, sample pixel buffer for live cursor readout
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;
    img.onload = () => {
      setImgDimensions({ width: img.naturalWidth || 155, height: img.naturalHeight || 137 });
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        try {
          const data = ctx.getImageData(0, 0, img.naturalWidth, img.naturalHeight);
          setImageData(data);
        } catch {
          // Cross-origin fallback
        }
      }
    };
  }, [imageSrc]);

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 || e.button === 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }

    // Calculate pixel under mouse
    if (imageRef.current) {
      const rect = imageRef.current.getBoundingClientRect();
      const mouseRelX = e.clientX - rect.left;
      const mouseRelY = e.clientY - rect.top;

      if (mouseRelX >= 0 && mouseRelX <= rect.width && mouseRelY >= 0 && mouseRelY <= rect.height) {
        const normX = mouseRelX / rect.width;
        const normY = mouseRelY / rect.height;
        const px = Math.floor(normX * imgDimensions.width);
        const py = Math.floor(normY * imgDimensions.height);

        onPixelHover?.({ x: px, y: py, normX, normY });
      } else {
        onPixelHover?.(null);
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.2 : 0.83;
    setZoom((prev) => Math.min(Math.max(0.4, prev * zoomFactor), 20));
  };

  const handleResetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Filter styles
  const getFilterStyle = (): string => {
    switch (filterMode) {
      case 'contrast':
        return 'contrast(160%) brightness(105%) saturate(140%)';
      case 'vegetation':
        return 'contrast(140%) saturate(220%) hue-rotate(330deg)';
      case 'normal':
      default:
        return 'none';
    }
  };

  const cycleFilter = () => {
    if (filterMode === 'normal') setFilterMode('contrast');
    else if (filterMode === 'contrast') setFilterMode('vegetation');
    else setFilterMode('normal');
  };

  return (
    <div
      ref={containerRef}
      id="real-image-panel-root"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        setIsDragging(false);
        onPixelHover?.(null);
      }}
      onWheel={handleWheel}
      className={`relative w-full h-full overflow-hidden select-none flex flex-col items-center justify-center cursor-grab active:cursor-grabbing transition-colors duration-300 ${
        darkMode ? 'bg-neutral-950 text-neutral-100' : 'bg-neutral-100 text-neutral-800'
      }`}
    >
      {/* Subtle Background Grid Pattern */}
      <div
        className={`absolute inset-0 pointer-events-none opacity-20 ${
          darkMode
            ? 'bg-[radial-gradient(#444_1px,transparent_1px)] [background-size:20px_20px]'
            : 'bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px]'
        }`}
      />

      {/* Main Zoomed & Panned Image Surface */}
      <div
        id="real-image-pan-zoom-stage"
        className="relative flex items-center justify-center transition-transform duration-75 will-change-transform"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
        }}
      >
        <div className="relative shadow-2xl rounded-lg overflow-hidden border border-white/10">
          <img
            ref={imageRef}
            src={imageSrc}
            alt={imageFileName}
            draggable={false}
            className="block max-w-none transition-[filter] duration-200"
            style={{
              width: `${imgDimensions.width * 2.2}px`,
              height: `${imgDimensions.height * 2.2}px`,
              imageRendering: crispPixels ? 'pixelated' : 'auto',
              filter: getFilterStyle(),
            }}
          />
        </div>
      </div>

      {/* Floating Bottom Right Controls (Zoom, Reset, Filter) - Positioned safely away from all top controls */}
      <div className="absolute right-5 bottom-5 z-20 flex items-center gap-1.5 pointer-events-auto">
        <div
          className={`flex items-center gap-1 p-1 rounded-2xl border shadow-xl backdrop-blur-xl ${
            darkMode
              ? 'bg-black/85 border-white/20 text-neutral-300'
              : 'bg-white/95 border-neutral-300 text-neutral-700 shadow-md'
          }`}
        >
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(20, z * 1.3))}
            className="p-1.5 hover:bg-white/10 rounded-xl transition-colors"
            title="Zoom In"
            aria-label="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.4, z / 1.3))}
            className="p-1.5 hover:bg-white/10 rounded-xl transition-colors"
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleResetView}
            className="p-1.5 hover:bg-white/10 rounded-xl transition-colors text-xs font-mono"
            title="Reset View"
            aria-label="Reset View"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <div className={`w-px h-4 mx-0.5 ${darkMode ? 'bg-white/15' : 'bg-neutral-300'}`} />
          <button
            type="button"
            onClick={cycleFilter}
            className="flex items-center gap-1 px-2.5 py-1 hover:bg-white/10 rounded-xl text-xs font-medium transition-colors"
            title="Toggle Imagery Enhancement Filter"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
            <span className="capitalize text-[11px]">
              {filterMode === 'normal' ? 'Natural' : filterMode === 'contrast' ? 'Ridges' : 'NDVI'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
