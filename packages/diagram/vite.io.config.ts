import { defineConfig } from 'vite';
// Independent self-contained bundle for @fsaldivar.dev/diagram/io (text import + SVG export).
export default defineConfig({
  build: { lib: { entry: 'src/io.ts', formats: ['es'], fileName: () => 'io.js' }, emptyOutDir: false, minify: true },
});
