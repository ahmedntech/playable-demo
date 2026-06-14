import { useEffect, useMemo, useRef, useState } from 'react';
import { useEditor } from '../store';
import { TEMPLATES, type TemplateMeta } from '../templates/catalog';
import { DEFAULT_CONFIG, type PlayableConfig } from '../runtime/types';
import { RuntimeMount } from '../components/RuntimeMount';
import { PreviewBoundary } from '../components/PreviewBoundary';
import { registerPreview } from '../lib/previewManager';

export function Gallery() {
  const chooseTemplate = useEditor((s) => s.chooseTemplate);
  return (
    <div className="gallery">
      <div className="gallery-head">
        <h1>Choose a template</h1>
        <p>Live previews — pick one and customize it for your brand in minutes.</p>
      </div>
      <div className="grid">
        {TEMPLATES.map((t) => (
          <TemplateCard key={t.id} meta={t} onPick={() => chooseTemplate(t.id)} />
        ))}
      </div>
    </div>
  );
}

function TemplateCard({ meta, onPick }: { meta: TemplateMeta; onPick: () => void }) {
  // The preview manager caps how many cards run a live WebGL context at once
  // (the nearest-to-center MAX), so big screens never exhaust GL contexts.
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    return registerPreview(ref.current, setInView);
  }, []);
  // Each visible card auto-plays the real runtime in demo mode, tinted with
  // the template's accent — no canned video to keep in sync.
  const demoConfig = useMemo<PlayableConfig>(
    () => ({
      ...DEFAULT_CONFIG,
      templateId: meta.id,
      brand: { ...DEFAULT_CONFIG.brand, primaryColor: meta.accent, bgColor: meta.bg },
    }),
    [meta.id, meta.accent, meta.bg]
  );

  return (
    <div className="card">
      <div className="card-preview" style={{ borderColor: meta.accent }} ref={ref}>
        {(() => {
          const poster = <div className="card-sleep" style={{ background: `linear-gradient(170deg, ${meta.bg}, #0b1116)` }} />;
          return inView ? (
            <PreviewBoundary fallback={poster}>
              <RuntimeMount config={demoConfig} demo />
            </PreviewBoundary>
          ) : poster;
        })()}
        <span className="genre" style={{ background: meta.accent }}>{meta.genre}</span>
      </div>
      <div className="card-body">
        <h3>{meta.name}</h3>
        <p>{meta.tagline}</p>
        <button className="primary" onClick={onPick}>Customize this →</button>
      </div>
    </div>
  );
}
