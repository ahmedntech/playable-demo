import { useEffect, useRef } from 'react';
import { useEditor } from '../store';
import type { PlayableConfig } from '../runtime/types';
import type { StartOptions } from '../runtime/game';

// Loads the SAME runtime bundle the exporter ships (/runtime.iife.js), so the
// preview is byte-for-byte the gameplay the user will ship.
declare global {
  interface Window {
    PlayableRuntime?: {
      start: (c: PlayableConfig, el: HTMLElement, o?: StartOptions) => { destroy: () => void };
    };
  }
}

function ensureRuntime(): Promise<void> {
  if (window.PlayableRuntime) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-runtime]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      return;
    }
    const s = document.createElement('script');
    s.src = '/runtime.iife.js';
    s.dataset.runtime = '1';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load runtime — run `npm run build:runtime`'));
    document.head.appendChild(s);
  });
}

export function Preview() {
  const config = useEditor((s) => s.config);
  const previewKey = useEditor((s) => s.previewKey);
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let game: { destroy: () => void } | null = null;
    let cancelled = false;
    const el = mountRef.current!;
    ensureRuntime().then(() => {
      if (cancelled) return;
      el.innerHTML = '';
      game = window.PlayableRuntime!.start(config, el, {
        onCta: (url) => alert('CTA tapped → would open: ' + url),
      });
    });
    return () => {
      cancelled = true;
      game?.destroy();
      el.innerHTML = '';
    };
    // Remount on any config change or explicit restart.
  }, [config, previewKey]);

  return (
    <div className="phone">
      <div className="phone-screen" ref={mountRef} />
    </div>
  );
}
