import { useState } from 'react';
import { generateImage, getApiKey, setApiKey } from '../lib/aiImage';

interface Props {
  // what we're generating art for — seeds the default prompt
  subject: string; // e.g. 'Basket', 'Background'
  gameName: string;
  isBackground: boolean;
  onApply: (dataUrl: string) => void;
}

// "✨ Generate with AI" panel inside the element popover. Nano-banana (Gemini
// image model) renders the prompt; sprites get their backdrop keyed out so
// they drop cleanly into the game.
export function AIGenerate({ subject, gameName, isBackground, onApply }: Props) {
  const [open, setOpen] = useState(false);
  const [keyDraft, setKeyDraft] = useState('');
  const [hasKey, setHasKey] = useState(() => !!getApiKey());
  const [editingKey, setEditingKey] = useState(false);
  const [prompt, setPrompt] = useState(() =>
    isBackground
      ? `Vibrant ${gameName} mobile game background, portrait, bold colors, depth, no text`
      : `${subject} for a mobile game, bold cartoon style, vibrant colors, glossy`
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function handleGenerate() {
    setBusy(true);
    setError(null);
    try {
      const url = await generateImage({
        prompt,
        aspect: isBackground ? '9:16' : '1:1',
        removeBg: !isBackground,
      });
      setResult(url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button className="ai-open" onClick={() => setOpen(true)}>✨ Generate with AI</button>
    );
  }

  if (!hasKey || editingKey) {
    return (
      <div className="ai-panel">
        <p className="popover-tip">
          Paste a Google AI Studio API key (free at aistudio.google.com → Get API key).
          It stays in your browser only.
        </p>
        <input
          placeholder="AIza…"
          value={keyDraft}
          onChange={(e) => setKeyDraft(e.target.value)}
        />
        <div className="row">
          <button
            className="primary"
            disabled={!keyDraft.trim()}
            onClick={() => { setApiKey(keyDraft.trim()); setHasKey(true); setEditingKey(false); setKeyDraft(''); }}
          >
            Save key
          </button>
          {hasKey && <button onClick={() => setEditingKey(false)}>Cancel</button>}
        </div>
      </div>
    );
  }

  return (
    <div className="ai-panel">
      <span className="ai-title">✨ Nano-banana {isBackground ? 'background' : 'sprite'}</span>
      <textarea rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
      <div className="row">
        <button className="primary" disabled={busy || !prompt.trim()} onClick={handleGenerate}>
          {busy ? '⏳ Generating…' : result ? '↻ Regenerate' : '⚡ Generate'}
        </button>
      </div>
      {error && <p className="ai-error">{error}</p>}
      {result && (
        <div className="ai-result">
          <img src={result} alt="generated" />
          <button className="primary" onClick={() => onApply(result)}>✓ Use this</button>
        </div>
      )}
      <button className="link-btn" onClick={() => setEditingKey(true)}>change API key</button>
    </div>
  );
}
