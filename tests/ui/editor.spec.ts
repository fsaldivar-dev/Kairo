import { test, expect, type Page } from '@playwright/test';

const node = (page: Page, id: string) => page.locator(`.cd-node[data-node="${id}"]`);

const MENU_GROUP: Record<string, string> = {"Resaltar cambios": "Análisis", "Ruta más corta": "Análisis", "Ruta crítica": "Análisis", "Holguras": "Análisis", "Diámetro": "Análisis", "Nodos clave": "Análisis", "Todas las rutas": "Análisis", "Rutas alternativas": "Análisis", "Corte mínimo": "Análisis", "Vecindario": "Análisis", "Nodos similares": "Análisis", "Simplificar": "Análisis", "Puntos críticos": "Análisis", "Fragmentación": "Análisis", "Brokers": "Análisis", "Influyentes": "Análisis", "Autovector": "Análisis", "Núcleo denso": "Análisis", "Núcleo robusto": "Análisis", "Cercanía": "Análisis", "Centralidad armónica": "Análisis", "Coeficientes": "Análisis", "Huella": "Análisis", "Modularidad": "Análisis", "Centro del grafo": "Análisis", "Entradas y salidas": "Análisis", "Ciclos": "Análisis", "Bucles": "Análisis", "Ruta euleriana": "Análisis", "Aristas de retroalimentación": "Análisis", "Impacto": "Análisis", "Dominadores": "Análisis", "Métricas de layout": "Análisis", "Complejidad": "Análisis", "Propiedades del grafo": "Análisis", "Sugerir conexiones": "Análisis", "Reorganizar": "Layout", "Auto-layout óptimo": "Layout", "Reducir cruces": "Layout", "Layout orgánico": "Layout", "Layout radial": "Layout", "Layout mapa mental": "Layout", "Layout árbol": "Layout", "Layout circular": "Layout", "Layout en línea": "Layout", "Layout cuadrícula": "Layout", "Layout por grupos": "Layout", "Ajustar tamaño al texto": "Layout", "Alinear a cuadrícula": "Layout", "Separar solapamientos": "Layout", "Auto-agrupar": "Layout", "Agrupar por tipo": "Layout", "Agrupar por comunidad": "Layout", "Colapsar grupos": "Layout", "Condensar ciclos": "Layout", "Contraer cadenas": "Layout", "Reflejar horizontal": "Layout", "Rotar 90 grados": "Layout", "Espaciar nodos": "Layout", "Aislar selección": "Layout", "Fusionar nodos": "Layout", "Fusionar duplicados": "Layout", "Quitar aristas duplicadas": "Layout", "Compactar componentes": "Layout", "Árbol de expansión": "Layout", "Podar hojas": "Layout", "Insertar nodo en arista": "Layout", "Omitir nodo": "Layout", "Añadir nodo estable": "Layout", "Importar auto": "Importar", "Abrir archivo": "Importar", "Importar texto": "Importar", "Importar DOT": "Importar", "Importar Graphviz JSON": "Importar", "Importar CSV": "Importar", "Importar GraphML": "Importar", "Importar GEXF": "Importar", "Importar GML": "Importar", "Importar Pajek": "Importar", "Importar Structurizr": "Importar", "Importar draw.io": "Importar", "Importar PlantUML": "Importar", "Importar D2": "Importar", "Importar nomnoml": "Importar", "Importar TGF": "Importar", "Importar DGML": "Importar", "Importar Cytoscape": "Importar", "Importar vis-network": "Importar", "Importar node-link": "Importar", "Importar graphology": "Importar", "Importar ELK": "Importar", "Importar JGF": "Importar", "Importar OPML": "Importar", "Importar BPMN": "Importar", "Importar Gantt": "Importar", "Importar Sankey": "Importar", "Importar Mermaid arquitectura": "Importar", "Importar Mermaid bloques": "Importar", "Importar JSON árbol": "Importar", "Importar lista de padres": "Importar", "Importar GraphQL": "Importar", "Importar JSON Schema": "Importar", "Importar esquema": "Importar", "Insertar decisión": "Importar", "Generar cuadrícula": "Importar", "Exportar JSON": "Exportar", "Exportar SVG": "Exportar", "SVG editable": "Exportar", "Exportar selección SVG": "Exportar", "Exportar PNG": "Exportar", "Exportar texto": "Exportar", "Exportar Mermaid con estilo": "Exportar", "Exportar DOT": "Exportar", "DOT posicionado": "Exportar", "Exportar Canvas": "Exportar", "Exportar HTML": "Exportar", "Exportar Excalidraw": "Exportar", "Exportar CSV": "Exportar", "Exportar matriz": "Exportar", "Matriz de alcance": "Exportar", "Exportar nodos CSV": "Exportar", "Exportar GraphML": "Exportar", "Exportar GEXF": "Exportar", "Exportar GML": "Exportar", "Exportar Pajek": "Exportar", "Exportar draw.io": "Exportar", "Exportar PlantUML": "Exportar", "PlantUML mindmap": "Exportar", "Importar mindmap PlantUML": "Importar", "Exportar D2": "Exportar", "Exportar nomnoml": "Exportar", "Exportar TGF": "Exportar", "Exportar DGML": "Exportar", "Exportar Structurizr": "Exportar", "Exportar Mermaid C4": "Exportar", "Exportar Mermaid arquitectura": "Exportar", "Exportar Mermaid bloques": "Exportar", "Exportar Cytoscape": "Exportar", "Exportar vis-network": "Exportar", "Exportar node-link": "Exportar", "Exportar graphology": "Exportar", "Exportar jerarquía": "Exportar", "Exportar ELK": "Exportar", "Exportar JGF": "Exportar", "Exportar OPML": "Exportar", "Exportar BPMN": "Exportar", "Exportar Markdown": "Exportar", "Exportar tablas Markdown": "Exportar", "Exportar leyenda": "Exportar", "SVG por categoría": "Exportar", "Exportar treemap": "Exportar", "Matriz SVG": "Exportar", "Exportar arcos": "Exportar", "Exportar cuerdas": "Exportar", "Exportar sunburst": "Exportar", "Exportar icicle": "Exportar", "Exportar Sankey SVG": "Exportar", "Exportar informe": "Exportar", "Exportar tarjeta de métricas": "Exportar", "Exportar página de informe": "Exportar", "Exportar procedimiento": "Exportar", "Exportar Gantt": "Exportar", "Exportar cronograma CSV": "Exportar", "Exportar Pie": "Exportar", "Exportar cuadrante": "Exportar", "Exportar Sankey": "Exportar", "Exportar línea de tiempo": "Exportar", "Exportar README": "Exportar", "Exportar TikZ": "Exportar", "Exportar Typst": "Exportar", "Exportar ASCII": "Exportar", "Copiar enlace": "Exportar", "Copiar imagen mermaid.ink": "Exportar", "Copiar imagen Kroki": "Exportar", "Editor mermaid.live": "Exportar"};
async function openFor(page: Page, name: string): Promise<void> {
  const g = MENU_GROUP[name];
  if (!g) return;
  const trigger = page.getByRole('button', { name: g, exact: true });
  if ((await trigger.getAttribute('aria-expanded')) !== 'true') await trigger.click();
}

async function savedDocument(page: Page) {
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  return page.evaluate(() => JSON.parse(localStorage.getItem('codaru-diagram-example')!));
}
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(node(page, 'auth')).toBeVisible();
  // The example focuses AuthService in its first animation frame; interaction starts after that initialization.
  await expect(node(page, 'auth')).toHaveClass(/is-selected/);
});

test('initial scene is complete and captures light and dark rendering', async ({ page }, info) => {
  await expect(page.locator('.cd-editor')).toHaveCSS('position', 'relative');
  await expect(page.locator('.cd-node')).toHaveCount(7);
  await expect(page.locator('.cd-edge')).toHaveCount(6);
  await expect(page.locator('#node-title')).toHaveValue('AuthService');
  await expect(node(page, 'auth')).toHaveClass(/is-selected/);
  await page.screenshot({ path: `artifacts/${info.project.name}-light.png`, animations: 'disabled' });
  await page.getByRole('button', { name: 'Cambiar tema' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(node(page, 'auth').locator('.cd-node-body')).toHaveCSS('fill', 'rgb(45, 41, 58)');
  await page.screenshot({ path: `artifacts/${info.project.name}-dark.png`, animations: 'disabled' });
});
test('node drag updates attached paths; undo and redo preserve the semantic graph', async ({ page }) => {
  const before = await savedDocument(page);
  const path = page.locator('[data-edge="login-auth"] .cd-edge-path');
  const oldPath = await path.getAttribute('d');
  const bounds = (await node(page, 'auth').locator('.cd-node-body').boundingBox())!;
  await page.mouse.move(bounds.x + 60, bounds.y + 25);
  await page.mouse.down(); await page.mouse.move(bounds.x + 100, bounds.y + 100, { steps: 8 }); await page.mouse.up();
  await expect(path).not.toHaveAttribute('d', oldPath!);
  const after = await savedDocument(page);
  expect(after.graph).toEqual(before.graph);
  expect(after.layout.nodes.auth.y).toBeGreaterThan(before.layout.nodes.auth.y);
  await page.getByRole('button', { name: 'Deshacer', exact: true }).click();
  expect((await savedDocument(page)).layout.nodes.auth).toEqual(before.layout.nodes.auth);
  await page.getByRole('button', { name: 'Rehacer', exact: true }).click();
  expect((await savedDocument(page)).layout.nodes.auth).toEqual(after.layout.nodes.auth);
});
test('a click only selects, including at fractional zoom', async ({ page }) => {
  const before = await savedDocument(page);
  await page.getByRole('button', { name: 'Alejar', exact: true }).click();
  await node(page, 'auth').locator('.cd-node-body').click();
  await expect(page.getByRole('button', { name: 'Deshacer', exact: true })).toBeDisabled();
  expect((await savedDocument(page)).layout).toEqual(before.layout);
});
test('connector snaps near target without a pixel-perfect hit', async ({ page }) => {
  await page.getByRole('button', { name: 'Conectar', exact: true }).click();
  const source = (await node(page, 'login').locator('.cd-anchor[data-port="bottom"]').boundingBox())!;
  const target = (await node(page, 'dashboard').locator('.cd-anchor[data-port="top"]').boundingBox())!;
  await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
  await page.mouse.down();
  await page.mouse.move(target.x + target.width / 2 + 17, target.y + target.height / 2 - 3, { steps: 10 });
  await expect(node(page, 'dashboard')).toHaveClass(/is-target/);
  await expect(node(page, 'dashboard').locator('.is-snap')).toHaveCount(1);
  await page.mouse.up();
  await expect(page.locator('.cd-edge')).toHaveCount(7);
  const doc = await savedDocument(page);
  const connection = doc.graph.edges.find((e: { source: string; target: string }) => e.source === 'login' && e.target === 'dashboard');
  expect(doc.layout.edges[connection.id]).toEqual({ sourcePort: 'bottom', targetPort: 'top' });
});
test('cancelling a drag rolls back layout and does not create history', async ({ page }) => {
  const before = await savedDocument(page), bounds = (await node(page, 'auth').locator('.cd-node-body').boundingBox())!;
  await page.mouse.move(bounds.x + 60, bounds.y + 25); await page.mouse.down();
  await page.mouse.move(bounds.x + 110, bounds.y + 80, { steps: 5 });
  await page.keyboard.press('Escape'); await page.mouse.up();
  expect((await savedDocument(page)).layout).toEqual(before.layout);
  await expect(page.getByRole('button', { name: 'Deshacer', exact: true })).toBeDisabled();
});
test('deleting a node removes incident edges and can be undone', async ({ page }) => {
  await node(page, 'auth').locator('.cd-node-body').click();
  await page.keyboard.press('Backspace');
  await expect(page.locator('.cd-node')).toHaveCount(6);
  await expect(page.locator('.cd-edge')).toHaveCount(3);
  await page.getByRole('button', { name: 'Deshacer', exact: true }).click();
  await expect(page.locator('.cd-node')).toHaveCount(7);
  await expect(page.locator('.cd-edge')).toHaveCount(6);
});
test('adding, renaming and reloading a document preserves user data', async ({ page }) => {
  await page.getByTitle('Añadir Component').click();
  await expect(page.locator('.cd-node')).toHaveCount(8);
  await page.locator('#node-title').fill('<A & B>'); await page.locator('#node-title').press('Tab');
  await expect(page.locator('.cd-title').filter({ hasText: '<A & B>' })).toHaveCount(1);
  const saved = await savedDocument(page);
  await page.reload();
  await page.getByRole('button', { name: 'Abrir', exact: true }).click();
  await expect(page.locator('.cd-node')).toHaveCount(8);
  expect((await savedDocument(page)).graph).toEqual(saved.graph);
});
test('zoom changes level of detail, and both route styles are available', async ({ page }) => {
  for (let i = 0; i < 5; i++) await page.getByRole('button', { name: 'Alejar', exact: true }).click();
  await expect(page.locator('.cd-editor')).toHaveAttribute('data-detail', 'low');
  await expect(node(page, 'auth').locator('.cd-type')).toBeHidden();
  await page.locator('#zoom-value').click();
  await page.getByRole('button', { name: 'Acercar', exact: true }).click();
  await expect(page.locator('.cd-editor')).toHaveAttribute('data-detail', 'high');
  await expect(node(page, 'auth').locator('.cd-source')).toBeVisible();
  await page.getByLabel('Estilo de conexiones').selectOption('smooth');
  await expect(page.locator('.cd-edge-path').first()).toHaveAttribute('d', / C /);
  await page.getByLabel('Estilo de conexiones').selectOption('rounded');
  await expect(page.locator('.cd-edge-path').first()).not.toHaveAttribute('d', / C /);
});
test('no JS errors occur during the main workflow', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.reload();
  await page.getByTitle('Añadir Database').click();
  await page.getByRole('button', { name: 'Ajustar a la vista' }).click();
  await page.getByRole('button', { name: 'Cambiar tema' }).click();
  await savedDocument(page);
  expect(errors).toEqual([]);
});

test('decision example renders actual shapes and edits semantic and visual edge data', async ({ page }, info) => {
  await page.getByLabel('Ejemplo', { exact: true }).selectOption('decisions');
  await expect(page.locator('.cd-node')).toHaveCount(5);
  await expect(node(page, 'check').locator('path.cd-node-body')).toBeVisible();
  await expect(node(page, 'deny').locator('ellipse.cd-node-body')).toBeVisible();
  await page.screenshot({ path: `artifacts/${info.project.name}-decisions.png`, animations: 'disabled' });
  await page.locator('#node-tags').fill('security, review'); await page.locator('#node-tags').press('Tab');
  await page.locator('#node-shape').selectOption('ellipse');
  await expect(node(page, 'check').locator('ellipse.cd-node-body')).toBeVisible();
  await page.getByRole('button', { name: 'Deshacer', exact: true }).click();
  await expect(node(page, 'check').locator('path.cd-node-body')).toBeVisible();
  await page.locator('[data-edge="yes"]').focus(); await page.keyboard.press('Enter');
  await page.locator('#edge-label').fill('Permitido'); await page.locator('#edge-label').press('Tab');
  await page.locator('#edge-relation').fill('autoriza'); await page.locator('#edge-relation').press('Tab');
  await page.locator('#startMarker').selectOption('arrow');
  await page.locator('#endMarker').selectOption('dot');
  await page.locator('#edge-dashed').selectOption('true');
  const saved = await savedDocument(page);
  expect(saved.version).toBe(2);
  expect(saved.graph.nodes.find((n: { id: string }) => n.id === 'check').tags).toEqual(['security', 'review']);
  expect(saved.graph.edges.find((e: { id: string }) => e.id === 'yes')).toMatchObject({ label: 'Permitido', relation: 'autoriza', condition: 'authorized' });
  expect(saved.layout.edges.yes).toMatchObject({ startMarker: 'arrow', endMarker: 'dot', dashed: true });
  await expect(page.locator('[data-edge="yes"] .cd-edge-path')).toHaveAttribute('stroke-dasharray', '6 4');
  await page.reload(); await page.getByRole('button', { name: 'Abrir', exact: true }).click();
  await expect(node(page, 'check').locator('path.cd-node-body')).toBeVisible();
  expect((await savedDocument(page)).graph).toEqual(saved.graph);
  await expect(page.getByLabel('Ejemplo', { exact: true })).toHaveValue('decisions');
  await expect(page.locator('.document-card strong')).toHaveText('Decisión de acceso');
});

test('flow diagnostics track edits and undo, and navigate to the affected element', async ({ page }) => {
  await page.getByLabel('Ejemplo', { exact: true }).selectOption('decisions');
  await expect(page.locator('#flow-summary')).toHaveText('Estructura del flujo válida');
  await page.locator('[data-edge="yes"]').focus(); await page.keyboard.press('Enter');
  await page.locator('#edge-label').fill(''); await page.locator('#edge-label').press('Tab');
  await expect(page.locator('#flow-summary')).toContainText('1 errores');
  await page.locator('#flow-summary').click();
  await page.locator('.flow-issue').filter({ hasText: 'Asigna un nombre' }).click();
  await expect(page.locator('[data-edge="yes"]')).toHaveClass(/is-selected/);
  await page.getByRole('button', { name: 'Deshacer', exact: true }).click();
  await expect(page.locator('#flow-summary')).toHaveText('Estructura del flujo válida');
});

const edgeOf = (doc: any, id: string) => doc.graph.edges.find((e: { id: string }) => e.id === id);
async function selectEdge(page: Page, id: string) {
  const edge = page.locator(`[data-edge="${id}"]`);
  await edge.press('Enter');
  await expect(edge).toHaveClass(/is-selected/);
}

test('reversing a connection swaps endpoints and ports, keeps the line in place, and is undoable', async ({ page }) => {
  await selectEdge(page, 'login-auth');
  const before = await page.locator('[data-edge="login-auth"] .cd-edge-path').getAttribute('d');
  await page.getByRole('button', { name: 'Invertir dirección' }).click();
  let doc = await savedDocument(page);
  expect(edgeOf(doc, 'login-auth')).toMatchObject({ source: 'auth', target: 'login', label: 'autentica' });
  expect(doc.layout.edges['login-auth']).toEqual({ sourcePort: 'left', targetPort: 'right' });
  await expect(page.locator('[data-edge="login-auth"]')).toHaveAttribute('aria-label', 'Conexión auth a login');
  await expect(page.locator('#edge-source')).toHaveValue('auth');
  const after = await page.locator('[data-edge="login-auth"] .cd-edge-path').getAttribute('d');
  expect(after!.split(' ').at(-2)).toBe(before!.split(' ')[1]);
  await page.keyboard.press('r');
  expect(edgeOf(await savedDocument(page), 'login-auth')).toMatchObject({ source: 'login', target: 'auth' });
  await page.getByRole('button', { name: 'Deshacer', exact: true }).click();
  doc = await savedDocument(page);
  expect(edgeOf(doc, 'login-auth')).toMatchObject({ source: 'auth', target: 'login' });
  expect(doc.graph.edges).toHaveLength(6);
});
test('dragging an endpoint handle reconnects the edge; Escape cancels without touching the document', async ({ page }) => {
  const original = await savedDocument(page);
  await selectEdge(page, 'login-auth');
  const handle = page.locator('.cd-edge-handle[data-handle="target"]');
  await expect(handle).toBeVisible();
  const grab = async () => { const h = (await handle.boundingBox())!; await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2); await page.mouse.down(); };
  const target = (await node(page, 'users').locator('.cd-anchor[data-port="left"]').boundingBox())!;
  await grab();
  await page.mouse.move(target.x + target.width / 2 + 6, target.y + target.height / 2 - 4, { steps: 10 });
  await expect(node(page, 'users')).toHaveClass(/is-target/);
  await page.keyboard.press('Escape'); await page.mouse.up();
  expect((await savedDocument(page)).graph).toEqual(original.graph);
  await expect(page.getByRole('button', { name: 'Deshacer', exact: true })).toBeDisabled();
  await expect(node(page, 'users')).not.toHaveClass(/is-target/);
  await selectEdge(page, 'login-auth');
  await grab();
  await page.mouse.move(target.x + target.width / 2 + 6, target.y + target.height / 2 - 4, { steps: 10 });
  await page.mouse.up();
  const doc = await savedDocument(page);
  expect(edgeOf(doc, 'login-auth')).toMatchObject({ source: 'login', target: 'users', label: 'autentica' });
  expect(doc.layout.edges['login-auth']).toEqual({ sourcePort: 'right', targetPort: 'left' });
  expect(doc.graph.edges).toHaveLength(6);
  await expect(page.locator('[data-edge="login-auth"]')).toHaveClass(/is-selected/);
  await expect(page.locator('#edge-target')).toHaveValue('users');
  await page.getByRole('button', { name: 'Deshacer', exact: true }).click();
  expect((await savedDocument(page)).graph).toEqual(original.graph);
});
test('architecture profile refuses duplicate connections from the inspector but renders self-loops', async ({ page }) => {
  await selectEdge(page, 'auth-session');
  await page.locator('#edge-source').selectOption('dashboard');
  await expect(page.locator('#toast')).toHaveText('Ya existe una conexión en esa dirección entre estos nodos.');
  await expect(page.locator('#edge-source')).toHaveValue('auth');
  await expect(page.getByRole('button', { name: 'Deshacer', exact: true })).toBeDisabled();
  await selectEdge(page, 'login-auth');
  await page.locator('#edge-target').selectOption('login');
  const doc = await savedDocument(page);
  expect(edgeOf(doc, 'login-auth')).toMatchObject({ source: 'login', target: 'login' });
  expect(doc.layout.edges['login-auth']).toEqual({ sourcePort: 'right', targetPort: 'bottom' });
  const d = (await page.locator('[data-edge="login-auth"] .cd-edge-path').getAttribute('d'))!;
  expect(d).not.toMatch(/NaN/);
  expect(d).toMatch(/ Q /);
  await expect(page.locator('[data-edge="login-auth"] .cd-edge-label')).toHaveText('autentica');
});
test('flow profile allows two branches to the same step but still refuses self-loops', async ({ page }) => {
  await page.getByLabel('Ejemplo', { exact: true }).selectOption('decisions');
  await selectEdge(page, 'yes');
  await page.locator('#edge-target').selectOption('deny');
  let doc = await savedDocument(page);
  expect(doc.profile).toBe('flow');
  expect(doc.graph.edges.filter((e: { source: string; target: string }) => e.source === 'check' && e.target === 'deny').map((e: { id: string }) => e.id).sort()).toEqual(['no', 'yes']);
  await expect(page.locator('#flow-summary')).toContainText('avisos');
  await page.locator('#edge-target').selectOption('check');
  await expect(page.locator('#toast')).toHaveText('Este perfil no permite conectar un nodo consigo mismo.');
  doc = await savedDocument(page);
  expect(edgeOf(doc, 'yes').target).toBe('deny');
  await expect(page.locator('#edge-target')).toHaveValue('deny');
});

test('node tags render as chips and update live when edited', async ({ page }) => {
  await page.getByLabel('Ejemplo', { exact: true }).selectOption('decisions');
  await expect(node(page, 'start').locator('.cd-tag-text')).toHaveText('acceso');
  await expect(node(page, 'check').locator('.cd-tag-text')).toHaveText('seguridad');
  await node(page, 'check').locator('.cd-node-body').click();
  await page.locator('#node-tags').fill('seguridad, crítico, revisado'); await page.locator('#node-tags').press('Tab');
  await expect(node(page, 'check').locator('.cd-tag')).toHaveCount(3);
  await expect(node(page, 'check').locator('.cd-tag-text').nth(2)).toHaveText('revisado');
  await page.getByRole('button', { name: 'Deshacer', exact: true }).click();
  await expect(node(page, 'check').locator('.cd-tag')).toHaveCount(1);
});

test('double-clicking a node edits its title in place; Enter commits and Escape cancels', async ({ page }) => {
  const input = page.locator('.cd-inline-input');
  await node(page, 'auth').locator('.cd-node-body').dblclick();
  await expect(input).toBeVisible();
  await expect(input).toHaveValue('AuthService');
  await input.fill('Gatekeeper'); await input.press('Enter');
  await expect(input).toBeHidden();
  await expect(node(page, 'auth').locator('.cd-title')).toHaveText('Gatekeeper');
  expect((await savedDocument(page)).graph.nodes.find((n: { id: string }) => n.id === 'auth').title).toBe('Gatekeeper');
  await node(page, 'auth').locator('.cd-node-body').dblclick();
  await input.fill('Descartado'); await input.press('Escape');
  await expect(input).toBeHidden();
  await expect(node(page, 'auth').locator('.cd-title')).toHaveText('Gatekeeper');
});
test('double-clicking an edge edits its label and keeps editing modal', async ({ page }) => {
  const input = page.locator('.cd-inline-input');
  await page.locator('[data-edge="login-auth"] .cd-edge-hit').dblclick({ force: true });
  await expect(input).toHaveValue('autentica');
  await input.fill('inicia sesión'); await input.press('Enter');
  await expect(page.locator('[data-edge="login-auth"] .cd-edge-label')).toHaveText('inicia sesión');
  const doc = await savedDocument(page);
  expect(doc.graph.edges.find((e: { id: string }) => e.id === 'login-auth').label).toBe('inicia sesión');
  await page.getByRole('button', { name: 'Deshacer', exact: true }).click();
  expect((await savedDocument(page)).graph.edges.find((e: { id: string }) => e.id === 'login-auth').label).toBe('autentica');
});

test('edge label can be repositioned and offset, persisting and surviving reload', async ({ page }) => {
  await selectEdge(page, 'login-auth');
  const label = page.locator('[data-edge="login-auth"] .cd-edge-label');
  const start = JSON.parse(`[${(await label.getAttribute('x'))},${(await label.getAttribute('y'))}]`);
  await page.locator('#edge-label-position').selectOption('end');
  const movedX = Number(await label.getAttribute('x'));
  expect(Math.abs(movedX - start[0])).toBeGreaterThan(20);
  await page.locator('#edge-label-offset').fill('-20');
  await page.locator('#edge-label-offset').dispatchEvent('input');
  const doc = await savedDocument(page);
  expect(doc.layout.edges['login-auth']).toMatchObject({ labelPosition: 'end', labelOffset: -20 });
  await page.reload(); await page.getByRole('button', { name: 'Abrir', exact: true }).click();
  expect((await savedDocument(page)).layout.edges['login-auth']).toMatchObject({ labelPosition: 'end', labelOffset: -20 });
});

test('adding a Decisión from the library creates a diamond by default', async ({ page }) => {
  await page.getByTitle('Añadir Decisión').click();
  await expect(page.locator('.cd-node')).toHaveCount(8);
  await expect(page.locator('#node-shape')).toHaveValue('diamond');
  const created = (await savedDocument(page)).graph.nodes.at(-1).id;
  expect((await savedDocument(page)).layout.nodes[created].shape).toBe('diamond');
  await expect(page.locator(`.cd-node[data-node="${created}"] path.cd-node-body`)).toBeVisible();
});

test('Ctrl/Cmd+D duplicates the selected node and selects the copy as one undo', async ({ page }) => {
  await node(page, 'auth').locator('.cd-node-body').click();
  await expect(page.locator('.cd-node')).toHaveCount(7);
  const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
  await page.keyboard.press(`${modifier}+KeyD`);
  await expect(page.locator('.cd-node')).toHaveCount(8);
  const doc = await savedDocument(page);
  const copies = doc.graph.nodes.filter((n: { title: string }) => n.title === 'AuthService');
  expect(copies).toHaveLength(2);
  const copy = copies.find((n: { id: string }) => n.id !== 'auth');
  expect(doc.layout.nodes[copy.id].x).toBe(doc.layout.nodes.auth.x + 32);
  expect(doc.graph.edges).toHaveLength(6);
  await expect(page.locator(`.cd-node[data-node="${copy.id}"]`)).toHaveClass(/is-selected/);
  await page.getByRole('button', { name: 'Deshacer', exact: true }).click();
  await expect(page.locator('.cd-node')).toHaveCount(7);
});

test('Ctrl/Cmd+C then +V pastes a copy of the selection as one undo', async ({ page }) => {
  const mod = process.platform === 'darwin' ? 'Meta' : 'Control';
  await node(page, 'auth').locator('.cd-node-body').click();
  await expect(page.locator('.cd-node')).toHaveCount(7);
  await page.keyboard.press(`${mod}+KeyC`);
  await page.keyboard.press(`${mod}+KeyV`);
  await expect(page.locator('.cd-node')).toHaveCount(8); // pasted copy
  const doc = await savedDocument(page);
  expect(doc.graph.nodes.filter((n: { title: string }) => n.title === 'AuthService')).toHaveLength(2);
  await page.getByRole('button', { name: 'Deshacer', exact: true }).click();
  await expect(page.locator('.cd-node')).toHaveCount(7); // paste is one undo
});

test('the command palette can select a node plus its downstream and its connected component', async ({ page }) => {
  const mod = process.platform === 'darwin' ? 'Meta' : 'Control';
  // Downstream of auth: users, session, gateway, firebase (+ auth) = 5.
  await node(page, 'auth').locator('.cd-node-body').click();
  await page.keyboard.press(`${mod}+KeyK`);
  await page.locator('#palette-input').fill('aguas abajo');
  await page.keyboard.press('Enter');
  await expect(page.locator('.cd-node.is-selected')).toHaveCount(5);
  // Connected component of auth = the whole 7-node sample (it is connected).
  await page.keyboard.press(`${mod}+KeyK`);
  await page.locator('#palette-input').fill('componente conexo');
  await page.keyboard.press('Enter');
  await expect(page.locator('.cd-node.is-selected')).toHaveCount(7);
});

test('the command palette exposes clipboard/edit actions (Duplicar, Eliminar)', async ({ page }) => {
  const mod = process.platform === 'darwin' ? 'Meta' : 'Control';
  await node(page, 'auth').locator('.cd-node-body').click();
  // Duplicate via the palette.
  await page.keyboard.press(`${mod}+KeyK`);
  await page.locator('#palette-input').fill('Duplicar');
  await page.keyboard.press('Enter');
  await expect(page.locator('.cd-node')).toHaveCount(8);
  // Delete the (still-selected) copy via the palette.
  await page.keyboard.press(`${mod}+KeyK`);
  await page.locator('#palette-input').fill('Eliminar');
  await page.keyboard.press('Enter');
  await expect(page.locator('.cd-node')).toHaveCount(7);
});

test('pressing f fits the viewport to the selection (zooms in versus fit-all)', async ({ page }) => {
  const zoom = () => page.evaluate(() => (window as unknown as { kairoEditor?: { getViewport(): { zoom: number } } }).kairoEditor?.getViewport().zoom ?? Number(document.querySelector('#zoom-value')!.textContent!.replace('%', '')) / 100);
  // Fit all first via the toolbar, record zoom.
  await page.locator('#fit').click();
  const all = await zoom();
  // Select two adjacent nodes and fit to them -> should zoom in (smaller extent).
  await node(page, 'auth').locator('.cd-node-body').click();
  await node(page, 'users').locator('.cd-node-body').click({ modifiers: ['Shift'] });
  await page.keyboard.press('f');
  await expect.poll(zoom).toBeGreaterThan(all);
});

test('Delete removes the selected node and its edges (undoable)', async ({ page }) => {
  await node(page, 'auth').locator('.cd-node-body').click();
  await expect(page.locator('.cd-node')).toHaveCount(7);
  await page.keyboard.press('Delete');
  await expect(page.locator('.cd-node')).toHaveCount(6);
  await expect(node(page, 'auth')).toHaveCount(0);
  // auth's edges (login-auth, auth-users, auth-session) are gone too.
  await expect(page.locator('.cd-edge')).toHaveCount(3);
  await page.getByRole('button', { name: 'Deshacer', exact: true }).click();
  await expect(page.locator('.cd-node')).toHaveCount(7);
});

test('importing Mermaid-like text replaces the document and lays it out', async ({ page }) => {
  page.on('dialog', d => d.accept('flowchart LR\n  X[Entrada] --> Y{Revisar}\n  Y -->|ok| Z([Fin])'));
  await openFor(page, 'Importar texto'); await page.getByRole('button', { name: 'Importar texto' }).click();
  await expect(page.locator('.cd-node')).toHaveCount(3);
  await expect(node(page, 'Y').locator('path.cd-node-body')).toBeVisible();
  await expect(node(page, 'Z').locator('rect.cd-node-body')).toBeVisible();
  const doc = await savedDocument(page);
  expect(doc.profile).toBe('flow');
  expect(doc.graph.edges.find((e: { target: string }) => e.target === 'Z').label).toBe('ok');
  expect(doc.layout.nodes.X.x).toBeLessThan(doc.layout.nodes.Y.x);
});

test('exporting SVG downloads a self-contained themed vector of the diagram', async ({ page }) => {
await openFor(page, 'Exportar SVG');
    const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar SVG' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('diagrama.kairo.svg');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const c of stream) chunks.push(c as Buffer);
  const svg = Buffer.concat(chunks).toString('utf8');
  expect(svg.startsWith('<svg')).toBe(true);
  expect(svg).toContain('AuthService');
  expect(svg).not.toMatch(/NaN|undefined/);
});

test('exporting the selection as SVG includes only the selected nodes', async ({ page }) => {
  await node(page, 'auth').locator('.cd-node-body').click();
  await node(page, 'users').locator('.cd-node-body').click({ modifiers: ['Shift'] });
  await openFor(page, 'Exportar selección SVG');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar selección SVG' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('seleccion.kairo.svg');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const c of stream) chunks.push(c as Buffer);
  const svg = Buffer.concat(chunks).toString('utf8');
  expect(svg).toContain('AuthService');
  expect(svg).toContain('UserDatabase');
  expect(svg).not.toContain('LoginView'); // not selected -> excluded
  expect(svg).not.toContain('Firebase');
});

test('exporting ASCII downloads a monospaced text picture of the diagram', async ({ page }) => {
  await openFor(page, 'Exportar ASCII');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar ASCII' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('diagrama.txt');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const c of stream) chunks.push(c as Buffer);
  const art = Buffer.concat(chunks).toString('utf8');
  expect(art).toContain('AuthService');
  expect(art).toMatch(/[┌┐└┘─│]/);
  expect(art).not.toMatch(/NaN|undefined/);
});

test('exporting Mermaid text downloads a .mmd file that re-imports to the same structure', async ({ page }) => {
await openFor(page, 'Exportar texto');
    const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar texto' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('diagrama.kairo.mmd');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const c of stream) chunks.push(c as Buffer);
  const text = Buffer.concat(chunks).toString('utf8');
  expect(text.startsWith('flowchart')).toBe(true);
  expect(text).toContain('AuthService');
  page.on('dialog', d => d.accept(text));
  await openFor(page, 'Importar texto'); await page.getByRole('button', { name: 'Importar texto' }).click();
  await expect(page.locator('.cd-node')).toHaveCount(7);
});

test('a selected node shows a resize handle; dragging it resizes, clamps to a minimum, and undoes', async ({ page }) => {
  await node(page, 'auth').locator('.cd-node-body').click();
  const handle = page.locator('.cd-resize-handle');
  await expect(handle).toBeVisible();
  const before = await savedDocument(page);
  const h = (await handle.boundingBox())!;
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
  await page.mouse.down(); await page.mouse.move(h.x + 120, h.y + 80, { steps: 10 }); await page.mouse.up();
  const after = await savedDocument(page);
  expect(after.layout.nodes.auth.width).toBeGreaterThan(before.layout.nodes.auth.width + 80);
  expect(after.layout.nodes.auth.height).toBeGreaterThan(before.layout.nodes.auth.height + 50);
  expect(after.layout.nodes.auth.x).toBe(before.layout.nodes.auth.x);
  await page.getByRole('button', { name: 'Deshacer', exact: true }).click();
  expect((await savedDocument(page)).layout.nodes.auth).toEqual(before.layout.nodes.auth);
  // Shrinking past the minimum clamps instead of producing an invalid box.
  await node(page, 'auth').locator('.cd-node-body').click();
  await expect(handle).toBeVisible();
  const h2 = (await handle.boundingBox())!;
  await page.mouse.move(h2.x + h2.width / 2, h2.y + h2.height / 2);
  await page.mouse.down(); await page.mouse.move(h2.x - 400, h2.y - 400, { steps: 10 }); await page.mouse.up();
  const shrunk = await savedDocument(page);
  expect(shrunk.layout.nodes.auth.width).toBe(140);
  expect(shrunk.layout.nodes.auth.height).toBe(76);
});
test('resize can be cancelled with Escape, leaving no history entry', async ({ page }) => {
  await node(page, 'auth').locator('.cd-node-body').click();
  const before = await savedDocument(page);
  const h = (await page.locator('.cd-resize-handle').boundingBox())!;
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
  await page.mouse.down(); await page.mouse.move(h.x + 90, h.y + 60, { steps: 6 });
  await page.keyboard.press('Escape'); await page.mouse.up();
  expect((await savedDocument(page)).layout.nodes.auth).toEqual(before.layout.nodes.auth);
  await expect(page.getByRole('button', { name: 'Deshacer', exact: true })).toBeDisabled();
});

test('Shift-click builds a multi-selection and dragging a member moves the whole group as one undo', async ({ page }) => {
  await node(page, 'auth').locator('.cd-node-body').click();
  await node(page, 'users').locator('.cd-node-body').click({ modifiers: ['Shift'] });
  await expect(node(page, 'auth')).toHaveClass(/is-selected/);
  await expect(node(page, 'users')).toHaveClass(/is-selected/);
  // No resize handle while several nodes are selected.
  await expect(page.locator('.cd-resize-handle')).toBeHidden();
  const before = await savedDocument(page);
  const grab = (await node(page, 'auth').locator('.cd-node-body').boundingBox())!;
  await page.mouse.move(grab.x + 40, grab.y + 25);
  await page.mouse.down(); await page.mouse.move(grab.x + 40 + 60, grab.y + 25 + 40, { steps: 10 }); await page.mouse.up();
  const after = await savedDocument(page);
  const dx = after.layout.nodes.auth.x - before.layout.nodes.auth.x, dy = after.layout.nodes.auth.y - before.layout.nodes.auth.y;
  expect(dx).toBeGreaterThan(20); expect(dy).toBeGreaterThan(15);
  expect(after.layout.nodes.users.x - before.layout.nodes.users.x).toBeCloseTo(dx, 3);
  expect(after.layout.nodes.users.y - before.layout.nodes.users.y).toBeCloseTo(dy, 3);
  expect(after.graph).toEqual(before.graph);
  await page.getByRole('button', { name: 'Deshacer', exact: true }).click();
  expect((await savedDocument(page)).layout.nodes.auth).toEqual(before.layout.nodes.auth);
});
test('Shift-dragging empty canvas marquee-selects enclosed nodes, then Delete removes them all', async ({ page }) => {
  const a = (await node(page, 'login').boundingBox())!, b = (await node(page, 'auth').boundingBox())!;
  const x0 = Math.min(a.x, b.x) - 10, y0 = Math.min(a.y, b.y) - 10;
  const x1 = Math.max(a.x + a.width, b.x + b.width) + 10, y1 = Math.max(a.y + a.height, b.y + b.height) + 10;
  await page.mouse.move(x0, y0, { steps: 2 });
  await page.keyboard.down('Shift');
  await page.mouse.down(); await page.mouse.move(x1, y1, { steps: 12 }); await page.mouse.up();
  await page.keyboard.up('Shift');
  await expect(node(page, 'login')).toHaveClass(/is-selected/);
  await expect(node(page, 'auth')).toHaveClass(/is-selected/);
  await page.keyboard.press('Backspace');
  await expect(page.locator('.cd-node')).toHaveCount(5);
  // Both nodes and their incident edges are gone.
  await expect(page.locator('[data-edge="login-auth"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Deshacer', exact: true }).click();
  await expect(page.locator('.cd-node')).toHaveCount(7);
});
test('Shift-clicking a selected node removes it from the multi-selection', async ({ page }) => {
  await node(page, 'auth').locator('.cd-node-body').click();
  await node(page, 'users').locator('.cd-node-body').click({ modifiers: ['Shift'] });
  await node(page, 'auth').locator('.cd-node-body').click({ modifiers: ['Shift'] });
  await expect(node(page, 'auth')).not.toHaveClass(/is-selected/);
  await expect(node(page, 'users')).toHaveClass(/is-selected/);
});

test('copy and paste duplicates a connected pair with a remapped internal edge, as one undo', async ({ page }) => {
  const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
  await node(page, 'login').locator('.cd-node-body').click();
  await node(page, 'auth').locator('.cd-node-body').click({ modifiers: ['Shift'] });
  await page.keyboard.press(`${modifier}+KeyC`);
  await page.keyboard.press(`${modifier}+KeyV`);
  await expect(page.locator('.cd-node')).toHaveCount(9);
  await expect(page.locator('.cd-edge')).toHaveCount(7);
  const doc = await savedDocument(page);
  // The pasted internal edge connects two pasted nodes, not the originals.
  const originals = new Set(['login', 'auth']);
  const pastedEdge = doc.graph.edges.find((e: { source: string; target: string }) => !originals.has(e.source) && !originals.has(e.target) && e.source !== e.target);
  expect(pastedEdge).toBeTruthy();
  expect(doc.graph.edges.filter((e: { label?: string }) => e.label === 'autentica')).toHaveLength(2);
  await page.getByRole('button', { name: 'Deshacer', exact: true }).click();
  await expect(page.locator('.cd-node')).toHaveCount(7);
  await expect(page.locator('.cd-edge')).toHaveCount(6);
});
test('cut removes the selection but pastes it back elsewhere', async ({ page }) => {
  const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
  await node(page, 'firebase').locator('.cd-node-body').click();
  await page.keyboard.press(`${modifier}+KeyX`);
  await expect(page.locator('.cd-node')).toHaveCount(6);
  await page.keyboard.press(`${modifier}+KeyV`);
  await expect(page.locator('.cd-node')).toHaveCount(7);
  expect((await savedDocument(page)).graph.nodes.filter((n: { title: string }) => n.title === 'Firebase')).toHaveLength(1);
});

const selectTrio = async (page: Page) => { for (const id of ['login', 'auth', 'users']) await node(page, id).locator('.cd-node-body').click({ modifiers: id === 'login' ? [] : ['Shift'] }); };
test('aligning a multi-selection shares an edge and is a single undo', async ({ page }) => {
  await selectTrio(page);
  await expect(page.getByRole('heading', { name: '3 nodos' })).toBeVisible();
  const before = await savedDocument(page);
  await page.getByRole('button', { name: 'Alinear izquierda' }).click();
  const aligned = await savedDocument(page);
  expect(aligned.layout.nodes.auth.x).toBe(aligned.layout.nodes.login.x);
  expect(aligned.layout.nodes.users.x).toBe(aligned.layout.nodes.login.x);
  await page.getByRole('button', { name: 'Deshacer', exact: true }).click();
  expect((await savedDocument(page)).layout.nodes).toEqual(before.layout.nodes);
});
test('distributing a multi-selection evens the spacing and is a single undo', async ({ page }) => {
  await selectTrio(page);
  const before = await savedDocument(page);
  await page.getByRole('button', { name: 'Distribuir en vertical' }).click();
  const dist = await savedDocument(page);
  const cy = (id: string) => dist.layout.nodes[id].y + dist.layout.nodes[id].height / 2;
  const sorted = ['login', 'auth', 'users'].sort((a, b) => cy(a) - cy(b));
  expect(cy(sorted[1]) - cy(sorted[0])).toBeCloseTo(cy(sorted[2]) - cy(sorted[1]), 1);
  await page.getByRole('button', { name: 'Deshacer', exact: true }).click();
  expect((await savedDocument(page)).layout.nodes).toEqual(before.layout.nodes);
});

test('dragging a node shows alignment guides and snaps it to a neighbour column', async ({ page }) => {
  // login and dashboard share x=60. Nudge login a few px while dragging down; it should snap back to the column.
  const before = await savedDocument(page);
  expect(before.layout.nodes.login.x).toBe(before.layout.nodes.dashboard.x);
  const b = (await node(page, 'login').locator('.cd-node-body').boundingBox())!;
  await page.mouse.move(b.x + 40, b.y + 25);
  await page.mouse.down();
  await page.mouse.move(b.x + 44, b.y + 120, { steps: 10 });
  await expect(page.locator('.cd-guide[visibility="visible"]')).not.toHaveCount(0);
  await page.mouse.up();
  const after = await savedDocument(page);
  expect(after.layout.nodes.login.x).toBe(before.layout.nodes.dashboard.x); // snapped exactly to the column
  expect(after.layout.nodes.login.y).toBeGreaterThan(before.layout.nodes.login.y);
  // Guides disappear once the drag ends.
  await expect(page.locator('.cd-guide[visibility="visible"]')).toHaveCount(0);
});

test('exporting PNG rasterizes the diagram to a downloadable image', async ({ page }) => {
await openFor(page, 'Exportar PNG');
    const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar PNG' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('diagrama.kairo.png');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const c of stream) chunks.push(c as Buffer);
  const bytes = Buffer.concat(chunks);
  // PNG magic number.
  expect([...bytes.subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
  expect(bytes.length).toBeGreaterThan(1000);
  // The document is embedded (round-trippable PNG): the iTXt keyword and a node title appear in the bytes.
  expect(bytes.includes(Buffer.from('kairo'))).toBe(true);
  expect(bytes.includes(Buffer.from('AuthService'))).toBe(true);
  // Reopening that PNG restores the diagram through the file input.
  await page.locator('#file-input').setInputFiles({ name: 'diagrama.kairo.png', mimeType: 'image/png', buffer: bytes });
  await expect(page.locator('#toast')).toContainText('PNG con diagrama');
  await expect(page.locator('.cd-node')).toHaveCount(7);
});

test('Reorganizar applies an automatic layered layout as one undo', async ({ page }) => {
  const before = await savedDocument(page);
  // Scramble a node far away, then auto-layout should reposition everything tidily.
  await openFor(page, 'Reorganizar'); await page.getByRole('button', { name: 'Reorganizar', exact: true }).click();
  const after = await savedDocument(page);
  expect(after.graph).toEqual(before.graph); // semantics untouched
  // Architecture uses LR, so depth runs along x: login (no incoming) is left of firebase (deepest).
  expect(after.layout.nodes.login.x).toBeLessThan(after.layout.nodes.firebase.x);
  expect(JSON.stringify(after.layout)).not.toEqual(JSON.stringify(before.layout));
  await page.getByRole('button', { name: 'Deshacer', exact: true }).click();
  expect((await savedDocument(page)).layout).toEqual(before.layout);
});

test('Layout circular arranges nodes on one ring without touching semantics', async ({ page }) => {
  const before = await savedDocument(page);
  await openFor(page, 'Layout circular'); await page.getByRole('button', { name: 'Layout circular', exact: true }).click();
  const after = await savedDocument(page);
  expect(after.graph).toEqual(before.graph); // semantics untouched
  // Every node centre is equidistant from the common centre (one ring).
  const ids = Object.keys(after.layout.nodes);
  const ctr = (id: string) => ({ x: after.layout.nodes[id].x + after.layout.nodes[id].width / 2, y: after.layout.nodes[id].y + after.layout.nodes[id].height / 2 });
  const cx = ids.reduce((s, id) => s + ctr(id).x, 0) / ids.length;
  const cy = ids.reduce((s, id) => s + ctr(id).y, 0) / ids.length;
  const radii = ids.map(id => Math.hypot(ctr(id).x - cx, ctr(id).y - cy));
  for (const r of radii) expect(Math.abs(r - radii[0])).toBeLessThan(2);
  expect(radii[0]).toBeGreaterThan(0);
  expect(JSON.stringify(after.layout)).not.toEqual(JSON.stringify(before.layout));
});

test('Layout en línea places every node on one baseline without touching semantics', async ({ page }) => {
  const before = await savedDocument(page);
  await openFor(page, 'Layout en línea'); await page.getByRole('button', { name: 'Layout en línea', exact: true }).click();
  const after = await savedDocument(page);
  expect(after.graph).toEqual(before.graph); // semantics untouched
  const ids = Object.keys(after.layout.nodes);
  const ys = ids.map(id => after.layout.nodes[id].y);
  for (const y of ys) expect(y).toBe(ys[0]); // all nodes share one horizontal baseline
  const xs = ids.map(id => after.layout.nodes[id].x);
  expect(new Set(xs).size).toBe(ids.length); // spread out along the line, no two share an x
});

test('Ajustar tamaño al texto resizes nodes to their labels (DashboardView -> 179px)', async ({ page }) => {
  const before = await savedDocument(page);
  expect(before.layout.nodes.dashboard.width).toBe(210);
  await openFor(page, 'Ajustar tamaño al texto'); await page.getByRole('button', { name: 'Ajustar tamaño al texto' }).click();
  const after = await savedDocument(page);
  expect(after.graph).toEqual(before.graph); // semantics untouched
  // 'DashboardView' = 13 chars: round(20*2 + 44 + 13*7.3) = 179.
  expect(after.layout.nodes.dashboard.width).toBe(179);
  expect(after.layout.nodes.dashboard.width).toBeLessThan(before.layout.nodes.dashboard.width);
});

test('Alinear a cuadrícula snaps every node position to a multiple of 16', async ({ page }) => {
  const before = await savedDocument(page);
  // Sample positions (e.g. x=60,385,710) are not all multiples of 16.
  await openFor(page, 'Alinear a cuadrícula'); await page.getByRole('button', { name: 'Alinear a cuadrícula' }).click();
  const after = await savedDocument(page);
  expect(after.graph).toEqual(before.graph); // semantics untouched
  for (const id of Object.keys(after.layout.nodes)) {
    expect(after.layout.nodes[id].x % 16).toBe(0);
    expect(after.layout.nodes[id].y % 16).toBe(0);
  }
});

test('Layout cuadrícula arranges nodes in aligned rows and columns', async ({ page }) => {
  const before = await savedDocument(page);
  await openFor(page, 'Layout cuadrícula'); await page.getByRole('button', { name: 'Layout cuadrícula', exact: true }).click();
  const after = await savedDocument(page);
  expect(after.graph).toEqual(before.graph); // semantics untouched
  // Nodes snap to a small set of shared row (y) values — a grid, not a scatter.
  const ys = Object.values(after.layout.nodes).map((b) => (b as { y: number }).y);
  const rows = new Set(ys);
  expect(rows.size).toBeLessThan(ys.length); // at least one row is shared
  expect(JSON.stringify(after.layout)).not.toEqual(JSON.stringify(before.layout));
});

test('searching focuses and selects a matching node, cycling with Enter', async ({ page }) => {
  await page.locator('#search').fill('service');
  await expect(page.locator('#search-count')).toHaveText('1'); // only AuthService is a Service
  await expect(node(page, 'auth')).toHaveClass(/is-selected/);
  // A broader query matching several nodes cycles on Enter.
  await page.locator('#search').fill('View');
  await expect(page.locator('#search-count')).toHaveText('2'); // LoginView, DashboardView
  const first = await page.locator('.cd-node.is-selected').getAttribute('data-node');
  await page.locator('#search').press('Enter');
  const second = await page.locator('.cd-node.is-selected').getAttribute('data-node');
  expect(second).not.toEqual(first);
  expect(['login', 'dashboard']).toContain(second);
});

test('grouping selected nodes draws a container; dragging its header moves members as one undo', async ({ page }) => {
  await node(page, 'login').locator('.cd-node-body').click();
  await node(page, 'auth').locator('.cd-node-body').click({ modifiers: ['Shift'] });
  page.once('dialog', d => d.accept('grupo-1'));
  await page.getByRole('button', { name: 'Agrupar', exact: true }).click();
  await expect(page.locator('.cd-group')).toHaveCount(1);
  const saved = await savedDocument(page);
  expect(saved.graph.nodes.find((n: { id: string }) => n.id === 'login').group).toBe('grupo-1');
  expect(saved.graph.nodes.find((n: { id: string }) => n.id === 'auth').group).toBe('grupo-1');
  const before = await savedDocument(page);
  const header = page.locator('.cd-group-header').first();
  const h = (await header.boundingBox())!;
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
  await page.mouse.down(); await page.mouse.move(h.x + h.width / 2 + 50, h.y + h.height / 2 + 60, { steps: 10 }); await page.mouse.up();
  const after = await savedDocument(page);
  const dxl = after.layout.nodes.login.x - before.layout.nodes.login.x;
  expect(dxl).toBeGreaterThan(20);
  expect(after.layout.nodes.auth.x - before.layout.nodes.auth.x).toBeCloseTo(dxl, 3);
  expect(after.graph).toEqual(before.graph); // only positions changed
  await page.getByRole('button', { name: 'Deshacer', exact: true }).click();
  expect((await savedDocument(page)).layout.nodes.login).toEqual(before.layout.nodes.login);
});
test('ungrouping removes the container box', async ({ page }) => {
  await node(page, 'login').locator('.cd-node-body').click();
  await node(page, 'auth').locator('.cd-node-body').click({ modifiers: ['Shift'] });
  page.once('dialog', d => d.accept('grupo-1'));
  await page.getByRole('button', { name: 'Agrupar', exact: true }).click();
  await expect(page.locator('.cd-group')).toHaveCount(1);
  await page.getByRole('button', { name: 'Desagrupar', exact: true }).click();
  await expect(page.locator('.cd-group')).toHaveCount(0);
  expect((await savedDocument(page)).graph.nodes.find((n: { id: string }) => n.id === 'login').group).toBeUndefined();
});

test('the standalone global build exposes the full toolkit (io/layout/export/analysis) on window.Kairo', async ({ page }) => {
  await page.setContent('<div id="h" style="width:800px;height:600px"></div>');
  await page.addScriptTag({ path: 'packages/diagram/dist/kairo.global.js' });
  const result = await page.evaluate(() => {
    const K = (window as unknown as { Kairo: any }).Kairo;
    const api = ['createDiagram', 'createDocument', 'parseMermaid', 'toMermaid', 'toSVG', 'autoLayout', 'pageRank', 'themeFrom', 'getTemplate', 'parseOutline'].filter(k => typeof K[k] === 'function');
    // End-to-end: Mermaid text -> doc -> autoLayout -> SVG, all from the global build offline.
    const doc = K.autoLayout(K.parseMermaid('flowchart TD\n A[Uno] --> B[Dos]'));
    const svg = K.toSVG(doc);
    return { api, nodes: doc.graph.nodes.length, svgOk: svg.startsWith('<svg') && svg.includes('Uno') };
  });
  expect(result.api.length).toBe(10); // every helper is present
  expect(result.nodes).toBe(2);
  expect(result.svgOk).toBe(true);
});

test('the standalone global build mounts a working editor via a plain script tag', async ({ page }) => {
  await page.setContent('<div id="host" style="width:800px;height:600px"></div>');
  await page.addStyleTag({ path: 'packages/diagram/dist/kairo.global.css' });
  await page.addScriptTag({ path: 'packages/diagram/dist/kairo.global.js' });
  const api = await page.evaluate(() => Object.keys((window as unknown as { Kairo: Record<string, unknown> }).Kairo).sort());
  expect(api).toContain('createDiagram');
  expect(api).toContain('createDocument');
  expect(api).toContain('groupBounds');
  const count = await page.evaluate(() => {
    const K = (window as unknown as { Kairo: any }).Kairo;
    const doc = K.createDocument({ nodes: [{ id: 'a', type: 'service', title: 'A' }, { id: 'b', type: 'database', title: 'B' }], edges: [{ id: 'ab', source: 'a', target: 'b' }] });
    const editor = K.createDiagram(document.getElementById('host')!, { document: doc });
    editor.fit();
    return document.querySelectorAll('.cd-node').length;
  });
  expect(count).toBe(2);
});

test('autoFit re-fits the diagram when its container resizes', async ({ page }) => {
  await page.setContent('<div id="host" style="width:900px;height:600px"></div>');
  await page.addStyleTag({ path: 'packages/diagram/dist/kairo.global.css' });
  await page.addScriptTag({ path: 'packages/diagram/dist/kairo.global.js' });
  const before = await page.evaluate(() => {
    const K = (window as unknown as { Kairo: any }).Kairo;
    const doc = K.createDocument(
      { nodes: [{ id: 'a', type: 'service', title: 'A' }, { id: 'b', type: 'database', title: 'B' }], edges: [{ id: 'ab', source: 'a', target: 'b' }] },
      { nodes: { a: { x: 0, y: 0, width: 200, height: 92 }, b: { x: 600, y: 400, width: 200, height: 92 } }, edges: { ab: { sourcePort: 'right', targetPort: 'left' } } },
    );
    const editor = K.createDiagram(document.getElementById('host')!, { document: doc, autoFit: true });
    (window as unknown as { __ed: any }).__ed = editor;
    return editor.getViewport().zoom;
  });
  // Shrink the host; the ResizeObserver should trigger a re-fit to a smaller scale.
  await page.evaluate(() => { const h = document.getElementById('host')!; h.style.width = '300px'; h.style.height = '200px'; });
  await expect.poll(async () => page.evaluate(() => (window as unknown as { __ed: any }).__ed.getViewport().zoom), { timeout: 4000 }).toBeLessThan(before);
});

test('collapsing a group hides its members and reroutes a crossing edge to the compact box', async ({ page }) => {
  // Group auth + session (auth->session is internal; login->auth and session->gateway cross the border).
  await node(page, 'auth').locator('.cd-node-body').click();
  await node(page, 'session').locator('.cd-node-body').click({ modifiers: ['Shift'] });
  page.once('dialog', d => d.accept('grupo-1'));
  await page.getByRole('button', { name: 'Agrupar', exact: true }).click();
  await expect(page.locator('.cd-group')).toHaveCount(1);
  // Collapse via the caret in the group header.
  await page.locator('.cd-group-caret-hit').click();
  await expect(node(page, 'auth')).toBeHidden();
  await expect(node(page, 'session')).toBeHidden();
  await expect(page.locator('.cd-group-count')).toHaveText('2 nodos');
  // Internal edge auth->session is hidden; crossing edge login->auth stays visible and finite.
  await expect(page.locator('[data-edge="auth-session"]')).toBeHidden();
  const crossing = page.locator('[data-edge="login-auth"]');
  await expect(crossing).toBeVisible();
  const d = await crossing.locator('.cd-edge-path').getAttribute('d');
  expect(d).not.toMatch(/NaN/);
  // Expand restores the members.
  await page.locator('.cd-group-caret-hit').click();
  await expect(node(page, 'auth')).toBeVisible();
  await expect(node(page, 'session')).toBeVisible();
  await expect(page.locator('[data-edge="auth-session"]')).toBeVisible();
});

test('nested groups render as containers within a container; collapsing the outer hides all', async ({ page }) => {
  await node(page, 'login').locator('.cd-node-body').click();
  await node(page, 'auth').locator('.cd-node-body').click({ modifiers: ['Shift'] });
  page.once('dialog', d => d.accept('sistema/acceso'));
  await page.getByRole('button', { name: 'Agrupar', exact: true }).click();
  await node(page, 'users').locator('.cd-node-body').click();
  await node(page, 'session').locator('.cd-node-body').click({ modifiers: ['Shift'] });
  page.once('dialog', d => d.accept('sistema/datos'));
  await page.getByRole('button', { name: 'Agrupar', exact: true }).click();
  // Three boxes: the outer "sistema" and the two inner groups.
  await expect(page.locator('.cd-group-box')).toHaveCount(3);
  await expect(page.locator('.cd-group-label', { hasText: 'sistema' }).first()).toBeVisible();
  // Collapse the outer group via its caret (the one labelled "sistema").
  const outer = page.locator('.cd-group', { has: page.locator('.cd-group-label', { hasText: /^sistema$/ }) });
  await outer.locator('.cd-group-caret-hit').click();
  for (const id of ['login', 'auth', 'users', 'session']) await expect(node(page, id)).toBeHidden();
  await expect(page.getByText('4 nodos')).toBeVisible();
});

test('the <kairo-diagram> web component mounts and emits change events', async ({ page }) => {
  await page.setContent('<kairo-diagram id="d" style="width:800px;height:600px"></kairo-diagram>');
  await page.addStyleTag({ path: 'packages/diagram/dist/kairo.global.css' });
  await page.addScriptTag({ path: 'packages/diagram/dist/kairo.global.js' });
  const nodes = await page.evaluate(() => {
    const K = (window as unknown as { Kairo: any }).Kairo;
    K.defineKairoElement();
    const el = document.getElementById('d') as any;
    el.document = K.createDocument({ nodes: [{ id: 'a', type: 'service', title: 'A' }, { id: 'b', type: 'database', title: 'B' }], edges: [{ id: 'ab', source: 'a', target: 'b' }] });
    return el.querySelectorAll('.cd-node').length;
  });
  expect(nodes).toBe(2);
  expect(await page.locator('kairo-diagram .cd-node')).toHaveCount(2);
  // A programmatic edit emits a 'change' CustomEvent carrying the document.
  const changed = await page.evaluate(() => new Promise<number>(resolve => {
    const el = document.getElementById('d') as any;
    el.addEventListener('change', (e: CustomEvent) => resolve(e.detail.graph.nodes.length));
    el.editor.addNode('service', 'C');
  }));
  expect(changed).toBe(3);
});

test('<kairo-diagram> renders a declarative inline-JSON document and honours readonly', async ({ page }) => {
  const doc = JSON.stringify({
    version: 2,
    graph: { nodes: [{ id: 'a', type: 'service', title: 'A' }, { id: 'b', type: 'database', title: 'B' }], edges: [{ id: 'ab', source: 'a', target: 'b' }] },
    layout: { nodes: { a: { x: 0, y: 0, width: 200, height: 92 }, b: { x: 300, y: 0, width: 200, height: 92 } }, edges: { ab: { sourcePort: 'right', targetPort: 'left' } } },
  });
  await page.setContent(`<kairo-diagram id="d" readonly style="width:800px;height:600px"><script type="application/json">${doc}</script></kairo-diagram>`);
  await page.addStyleTag({ path: 'packages/diagram/dist/kairo.global.css' });
  await page.addScriptTag({ path: 'packages/diagram/dist/kairo.global.js' });
  await page.evaluate(() => (window as unknown as { Kairo: any }).Kairo.defineKairoElement());
  // No JS set the document — it came from the inline script.
  await expect(page.locator('kairo-diagram .cd-node')).toHaveCount(2);
  await expect(page.locator('kairo-diagram .cd-editor')).toHaveAttribute('data-readonly', 'true');
  await expect(page.locator('kairo-diagram script')).toHaveCount(0); // consumed
});

test('<kairo-diagram> loads a document from the src attribute (pure-HTML, no JS)', async ({ page }) => {
  const doc = JSON.stringify({
    version: 2,
    graph: { nodes: [{ id: 'a', type: 'service', title: 'A' }, { id: 'b', type: 'database', title: 'B' }, { id: 'c', type: 'screen', title: 'C' }], edges: [{ id: 'ab', source: 'a', target: 'b' }] },
    layout: { nodes: { a: { x: 0, y: 0, width: 200, height: 92 }, b: { x: 300, y: 0, width: 200, height: 92 }, c: { x: 600, y: 0, width: 200, height: 92 } }, edges: { ab: { sourcePort: 'right', targetPort: 'left' } } },
  });
  const src = 'data:application/json,' + encodeURIComponent(doc);
  await page.setContent(`<kairo-diagram id="d" src="${src}" style="width:800px;height:600px"></kairo-diagram>`);
  await page.addStyleTag({ path: 'packages/diagram/dist/kairo.global.css' });
  await page.addScriptTag({ path: 'packages/diagram/dist/kairo.global.js' });
  await page.evaluate(() => (window as unknown as { Kairo: any }).Kairo.defineKairoElement());
  // Fetched and mounted asynchronously from the URL, with no JS setting the document.
  await expect(page.locator('kairo-diagram .cd-node')).toHaveCount(3);
});

test('<kairo-diagram> ignores obsolete src loads and reports current load errors to its host', async ({ page }) => {
  await page.setContent('<kairo-diagram id="d" style="width:800px;height:600px"></kairo-diagram>');
  await page.addStyleTag({ path: 'packages/diagram/dist/kairo.global.css' });
  await page.addScriptTag({ path: 'packages/diagram/dist/kairo.global.js' });
  const result = await page.evaluate(async () => {
    const K = (window as unknown as { Kairo: any }).Kairo;
    K.defineKairoElement();
    const el = document.getElementById('d') as any;
    const doc = (title: string) => K.createDocument({ nodes: [{ id: 'a', type: 'process', title }], edges: [] });
    const originalFetch = window.fetch;
    let reloadCount = 0;
    const pending = new Map<string, (response: Response) => void>();
    const signals = new Map<string, AbortSignal>();
    window.fetch = ((input: RequestInfo | URL, options?: RequestInit) => {
      const src = String(input);
      if (src === '/missing') return Promise.resolve(new Response('', { status: 404 }));
      if (src === '/reload') return Promise.resolve(new Response(JSON.stringify(doc(`Recarga ${++reloadCount}`))));
      if (src.startsWith('/slow')) {
        signals.set(src, options!.signal!);
        return new Promise<Response>(resolve => pending.set(src, resolve)); // deliberately ignores abort: the version guard still matters
      }
      return originalFetch(input, options);
    }) as typeof fetch;
    const loaded = new Promise<CustomEvent>(resolve => el.addEventListener('documentload', resolve, { once: true }));
    el.setAttribute('src', '/slow-old');
    el.setAttribute('src', `data:application/json,${encodeURIComponent(JSON.stringify(doc('Actual')))}`);
    const success = (await loaded).detail;
    pending.get('/slow-old')!(new Response(JSON.stringify(doc('Obsoleto'))));
    await Promise.resolve(); await Promise.resolve();
    const afterRace = el.document.graph.nodes[0].title;
    const errored = new Promise<CustomEvent>(resolve => el.addEventListener('documenterror', resolve, { once: true }));
    el.setAttribute('src', '/missing');
    const failure = (await errored).detail;
    const afterError = el.document.graph.nodes[0].title;
    const firstReload = new Promise<CustomEvent>(resolve => el.addEventListener('documentload', resolve, { once: true }));
    el.setAttribute('src', '/reload');
    await firstReload;
    const secondReload = new Promise<CustomEvent>(resolve => el.addEventListener('documentload', resolve, { once: true }));
    await el.reload();
    const reloaded = (await secondReload).detail.document.graph.nodes[0].title;
    el.setAttribute('src', '/slow-property');
    el.document = doc('Desde el host');
    pending.get('/slow-property')!(new Response(JSON.stringify(doc('Obsoleto'))));
    await Promise.resolve(); await Promise.resolve();
    const afterProperty = el.document.graph.nodes[0].title;
    el.setAttribute('src', '/slow-edit');
    el.editor.updateNode('a', { title: 'Edición local' });
    pending.get('/slow-edit')!(new Response(JSON.stringify(doc('Obsoleto'))));
    await Promise.resolve(); await Promise.resolve();
    const afterEdit = el.document.graph.nodes[0].title;
    el.editor.undo();
    const undoEdit = el.document.graph.nodes[0].title;
    el.editor.redo();
    el.setAttribute('src', '/slow-disconnect');
    el.remove();
    pending.get('/slow-disconnect')!(new Response(JSON.stringify(doc('Obsoleto'))));
    await Promise.resolve(); await Promise.resolve();
    const editorAfterDisconnect = el.editor;
    document.body.append(el);
    const afterReconnect = el.document.graph.nodes[0].title;
    el.remove();
    window.fetch = originalFetch;
    return {
      success: success.document.graph.nodes[0].title,
      canceledOld: signals.get('/slow-old')!.aborted,
      canceledProperty: signals.get('/slow-property')!.aborted,
      canceledEdit: signals.get('/slow-edit')!.aborted,
      canceledDisconnect: signals.get('/slow-disconnect')!.aborted,
      afterRace, failure, afterError, reloadCount, reloaded, afterProperty, afterEdit, undoEdit, editorAfterDisconnect: !!editorAfterDisconnect, afterReconnect,
    };
  });
  expect(result).toMatchObject({
    success: 'Actual', canceledOld: true, canceledProperty: true, canceledEdit: true, canceledDisconnect: true,
    afterRace: 'Actual', failure: { src: '/missing', error: 'Error: HTTP 404' }, afterError: 'Actual',
    reloadCount: 2, reloaded: 'Recarga 2',
    afterProperty: 'Desde el host', afterEdit: 'Edición local', undoEdit: 'Desde el host', editorAfterDisconnect: false, afterReconnect: 'Edición local',
  });
});

test('<kairo-diagram> clears an assigned document, stays empty after remount, and reloads on request', async ({ page }) => {
  await page.setContent('<kairo-diagram id="d" style="width:800px;height:600px"></kairo-diagram>');
  await page.addStyleTag({ path: 'packages/diagram/dist/kairo.global.css' });
  await page.addScriptTag({ path: 'packages/diagram/dist/kairo.global.js' });
  const result = await page.evaluate(async () => {
    const K = (window as unknown as { Kairo: any }).Kairo;
    K.defineKairoElement();
    const el = document.getElementById('d') as any;
    const doc = (title: string) => K.createDocument({ nodes: [{ id: 'a', type: 'process', title }], edges: [] });
    el.document = doc('Inicial');
    const originalFetch = window.fetch;
    let resolveSlow!: (response: Response) => void;
    let requests = 0;
    window.fetch = ((input: RequestInfo | URL, options?: RequestInit) => {
      if (String(input) === '/slow-clear') { requests++; return new Promise<Response>(resolve => { resolveSlow = resolve; }); }
      return originalFetch(input, options);
    }) as typeof fetch;
    el.setAttribute('src', '/slow-clear');
    el.document = undefined;
    resolveSlow(new Response(JSON.stringify(doc('Obsoleto'))));
    await Promise.resolve(); await Promise.resolve();
    const cleared = { noDocument: el.document === undefined, noEditor: el.editor === undefined, nodes: el.querySelectorAll('.cd-node').length };
    el.remove(); document.body.append(el);
    const afterRemount = { nodes: el.querySelectorAll('.cd-node').length, requests };
    const restored = new Promise<CustomEvent>(resolve => el.addEventListener('documentload', resolve, { once: true }));
    el.setAttribute('src', `data:application/json,${encodeURIComponent(JSON.stringify(doc('Restaurado')))}`);
    await restored;
    const afterReload = el.document.graph.nodes[0].title;
    window.fetch = originalFetch;
    return { cleared, afterRemount, afterReload };
  });
  expect(result).toEqual({
    cleared: { noDocument: true, noEditor: true, nodes: 0 },
    afterRemount: { nodes: 0, requests: 1 },
    afterReload: 'Restaurado',
  });
});

test('<kairo-diagram> retries an interrupted src load on reconnect without accepting the stale response', async ({ page }) => {
  await page.setContent('<kairo-diagram id="d" style="width:800px;height:600px"></kairo-diagram>');
  await page.addStyleTag({ path: 'packages/diagram/dist/kairo.global.css' });
  await page.addScriptTag({ path: 'packages/diagram/dist/kairo.global.js' });
  const result = await page.evaluate(async () => {
    const K = (window as unknown as { Kairo: any }).Kairo;
    K.defineKairoElement();
    const el = document.getElementById('d') as any;
    const doc = (title: string) => K.createDocument({ nodes: [{ id: 'a', type: 'process', title }], edges: [] });
    el.document = doc('Anterior');
    const originalFetch = window.fetch;
    let requests = 0;
    let hostRequests = 0;
    let resolveFirst!: (value: Response) => void;
    window.fetch = ((input: RequestInfo | URL) => {
      if (String(input) === '/host') { hostRequests++; return Promise.resolve(new Response(JSON.stringify(doc('No debe cargarse')))); }
      if (String(input) !== '/retry') return originalFetch(input);
      requests++;
      if (requests === 1) return new Promise<Response>(resolve => { resolveFirst = resolve; });
      return Promise.resolve(new Response(JSON.stringify(doc('Nuevo'))));
    }) as typeof fetch;
    el.setAttribute('src', '/retry');
    el.remove();
    const loaded = new Promise<void>(resolve => el.addEventListener('documentload', () => resolve(), { once: true }));
    document.body.append(el);
    await loaded;
    resolveFirst(new Response(JSON.stringify(doc('Obsoleto'))));
    await Promise.resolve(); await Promise.resolve();
    const title = el.document.graph.nodes[0].title;
    el.remove();
    el.setAttribute('src', '/host');
    el.document = doc('Asignado por host');
    document.body.append(el);
    await Promise.resolve(); await Promise.resolve();
    const hostTitle = el.document.graph.nodes[0].title;
    window.fetch = originalFetch;
    return { requests, title, hostTitle, hostRequests };
  });
  expect(result).toEqual({ requests: 2, title: 'Nuevo', hostTitle: 'Asignado por host', hostRequests: 0 });
});

test('two auto-fit components resize and unmount independently', async ({ page }) => {
  await page.setContent('<kairo-diagram id="a" auto-fit style="width:900px;height:460px"></kairo-diagram><kairo-diagram id="b" auto-fit style="width:900px;height:460px"></kairo-diagram>');
  await page.addStyleTag({ path: 'packages/diagram/dist/kairo.global.css' });
  await page.addScriptTag({ path: 'packages/diagram/dist/kairo.global.js' });
  const initial = await page.evaluate(() => {
    const K = (window as unknown as { Kairo: any }).Kairo;
    K.defineKairoElement();
    const a = document.getElementById('a') as any, b = document.getElementById('b') as any;
    const doc = (prefix: string) => K.createDocument({ nodes: [
      { id: 'one', type: 'start', title: `${prefix} uno` },
      { id: 'two', type: 'process', title: `${prefix} dos` },
      { id: 'three', type: 'end', title: `${prefix} tres` },
    ], edges: [{ id: 'first', source: 'one', target: 'two' }, { id: 'second', source: 'two', target: 'three' }] });
    a.document = doc('A'); b.document = doc('B');
    return { a: a.editor.getViewport().zoom as number, b: b.editor.getViewport().zoom as number };
  });
  await page.evaluate(() => { document.getElementById('a')!.style.width = '320px'; });
  const aZoom = () => page.evaluate(() => (document.getElementById('a') as any).editor.getViewport().zoom as number);
  await expect.poll(aZoom).toBeLessThan(initial.a - 0.05);
  const compactZoom = await aZoom();
  await page.evaluate(() => { const a = document.getElementById('a')!; a.removeAttribute('auto-fit'); a.style.width = '900px'; });
  await expect.poll(aZoom).toBeCloseTo(compactZoom, 4);
  await page.evaluate(() => { document.getElementById('a')!.setAttribute('auto-fit', ''); });
  await expect.poll(aZoom).toBeGreaterThan(compactZoom + 0.05);
  const result = await page.evaluate(() => {
    const a = document.getElementById('a') as any, b = document.getElementById('b') as any;
    a.remove();
    const destroyed = a.editor === undefined;
    b.editor.updateNode('one', { title: 'B independiente' });
    document.body.prepend(a);
    return {
      destroyed,
      aTitle: a.document.graph.nodes[0].title,
      bTitle: b.document.graph.nodes[0].title,
      bZoom: b.editor.getViewport().zoom,
      aMarkers: [...a.querySelectorAll('marker')].map((m: Element) => m.id),
      bMarkers: [...b.querySelectorAll('marker')].map((m: Element) => m.id),
    };
  });
  expect(result.destroyed).toBe(true);
  expect(result.aTitle).toBe('A uno');
  expect(result.bTitle).toBe('B independiente');
  expect(result.bZoom).toBeCloseTo(initial.b, 4);
  expect(result.aMarkers.some((id: string) => result.bMarkers.includes(id))).toBe(false);
});

test('importing DOT (Graphviz) text builds the diagram', async ({ page }) => {
  page.on('dialog', d => d.accept('digraph { a [label="Inicio" shape=box]; b [label="Fin" shape=ellipse]; a -> b [label="go"]; }'));
  await openFor(page, 'Importar DOT'); await page.getByRole('button', { name: 'Importar DOT' }).click();
  await expect(page.locator('.cd-node')).toHaveCount(2);
  await expect(node(page, 'b').locator('ellipse.cd-node-body')).toBeVisible();
  const doc = await savedDocument(page);
  expect(doc.profile).toBe('flow');
  expect(doc.graph.edges.find((e: { source: string }) => e.source === 'a').label).toBe('go');
});

test('importing positioned DOT (pos attrs) preserves the Graphviz layout', async ({ page }) => {
  page.on('dialog', d => d.accept('digraph { a [label="A", pos="100,200!"]; b [label="B", pos="100,50!"]; a -> b; }'));
  await openFor(page, 'Importar DOT'); await page.getByRole('button', { name: 'Importar DOT' }).click();
  await expect(page.locator('.cd-node')).toHaveCount(2);
  const doc = await savedDocument(page);
  // Graphviz y-up: a (pos.y 200) ends up above b (pos.y 50) -> smaller screen-y.
  expect(doc.layout.nodes.a.y).toBeLessThan(doc.layout.nodes.b.y);
});

test('importing JSON Schema builds an entity diagram from $ref properties', async ({ page }) => {
  const schema = '{"$defs":{"User":{"properties":{"posts":{"type":"array","items":{"$ref":"#/$defs/Post"}}}},"Post":{"properties":{"author":{"$ref":"#/$defs/User"}}}}}';
  page.on('dialog', d => d.accept(schema));
  await openFor(page, 'Importar JSON Schema'); await page.getByRole('button', { name: 'Importar JSON Schema', exact: true }).click();
  await expect(page.locator('.cd-node')).toHaveCount(2); // User, Post
  await expect(page.locator('.cd-edge')).toHaveCount(2); // User.posts -> Post, Post.author -> User
});

test('importing GraphQL SDL builds a type-relationship diagram', async ({ page }) => {
  const sdl = 'type User { id: ID! posts: [Post!]! } type Post { author: User! }';
  page.on('dialog', d => d.accept(sdl));
  await openFor(page, 'Importar GraphQL'); await page.getByRole('button', { name: 'Importar GraphQL', exact: true }).click();
  await expect(page.locator('.cd-node')).toHaveCount(2); // User, Post
  await expect(page.locator('.cd-edge')).toHaveCount(2); // User.posts -> Post, Post.author -> User
});

test('importing a node-table CSV creates typed, grouped nodes (no edges)', async ({ page }) => {
  page.once('dialog', d => d.accept('id,title,type,group\nx,Login,screen,UI\ny,Store,database,Backend'));
  await openFor(page, 'Importar CSV'); await page.getByRole('button', { name: 'Importar CSV' }).click();
  await expect(page.locator('.cd-node')).toHaveCount(2);
  await expect(page.locator('.cd-edge')).toHaveCount(0); // a node table has no connections
  const doc = await savedDocument(page);
  expect(doc.graph.nodes.find((n: { id: string }) => n.id === 'y').group).toBe('Backend');
  expect(doc.graph.nodes.find((n: { id: string }) => n.id === 'y').type).toBe('database');
});

test('importing a parent list builds the org tree from parentId links', async ({ page }) => {
  const list = JSON.stringify([
    { id: 'ceo', label: 'CEO' },
    { id: 'cto', parentId: 'ceo', label: 'CTO' },
    { id: 'cfo', parentId: 'ceo', label: 'CFO' },
  ]);
  page.on('dialog', d => d.accept(list));
  await openFor(page, 'Importar lista de padres'); await page.getByRole('button', { name: 'Importar lista de padres', exact: true }).click();
  await expect(page.locator('.cd-node')).toHaveCount(3);
  await expect(page.locator('.cd-edge')).toHaveCount(2); // ceo->cto, ceo->cfo
});

test('importing a Mermaid gantt builds a dependency flow from its after clauses', async ({ page }) => {
  const plan = 'gantt\n  section S\n  A :a, 2024-01-01, 1d\n  B :b, after a, 1d\n  C :c, after b, 1d';
  page.on('dialog', d => d.accept(plan));
  await openFor(page, 'Importar Gantt'); await page.getByRole('button', { name: 'Importar Gantt', exact: true }).click();
  await expect(page.locator('.cd-node')).toHaveCount(3); // A, B, C
  await expect(page.locator('.cd-edge')).toHaveCount(2); // a->b, b->c
});

test('importing a Mermaid sankey-beta builds a flow from its weighted links', async ({ page }) => {
  const sankey = 'sankey-beta\n\nVisitas,Registro,120\nVisitas,Salida,80\nRegistro,Compra,45';
  page.on('dialog', d => d.accept(sankey));
  await openFor(page, 'Importar Sankey'); await page.getByRole('button', { name: 'Importar Sankey', exact: true }).click();
  await expect(page.locator('.cd-node')).toHaveCount(4); // Visitas, Registro, Salida, Compra
  await expect(page.locator('.cd-edge')).toHaveCount(3);
});

test('importing a Mermaid architecture-beta builds grouped services and connections', async ({ page }) => {
  const arch = 'architecture-beta\n  group api(cloud)[API]\n  service web(internet)[Web]\n  service srv(server)[Servidor] in api\n  service db(database)[Base] in api\n  web:R --> L:srv\n  srv:B --> T:db';
  page.on('dialog', d => d.accept(arch));
  await openFor(page, 'Importar Mermaid arquitectura'); await page.getByRole('button', { name: 'Importar Mermaid arquitectura', exact: true }).click();
  await expect(page.locator('.cd-node')).toHaveCount(3); // web, srv, db
  await expect(page.locator('.cd-edge')).toHaveCount(2);
});

test('importing a Mermaid block-beta builds blocks and arrows', async ({ page }) => {
  const block = 'block-beta\n  columns 3\n  a["Cliente"]\n  b["API"]\n  c["Base"]\n  a -- "pide" --> b\n  b --> c';
  page.on('dialog', d => d.accept(block));
  await openFor(page, 'Importar Mermaid bloques'); await page.getByRole('button', { name: 'Importar Mermaid bloques', exact: true }).click();
  await expect(page.locator('.cd-node')).toHaveCount(3); // a, b, c
  await expect(page.locator('.cd-edge')).toHaveCount(2);
});

test('importing Graphviz JSON (dot -Tjson) keeps the engine-computed positions', async ({ page }) => {
  const gv = JSON.stringify({
    directed: true,
    objects: [
      { _gvid: 0, name: 'a', label: 'Inicio', pos: '27,162', width: '0.9', height: '0.5' },
      { _gvid: 1, name: 'b', label: 'Proceso', pos: '27,90', width: '0.9', height: '0.5' },
      { _gvid: 2, name: 'c', label: 'Fin', pos: '27,18', width: '0.9', height: '0.5' },
    ],
    edges: [{ tail: 0, head: 1, label: 'ok' }, { tail: 1, head: 2 }],
  });
  page.on('dialog', d => d.accept(gv));
  await openFor(page, 'Importar Graphviz JSON'); await page.getByRole('button', { name: 'Importar Graphviz JSON' }).click();
  await expect(page.locator('.cd-node')).toHaveCount(3);
  const doc = await savedDocument(page);
  // Graphviz y-up (a highest pos.y) → a sits above b above c after the flip.
  expect(doc.layout.nodes.a.y).toBeLessThan(doc.layout.nodes.b.y);
  expect(doc.layout.nodes.b.y).toBeLessThan(doc.layout.nodes.c.y);
  expect(doc.graph.nodes.map((n: { title: string }) => n.title)).toEqual(['Inicio', 'Proceso', 'Fin']);
});

test('assigning a swimlane draws a labelled band behind the nodes', async ({ page }) => {
  await node(page, 'login').locator('.cd-node-body').click();
  await node(page, 'dashboard').locator('.cd-node-body').click({ modifiers: ['Shift'] });
  page.once('dialog', d => d.accept('Cliente'));
  await page.getByRole('button', { name: 'Asignar carril', exact: true }).click();
  await expect(page.locator('.cd-lane')).toHaveCount(1);
  await expect(page.locator('.cd-lane-label')).toHaveText('Cliente');
  expect((await savedDocument(page)).graph.nodes.find((n: { id: string }) => n.id === 'login').lane).toBe('Cliente');
  // A second lane appears as its own band.
  await node(page, 'users').locator('.cd-node-body').click();
  await node(page, 'gateway').locator('.cd-node-body').click({ modifiers: ['Shift'] });
  page.once('dialog', d => d.accept('Servidor'));
  await page.getByRole('button', { name: 'Asignar carril', exact: true }).click();
  await expect(page.locator('.cd-lane')).toHaveCount(2);
});

test('exporting DOT downloads a .dot file that re-imports to the same structure', async ({ page }) => {
await openFor(page, 'Exportar DOT');
    const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar DOT' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('diagrama.kairo.dot');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const c of stream) chunks.push(c as Buffer);
  const dot = Buffer.concat(chunks).toString('utf8');
  expect(dot.startsWith('digraph {')).toBe(true);
  expect(dot).toContain('AuthService');
  page.on('dialog', d => d.accept(dot));
  await openFor(page, 'Importar DOT'); await page.getByRole('button', { name: 'Importar DOT' }).click();
  await expect(page.locator('.cd-node')).toHaveCount(7);
});

test('dragging a node into another lane band reassigns its lane as one undo', async ({ page }) => {
  // Two lanes: Cliente (login, dashboard on the left) and Servidor (users on the right).
  await node(page, 'login').locator('.cd-node-body').click();
  await node(page, 'dashboard').locator('.cd-node-body').click({ modifiers: ['Shift'] });
  page.once('dialog', d => d.accept('Cliente'));
  await page.getByRole('button', { name: 'Asignar carril', exact: true }).click();
  await node(page, 'users').locator('.cd-node-body').click();
  await node(page, 'gateway').locator('.cd-node-body').click({ modifiers: ['Shift'] });
  page.once('dialog', d => d.accept('Servidor'));
  await page.getByRole('button', { name: 'Asignar carril', exact: true }).click();
  const before = await savedDocument(page);
  expect(before.graph.nodes.find((n: { id: string }) => n.id === 'login').lane).toBe('Cliente');
  // Drag login into the Servidor column (over the users node).
  const src = (await node(page, 'login').locator('.cd-node-body').boundingBox())!;
  const dst = (await node(page, 'users').locator('.cd-node-body').boundingBox())!;
  await page.mouse.move(src.x + 40, src.y + 25);
  await page.mouse.down();
  await page.mouse.move(dst.x + dst.width / 2, dst.y + dst.height + 40, { steps: 12 });
  await page.mouse.up();
  const after = await savedDocument(page);
  expect(after.graph.nodes.find((n: { id: string }) => n.id === 'login').lane).toBe('Servidor');
  await page.getByRole('button', { name: 'Deshacer', exact: true }).click();
  const undone = await savedDocument(page);
  expect(undone.graph.nodes.find((n: { id: string }) => n.id === 'login').lane).toBe('Cliente');
  expect(undone.layout.nodes.login).toEqual(before.layout.nodes.login);
});

test('read-only mode blocks edits but keeps selection and panning', async ({ page }) => {
  const before = await savedDocument(page);
  await page.getByRole('button', { name: 'Solo lectura', exact: true }).click();
  await expect(page.locator('.cd-editor')).toHaveAttribute('data-readonly', 'true');
  // Selection still works.
  await node(page, 'auth').locator('.cd-node-body').click();
  await expect(node(page, 'auth')).toHaveClass(/is-selected/);
  // No resize handle, no connect anchors.
  await expect(page.locator('.cd-resize-handle')).toBeHidden();
  await expect(node(page, 'auth').locator('.cd-anchor')).toHaveCount(4); // present in DOM but hidden
  await expect(node(page, 'auth').locator('.cd-anchor').first()).toBeHidden();
  // Dragging a node does not move it.
  const b = (await node(page, 'auth').locator('.cd-node-body').boundingBox())!;
  await page.mouse.move(b.x + 40, b.y + 25); await page.mouse.down(); await page.mouse.move(b.x + 120, b.y + 120, { steps: 8 }); await page.mouse.up();
  expect((await savedDocument(page)).layout.nodes.auth).toEqual(before.layout.nodes.auth);
  // Delete is blocked.
  await node(page, 'auth').locator('.cd-node-body').click();
  await page.keyboard.press('Backspace');
  await expect(page.locator('.cd-node')).toHaveCount(7);
  await expect(page.getByRole('button', { name: 'Deshacer', exact: true })).toBeDisabled();
  // Re-enabling editing restores dragging.
  await page.getByRole('button', { name: 'Solo lectura', exact: true }).click();
  await expect(page.locator('.cd-editor')).toHaveAttribute('data-readonly', 'false');
  const b2 = (await node(page, 'auth').locator('.cd-node-body').boundingBox())!;
  await page.mouse.move(b2.x + 40, b2.y + 25); await page.mouse.down(); await page.mouse.move(b2.x + 90, b2.y + 180, { steps: 10 }); await page.mouse.up();
  expect((await savedDocument(page)).layout.nodes.auth.y).toBeGreaterThan(before.layout.nodes.auth.y + 40);
});

test('Puntos críticos highlights the single points of failure (cut vertices and bridges)', async ({ page }) => {
  await openFor(page, 'Puntos críticos'); await page.getByRole('button', { name: 'Puntos críticos', exact: true }).click();
  await expect(page.locator('.cd-editor')).toHaveClass(/has-highlight/);
  // The sample is a tree: auth, session and gateway are cut vertices; leaves are not.
  await expect(page.locator('.cd-node.is-highlighted')).toHaveCount(3);
  for (const id of ['auth', 'session', 'gateway']) await expect(node(page, id)).toHaveClass(/is-highlighted/);
  for (const id of ['login', 'users', 'firebase', 'dashboard']) await expect(node(page, id)).not.toHaveClass(/is-highlighted/);
});

test('Brokers highlights the top betweenness nodes (session, auth, gateway)', async ({ page }) => {
  await openFor(page, 'Brokers'); await page.getByRole('button', { name: 'Brokers', exact: true }).click();
  await expect(page.locator('.cd-editor')).toHaveClass(/has-highlight/);
  await expect(page.locator('.cd-node.is-highlighted')).toHaveCount(3);
  for (const id of ['session', 'auth', 'gateway']) await expect(node(page, id)).toHaveClass(/is-highlighted/);
  for (const id of ['login', 'users', 'firebase', 'dashboard']) await expect(node(page, id)).not.toHaveClass(/is-highlighted/);
});

test('Autovector highlights the most eigenvector-central nodes', async ({ page }) => {
  await openFor(page, 'Autovector'); await page.getByRole('button', { name: 'Autovector', exact: true }).click();
  await expect(page.locator('#toast')).toContainText(/Autovector: \d+ nodo/);
  await expect(page.locator('.cd-editor')).toHaveClass(/has-highlight/);
  await expect(page.locator('.cd-node.is-highlighted').first()).toBeVisible();
});

test('Influyentes highlights the top PageRank nodes (firebase, gateway, session)', async ({ page }) => {
  await openFor(page, 'Influyentes'); await page.getByRole('button', { name: 'Influyentes', exact: true }).click();
  await expect(page.locator('.cd-editor')).toHaveClass(/has-highlight/);
  await expect(page.locator('.cd-node.is-highlighted')).toHaveCount(3);
  for (const id of ['firebase', 'gateway', 'session']) await expect(node(page, id)).toHaveClass(/is-highlighted/);
  for (const id of ['login', 'users', 'dashboard']) await expect(node(page, id)).not.toHaveClass(/is-highlighted/);
});

test('Sugerir conexiones highlights the nodes of likely-missing links', async ({ page }) => {
  await openFor(page, 'Sugerir conexiones'); await page.getByRole('button', { name: 'Sugerir conexiones', exact: true }).click();
  await expect(page.locator('.cd-editor')).toHaveClass(/has-highlight/);
  // The sample has unconnected pairs sharing a neighbour (e.g. session & firebase via gateway), so ≥2 nodes light up.
  expect(await page.locator('.cd-node.is-highlighted').count()).toBeGreaterThanOrEqual(2);
});

test('Impacto highlights the selected node and everything downstream', async ({ page }) => {
  // In the sample: login -> auth -> {users, session -> gateway -> firebase}. Downstream of auth = users, session, gateway, firebase.
  await node(page, 'auth').locator('.cd-node-body').click();
  await openFor(page, 'Impacto'); await page.getByRole('button', { name: 'Impacto', exact: true }).click();
  await expect(page.locator('.cd-editor')).toHaveClass(/has-highlight/);
  for (const id of ['auth', 'users', 'session', 'gateway', 'firebase']) await expect(node(page, id)).toHaveClass(/is-highlighted/);
  await expect(node(page, 'login')).not.toHaveClass(/is-highlighted/); // upstream, not affected
});

test('Ciclos detects and highlights a cycle (and reports none on the acyclic sample)', async ({ page }) => {
  // The default sample is a tree -> no cycle.
  await openFor(page, 'Ciclos'); await page.getByRole('button', { name: 'Ciclos', exact: true }).click();
  await expect(page.locator('.cd-node.is-highlighted')).toHaveCount(0);
  // Import a 3-node cycle and detect it.
  page.on('dialog', d => d.accept('a,b\nb,c\nc,a'));
  await openFor(page, 'Importar CSV'); await page.getByRole('button', { name: 'Importar CSV' }).click();
  await expect(page.locator('.cd-node')).toHaveCount(3);
  await openFor(page, 'Ciclos'); await page.getByRole('button', { name: 'Ciclos', exact: true }).click();
  await expect(page.locator('.cd-node.is-highlighted')).toHaveCount(3);
});

test('Métricas de layout reports crossings, overlaps, density and average edge length in a toast', async ({ page }) => {
  await openFor(page, 'Métricas de layout');
  await page.getByRole('button', { name: 'Métricas de layout' }).click();
  const toast = page.locator('#toast');
  await expect(toast).toBeVisible();
  await expect(toast).toContainText(/cruce\(s\)/);
  await expect(toast).toContainText(/solapamiento\(s\)/);
  await expect(toast).toContainText(/densidad \d+%/);
  await expect(toast).toContainText(/longitud media \d+px/);
});

test('selecting announces the selection in an aria-live region (accessibility)', async ({ page }) => {
  const sr = page.locator('#sr-status');
  await node(page, 'auth').locator('.cd-node-body').click();
  await expect(sr).toHaveText(/Nodo seleccionado: AuthService/);
  // Multi-selection announces a count.
  await node(page, 'users').locator('.cd-node-body').click({ modifiers: ['Shift'] });
  await expect(sr).toHaveText(/2 nodos seleccionados/);
});

test('search highlights matches and dims the rest; clearing the query restores them', async ({ page }) => {
  await page.locator('#search').fill('View'); // LoginView, DashboardView
  await expect(page.locator('.cd-editor')).toHaveClass(/has-highlight/);
  await expect(page.locator('.cd-node.is-highlighted')).toHaveCount(2);
  await expect(node(page, 'login')).toHaveClass(/is-highlighted/);
  await expect(node(page, 'auth')).not.toHaveClass(/is-highlighted/);
  await page.locator('#search').fill('');
  await expect(page.locator('.cd-editor')).not.toHaveClass(/has-highlight/);
  await expect(page.locator('.cd-node.is-highlighted')).toHaveCount(0);
});

test('the path player highlights the flow and stops when the document changes', async ({ page }) => {
  await page.getByLabel('Ejemplo', { exact: true }).selectOption('decisions');
  await page.getByRole('button', { name: 'Reproducir ruta', exact: true }).click();
  await expect(page.locator('.cd-editor')).toHaveClass(/has-highlight/);
  await expect(page.locator('.cd-node.is-highlighted').first()).toBeVisible();
  // Switching documents stops the player and clears the highlight (accept the unsaved-changes prompt).
  await page.getByLabel('Ejemplo', { exact: true }).selectOption('architecture');
  await page.getByRole('dialog', { name: 'Confirmar cambio' }).getByRole('button', { name: 'Cambiar ejemplo' }).click();
  await expect(page.locator('.cd-editor')).not.toHaveClass(/has-highlight/);
  // The player is for flows only.
  await page.getByRole('button', { name: 'Reproducir ruta', exact: true }).click();
  await expect(page.locator('#toast')).toContainText('para flujos');
});

test('the sidebar shows a live thumbnail that updates with the diagram', async ({ page }) => {
  await expect(page.locator('#doc-thumb svg')).toBeVisible();
  const before = await page.locator('#doc-thumb svg').innerHTML();
  await page.getByTitle('Añadir Database').click();
  await expect.poll(async () => page.locator('#doc-thumb svg').innerHTML()).not.toBe(before);
  expect(await page.locator('#doc-thumb svg').getAttribute('width')).toBe('44');
});

test('importing a Mermaid state diagram via the text button builds states and transitions', async ({ page }) => {
  page.on('dialog', d => d.accept('stateDiagram-v2\n  [*] --> Idle\n  Idle --> Active : go\n  Active --> [*]'));
  await openFor(page, 'Importar texto'); await page.getByRole('button', { name: 'Importar texto' }).click();
  await expect(page.locator('.cd-node')).toHaveCount(4); // start, Idle, Active, end
  const doc = await savedDocument(page);
  expect(doc.profile).toBe('flow');
  expect(doc.graph.nodes.some((n: { type: string }) => n.type === 'start')).toBe(true);
  expect(doc.graph.nodes.some((n: { type: string }) => n.type === 'end')).toBe(true);
  expect(doc.graph.edges.find((e: { target: string }) => e.target === 'Active').label).toBe('go');
});

test('importing a Mermaid class diagram builds class nodes and relationships', async ({ page }) => {
  page.on('dialog', d => d.accept('classDiagram\n  class Animal\n  Animal <|-- Dog\n  Animal --> Leg : has'));
  await openFor(page, 'Importar texto'); await page.getByRole('button', { name: 'Importar texto' }).click();
  await expect(page.locator('.cd-node')).toHaveCount(3);
  const doc = await savedDocument(page);
  expect(doc.profile).toBe('uml');
  expect(doc.graph.nodes.every((n: { type: string }) => n.type === 'class')).toBe(true);
  expect(doc.graph.edges.find((e: { target: string }) => e.target === 'Dog').relation).toBe('inheritance');
});

test('importing a Mermaid ER diagram builds entities and relationships', async ({ page }) => {
  page.on('dialog', d => d.accept('erDiagram\n  CUSTOMER ||--o{ ORDER : places\n  ORDER ||--|{ ITEM : contains'));
  await openFor(page, 'Importar texto'); await page.getByRole('button', { name: 'Importar texto' }).click();
  await expect(page.locator('.cd-node')).toHaveCount(3);
  const doc = await savedDocument(page);
  expect(doc.profile).toBe('er');
  expect(doc.graph.nodes.every((n: { type: string }) => n.type === 'database')).toBe(true);
  expect(doc.graph.edges.find((e: { target: string }) => e.target === 'ORDER').label).toBe('places');
});

test('exporting JSON Canvas downloads a valid .canvas file', async ({ page }) => {
await openFor(page, 'Exportar Canvas');
    const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar Canvas', exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('diagrama.canvas');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const c of stream) chunks.push(c as Buffer);
  const canvas = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  expect(Array.isArray(canvas.nodes)).toBe(true);
  expect(canvas.nodes.length).toBe(7);
  expect(canvas.nodes[0]).toHaveProperty('type', 'text');
  expect(canvas.edges.length).toBe(6);
  expect(canvas.edges[0]).toHaveProperty('fromNode');
});

test('the minimap mirrors the diagram and recenters the view on click', async ({ page }) => {
  await expect(page.locator('.cd-minimap')).toBeVisible();
  await expect(page.locator('.cd-minimap-node')).toHaveCount(7);
  await expect(page.locator('.cd-minimap-edge')).toHaveCount(6);
  await expect(page.locator('.cd-minimap-viewport')).toHaveCount(1);
  const authBefore = (await node(page, 'auth').locator('.cd-node-body').boundingBox())!;
  // Drag across the minimap to pan the diagram.
  const box = (await page.locator('.cd-minimap').boundingBox())!;
  await page.mouse.move(box.x + 20, box.y + 18); await page.mouse.down(); await page.mouse.move(box.x + box.width - 20, box.y + box.height - 18, { steps: 6 }); await page.mouse.up();
  const authAfter = (await node(page, 'auth').locator('.cd-node-body').boundingBox())!;
  expect(Math.abs(authAfter.x - authBefore.x) + Math.abs(authAfter.y - authBefore.y)).toBeGreaterThan(20);
});

test('exporting interactive HTML downloads a standalone page that renders and pans/zooms', async ({ page }) => {
await openFor(page, 'Exportar HTML');
    const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar HTML', exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('diagrama.kairo.html');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const c of stream) chunks.push(c as Buffer);
  const html = Buffer.concat(chunks).toString('utf8');
  expect(html.startsWith('<!doctype html>')).toBe(true);
  // Load the standalone page: it renders the diagram and the pan/zoom script wires up.
  await page.setContent(html);
  await expect(page.locator('#kairo-svg')).toBeVisible();
  await expect(page.locator('#kairo-svg').getByText('AuthService', { exact: true })).toBeVisible();
  const before = await page.locator('#kairo-svg').getAttribute('viewBox');
  await page.locator('#kairo-svg').dispatchEvent('wheel', { deltaY: -120 });
  const after = await page.locator('#kairo-svg').getAttribute('viewBox');
  expect(after).not.toBe(before); // zoom changed the viewBox
});

test('Resaltar cambios highlights nodes edited since the last saved version', async ({ page }) => {
  // No changes yet.
  await openFor(page, 'Resaltar cambios'); await page.getByRole('button', { name: 'Resaltar cambios', exact: true }).click();
  await expect(page.locator('#toast')).toContainText('Sin cambios');
  // Edit a node, then diff-highlight it.
  await node(page, 'auth').locator('.cd-node-body').dblclick();
  await page.locator('.cd-inline-input').fill('Cambiado'); await page.locator('.cd-inline-input').press('Enter');
  await openFor(page, 'Resaltar cambios'); await page.getByRole('button', { name: 'Resaltar cambios', exact: true }).click();
  await expect(page.locator('.cd-editor')).toHaveClass(/has-highlight/);
  await expect(node(page, 'auth')).toHaveClass(/is-highlighted/);
  await expect(node(page, 'login')).not.toHaveClass(/is-highlighted/);
});

test('searching multiple matches fits them into view (fit to subset)', async ({ page }) => {
  // Zoom out a lot first so the fit is a visible change.
  for (let i = 0; i < 5; i++) await page.getByRole('button', { name: 'Alejar', exact: true }).click();
  await expect(page.locator('.cd-editor')).toHaveAttribute('data-detail', 'low');
  const zoomedOut = await page.locator('#zoom-value').textContent();
  await page.locator('#search').fill('View'); // LoginView, DashboardView -> fit to both
  await expect(page.locator('.cd-node.is-highlighted')).toHaveCount(2);
  const afterFit = await page.locator('#zoom-value').textContent();
  expect(afterFit).not.toBe(zoomedOut); // fit changed the zoom
  // Both matches are within the viewport after fitting.
  await expect(node(page, 'login')).toBeVisible();
  await expect(node(page, 'dashboard')).toBeVisible();
});

test('grid snapping rounds a resized node to the grid (no guide interference)', async ({ page }) => {
  await page.getByRole('button', { name: 'Rejilla magnética', exact: true }).click();
  await node(page, 'auth').locator('.cd-node-body').click();
  const h = (await page.locator('.cd-resize-handle').boundingBox())!;
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
  await page.mouse.down(); await page.mouse.move(h.x + 71, h.y + 53, { steps: 8 }); await page.mouse.up();
  const box = (await savedDocument(page)).layout.nodes.auth;
  expect(box.width % 24).toBe(0);
  expect(box.height % 24).toBe(0);
  expect(box.width).toBeGreaterThan(200);
});

test('exporting Excalidraw downloads a loadable scene with shapes and arrows', async ({ page }) => {
await openFor(page, 'Exportar Excalidraw');
    const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar Excalidraw', exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('diagrama.excalidraw');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const c of stream) chunks.push(c as Buffer);
  const scene = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  expect(scene.type).toBe('excalidraw');
  expect(scene.elements.filter((e: { type: string }) => e.type === 'rectangle' || e.type === 'diamond' || e.type === 'ellipse').length).toBe(7);
  expect(scene.elements.filter((e: { type: string }) => e.type === 'arrow').length).toBe(6);
  expect(scene.elements.some((e: { type: string }) => e.type === 'text')).toBe(true);
});

test('reimporting edited text preserves manual node positions by id', async ({ page }) => {
  // Move auth to a custom position.
  const bounds = (await node(page, 'auth').locator('.cd-node-body').boundingBox())!;
  await page.mouse.move(bounds.x + 40, bounds.y + 25); await page.mouse.down(); await page.mouse.move(bounds.x + 40, bounds.y + 160, { steps: 8 }); await page.mouse.up();
  const moved = (await savedDocument(page)).layout.nodes.auth;
  // Export current text (ids preserved), tweak a label, reimport: position stays.
  const text = (await (async () => { await openFor(page, 'Exportar texto'); const [d] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Exportar texto', exact: true }).click()]); const st = await d.createReadStream(); const ch: Buffer[] = []; for await (const c of st) ch.push(c as Buffer); return Buffer.concat(ch).toString('utf8'); })());
  const edited = text.replace('AuthService', 'AuthService');
  page.on('dialog', dlg => dlg.accept(edited));
  await openFor(page, 'Importar texto'); await page.getByRole('button', { name: 'Importar texto' }).click();
  const after = (await savedDocument(page)).layout.nodes.auth;
  expect(after.y).toBeCloseTo(moved.y, 0); // manual position preserved across reimport
});

test('the React wrapper mounts the editor and syncs document prop changes', async ({ page }) => {
  await page.goto('/react.html');
  await expect(page.locator('.cd-node[data-node="a"]')).toBeVisible();
  await expect(page.locator('.cd-node')).toHaveCount(2); // docA
  await page.getByRole('button', { name: 'Cambiar documento' }).click();
  await expect(page.locator('.cd-node')).toHaveCount(3); // docB
  await expect(page.locator('.cd-node[data-node="ui"]')).toBeVisible();
  await page.getByRole('button', { name: 'Cambiar documento' }).click();
  await expect(page.locator('.cd-node')).toHaveCount(2); // back to docA
});

test('the Vue wrapper mounts the editor and syncs document prop changes', async ({ page }) => {
  await page.goto('/vue.html');
  await expect(page.locator('.cd-node[data-node="a"]')).toBeVisible();
  await expect(page.locator('.cd-node')).toHaveCount(2);
  await page.getByRole('button', { name: 'Cambiar documento' }).click();
  await expect(page.locator('.cd-node')).toHaveCount(3);
  await expect(page.locator('.cd-node[data-node="ui"]')).toBeVisible();
});

test('the Svelte action mounts the editor and syncs on update', async ({ page }) => {
  await page.goto('/svelte.html');
  await expect(page.locator('.cd-node[data-node="a"]')).toBeVisible();
  await expect(page.locator('.cd-node')).toHaveCount(2); // docA
  await page.getByRole('button', { name: 'Cambiar documento' }).click();
  await expect(page.locator('.cd-node')).toHaveCount(3); // docB after action.update
  await expect(page.locator('.cd-node[data-node="ui"]')).toBeVisible();
  await page.getByRole('button', { name: 'Cambiar documento' }).click();
  await expect(page.locator('.cd-node')).toHaveCount(2); // back to docA
});

test('importing a CSV edge list builds the diagram and CSV export round-trips', async ({ page }) => {
  page.on('dialog', d => d.accept('from,to,label\nAuth,Users,verifica\nUsers,Audit,registra\nIsla,'));
  await openFor(page, 'Importar CSV'); await page.getByRole('button', { name: 'Importar CSV' }).click();
  await expect(page.locator('.cd-node')).toHaveCount(4); // Auth, Users, Audit + isolated Isla
  const doc = await savedDocument(page);
  expect(doc.graph.edges.find((e: { source: string }) => e.source === 'Auth').label).toBe('verifica');
await openFor(page, 'Exportar CSV');
    const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar CSV' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('diagrama.kairo.csv');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const c of stream) chunks.push(c as Buffer);
  const csv = Buffer.concat(chunks).toString('utf8');
  expect(csv.split('\n')[0]).toBe('from,to,label');
  expect(csv).toContain('Auth,Users,verifica');
  expect(csv).toContain('Isla,,'); // isolated node survives the round-trip
});

test('shortest path highlights the fewest-hop route between two selected nodes', async ({ page }) => {
  // Architecture sample: login -> auth -> users (and auth -> session -> gateway -> firebase).
  await node(page, 'login').locator('.cd-node-body').click();
  await node(page, 'users').locator('.cd-node-body').click({ modifiers: ['Shift'] });
  await openFor(page, 'Ruta más corta'); await page.getByRole('button', { name: 'Ruta más corta' }).click();
  await expect(node(page, 'login')).toHaveClass(/is-highlighted/);
  await expect(node(page, 'auth')).toHaveClass(/is-highlighted/);
  await expect(node(page, 'users')).toHaveClass(/is-highlighted/);
  await expect(page.locator('[data-edge="login-auth"]')).toHaveClass(/is-highlighted/);
  await expect(page.locator('[data-edge="auth-users"]')).toHaveClass(/is-highlighted/);
  // A node off the route is not highlighted.
  await expect(node(page, 'firebase')).not.toHaveClass(/is-highlighted/);
});

test('exporting GraphML downloads a .graphml file that re-imports to the same structure', async ({ page }) => {
await openFor(page, 'Exportar GraphML');
    const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar GraphML' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('diagrama.graphml');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const c of stream) chunks.push(c as Buffer);
  const xml = Buffer.concat(chunks).toString('utf8');
  expect(xml.startsWith('<?xml')).toBe(true);
  expect(xml).toContain('edgedefault="directed"');
  expect(xml).toContain('AuthService');
  page.on('dialog', d => d.accept(xml));
  await openFor(page, 'Importar GraphML'); await page.getByRole('button', { name: 'Importar GraphML' }).click();
  await expect(page.locator('.cd-node')).toHaveCount(7);
  await expect(page.locator('.cd-edge')).toHaveCount(6);
});

test('exporting GEXF downloads a .gexf file that re-imports to the same structure', async ({ page }) => {
  await openFor(page, 'Exportar GEXF');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar GEXF' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('diagrama.gexf');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const c of stream) chunks.push(c as Buffer);
  const xml = Buffer.concat(chunks).toString('utf8');
  expect(xml).toContain('<gexf');
  expect(xml).toContain('viz:position');
  expect(xml).toContain('AuthService');
  page.on('dialog', d => d.accept(xml));
  await openFor(page, 'Importar GEXF'); await page.getByRole('button', { name: 'Importar GEXF' }).click();
  await expect(page.locator('.cd-node')).toHaveCount(7);
  await expect(page.locator('.cd-edge')).toHaveCount(6);
});

test('exporting GML downloads a .gml file that re-imports to the same structure', async ({ page }) => {
  await openFor(page, 'Exportar GML');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar GML' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('diagrama.gml');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const c of stream) chunks.push(c as Buffer);
  const gml = Buffer.concat(chunks).toString('utf8');
  expect(gml).toContain('graph [');
  expect(gml).toContain('node [');
  expect(gml).toContain('AuthService');
  page.on('dialog', d => d.accept(gml));
  await openFor(page, 'Importar GML'); await page.getByRole('button', { name: 'Importar GML' }).click();
  await expect(page.locator('.cd-node')).toHaveCount(7);
  await expect(page.locator('.cd-edge')).toHaveCount(6);
});

test('Importar esquema builds a tree from an indented outline', async ({ page }) => {
  page.on('dialog', d => d.accept('Raíz\n  - Hijo A\n    - Nieto\n  - Hijo B'));
  await openFor(page, 'Importar esquema'); await page.getByRole('button', { name: 'Importar esquema' }).click();
  await expect(page.locator('.cd-node')).toHaveCount(4);
  await expect(page.locator('.cd-edge')).toHaveCount(3); // tree: 4 nodes, 3 edges
});

test('exporting D2 downloads a .d2 file that re-imports to the same structure', async ({ page }) => {
  await openFor(page, 'Exportar D2');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar D2' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('diagrama.d2');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const c of stream) chunks.push(c as Buffer);
  const d2 = Buffer.concat(chunks).toString('utf8');
  expect(d2).toContain('->');
  expect(d2).toContain('AuthService');
  page.on('dialog', d => d.accept(d2));
  await openFor(page, 'Importar D2'); await page.getByRole('button', { name: 'Importar D2' }).click();
  await expect(page.locator('.cd-node')).toHaveCount(7);
  await expect(page.locator('.cd-edge')).toHaveCount(6);
});

test('exporting a full README downloads a Markdown page with mermaid + tables + metrics', async ({ page }) => {
  await openFor(page, 'Exportar README');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar README' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('README.diagrama.md');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const c of stream) chunks.push(c as Buffer);
  const md = Buffer.concat(chunks).toString('utf8');
  expect(md).toMatch(/```mermaid/);
  expect(md).toContain('## Métricas');
  expect(md).toContain('AuthService');
});

test('exporting Markdown tables produces node and connection tables', async ({ page }) => {
  await openFor(page, 'Exportar tablas Markdown');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar tablas Markdown' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('diagrama.tablas.md');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const c of stream) chunks.push(c as Buffer);
  const md = Buffer.concat(chunks).toString('utf8');
  expect(md).toContain('## Nodos');
  expect(md).toContain('## Conexiones');
  expect(md).toContain('| ID | Título | Tipo | Grupo | Etiquetas |');
  expect(md).toContain('AuthService');
});

test('exporting the node inventory CSV lists every node with its type', async ({ page }) => {
  await openFor(page, 'Exportar nodos CSV');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar nodos CSV' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('nodos.csv');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const c of stream) chunks.push(c as Buffer);
  const csv = Buffer.concat(chunks).toString('utf8').trim().split('\n');
  expect(csv[0]).toBe('id,title,type,group,tags,source');
  expect(csv.length).toBe(8); // header + 7 sample nodes
  expect(csv.some(l => l.includes('AuthService') && l.includes('service'))).toBe(true);
});

test('exporting the adjacency matrix downloads a labelled square CSV', async ({ page }) => {
  await openFor(page, 'Exportar matriz');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar matriz' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('diagrama.matriz.csv');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const c of stream) chunks.push(c as Buffer);
  const csv = Buffer.concat(chunks).toString('utf8').trim();
  const lines = csv.split('\n');
  expect(lines[0].startsWith('node,')).toBe(true);
  expect(lines[0]).toContain('AuthService');
  expect(lines.length).toBe(8); // header + 7 node rows (sample has 7 nodes)
  for (const l of lines.slice(1)) expect(l.split(',').length).toBe(8); // square: 7 cells + row label
});

test('right-click opens a context menu that acts on the node under the cursor', async ({ page }) => {
  await node(page, 'auth').locator('.cd-node-body').click({ button: 'right' });
  const menu = page.locator('#ctxmenu');
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: 'Duplicar' })).toBeVisible();
  // Duplicate via the menu -> one more node, menu closes.
  await menu.getByRole('menuitem', { name: 'Duplicar' }).click();
  await expect(page.locator('.cd-node')).toHaveCount(8);
  await expect(menu).toBeHidden();
  // Escape hides a reopened menu.
  await node(page, 'users').locator('.cd-node-body').click({ button: 'right' });
  await expect(menu).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
});

test('Layout por grupos keeps each type-cluster cohesive after grouping', async ({ page }) => {
  await page.getByLabel('Plantilla', { exact: true }).selectOption('microservices');
  await openFor(page, 'Agrupar por tipo'); await page.getByRole('button', { name: 'Agrupar por tipo' }).click();
  await page.keyboard.press('Escape');
  await openFor(page, 'Layout por grupos'); await page.getByRole('button', { name: 'Layout por grupos' }).click({ force: true });
  const doc = await savedDocument(page);
  // The 3 service nodes form a tight cluster, separated from the 2 database nodes.
  const bx = (type: string) => { const bs = doc.graph.nodes.filter((n: { type: string }) => n.type === type).map((n: { id: string }) => doc.layout.nodes[n.id]); return { min: Math.min(...bs.map((b: { x: number }) => b.x)), max: Math.max(...bs.map((b: { x: number; width: number }) => b.x + b.width)) }; };
  const svc = bx('service'), db = bx('database');
  // The two clusters' x-extents do not interleave (one is entirely left of the other).
  expect(svc.max <= db.min || db.max <= svc.min).toBe(true);
});

test('Agrupar por tipo groups nodes by their type (microservices template)', async ({ page }) => {
  await page.getByLabel('Plantilla', { exact: true }).selectOption('microservices');
  await expect(page.locator('.cd-node')).toHaveCount(8);
  await openFor(page, 'Agrupar por tipo'); await page.getByRole('button', { name: 'Agrupar por tipo' }).click();
  const doc = await savedDocument(page);
  const services = doc.graph.nodes.filter((n: { type: string; group?: string }) => n.type === 'service');
  expect(services.length).toBe(3);
  for (const n of services) expect(n.group).toBe('service'); // all services grouped together
  const dbs = doc.graph.nodes.filter((n: { type: string; group?: string }) => n.type === 'database');
  for (const n of dbs) expect(n.group).toBe('database');
});

test('Colapsar grupos contracts a group into one super-node', async ({ page }) => {
  // Group auth + users, then collapse.
  await node(page, 'auth').locator('.cd-node-body').click();
  await node(page, 'users').locator('.cd-node-body').click({ modifiers: ['Shift'] });
  page.once('dialog', d => d.accept('Backend'));
  await page.getByRole('button', { name: 'Agrupar', exact: true }).click();
  await expect(page.locator('.cd-group-box')).toHaveCount(1);
  await openFor(page, 'Colapsar grupos'); await page.getByRole('button', { name: 'Colapsar grupos' }).click();
  // 7 nodes - 2 members + 1 super-node = 6; the group box is gone.
  await expect(page.locator('.cd-node')).toHaveCount(6);
  await expect(page.locator('.cd-group-box')).toHaveCount(0);
  expect((await savedDocument(page)).graph.nodes.some((n: { title: string }) => n.title === 'Backend')).toBe(true);
});

test('Aislar selección extracts the selected nodes and the edges among them (undoable)', async ({ page }) => {
  // Select auth + users (connected by auth-users) and isolate them.
  await node(page, 'auth').locator('.cd-node-body').click();
  await node(page, 'users').locator('.cd-node-body').click({ modifiers: ['Shift'] });
  await openFor(page, 'Aislar selección'); await page.getByRole('button', { name: 'Aislar selección' }).click();
  await expect(page.locator('.cd-node')).toHaveCount(2);
  await expect(page.locator('.cd-edge')).toHaveCount(1); // only auth-users survives
  await expect(node(page, 'auth')).toBeVisible();
  await expect(node(page, 'users')).toBeVisible();
  await page.getByRole('button', { name: 'Deshacer', exact: true }).click();
  await expect(page.locator('.cd-node')).toHaveCount(7); // restored
});

test('Agrupar por comunidad clusters two triangles joined by a bridge into two groups', async ({ page }) => {
  // Import a two-cluster graph: triangles a-b-c and d-e-f, linked only by c-d.
  page.on('dialog', d => d.accept('a,b\nb,c\nc,a\nd,e\ne,f\nf,d\nc,d'));
  await openFor(page, 'Importar CSV'); await page.getByRole('button', { name: 'Importar CSV' }).click();
  await expect(page.locator('.cd-node')).toHaveCount(6);
  await openFor(page, 'Agrupar por comunidad'); await page.getByRole('button', { name: 'Agrupar por comunidad' }).click();
  // Louvain separates the two triangles -> two group boxes.
  await expect(page.locator('.cd-group-box')).toHaveCount(2);
});

test('a shared link restores the diagram from the URL fragment after reload', async ({ page }) => {
  // Build a distinct diagram (4 nodes) so a restore is distinguishable from the default sample (7).
  page.on('dialog', d => d.accept('from,to,label\nAuth,Users,verifica\nUsers,Audit,registra\nIsla,'));
  await openFor(page, 'Importar CSV'); await page.getByRole('button', { name: 'Importar CSV' }).click();
  await expect(page.locator('.cd-node')).toHaveCount(4);
  await openFor(page, 'Copiar enlace'); await page.getByRole('button', { name: 'Copiar enlace' }).click();
  // The handler writes the code into the location fragment.
  await expect.poll(() => page.evaluate(() => location.hash)).toContain('#d=K1:');
  await page.reload();
  await expect(page.locator('.cd-node')).toHaveCount(4); // restored from the fragment, not the 7-node sample
  await expect(node(page, 'Auth')).toBeVisible();
  const doc = await savedDocument(page);
  expect(doc.graph.edges.find((e: { source: string }) => e.source === 'Auth').label).toBe('verifica');
});

test('exporting Markdown downloads a .md file with a mermaid block and a node summary', async ({ page }) => {
await openFor(page, 'Exportar Markdown');
    const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar Markdown' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('diagrama.kairo.md');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const c of stream) chunks.push(c as Buffer);
  const md = Buffer.concat(chunks).toString('utf8');
  expect(md.startsWith('# Diagrama Kairo')).toBe(true);
  expect(md).toContain('```mermaid');
  expect(md).toContain('## Nodos');
  expect(md).toContain('AuthService');
  expect(md).toContain('## Conexiones');
});

test('organic layout repositions every node and keeps the graph intact as one undo step', async ({ page }) => {
  const before = await savedDocument(page);
  await openFor(page, 'Layout orgánico'); await page.getByRole('button', { name: 'Layout orgánico' }).click();
  const after = await savedDocument(page);
  // Semantics unchanged; positions all moved.
  expect(after.graph).toEqual(before.graph);
  const moved = before.graph.nodes.filter((n: { id: string }) => {
    const a = before.layout.nodes[n.id], b = after.layout.nodes[n.id];
    return a.x !== b.x || a.y !== b.y;
  });
  expect(moved.length).toBe(before.graph.nodes.length);
  // One undo restores the previous positions (replaceDocument is a single history step).
  await page.locator('#diagram').click();
  await page.keyboard.press('Control+z');
  const undone = await savedDocument(page);
  expect(undone.layout.nodes[before.graph.nodes[0].id].x).toBeCloseTo(before.layout.nodes[before.graph.nodes[0].id].x, 0);
});

test('choosing a theme preset restyles the live canvas', async ({ page }) => {
  const diagram = page.locator('#diagram .cd-editor');
  const canvasVar = () => diagram.evaluate(el => getComputedStyle(el).getPropertyValue('--cd-canvas-background').trim());
  const before = await canvasVar();
  await page.locator('#theme-preset').selectOption('blueprint');
  const after = await canvasVar();
  expect(after).not.toBe(before);
  expect(after.toLowerCase()).toBe('#0e2439'); // blueprint canvas background
  // Switching to high contrast thickens the node border variable.
  await page.locator('#theme-preset').selectOption('highContrast');
  const border = await diagram.evaluate(el => getComputedStyle(el).getPropertyValue('--cd-border-width').trim());
  expect(border).toBe('2px');
});

test('resolve overlaps separates nodes dragged on top of each other', async ({ page }) => {
  // Drag "auth" onto "users" so their boxes overlap.
  const target = (await node(page, 'users').locator('.cd-node-body').boundingBox())!;
  const grab = (await node(page, 'auth').locator('.cd-node-body').boundingBox())!;
  await page.mouse.move(grab.x + grab.width / 2, grab.y + grab.height / 2);
  await page.mouse.down();
  await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 12 });
  await page.mouse.up();
  const overlap = (a: any, b: any) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  const before = await savedDocument(page);
  expect(overlap(before.layout.nodes.auth, before.layout.nodes.users)).toBe(true); // they now overlap
  await openFor(page, 'Separar solapamientos'); await page.getByRole('button', { name: 'Separar solapamientos' }).click();
  const after = await savedDocument(page);
  expect(after.graph).toEqual(before.graph); // semantics intact
  // No two node boxes overlap any more.
  const ids = after.graph.nodes.map((n: { id: string }) => n.id);
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
    expect(overlap(after.layout.nodes[ids[i]], after.layout.nodes[ids[j]])).toBe(false);
  }
});

test('auto-group assigns a group per weakly-connected component', async ({ page }) => {
  // Two disconnected pairs -> two components.
  page.on('dialog', d => d.accept('from,to\nAuth,Users\nBilling,Ledger'));
  await openFor(page, 'Importar CSV'); await page.getByRole('button', { name: 'Importar CSV' }).click();
  await expect(page.locator('.cd-node')).toHaveCount(4);
  await openFor(page, 'Auto-agrupar'); await page.getByRole('button', { name: 'Auto-agrupar' }).click();
  const doc = await savedDocument(page);
  const groups = new Set(doc.graph.nodes.map((n: { group?: string }) => n.group).filter(Boolean));
  expect(groups.size).toBe(2); // one group per component
  const byId = Object.fromEntries(doc.graph.nodes.map((n: { id: string; group?: string }) => [n.id, n.group]));
  expect(byId.Auth).toBe(byId.Users); // same component -> same group
  expect(byId.Billing).toBe(byId.Ledger);
  expect(byId.Auth).not.toBe(byId.Billing); // different components -> different groups
});

test('exporting draw.io downloads a .drawio file that re-imports to the same structure', async ({ page }) => {
await openFor(page, 'Exportar draw.io');
    const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar draw.io' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('diagrama.drawio');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const c of stream) chunks.push(c as Buffer);
  const xml = Buffer.concat(chunks).toString('utf8');
  expect(xml.startsWith('<mxfile')).toBe(true);
  expect(xml).toContain('vertex="1"');
  expect(xml).toContain('AuthService');
  page.on('dialog', d => d.accept(xml));
  await openFor(page, 'Importar draw.io'); await page.getByRole('button', { name: 'Importar draw.io' }).click();
  await expect(page.locator('.cd-node')).toHaveCount(7);
  await expect(page.locator('.cd-edge')).toHaveCount(6);
});

test('Alt+Arrow navigates selection between nodes for keyboard accessibility', async ({ page }) => {
  const doc = await savedDocument(page);
  const center = (id: string) => { const b = doc.layout.nodes[id]; return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
  const ids: string[] = doc.graph.nodes.map((n: { id: string }) => n.id);
  const start = ids.reduce((a, b) => (center(a).x <= center(b).x ? a : b)); // leftmost node
  expect(ids.some(id => id !== start && center(id).x > center(start).x)).toBe(true); // a node exists to the right

  await node(page, start).locator('.cd-node-body').click();
  await expect(node(page, start)).toHaveClass(/is-selected/);
  await page.keyboard.press('Alt+ArrowRight');
  const selected = page.locator('.cd-node.is-selected');
  await expect(selected).toHaveCount(1);
  expect(await selected.getAttribute('data-node')).not.toBe(start); // selection moved rightward

  // With nothing selected, Alt+Arrow picks a node (keyboard entry point).
  await page.keyboard.press('Escape');
  await expect(page.locator('.cd-node.is-selected')).toHaveCount(0);
  await page.keyboard.press('Alt+ArrowDown');
  await expect(page.locator('.cd-node.is-selected')).toHaveCount(1);
});

test('critical path highlights the longest route through the flow', async ({ page }) => {
  // Switch to the decisions flow (a DAG: start -> check -> allow -> done, check -> deny).
  await page.getByLabel('Ejemplo', { exact: true }).selectOption('decisions');
  await expect(page.locator('.cd-node')).toHaveCount(5);
  await openFor(page, 'Ruta crítica'); await page.getByRole('button', { name: 'Ruta crítica' }).click();
  // Longest path is start -> check -> allow -> done (4 nodes).
  for (const id of ['start', 'check', 'allow', 'done']) await expect(node(page, id)).toHaveClass(/is-highlighted/);
  await expect(page.locator('[data-edge="begin"]')).toHaveClass(/is-highlighted/);
  await expect(node(page, 'deny')).not.toHaveClass(/is-highlighted/); // off the longest route
});

test('Holguras (CPM) highlights the zero-slack critical activities', async ({ page }) => {
  // Decisions DAG: start -> check -> allow -> done, check -> deny. deny is a dead-end one step short,
  // so it has slack; start/check/allow/done are on the critical path (project duration 4).
  await page.getByLabel('Ejemplo', { exact: true }).selectOption('decisions');
  await expect(page.locator('.cd-node')).toHaveCount(5);
  await openFor(page, 'Holguras'); await page.getByRole('button', { name: 'Holguras', exact: true }).click();
  await expect(page.locator('#toast')).toContainText(/CPM: duración 4 pasos/);
  for (const id of ['start', 'check', 'allow', 'done']) await expect(node(page, id)).toHaveClass(/is-highlighted/);
  await expect(node(page, 'deny')).not.toHaveClass(/is-highlighted/); // has slack -> not critical
});

test('exporting PlantUML downloads a .puml file that re-imports to the same structure', async ({ page }) => {
await openFor(page, 'Exportar PlantUML');
    const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar PlantUML' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('diagrama.puml');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const c of stream) chunks.push(c as Buffer);
  const puml = Buffer.concat(chunks).toString('utf8');
  expect(puml.startsWith('@startuml')).toBe(true);
  expect(puml).toContain('AuthService');
  expect(puml).toContain('-->');
  page.on('dialog', d => d.accept(puml));
  await openFor(page, 'Importar PlantUML'); await page.getByRole('button', { name: 'Importar PlantUML' }).click();
  await expect(page.locator('.cd-node')).toHaveCount(7);
  await expect(page.locator('.cd-edge')).toHaveCount(6);
});

test('exporting a PlantUML mindmap downloads a @startmindmap with depth markers', async ({ page }) => {
  await openFor(page, 'PlantUML mindmap');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'PlantUML mindmap', exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('diagrama.mindmap.puml');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const c of stream) chunks.push(c as Buffer);
  const puml = Buffer.concat(chunks).toString('utf8');
  expect(puml.startsWith('@startmindmap')).toBe(true);
  expect(puml.trim().endsWith('@endmindmap')).toBe(true);
  expect(puml).toMatch(/^\*+ \S/m); // at least one depth-marked node
});

test('importing a PlantUML mindmap builds a tree from its depth markers', async ({ page }) => {
  const puml = '@startmindmap\n* Proyecto\n** Diseño\n*** Bocetos\n** Desarrollo\n@endmindmap';
  page.on('dialog', d => d.accept(puml));
  await openFor(page, 'Importar mindmap PlantUML'); await page.getByRole('button', { name: 'Importar mindmap PlantUML', exact: true }).click();
  await expect(page.locator('.cd-node')).toHaveCount(4); // Proyecto, Diseño, Bocetos, Desarrollo
  await expect(page.locator('.cd-edge')).toHaveCount(3);
  await expect(page.getByRole('heading', { name: 'Mapa mental' })).toBeVisible();
  await expect(page.locator('#flow-diagnostics')).toBeHidden();
  expect((await savedDocument(page)).profile).toBe('mindmap');
});

test('inserting a starter template replaces the diagram', async ({ page }) => {
  await page.getByLabel('Plantilla', { exact: true }).selectOption('decision');
  await expect(page.locator('.cd-node')).toHaveCount(5); // decision template: start, check, yes, no, done
  await expect(page.locator('.cd-edge')).toHaveCount(5);
  const doc = await savedDocument(page);
  expect(doc.profile).toBe('flow');
  expect(doc.graph.nodes.some((n: { type: string }) => n.type === 'decision')).toBe(true);
  // A different template swaps the whole document.
  await page.getByLabel('Plantilla', { exact: true }).selectOption('architecture');
  await expect(page.locator('.cd-node')).toHaveCount(4);
  await expect(node(page, 'db')).toBeVisible();
});

test('dragging a supported file onto the canvas imports it (drop)', async ({ page }) => {
  // Build a DataTransfer with a .dot file and drop it on the editor.
  const dt = await page.evaluateHandle(() => {
    const d = new DataTransfer();
    d.items.add(new File(['digraph { A -> B -> C }'], 'g.dot', { type: 'text/plain' }));
    return d;
  });
  await page.locator('#diagram').dispatchEvent('drop', { dataTransfer: dt });
  await expect(page.locator('.cd-node')).toHaveCount(3);
  await expect(page.locator('.cd-edge')).toHaveCount(2);
});

test('Abrir archivo imports a dropped file with auto-detected format', async ({ page }) => {
  // Open a .mmd file via the hidden file input; format is auto-detected (Mermaid).
  await openFor(page, 'Abrir archivo'); await page.getByRole('button', { name: 'Abrir archivo' }).click();
  await page.locator('#file-input').setInputFiles({ name: 'flujo.mmd', mimeType: 'text/plain', buffer: Buffer.from('flowchart TD\n  A[Uno] --> B[Dos] --> C[Tres]') });
  await expect(page.locator('.cd-node')).toHaveCount(3);
  await expect(page.locator('.cd-edge')).toHaveCount(2);
});

test('the new real-world templates load from the selector', async ({ page }) => {
  await page.getByLabel('Plantilla', { exact: true }).selectOption('microservices');
  await expect(page.locator('.cd-node')).toHaveCount(8); // gateway + 3 services + 2 dbs + bus + client
  await page.getByLabel('Plantilla', { exact: true }).selectOption('cicdPipeline');
  await expect(page.locator('.cd-node')).toHaveCount(6);
  expect((await savedDocument(page)).graph.nodes.some((n: { type: string }) => n.type === 'decision')).toBe(true); // approval gate
  await page.getByLabel('Plantilla', { exact: true }).selectOption('stateMachine');
  await expect(page.locator('.cd-node')).toHaveCount(4);
  await page.getByLabel('Plantilla', { exact: true }).selectOption('kubernetes');
  await expect(page.locator('.cd-node')).toHaveCount(7); // ingress, service, deployment, 2 pods, config, db
  await page.getByLabel('Plantilla', { exact: true }).selectOption('dataPipeline');
  await expect(page.locator('.cd-node')).toHaveCount(6); // sources -> ingest -> lake -> transform -> warehouse -> BI
  await page.getByLabel('Plantilla', { exact: true }).selectOption('incidentResponse');
  await expect(page.locator('.cd-node')).toHaveCount(7);
  expect((await savedDocument(page)).graph.nodes.some((n: { type: string }) => n.type === 'decision')).toBe(true); // severity branch
});

test('importing a Mermaid mindmap builds a parent/child tree', async ({ page }) => {
  page.on('dialog', d => d.accept('mindmap\n  root((Kairo))\n    Formatos\n    Análisis'));
  await openFor(page, 'Importar texto'); await page.getByRole('button', { name: 'Importar texto' }).click();
  await expect(page.locator('.cd-node')).toHaveCount(3); // Kairo + two children
  await expect(page.locator('.cd-edge')).toHaveCount(2);
  await expect(node(page, 'Kairo').locator('ellipse.cd-node-body')).toBeVisible(); // (( )) -> ellipse
});

test('key nodes highlights the most connected nodes', async ({ page }) => {
  await openFor(page, 'Nodos clave'); await page.getByRole('button', { name: 'Nodos clave' }).click();
  const highlighted = page.locator('.cd-node.is-highlighted');
  const count = await highlighted.count();
  expect(count).toBeGreaterThan(0);
  expect(count).toBeLessThanOrEqual(3); // at most the top 3 hubs
});

test('Compactar componentes tidies a graph with disconnected parts', async ({ page }) => {
  page.once('dialog', d => d.accept('A,B\nC,D')); // two separate components
  await openFor(page, 'Importar CSV'); await page.getByRole('button', { name: 'Importar CSV' }).click();
  await expect(page.locator('.cd-node')).toHaveCount(4);
  await openFor(page, 'Compactar componentes'); await page.getByRole('button', { name: 'Compactar componentes', exact: true }).click();
  await expect(page.locator('#toast')).toContainText('Componentes compactados');
  await expect(page.locator('.cd-node')).toHaveCount(4); // structure preserved
});

test('Árbol de expansión reduces a cyclic graph to its skeleton', async ({ page }) => {
  page.once('dialog', d => d.accept('A,B\nB,C\nC,A')); // triangle: 3 edges, one cycle
  await openFor(page, 'Importar CSV'); await page.getByRole('button', { name: 'Importar CSV' }).click();
  await expect(page.locator('.cd-edge')).toHaveCount(3);
  await openFor(page, 'Árbol de expansión'); await page.getByRole('button', { name: 'Árbol de expansión', exact: true }).click();
  await expect(page.locator('.cd-edge')).toHaveCount(2); // one cycle edge dropped -> V-1
  await expect(page.locator('.cd-node')).toHaveCount(3);
});

test('Podar hojas strips degree-1 nodes from a star down to the hub', async ({ page }) => {
  page.once('dialog', d => d.accept('H,A\nH,B\nH,C')); // hub H with 3 leaves
  await openFor(page, 'Importar CSV'); await page.getByRole('button', { name: 'Importar CSV' }).click();
  await expect(page.locator('.cd-node')).toHaveCount(4);
  await openFor(page, 'Podar hojas'); await page.getByRole('button', { name: 'Podar hojas', exact: true }).click();
  await expect(page.locator('.cd-node')).toHaveCount(1); // only the hub remains
  await expect(page.locator('#toast')).toContainText('Hojas podadas: 3');
});

test('Quitar aristas duplicadas removes parallel edges after a CSV import', async ({ page }) => {
  page.once('dialog', d => d.accept('A,B\nA,B\nB,C')); // A->B twice + B->C
  await openFor(page, 'Importar CSV'); await page.getByRole('button', { name: 'Importar CSV' }).click();
  await expect(page.locator('.cd-edge')).toHaveCount(3); // the parallel A->B survives import
  await openFor(page, 'Quitar aristas duplicadas'); await page.getByRole('button', { name: 'Quitar aristas duplicadas', exact: true }).click();
  await expect(page.locator('.cd-edge')).toHaveCount(2); // one parallel removed
  await expect(page.locator('#toast')).toContainText(/Aristas duplicadas quitadas: 1/);
});

test('Ruta euleriana detects an Eulerian circuit over a directed triangle', async ({ page }) => {
  page.once('dialog', d => d.accept('A,B\nB,C\nC,A')); // directed triangle: balanced -> Eulerian circuit
  await openFor(page, 'Importar CSV'); await page.getByRole('button', { name: 'Importar CSV' }).click();
  await expect(page.locator('.cd-edge')).toHaveCount(3);
  await openFor(page, 'Ruta euleriana'); await page.getByRole('button', { name: 'Ruta euleriana', exact: true }).click();
  await expect(page.locator('#toast')).toContainText(/Ruta euleriana \(circuito\): recorre las 3 conexión/);
});

test('Fragmentación ranks the single points of failure by how much they shatter the graph', async ({ page }) => {
  // Architecture sample has articulation points (auth, session, gateway); removing one splits the graph.
  await openFor(page, 'Fragmentación'); await page.getByRole('button', { name: 'Fragmentación', exact: true }).click();
  await expect(page.locator('#toast')).toContainText(/Fragmentación: «\w+» parte el grafo en \d+ componentes/);
  await expect(page.locator('.cd-editor')).toHaveClass(/has-highlight/);
});

test('Bucles finds all feedback loops in a cyclic graph', async ({ page }) => {
  page.once('dialog', d => d.accept('A,B\nB,C\nC,A')); // one 3-cycle
  await openFor(page, 'Importar CSV'); await page.getByRole('button', { name: 'Importar CSV' }).click();
  await expect(page.locator('.cd-node')).toHaveCount(3);
  await openFor(page, 'Bucles'); await page.getByRole('button', { name: 'Bucles', exact: true }).click();
  await expect(page.locator('#toast')).toContainText('1 bucle(s) de retroalimentación');
  await expect(page.locator('.cd-editor')).toHaveClass(/has-highlight/);
});

test('Corte mínimo highlights the bottleneck links between two selected nodes', async ({ page }) => {
  // Architecture sample is a single chain login -> auth -> session -> gateway -> firebase: one disjoint path.
  await node(page, 'login').locator('.cd-node-body').click();
  await node(page, 'firebase').locator('.cd-node-body').click({ modifiers: ['Shift'] });
  await openFor(page, 'Corte mínimo'); await page.getByRole('button', { name: 'Corte mínimo', exact: true }).click();
  await expect(page.locator('#toast')).toContainText(/Corte mínimo: 1 camino\(s\) disjunto\(s\); 1 enlace/);
  await expect(page.locator('[data-edge="login-auth"]')).toHaveClass(/is-highlighted/); // the single cut edge
});

test('all paths highlights every route between two selected nodes', async ({ page }) => {
  // Architecture sample: login -> auth -> {users, session -> gateway -> firebase}.
  await node(page, 'login').locator('.cd-node-body').click();
  await node(page, 'firebase').locator('.cd-node-body').click({ modifiers: ['Shift'] });
  await openFor(page, 'Todas las rutas'); await page.getByRole('button', { name: 'Todas las rutas' }).click();
  // The only route login -> ... -> firebase goes through auth, session and gateway.
  for (const id of ['login', 'auth', 'session', 'gateway', 'firebase']) await expect(node(page, id)).toHaveClass(/is-highlighted/);
  await expect(node(page, 'users')).not.toHaveClass(/is-highlighted/); // not on any route to firebase
});

test('Rutas alternativas highlights the k shortest routes between two nodes', async ({ page }) => {
  await node(page, 'login').locator('.cd-node-body').click();
  await node(page, 'firebase').locator('.cd-node-body').click({ modifiers: ['Shift'] });
  await openFor(page, 'Rutas alternativas'); await page.getByRole('button', { name: 'Rutas alternativas', exact: true }).click();
  for (const id of ['login', 'auth', 'session', 'gateway', 'firebase']) await expect(node(page, id)).toHaveClass(/is-highlighted/);
  await expect(node(page, 'users')).not.toHaveClass(/is-highlighted/);
  await expect(page.locator('#toast')).toContainText(/ruta\(s\) alternativa\(s\); la más corta usa 4 salto\(s\)/);
});

test('radial layout repositions every node around the center as one undo step', async ({ page }) => {
  const before = await savedDocument(page);
  await openFor(page, 'Layout radial'); await page.getByRole('button', { name: 'Layout radial' }).click();
  const after = await savedDocument(page);
  expect(after.graph).toEqual(before.graph);
  const moved = before.graph.nodes.filter((n: { id: string }) => {
    const a = before.layout.nodes[n.id], b = after.layout.nodes[n.id];
    return a.x !== b.x || a.y !== b.y;
  });
  expect(moved.length).toBeGreaterThan(0);
  await page.locator('#diagram').click();
  await page.keyboard.press('Control+z');
  const undone = await savedDocument(page);
  const id = before.graph.nodes[0].id;
  expect(undone.layout.nodes[id].x).toBeCloseTo(before.layout.nodes[id].x, 0);
});

test('a node with an http reference exports as a clickable link in the SVG', async ({ page }) => {
  await node(page, 'auth').locator('.cd-node-body').click();
  await page.locator('#node-source').fill('https://example.com/auth');
  await page.locator('#node-source').blur();
await openFor(page, 'Exportar SVG');
    const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar SVG' }).click(),
  ]);
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const c of stream) chunks.push(c as Buffer);
  const svg = Buffer.concat(chunks).toString('utf8');
  expect(svg).toContain('<a href="https://example.com/auth" target="_blank" rel="noopener">');
});

test('neighborhood highlights the selected node and its direct neighbors', async ({ page }) => {
  // auth connects to login (in), users (out) and session (out) in the architecture sample.
  await node(page, 'auth').locator('.cd-node-body').click();
  await openFor(page, 'Vecindario'); await page.getByRole('button', { name: 'Vecindario' }).click();
  for (const id of ['auth', 'login', 'users', 'session']) await expect(node(page, id)).toHaveClass(/is-highlighted/);
  await expect(node(page, 'firebase')).not.toHaveClass(/is-highlighted/); // two hops away
});

test('Nodos similares highlights a node and its structural twin', async ({ page }) => {
  // h->a and h->b: a and b share the single neighbour h, so they are perfectly similar.
  page.once('dialog', d => d.accept('h,a\nh,b'));
  await openFor(page, 'Importar CSV'); await page.getByRole('button', { name: 'Importar CSV' }).click();
  await expect(page.locator('.cd-node')).toHaveCount(3);
  await page.keyboard.press('Escape');
  await node(page, 'a').locator('.cd-node-body').click();
  await openFor(page, 'Nodos similares'); await page.getByRole('button', { name: 'Nodos similares', exact: true }).click();
  await expect(page.locator('.cd-node.is-highlighted')).toHaveCount(2); // a and its twin b
  await expect(node(page, 'b')).toHaveClass(/is-highlighted/);
  await expect(page.locator('#toast')).toContainText(/Nodos similares: 1/);
});

test('exported SVG carries per-node tooltips for hover and screen readers', async ({ page }) => {
await openFor(page, 'Exportar SVG');
    const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar SVG' }).click(),
  ]);
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const c of stream) chunks.push(c as Buffer);
  const svg = Buffer.concat(chunks).toString('utf8');
  const titles = svg.match(/<title>[^<]*<\/title>/g) || [];
  expect(titles.length).toBeGreaterThan(1); // the diagram title plus per-node titles
  expect(titles.some(t => t.includes('AuthService'))).toBe(true);
});

test('Ctrl/Cmd+A selects every node', async ({ page }) => {
  const total = await page.locator('.cd-node').count();
  await node(page, 'auth').locator('.cd-node-body').click(); // focus the editor + select one
  await expect(page.locator('.cd-node.is-selected')).toHaveCount(1);
  await page.keyboard.press('Control+a');
  await expect(page.locator('.cd-node.is-selected')).toHaveCount(total); // all selected
  await expect(page.locator('.cd-resize-handle')).toBeHidden(); // multi-selection: no resize handle
});

test('exporting the legend downloads an SVG listing the node types', async ({ page }) => {
await openFor(page, 'Exportar leyenda');
    const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar leyenda' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('diagrama.leyenda.svg');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const c of stream) chunks.push(c as Buffer);
  const svg = Buffer.concat(chunks).toString('utf8');
  expect(svg.startsWith('<svg')).toBe(true);
  expect(svg).toContain('Tipos de nodo');
});

test('exporting TikZ downloads LaTeX with a tikzpicture of the diagram', async ({ page }) => {
await openFor(page, 'Exportar TikZ');
    const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar TikZ' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('diagrama.tikz.tex');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const c of stream) chunks.push(c as Buffer);
  const tex = Buffer.concat(chunks).toString('utf8');
  expect(tex).toContain('\\begin{tikzpicture}');
  expect(tex).toContain('\\end{tikzpicture}');
  expect(tex).toContain('AuthService');
});

test('exporting Typst downloads a CeTZ canvas of the diagram', async ({ page }) => {
  await openFor(page, 'Exportar Typst');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar Typst' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('diagrama.typ');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const c of stream) chunks.push(c as Buffer);
  const typ = Buffer.concat(chunks).toString('utf8');
  expect(typ).toContain('#cetz.canvas({');
  expect(typ).toContain('import cetz.draw: *');
  expect(typ).toContain('"AuthService"');
});

test('exporting Cytoscape JSON downloads a graph that re-imports to the same structure', async ({ page }) => {
await openFor(page, 'Exportar Cytoscape');
    const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar Cytoscape' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('diagrama.cyjs');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const c of stream) chunks.push(c as Buffer);
  const json = Buffer.concat(chunks).toString('utf8');
  const cy = JSON.parse(json);
  expect(cy.elements.nodes.length).toBe(7);
  expect(cy.elements.edges.length).toBe(6);
  page.on('dialog', d => d.accept(json));
  await openFor(page, 'Importar Cytoscape'); await page.getByRole('button', { name: 'Importar Cytoscape' }).click();
  await expect(page.locator('.cd-node')).toHaveCount(7);
});

test('importing hierarchical JSON builds a tree', async ({ page }) => {
  page.on('dialog', d => d.accept('{"name":"Raíz","children":[{"name":"A","children":[{"name":"A1"}]},{"name":"B"}]}'));
  await openFor(page, 'Importar JSON árbol'); await page.getByRole('button', { name: 'Importar JSON árbol' }).click();
  await expect(page.locator('.cd-node')).toHaveCount(4); // Raíz, A, A1, B
  await expect(page.locator('.cd-edge')).toHaveCount(3);
  await expect(page.locator('.cd-node', { hasText: 'Raíz' })).toHaveCount(1);
});

test('exporting the report downloads a Markdown summary of the diagram', async ({ page }) => {
await openFor(page, 'Exportar informe');
    const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar informe' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('diagrama.informe.md');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const c of stream) chunks.push(c as Buffer);
  const md = Buffer.concat(chunks).toString('utf8');
  expect(md).toContain('# Informe del diagrama');
  expect(md).toContain('## Resumen');
  expect(md).toContain('- Nodos: 7');
  expect(md).toContain('## Nodos clave');
});

test('the accent color input re-themes the canvas via themeFrom', async ({ page }) => {
  const sel = () => page.locator('#diagram .cd-editor').evaluate(el => getComputedStyle(el).getPropertyValue('--cd-selected-border').trim());
  await page.locator('#accent').evaluate((el: HTMLInputElement) => { el.value = '#ff0000'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  expect((await sel()).toLowerCase()).toBe('#ff0000'); // accent drives the selection color
});

test('importing a CSV node table builds typed nodes with no edges', async ({ page }) => {
  page.on('dialog', d => d.accept('id,name,type,tags\nauth,AuthService,service,core\ndb,UserDB,database,datos'));
  await openFor(page, 'Importar CSV'); await page.getByRole('button', { name: 'Importar CSV' }).click();
  await expect(page.locator('.cd-node')).toHaveCount(2);
  await expect(page.locator('.cd-edge')).toHaveCount(0);
  const doc = await savedDocument(page);
  expect(doc.graph.nodes.find((n: { id: string }) => n.id === 'auth').type).toBe('service');
  expect(doc.graph.nodes.find((n: { id: string }) => n.id === 'db').tags).toContain('datos');
});

test('onNodeRender lets a host draw custom content into each node', async ({ page }) => {
  await page.setContent('<div id="host2" style="width:800px;height:600px"></div>');
  await page.addStyleTag({ path: 'packages/diagram/dist/kairo.global.css' });
  await page.addScriptTag({ path: 'packages/diagram/dist/kairo.global.js' });
  const result = await page.evaluate(() => {
    const K = (window as unknown as { Kairo: any }).Kairo;
    const doc = K.createDocument({ nodes: [{ id: 'a', type: 'service', title: 'A' }, { id: 'b', type: 'database', title: 'B' }], edges: [] });
    K.createDiagram(document.getElementById('host2')!, {
      document: doc,
      onNodeRender: (node: any, layer: SVGGElement) => {
        const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        dot.setAttribute('class', 'host-badge'); dot.setAttribute('r', '5'); dot.dataset.for = node.id;
        layer.append(dot);
      },
    });
    return { custom: document.querySelectorAll('.cd-node-custom').length, badges: document.querySelectorAll('circle.host-badge').length };
  });
  expect(result.custom).toBe(2); // every node has a custom layer
  expect(result.badges).toBe(2); // the host drew into each one
});

test('tree layout arranges nodes as a hierarchy in one undo step', async ({ page }) => {
  const before = await savedDocument(page);
  await openFor(page, 'Layout árbol'); await page.getByRole('button', { name: 'Layout árbol' }).click();
  const after = await savedDocument(page);
  expect(after.graph).toEqual(before.graph);
  const moved = before.graph.nodes.filter((n: { id: string }) => {
    const a = before.layout.nodes[n.id], b = after.layout.nodes[n.id];
    return a.x !== b.x || a.y !== b.y;
  });
  expect(moved.length).toBeGreaterThan(0);
  await page.locator('#diagram').click();
  await page.keyboard.press('Control+z');
  const undone = await savedDocument(page);
  const id = before.graph.nodes[0].id;
  expect(undone.layout.nodes[id].x).toBeCloseTo(before.layout.nodes[id].x, 0);
});

test('exported SVG includes a legend panel of node types', async ({ page }) => {
await openFor(page, 'Exportar SVG');
    const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar SVG' }).click(),
  ]);
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const c of stream) chunks.push(c as Buffer);
  const svg = Buffer.concat(chunks).toString('utf8');
  expect(svg).toContain('>Leyenda<');
});

test('import auto detects the format and builds the diagram', async ({ page }) => {
  page.on('dialog', d => d.accept('digraph { A -> B -> C }'));
  await openFor(page, 'Importar auto'); await page.getByRole('button', { name: 'Importar auto' }).click();
  await expect(page.locator('.cd-node')).toHaveCount(3); // DOT detected and parsed
  await expect(page.locator('.cd-edge')).toHaveCount(2);
});

test('grouped nodes export to Mermaid as a subgraph', async ({ page }) => {
  await node(page, 'auth').locator('.cd-node-body').click();
  await node(page, 'users').locator('.cd-node-body').click({ modifiers: ['Shift'] });
  page.once('dialog', d => d.accept('Backend'));
  await page.getByRole('button', { name: 'Agrupar', exact: true }).click();
await openFor(page, 'Exportar texto');
    const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar texto', exact: true }).click(),
  ]);
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const c of stream) chunks.push(c as Buffer);
  const mmd = Buffer.concat(chunks).toString('utf8');
  expect(mmd).toContain('[Backend]');
  expect(mmd).toContain('subgraph');
  expect(mmd).toContain('end');
});

test('importing a Mermaid sequenceDiagram builds an interaction graph', async ({ page }) => {
  page.on('dialog', d => d.accept('sequenceDiagram\n  participant A as Alice\n  A->>Bob: Hola\n  Bob-->>A: Responde'));
  await openFor(page, 'Importar texto'); await page.getByRole('button', { name: 'Importar texto' }).click();
  await expect(page.locator('.cd-node')).toHaveCount(2); // Alice + Bob
  await expect(page.locator('.cd-edge')).toHaveCount(2);
  await expect(page.locator('.cd-node', { hasText: 'Alice' })).toHaveCount(1);
});
test('the example boots with no uncaught console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('/');
  await expect(page.locator('.cd-node').first()).toBeVisible();
  await expect(page.locator('.cd-node[data-node="auth"]')).toHaveClass(/is-selected/); // initial setup ran to completion
  expect(errors).toEqual([]);
});

test('toolbar groups actions into dropdown menus that open and close', async ({ page }) => {
  const item = page.getByRole('button', { name: 'Exportar SVG' });
  await expect(item).toBeHidden(); // inside a closed menu
  await page.getByRole('button', { name: 'Exportar', exact: true }).click();
  await expect(item).toBeVisible(); // menu opened
  await page.keyboard.press('Escape');
  await expect(item).toBeHidden(); // Escape closes it
});

test('simplify removes transitively redundant edges', async ({ page }) => {
  // Import a graph with a shortcut: A->B->C and A->C (redundant).
  page.on('dialog', d => d.accept('A,B\nB,C\nA,C'));
  await openFor(page, 'Importar CSV');
  await page.getByRole('button', { name: 'Importar CSV' }).click();
  await expect(page.locator('.cd-edge')).toHaveCount(3);
  await openFor(page, 'Simplificar');
  await page.getByRole('button', { name: 'Simplificar' }).click();
  await expect(page.locator('.cd-edge')).toHaveCount(2); // the A->C shortcut is gone
  await expect(page.locator('.cd-node')).toHaveCount(3);
});

test('the command palette (Ctrl+K) searches and runs an action', async ({ page }) => {
  await page.locator('#diagram .cd-editor').click(); // focus the app
  await page.keyboard.press('Control+k');
  await expect(page.locator('#palette')).toBeVisible();
  await page.locator('#palette-input').fill('Exportar SVG');
  await expect(page.locator('#palette-list li.active')).toHaveText('Exportar SVG');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.keyboard.press('Enter'),
  ]);
  expect(download.suggestedFilename()).toBe('diagrama.kairo.svg'); // palette ran the export
  await expect(page.locator('#palette')).toBeHidden(); // closes after running
});
test('the command palette closes on Escape', async ({ page }) => {
  await page.locator('#diagram .cd-editor').click();
  await page.keyboard.press('Control+k');
  await expect(page.locator('#palette')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#palette')).toBeHidden();
});

test('inserting a template merges it beside the current diagram', async ({ page }) => {
  const before = await page.locator('.cd-node').count();
  await openFor(page, 'Insertar decisión');
  await page.getByRole('button', { name: 'Insertar decisión' }).click();
  await expect(page.locator('.cd-node')).toHaveCount(before + 5); // decision template adds 5 nodes
});

test('orthogonal edge style renders sharp right-angle connectors', async ({ page }) => {
  await page.getByLabel('Estilo de conexiones').selectOption('orthogonal');
  const d = await page.locator('.cd-edge-path').first().getAttribute('d');
  expect(d).not.toContain(' C '); // not a bezier
  expect(d).not.toContain('Q'); // sharp corners, no rounding
  expect(d).toContain('L'); // straight segments
});

test('Copiar imagen mermaid.ink writes a renderable Markdown image URL to the clipboard', async ({ page }) => {
  // Stub the clipboard before the app loads so the write is captured regardless of browser permissions.
  await page.addInitScript(() => {
    (window as unknown as { __clip?: string }).__clip = '';
    const w = window as unknown as { __clip: string };
    try { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: (t: string) => { w.__clip = t; return Promise.resolve(); } } }); } catch { /* read-only in some engines */ }
  });
  await page.goto('/');
  await expect(page.locator('.cd-node').first()).toBeVisible();
  await openFor(page, 'Copiar imagen mermaid.ink');
  await page.getByRole('button', { name: 'Copiar imagen mermaid.ink' }).click();
  // The async handler writes the Markdown image into the stubbed clipboard; wait for it, then assert the shape.
  await expect.poll(() => page.evaluate(() => (window as unknown as { __clip: string }).__clip)).not.toBe('');
  const clip = await page.evaluate(() => (window as unknown as { __clip: string }).__clip);
  expect(clip).toMatch(/^!\[Diagrama Kairo\]\(https:\/\/mermaid\.ink\/img\/[A-Za-z0-9\-_]+\)$/);
});

test('Auto-layout óptimo re-lays the diagram and reports the chosen layout and its crossings', async ({ page }) => {
  await expect(page.locator('.cd-node')).toHaveCount(7);
  await openFor(page, 'Auto-layout óptimo');
  await page.getByRole('button', { name: 'Auto-layout óptimo' }).click();
  const toast = page.locator('#toast');
  await expect(toast).toBeVisible();
  await expect(toast).toContainText(/Auto-layout óptimo: .+ \(\d+ cruce\(s\)\)/);
  await expect(page.locator('.cd-node')).toHaveCount(7); // same graph, re-laid
  await expect(page.locator('.cd-edge')).toHaveCount(6);
});

test('Copiar imagen Kroki writes a renderable Kroki Markdown image URL to the clipboard', async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __clip?: string }).__clip = '';
    const w = window as unknown as { __clip: string };
    try { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: (t: string) => { w.__clip = t; return Promise.resolve(); } } }); } catch { /* read-only in some engines */ }
  });
  await page.goto('/');
  await expect(page.locator('.cd-node').first()).toBeVisible();
  await openFor(page, 'Copiar imagen Kroki');
  await page.getByRole('button', { name: 'Copiar imagen Kroki' }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __clip: string }).__clip)).not.toBe('');
  const clip = await page.evaluate(() => (window as unknown as { __clip: string }).__clip);
  expect(clip).toMatch(/^!\[Diagrama Kairo\]\(https:\/\/kroki\.io\/mermaid\/svg\/[A-Za-z0-9\-_]+\)$/);
});

test('editable SVG round-trips: export, replace the diagram, re-import the SVG to restore it', async ({ page }) => {
  await expect(page.locator('.cd-node')).toHaveCount(7);
  await openFor(page, 'SVG editable');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'SVG editable' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('diagrama.editable.svg');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const c of stream) chunks.push(c as Buffer);
  const svg = Buffer.concat(chunks).toString('utf8');
  expect(svg).toContain('<metadata id="kairo-document"');
  // Replace the diagram with a 3-node graph so a restore is observable.
  page.once('dialog', d => d.accept('a,b\nb,c'));
  await openFor(page, 'Importar CSV'); await page.getByRole('button', { name: 'Importar CSV' }).click();
  await expect(page.locator('.cd-node')).toHaveCount(3);
  // Re-import the editable SVG via auto-detect (same menu — reset its state first): full fidelity restore.
  await page.keyboard.press('Escape');
  page.once('dialog', d => d.accept(svg));
  await openFor(page, 'Importar auto'); await page.getByRole('button', { name: 'Importar auto' }).click();
  await expect(page.locator('.cd-node')).toHaveCount(7);
  await expect(page.locator('.cd-edge')).toHaveCount(6);
});

test('Fusionar nodos merges a Shift-selection into one node, rewiring edges', async ({ page }) => {
  await expect(page.locator('.cd-node')).toHaveCount(7);
  const edgesBefore = await page.locator('.cd-edge').count();
  await node(page, 'auth').locator('.cd-node-body').click();
  await node(page, 'users').locator('.cd-node-body').click({ modifiers: ['Shift'] });
  await expect(node(page, 'users')).toHaveClass(/is-selected/);
  await openFor(page, 'Fusionar nodos');
  await page.getByRole('button', { name: 'Fusionar nodos' }).click();
  await expect(page.locator('.cd-node')).toHaveCount(6); // two became one
  await expect(node(page, 'auth')).toBeVisible();        // survivor keeps its id
  await expect(node(page, 'users')).toHaveCount(0);      // folded in
  expect(await page.locator('.cd-edge').count()).toBeLessThanOrEqual(edgesBefore);
});

test('Insertar nodo en arista splits the selected edge into two with a node between', async ({ page }) => {
  await expect(page.locator('.cd-node')).toHaveCount(7);
  const edgesBefore = await page.locator('.cd-edge').count();
  await page.locator('[data-edge="login-auth"] .cd-edge-hit').click({ force: true }); // select the edge
  await openFor(page, 'Insertar nodo en arista');
  await page.getByRole('button', { name: 'Insertar nodo en arista' }).click();
  await expect(page.locator('.cd-node')).toHaveCount(8);                 // one node inserted
  expect(await page.locator('.cd-edge').count()).toBe(edgesBefore + 1);  // one edge became two
  await expect(page.locator('[data-edge="login-auth"]')).toHaveCount(0); // original edge replaced
});

test('Omitir nodo removes the node and reconnects its predecessor to its successors', async ({ page }) => {
  await expect(page.locator('.cd-node')).toHaveCount(7);
  await node(page, 'auth').locator('.cd-node-body').click(); // auth: login -> auth -> {users, session}
  await openFor(page, 'Omitir nodo');
  await page.getByRole('button', { name: 'Omitir nodo' }).click();
  await expect(page.locator('.cd-node')).toHaveCount(6);        // auth removed
  await expect(node(page, 'auth')).toHaveCount(0);
  await expect(page.locator('[data-edge="login-auth"]')).toHaveCount(0); // its edges gone
  // Flow preserved: login now reaches users and session directly.
  await expect(page.locator('[data-edge="login-users"]')).toHaveCount(1);
  await expect(page.locator('[data-edge="login-session"]')).toHaveCount(1);
});

test('exporting Pajek downloads a .net file that re-imports to the same structure', async ({ page }) => {
  await openFor(page, 'Exportar Pajek');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar Pajek' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('diagrama.net');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const c of stream) chunks.push(c as Buffer);
  const net = Buffer.concat(chunks).toString('utf8');
  expect(net).toContain('*Vertices');
  expect(net).toContain('AuthService');
  page.once('dialog', d => d.accept(net));
  await openFor(page, 'Importar Pajek'); await page.getByRole('button', { name: 'Importar Pajek' }).click();
  await expect(page.locator('.cd-node')).toHaveCount(7);
  await expect(page.locator('.cd-edge')).toHaveCount(6);
});

test('Reducir cruces re-lays the diagram hierarchically without changing the graph', async ({ page }) => {
  await expect(page.locator('.cd-node')).toHaveCount(7);
  await openFor(page, 'Reducir cruces');
  await page.getByRole('button', { name: 'Reducir cruces' }).click();
  await expect(page.locator('#toast')).toContainText(/Cruces reducidos/);
  await expect(page.locator('.cd-node')).toHaveCount(7); // same graph, re-laid
  await expect(page.locator('.cd-edge')).toHaveCount(6);
  await expect(node(page, 'auth')).toBeVisible();
});

test('exporting a step-by-step procedure downloads numbered Markdown of the flow', async ({ page }) => {
  await openFor(page, 'Exportar procedimiento');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar procedimiento' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('diagrama.procedimiento.md');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const c of stream) chunks.push(c as Buffer);
  const md = Buffer.concat(chunks).toString('utf8');
  expect(md).toContain('# Procedimiento');
  expect(md).toMatch(/^\d+\. \*\*/m);     // numbered steps
  expect(md).toContain('(paso');          // cross-references to step numbers
});

test('exporting Structurizr DSL downloads a C4 workspace of the diagram', async ({ page }) => {
  await openFor(page, 'Exportar Structurizr');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar Structurizr' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('diagrama.dsl');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const c of stream) chunks.push(c as Buffer);
  const dsl = Buffer.concat(chunks).toString('utf8');
  expect(dsl).toContain('workspace ');
  expect(dsl).toContain('model {');
  expect(dsl).toContain('AuthService');
  expect(dsl).toContain('views {');
});

test('Structurizr DSL round-trips in the example: export, replace, re-import', async ({ page }) => {
  await expect(page.locator('.cd-node')).toHaveCount(7);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    (async () => { await openFor(page, 'Exportar Structurizr'); await page.getByRole('button', { name: 'Exportar Structurizr' }).click(); })(),
  ]);
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const c of stream) chunks.push(c as Buffer);
  const dsl = Buffer.concat(chunks).toString('utf8');
  page.once('dialog', d => d.accept('a,b\nb,c'));
  await openFor(page, 'Importar CSV'); await page.getByRole('button', { name: 'Importar CSV' }).click();
  await expect(page.locator('.cd-node')).toHaveCount(3);
  await page.keyboard.press('Escape');
  page.once('dialog', d => d.accept(dsl));
  await openFor(page, 'Importar Structurizr'); await page.getByRole('button', { name: 'Importar Structurizr' }).click();
  await expect(page.locator('.cd-node')).toHaveCount(7); // restored
});

test('Complejidad reports the cyclomatic complexity of the diagram in a toast', async ({ page }) => {
  await openFor(page, 'Complejidad');
  await page.getByRole('button', { name: 'Complejidad', exact: true }).click();
  const toast = page.locator('#toast');
  await expect(toast).toBeVisible();
  await expect(toast).toContainText(/Complejidad ciclomática: \d+/);
  await expect(toast).toContainText(/decisión\(es\)/);
});

test('Añadir nodo estable adds a node without moving the existing ones (stable layout)', async ({ page }) => {
  await expect(page.locator('.cd-node')).toHaveCount(7);
  const before = (await node(page, 'auth').boundingBox())!;
  await openFor(page, 'Añadir nodo estable');
  await page.getByRole('button', { name: 'Añadir nodo estable' }).click();
  await expect(page.locator('.cd-node')).toHaveCount(8); // one added
  const after = (await node(page, 'auth').boundingBox())!;
  // The existing node's on-screen position is essentially unchanged (allow a couple px for fit/zoom rounding).
  expect(Math.abs(after.x - before.x)).toBeLessThan(3);
  expect(Math.abs(after.y - before.y)).toBeLessThan(3);
});

test('exporting Mermaid C4 downloads a C4Context diagram', async ({ page }) => {
  await openFor(page, 'Exportar Mermaid C4');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar Mermaid C4' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('diagrama.c4.mmd');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const c of stream) chunks.push(c as Buffer);
  const c4 = Buffer.concat(chunks).toString('utf8');
  expect(c4).toContain('C4Context');
  expect(c4).toContain('AuthService');
  expect(c4).toMatch(/\b(System|Person|SystemDb)\(/);
});

test('exporting Mermaid architecture-beta downloads a grouped service diagram', async ({ page }) => {
  await openFor(page, 'Exportar Mermaid arquitectura');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar Mermaid arquitectura', exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('diagrama.arquitectura.mmd');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const c of stream) chunks.push(c as Buffer);
  const arch = Buffer.concat(chunks).toString('utf8');
  expect(arch.split('\n')[0]).toBe('architecture-beta');
  expect(arch).toMatch(/service \w+\((cloud|database|disk|internet|server)\)\[/); // a typed service
  expect(arch).toMatch(/:\w --> \w:/); // a side-anchored connection
});

test('exporting Mermaid block-beta downloads a grid block diagram', async ({ page }) => {
  await openFor(page, 'Exportar Mermaid bloques');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar Mermaid bloques', exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('diagrama.block.mmd');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const c of stream) chunks.push(c as Buffer);
  const block = Buffer.concat(chunks).toString('utf8');
  expect(block.split('\n')[0]).toBe('block-beta');
  expect(block).toMatch(/^ {2}columns \d+$/m);
  expect(block).toMatch(/\w+\["[^"]+"\]/); // a labelled block
  expect(block).toContain(' --> ');           // an arrow (labelled or plain)
});

test('Aristas de retroalimentación highlights the cycle-breaking edges (none on the acyclic sample)', async ({ page }) => {
  // The default sample is acyclic.
  await openFor(page, 'Aristas de retroalimentación');
  await page.getByRole('button', { name: 'Aristas de retroalimentación' }).click();
  await expect(page.locator('#toast')).toContainText(/ya es acíclico/);
  // Import a 3-node cycle and detect the feedback edge.
  page.once('dialog', d => d.accept('a,b\nb,c\nc,a'));
  await openFor(page, 'Importar CSV'); await page.getByRole('button', { name: 'Importar CSV' }).click();
  await expect(page.locator('.cd-node')).toHaveCount(3);
  await page.keyboard.press('Escape');
  await openFor(page, 'Aristas de retroalimentación');
  await page.getByRole('button', { name: 'Aristas de retroalimentación' }).click();
  await expect(page.locator('#toast')).toContainText(/Aristas de retroalimentación: 1/);
  await expect(page.locator('.cd-edge.is-highlighted')).toHaveCount(1);
});

test('Dominadores highlights the unavoidable steps to reach the selected node', async ({ page }) => {
  // Import a diamond where t is reachable only through m: s->a->m, s->b->m, m->t.
  page.once('dialog', d => d.accept('s,a\ns,b\na,m\nb,m\nm,t'));
  await openFor(page, 'Importar CSV'); await page.getByRole('button', { name: 'Importar CSV' }).click();
  await expect(page.locator('.cd-node')).toHaveCount(5);
  await page.keyboard.press('Escape');
  await node(page, 't').locator('.cd-node-body').click();
  await openFor(page, 'Dominadores');
  await page.getByRole('button', { name: 'Dominadores', exact: true }).click();
  await expect(page.locator('#toast')).toContainText(/Dominadores: \d+ paso/);
  // s, m and t are all unavoidable to reach t (a/b are not) -> 3 highlighted nodes.
  await expect(page.locator('.cd-node.is-highlighted')).toHaveCount(3);
});

test('Condensar ciclos collapses a strongly-connected cycle into a single node (DAG)', async ({ page }) => {
  // Import a 3-node cycle plus an exit: a->b->c->a, c->d.
  page.once('dialog', d => d.accept('a,b\nb,c\nc,a\nc,d'));
  await openFor(page, 'Importar CSV'); await page.getByRole('button', { name: 'Importar CSV' }).click();
  await expect(page.locator('.cd-node')).toHaveCount(4);
  await page.keyboard.press('Escape');
  await openFor(page, 'Condensar ciclos');
  await page.getByRole('button', { name: 'Condensar ciclos' }).click();
  await expect(page.locator('#toast')).toContainText(/Ciclos condensados: 2/);
  await expect(page.locator('.cd-node')).toHaveCount(2); // {a,b,c} -> 1 node, plus d
});

test('Núcleo denso highlights the max k-core (a triangle has core 2)', async ({ page }) => {
  // Default sample is a tree -> no dense core.
  await openFor(page, 'Núcleo denso');
  await page.getByRole('button', { name: 'Núcleo denso' }).click();
  await expect(page.locator('#toast')).toContainText(/Sin núcleo denso/);
  // Import a triangle (undirected core 2) and detect it.
  page.once('dialog', d => d.accept('a,b\nb,c\nc,a'));
  await openFor(page, 'Importar CSV'); await page.getByRole('button', { name: 'Importar CSV' }).click();
  await expect(page.locator('.cd-node')).toHaveCount(3);
  await page.keyboard.press('Escape');
  await openFor(page, 'Núcleo denso');
  await page.getByRole('button', { name: 'Núcleo denso' }).click();
  await expect(page.locator('#toast')).toContainText(/Núcleo denso: 3 nodo\(s\) con core 2/);
  await expect(page.locator('.cd-node.is-highlighted')).toHaveCount(3);
});

test('Núcleo robusto highlights the largest 2-edge-connected block', async ({ page }) => {
  // A triangle a-b-c plus a bridge c->d: only the triangle survives any single cut.
  page.once('dialog', d => d.accept('a,b\nb,c\nc,a\nc,d'));
  await openFor(page, 'Importar CSV'); await page.getByRole('button', { name: 'Importar CSV' }).click();
  await expect(page.locator('.cd-node')).toHaveCount(4);
  await page.keyboard.press('Escape');
  await openFor(page, 'Núcleo robusto');
  await page.getByRole('button', { name: 'Núcleo robusto', exact: true }).click();
  await expect(page.locator('#toast')).toContainText(/Núcleo robusto: 3 nodo\(s\)/);
  await expect(page.locator('.cd-node.is-highlighted')).toHaveCount(3); // the triangle, not the pendant
});

test('exporting nomnoml downloads a .nomnoml file that re-imports to the same structure', async ({ page }) => {
  await openFor(page, 'Exportar nomnoml');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar nomnoml' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('diagrama.nomnoml');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const c of stream) chunks.push(c as Buffer);
  const noml = Buffer.concat(chunks).toString('utf8');
  expect(noml).toMatch(/\[[^\]]+\].*->.*\[[^\]]+\]/);
  expect(noml).toContain('AuthService');
  page.once('dialog', d => d.accept(noml));
  await openFor(page, 'Importar nomnoml'); await page.getByRole('button', { name: 'Importar nomnoml' }).click();
  await expect(page.locator('.cd-node')).toHaveCount(7);
  await expect(page.locator('.cd-edge')).toHaveCount(6);
});

test('Propiedades del grafo reports DAG/tree/bipartite/connected/density in a toast', async ({ page }) => {
  await openFor(page, 'Propiedades del grafo');
  await page.getByRole('button', { name: 'Propiedades del grafo' }).click();
  const toast = page.locator('#toast');
  await expect(toast).toBeVisible();
  await expect(toast).toContainText(/DAG (sí|no)/);
  await expect(toast).toContainText(/bipartito (sí|no)/);
  await expect(toast).toContainText(/densidad [\d.]+/);
});

test('exporting TGF downloads a .tgf file that re-imports to the same structure', async ({ page }) => {
  await openFor(page, 'Exportar TGF');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar TGF' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('diagrama.tgf');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const c of stream) chunks.push(c as Buffer);
  const tgf = Buffer.concat(chunks).toString('utf8');
  expect(tgf).toContain('#');
  expect(tgf).toContain('AuthService');
  page.once('dialog', d => d.accept(tgf));
  await openFor(page, 'Importar TGF'); await page.getByRole('button', { name: 'Importar TGF' }).click();
  await expect(page.locator('.cd-node')).toHaveCount(7);
  await expect(page.locator('.cd-edge')).toHaveCount(6);
});

test('exporting the role quadrant downloads a Mermaid quadrantChart', async ({ page }) => {
  await openFor(page, 'Exportar cuadrante');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar cuadrante', exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('diagrama.cuadrante.mmd');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const c of stream) chunks.push(c as Buffer);
  const q = Buffer.concat(chunks).toString('utf8');
  expect(q.split('\n')[0]).toBe('quadrantChart');
  expect(q).toContain('quadrant-1 Conector');
  expect(q).toMatch(/": \[[\d.]+, [\d.]+\]/); // at least one placed node
});

test('exporting Pie downloads a Mermaid pie of the node-type composition', async ({ page }) => {
  await openFor(page, 'Exportar Pie');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar Pie', exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('diagrama.pie.mmd');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const c of stream) chunks.push(c as Buffer);
  const pie = Buffer.concat(chunks).toString('utf8');
  expect(pie.split('\n')[0]).toBe('pie title Composición');
  expect(pie).toMatch(/"\w+" : \d+/); // at least one type slice with a count
});

test('exporting Sankey downloads a Mermaid sankey-beta with a weighted link per edge', async ({ page }) => {
  await openFor(page, 'Exportar Sankey');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar Sankey', exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('diagrama.sankey.mmd');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const c of stream) chunks.push(c as Buffer);
  const sankey = Buffer.concat(chunks).toString('utf8');
  expect(sankey.split('\n')[0]).toBe('sankey-beta');
  const rows = sankey.trim().split('\n').filter(l => l.includes(','));
  expect(rows.length).toBe(6); // the architecture sample has 6 edges
  expect(rows.every(r => /,\d+$/.test(r))).toBe(true); // every link carries a numeric weight
});

test('exporting a timeline downloads a Mermaid timeline with step sections', async ({ page }) => {
  await openFor(page, 'Exportar línea de tiempo');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar línea de tiempo', exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('diagrama.timeline.mmd');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const c of stream) chunks.push(c as Buffer);
  const tl = Buffer.concat(chunks).toString('utf8');
  expect(tl.split('\n')[0]).toBe('timeline');
  expect(tl).toMatch(/\n  section /); // at least one temporal step (Paso N or Ciclo)
});

test('exporting positioned DOT downloads a Graphviz file with pinned pos attributes', async ({ page }) => {
  await openFor(page, 'DOT posicionado');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'DOT posicionado', exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('diagrama.posicionado.dot');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const c of stream) chunks.push(c as Buffer);
  const dot = Buffer.concat(chunks).toString('utf8');
  expect(dot.startsWith('digraph {')).toBe(true);
  expect(dot).toMatch(/pos="-?\d+,-?\d+!"/); // pinned position
  expect(dot).toContain('fixedsize=true');
});

test('exporting the schedule CSV downloads CPM rows with a header', async ({ page }) => {
  await openFor(page, 'Exportar cronograma CSV');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar cronograma CSV', exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('diagrama.cronograma.csv');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const c of stream) chunks.push(c as Buffer);
  const csv = Buffer.concat(chunks).toString('utf8');
  expect(csv.split('\n')[0]).toBe('id,title,type,earliestStart,earliestFinish,latestStart,latestFinish,slack,critical');
  expect(csv.trim().split('\n').length).toBeGreaterThan(1); // header + at least one node row
});

test('exporting Gantt downloads a Mermaid gantt scheduled by CPM', async ({ page }) => {
  await page.getByLabel('Ejemplo', { exact: true }).selectOption('decisions'); // a DAG flow
  await openFor(page, 'Exportar Gantt');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar Gantt', exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('diagrama.gantt.mmd');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const c of stream) chunks.push(c as Buffer);
  const gantt = Buffer.concat(chunks).toString('utf8');
  expect(gantt.split('\n')[0]).toBe('gantt');
  expect(gantt).toContain('dateFormat X');
  expect(gantt).toMatch(/:crit, start,/); // the start node is on the critical path
});

test('exporting BPMN downloads a bpmn.io-ready file that re-imports to the same structure', async ({ page }) => {
  await openFor(page, 'Exportar BPMN');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar BPMN', exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('diagrama.bpmn');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const c of stream) chunks.push(c as Buffer);
  const bpmn = Buffer.concat(chunks).toString('utf8');
  expect(bpmn).toContain('<bpmn:definitions');
  expect(bpmn).toContain('<bpmndi:BPMNShape'); // DI so bpmn.io can render it
  page.once('dialog', d => d.accept(bpmn));
  await openFor(page, 'Importar BPMN'); await page.getByRole('button', { name: 'Importar BPMN', exact: true }).click();
  await expect(page.locator('.cd-node')).toHaveCount(7);
  await expect(page.locator('.cd-edge')).toHaveCount(6);
});

test('exporting OPML downloads an outline that re-imports to the same structure', async ({ page }) => {
  await openFor(page, 'Exportar OPML');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar OPML', exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('diagrama.opml');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const c of stream) chunks.push(c as Buffer);
  const opml = Buffer.concat(chunks).toString('utf8');
  expect(opml).toContain('<opml version="2.0">');
  expect(opml).toContain('<outline text=');
  page.once('dialog', d => d.accept(opml));
  await openFor(page, 'Importar OPML'); await page.getByRole('button', { name: 'Importar OPML', exact: true }).click();
  await expect(page.locator('.cd-node')).toHaveCount(7);
  await expect(page.getByRole('heading', { name: 'Jerarquía' })).toBeVisible();
  await expect(page.locator('#flow-diagnostics')).toBeHidden();
  expect((await savedDocument(page)).profile).toBe('hierarchy');
});

test('exporting hierarchy JSON downloads a d3.hierarchy tree', async ({ page }) => {
  await openFor(page, 'Exportar jerarquía');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar jerarquía', exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('diagrama.hierarchy.json');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const c of stream) chunks.push(c as Buffer);
  const tree = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  expect(typeof tree.name).toBe('string');
  expect(Array.isArray(tree.children)).toBe(true); // nested structure for d3.hierarchy
  expect(Buffer.concat(chunks).includes(Buffer.from('AuthService'))).toBe(true);
});

test('exporting graphology downloads a Sigma.js graph that re-imports to the same structure', async ({ page }) => {
  await openFor(page, 'Exportar graphology');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar graphology', exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('diagrama.graphology.json');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const c of stream) chunks.push(c as Buffer);
  const text = Buffer.concat(chunks).toString('utf8');
  const g = JSON.parse(text);
  expect(Array.isArray(g.nodes) && typeof g.nodes[0].key === 'string').toBe(true); // graphology shape
  expect(text).toContain('AuthService');
  page.once('dialog', d => d.accept(text));
  await openFor(page, 'Importar graphology'); await page.getByRole('button', { name: 'Importar graphology', exact: true }).click();
  await expect(page.locator('.cd-node')).toHaveCount(7);
  await expect(page.locator('.cd-edge')).toHaveCount(6);
});

test('exporting the report page downloads a self-contained HTML one-pager', async ({ page }) => {
  await openFor(page, 'Exportar página de informe');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar página de informe', exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('diagrama.informe.html');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const c of stream) chunks.push(c as Buffer);
  const html = Buffer.concat(chunks).toString('utf8');
  expect(html.startsWith('<!doctype html>')).toBe(true);
  expect(html).toContain('<h2>Métricas</h2>');
  expect(html).toContain('<svg'); // embedded stats card
  expect(/<script/i.test(html)).toBe(false); // no scripts
});

test('exporting the stats card downloads an SVG infographic of the metrics', async ({ page }) => {
  await openFor(page, 'Exportar tarjeta de métricas');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar tarjeta de métricas', exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('diagrama.metricas.svg');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const c of stream) chunks.push(c as Buffer);
  const svg = Buffer.concat(chunks).toString('utf8');
  expect(svg.startsWith('<svg')).toBe(true);
  expect(svg).toContain('Nodos');
  expect(svg).toContain('¿Cíclico?');
});

test('exporting the reachability matrix downloads a transitive-closure CSV', async ({ page }) => {
  await openFor(page, 'Matriz de alcance');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Matriz de alcance', exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('diagrama.alcance.csv');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const c of stream) chunks.push(c as Buffer);
  const csv = Buffer.concat(chunks).toString('utf8');
  expect(csv.split('\n')[0].startsWith('from\\to,')).toBe(true);
  expect(/^[\w-]+(,[01])+$/m.test(csv.trim().split('\n')[1])).toBe(true); // a 1/0 reachability row
});

test('exporting styled Mermaid downloads a flowchart with classDef styling', async ({ page }) => {
  await openFor(page, 'Exportar Mermaid con estilo');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar Mermaid con estilo', exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('diagrama.estilo.mmd');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const c of stream) chunks.push(c as Buffer);
  const mmd = Buffer.concat(chunks).toString('utf8');
  expect(mmd.startsWith('flowchart')).toBe(true);
  expect(mmd).toMatch(/classDef \w+ fill:#/); // per-type styling
  expect(mmd).toMatch(/\n\s*class \w/);       // class assignment line
});

test('exporting a treemap downloads a nested-rectangle SVG', async ({ page }) => {
  await openFor(page, 'Exportar treemap');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar treemap', exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('diagrama.treemap.svg');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const c of stream) chunks.push(c as Buffer);
  const svg = Buffer.concat(chunks).toString('utf8');
  expect(svg.startsWith('<svg')).toBe(true);
  expect((svg.match(/<rect /g) ?? []).length).toBeGreaterThan(3); // background + one rect per node
  expect(svg).toMatch(/<text[^>]*>\w/); // at least one node label
});

test('exporting the matrix SVG downloads an adjacency grid', async ({ page }) => {
  await openFor(page, 'Matriz SVG');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Matriz SVG', exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('diagrama.matriz.svg');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const c of stream) chunks.push(c as Buffer);
  const svg = Buffer.concat(chunks).toString('utf8');
  expect(svg.startsWith('<svg')).toBe(true);
  expect((svg.match(/<line /g) ?? []).length).toBeGreaterThan(0); // grid lines
  expect((svg.match(/fill="#2563eb"/g) ?? []).length).toBe(6); // one filled cell per edge (arch sample has 6)
});

test('exporting an arc diagram downloads a baseline-with-arcs SVG', async ({ page }) => {
  await openFor(page, 'Exportar arcos');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar arcos', exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('diagrama.arcos.svg');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const c of stream) chunks.push(c as Buffer);
  const svg = Buffer.concat(chunks).toString('utf8');
  expect(svg.startsWith('<svg')).toBe(true);
  expect((svg.match(/<circle /g) ?? []).length).toBe(7); // one dot per node (arch sample)
  expect((svg.match(/<path d="M [\d.]+ [\d.]+ Q /g) ?? []).length).toBe(6); // one arc per edge
});

test('exporting a chord diagram downloads a radial SVG with a chord per edge', async ({ page }) => {
  await openFor(page, 'Exportar cuerdas');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar cuerdas', exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('diagrama.cuerdas.svg');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const c of stream) chunks.push(c as Buffer);
  const svg = Buffer.concat(chunks).toString('utf8');
  expect(svg.startsWith('<svg')).toBe(true);
  expect(svg.includes('aria-label="Diagrama de cuerdas"')).toBe(true);
  expect((svg.match(/<circle /g) ?? []).length).toBe(7); // one dot per node (arch sample)
  expect((svg.match(/<path d="M [\d.]+ [\d.]+ Q /g) ?? []).length).toBe(6); // one chord per edge
});

test('exporting a sunburst downloads a radial hierarchy SVG with arc sectors', async ({ page }) => {
  await openFor(page, 'Exportar sunburst');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar sunburst', exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('diagrama.sunburst.svg');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const c of stream) chunks.push(c as Buffer);
  const svg = Buffer.concat(chunks).toString('utf8');
  expect(svg.startsWith('<svg')).toBe(true);
  expect(svg.includes('aria-label="Sunburst"')).toBe(true);
  expect(svg).toMatch(/A [\d.]+ [\d.]+ 0 [01] [01] /); // at least one annular sector arc
});

test('exporting an icicle downloads a layered hierarchy SVG', async ({ page }) => {
  await openFor(page, 'Exportar icicle');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar icicle', exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('diagrama.icicle.svg');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const c of stream) chunks.push(c as Buffer);
  const svg = Buffer.concat(chunks).toString('utf8');
  expect(svg.startsWith('<svg')).toBe(true);
  expect(svg.includes('aria-label="Icicle"')).toBe(true);
  expect((svg.match(/<rect /g) ?? []).length).toBeGreaterThan(1); // background + node bands
});

test('exporting a Sankey SVG downloads a layered flow with bars and ribbons', async ({ page }) => {
  await openFor(page, 'Exportar Sankey SVG');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar Sankey SVG', exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('diagrama.sankey.svg');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const c of stream) chunks.push(c as Buffer);
  const svg = Buffer.concat(chunks).toString('utf8');
  expect(svg.startsWith('<svg')).toBe(true);
  expect(svg.includes('aria-label="Diagrama Sankey"')).toBe(true);
  expect((svg.match(/<rect x=/g) ?? []).length).toBe(7); // one bar per node (arch sample)
  expect((svg.match(/<path d="M [\d.]+ [\d.]+ C /g) ?? []).length).toBe(6); // one ribbon per edge
});

test('exporting JGF downloads a file that re-imports to the same structure', async ({ page }) => {
  await openFor(page, 'Exportar JGF');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar JGF' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('diagrama.jgf.json');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const c of stream) chunks.push(c as Buffer);
  const jgf = Buffer.concat(chunks).toString('utf8');
  expect(jgf).toContain('"graph"');
  expect(jgf).toContain('AuthService');
  page.once('dialog', d => d.accept(jgf));
  await openFor(page, 'Importar JGF'); await page.getByRole('button', { name: 'Importar JGF' }).click();
  await expect(page.locator('.cd-node')).toHaveCount(7);
  await expect(page.locator('.cd-edge')).toHaveCount(6);
});

test('exporting ELK JSON downloads a file that re-imports to the same structure', async ({ page }) => {
  await openFor(page, 'Exportar ELK');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar ELK' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('diagrama.elk.json');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const c of stream) chunks.push(c as Buffer);
  const elk = Buffer.concat(chunks).toString('utf8');
  expect(elk).toContain('"children"');
  expect(elk).toContain('"sources"');
  page.once('dialog', d => d.accept(elk));
  await openFor(page, 'Importar ELK'); await page.getByRole('button', { name: 'Importar ELK' }).click();
  await expect(page.locator('.cd-node')).toHaveCount(7);
  await expect(page.locator('.cd-edge')).toHaveCount(6);
});

test('exporting DGML downloads a .dgml file that re-imports to the same structure', async ({ page }) => {
  await openFor(page, 'Exportar DGML');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar DGML' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('diagrama.dgml');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const c of stream) chunks.push(c as Buffer);
  const dgml = Buffer.concat(chunks).toString('utf8');
  expect(dgml).toContain('<DirectedGraph');
  expect(dgml).toContain('AuthService');
  page.once('dialog', d => d.accept(dgml));
  await openFor(page, 'Importar DGML'); await page.getByRole('button', { name: 'Importar DGML' }).click();
  await expect(page.locator('.cd-node')).toHaveCount(7);
  await expect(page.locator('.cd-edge')).toHaveCount(6);
});

test('Copiar enlace mermaid.live writes an /edit#pako: URL to the clipboard', async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __clip?: string }).__clip = '';
    const w = window as unknown as { __clip: string };
    try { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: (t: string) => { w.__clip = t; return Promise.resolve(); } } }); } catch { /* read-only */ }
  });
  await page.goto('/');
  await expect(page.locator('.cd-node').first()).toBeVisible();
  await openFor(page, 'Editor mermaid.live');
  await page.getByRole('button', { name: 'Editor mermaid.live' }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __clip: string }).__clip)).not.toBe('');
  const clip = await page.evaluate(() => (window as unknown as { __clip: string }).__clip);
  expect(clip).toMatch(/^https:\/\/mermaid\.live\/edit#pako:[A-Za-z0-9\-_]+$/);
});

test('Cercanía highlights the most central nodes by closeness', async ({ page }) => {
  await expect(page.locator('.cd-node')).toHaveCount(7);
  await openFor(page, 'Cercanía');
  await page.getByRole('button', { name: 'Cercanía', exact: true }).click();
  await expect(page.locator('#toast')).toContainText(/Cercanía: \d+ nodo/);
  await expect(page.locator('.cd-node.is-highlighted').first()).toBeVisible();
});

test('Modularidad reports the community partition quality', async ({ page }) => {
  await openFor(page, 'Modularidad');
  await page.getByRole('button', { name: 'Modularidad', exact: true }).click();
  await expect(page.locator('#toast')).toContainText(/Modularidad: -?[\d.]+ en \d+ comunidad/);
});

test('Huella shows a stable 16-hex structural fingerprint', async ({ page }) => {
  await openFor(page, 'Huella');
  await page.getByRole('button', { name: 'Huella', exact: true }).click();
  await expect(page.locator('#toast')).toContainText(/Huella estructural: [0-9a-f]{16}/);
});

test('Coeficientes reports the graph reciprocity and transitivity', async ({ page }) => {
  await openFor(page, 'Coeficientes');
  await page.getByRole('button', { name: 'Coeficientes', exact: true }).click();
  await expect(page.locator('#toast')).toContainText(/Coeficientes: reciprocidad [\d.]+, transitividad [\d.]+, asortatividad -?[\d.]+\./);
});

test('Centralidad armónica highlights the best-connected nodes', async ({ page }) => {
  await expect(page.locator('.cd-node')).toHaveCount(7);
  await openFor(page, 'Centralidad armónica');
  await page.getByRole('button', { name: 'Centralidad armónica', exact: true }).click();
  await expect(page.locator('#toast')).toContainText(/Centralidad armónica: \d+ nodo/);
  await expect(page.locator('.cd-editor')).toHaveClass(/has-highlight/);
  await expect(page.locator('.cd-node.is-highlighted').first()).toBeVisible();
});

test('Centro del grafo highlights the min-eccentricity center node(s)', async ({ page }) => {
  await expect(page.locator('.cd-node')).toHaveCount(7);
  await openFor(page, 'Centro del grafo');
  await page.getByRole('button', { name: 'Centro del grafo' }).click();
  await expect(page.locator('#toast')).toContainText(/Centro del grafo: \d+ nodo\(s\), radio \d+, diámetro \d+/);
  await expect(page.locator('.cd-node.is-highlighted').first()).toBeVisible();
});

test('exporting vis-network downloads JSON that re-imports to the same structure', async ({ page }) => {
  await openFor(page, 'Exportar vis-network');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar vis-network' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('diagrama.visjs.json');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const c of stream) chunks.push(c as Buffer);
  const vis = Buffer.concat(chunks).toString('utf8');
  expect(vis).toContain('"from"');
  expect(vis).toContain('AuthService');
  page.once('dialog', d => d.accept(vis));
  await openFor(page, 'Importar vis-network'); await page.getByRole('button', { name: 'Importar vis-network' }).click();
  await expect(page.locator('.cd-node')).toHaveCount(7);
  await expect(page.locator('.cd-edge')).toHaveCount(6);
});

test('exporting node-link JSON downloads a graph that re-imports to the same structure', async ({ page }) => {
  await openFor(page, 'Exportar node-link');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar node-link' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('diagrama.nodelink.json');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const c of stream) chunks.push(c as Buffer);
  const nl = Buffer.concat(chunks).toString('utf8');
  expect(nl).toContain('"links"');
  expect(nl).toContain('AuthService');
  page.once('dialog', d => d.accept(nl));
  await openFor(page, 'Importar node-link'); await page.getByRole('button', { name: 'Importar node-link' }).click();
  await expect(page.locator('.cd-node')).toHaveCount(7);
  await expect(page.locator('.cd-edge')).toHaveCount(6);
});

test('Contraer cadenas removes pass-through nodes, leaving the branch/merge skeleton', async ({ page }) => {
  // Linear chain a->b->c->d->e: b,c,d are pass-through.
  page.once('dialog', d => d.accept('a,b\nb,c\nc,d\nd,e'));
  await openFor(page, 'Importar CSV'); await page.getByRole('button', { name: 'Importar CSV' }).click();
  await expect(page.locator('.cd-node')).toHaveCount(5);
  await page.keyboard.press('Escape');
  await openFor(page, 'Contraer cadenas');
  await page.getByRole('button', { name: 'Contraer cadenas' }).click();
  await expect(page.locator('#toast')).toContainText(/Cadenas contraídas: 2/);
  await expect(page.locator('.cd-node')).toHaveCount(2); // only a and e remain
});

test('Entradas y salidas reports sources/sinks/isolated counts in a toast', async ({ page }) => {
  await openFor(page, 'Entradas y salidas');
  await page.getByRole('button', { name: 'Entradas y salidas' }).click();
  const toast = page.locator('#toast');
  await expect(toast).toBeVisible();
  await expect(toast).toContainText(/Entradas \d+, salidas \d+, aislados \d+/);
  await expect(page.locator('.cd-node.is-highlighted').first()).toBeVisible();
});

test('Reflejar horizontal mirrors the diagram without changing the graph', async ({ page }) => {
  await expect(page.locator('.cd-node')).toHaveCount(7);
  const before = await savedDocument(page);
  await openFor(page, 'Reflejar horizontal');
  await page.getByRole('button', { name: 'Reflejar horizontal' }).click();
  await expect(page.locator('#toast')).toContainText(/reflejado horizontalmente/);
  await expect(page.locator('.cd-node')).toHaveCount(7); // same graph
  await expect(page.locator('.cd-edge')).toHaveCount(6);
  const after = await savedDocument(page);
  expect(after.graph).toEqual(before.graph); // semantics unchanged
  // The layout x-coordinates are mirrored, so node positions differ.
  expect(JSON.stringify(after.layout.nodes)).not.toBe(JSON.stringify(before.layout.nodes));
  // Left-most and right-most nodes swap sides.
  const xs = (d: typeof before) => Object.values(d.layout.nodes).map(n => (n as { x: number }).x);
  expect(Math.max(...xs(after))).toBeCloseTo(Math.max(...xs(before)), -1);
});

test('Rotar 90 grados reorients the diagram without changing the graph', async ({ page }) => {
  await expect(page.locator('.cd-node')).toHaveCount(7);
  const before = await savedDocument(page);
  await openFor(page, 'Rotar 90 grados');
  await page.getByRole('button', { name: 'Rotar 90 grados' }).click();
  await expect(page.locator('#toast')).toContainText(/rotado 90/);
  await expect(page.locator('.cd-node')).toHaveCount(7);
  await expect(page.locator('.cd-edge')).toHaveCount(6);
  const after = await savedDocument(page);
  expect(after.graph).toEqual(before.graph); // semantics unchanged
  expect(JSON.stringify(after.layout.nodes)).not.toBe(JSON.stringify(before.layout.nodes)); // positions changed
});

test('Espaciar nodos increases spacing without changing the graph', async ({ page }) => {
  await expect(page.locator('.cd-node')).toHaveCount(7);
  const before = await savedDocument(page);
  const bbox = (d: typeof before) => { const bs = Object.values(d.layout.nodes) as { x: number; width: number }[]; return Math.max(...bs.map(b => b.x + b.width)) - Math.min(...bs.map(b => b.x)); };
  await openFor(page, 'Espaciar nodos');
  await page.getByRole('button', { name: 'Espaciar nodos' }).click();
  await expect(page.locator('#toast')).toContainText(/espaciados/);
  await expect(page.locator('.cd-node')).toHaveCount(7);
  const after = await savedDocument(page);
  expect(after.graph).toEqual(before.graph);
  expect(bbox(after)).toBeGreaterThan(bbox(before)); // wider spread
});

test('Generar cuadrícula generates a 4×3 grid (12 nodes)', async ({ page }) => {
  await openFor(page, 'Generar cuadrícula');
  await page.getByRole('button', { name: 'Generar cuadrícula' }).click();
  await expect(page.locator('#toast')).toContainText(/Cuadrícula 4×3 generada/);
  await expect(page.locator('.cd-node')).toHaveCount(12); // 4*3
  await expect(page.locator('.cd-edge')).toHaveCount(17); // right 3*3=9 + down 4*2=8
});

test('Layout mapa mental re-lays the diagram with branches on both sides', async ({ page }) => {
  await expect(page.locator('.cd-node')).toHaveCount(7);
  await openFor(page, 'Layout mapa mental');
  await page.getByRole('button', { name: 'Layout mapa mental' }).click();
  await expect(page.locator('#toast')).toContainText(/mapa mental/);
  await expect(page.locator('.cd-node')).toHaveCount(7); // same graph, re-laid
  await expect(page.locator('.cd-edge')).toHaveCount(6);
});

test('Diámetro highlights the longest shortest-path route', async ({ page }) => {
  await openFor(page, 'Diámetro');
  await page.getByRole('button', { name: 'Diámetro', exact: true }).click();
  await expect(page.locator('#toast')).toContainText(/Diámetro: ruta de \d+ nodos/);
  await expect(page.locator('.cd-node.is-highlighted').first()).toBeVisible();
});

test('exporting a category SVG colours nodes by group', async ({ page }) => {
  await openFor(page, 'SVG por categoría');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'SVG por categoría' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('diagrama.categorias.svg');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const c of stream) chunks.push(c as Buffer);
  const svg = Buffer.concat(chunks).toString('utf8');
  expect(svg).toContain('<svg ');
  // At least two distinct pastel category fills present.
  const fills = new Set([...svg.matchAll(/fill="(#[0-9a-f]{6})"/gi)].map(m => m[1].toLowerCase()));
  expect(fills.size).toBeGreaterThanOrEqual(2);
});

test('Fusionar duplicados reports no change on the unique-title sample (smoke)', async ({ page }) => {
  await expect(page.locator('.cd-node')).toHaveCount(7); // sample has unique titles
  await openFor(page, 'Fusionar duplicados');
  await page.getByRole('button', { name: 'Fusionar duplicados' }).click();
  await expect(page.locator('#toast')).toContainText(/Sin títulos duplicados/);
  await expect(page.locator('.cd-node')).toHaveCount(7); // unchanged
});
