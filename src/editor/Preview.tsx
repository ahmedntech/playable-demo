import { useMemo } from 'react';
import { useEditor } from '../store';
import { RuntimeMount } from '../components/RuntimeMount';
import { getTemplate } from '../templates/catalog';
import { Inspector } from './Inspector';

// The live phone preview. In edit mode the game plays at full speed briefly,
// then eases into slow motion; tapping an element selects it in the inspector
// alongside, and text overlays can be dragged into place.
export function Preview() {
  const { config, previewKey, editMode, toggleEditMode, setActiveElement, updateText } = useEditor();
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
        <p className="hint">
          {editMode
            ? 'Slow-mo on · tap an element on the phone or pick a tab in the panel'
            : 'Live preview · same runtime that ships in the export'}
        </p>
      </div>

      {editMode && <Inspector />}
    </div>
  );
}
