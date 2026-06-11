import { Editor } from './editor/Editor';
import { Preview } from './editor/Preview';

export default function App() {
  return (
    <div className="app">
      <Editor />
      <div className="stage-wrap">
        <Preview />
        <p className="hint">Live preview · same runtime that ships in the export</p>
      </div>
    </div>
  );
}
