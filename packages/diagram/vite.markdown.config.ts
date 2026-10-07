import { defineConfig } from 'vite';
// Opt-in Markdown bundle for @fsaldivar.dev/diagram/markdown (Markdown import/export + mermaidToSvg/enhanceMarkdown).
export default defineConfig({
  build: { lib: { entry: 'src/markdown-entry.ts', formats: ['es'], fileName: () => 'markdown.js' }, emptyOutDir: false, minify: true },
});
