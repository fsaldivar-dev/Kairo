import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  define: { __VUE_OPTIONS_API__: 'true', __VUE_PROD_DEVTOOLS__: 'false', __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false' },
  resolve: { dedupe: ['vue', 'react', 'react-dom'], alias: [
    { find: /^@fsaldivar\.dev\/diagram$/, replacement: fileURLToPath(new URL('../../packages/diagram/src/index.ts', import.meta.url)) },
    { find: /^@fsaldivar\.dev\/diagram\/io$/, replacement: fileURLToPath(new URL('../../packages/diagram/src/io.ts', import.meta.url)) },
    { find: /^@fsaldivar\.dev\/diagram\/analysis$/, replacement: fileURLToPath(new URL('../../packages/diagram/src/analysis.ts', import.meta.url)) },
    { find: /^@fsaldivar\.dev\/diagram\/labels$/, replacement: fileURLToPath(new URL('../../packages/diagram/src/labels.ts', import.meta.url)) },
    { find: /^@fsaldivar\.dev\/diagram\/recovery$/, replacement: fileURLToPath(new URL('../../packages/diagram/src/recovery.ts', import.meta.url)) },
    { find: /^@fsaldivar\.dev\/diagram\/player$/, replacement: fileURLToPath(new URL('../../packages/diagram/src/player-entry.ts', import.meta.url)) },
    { find: /^@fsaldivar\.dev\/diagram\/minimap$/, replacement: fileURLToPath(new URL('../../packages/diagram/src/minimap-entry.ts', import.meta.url)) },
    { find: /^@fsaldivar\.dev\/diagram\/themes$/, replacement: fileURLToPath(new URL('../../packages/diagram/src/themes-entry.ts', import.meta.url)) },
    { find: /^@fsaldivar\.dev\/diagram\/templates$/, replacement: fileURLToPath(new URL('../../packages/diagram/src/templates-entry.ts', import.meta.url)) },
    { find: /^@fsaldivar\.dev\/diagram\/layout$/, replacement: fileURLToPath(new URL('../../packages/diagram/src/layout-entry.ts', import.meta.url)) },
    { find: /^@fsaldivar\.dev\/diagram\/export$/, replacement: fileURLToPath(new URL('../../packages/diagram/src/export-entry.ts', import.meta.url)) },
    { find: /^@fsaldivar\.dev\/diagram\/react$/, replacement: fileURLToPath(new URL('../../packages/diagram/src/react-entry.ts', import.meta.url)) },
    { find: /^@fsaldivar\.dev\/diagram\/vue$/, replacement: fileURLToPath(new URL('../../packages/diagram/src/vue-entry.ts', import.meta.url)) },
    { find: /^@fsaldivar\.dev\/diagram\/svelte$/, replacement: fileURLToPath(new URL('../../packages/diagram/src/svelte-entry.ts', import.meta.url)) },
    { find: /^@fsaldivar\.dev\/diagram\/element$/, replacement: fileURLToPath(new URL('../../packages/diagram/src/element-entry.ts', import.meta.url)) },
    { find: '@fsaldivar.dev/diagram/style.css', replacement: fileURLToPath(new URL('../../packages/diagram/src/style.css', import.meta.url)) },
    { find: '@fsaldivar.dev/plugin', replacement: fileURLToPath(new URL('../../packages/plugin-diagram/src/index.ts', import.meta.url)) },
  ] },
  build: { rollupOptions: { input: { main: fileURLToPath(new URL('./index.html', import.meta.url)), react: fileURLToPath(new URL('./react.html', import.meta.url)), vue: fileURLToPath(new URL('./vue.html', import.meta.url)), svelte: fileURLToPath(new URL('./svelte.html', import.meta.url)), element: fileURLToPath(new URL('./element.html', import.meta.url)) } } },
  server: { watch: { ignored: ['**/src-tauri/**', '**/target/**'] } },
  clearScreen: false,
});
