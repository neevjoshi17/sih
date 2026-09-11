/**
 * Client service to communicate with the Google Colab GeoTIFF 3D Terrain Service.
 * Supports rendering 3D topographic meshes and ground-level perspective views.
 */

import { injectIframeBridgeScript } from './iframeBridge';

export const DEFAULT_COLAB_URL = 'https://enviable-shown-shawl.ngrok-free.dev';
const STORAGE_KEY = 'custom_colab_url';

/**
 * Returns the currently active Colab API endpoint.
 * Priority: localStorage > import.meta.env.VITE_COLAB_API_URL > '/api/colab' (Vite proxy)
 */
export function getColabBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && saved.trim()) {
      return saved.trim().replace(/\/+$/, '');
    }
  }

  const envUrl = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_COLAB_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // Use local Vite dev proxy which avoids CORS
  return '/api/colab';
}

/**
 * Set or clear a custom Colab API URL in localStorage.
 */
export function setCustomColabUrl(url: string | null) {
  if (typeof window === 'undefined') return;
  if (!url || !url.trim()) {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, url.trim().replace(/\/+$/, ''));
  }
}

/**
 * Test connectivity with the Colab server.
 */
export async function checkColabHealth(urlOverride?: string): Promise<{ ok: boolean; statusText?: string }> {
  const baseUrl = urlOverride || getColabBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/`, {
      method: 'GET',
      headers: {
        'ngrok-skip-browser-warning': 'true',
        'Accept': 'application/json',
      },
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({ status: 'Active' }));
      return { ok: true, statusText: data.status || 'Colab API Active' };
    }
    return { ok: false, statusText: `HTTP ${res.status}: ${res.statusText}` };
  } catch (err) {
    // If a direct URL was attempted and failed (e.g. CORS), attempt fallback through proxy
    if (baseUrl !== '/api/colab') {
      try {
        const proxyRes = await fetch('/api/colab/', {
          headers: { 'ngrok-skip-browser-warning': 'true' },
        });
        if (proxyRes.ok) {
          return { ok: true, statusText: 'Colab API Active (via Proxy)' };
        }
      } catch {
        // Fall through
      }
    }
    return { ok: false, statusText: err instanceof Error ? err.message : 'Connection failed' };
  }
}

/**
 * Checks if a file is a GeoTIFF format.
 */
export function isGeoTiff(file: File | string): boolean {
  const name = typeof file === 'string' ? file.toLowerCase() : file.name.toLowerCase();
  return (
    name.endsWith('.tif') ||
    name.endsWith('.tiff') ||
    name.endsWith('.geotiff') ||
    name.endsWith('.dem') ||
    name.endsWith('.img') ||
    (typeof file !== 'string' && file.type === 'image/tiff')
  );
}

/**
 * Checks if a file is a standard optical/raster image (PNG, JPG, WebP, etc.).
 */
export function isOpticalImage(file: File | string): boolean {
  const name = typeof file === 'string' ? file.toLowerCase() : file.name.toLowerCase();
  return (
    name.endsWith('.png') ||
    name.endsWith('.jpg') ||
    name.endsWith('.jpeg') ||
    name.endsWith('.webp') ||
    name.endsWith('.bmp') ||
    (typeof file !== 'string' && file.type.startsWith('image/'))
  );
}

export interface RenderTerrainOptions {
  mode?: '3d-mesh' | 'ground-view';
  maxPoints?: number;
  baseUrlOverride?: string;
}

/**
 * Sends a GeoTIFF or PNG/JPG image to Google Colab and returns the processed HTML.
 */
export async function renderTerrainWithColab(
  file: File,
  options: RenderTerrainOptions = {}
): Promise<{
  html: string;
  blobUrl: string;
  modeUsed: '3d-mesh' | 'ground-view';
}> {
  const mode = options.mode || '3d-mesh';
  const maxPoints = options.maxPoints || 120;
  const baseUrl = options.baseUrlOverride || getColabBaseUrl();
  const endpoint = `${baseUrl}/render/${mode}?max_points=${maxPoints}`;

  const formData = new FormData();
  formData.append('file', file, file.name);

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'ngrok-skip-browser-warning': 'true',
      },
      body: formData,
    });
  } catch (fetchErr) {
    // If direct request failed (e.g. CORS or network), try proxy fallback if not already using proxy
    if (baseUrl !== '/api/colab') {
      const fallbackEndpoint = `/api/colab/render/${mode}?max_points=${maxPoints}`;
      try {
        response = await fetch(fallbackEndpoint, {
          method: 'POST',
          headers: {
            'ngrok-skip-browser-warning': 'true',
          },
          body: formData,
        });
      } catch {
        throw new Error(
          `Could not connect to Colab API at ${baseUrl}. Ensure your Colab notebook is running and ngrok tunnel is open.`
        );
      }
    } else {
      throw fetchErr;
    }
  }

  if (!response.ok) {
    let errorDetail = `Server returned status ${response.status}`;
    try {
      const errJson = await response.json();
      if (errJson.detail) {
        errorDetail = errJson.detail;
      }
    } catch {
      const text = await response.text();
      if (text) errorDetail = text.slice(0, 200);
    }
    throw new Error(`Colab processing failed: ${errorDetail}`);
  }

  const rawHtml = await response.text();

  // Inject our interactive bridge script for responsive sizing, coordinates, and theme sync
  const processedHtml = injectIframeBridgeScript(rawHtml);
  const blob = new Blob([processedHtml], { type: 'text/html' });
  const blobUrl = URL.createObjectURL(blob);

  return {
    html: processedHtml,
    blobUrl,
    modeUsed: mode,
  };
}
