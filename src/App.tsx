import { useEditor } from './store';
import { Editor } from './editor/Editor';
import { Preview } from './editor/Preview';
import { Gallery } from './editor/Gallery';
import { WolfMark } from './components/Brand';

export default function App() {
  const view = useEditor((s) => s.view);

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <WolfMark />
          <span className="wordmark">big<strong>wolf</strong></span>
          <span className="divider" />
          <span className="product">Playable Studio</span>
        </div>
        <span className="tag">Build interactive ads in minutes</span>
      </header>

      {view === 'gallery' ? (
        <Gallery />
      ) : (
        <div className="workspace">
          <Editor />
          <div className="stage-wrap">
            <Preview />
            <p className="hint">Live preview · same runtime that ships in the export</p>
          </div>
        </div>
      )}

      <footer className="footer">
        <WolfMark size={16} />
        <span>Powered by <strong>bigwolf</strong> · Playable Studio</span>
      </footer>
    </div>
  );
}
