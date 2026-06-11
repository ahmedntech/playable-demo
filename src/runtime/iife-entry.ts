import { Runner } from './runner';
import type { PlayableConfig, RuntimeStartOptions } from './types';

// Global entrypoint exposed by the IIFE build (public/runtime.iife.js).
// Loaded by both the editor preview/gallery and the exported ad bundle.
const api = {
  start(config: PlayableConfig, mount: HTMLElement, opts?: RuntimeStartOptions) {
    const runner = new Runner();
    void runner.start(config, mount, opts);
    return runner;
  },
};

(window as unknown as { PlayableRuntime: typeof api }).PlayableRuntime = api;

export default api;
