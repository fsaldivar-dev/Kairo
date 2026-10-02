import { test, expect } from '@playwright/test';

test('the native text dialog imports PlantUML, cancels safely and restores keyboard focus', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(window, 'isTauri', { value: true }); });
  await page.goto('/');
  const openImport = async () => {
    await page.getByRole('button', { name: 'Importar', exact: true }).click();
    await page.getByRole('button', { name: 'Importar mindmap PlantUML', exact: true }).click();
  };
  await openImport();
  const dialog = page.getByRole('dialog', { name: 'Importar texto' });
  await expect(dialog).toBeVisible();
  const field = dialog.getByRole('textbox', { name: 'Contenido' });
  await expect(field).toBeFocused();
  await expect(field).toHaveValue(/@startmindmap/);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page.locator('.cd-node')).toHaveCount(7);
  await expect(page.getByRole('button', { name: 'Importar', exact: true })).toBeFocused();

  await openImport();
  await field.fill('@startmindmap\n* Proyecto\n** Diseño\n*** Bocetos\n** Desarrollo\n@endmindmap');
  await dialog.getByRole('button', { name: 'Aplicar' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('.cd-node')).toHaveCount(4);
  await expect(page.locator('.cd-edge')).toHaveCount(3);
  await expect(page.getByRole('heading', { name: 'Mapa mental' })).toBeVisible();
  await expect(page.getByLabel('Ejemplo')).toHaveValue('custom');
  await expect(page.locator('#flow-diagnostics')).toBeHidden();
  await page.getByRole('button', { name: 'Deshacer', exact: true }).click();
  await expect(page.locator('.cd-node')).toHaveCount(7);
  await expect(page.getByLabel('Ejemplo')).toHaveValue('architecture');
});

test('the native OPML dialog presents a hierarchy and Undo restores the previous profile', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(window, 'isTauri', { value: true }); });
  await page.goto('/');
  await page.getByRole('button', { name: 'Importar', exact: true }).click();
  await page.getByRole('button', { name: 'Importar OPML', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Importar texto' });
  await expect(dialog.getByRole('textbox', { name: 'Contenido' })).toHaveValue(/<opml/);
  await dialog.getByRole('button', { name: 'Aplicar' }).click();
  await expect(page.getByRole('heading', { name: 'Jerarquía' })).toBeVisible();
  await expect(page.locator('#flow-diagnostics')).toBeHidden();
  await expect(page.locator('.cd-node')).toHaveCount(4);
  await page.getByRole('button', { name: 'Deshacer', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sistema de acceso' })).toBeVisible();
  await expect(page.getByLabel('Ejemplo')).toHaveValue('architecture');
});
