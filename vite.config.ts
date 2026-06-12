import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Editor app (the no-code builder UI). The playable runtime is built
// separately into /public/runtime.iife.js so the SAME runtime powers both
// the live preview and the exported ad bundle.
export default defineConfig({
  plugins: [react()],
  // This project's home port is 6789 (5173 belongs to other local projects);
  // PORT can still override it when set by a launcher.
  server: { port: Number(process.env.PORT) || 6789 },
});
