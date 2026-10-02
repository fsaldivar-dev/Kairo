import { defineConfig } from 'vite';
// Independent self-contained bundle for @fsaldivar.dev/diagram/analysis (structural validators).
export default defineConfig({
  build: { lib: { entry: 'src/analysis.ts', formats: ['es'], fileName: () => 'analysis.js' }, emptyOutDir: false, minify: true },
});
