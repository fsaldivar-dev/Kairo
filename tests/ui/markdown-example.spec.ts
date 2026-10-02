import { test, expect, type Page } from '@playwright/test';

async function saved(page: Page) {
  await page.getByRole('button',{name:'Guardar',exact:true}).click();
  return page.evaluate(()=>JSON.parse(localStorage.getItem('codaru-diagram-example')!));
}
async function openMarkdown(page: Page) {
  await page.locator('#explore-examples').click();
  await page.locator('[data-example="markdown"]').click();
  await expect(page.locator('#text-workshop')).toBeVisible();
}

test('Markdown example renders its Mermaid block, previews edits and applies as one undo step',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');
  await page.locator('#node-title').fill('Trabajo previo');await page.locator('#node-title').press('Tab');
  const before=await saved(page);
  await openMarkdown(page);
  await expect(page.locator('#studio-format')).toHaveValue('markdown');
  await expect(page.locator('#studio-source')).toHaveValue(/# Solicitudes de acceso[\s\S]*```mermaid/);
  await expect(page.locator('#studio-parse-status')).toContainText('5 nodos · 4 conexiones');
  await expect(page.locator('#studio-preview')).toContainText('Conceder acceso');
  await expect(page.locator('.cd-node')).toHaveCount(7);
  const source=await page.locator('#studio-source').inputValue();
  await page.locator('#studio-source').fill(source.replaceAll('Conceder acceso','Abrir proyecto'));
  await expect(page.locator('#studio-preview')).toContainText('Abrir proyecto');
  await expect(page.locator('[data-node="auth"] .cd-title')).toHaveText('Trabajo previo');
  await page.screenshot({path:'artifacts/markdown-example-'+test.info().project.name+'.png'});
  await page.locator('#studio-apply').click();
  await expect(page.locator('[data-node="acceso"] .cd-title')).toHaveText('Abrir proyecto');
  await expect(page.locator('#studio-title')).toHaveText('Markdown → diagrama');
  await expect(page.locator('h1')).toHaveText('Markdown → diagrama');
  await expect(page.locator('[data-policy="allowSelfLoops"]')).not.toBeChecked();
  await page.getByRole('button',{name:'Deshacer',exact:true}).click();
  const restored=await saved(page);expect(restored.graph).toEqual(before.graph);expect(restored.layout).toEqual(before.layout);
  expect(errors).toEqual([]);
});

test('Markdown preview reports missing diagrams and keeps HTML inert without changing the canvas',async({page})=>{
  await page.goto('/');const before=await saved(page);await openMarkdown(page);
  await page.locator('#studio-source').fill('# Solo documentación\n\nUn párrafo sin bloque Mermaid.');
  await expect(page.locator('#studio-parse-status')).toContainText('no contiene un bloque');
  await expect(page.locator('#studio-apply')).toBeDisabled();
  await page.locator('#studio-source').fill('# Ejemplo\n<script>window.mdExecuted=true</script>\n\n```mermaid\nflowchart LR\nA[Uno] --> B[Dos]\n```');
  await expect(page.locator('#studio-parse-status')).toContainText('2 nodos · 1 conexiones');
  expect(await page.evaluate(()=>(window as any).mdExecuted)).toBeUndefined();
  await page.getByRole('button',{name:'Cerrar taller'}).click();
  expect((await saved(page)).graph).toEqual(before.graph);
});

test('Markdown example can be explored in read-only mode and reopened from the guided panel',async({page})=>{
  await page.goto('/');await page.locator('#readonly').click();
  await openMarkdown(page);
  await expect(page.locator('#studio-preview svg')).toBeVisible();
  await expect(page.locator('#studio-apply')).toBeDisabled();
  await expect(page.locator('#studio-insert')).toBeDisabled();
  await page.getByRole('button',{name:'Cerrar taller'}).click();
  await page.locator('#tab-studio').click();await page.locator('#studio-markdown').click();
  await expect(page.locator('#studio-source')).toHaveValue(/# Solicitudes de acceso/);
  await expect(page.locator('#studio-apply')).toBeDisabled();
});
