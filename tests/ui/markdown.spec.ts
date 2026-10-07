import { expect, test } from '@playwright/test';

test('enhanceMarkdown replaces diagram code blocks with inline SVG, leaving others untouched', async ({ page }) => {
  await page.goto('/markdown.html');
  // Before: four fenced code blocks, no diagrams yet.
  await expect(page.locator('#doc pre')).toHaveCount(4);
  await expect(page.locator('#doc figure.kairo-diagram')).toHaveCount(0);

  await page.getByRole('button', { name: 'Mejorar Markdown' }).click();

  // The valid mermaid and dot blocks become inline SVG; js and invalid-mermaid stay as <pre>.
  await expect(page.locator('#doc figure.kairo-diagram svg')).toHaveCount(2);
  await expect(page.locator('#doc figure.kairo-diagram[data-lang="mermaid"] svg')).toHaveCount(1);
  await expect(page.locator('#doc figure.kairo-diagram[data-lang="dot"] svg')).toHaveCount(1);
  await expect(page.locator('#doc pre')).toHaveCount(2); // js + invalid mermaid remain
  await expect(page.getByRole('status')).toContainText('Bloques renderizados: 2; con error: 1');
  // theme 'currentColor' → the rendered SVG inherits the container colour.
  const usesCurrentColor = await page.locator('#doc figure.kairo-diagram[data-lang="mermaid"] svg').evaluate(el => el.outerHTML.includes('currentColor'));
  expect(usesCurrentColor).toBe(true);
});

test('mermaidToSvg renders a one-call SVG', async ({ page }) => {
  await page.goto('/markdown.html');
  await page.getByRole('button', { name: 'mermaidToSvg (una llamada)' }).click();
  await expect(page.locator('#one-call-out svg')).toHaveCount(1);
  await expect(page.getByRole('status')).toContainText('devolvió un SVG');
});
