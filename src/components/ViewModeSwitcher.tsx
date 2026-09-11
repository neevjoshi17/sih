import React from 'react';
import {
  Box,
  Columns2,
  Layers,
  Image as ImageIcon,
} from 'lucide-react';
import type { CompareViewMode } from './LeftDockToolbar';

interface ViewModeSwitcherProps {
  currentMode: CompareViewMode;
  onModeChange: (mode: CompareViewMode) => void;
  darkMode?: boolean;
}

interface ModeOption {
  id: CompareViewMode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const MODES: ModeOption[] = [
  {
    id: 'single-3d',
    label: '3D Mesh',
    icon: Box,
  },
  {
    id: 'side-by-side',
    label: 'Side-by-Side',
    icon: Columns2,
    badge: 'Real PNG',
  },
  {
    id: 'wipe',
    label: 'Wipe / Blend',
    icon: Layers,
  },
  {
    id: 'image-only',
    label: 'Real PNG',
    icon: ImageIcon,
  },
];

export const ViewModeSwitcher: React.FC<ViewModeSwitcherProps> = ({
  currentMode,
  onModeChange,
  darkMode = true,
}) => {
  return (
    <nav
      id="view-mode-switcher"
      aria-label="Viewport Comparison Modes"
      className="absolute top-5 left-1/2 -translate-x-1/2 z-30 pointer-events-auto select-none"
    >
      <div
        className={`flex items-center p-1 rounded-2xl border shadow-2xl backdrop-blur-xl transition-all duration-200 ${
          darkMode
            ? 'bg-neutral-950/90 border-white/20 text-neutral-300 shadow-black/80'
            : 'bg-white/95 border-slate-300 text-slate-700 shadow-slate-300/60 shadow-xl'
        }`}
      >
        {MODES.map((mode) => {
          const Icon = mode.icon;
          const isActive = currentMode === mode.id;

          return (
            <button
              key={mode.id}
              id={`btn-mode-${mode.id}`}
              type="button"
              onClick={() => onModeChange(mode.id)}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 whitespace-nowrap active:scale-95 ${
                isActive
                  ? darkMode
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/40 ring-1 ring-indigo-400'
                    : 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                  : darkMode
                  ? 'text-neutral-400 hover:text-white hover:bg-white/10'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title={`Switch to ${mode.label} mode`}
              aria-pressed={isActive}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'opacity-75'}`} />
              <span>{mode.label}</span>
              {mode.badge && (
                <span
                  className={`hidden sm:inline-block px-1.5 py-0.2 rounded-full text-[9px] font-mono tracking-tight transition-colors ${
                    isActive
                      ? 'bg-emerald-400 text-neutral-950 font-bold'
                      : darkMode
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {mode.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
