import { useEffect, useMemo, useRef, useState } from 'react';
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

// Mounts the live preview only while the card is near the viewport. Browsers
// cap active WebGL contexts (~16) and silently kill the oldest, so running
// all 21 previews at once blanks the early cards — and burns CPU for nothing.
function useInView<T extends HTMLElement>(marginPx = 160) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // IO only fires on rendering frames, so do one synchronous geometry check
    // up front — initially-visible cards mount immediately (and in hidden
    // tabs, where IO stays silent until the tab is shown).
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight + marginPx && r.bottom > -marginPx) setInView(true);
    const obs = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: `${marginPx}px` }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [marginPx]);
  return { ref, inView };
}

function TemplateCard({ meta, onPick }: { meta: TemplateMeta; onPick: () => void }) {
  const { ref, inView } = useInView<HTMLDivElement>();
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
        {inView ? (
          <RuntimeMount config={demoConfig} demo />
        ) : (
          <div className="card-sleep" style={{ background: `linear-gradient(170deg, ${meta.bg}, #0b1116)` }} />
        )}
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
