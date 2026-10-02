import { defineConfig } from 'vite';
// Opt-in starter-templates bundle for @fsaldivar.dev/diagram/templates (ready-made documents; pulls layout).
export default defineConfig({
  build: { lib: { entry: 'src/templates-entry.ts', formats: ['es'], fileName: () => 'templates.js' }, emptyOutDir: false, minify: true },
});
