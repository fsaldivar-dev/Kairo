import { test, expect, type Page } from '@playwright/test';

const drafts = (page: Page) => page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('kairo-draft-v1:')).map(k => JSON.parse(localStorage.getItem(k)!)));
async function rename(page: Page, title: string) {
  await page.locator('[data-node="auth"] .cd-node-body').click();
  await page.locator('#node-title').fill(title); await page.locator('#node-title').press('Tab');
}
test('a local draft survives reload and recovery is voluntary, undoable, and separate from explicit save', async ({ page }) => {
  await page.goto('/'); await page.locator('#save').click();
  const saved = await page.evaluate(() => localStorage.getItem('codaru-diagram-example'));
  await rename(page,'Trabajo recuperable 日本語');
  await expect(page.locator('#draft-status')).toHaveText('Copia local del borrador lista');
  expect((await drafts(page))[0].document.graph.nodes.find((n: {id:string}) => n.id==='auth').title).toBe('Trabajo recuperable 日本語');
  await page.reload(); await expect(page.locator('#node-title')).toHaveValue('AuthService');
  await expect(page.locator('#drafts-open')).toHaveText('Borradores (1)');
  await page.locator('#drafts-open').click(); await page.getByRole('button',{name:'Recuperar',exact:true}).click();
  await expect(page.locator('[data-node="auth"]')).toHaveAttribute('aria-label',/Trabajo recuperable/);
  await expect(page.locator('#save-status')).toContainText('Sin guardar');
  expect(await page.evaluate(() => localStorage.getItem('codaru-diagram-example'))).toBe(saved);
  await page.locator('#undo').click(); await expect(page.locator('[data-node="auth"]')).toHaveAttribute('aria-label',/AuthService/);
  await page.locator('#redo').click();
  await page.locator('#drafts-open').click();
  await expect(page.locator('.draft-card')).toHaveCount(2);
  const download = page.waitForEvent('download');
  await page.getByRole('button',{name:'Exportar JSON',exact:true}).first().click();
  expect((await download).suggestedFilename()).toMatch(/^kairo-borrador-/);
  await page.screenshot({path:`artifacts/recovery-${test.info().project.name}.png`});
  await page.getByRole('button',{name:'Cerrar borradores'}).click();
  await page.locator('#load').click();
  await page.getByRole('dialog',{name:'Confirmar cambio'}).getByRole('button',{name:'Abrir guardado'}).click();
  await expect(page.locator('[data-node="auth"]')).toHaveAttribute('aria-label',/AuthService/);
});

test('two windows never overwrite or clear each other’s drafts on save', async ({ page, context }) => {
  await page.goto('/'); const other = await context.newPage(); await other.goto('/');
  await rename(page,'Ventana uno'); await rename(other,'Ventana dos');
  await expect.poll(async () => (await drafts(page)).length).toBe(2);
  const titles = (await drafts(page)).map(d=>d.document.graph.nodes.find((n:{id:string})=>n.id==='auth').title).sort();
  expect(titles).toEqual(['Ventana dos','Ventana uno']);
  await page.locator('#save').click();
  await expect.poll(async () => (await drafts(page)).length).toBe(1);
  expect((await drafts(page))[0].document.graph.nodes.find((n:{id:string})=>n.id==='auth').title).toBe('Ventana dos');
  await other.close();
});

test('view-only actions create no drafts; deletion is explicit and preserves the diagram', async ({ page }) => {
  await page.goto('/'); await page.locator('#zoom-in').click(); await page.locator('#theme').click();
  await page.locator('.cd-minimap-toggle').click(); await page.locator('#readonly').click();
  await page.locator('#drafts-open').click(); await expect(page.locator('.draft-card')).toHaveCount(0);
  await page.keyboard.press('Escape'); await expect(page.locator('#drafts-open')).toBeFocused();
  await page.locator('#readonly').click(); await rename(page,'Mantener en lienzo');
  await page.locator('#drafts-open').click(); await expect(page.locator('.draft-card')).toHaveCount(1);
  await page.getByRole('button',{name:'Eliminar copia'}).click();
  await expect(page.getByRole('dialog',{name:'Confirmar cambio'}).getByRole('button',{name:'Cancelar'})).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('.draft-card')).toHaveCount(1);
  await expect(page.getByRole('button',{name:'Eliminar copia'})).toBeFocused();
  await page.getByRole('button',{name:'Eliminar copia'}).click();
  await page.getByRole('dialog',{name:'Confirmar cambio'}).getByRole('button',{name:'Eliminar copia'}).click();
  await expect(page.locator('.draft-card')).toHaveCount(0); await page.keyboard.press('Escape');
  await expect(page.locator('[data-node="auth"]')).toHaveAttribute('aria-label',/Mantener en lienzo/);
  await expect(page.locator('#save-status')).toContainText('Sin guardar');
});

test('blocked storage and quota failures leave editing usable and preserve the last copy', async ({ page }) => {
  await page.addInitScript(() => {
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key,value) {
      if (key.startsWith('kairo-draft-v1:') && this.getItem('test-block-drafts') === 'true') throw new DOMException('Full','QuotaExceededError');
      return set.call(this,key,value);
    };
  });
  await page.goto('/'); await rename(page,'Copia previa');
  await expect(page.locator('#draft-status')).toHaveText('Copia local del borrador lista');
  await page.evaluate(() => localStorage.setItem('test-block-drafts','true')); await rename(page,'Edición actual');
  await expect(page.locator('#draft-status')).toContainText('No se pudo conservar');
  expect((await drafts(page))[0].document.graph.nodes.find((n:{id:string})=>n.id==='auth').title).toBe('Copia previa');
  await expect(page.locator('[data-node="auth"]')).toHaveAttribute('aria-label',/Edición actual/);
  await page.addInitScript(() => Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Denied','SecurityError');}}));
  await page.reload(); await rename(page,'Almacenamiento denegado');
  await expect(page.locator('#draft-status')).toContainText('No se pudo conservar');
  await expect(page.locator('[data-node="auth"]')).toHaveAttribute('aria-label',/Almacenamiento denegado/);
});

test('malformed copies remain visible for cleanup; readonly never permits restoring', async ({ page }) => {
  await page.goto('/'); await rename(page,'Copia válida'); await page.locator('#drafts-open').click(); await page.keyboard.press('Escape');
  await page.evaluate(() => localStorage.setItem('kairo-draft-v1:broken','{'));
  await page.locator('#readonly').click(); await page.locator('#drafts-open').click();
  await expect(page.locator('.draft-card')).toHaveCount(2);
  await expect(page.getByRole('button',{name:'Recuperar',exact:true})).toBeDisabled();
  await expect(page.locator('.draft-card[data-draft-id="broken"]')).toContainText('dañada');
});

test('visible confirmations protect current work when recovering, opening, or replacing a template', async ({ page }) => {
  await page.goto('/'); await page.locator('#save').click();
  await rename(page,'Primera sesión'); await expect(page.locator('#draft-status')).toContainText('lista');
  await page.reload(); await rename(page,'Trabajo actual');
  await page.locator('#drafts-open').click();
  const source = page.locator('.draft-card').filter({hasText:'Primera sesión'});
  const confirm = page.getByRole('dialog',{name:'Confirmar cambio'});
  await source.getByRole('button',{name:'Recuperar',exact:true}).click();
  await expect(confirm.getByRole('button',{name:'Cancelar'})).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-node="auth"]')).toHaveAttribute('aria-label',/Trabajo actual/);
  await source.getByRole('button',{name:'Recuperar',exact:true}).click();
  await confirm.getByRole('button',{name:'Recuperar',exact:true}).click();
  await expect(page.locator('[data-node="auth"]')).toHaveAttribute('aria-label',/Primera sesión/);
  await page.locator('#undo').click();
  await expect(page.locator('[data-node="auth"]')).toHaveAttribute('aria-label',/Trabajo actual/);
  await page.locator('#load').click(); await confirm.getByRole('button',{name:'Cancelar'}).click();
  await expect(page.locator('[data-node="auth"]')).toHaveAttribute('aria-label',/Trabajo actual/);
  await page.getByLabel('Plantilla',{exact:true}).selectOption('decision');
  await confirm.getByRole('button',{name:'Cancelar'}).click();
  await expect(page.getByLabel('Plantilla',{exact:true})).toHaveValue('');
  await expect(page.locator('[data-node="auth"]')).toHaveAttribute('aria-label',/Trabajo actual/);
  await page.getByLabel('Plantilla',{exact:true}).selectOption('decision');
  await confirm.getByRole('button',{name:'Insertar plantilla'}).click();
  await expect(page.locator('[data-node="auth"]')).toHaveCount(0);
});
