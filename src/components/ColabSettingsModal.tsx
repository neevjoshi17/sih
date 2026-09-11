import React, { useState, useEffect } from 'react';
import {
  X,
  Server,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Save,
  RotateCcw,
} from 'lucide-react';
import {
  getColabBaseUrl,
  setCustomColabUrl,
  checkColabHealth,
  DEFAULT_COLAB_URL,
} from '../utils/colabApi';

interface ColabSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
  onServerUrlChange?: (url: string) => void;
}

export const ColabSettingsModal: React.FC<ColabSettingsModalProps> = ({
  isOpen,
  onClose,
  darkMode,
  onServerUrlChange,
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [healthStatus, setHealthStatus] = useState<{
    tested: boolean;
    ok: boolean;
    message: string;
  }>({
    tested: false,
    ok: false,
    message: '',
  });

  useEffect(() => {
    if (isOpen) {
      const active = getColabBaseUrl();
      setUrlInput(active === '/api/colab' ? DEFAULT_COLAB_URL : active);
      testUrl(active === '/api/colab' ? DEFAULT_COLAB_URL : active);
    }
  }, [isOpen]);

  const testUrl = async (urlToTest: string) => {
    setIsChecking(true);
    setHealthStatus({ tested: false, ok: false, message: 'Pinging Colab server...' });
    const res = await checkColabHealth(urlToTest);
    setIsChecking(false);
    setHealthStatus({
      tested: true,
      ok: res.ok,
      message: res.ok
        ? `Connected: ${res.statusText || 'Server active'}`
        : `Connection failed: ${res.statusText || 'Server unreachable'}`,
    });
  };

  const handleSave = () => {
    const trimmed = urlInput.trim().replace(/\/+$/, '');
    if (trimmed === DEFAULT_COLAB_URL || !trimmed) {
      setCustomColabUrl(null);
      onServerUrlChange?.(DEFAULT_COLAB_URL);
    } else {
      setCustomColabUrl(trimmed);
      onServerUrlChange?.(trimmed);
    }
    onClose();
  };

  const handleResetDefault = () => {
    setUrlInput(DEFAULT_COLAB_URL);
    testUrl(DEFAULT_COLAB_URL);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`relative w-full max-w-lg rounded-3xl border shadow-2xl p-6 sm:p-7 overflow-hidden transition-all ${
          darkMode
            ? 'bg-neutral-950/95 border-white/20 text-white shadow-black/80'
            : 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-300/50'
        }`}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${
                darkMode
                  ? 'bg-indigo-500/20 border-indigo-400/30 text-indigo-400'
                  : 'bg-indigo-50 border-indigo-200 text-indigo-600'
              }`}
            >
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Google Colab Server API</h2>
              <p className={`text-xs ${darkMode ? 'text-neutral-400' : 'text-slate-500'}`}>
                FastAPI Topographic & DEM Processing Endpoint
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              darkMode ? 'hover:bg-white/10 text-neutral-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'
            }`}
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body content */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider text-neutral-400">
              Public API URL (ngrok tunnel)
            </label>
            <div className="relative flex items-center">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://xxxx-xxxx.ngrok-free.dev"
                className={`w-full px-4 py-2.5 rounded-xl border text-sm font-mono transition-all outline-none pr-24 ${
                  darkMode
                    ? 'bg-black/60 border-white/20 text-white focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/50'
                    : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/50'
                }`}
              />
              <button
                type="button"
                onClick={() => testUrl(urlInput.trim())}
                disabled={isChecking}
                className={`absolute right-1.5 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  darkMode
                    ? 'bg-white/15 hover:bg-white/25 text-white'
                    : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                }`}
              >
                <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
                <span>Test</span>
              </button>
            </div>
          </div>

          {/* Test Status Banner */}
          {healthStatus.tested && (
            <div
              className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs ${
                healthStatus.ok
                  ? darkMode
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : darkMode
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {healthStatus.ok ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              )}
              <span className="font-medium truncate">{healthStatus.message}</span>
            </div>
          )}

          {/* Features note */}
          <div
            className={`p-3.5 rounded-2xl border text-xs space-y-2 leading-relaxed ${
              darkMode ? 'bg-white/5 border-white/10 text-neutral-300' : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}
          >
            <div className="flex items-center gap-2 font-semibold text-indigo-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Automatic Format & Mode Assignment:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 pl-1 text-[11px]">
              <li>
                <strong className="text-white">GeoTIFF (.tif/.dem):</strong> Dispatched to <code className="text-sky-300">/render/3d-mesh</code>, opens in standalone 3D terrain viewer.
              </li>
              <li>
                <strong className="text-white">PNG / JPG Satellite Photo:</strong> Dispatched to <code className="text-sky-300">/render/3d-mesh</code>, sets side-by-side satellite image comparison.
              </li>
              <li>
                <strong className="text-white">Perspective Switch:</strong> Toggle between 3D Aerial Mesh and Ground-Level view directly from the left dock toolbar!
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-5 mt-5 border-t border-white/10 gap-3">
          <button
            type="button"
            onClick={handleResetDefault}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
              darkMode ? 'text-neutral-400 hover:text-white hover:bg-white/10' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Default</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-xl text-xs font-medium transition-colors ${
                darkMode ? 'hover:bg-white/10 text-neutral-300' : 'hover:bg-slate-100 text-slate-700'
              }`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save & Apply</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
