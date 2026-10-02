import { defineConfig } from 'vite';
export default defineConfig({
  build: { lib: { entry: 'src/recovery.ts', formats: ['es'], fileName: () => 'recovery.js' }, emptyOutDir: false, minify: true },
});
