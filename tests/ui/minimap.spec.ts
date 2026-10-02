import { test, expect } from '@playwright/test';

test('small windows start with the map folded; keyboard disclosure preserves the diagram and preference', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 }); await page.goto('/');
  const map = page.locator('.cd-minimap'), button = page.locator('.cd-minimap-toggle');
  await expect(map).toBeHidden(); await expect(button).toHaveAttribute('aria-expanded', 'false');
  await expect(button).toHaveText('Mostrar minimapa');
  expect(await button.getAttribute('aria-controls')).toBe(await map.getAttribute('id'));
  await page.locator('#explore-examples').click(); await page.locator('[data-example="labels"]').click();
  const archive = page.locator('[data-node="archive"] .cd-node-body');
  const uncovered = await archive.evaluate(el => {
    const b = el.getBoundingClientRect();
    return document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2)?.closest('[data-node]')?.getAttribute('data-node');
  });
  expect(uncovered).toBe('archive');
  await archive.click();
  const snapshot = () => page.evaluate(() => ({
    viewport: document.querySelector('.cd-canvas > g')!.getAttribute('transform'),
    nodes: [...document.querySelectorAll('.cd-node')].map(n => [n.getAttribute('data-node'), n.getAttribute('transform')]),
    selected: document.querySelector('.cd-node.is-selected')?.getAttribute('data-node'),
    undo: (document.querySelector('#undo') as HTMLButtonElement).disabled,
    redo: (document.querySelector('#redo') as HTMLButtonElement).disabled,
    saved: document.querySelector('#save-status')!.textContent,
  }));
  const before = await snapshot();
  await button.focus(); await button.press('Enter');
  await expect(map).toBeVisible(); await expect(button).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('.cd-minimap-node')).toHaveCount(6);
  await expect(button).toBeFocused();
  await button.press('Space'); await expect(map).toBeHidden();
  expect(await snapshot()).toEqual(before);
  await page.locator('#readonly').click(); await button.click();
  await expect(map).toBeVisible(); await expect(button).toBeEnabled();
  await button.click(); await expect(map).toBeHidden();
  // View choice persists across sessions and window sizes, independently of the diagram.
  expect(await page.evaluate(() => localStorage.getItem('kairo-minimap-collapsed'))).toBe('true');
  page.on('dialog', dialog => dialog.accept());
  await page.setViewportSize({ width: 1440, height: 980 }); await page.reload(); await expect(map).toBeHidden();
});

test('opening a folded map uses current contents and keeps click/drag navigation working', async ({ page }) => {
  await page.goto('/'); const map = page.locator('.cd-minimap'), button = page.locator('.cd-minimap-toggle');
  await expect(map).toBeVisible(); await button.click();
  await page.locator('#explore-examples').click(); await page.locator('[data-example="labels"]').click();
  await button.click(); await expect(page.locator('.cd-minimap-node')).toHaveCount(6);
  await expect(page.locator('.cd-minimap-edge')).toHaveCount(4);
  const before = await page.locator('[data-node="request"]').boundingBox(), box = (await map.boundingBox())!;
  await page.mouse.move(box.x + 25, box.y + 20); await page.mouse.down();
  await page.mouse.move(box.x + 130, box.y + 80, { steps: 6 }); await page.mouse.up();
  const after = (await page.locator('[data-node="request"]').boundingBox())!;
  expect(Math.abs(after.x - before!.x) + Math.abs(after.y - before!.y)).toBeGreaterThan(20);
  await page.locator('#fit').click(); await page.setViewportSize({ width: 1280, height: 720 });
  await page.locator('#fit').click(); await button.click();
  await page.screenshot({ path: `artifacts/minimap-folded-${test.info().project.name}.png` });
});

test('minimap API skips hidden work, supports detached/multiple mounts and removes its listeners', async ({ page }) => {
  await page.setContent('<div id="editor" style="width:800px;height:600px"></div><div id="host"></div>');
  await page.addScriptTag({ path: 'packages/diagram/dist/kairo.global.js' });
  const result = await page.evaluate(() => {
    const K = (window as any).Kairo;
    const doc = K.createDocument({ nodes: [{id:'a',type:'service',title:'A'}], edges: [] });
    let reads = 0, moves = 0; const changes: boolean[] = [];
    const vp = { x: 0, y: 0, zoom: 1 };
    const editor = { element: document.getElementById('editor')!, getDocument: () => { reads++; return doc; }, getViewport: () => vp, setViewport: () => moves++ };
    const detached = document.createElement('div');
    const map = K.createMinimap(editor, detached, { collapsible:true, collapsed:true, onCollapsedChange: (value:boolean) => changes.push(value) });
    map.update(); map.update(); const hiddenReads = reads;
    document.getElementById('host')!.append(detached);
    doc.graph.nodes.push({id:'b',type:'service',title:'B'}); doc.layout.nodes.b = {x:300,y:0,width:210,height:92};
    map.setCollapsed(false); map.setCollapsed(false);
    const rendered = detached.querySelectorAll('.cd-minimap-node').length;
    const siblingHost = document.createElement('div'); document.body.append(siblingHost);
    const sibling = K.createMinimap(editor, siblingHost, {collapsible:true});
    const ids = [...document.querySelectorAll('.cd-minimap-toggle')].map(el => el.getAttribute('aria-controls'));
    const button = detached.querySelector('button')!; const beforeDestroy = changes.length;
    map.destroy(); map.destroy(); button.click(); map.update(); map.setCollapsed(true);
    const clean = detached.childElementCount === 0 && changes.length === beforeDestroy;
    const siblingAlive = siblingHost.querySelectorAll('.cd-minimap-node').length === 2;
    sibling.destroy();
    const bareHost = document.createElement('div'), bare = K.createMinimap(editor, bareHost);
    const bareCompatible = bareHost.childElementCount === 1 && bareHost.firstElementChild?.tagName.toLowerCase() === 'svg'; bare.destroy();
    return { hiddenReads, rendered, ids, clean, siblingAlive, bareCompatible, moves, changes, collapsed: map.isCollapsed() };
  });
  expect(result).toMatchObject({ hiddenReads:0, rendered:2, clean:true, siblingAlive:true, bareCompatible:true, moves:0, changes:[false], collapsed:false });
  expect(new Set(result.ids).size).toBe(2);
});

test('cancelled minimap pointer gestures stop navigation immediately', async ({ page }) => {
  await page.goto('/'); const map = page.locator('.cd-minimap');
  await map.evaluate(el => el.addEventListener('pointerdown', e => el.setAttribute('data-test-pointer', String((e as PointerEvent).pointerId))));
  const b = (await map.boundingBox())!;
  await page.mouse.move(b.x + 35, b.y + 30); await page.mouse.down();
  await map.evaluate(el => el.dispatchEvent(new PointerEvent('pointercancel', { pointerId:Number(el.getAttribute('data-test-pointer')) })));
  const before = await page.locator('[data-node="auth"]').boundingBox();
  await page.mouse.move(b.x + 135, b.y + 70, {steps:5}); await page.mouse.up();
  expect(await page.locator('[data-node="auth"]').boundingBox()).toEqual(before);
});

test('storage restrictions do not prevent folding the minimap', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new DOMException('Storage disabled', 'SecurityError'); };
    Storage.prototype.setItem = () => { throw new DOMException('Storage disabled', 'SecurityError'); };
  });
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/'); await page.locator('.cd-minimap-toggle').click();
  await expect(page.locator('.cd-minimap')).toBeHidden();
  await page.locator('.cd-minimap-toggle').click(); await expect(page.locator('.cd-minimap')).toBeVisible();
  expect(errors).toEqual([]);
});
