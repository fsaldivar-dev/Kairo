import { test, expect } from '@playwright/test';

const shapes = ['rectangle','diamond','ellipse','pill','cylinder','document','parallelogram','hexagon','trapezoid','triangle','note','subprocess'];
test('catalog renders twelve distinct shapes with ports on their contours, including resized shapes', async ({page}) => {
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');await page.locator('#explore-examples').click();await page.locator('[data-example="shapes"]').click();
  await expect(page.locator('.cd-node')).toHaveCount(12);
  const checkContours = async () => page.locator('.cd-node').evaluateAll(nodes => nodes.flatMap(node => {
    const body=node.querySelector('.cd-node-body') as SVGGeometryElement;
    const normals:Record<string,[number,number]>={top:[0,-1],right:[1,0],bottom:[0,1],left:[-1,0]};
    return [...node.querySelectorAll('.cd-anchor')].flatMap(port=>{
      const x=Number(port.getAttribute('cx')),y=Number(port.getAttribute('cy')),[nx,ny]=normals[port.getAttribute('data-port')!];
      const inside=body.isPointInFill(new DOMPoint(x-nx,y-ny)),outside=body.isPointInFill(new DOMPoint(x+nx,y+ny));
      return inside&&!outside?[]:[`${node.getAttribute('data-shape')}:${port.getAttribute('data-port')}`];
    });
  }));
  expect(await checkContours()).toEqual([]);
  await page.locator('#tab-properties').click();
  for(const shape of shapes.slice(4)) {
    const node=page.locator(`[data-node="${shape}"]`);
    await expect(node.locator('path.cd-node-body')).toBeVisible();
    await node.locator('.cd-node-body').click();
    await expect(page.locator('#node-shape')).toHaveValue(shape);
    await page.locator('#node-width').fill('260');await page.locator('#node-width').press('Tab');
    await page.locator('#node-height').fill('150');await page.locator('#node-height').press('Tab');
  }
  expect(await checkContours()).toEqual([]);
  expect(errors).toEqual([]);
  await page.locator('#fit').click();
  await page.screenshot({path:`artifacts/shapes-${test.info().project.name}.png`});
});

test('shape library supports search, creation, inspector changes and undo; read-only blocks additions', async ({page}) => {
  await page.goto('/');await page.locator('[data-category="shapes"]').click();
  await expect(page.locator('.shape-piece:visible')).toHaveCount(12);
  await page.locator('#library-search').fill('triangulo');
  await expect(page.locator('.shape-piece:visible')).toHaveCount(1);
  await page.locator('[data-add-shape="triangle"]').click();
  await expect(page.locator('.cd-node')).toHaveCount(8);
  await expect(page.locator('.cd-node.is-selected')).toHaveAttribute('data-shape','triangle');
  await page.locator('#node-shape').selectOption('cylinder');
  await expect(page.locator('.cd-node.is-selected')).toHaveAttribute('data-shape','cylinder');
  await page.locator('#undo').click();await expect(page.locator('.cd-node[data-shape="triangle"]')).toHaveCount(1);
  await page.locator('#undo').click();await expect(page.locator('.cd-node')).toHaveCount(7);
  await page.locator('#readonly').click();await expect(page.locator('[data-add-shape="triangle"]')).toBeDisabled();
});

test('catalog exports editable SVG and restores all contours when imported', async ({page}) => {
  await page.goto('/');await page.locator('#explore-examples').click();await page.locator('[data-example="shapes"]').click();
  const paths=await page.locator('.cd-node-body').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('d')));
  await page.locator('#open-workshop').click();
  await expect(page.locator('#studio-preview svg')).toBeVisible();
  const downloading=page.waitForEvent('download');await page.locator('#studio-svg').click();const file=await (await downloading).path();
  const png=page.waitForEvent('download');await page.locator('#studio-png').click();expect((await png).suggestedFilename()).toBe('kairo.png');
  await page.getByRole('button',{name:'Cerrar taller'}).click();
  await page.locator('#explore-examples').click();await page.locator('#studio-blank').click();
  await page.locator('#file-input').setInputFiles(file!);
  await expect(page.locator('.cd-node')).toHaveCount(12);
  expect(await page.locator('.cd-node-body').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('d')))).toEqual(paths);
});

test('a shape can be dragged from the library and connected through its sloped port', async ({page}) => {
  await page.goto('/');await page.locator('#explore-examples').click();await page.locator('#studio-blank').click();
  await page.locator('[data-category="shapes"]').click();
  await page.locator('[data-add-shape="parallelogram"]').dragTo(page.locator('#diagram'),{targetPosition:{x:150,y:240}});
  await expect(page.locator('.cd-node[data-shape="parallelogram"]')).toHaveCount(1);
  await page.locator('[data-add-shape="cylinder"]').dragTo(page.locator('#diagram'),{targetPosition:{x:550,y:240}});
  await expect(page.locator('.cd-node[data-shape="cylinder"]')).toHaveCount(1);
  await page.locator('#fit').click();await page.locator('[data-tool="connect"]').click();
  const source=page.locator('[data-shape="parallelogram"] .cd-anchor-hit[data-port="right"]');
  const target=page.locator('[data-shape="cylinder"] .cd-anchor-hit[data-port="left"]');
  const a=(await source.boundingBox())!,b=(await target.boundingBox())!;
  await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:8});await page.mouse.up();
  await expect(page.locator('.cd-edge')).toHaveCount(1);
  await page.locator('#undo').click();await expect(page.locator('.cd-edge')).toHaveCount(0);
  await expect(page.locator('.cd-node')).toHaveCount(2);
});
