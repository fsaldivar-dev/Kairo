import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/'); await page.locator('#explore-examples').click();
  await page.locator('[data-example="labels"]').click();
});

test('multiline example preserves explicit breaks, literal titles and matching SVG preview', async ({ page }) => {
  const request = page.locator('[data-node="request"]');
  await expect(request.locator('.cd-title tspan')).toHaveCount(3);
  await expect(page.locator('[data-node="report"] .cd-title tspan')).toHaveText(['Preparar informe', 'para el equipo']);
  await expect(request).toHaveAttribute('aria-label', /Recibir solicitud y verificar los datos del cliente/);
  const labels = await page.locator('.cd-node .cd-title tspan').evaluateAll(spans => spans.map(span => [span.textContent, Number(span.getAttribute('x')).toFixed(2), Number(span.getAttribute('y')).toFixed(2)]));
  await page.locator('#open-workshop').click();
  expect(await page.locator('#studio-preview tspan').evaluateAll(spans => spans.map(span => [span.textContent, Number(span.getAttribute('x')).toFixed(2), Number(span.getAttribute('y')).toFixed(2)]))).toEqual(labels);
  await page.getByRole('button', { name: 'Cerrar taller' }).click();
  await page.screenshot({ path: `artifacts/labels-${test.info().project.name}.png` });
});

test('live resize reflows before pointerup and undo restores titles without losing metadata', async ({ page }) => {
  await page.locator('#tab-properties').click();
  const node = page.locator('[data-node="request"]');
  await node.locator('.cd-node-body').click();
  const before = await node.locator('.cd-title tspan').allTextContents();
  const h = (await page.locator('.cd-resize-handle').boundingBox())!;
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2); await page.mouse.down();
  await page.mouse.move(h.x + 110, h.y, { steps: 10 });
  await expect.poll(() => node.locator('.cd-title tspan').allTextContents()).not.toEqual(before);
  await page.mouse.up(); await page.locator('#undo').click();
  expect(await node.locator('.cd-title tspan').allTextContents()).toEqual(before);
  await node.locator('.cd-node-body').click();
  await page.locator('#node-height').fill('76'); await page.locator('#node-height').press('Tab');
  await page.locator('#zoom-value').click(); await page.locator('#zoom-in').click(); // References appear at high detail (>= 115%).
  await expect(node.locator('.cd-source')).toBeVisible();
  const bounds = await node.evaluate(el => {
    const title = el.querySelector('.cd-title') as SVGGraphicsElement;
    const type = el.querySelector('.cd-type') as SVGGraphicsElement;
    const source = el.querySelector('.cd-source') as SVGGraphicsElement;
    return [title.getBBox().y, title.getBBox().y + title.getBBox().height, type.getBBox().y, type.getBBox().y + type.getBBox().height, source.getBBox().y, source.getBBox().y + source.getBBox().height];
  });
  expect(bounds[0]).toBeGreaterThan(0); expect(bounds[1]).toBeLessThan(bounds[2]);
  expect(bounds[3]).toBeLessThan(bounds[4]); expect(bounds[5]).toBeLessThan(76);
  await page.locator('#readonly').click(); await expect(page.locator('.cd-resize-handle')).not.toBeVisible();
  await expect(node.locator('.cd-title tspan')).toHaveCount(1);
});

test('title edits remain plain text, and every label fits inside its shape', async ({ page }) => {
  await page.locator('#tab-properties').click(); await page.locator('[data-node="request"] .cd-node-body').click();
  await page.locator('#node-title').fill('<script>alert(1)</script>'); await page.locator('#node-title').press('Tab');
  expect(await page.locator('[data-node="request"] script').count()).toBe(0);
  await expect(page.locator('[data-node="request"]')).toHaveAttribute('aria-label', /<script>alert\(1\)<\/script>/);
  await page.locator('#undo').click();
  const outside = await page.locator('.cd-node').evaluateAll(nodes => nodes.flatMap(node => {
    const body = node.querySelector('.cd-node-body') as SVGGeometryElement;
    return [...node.querySelectorAll('.cd-title tspan, .cd-type')].flatMap(el => {
      const box = (el as SVGGraphicsElement).getBBox();
      const corners = [[box.x, box.y], [box.x + box.width, box.y], [box.x, box.y + box.height], [box.x + box.width, box.y + box.height]];
      return corners.every(([x, y]) => body.isPointInFill(new DOMPoint(x, y))) ? [] : [`${node.getAttribute('data-node')}: ${el.textContent}`];
    });
  }));
  expect(outside).toEqual([]);
});
