import { useRef, useState, type DragEvent } from 'react';
import { useEditor } from '../store';
import { getTemplate, type ElementDef } from '../templates/catalog';
import { TEXT_FONTS } from '../runtime/types';
import { generateImage, getApiKey, setApiKey } from '../lib/aiImage';

// Curated game-friendly palette + custom picker.
const SWATCHES = ['#ff4d6d', '#ff8a3d', '#fcb514', '#3fd6a8', '#28b6e8', '#7c5cff', '#ff5da2', '#ffffff'];

const AI_STYLES: { label: string; suffix: string }[] = [
  { label: 'Cartoon', suffix: 'bold cartoon style, vibrant colors, glossy' },
  { label: 'Pixel', suffix: '16-bit pixel art style, crisp pixels' },
  { label: '3D', suffix: '3D rendered, soft studio lighting, toy-like' },
  { label: 'Doodle', suffix: 'hand-drawn doodle style, thick playful outlines' },
];

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

// The edit-mode inspector: one cohesive panel — element tabs on top, art zone,
// colors, AI generation, text controls. Replaces the old popover + chips.
export function Inspector() {
  const { config, activeElement, setActiveElement, addText } = useEditor();
  const template = getTemplate(config.templateId);

  // default selection so the panel is never empty
  const selected = activeElement ?? template.elements[0]?.key ?? 'background';
  const def = template.elements.find((e) => e.key === selected) ?? null;
  const isBg = selected === 'background';
  const isText = selected.startsWith('text:');
  const text = isText ? config.texts.find((t) => t.id === selected.slice(5)) : null;

  return (
    <aside className="inspector">
      <div className="insp-tabs">
        {template.elements.map((e) => (
          <button
            key={e.key}
            className={'insp-tab' + (selected === e.key ? ' on' : '')}
            onClick={() => setActiveElement(e.key)}
          >
            {e.label}
          </button>
        ))}
        <button
          className={'insp-tab' + (isBg ? ' on' : '')}
          onClick={() => setActiveElement('background')}
        >
          Background
        </button>
        {config.texts.map((t) => (
          <button
            key={t.id}
            className={'insp-tab' + (selected === 'text:' + t.id ? ' on' : '')}
            onClick={() => setActiveElement('text:' + t.id)}
          >
            T·{t.content.length > 7 ? t.content.slice(0, 7) + '…' : t.content}
          </button>
        ))}
        <button className="insp-tab add" onClick={addText}>＋ Text</button>
      </div>

      {isText && text ? (
        <TextControls textId={text.id} />
      ) : (
        <ElementControls key={selected} elementKey={selected} def={def} isBg={isBg} />
      )}
    </aside>
  );
}

// ---------- element (art + color) ----------

function ElementControls({ elementKey, def, isBg }: { elementKey: string; def: ElementDef | null; isBg: boolean }) {
  const { config, set, setImage, setColor, setBgImage } = useEditor();
  const canImage = isBg || !!def?.image;
  const canColor = isBg || !!def?.color;
  const imageUrl = isBg ? config.brand.bgImage : config.images[elementKey];
  const color = isBg ? config.brand.bgColor : config.colors[elementKey] ?? config.brand.primaryColor;

  function apply(url: string | null) {
    if (isBg) setBgImage(url);
    else setImage(elementKey, url);
  }

  return (
    <div className="insp-body">
      {canImage && (
        <section>
          <h4>Art</h4>
          <ArtZone imageUrl={imageUrl ?? null} isBg={isBg} subject={def?.label ?? 'Background'} onApply={apply} />
        </section>
      )}
      {canColor && (
        <section>
          <h4>Color</h4>
          <Swatches
            value={color}
            onPick={(hex) => (isBg ? set('brand', { bgColor: hex }) : setColor(elementKey, hex))}
          />
        </section>
      )}
    </div>
  );
}

// Drop zone + upload + AI generation, with the current art as the hero.
function ArtZone({ imageUrl, isBg, subject, onApply }: {
  imageUrl: string | null;
  isBg: boolean;
  subject: string;
  onApply: (url: string | null) => void;
}) {
  const { config } = useEditor();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [style, setStyle] = useState(AI_STYLES[0]);
  const [prompt, setPrompt] = useState(() =>
    isBg ? `Vibrant ${config.brand.name} game background scene, portrait, depth, no text` : `${subject} for a mobile game, single subject, centered`
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<string | null>(null); // AI result awaiting accept
  const [hasKey, setHasKey] = useState(() => !!getApiKey());
  const [keyDraft, setKeyDraft] = useState('');

  async function handleFiles(files: FileList | null) {
    const f = files?.[0];
    if (!f || !f.type.startsWith('image/')) return;
    onApply(await readFileAsDataUrl(f));
    setDraft(null);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    void handleFiles(e.dataTransfer.files);
  }

  async function handleGenerate() {
    setBusy(true);
    setError(null);
    try {
      const url = await generateImage({
        prompt: `${prompt}, ${style.suffix}`,
        aspect: isBg ? '9:16' : '1:1',
        removeBg: !isBg,
      });
      setDraft(url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const shown = draft ?? imageUrl;

  return (
    <>
      <div
        className={'artzone' + (dragOver ? ' over' : '') + (busy ? ' busy' : '') + (isBg ? ' tall' : '')}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => { if (!shown && !busy) fileRef.current?.click(); }}
      >
        {busy ? (
          <div className="artzone-empty"><span className="spin">✨</span>Painting…</div>
        ) : shown ? (
          <>
            <img src={shown} alt={subject} />
            {draft ? (
              <div className="art-accept">
                <button className="primary" onClick={() => { onApply(draft); setDraft(null); }}>✓ Use</button>
                <button onClick={() => setDraft(null)}>Discard</button>
              </div>
            ) : (
              <div className="art-hover">
                <button onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}>Replace</button>
                <button onClick={(e) => { e.stopPropagation(); onApply(null); }}>Remove</button>
              </div>
            )}
          </>
        ) : (
          <div className="artzone-empty">
            <span>🖼️</span>
            Drop an image<br />or click to browse
          </div>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => void handleFiles(e.target.files)} />

      <div className="art-actions">
        <button onClick={() => fileRef.current?.click()}>⬆ Upload</button>
        <button className={'ai-btn' + (aiOpen ? ' on' : '')} onClick={() => setAiOpen(!aiOpen)}>✨ AI</button>
      </div>

      {aiOpen && (
        !hasKey ? (
          <div className="ai-block">
            <p className="tip">Free key at aistudio.google.com → “Get API key”. Stored only in your browser.</p>
            <input placeholder="Paste Gemini API key…" value={keyDraft} onChange={(e) => setKeyDraft(e.target.value)} />
            <button className="primary" disabled={!keyDraft.trim()}
              onClick={() => { setApiKey(keyDraft.trim()); setHasKey(true); }}>
              Save key
            </button>
          </div>
        ) : (
          <div className="ai-block">
            <div className="style-chips">
              {AI_STYLES.map((s) => (
                <button key={s.label} className={'style-chip' + (style.label === s.label ? ' on' : '')}
                  onClick={() => setStyle(s)}>
                  {s.label}
                </button>
              ))}
            </div>
            <textarea rows={2} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
            <button className="primary" disabled={busy || !prompt.trim()} onClick={handleGenerate}>
              {busy ? 'Generating…' : draft ? '↻ Regenerate' : '⚡ Generate'}
            </button>
            {error && <p className="ai-error">{error}</p>}
          </div>
        )
      )}
    </>
  );
}

function Swatches({ value, onPick }: { value: string; onPick: (hex: string) => void }) {
  return (
    <div className="swatches">
      {SWATCHES.map((hex) => (
        <button
          key={hex}
          className={'swatch' + (value.toLowerCase() === hex ? ' on' : '')}
          style={{ background: hex }}
          onClick={() => onPick(hex)}
          aria-label={hex}
        />
      ))}
      <label className="swatch custom" title="Custom color">
        <input type="color" value={value} onChange={(e) => onPick(e.target.value)} />
        <span style={{ background: value }} />
      </label>
    </div>
  );
}

// ---------- text overlay controls ----------

function TextControls({ textId }: { textId: string }) {
  const { config, updateText, removeText } = useEditor();
  const text = config.texts.find((t) => t.id === textId)!;

  return (
    <div className="insp-body">
      <section>
        <h4>Text</h4>
        <input className="text-input" value={text.content} onChange={(e) => updateText(textId, { content: e.target.value })} />
        <div className="text-row">
          <select value={text.font ?? 'Arial'} style={{ fontFamily: text.font ?? 'Arial' }}
            onChange={(e) => updateText(textId, { font: e.target.value })}>
            {TEXT_FONTS.map((f) => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
          </select>
          <span className="size-val">{text.size}px</span>
        </div>
        <input type="range" min={14} max={64} value={text.size} onChange={(e) => updateText(textId, { size: +e.target.value })} />
        <p className="tip">Drag the text on the phone to place it.</p>
      </section>
      <section>
        <h4>Color</h4>
        <Swatches value={text.color} onPick={(hex) => updateText(textId, { color: hex })} />
      </section>
      <button className="danger" onClick={() => removeText(textId)}>🗑 Delete this text</button>
    </div>
  );
}
