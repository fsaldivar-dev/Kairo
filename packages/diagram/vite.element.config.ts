import { defineConfig } from 'vite';
// Opt-in Web Component bundle for @fsaldivar.dev/diagram/element.
export default defineConfig({
  build: { lib: { entry: 'src/element-entry.ts', formats: ['es'], fileName: () => 'element.js' }, emptyOutDir: false, minify: true },
});
