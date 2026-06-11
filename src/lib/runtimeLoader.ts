import type { PlayableConfig, RuntimeStartOptions } from '../runtime/types';

// Loads the prebuilt runtime bundle (public/runtime.iife.js) once and caches it
// on window. The same bundle powers the gallery previews, the editor preview,
// and the exported ad — one source of truth.
export interface RuntimeHandle {
  destroy: () => void;
  // Live-patches text overlays without a remount (see Runner.applyTexts).
  applyTexts?: (texts: PlayableConfig['texts'], labels?: Record<string, string>) => void;
}

declare global {
  interface Window {
    PlayableRuntime?: {
      start: (c: PlayableConfig, el: HTMLElement, o?: RuntimeStartOptions) => RuntimeHandle;
    };
  }
}

let loading: Promise<void> | null = null;

export function ensureRuntime(): Promise<void> {
  if (window.PlayableRuntime) return Promise.resolve();
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = '/runtime.iife.js';
    s.dataset.runtime = '1';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load runtime — run `npm run build:runtime`'));
    document.head.appendChild(s);
  });
  return loading;
}
