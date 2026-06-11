import { useEditor } from './store';
import { Editor } from './editor/Editor';
import { Preview } from './editor/Preview';
import { Gallery } from './editor/Gallery';
import { BigwolfLogo } from './components/Brand';

export default function App() {
  const view = useEditor((s) => s.view);

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <BigwolfLogo height={26} className="logo" />
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
          </div>
        </div>
      )}

      <footer className="footer">
        <BigwolfLogo height={14} className="logo" />
        <span>Playable Studio · interactive ad builder</span>
      </footer>
    </div>
  );
}
