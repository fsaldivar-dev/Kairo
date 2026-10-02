import { defineConfig } from 'vite';
export default defineConfig({
  build: { lib: { entry: 'src/labels.ts', formats: ['es'], fileName: () => 'labels.js' }, emptyOutDir: false, minify: true },
});
