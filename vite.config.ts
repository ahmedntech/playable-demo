import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Editor app (the no-code builder UI). The playable runtime is built
// separately into /public/runtime.iife.js so the SAME runtime powers both
// the live preview and the exported ad bundle.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
});
