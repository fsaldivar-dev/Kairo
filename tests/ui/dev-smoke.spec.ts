import { test, expect } from '@playwright/test';

// The built bundle hoists declarations, so construction-time TDZ bugs (e.g. a callback that fires during
// createDiagram referencing a not-yet-initialized const) only surface in the unbundled DEV server. This guards
// that class of regression — the same family as the minimap / announceSelection TDZ bugs.
test('the dev server (unbundled ESM) boots with no uncaught errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error' && !/favicon|\.ico/.test(m.text())) errors.push(`console: ${m.text()}`); });
  await page.goto('http://127.0.0.1:1420/');
  await expect(page.locator('.cd-node').first()).toBeVisible();
  await expect(page.locator('.cd-node')).toHaveCount(7);
  await page.waitForTimeout(300);
  expect(errors, errors.join('\n')).toEqual([]);
});
