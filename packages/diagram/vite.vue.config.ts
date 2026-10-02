import { defineConfig } from 'vite';
// Opt-in Vue 3 wrapper bundle for @fsaldivar.dev/diagram/vue (Vue is external/peer).
export default defineConfig({
  build: {
    lib: { entry: 'src/vue-entry.ts', formats: ['es'], fileName: () => 'vue.js' },
    emptyOutDir: false, minify: true,
    rollupOptions: { external: ['vue'] },
  },
});
