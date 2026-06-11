import { useEffect, useRef } from 'react';
import type { PlayableConfig, RuntimeStartOptions } from '../runtime/types';
import { ensureRuntime } from '../lib/runtimeLoader';

interface Props {
  config: PlayableConfig;
  demo?: boolean;
  onCta?: (url: string) => void;
  editMode?: boolean;
  onElementTap?: (key: string) => void;
  elementLabels?: Record<string, string>;
  // Change this value to force a fresh remount (e.g. "replay").
  remountKey?: unknown;
}

// Mounts a playable into a div using the shared runtime. Cleans up its Pixi
// context on unmount / config change, so many of these can coexist (gallery).
export function RuntimeMount({ config, demo, onCta, editMode, onElementTap, elementLabels, remountKey }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let game: { destroy: () => void } | null = null;
    let cancelled = false;
    const el = ref.current!;
    const opts: RuntimeStartOptions = { demo, onCta, editMode, onElementTap, elementLabels };
    ensureRuntime()
      .then(() => {
        if (cancelled) return;
        el.innerHTML = '';
        game = window.PlayableRuntime!.start(config, el, opts);
      })
      .catch((e) => {
        el.innerHTML = `<div class="runtime-error">${(e as Error).message}</div>`;
      });
    return () => {
      cancelled = true;
      game?.destroy();
      el.innerHTML = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, demo, editMode, remountKey]);

  return <div className="runtime-mount" ref={ref} />;
}
