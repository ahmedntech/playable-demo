import { useMemo } from 'react';
import { useEditor } from '../store';
import { TEMPLATES, type TemplateMeta } from '../templates/catalog';
import { DEFAULT_CONFIG, type PlayableConfig } from '../runtime/types';
import { RuntimeMount } from '../components/RuntimeMount';

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
  // Each card auto-plays the real runtime in demo mode, tinted with the
  // template's accent — no canned video to keep in sync.
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
      <div className="card-preview" style={{ borderColor: meta.accent }}>
        <RuntimeMount config={demoConfig} demo />
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
