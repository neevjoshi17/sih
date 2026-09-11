/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { FloatingControls } from './components/FloatingControls';
import { KushSurfaceViewer, type KushControls } from './components/KushSurfaceViewer';
import { CoordinatesOverlay } from './components/CoordinatesOverlay';
import { LeftDockToolbar, type CompareViewMode } from './components/LeftDockToolbar';
import { ViewModeSwitcher } from './components/ViewModeSwitcher';
import { HomeScreen } from './components/HomeScreen';
import { ColabSettingsModal } from './components/ColabSettingsModal';
import { ColabProcessingOverlay } from './components/ColabProcessingOverlay';
import {
  renderTerrainWithColab,
  isGeoTiff,
  isOpticalImage,
  checkColabHealth,
  getColabBaseUrl,
} from './utils/colabApi';
import { injectIframeBridgeScript } from './utils/iframeBridge';
import { Box } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<'home' | 'viewer'>('home');
  const [fileUrl, setFileUrl] = useState<string>('/kushimage.html');
  const [fileName, setFileName] = useState<string>('kushimage.html');
  const [wireframe, setWireframe] = useState<boolean>(false);
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [darkMode, setDarkMode] = useState<boolean>(true);

  // Side-by-Side Satellite Comparison State
  const [compareMode, setCompareMode] = useState<CompareViewMode>('side-by-side');
  const [comparisonImageSrc, setComparisonImageSrc] = useState<string>('/final_color_image.png');
  const [comparisonImageName, setComparisonImageName] = useState<string>('final_color_image_8bit.tif');

  // Google Colab Processing State
  const [isColabProcessing, setIsColabProcessing] = useState<boolean>(false);
  const [colabProcessingFileName, setColabProcessingFileName] = useState<string>('');
  const [activeSourceFile, setActiveSourceFile] = useState<File | null>(null);
  const [colabRenderMode, setColabRenderMode] = useState<'3d-mesh' | 'ground-view'>('3d-mesh');
  const [colabError, setColabError] = useState<string | null>(null);
  const [isColabSettingsOpen, setIsColabSettingsOpen] = useState<boolean>(false);
  const [colabHealth, setColabHealth] = useState<'connected' | 'checking' | 'disconnected'>('checking');

  const kushControlsRef = useRef<KushControls | null>(null);

  // Check Colab server health on startup
  useEffect(() => {
    checkColabHealth().then((res) => {
      setColabHealth(res.ok ? 'connected' : 'disconnected');
    });
  }, []);

  const handleResetCamera = useCallback(() => {
    kushControlsRef.current?.resetCamera();
  }, []);

  const handleZoomIn = useCallback(() => {
    kushControlsRef.current?.zoomIn();
  }, []);

  const handleZoomOut = useCallback(() => {
    kushControlsRef.current?.zoomOut();
  }, []);

  const handleToggleAutoRotate = useCallback(() => {
    setAutoRotate((prev) => !prev);
  }, []);

  const handleWireframeToggle = useCallback(() => {
    setWireframe((prev) => !prev);
  }, []);

  const handleToggleCompareMode = useCallback(() => {
    setCompareMode((prev) => (prev === 'side-by-side' ? 'single-3d' : 'side-by-side'));
  }, []);

  const handleFileUpload = useCallback((url: string, name: string) => {
    setFileUrl(url);
    setFileName(name);
    setActiveSourceFile(null);
    setCurrentView('viewer');
  }, []);

  const handleComparisonImageChange = useCallback((url: string, name: string) => {
    setComparisonImageSrc(url);
    setComparisonImageName(name);
  }, []);

  const handleResetToDefault = useCallback(() => {
    setFileUrl('/kushimage.html');
    setFileName('kushimage.html');
    setActiveSourceFile(null);
    setComparisonImageSrc('/final_color_image.png');
    setComparisonImageName('final_color_image_8bit.tif');
    setCompareMode('side-by-side');
  }, []);

  const handleToggleDarkMode = useCallback(() => {
    setDarkMode((prev) => !prev);
  }, []);

  const handleGoHome = useCallback(() => {
    setCurrentView('home');
  }, []);

  const handleEnterViewer = useCallback(() => {
    setCurrentView('viewer');
  }, []);

  /**
   * Unified processor for user image files (GeoTIFF, PNG, JPG, or HTML).
   * Automatically invokes the Google Colab FastAPI service and assigns modes.
   */
  const handleProcessImageFile = useCallback(
    async (file: File, _modeHint?: 'geo' | 'non-geo', renderModeOverride?: '3d-mesh' | 'ground-view') => {
      // 1. Direct HTML 3D scene files
      if (file.name.endsWith('.html') || file.type === 'text/html') {
        const reader = new FileReader();
        reader.onload = (e) => {
          const rawHtml = (e.target?.result as string) || '';
          const processedHtml = injectIframeBridgeScript(rawHtml);
          const blob = new Blob([processedHtml], { type: 'text/html' });
          const objectUrl = URL.createObjectURL(blob);
          handleFileUpload(objectUrl, file.name);
        };
        reader.readAsText(file);
        return;
      }

      // 2. Colab Terrain Rendering Pipeline for GeoTIFF (.tif) and Optical (.png/.jpg)
      const targetRenderMode = renderModeOverride || colabRenderMode;
      setIsColabProcessing(true);
      setColabError(null);
      setColabProcessingFileName(file.name);

      try {
        const result = await renderTerrainWithColab(file, {
          mode: targetRenderMode,
          maxPoints: 120,
        });

        // Store active state
        setFileUrl(result.blobUrl);
        setActiveSourceFile(file);
        setColabRenderMode(result.modeUsed);
        setColabHealth('connected');

        if (isOpticalImage(file)) {
          // PNG / JPG: set as satellite comparison texture and switch to side-by-side
          const imgUrl = URL.createObjectURL(file);
          setComparisonImageSrc(imgUrl);
          setComparisonImageName(file.name);
          setFileName(`[Satellite 3D] ${file.name}`);
          setCompareMode('side-by-side');
        } else if (isGeoTiff(file)) {
          // GeoTIFF: set 3D DEM mode
          setFileName(`[GeoTIFF DEM] ${file.name}`);
          setCompareMode('single-3d');
        } else {
          setFileName(file.name);
          setCompareMode('single-3d');
        }

        setCurrentView('viewer');
      } catch (err) {
        console.error('Colab processing error:', err);
        setColabError(err instanceof Error ? err.message : 'Unknown error communicating with Google Colab');
        setColabHealth('disconnected');
      } finally {
        setIsColabProcessing(false);
      }
    },
    [colabRenderMode, handleFileUpload]
  );

  /**
   * Toggle between Aerial 3D Mesh and Ground-Level Perspective for the current uploaded file.
   */
  const handleToggleColabRenderMode = useCallback(() => {
    if (!activeSourceFile) return;
    const nextMode = colabRenderMode === '3d-mesh' ? 'ground-view' : '3d-mesh';
    setColabRenderMode(nextMode);
    handleProcessImageFile(activeSourceFile, undefined, nextMode);
  }, [activeSourceFile, colabRenderMode, handleProcessImageFile]);

  const handleRetryColabProcessing = useCallback(() => {
    if (activeSourceFile) {
      handleProcessImageFile(activeSourceFile);
    }
  }, [activeSourceFile, handleProcessImageFile]);

  return (
    <>
      {/* 1. Home Screen View */}
      {currentView === 'home' && (
        <HomeScreen
          darkMode={darkMode}
          onToggleDarkMode={handleToggleDarkMode}
          onEnterViewer={handleEnterViewer}
          onFileUpload={handleFileUpload}
          onProcessImageFile={handleProcessImageFile}
          isProcessing={isColabProcessing}
          processingStatus={colabProcessingFileName ? `Processing ${colabProcessingFileName}...` : ''}
          currentFileName={fileName}
        />
      )}

      {/* 2. 3D Surface Model Viewer View */}
      {currentView === 'viewer' && (
        <div
          id="app-root-container"
          className={`relative w-screen h-screen overflow-hidden font-sans antialiased select-none transition-colors duration-300 ${
            darkMode ? 'bg-black text-white' : 'bg-[#f8fafc] text-slate-900'
          }`}
        >
          {/* Top-Left Model & Elevation Badge */}
          <div
            id="top-left-model-badge"
            className="absolute top-5 left-5 z-30 pointer-events-auto select-none flex items-center gap-2"
          >
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md border text-xs shadow-xl transition-colors duration-200 ${
                darkMode
                  ? 'bg-black/85 border-white/20 text-white shadow-black/50'
                  : 'bg-white/90 border-slate-200 text-slate-800 shadow-slate-200/60'
              }`}
            >
              <Box className="w-3.5 h-3.5 text-indigo-400" />
              <span className="font-medium text-xs truncate max-w-[200px]" title={fileName}>
                {fileName === 'kushimage.html' ? '3D DEM Elevation Surface' : fileName}
              </span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                  darkMode ? 'bg-white/10 text-neutral-400' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {colabRenderMode === 'ground-view' ? 'Ground' : '3D Topo'}
              </span>
            </div>
          </div>

          {/* Left Dock Toolbar */}
          <LeftDockToolbar
            wireframe={wireframe}
            onWireframeToggle={handleWireframeToggle}
            onResetCamera={handleResetCamera}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            autoRotate={autoRotate}
            onToggleAutoRotate={handleToggleAutoRotate}
            darkMode={darkMode}
            onGoHome={handleGoHome}
            compareMode={compareMode}
            onToggleCompareMode={handleToggleCompareMode}
            colabRenderMode={colabRenderMode}
            onToggleColabRenderMode={activeSourceFile ? handleToggleColabRenderMode : undefined}
            hasUploadedFile={!!activeSourceFile}
          />

          {/* Top-Center Mode Switcher: 3D Mesh | Side-by-Side | Wipe / Blend | Real PNG */}
          <ViewModeSwitcher
            currentMode={compareMode}
            onModeChange={setCompareMode}
            darkMode={darkMode}
          />

          {/* Bottom-Center Floating Geographic Coordinates */}
          <CoordinatesOverlay darkMode={darkMode} />

          {/* Floating Profile & Plus Actions in Top-Right Corner */}
          <FloatingControls
            currentFileName={fileName}
            onFileUpload={handleFileUpload}
            onProcessImageFile={handleProcessImageFile}
            onOpenColabSettings={() => setIsColabSettingsOpen(true)}
            colabHealth={colabHealth}
            isProcessing={isColabProcessing}
            onResetToDefault={handleResetToDefault}
            darkMode={darkMode}
            onToggleDarkMode={handleToggleDarkMode}
            onResetCamera={handleResetCamera}
            onGoHome={handleGoHome}
          />

          {/* Main 3D Surface Viewport */}
          <main id="main-viewport" className="w-full h-full relative">
            <KushSurfaceViewer
              fileUrl={fileUrl}
              fileName={fileName}
              autoRotate={autoRotate}
              wireframe={wireframe}
              darkMode={darkMode}
              compareMode={compareMode}
              onCompareModeChange={setCompareMode}
              comparisonImageSrc={comparisonImageSrc}
              comparisonImageName={comparisonImageName}
              onComparisonImageChange={handleComparisonImageChange}
              onControlsReady={(controls) => {
                kushControlsRef.current = controls;
              }}
            />
          </main>
        </div>
      )}

      {/* Global Google Colab Processing Overlay */}
      <ColabProcessingOverlay
        isProcessing={isColabProcessing}
        fileName={colabProcessingFileName}
        file={activeSourceFile}
        mode={colabRenderMode}
        error={colabError}
        onDismissError={() => setColabError(null)}
        onRetry={handleRetryColabProcessing}
        onOpenSettings={() => {
          setColabError(null);
          setIsColabSettingsOpen(true);
        }}
        darkMode={darkMode}
      />

      {/* Google Colab Server URL Configuration Modal */}
      <ColabSettingsModal
        isOpen={isColabSettingsOpen}
        onClose={() => setIsColabSettingsOpen(false)}
        darkMode={darkMode}
        onServerUrlChange={() => {
          checkColabHealth().then((res) => {
            setColabHealth(res.ok ? 'connected' : 'disconnected');
          });
        }}
      />
    </>
  );
}
