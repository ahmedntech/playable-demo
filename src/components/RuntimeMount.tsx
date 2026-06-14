import { useEffect, useRef } from 'react';
import type { PlayableConfig, RuntimeStartOptions } from '../runtime/types';
import { ensureRuntime, type RuntimeHandle } from '../lib/runtimeLoader';

interface Props {
  config: PlayableConfig;
  demo?: boolean;
  onCta?: (url: string) => void;
  editMode?: boolean;
  onElementTap?: (key: string) => void;
  onTextMove?: (id: string, x: number, y: number) => void;
  elementLabels?: Record<string, string>;
  // Change this value to force a fresh remount (e.g. "replay").
  remountKey?: unknown;
}

// True when only the `texts` array differs — the store replaces section
// objects by reference, so reference equality is an exact change detector.
function textsOnlyDiff(a: PlayableConfig, b: PlayableConfig) {
  return (
    a.templateId === b.templateId &&
    a.brand === b.brand &&
    a.cta === b.cta &&
    a.gameplay === b.gameplay &&
    a.endCard === b.endCard &&
    a.images === b.images &&
    a.colors === b.colors
  );
}

// Mounts a playable into a div using the shared runtime. Structural config
// changes remount the game; text-only changes live-patch it (no flash, no
// slow-mo warm-up restart while typing or dragging text).
export function RuntimeMount({ config, demo, onCta, editMode, onElementTap, onTextMove, elementLabels, remountKey }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const gameRef = useRef<RuntimeHandle | null>(null);
  const latest = useRef({ config, elementLabels });
  latest.current = { config, elementLabels };

  // Track the last *structural* config: text-only changes keep the same ref,
  // so the mount effect below doesn't re-run for them.
  const structRef = useRef(config);
  if (structRef.current !== config && !textsOnlyDiff(structRef.current, config)) {
    structRef.current = config;
  }
  const structConfig = structRef.current;

  useEffect(() => {
    let game: RuntimeHandle | null = null;
    let cancelled = false;
    const el = ref.current!;
    ensureRuntime()
      .then(() => {
        if (cancelled) return;
        el.innerHTML = '';
        const opts: RuntimeStartOptions = {
          demo,
          onCta,
          editMode,
          onElementTap,
          onTextMove,
          elementLabels: latest.current.elementLabels,
        };
        game = window.PlayableRuntime!.start(latest.current.config, el, opts);
        gameRef.current = game;
      })
      .catch((e) => {
        try { el.innerHTML = `<div class="runtime-error">${(e as Error).message}</div>`; } catch { /* ignore */ }
      });
    return () => {
      cancelled = true;
      // destroy() can throw if the GL context was already lost — must never
      // propagate out of a React cleanup or it unmounts the whole app.
      try { game?.destroy(); } catch { /* ignore */ }
      gameRef.current = null;
      try { el.innerHTML = ''; } catch { /* ignore */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structConfig, demo, editMode, remountKey]);

  // Fast path: live-patch text overlays on the running game.
  useEffect(() => {
    try { gameRef.current?.applyTexts?.(config.texts, elementLabels); } catch { /* ignore */ }
  }, [config, elementLabels]);

  return <div className="runtime-mount" ref={ref} />;
}
