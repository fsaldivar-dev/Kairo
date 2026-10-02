import { defineConfig } from 'vite';
// Standalone drop-in build: <script src=kairo.global.js> exposes window.Kairo. CSS ships as kairo.global.css.
export default defineConfig({
  build: {
    lib: { entry: 'src/global.ts', formats: ['iife'], name: 'Kairo', fileName: () => 'kairo.global.js', cssFileName: 'kairo.global' },
    emptyOutDir: false, minify: true,
  },
});
