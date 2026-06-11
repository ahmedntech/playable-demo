import type { Application, Container } from 'pixi.js';
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
