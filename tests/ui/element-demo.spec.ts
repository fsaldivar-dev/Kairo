import { expect, test } from '@playwright/test';

test('embedded component example loads, replaces, and reports errors without losing the diagram', async ({ page }) => {
  await page.goto('/element.html');
  await expect(page.getByRole('status')).toContainText('Cargado /embedded-a.json: 3 nodos');
  await expect(page.locator('kairo-diagram .cd-node')).toHaveCount(3);

  let bRequests = 0;
  await page.route('**/embedded-b.json', route => { bRequests++; return route.continue(); });
  await page.getByRole('button', { name: 'Cargar flujo B' }).click();
  await expect(page.getByRole('status')).toContainText('Cargado /embedded-b.json: 4 nodos');
  await expect(page.locator('kairo-diagram .cd-node')).toHaveCount(4);
  await page.getByRole('button', { name: 'Recargar URL actual' }).click();
  await expect.poll(() => bRequests).toBe(2);
  await expect(page.getByRole('status')).toContainText('carga 3');
  await expect(page.locator('kairo-diagram .cd-node')).toHaveCount(4);

  await page.getByRole('button', { name: 'Vaciar vista' }).click();
  await expect(page.getByRole('status')).toContainText('Vista vacía');
  await expect(page.locator('kairo-diagram .cd-node')).toHaveCount(0);
  await page.getByRole('button', { name: 'Recargar URL actual' }).click();
  await expect(page.getByRole('status')).toContainText('carga 4');
  await expect(page.locator('kairo-diagram .cd-node')).toHaveCount(4);
  expect(bRequests).toBe(3);

  await page.getByRole('button', { name: 'Probar error de carga' }).click();
  await expect(page.getByRole('status')).toContainText('No se pudo cargar /embedded-invalid.json: SyntaxError:');
  await expect(page.locator('kairo-diagram .cd-node')).toHaveCount(4);

  await page.getByRole('button', { name: 'Reemplazar desde el host' }).click();
  await expect(page.getByRole('status')).toContainText('El host reemplazó el documento');
  await expect(page.locator('kairo-diagram .cd-node')).toHaveCount(2);
  await expect(page.locator('kairo-diagram .cd-node')).toContainText(['Tu sistema', 'Kairo embebido']);
});
