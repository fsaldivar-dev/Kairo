import { defineConfig } from 'vite';
// Opt-in rendering bundle for @fsaldivar.dev/diagram/export (SVG/PNG/HTML/thumbnail/legend/TikZ; no format parsers).
export default defineConfig({
  build: { lib: { entry: 'src/export-entry.ts', formats: ['es'], fileName: () => 'export.js' }, emptyOutDir: false, minify: true },
});
