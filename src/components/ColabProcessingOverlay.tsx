import React, { useEffect, useState } from 'react';
import {
  Mountain,
  Layers,
  AlertCircle,
  X,
  RefreshCw,
  Server,
  Compass,
  FileImage,
} from 'lucide-react';
import { isGeoTiff } from '../utils/colabApi';

interface ColabProcessingOverlayProps {
  isProcessing: boolean;
  fileName?: string;
  file?: File | null;
  mode?: '3d-mesh' | 'ground-view';
  error?: string | null;
  onDismissError?: () => void;
  onRetry?: () => void;
  onOpenSettings?: () => void;
  darkMode: boolean;
}

const PROCESSING_STEPS = [
  'Uploading image to Google Colab...',
  'Reading raster bands with Rasterio...',
  'Calculating elevation matrix (RGB luminance)...',
  'Applying Gaussian filter elevation smoothing...',
  'Constructing Plotly 3D topographic surface...',
  'Finalizing interactive controls & camera view...',
];

export const ColabProcessingOverlay: React.FC<ColabProcessingOverlayProps> = ({
  isProcessing,
  fileName,
  file,
  mode = '3d-mesh',
  error,
  onDismissError,
  onRetry,
  onOpenSettings,
  darkMode,
}) => {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (!isProcessing) {
      setStepIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setStepIndex((prev) => (prev < PROCESSING_STEPS.length - 1 ? prev + 1 : prev));
    }, 1800);
    return () => clearInterval(interval);
  }, [isProcessing]);

  if (!isProcessing && !error) return null;

  const isGeo = file ? isGeoTiff(file) : fileName ? isGeoTiff(fileName) : false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xl animate-in fade-in duration-200 select-none">
      <div
        className={`relative w-full max-w-md rounded-3xl border shadow-2xl p-6 sm:p-8 text-center transition-all ${
          darkMode
            ? 'bg-neutral-950/90 border-white/20 text-white shadow-black/80'
            : 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-300/60'
        }`}
      >
        {error ? (
          /* Error State */
          <div className="space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center bg-rose-500/20 border border-rose-500/40 text-rose-400">
              <AlertCircle className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-lg font-bold">Colab Processing Failed</h3>
              <p className={`text-xs mt-1.5 leading-relaxed ${darkMode ? 'text-neutral-300' : 'text-slate-600'}`}>
                {error}
              </p>
            </div>

            <div
              className={`p-3 rounded-xl border text-xs text-left leading-relaxed ${
                darkMode ? 'bg-white/5 border-white/10 text-neutral-400' : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              <p className="font-semibold text-white mb-1">Troubleshooting Tips:</p>
              <ul className="list-disc list-inside space-y-1 pl-1 text-[11px]">
                <li>Verify your Google Colab cell is actively running.</li>
                <li>If Colab restarted, ngrok generated a new URL. Update it in settings.</li>
                <li>Make sure the uploaded image is not corrupted.</li>
              </ul>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              {onOpenSettings && (
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium border transition-colors ${
                    darkMode ? 'border-white/20 hover:bg-white/10 text-white' : 'border-slate-300 hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  <Server className="w-3.5 h-3.5" />
                  <span>Check Server URL</span>
                </button>
              )}

              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry</span>
                </button>
              )}

              {onDismissError && (
                <button
                  type="button"
                  onClick={onDismissError}
                  className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                    darkMode ? 'text-neutral-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Close
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Processing State */
          <div className="space-y-5">
            {/* Animated 3D Topographic Ring Loader */}
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20 animate-ping" />
              <div className="absolute inset-1 rounded-full border-2 border-sky-400/40 border-t-sky-400 animate-spin" />
              <div className="absolute inset-3 rounded-full border-2 border-indigo-400/60 border-b-indigo-500 animate-spin [animation-duration:1.5s]" />
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-indigo-600/30 border border-indigo-400/50 text-indigo-300 shadow-xl shadow-indigo-500/20">
                <Mountain className="w-5 h-5 animate-pulse" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  Google Colab Engine
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider font-semibold bg-sky-500/20 text-sky-300 border border-sky-400/30">
                  {mode === 'ground-view' ? 'Ground Perspective' : '3D Topo Mesh'}
                </span>
              </div>

              <h3 className="text-base sm:text-lg font-bold tracking-tight">
                Generating 3D Topography
              </h3>
              <p className={`text-xs mt-1 font-mono truncate px-4 ${darkMode ? 'text-neutral-400' : 'text-slate-500'}`} title={fileName}>
                {fileName || (isGeo ? 'GeoTIFF Elevation Raster' : 'Satellite Imagery')}
              </p>
            </div>

            {/* Dynamic Step Progression */}
            <div className={`p-3.5 rounded-2xl border text-left ${darkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center justify-between mb-2 text-xs">
                <span className="font-semibold text-indigo-400">Processing Pipeline</span>
                <span className="font-mono text-[10px] opacity-70">
                  Step {stepIndex + 1} of {PROCESSING_STEPS.length}
                </span>
              </div>

              <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden mb-2.5">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-sky-400 h-full transition-all duration-700 rounded-full"
                  style={{ width: `${((stepIndex + 1) / PROCESSING_STEPS.length) * 100}%` }}
                />
              </div>

              <p className={`text-xs font-medium flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse shrink-0" />
                <span>{PROCESSING_STEPS[stepIndex]}</span>
              </p>
            </div>

            <p className={`text-[11px] leading-relaxed ${darkMode ? 'text-neutral-400' : 'text-slate-500'}`}>
              Parsing multi-spectral bands & smoothing elevation contours. This takes ~3 to 8 seconds depending on raster resolution.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
