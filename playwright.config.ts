import { defineConfig } from '@playwright/test';
// Isolate concurrent local QA sessions without interrupting another preview.
const previewPort = Number(process.env.KAIRO_PREVIEW_PORT ?? 1421);
if (!Number.isInteger(previewPort) || previewPort < 1024 || previewPort > 65535) throw new Error('Invalid KAIRO_PREVIEW_PORT');
const previewURL = `http://127.0.0.1:${previewPort}`;
export default defineConfig({
  testDir: './tests/ui',
  fullyParallel: true,
  // Retry failed tests to absorb rare WebKit timing flakes under the large parallel suite (inspector/edit
  // interactions). A genuinely failing test still fails after its retries; flakes pass and are flagged "flaky".
  retries: 2,
  use: { baseURL: previewURL, viewport: { width: 1440, height: 980 }, colorScheme: 'light', screenshot: 'only-on-failure' },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }, { name: 'webkit', use: { browserName: 'webkit' } }],
  webServer: [
    { command: `npm run build -w @fsaldivar.dev/diagram-example && npm run preview -w @fsaldivar.dev/diagram-example -- --port ${previewPort} --strictPort`, url: previewURL, reuseExistingServer: false },
    { command: 'npm run dev -w @fsaldivar.dev/diagram-example', url: 'http://127.0.0.1:1420', reuseExistingServer: true },
  ],
});
