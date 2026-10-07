import { defineConfig } from 'vite';
// Opt-in conversion bundle for @fsaldivar.dev/diagram/convert (parseAny/importAny/convertText/detectFormat/serializeAs/tryParse).
export default defineConfig({
  build: { lib: { entry: 'src/convert.ts', formats: ['es'], fileName: () => 'convert.js' }, emptyOutDir: false, minify: true },
});
