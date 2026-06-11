import { useMemo, useRef } from 'react';
import { useEditor } from '../store';
import { RuntimeMount } from '../components/RuntimeMount';
import { getTemplate, type ElementDef } from '../templates/catalog';
import { TEXT_FONTS } from '../runtime/types';
import { AIGenerate } from './AIGenerate';

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

// The live phone preview. In edit mode the game plays at full speed briefly,
// then eases into slow motion so moving elements are easy to tap. Tap an
// element (or its chip below the phone) to edit it; drag text to reposition.
export function Preview() {
  const { config, previewKey, editMode, activeElement, toggleEditMode, setActiveElement, updateText, addText } = useEditor();
  const template = getTemplate(config.templateId);

  const elementLabels = useMemo(() => {
    const m: Record<string, string> = { background: 'Background' };
    template.elements.forEach((e) => { m[e.key] = e.label; });
    config.texts.forEach((t) => {
      const snippet = t.content.length > 10 ? t.content.slice(0, 10) + '…' : t.content;
      m['text:' + t.id] = `“${snippet}” · drag me`;
    });
    return m;
  }, [template, config.texts]);

  return (
    <div className="preview-area">
      <div className="phone-wrap">
        <div className={'phone' + (editMode ? ' editing' : '')}>
          <div className="phone-screen">
            <RuntimeMount
              config={config}
              remountKey={previewKey}
              editMode={editMode}
              elementLabels={elementLabels}
              onElementTap={(key) => setActiveElement(key)}
              onTextMove={(id, x, y) => updateText(id, { x, y })}
              onCta={(url) => alert('CTA tapped → would open: ' + url)}
            />
          </div>
        </div>
        <button className={'edit-toggle' + (editMode ? ' on' : '')} onClick={toggleEditMode}>
          {editMode ? '✓ Done editing' : '✎ Edit elements'}
        </button>

        {editMode && (
          <div className="chips">
            {template.elements.map((e) => (
              <button
                key={e.key}
                className={'chip' + (activeElement === e.key ? ' active' : '')}
                onClick={() => setActiveElement(e.key)}
              >
                ✎ {e.label}
              </button>
            ))}
            <button
              className={'chip' + (activeElement === 'background' ? ' active' : '')}
              onClick={() => setActiveElement('background')}
            >
              ✎ Background
            </button>
            {config.texts.map((t) => (
              <button
                key={t.id}
                className={'chip' + (activeElement === 'text:' + t.id ? ' active' : '')}
                onClick={() => setActiveElement('text:' + t.id)}
              >
                T “{t.content.length > 8 ? t.content.slice(0, 8) + '…' : t.content}”
              </button>
            ))}
            <button className="chip add" onClick={addText}>＋ Add text</button>
          </div>
        )}

        <p className="hint">
          {editMode
            ? 'Slow-mo on — tap any glowing element (or a chip) to edit it · drag text to move it'
            : 'Live preview · same runtime that ships in the export'}
        </p>
      </div>

      {editMode && activeElement && (
        <ElementPopover
          elementKey={activeElement}
          def={template.elements.find((e) => e.key === activeElement) ?? null}
          onClose={() => setActiveElement(null)}
        />
      )}
    </div>
  );
}

function ElementPopover({ elementKey, def, onClose }: { elementKey: string; def: ElementDef | null; onClose: () => void }) {
  const { config, set, setImage, setColor, setBgImage, updateText, removeText } = useEditor();
  const fileRef = useRef<HTMLInputElement>(null);
  const isBg = elementKey === 'background';
  const isText = elementKey.startsWith('text:');
  const textId = isText ? elementKey.slice(5) : null;
  const text = isText ? config.texts.find((t) => t.id === textId) : null;
  const title = isBg ? 'Background' : isText ? 'Text' : def?.label ?? elementKey;
  const imageUrl = isBg ? config.brand.bgImage : config.images[elementKey];

  if (isText && !text) return null; // deleted while open

  return (
    <div className="popover" key={elementKey}>
      <div className="popover-head">
        <h3>✎ {title}</h3>
        <button className="close" onClick={onClose}>✕</button>
      </div>

      {isText && text && (
        <>
          <div className="popover-row">
            <span>Text</span>
            <input value={text.content} onChange={(e) => updateText(text.id, { content: e.target.value })} />
          </div>
          <div className="popover-row">
            <span>Font</span>
            <select
              value={text.font ?? 'Arial'}
              style={{ fontFamily: text.font ?? 'Arial' }}
              onChange={(e) => updateText(text.id, { font: e.target.value })}
            >
              {TEXT_FONTS.map((f) => (
                <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
              ))}
            </select>
          </div>
          <div className="popover-row">
            <span>Size: {text.size}px</span>
            <input type="range" min={14} max={64} value={text.size}
              onChange={(e) => updateText(text.id, { size: +e.target.value })} />
          </div>
          <div className="popover-row">
            <span>Color</span>
            <input type="color" value={text.color} onChange={(e) => updateText(text.id, { color: e.target.value })} />
          </div>
          <p className="popover-tip">Drag the text on the phone to place it.</p>
          <button className="danger" onClick={() => removeText(text.id)}>🗑 Delete text</button>
        </>
      )}

      {(isBg || def?.image) && (
        <div className="popover-row">
          <span>{isBg ? 'Image' : 'Replace with your art'}</span>
          {imageUrl && <img className="thumb" src={imageUrl} alt="current" />}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const url = await readFileAsDataUrl(f);
              if (isBg) setBgImage(url);
              else setImage(elementKey, url);
            }}
          />
          {imageUrl && (
            <button
              className="link-btn"
              onClick={() => {
                if (isBg) setBgImage(null);
                else setImage(elementKey, null);
                if (fileRef.current) fileRef.current.value = '';
              }}
            >
              ✕ Remove image
            </button>
          )}
          <AIGenerate
            subject={title}
            gameName={config.brand.name}
            isBackground={isBg}
            onApply={(url) => {
              if (isBg) setBgImage(url);
              else setImage(elementKey, url);
            }}
          />
        </div>
      )}

      {(isBg || def?.color) && (
        <div className="popover-row">
          <span>Color</span>
          <input
            type="color"
            value={isBg ? config.brand.bgColor : config.colors[elementKey] ?? config.brand.primaryColor}
            onChange={(e) => {
              if (isBg) set('brand', { bgColor: e.target.value });
              else setColor(elementKey, e.target.value);
            }}
          />
        </div>
      )}
    </div>
  );
}
