import { test, expect } from '@playwright/test';
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

// The self-contained artifact is rebuilt from the (already-built) global bundle before the test.
const file = resolve('artifacts/kairo-standalone.html');
test.beforeAll(() => { execSync('node scripts/build-standalone.mjs', { stdio: 'ignore' }); });

test('the standalone offline artifact renders and edits a diagram with no server', async ({ page }) => {
  await page.goto(pathToFileURL(file).href); // file:// — no dev server, no network
  await expect(page.locator('.cd-node')).toHaveCount(1); // seeded node
  await page.getByRole('button', { name: 'Añadir nodo' }).click();
  await expect(page.locator('.cd-node')).toHaveCount(2); // the inlined editor is interactive
  await expect(page.locator('.cd-editor')).toBeVisible();
});
