import { defineConfig } from 'vite';

// Relative base so the built site works from any folder or sub-path.
export default defineConfig({
  base: './',
  build: { target: 'es2020', chunkSizeWarningLimit: 900, assetsInlineLimit: 0 },
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
});
