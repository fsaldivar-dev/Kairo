import { defineConfig } from 'vite';
// Opt-in minimap bundle for @fsaldivar.dev/diagram/minimap (public API only; decoupled from core).
export default defineConfig({
  build: { lib: { entry: 'src/minimap-entry.ts', formats: ['es'], fileName: () => 'minimap.js' }, emptyOutDir: false, minify: true },
});
