import { defineConfig } from 'vite';
// Opt-in theme-presets bundle for @fsaldivar.dev/diagram/themes (pure data built on the core theme; tiny).
export default defineConfig({
  build: { lib: { entry: 'src/themes-entry.ts', formats: ['es'], fileName: () => 'themes.js' }, emptyOutDir: false, minify: true },
});
