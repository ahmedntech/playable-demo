import type { Application, Container, Texture } from 'pixi.js';
import type { PlayableConfig } from './types';

// Context handed to a template's gameplay. The Runner owns the app, the intro,
// the HUD, the score, the win condition and the end card; a Template only
// implements the round itself and calls ctx.addScore() on a successful action.
export interface GameCtx {
  app: Application;
  layer: Container; // draw all gameplay into this layer
  config: PlayableConfig;
  W: number;
  H: number;
  demo: boolean; // true = auto-playing preview loop (no scoring/win)
  addScore: (n?: number) => void;
  finish: () => void; // end the round now (e.g. on a miss) → end card; restarts in demo
  // Per-element customization (see TemplateMeta.elements):
  color: (key: string, fallback: string) => string; // user color override or fallback
  tex: (key: string) => Texture | null; // user-uploaded image as a preloaded texture, or null
  // Tag a display object as an editable element. In edit mode the runner
  // outlines marked objects each frame and routes taps on them to the editor.
  mark: (obj: Container, key: string) => void;
}

export interface Controller {
  destroy(): void; // remove tickers/listeners and free display objects
}

// A pluggable game genre. Add a new file in templates/, register it in runner.ts,
// and list its metadata in src/templates/catalog.ts — that's a whole new template.
export interface Template {
  id: string;
  start(ctx: GameCtx): Controller;
}
