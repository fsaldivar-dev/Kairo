import { defineConfig } from 'vite';
// Opt-in Svelte action bundle for @fsaldivar.dev/diagram/svelte. No Svelte dependency: the
// action is a plain function returning { update, destroy }, so nothing is external.
export default defineConfig({
  build: {
    lib: { entry: 'src/svelte-entry.ts', formats: ['es'], fileName: () => 'svelte.js' },
    emptyOutDir: false, minify: true,
  },
});
