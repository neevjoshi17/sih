import React, { useState, useRef, useEffect } from 'react';
import {
  Globe,
  Plus,
  User,
  Upload,
  RotateCcw,
  Moon,
  Sun,
  FileCode,
  Server,
  Radio,
} from 'lucide-react';
import { injectIframeBridgeScript } from '../utils/iframeBridge';
import { isGeoTiff, isOpticalImage } from '../utils/colabApi';

interface FloatingControlsProps {
  currentFileName: string;
  onFileUpload: (url: string, name: string) => void;
  onProcessImageFile?: (file: File) => void;
  onOpenColabSettings?: () => void;
  colabHealth?: 'connected' | 'checking' | 'disconnected';
  isProcessing?: boolean;
  onResetToDefault: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onResetCamera?: () => void;
  onGoHome?: () => void;
}

export const FloatingControls: React.FC<FloatingControlsProps> = ({
  currentFileName,
  onFileUpload,
  onProcessImageFile,
  onOpenColabSettings,
  colabHealth = 'connected',
  isProcessing = false,
  onResetToDefault,
  darkMode,
  onToggleDarkMode,
  onGoHome,
}) => {
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (plusMenuRef.current && !plusMenuRef.current.contains(target)) {
        setIsPlusMenuOpen(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(target)) {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFile = (file: File) => {
    if (file.name.endsWith('.html') || file.type === 'text/html') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const rawHtml = (e.target?.result as string) || '';
        const processedHtml = injectIframeBridgeScript(rawHtml);
        const blob = new Blob([processedHtml], { type: 'text/html' });
        const objectUrl = URL.createObjectURL(blob);
        onFileUpload(objectUrl, file.name);
        setIsPlusMenuOpen(false);
      };
      reader.readAsText(file);
    } else if (isGeoTiff(file) || isOpticalImage(file) || onProcessImageFile) {
      setIsPlusMenuOpen(false);
      onProcessImageFile?.(file);
    } else {
      alert('Please upload a GeoTIFF (.tif/.tiff), Satellite Image (.png/.jpg), or 3D .html file.');
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  return (
    <div
      id="floating-top-right-controls"
      className="absolute top-5 right-5 z-40 flex items-center gap-2.5 pointer-events-auto select-none"
    >
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".html,.htm,.tif,.tiff,.geotiff,.dem,.img,.png,.jpg,.jpeg,.webp"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Return to Globe Home Screen Button */}
      {onGoHome && (
        <button
          id="btn-floating-home"
          type="button"
          onClick={onGoHome}
          className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 backdrop-blur-md shadow-xl border ${
            darkMode
              ? 'bg-black/85 hover:bg-neutral-900 text-sky-400 border-white/20 hover:border-sky-400/60 hover:scale-105 active:scale-95'
              : 'bg-white/90 hover:bg-white text-sky-600 border-slate-200 hover:border-sky-400 hover:scale-105 active:scale-95 shadow-md'
          }`}
          title="Return to 3D Globe Home Screen"
          aria-label="Return to 3D Globe Home Screen"
        >
          <Globe className="w-5 h-5" />
        </button>
      )}

      {/* Floating Plus / New Button */}
      <div ref={plusMenuRef} className="relative">
        <button
          id="btn-floating-plus"
          type="button"
          disabled={isProcessing}
          onClick={() => {
            if (isProcessing) return;
            setIsPlusMenuOpen((prev) => !prev);
            setIsProfileMenuOpen(false);
          }}
          className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 backdrop-blur-md shadow-xl border ${
            isProcessing
              ? 'bg-indigo-600/40 border-indigo-400 text-white cursor-wait'
              : isPlusMenuOpen
              ? darkMode
                ? 'bg-white text-black border-white ring-2 ring-white/40'
                : 'bg-slate-900 text-white border-slate-900 ring-2 ring-slate-400'
              : darkMode
              ? 'bg-black/85 hover:bg-neutral-900 text-white border-white/20 hover:border-white/50 hover:scale-105 active:scale-95'
              : 'bg-white/90 hover:bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:scale-105 active:scale-95 shadow-md'
          }`}
          title="Upload New GeoTIFF, Image or 3D Model"
          aria-label="Upload New GeoTIFF, Image or 3D Model"
          aria-expanded={isPlusMenuOpen}
        >
          {isProcessing ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Plus className={`w-5 h-5 transition-transform duration-200 ${isPlusMenuOpen ? 'rotate-45' : ''} ${isPlusMenuOpen ? (darkMode ? 'text-black' : 'text-white') : (darkMode ? 'text-white' : 'text-slate-800')}`} />
          )}
        </button>

        {/* Floating Menu for Plus Button */}
        {isPlusMenuOpen && (
          <div
            id="menu-floating-plus-dropdown"
            className={`absolute right-0 mt-3 w-80 rounded-2xl backdrop-blur-xl border shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150 ${
              darkMode
                ? 'bg-black/95 border-white/20 text-white shadow-black/90'
                : 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-300/50'
            }`}
          >
            {/* Header */}
            <div className={`flex items-center justify-between pb-2.5 mb-3 border-b ${
              darkMode ? 'border-white/15' : 'border-slate-200'
            }`}>
              <div className="flex items-center gap-2">
                <FileCode className={`w-4 h-4 ${darkMode ? 'text-white' : 'text-slate-900'}`} />
                <span className={`text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  Upload Elevation / Image
                </span>
              </div>
              <span className={`text-[9px] px-2 py-0.5 rounded-full font-mono font-medium ${
                darkMode ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/30' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
              }`}>
                Colab AI
              </span>
            </div>

            {/* Drag and Drop Zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center p-5 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-150 mb-3 text-center ${
                isDragging
                  ? 'border-indigo-500 bg-indigo-50/20 scale-[1.02]'
                  : darkMode
                  ? 'border-white/25 hover:border-white bg-white/5 hover:bg-white/10'
                  : 'border-slate-300 hover:border-slate-800 bg-slate-50 hover:bg-slate-100'
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-transform hover:scale-110 ${
                darkMode ? 'bg-white/15 text-white' : 'bg-slate-200 text-slate-800'
              }`}>
                <Upload className="w-5 h-5" />
              </div>
              <p className={`text-xs font-medium mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Drop <span className="font-semibold text-indigo-400">GeoTIFF</span>, <span className="font-semibold text-sky-400">PNG</span>, or HTML here
              </p>
              <p className={`text-[10px] ${darkMode ? 'text-neutral-400' : 'text-slate-500'}`}>
                Auto-generates 3D surface mesh using Google Colab FastAPI
              </p>
            </div>

            {/* Colab Status Mini Badge */}
            {onOpenColabSettings && (
              <button
                type="button"
                onClick={() => {
                  setIsPlusMenuOpen(false);
                  onOpenColabSettings();
                }}
                className={`w-full flex items-center justify-between p-2 rounded-xl mb-2 text-xs border transition-colors ${
                  darkMode
                    ? 'bg-white/5 border-white/10 hover:bg-white/10 text-neutral-300'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    colabHealth === 'connected'
                      ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]'
                      : colabHealth === 'checking'
                      ? 'bg-amber-400 animate-pulse'
                      : 'bg-rose-500'
                  }`} />
                  <span className="text-[11px] font-medium">Google Colab Server</span>
                </div>
                <span className="text-[10px] opacity-70 underline">Configure</span>
              </button>
            )}

            {/* Current Loaded File Indicator & Reset */}
            <div className={`p-2.5 rounded-xl border mb-2 flex items-center justify-between ${
              darkMode ? 'bg-white/5 border-white/15' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center gap-2 overflow-hidden mr-2">
                <span className={`w-2 h-2 rounded-full shrink-0 animate-pulse ${
                  darkMode ? 'bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]' : 'bg-emerald-500'
                }`} />
                <div className="truncate text-left">
                  <p className={`text-[10px] uppercase tracking-wide font-medium ${darkMode ? 'text-neutral-400' : 'text-slate-500'}`}>
                    Active Model
                  </p>
                  <p className={`text-xs font-mono font-semibold truncate ${darkMode ? 'text-white' : 'text-slate-900'}`} title={currentFileName}>
                    {currentFileName}
                  </p>
                </div>
              </div>

              {currentFileName !== 'kushimage.html' && (
                <button
                  type="button"
                  onClick={() => {
                    onResetToDefault();
                    setIsPlusMenuOpen(false);
                  }}
                  className={`flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded-lg transition-colors shrink-0 ${
                    darkMode
                      ? 'text-white bg-white/15 hover:bg-white/25'
                      : 'text-slate-800 bg-slate-200 hover:bg-slate-300'
                  }`}
                  title="Restore original kushimage.html"
                >
                  <RotateCcw className={`w-3 h-3 ${darkMode ? 'text-white' : 'text-slate-800'}`} />
                  <span>Reset</span>
                </button>
              )}
            </div>

            {/* Hint */}
            <p className={`text-[10px] text-center leading-relaxed ${
              darkMode ? 'text-neutral-400' : 'text-slate-500'
            }`}>
              Auto-sizes dynamically to match the native full screen experience.
            </p>
          </div>
        )}
      </div>

      {/* Floating Profile Button */}
      <div ref={profileMenuRef} className="relative">
        <button
          id="btn-floating-profile"
          type="button"
          onClick={() => {
            setIsProfileMenuOpen((prev) => !prev);
            setIsPlusMenuOpen(false);
          }}
          className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 backdrop-blur-md shadow-xl border ${
            isProfileMenuOpen
              ? darkMode
                ? 'bg-white text-black border-white ring-2 ring-white/40'
                : 'bg-slate-900 text-white border-slate-900 ring-2 ring-slate-400'
              : darkMode
              ? 'bg-black/85 hover:bg-neutral-900 text-white border-white/20 hover:border-white/50 hover:scale-105 active:scale-95'
              : 'bg-white/90 hover:bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:scale-105 active:scale-95 shadow-md'
          }`}
          title="User Profile & Theme Settings"
          aria-label="User Profile menu"
          aria-expanded={isProfileMenuOpen}
        >
          <User className={`w-5 h-5 ${isProfileMenuOpen ? (darkMode ? 'text-black' : 'text-white') : (darkMode ? 'text-white' : 'text-slate-800')}`} />
        </button>

        {/* Floating Profile Dropdown */}
        {isProfileMenuOpen && (
          <div
            id="menu-floating-profile-dropdown"
            className={`absolute right-0 mt-3 w-64 rounded-2xl backdrop-blur-xl border shadow-2xl p-3.5 z-50 animate-in fade-in zoom-in-95 duration-150 ${
              darkMode
                ? 'bg-black/95 border-white/20 text-white shadow-black/90'
                : 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-300/50'
            }`}
          >
            {/* User Details */}
            <div className={`flex items-center gap-3 p-2.5 rounded-xl mb-3 ${
              darkMode ? 'bg-white/10' : 'bg-slate-100'
            }`}>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shadow-sm shrink-0 ${
                darkMode ? 'bg-white text-black' : 'bg-slate-900 text-white'
              }`}>
                3D
              </div>
              <div className="overflow-hidden text-left">
                <p className={`text-xs font-semibold truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  3D Spatial Viewer
                </p>
                <p className={`text-[10px] truncate ${darkMode ? 'text-neutral-400' : 'text-slate-500'}`}>
                  Interactive Terrain Studio
                </p>
              </div>
            </div>

            {/* Dark Mode Toggle Item */}
            <div className={`p-2.5 rounded-xl mb-2 border ${
              darkMode ? 'border-white/20 bg-white/5' : 'border-slate-200 bg-slate-50'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {darkMode ? (
                    <Moon className="w-4 h-4 text-indigo-400" />
                  ) : (
                    <Sun className="w-4 h-4 text-amber-500" />
                  )}
                  <div className="text-left">
                    <p className={`text-xs font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      Dark Mode
                    </p>
                    <p className={`text-[10px] ${darkMode ? 'text-neutral-400' : 'text-slate-500'}`}>
                      {darkMode ? 'Pure Black Theme' : 'Clean Light Theme'}
                    </p>
                  </div>
                </div>

                {/* Switch Button */}
                <button
                  id="btn-toggle-dark-mode"
                  type="button"
                  onClick={onToggleDarkMode}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                    darkMode ? 'bg-indigo-600 justify-end' : 'bg-slate-300 justify-start'
                  }`}
                  title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                  aria-label="Toggle Dark Mode"
                >
                  <div className={`w-4 h-4 rounded-full shadow-md flex items-center justify-center text-[8px] bg-white text-black font-bold`}>
                    {darkMode ? '●' : '○'}
                  </div>
                </button>
              </div>
            </div>

            {/* Colab Server Configuration Item */}
            {onOpenColabSettings && (
              <button
                type="button"
                onClick={() => {
                  setIsProfileMenuOpen(false);
                  onOpenColabSettings();
                }}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl mb-2 border text-left transition-colors ${
                  darkMode ? 'border-white/20 bg-white/5 hover:bg-white/10' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-indigo-400" />
                  <div>
                    <p className={`text-xs font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      Colab Server API
                    </p>
                    <p className={`text-[10px] ${darkMode ? 'text-neutral-400' : 'text-slate-500'}`}>
                      {colabHealth === 'connected' ? 'Connected & Ready' : 'Configure URL'}
                    </p>
                  </div>
                </div>
                <span className={`w-2 h-2 rounded-full ${
                  colabHealth === 'connected'
                    ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]'
                    : colabHealth === 'checking'
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-rose-500'
                }`} />
              </button>
            )}

            {/* Quick Upload action inside profile as well */}
            <button
              type="button"
              onClick={() => {
                setIsProfileMenuOpen(false);
                fileInputRef.current?.click();
              }}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors mb-1 ${
                darkMode ? 'hover:bg-white/10 text-white' : 'hover:bg-slate-100 text-slate-800'
              }`}
            >
              <span className="flex items-center gap-2">
                <Upload className={`w-3.5 h-3.5 ${darkMode ? 'text-white' : 'text-slate-700'}`} />
                <span className={darkMode ? 'text-white' : 'text-slate-800'}>Upload New File</span>
              </span>
              <span className={`text-[10px] font-mono ${darkMode ? 'text-neutral-400' : 'text-slate-400'}`}>.html</span>
            </button>

            {/* Active Model Name */}
            <div className={`px-2.5 py-1.5 rounded-lg text-[11px] flex items-center justify-between ${
              darkMode ? 'text-neutral-400' : 'text-slate-500'
            }`}>
              <span>Active File:</span>
              <span className={`font-mono font-medium truncate max-w-[120px] ${darkMode ? 'text-white' : 'text-slate-900'}`} title={currentFileName}>
                {currentFileName}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
