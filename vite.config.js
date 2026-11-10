import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// Relative base so the built site works from any folder or sub-path.
// Two pages: the landing page and the community page.
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 900,
    assetsInlineLimit: 0,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        community: resolve(import.meta.dirname, 'community/index.html'),
      },
    },
  },
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
});
