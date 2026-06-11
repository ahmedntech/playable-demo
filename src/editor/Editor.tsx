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

export function Editor() {
  const { config, set, restart, backToGallery } = useEditor();
  const [network, setNetwork] = useState('applovin');
  const [status, setStatus] = useState<string | null>(null);
  const template = getTemplate(config.templateId);

  async function handleExport() {
    setStatus('Building bundle…');
    try {
      const res = await exportPlayable(config, network);
      const kb = (res.bytes / 1024).toFixed(0);
      const limitMb = (res.spec.maxBytes / 1024 / 1024).toFixed(0);
      if (!res.ok) {
        setStatus(`⚠️ ${kb} KB exceeds ${res.spec.label}'s ${limitMb} MB limit`);
        return;
      }
      downloadHtml(res.html, `${config.brand.name.replace(/\s+/g, '-').toLowerCase()}-${network}.html`);
      setStatus(`✓ Exported ${kb} KB (limit ${limitMb} MB) for ${res.spec.label}`);
    } catch (e) {
      setStatus('✕ ' + (e as Error).message);
    }
  }

  return (
    <div className="panel">
      <button className="back" onClick={backToGallery}>← All templates</button>
      <h1>{template.name}</h1>
      <p className="sub">{template.genre} · customize it — preview updates live.</p>

      <Section title="Brand">
        <Field label="Game name">
          <input value={config.brand.name} onChange={(e) => set('brand', { name: e.target.value })} />
        </Field>
        <Field label="Logo (intro screen)">
          <input
            type="file"
            accept="image/*"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) set('brand', { logoDataUrl: await readFileAsDataUrl(f) });
            }}
          />
        </Field>
        <Field label="Primary color">
          <input type="color" value={config.brand.primaryColor} onChange={(e) => set('brand', { primaryColor: e.target.value })} />
        </Field>
      </Section>

      <Section title="Elements">
        <p className="aside">
          Use <strong>✎ Edit elements</strong> on the preview — tap the {template.elements.map((e) => e.label.toLowerCase()).join(', ')} or
          the background directly to restyle or replace them.
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
          <button onClick={restart}>↻ Replay preview</button>
          <button className="primary" onClick={handleExport}>⬇ Export ad</button>
        </div>
        {status && <p className="status">{status}</p>}
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
