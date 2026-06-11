import { defineConfig } from 'vite';

// Builds the playable runtime as a single self-contained IIFE bundle.
// Output: public/runtime.iife.js — exposes window.PlayableRuntime.start(config, el).
// This same file is loaded by the editor preview AND inlined into exported ads,
// guaranteeing "what you preview is what you ship".
export default defineConfig({
  build: {
    lib: {
      entry: 'src/runtime/iife-entry.ts',
      name: 'PlayableRuntime',
      formats: ['iife'],
      fileName: () => 'runtime.iife.js',
    },
    outDir: 'public',
    emptyOutDir: false,
    minify: 'esbuild',
  },
});
