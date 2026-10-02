import { defineConfig } from 'vite';
// Opt-in path-player bundle for @fsaldivar.dev/diagram/player (drives setHighlight; decoupled from core).
export default defineConfig({
  build: { lib: { entry: 'src/player-entry.ts', formats: ['es'], fileName: () => 'player.js' }, emptyOutDir: false, minify: true },
});
