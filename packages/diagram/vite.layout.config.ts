import { defineConfig } from 'vite';
// Opt-in layout bundle for @fsaldivar.dev/diagram/layout (auto/organic/radial/merge/resolveOverlaps; no format parsers).
export default defineConfig({
  build: { lib: { entry: 'src/layout-entry.ts', formats: ['es'], fileName: () => 'layout.js' }, emptyOutDir: false, minify: true },
});
