import { PlayableGame } from './game';
import type { PlayableConfig } from './types';
import type { StartOptions } from './game';

// Global entrypoint exposed by the IIFE build (public/runtime.iife.js).
// Loaded by both the editor preview and the exported ad bundle.
const api = {
  start(config: PlayableConfig, mount: HTMLElement, opts?: StartOptions) {
    const game = new PlayableGame();
    void game.start(config, mount, opts);
    return game;
  },
};

(window as unknown as { PlayableRuntime: typeof api }).PlayableRuntime = api;

export default api;
