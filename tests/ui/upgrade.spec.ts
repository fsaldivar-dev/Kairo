import { test, expect, type Page } from '@playwright/test';

async function saved(page: Page) {
  await page.getByRole('button', {name:'Guardar',exact:true}).click();
  return page.evaluate(()=>JSON.parse(localStorage.getItem('codaru-diagram-example')!));
}
async function openExample(page: Page, id: string) {
  await page.locator('#explore-examples').click();
  await page.locator(`[data-example="${id}"]`).click();
}
for (const framework of ['react','vue']) test(`${framework}: controlled edits settle and retain undo and selection`, async ({page}) => {
  const errors: string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`/${framework}.html`);
  await expect(page.locator('#changes')).toHaveText('Cambios: 0');
  await page.locator('[data-node="a"] .cd-node-body').dblclick();
  await page.locator('.cd-inline-input').fill('Autenticación');
  await page.locator('.cd-inline-input').press('Enter');
  await expect(page.locator('[data-node="a"] .cd-title')).toHaveText('Autenticación');
  await expect(page.locator('#changes')).toHaveText('Cambios: 1');
  await expect(page.locator('[data-node="a"]')).toHaveClass(/is-selected/);
  await page.locator('#undo').click();
  await expect(page.locator('[data-node="a"] .cd-title')).toHaveText('AuthService');
  await expect(page.locator('#changes')).toHaveText('Cambios: 2');
  await page.locator('#swap').click();
  await expect(page.locator('.cd-node')).toHaveCount(3);
  await expect(page.locator('#changes')).toHaveText('Cambios: 2');
  expect(errors).toEqual([]);
});

test('gallery opens all twelve working scenes and undo restores the user document',async({page})=>{
  await page.goto('/');
  await page.locator('#node-title').fill('Trabajo propio');await page.locator('#node-title').press('Tab');
  const before=await saved(page);
  await page.locator('#explore-examples').click();
  await expect(page.locator('.example-card svg')).toHaveCount(12);
  await page.locator('[data-example="connections"]').click();
  await expect(page.locator('.cd-node')).toHaveCount(5);
  await expect(page.locator('#studio-title')).toHaveText('Formas y conexiones');
  await expect(page.locator('[data-node="rule"] path.cd-node-body')).toBeVisible();
  await expect(page.locator('[data-node="done"] ellipse.cd-node-body')).toBeVisible();
  const styled=await saved(page);await page.locator('#open-workshop').click();await page.locator('#studio-apply').click();
  expect((await saved(page)).layout).toEqual(styled.layout);
  await page.getByRole('button',{name:'Deshacer',exact:true}).click();
  expect((await saved(page)).graph).toEqual(before.graph);
  for(const id of ['decisions','architecture','groups','swimlane','cicd','microservices','state','scale']){
    await openExample(page,id);await expect(page.locator('.cd-node').first()).toBeVisible();
  }
  await expect(page.locator('.cd-node')).toHaveCount(100);
  await page.locator('#explore-examples').click();await page.locator('#studio-blank').click();
  await expect(page.locator('.cd-node')).toHaveCount(0);
  await page.getByRole('button',{name:'Deshacer',exact:true}).click();await expect(page.locator('.cd-node')).toHaveCount(100);
});

test('workshop validates before applying, preserves the canvas and supports undo and insertion',async({page})=>{
  await page.goto('/');const before=await saved(page);
  await page.locator('#open-workshop').click();
  await page.locator('#studio-format').selectOption('json');
  await page.locator('#studio-source').fill('{');
  await expect(page.locator('#studio-parse-status')).toHaveAttribute('data-state','error');
  await expect(page.locator('#studio-apply')).toBeDisabled();
  await expect(page.locator('.cd-node')).toHaveCount(7);
  await page.locator('#studio-format').selectOption('mermaid');
  await page.locator('#studio-source').fill('flowchart LR\n A[Solicitud] --> B{¿Listo?}\n B -->|Sí| C([Completo])');
  await expect(page.locator('#studio-parse-status')).toContainText('3 nodos · 2 conexiones');
  await expect(page.locator('#studio-preview svg')).toBeVisible();
  await page.locator('#studio-animate').check();
  await expect(page.locator('#studio-preview .ks-flow')).toHaveCount(2);
  await expect(page.locator('#studio-preview .ks-flow').first()).toHaveCSS('animation-name','ks-dash');
  const dl=page.waitForEvent('download');await page.locator('#studio-svg').click();expect((await dl).suggestedFilename()).toBe('kairo.editable.svg');
  const png=page.waitForEvent('download');await page.locator('#studio-png').click();expect((await png).suggestedFilename()).toBe('kairo.png');
  await page.locator('#studio-apply').click();await expect(page.locator('.cd-node')).toHaveCount(3);
  await page.getByRole('button',{name:'Deshacer',exact:true}).click();expect((await saved(page)).graph).toEqual(before.graph);
  await page.locator('#open-workshop').click();
  await page.locator('#studio-source').fill('flowchart LR\n newA[Otra entrada] --> newB[Salida]');
  await page.locator('#studio-insert').click();await expect(page.locator('.cd-node')).toHaveCount(9);
});

test('read-only blocks inspector, context menu, gallery, workshop and layouts; editing can resume',async({page})=>{
  await page.goto('/');const before=await saved(page);await page.locator('#readonly').click();
  await expect(page.locator('#node-title')).toBeDisabled();
  await page.locator('[data-node="auth"] .cd-node-body').click({button:'right'});
  const remove=page.locator('#ctxmenu').getByRole('menuitem',{name:'Eliminar',exact:true});await expect(remove).toBeDisabled();
  await remove.evaluate((b:HTMLButtonElement)=>b.click());
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Layout',exact:true}).click();
  await expect(page.getByRole('button',{name:'Reorganizar',exact:true})).toBeDisabled();await page.keyboard.press('Escape');
  await page.locator('#explore-examples').click();await expect(page.locator('[data-example="decisions"]')).toBeDisabled();await page.getByRole('button',{name:'Cerrar galería'}).click();
  await page.locator('#open-workshop').click();await expect(page.locator('#studio-apply')).toBeDisabled();await page.getByRole('button',{name:'Cerrar taller'}).click();
  expect((await saved(page)).graph).toEqual(before.graph);
  await page.locator('#readonly').click();await page.locator('[data-node="auth"] .cd-node-body').click();await expect(page.locator('#node-title')).toBeEnabled();
  await page.locator('#node-title').fill('Editable otra vez');await page.locator('#node-title').press('Tab');
  await expect(page.locator('[data-node="auth"] .cd-title')).toHaveText('Editable otra vez');
});

test('library filters and drag-drop create shapes; inspector edits geometry, organisation and connections',async({page})=>{
  await page.goto('/');await page.locator('#library-search').fill('Decisión');
  await expect(page.locator('.palette-item:visible')).toHaveCount(1);
  const transfer=await page.evaluateHandle(()=>new DataTransfer());
  await page.locator('[data-add="decision"]').dispatchEvent('dragstart',{dataTransfer:transfer});
  const box=(await page.locator('#diagram').boundingBox())!;
  await page.locator('#diagram').dispatchEvent('drop',{dataTransfer:transfer,clientX:box.x+150,clientY:box.y+200});
  await expect(page.locator('.cd-node')).toHaveCount(8);
  const selection=page.locator('.cd-node.is-selected');await expect(selection.locator('path.cd-node-body')).toBeVisible();
  const id=await selection.getAttribute('data-node');
  await page.locator('#node-width').fill('260');await page.locator('#node-width').press('Tab');
  await page.locator('#node-group').fill('Producto/Pruebas');await page.locator('#node-group').press('Tab');
  await page.locator('#node-lane').fill('Cliente');await page.locator('#node-lane').press('Tab');
  await page.locator('#connect-target').selectOption('auth');await page.locator('#connect-selected').click();
  const doc=await saved(page);expect(doc.layout.nodes[id!].width).toBe(260);expect(doc.graph.nodes.find((n:{id:string})=>n.id===id).group).toBe('Producto/Pruebas');expect(doc.graph.nodes.find((n:{id:string})=>n.id===id).lane).toBe('Cliente');expect(doc.graph.edges.some((e:{source:string,target:string})=>e.source===id&&e.target==='auth')).toBe(true);
});

test('guided controls allow loops, reverse layout and animate with explicit playback state',async({page})=>{
  await page.goto('/');await openExample(page,'connections');
  await page.locator('[data-policy="allowSelfLoops"]').check();
  await page.locator('#studio-direction').selectOption('RL');await page.locator('#studio-layout').click();
  const doc=await saved(page);expect(doc.layout.nodes.origin.x).toBeGreaterThan(doc.layout.nodes.done.x);
  await page.locator('#studio-play').click();await expect(page.locator('#studio-play')).toHaveText('Pausar');
  await expect(page.locator('#studio-progress')).toHaveText('Paso 5 de 5',{timeout:7000});await expect(page.locator('#studio-play')).toHaveText('Reproducir');
  await page.locator('#studio-stop').click();await expect(page.locator('#studio-progress')).toHaveText('Sin reproducir');
});

test('web component retains document edits across disconnect and remount',async({page})=>{
  await page.goto('http://127.0.0.1:1420/');
  const result=await page.evaluate(async(root)=>{
    const {defineKairoElement}=await import('/@fs'+root+'/packages/diagram/src/element.ts');
    const {createDocument}=await import('/@fs'+root+'/packages/diagram/src/document.ts');
    defineKairoElement('regression-kairo');
    const el=document.createElement('regression-kairo') as any;el.style='width:500px;height:300px';
    el.document=createDocument({nodes:[{id:'a',title:'Original',type:'process'}],edges:[]});document.body.append(el);
    el.editor.updateNode('a',{title:'Conservar'});el.editor.updateNodeLayout('a',{x:175});
    const before=el.document;el.remove();el.document.graph.nodes[0].title='Mutación externa';document.body.append(el);
    const after=el.document;el.remove();return {before,after};
  },process.cwd());
  expect(result.after).toEqual(result.before);
});

test('SVG export follows native path geometry and contains curves, labels and loops',async({page})=>{
  await page.goto('http://127.0.0.1:1420/');
  const failures=await page.evaluate(async(root)=>{
    const {createDiagram}=await import('/@fs'+root+'/packages/diagram/src/editor.ts');
    const {createDocument}=await import('/@fs'+root+'/packages/diagram/src/document.ts');
    const {toSVG}=await import('/@fs'+root+'/packages/diagram/src/export.ts');
    const host=document.createElement('div'),output=document.createElement('div');host.style='width:700px;height:650px';document.body.append(host,output);
    const failures:string[]=[];
    for(const style of ['smooth','rounded','orthogonal']) for(const port of ['top','right','bottom','left']) for(const position of ['start','middle','end']) for(const loop of [false,true]) {
      const d=createDocument({nodes:[{id:'a',title:'A',type:'process'},{id:'b',title:'B',type:'process'}],edges:[{id:'ab',source:'a',target:loop?'a':'b',label:'LABEL'}]});
      d.layout.nodes.a={x:50,y:80,width:200,height:92};d.layout.nodes.b={x:350,y:300,width:200,height:92};d.layout.edges.ab={sourcePort:port,targetPort:port,labelPosition:position,labelOffset:35};
      const e=createDiagram(host,{document:d,edgeStyle:style});output.innerHTML=toSVG(d,{edgeStyle:style,padding:10});
      const live=host.querySelector('.cd-edge-label')!,svg=output.querySelector('svg')!,label=[...svg.querySelectorAll('text')].find(t=>t.textContent==='LABEL')!;
      const delta=Math.hypot(Number(live.getAttribute('x'))-Number(label.getAttribute('x')),Number(live.getAttribute('y'))-Number(label.getAttribute('y')));
      const path=svg.querySelector('g > path') as SVGGraphicsElement,box=path.getBBox(),matrix=(path.parentElement as unknown as SVGGraphicsElement).transform.baseVal.consolidate()!.matrix,v=svg.viewBox.baseVal;
      if(delta>1||box.x+matrix.e<v.x||box.y+matrix.f<v.y||box.x+box.width+matrix.e>v.width||box.y+box.height+matrix.f>v.height)failures.push(`${style}/${port}/${position}/${loop}: ${delta}`);
      e.destroy();
    }
    host.remove();output.remove();return failures;
  },process.cwd());
  expect(failures).toEqual([]);
});

test('collapsed group drag moves the group, members and attached connection together',async({page})=>{
  await page.goto('http://127.0.0.1:1420/');
  await page.evaluate(async(root)=>{
    const {createDiagram}=await import('/@fs'+root+'/packages/diagram/src/editor.ts');
    const {createDocument}=await import('/@fs'+root+'/packages/diagram/src/document.ts');
    const host=document.createElement('div');host.id='group-regression';host.style='position:fixed;inset:0;background:white;z-index:10000';document.body.append(host);
    const d=createDocument({nodes:[{id:'a',title:'A',type:'process',group:'G'},{id:'b',title:'B',type:'process'}],edges:[{id:'ab',source:'a',target:'b'}]});
    d.layout.nodes.a.x=150;d.layout.nodes.b.x=550;const editor=createDiagram(host,{document:d});editor.setGroupCollapsed('G',true);(window as any).groupEditor=editor;
  },process.cwd());
  const before=await page.evaluate(()=>({group:Number(document.querySelector('#group-regression .cd-group-box')!.getAttribute('x')),node:(window as any).groupEditor.getDocument().layout.nodes.a.x,path:document.querySelector('#group-regression .cd-edge-path')!.getAttribute('d')}));
  const box=(await page.locator('#group-regression [data-group="G"]').boundingBox())!;
  await page.mouse.move(box.x+12,box.y+9);await page.mouse.down();await page.mouse.move(box.x+112,box.y+9,{steps:10});await page.mouse.up();
  const after=await page.evaluate(()=>({group:Number(document.querySelector('#group-regression .cd-group-box')!.getAttribute('x')),node:(window as any).groupEditor.getDocument().layout.nodes.a.x,path:document.querySelector('#group-regression .cd-edge-path')!.getAttribute('d')}));
  expect(after.node-before.node).toBeCloseTo(100,0);expect(after.group-before.group).toBeCloseTo(100,0);expect(after.path).not.toBe(before.path);
});
