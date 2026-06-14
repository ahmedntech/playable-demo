import { useState } from 'react';
import { useEditor } from '../store';
import { NETWORKS, exportPlayable, downloadHtml } from '../export/exporter';
import { getTemplate } from '../templates/catalog';

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

const letter = (i: number) => String.fromCharCode(65 + i); // 0->A, 1->B…

export function Editor() {
  const {
    config, variants, activeVariant, brandKit,
    set, restart, backToGallery, resetProject,
    addVariant, removeVariant, switchVariant,
    saveBrandKit, applyBrandKit, clearBrandKit,
  } = useEditor();
  const [network, setNetwork] = useState('applovin');
  const [status, setStatus] = useState<string | null>(null);
  const template = getTemplate(config.templateId);
  const slug = config.brand.name.replace(/\s+/g, '-').toLowerCase() || 'playable';

  async function handleExport() {
    setStatus('Building bundle…');
    try {
      const res = await exportPlayable(config, network);
      const kb = (res.bytes / 1024).toFixed(0);
      const limitMb = (res.spec.maxBytes / 1024 / 1024).toFixed(0);
      if (!res.ok) { setStatus(`⚠️ ${kb} KB exceeds ${res.spec.label}'s ${limitMb} MB limit`); return; }
      downloadHtml(res.html, `${slug}-${network}-${letter(activeVariant)}.html`);
      setStatus(`✓ Exported variant ${letter(activeVariant)} · ${kb} KB for ${res.spec.label}`);
    } catch (e) {
      setStatus('✕ ' + (e as Error).message);
    }
  }

  async function handleExportAll() {
    setStatus(`Building ${variants.length} variants…`);
    try {
      let ok = 0;
      const warn: string[] = [];
      for (let i = 0; i < variants.length; i++) {
        const res = await exportPlayable(variants[i], network);
        if (!res.ok) { warn.push(`${letter(i)} over limit`); continue; }
        downloadHtml(res.html, `${slug}-${network}-${letter(i)}.html`);
        ok++;
      }
      setStatus(`✓ Exported ${ok}/${variants.length} variants for ${NETWORKS[network].label}` + (warn.length ? ` · ⚠️ ${warn.join(', ')}` : ''));
    } catch (e) {
      setStatus('✕ ' + (e as Error).message);
    }
  }

  return (
    <div className="panel">
      <button className="back" onClick={backToGallery}>← All templates</button>
      <h1>{template.name}</h1>
      <p className="sub">{template.genre} · customize it — preview updates live.</p>

      <Section title="Variants (A/B test)">
        <div className="var-strip">
          {variants.map((_, i) => (
            <span key={i} className={'var-chip' + (i === activeVariant ? ' on' : '')}>
              <button className="var-pick" onClick={() => switchVariant(i)}>{letter(i)}</button>
              {variants.length > 1 && (
                <button className="var-x" title="Remove variant" onClick={() => removeVariant(i)}>✕</button>
              )}
            </span>
          ))}
          {variants.length < 6 && (
            <button className="var-add" onClick={addVariant} title="Duplicate current into a new variant">＋</button>
          )}
        </div>
        <p className="aside">Editing variant <strong>{letter(activeVariant)}</strong>. Duplicate it, tweak colors/difficulty/CTA, then export the set to split-test.</p>
      </Section>

      <Section title="Brand kit">
        {brandKit ? (
          <>
            <div className="kit-row">
              <span className="kit-swatch" style={{ background: brandKit.primaryColor }} />
              {brandKit.logoDataUrl && <img className="kit-logo" src={brandKit.logoDataUrl} alt="logo" />}
              <span className="kit-name">Saved kit</span>
            </div>
            <div className="row">
              <button className="primary" onClick={applyBrandKit}>Apply to this variant</button>
              <button onClick={saveBrandKit} title="Overwrite the kit with this variant's brand">Update</button>
            </div>
            <button className="link-btn" onClick={clearBrandKit}>✕ Forget kit</button>
          </>
        ) : (
          <>
            <p className="aside">Save this playable's logo, color, font and CTA as a reusable kit — then apply it to any template in one click.</p>
            <button className="primary" onClick={saveBrandKit}>★ Save current as brand kit</button>
          </>
        )}
      </Section>

      <Section title="Brand">
        <Field label="Game name">
          <input value={config.brand.name} onChange={(e) => set('brand', { name: e.target.value })} />
        </Field>
        <Field label="Logo (intro & end card)">
          <input
            type="file"
            accept="image/*"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) set('brand', { logoDataUrl: await readFileAsDataUrl(f) });
            }}
          />
        </Field>
        {config.brand.logoDataUrl && (
          <button className="link-btn" onClick={() => set('brand', { logoDataUrl: null })}>✕ Remove logo</button>
        )}
        <Field label="Primary color">
          <input type="color" value={config.brand.primaryColor} onChange={(e) => set('brand', { primaryColor: e.target.value })} />
        </Field>
      </Section>

      <Section title="Elements">
        <p className="aside">
          Use <strong>✎ Edit elements</strong> on the preview — tap the {template.elements.map((e) => e.label.toLowerCase()).join(', ')} or
          the background directly to restyle, replace, or AI-generate them.
        </p>
      </Section>

      <Section title="Gameplay">
        <Field label={`Targets to win: ${config.gameplay.targetScore}`}>
          <input type="range" min={3} max={20} value={config.gameplay.targetScore}
            onChange={(e) => set('gameplay', { targetScore: +e.target.value })} />
        </Field>
        <Field label={`Difficulty: ${config.gameplay.difficulty}`}>
          <input type="range" min={1} max={5} value={config.gameplay.difficulty}
            onChange={(e) => set('gameplay', { difficulty: +e.target.value })} />
        </Field>
      </Section>

      <Section title="Call to action">
        <Field label="Button text">
          <input value={config.cta.text} onChange={(e) => set('cta', { text: e.target.value })} />
        </Field>
        <Field label="Store URL">
          <input value={config.cta.url} onChange={(e) => set('cta', { url: e.target.value })} />
        </Field>
        <Field label="End-card headline">
          <input value={config.endCard.headline} onChange={(e) => set('endCard', { headline: e.target.value })} />
        </Field>
      </Section>

      <Section title="Export">
        <Field label="Network">
          <select value={network} onChange={(e) => setNetwork(e.target.value)}>
            {Object.values(NETWORKS).map((n) => (
              <option key={n.id} value={n.id}>{n.label}</option>
            ))}
          </select>
        </Field>
        <div className="row">
          <button onClick={restart}>↻ Replay</button>
          <button className="primary" onClick={handleExport}>⬇ Export {letter(activeVariant)}</button>
        </div>
        {variants.length > 1 && (
          <button className="primary wide" onClick={handleExportAll}>⬇ Export all {variants.length} variants</button>
        )}
        {status && <p className="status">{status}</p>}
        <p className="aside autosave">Autosaved locally · <button className="link-btn inline" onClick={() => { if (confirm('Discard this project and start fresh?')) resetProject(); }}>start over</button></p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="section">
      <h2>{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
