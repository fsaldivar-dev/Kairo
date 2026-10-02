import { defineConfig } from 'vite';
// Opt-in React wrapper bundle for @fsaldivar.dev/diagram/react (React is external/peer).
export default defineConfig({
  build: {
    lib: { entry: 'src/react-entry.ts', formats: ['es'], fileName: () => 'react.js' },
    emptyOutDir: false, minify: true,
    rollupOptions: { external: ['react', 'react-dom', 'react/jsx-runtime'] },
  },
});
