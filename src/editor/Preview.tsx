import { useMemo, useRef } from 'react';
import { useEditor } from '../store';
import { RuntimeMount } from '../components/RuntimeMount';
import { getTemplate, type ElementDef } from '../templates/catalog';

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

// The live phone preview. In edit mode the game keeps auto-playing while every
// editable element glows with a label — tap one (or empty space for the
// background) and a popover appears with just that element's controls.
export function Preview() {
  const { config, previewKey, editMode, activeElement, toggleEditMode, setActiveElement } = useEditor();
  const template = getTemplate(config.templateId);

  const elementLabels = useMemo(() => {
    const m: Record<string, string> = { background: 'Background' };
    template.elements.forEach((e) => { m[e.key] = e.label; });
    return m;
  }, [template]);

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
              onCta={(url) => alert('CTA tapped → would open: ' + url)}
            />
          </div>
        </div>
        <button className={'edit-toggle' + (editMode ? ' on' : '')} onClick={toggleEditMode}>
          {editMode ? '✓ Done editing' : '✎ Edit elements'}
        </button>
        <p className="hint">
          {editMode
            ? 'Tap a glowing element to restyle it · tap empty space for the background'
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
  const { config, set, setImage, setColor, setBgImage } = useEditor();
  const fileRef = useRef<HTMLInputElement>(null);
  const isBg = elementKey === 'background';
  const title = isBg ? 'Background' : def?.label ?? elementKey;
  const hasImage = isBg ? !!config.brand.bgImage : !!config.images[elementKey];

  return (
    <div className="popover" key={elementKey}>
      <div className="popover-head">
        <h3>✎ {title}</h3>
        <button className="close" onClick={onClose}>✕</button>
      </div>

      {(isBg || def?.image) && (
        <div className="popover-row">
          <span>{isBg ? 'Image' : 'Replace with your art'}</span>
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
          {hasImage && (
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
