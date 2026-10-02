# Kairo

> Documentación: [plan por función](docs/PLAN_KAIRO.md), [registro de capacidades](docs/FEATURES.md) y [notas de la versión 0.1.0](docs/RELEASE_NOTES_0.1.0.md). El documento actual es v2, con importación de v1, formas, tags y relaciones.

Librería de diagramas pequeña, sin framework, con un plugin nativo opcional y un ejemplo de escritorio en **Tauri 2**. TypeScript + SVG en el frontend; Rust únicamente para guardar y recuperar documentos.

## Ejecutar el ejemplo

Requisitos: Node 22.12+ o 24+, Rust estable y los [prerrequisitos de Tauri](https://v2.tauri.app/start/prerequisites/) de tu sistema. En macOS se necesitan las Command Line Tools de Xcode.

Desde la raíz:

```sh
npm ci
npm run dev:tauri
```

También puedes probar el mismo frontend en el navegador:

```sh
npm run dev
# http://127.0.0.1:1420
```

El ejemplo abre con el sistema de acceso y permite explorar once ejemplos desde **Explorar ejemplos**: catálogo de formas, decisiones, Markdown, formas/conexiones, arquitectura, grupos, carriles, CI/CD, microservicios, estados y 100 nodos. **Texto / vista previa** ofrece 18 formatos, validación, vista SVG, animación opcional y exportación SVG editable/PNG. **Probar Kairo** reúne reglas de conexión, dirección del layout y reproducción por pasos. La biblioteca admite búsqueda, filtros y arrastrar piezas; el inspector edita dimensiones, grupos, carriles, etiquetas, tags, puertos y marcadores. Cargar desde la galería o aplicar/importar texto es reversible con Deshacer. En Tauri, **Guardar / Abrir** usa el plugin Rust; en el navegador, usa `localStorage`. El frontend detecta el entorno explícitamente y no oculta errores de IPC mediante un fallback.

La galería y el taller pertenecen al ejemplo; no aumentan el núcleo del paquete. Los controles que modifican el documento quedan deshabilitados en modo solo lectura. Las condiciones son texto y el recorrido visual no ejecuta lógica de negocio.

## Formas

**Biblioteca → Formas** ofrece doce siluetas con miniaturas, búsqueda y arrastre al lienzo: rectángulo, rombo, elipse, cápsula, cilindro, documento, paralelogramo, hexágono, trapecio, triángulo, nota y subproceso. **Propiedades → Forma** cambia la silueta de cualquier nodo. **Explorar ejemplos → Catálogo de formas** permite probarlas juntas.

Las conexiones se ajustan al contorno al mover o redimensionar. JSON, SVG editable y draw.io conservan las doce formas; SVG/PNG comparten la geometría del editor. Mermaid/Markdown reconocen cilindro `[(Datos)]`, subproceso `[[Rutina]]`, hexágono `{{Preparación}}`, paralelogramo `[/Entrada/]` y trapecio `[/Manual\]`, además de las cuatro formas originales. Documento, triángulo y nota se simplifican a rectángulos al exportar a Mermaid; usa JSON o SVG editable para conservarlas. Otros formatos pueden aproximar las formas que no soportan.

```ts
editor.addNode('database', 'Usuarios', { x: 100, y: 100, shape: 'cylinder', width: 220, height: 110 });
editor.updateNodeLayout(id, { shape: 'hexagon' });
```

Los nodos Database y File nuevos nacen como cilindro y documento. Los documentos guardados mantienen su layout original. Las formas son SVG calculado, sin dependencias de ejecución adicionales.

## Markdown → diagrama

En **Explorar ejemplos → Markdown → diagrama** se abre un README editable con su vista previa. También está en **Probar Kairo → Probar Markdown → diagrama**. Cambia un título o una etiqueta dentro del bloque Mermaid y pulsa **Aplicar al lienzo**; Deshacer recupera tu diagrama anterior. Abrir el ejemplo o escribir en él no modifica el lienzo.

El archivo de ejemplo es [markdown.md](examples/tauri/src/samples/markdown.md). La API interpreta el **primer bloque cercado con `mermaid`**; los títulos y párrafos Markdown aportan documentación, no se convierten automáticamente en nodos. El parser cubre el subconjunto de Mermaid soportado por Kairo. Todo se procesa localmente, sin cargar Mermaid.js ni consultar un servicio externo.

```ts
import { createDiagram } from '@fsaldivar.dev/diagram';
import { fromMarkdown } from '@fsaldivar.dev/diagram/io';
import '@fsaldivar.dev/diagram/style.css';

// markdown es el contenido de un README con un bloque de código mermaid.
const document = fromMarkdown(markdown);
const editor = createDiagram(host, { document });
editor.fit();
```

## Las tres piezas

| Pieza | Ubicación | Función |
| --- | --- | --- |
| `@fsaldivar.dev/diagram` | `packages/diagram` | Grafo, layout, tokens y editor SVG. **Cero dependencias de ejecución.** |
| `@fsaldivar.dev/plugin` + `tauri-plugin-kairo` | `packages/plugin-diagram`, `crates/tauri-plugin-kairo` | Bindings TypeScript y plugin Tauri para persistencia local. |
| App de ejemplo | `examples/tauri` | Vite + TypeScript vanilla + Tauri 2. La interfaz de ejemplo no forma parte de la librería. |

Tauri es el contenedor de escritorio, no el framework de interfaz. Esta librería se monta sobre un elemento HTML y puede usarse desde vanilla, React, Vue o Svelte. No requiere React Flow, un runtime de iconos, un motor de layout ni Canvas/WebGL.

## Usar solo el editor

Instala el editor desde npm:

```sh
npm install @fsaldivar.dev/diagram@0.1.0
```

```ts
import { createDiagram, createDocument, darkTheme } from '@fsaldivar.dev/diagram';
import '@fsaldivar.dev/diagram/style.css';

const host = document.querySelector<HTMLElement>('#diagram')!;
// El host necesita un tamaño: por ejemplo, width: 100%; height: 600px.
const editor = createDiagram(host, {
  document: createDocument({
    nodes: [
      { id: 'login', type: 'screen', title: 'LoginView' },
      { id: 'auth', type: 'service', title: 'AuthService' },
    ],
    edges: [{ id: 'login-auth', source: 'login', target: 'auth' }],
  }),
  theme: darkTheme,
  edgeStyle: 'rounded',
  snapRadius: 24, // píxeles de pantalla, independiente del zoom
  onChange(document) { /* Actualiza tu estado o marca el documento modificado. */ },
  onSelectionChange(selection) { /* Alimenta tu inspector. */ },
});

editor.fit();
// Al desmontar el componente:
editor.destroy();
```

`destroy()` elimina el SVG, los listeners, el observador y los frames pendientes. El editor no modifica el documento original y `getDocument()` devuelve una copia.

## Añadir el plugin nativo a otra aplicación Tauri

1. Instala `@fsaldivar.dev/diagram` y `@fsaldivar.dev/plugin` desde npm.
2. Añade la dependencia Rust desde la etiqueta `v0.1.0` en el `src-tauri/Cargo.toml` de tu app:

```toml
[dependencies]
tauri-plugin-kairo = { git = "https://github.com/fsaldivar-dev/Kairo", tag = "v0.1.0" }
```

3. Registra el plugin en tu `tauri::Builder` existente:

```rust
tauri::Builder::default()
    .plugin(tauri_plugin_kairo::init())
    // .run(...) de tu aplicación
```

4. En la capability de la ventana que lo utilizará, añade `"kairo:default"` al array `permissions`. También existen `kairo:allow-save-document` y `kairo:allow-load-document` por separado.
5. Guarda/carga desde el frontend:

```ts
import { saveDocument, loadDocument, listDocuments, deleteDocument } from '@fsaldivar.dev/plugin';

await saveDocument('mi-arquitectura', editor.getDocument());
const saved = await loadDocument('mi-arquitectura');
const ids = await listDocuments(); // ['mi-arquitectura', ...]
await deleteDocument('mi-arquitectura'); // true si existía
if (saved) editor.setDocument(saved);
```

Los documentos se guardan en `app_data_dir()/diagrams/<id>.json`. Los IDs aceptan 1–80 letras ASCII, números, guiones y guiones bajos. No son rutas arbitrarias. Límite: 8 MiB por documento. Las escrituras usan reemplazo atómico con un archivo temporal en el mismo directorio, fuera del hilo de interfaz. Escrituras simultáneas al mismo ID: gana la última que termina. No hay comunicación con servidores ni IPC durante el arrastre.

## Arquitectura y documento

```text
SemanticGraph        →       DiagramLayout       →       DiagramTheme       →       SVG renderer
nodos y relaciones          posiciones/puertos           tokens del host            DOM reutilizado
```

El documento JSON v2 (el parser migra v1) contiene `graph` y `layout` por separado. El grafo guarda IDs, tipos, títulos, referencias y relaciones. El layout guarda las cajas y los puertos. Colores, curvas SVG, hover, selección y viewport no se serializan en el grafo.

- `createLayout(graph)` genera una cuadrícula inicial determinista; no es un algoritmo de auto-layout de grafos.
- `parseDocument(json)` valida IDs, extremos, tamaños, coordenadas y puertos, y descarta propiedades ajenas al esquema. Úsalo al importar archivos.
- Los paths se calculan desde nodos y puertos. `rounded` usa segmentos ortogonales con esquinas cuadráticas; `smooth` usa Bézier cúbicas. No hay routing de obstáculos.
- Un solo renderer representa todos los tipos; el icono y la etiqueta secundaria cambian por tipo. El color nunca es la única forma de distinguirlos.
- Los IDs de markers SVG son únicos por instancia: se pueden montar varios editores.

## Tema y apariencia

Usa `editor.setTheme({ ... })` o los tokens `--cd-*` sobre `.cd-editor`. Se suministran `lightTheme` y `darkTheme`. Para integrarlo con los tokens de tu aplicación:

```css
.mi-panel .cd-editor {
  --cd-node-background: var(--app-surface);
  --cd-node-text: var(--app-text);
  --cd-selected-border: var(--app-accent);
  --cd-canvas-background: var(--app-canvas);
  --cd-font-family: var(--app-font);
}
```

Si usas CSS heredado, omite `theme` al montar: los valores pasados a `setTheme` se aplican inline y tienen prioridad. Tokens tipados: `nodeBackground`, `nodeBorder`, `nodeText`, `nodeSecondaryText`, `nodeHoverBorder`, `selectedBorder`, `selectedBackground`, `edge`, `edgeSelected`, `edgeHover`, `canvasBackground`, `grid`, `iconBackground`, `icon`, `radius`, `borderWidth`, `fontFamily`.

Sin blur, glow, gradientes ni sombras por nodo. Nodos con borde fino y esquinas de 12 px; texto principal de 13 px, tipo de 11 px y referencias de 10 px visibles solo a zoom alto. Las transiciones de borde y anchors duran 120 ms y respetan `prefers-reduced-motion`.

LOD: zoom `< 0.55` muestra solo el título y oculta el grid; `0.55–1.15` muestra icono/título/tipo; `>= 1.15` añade la referencia.

## API e interacción

| API | Uso |
| --- | --- |
| `getDocument()`, `setDocument(doc)` | Leer/reemplazar el documento. Reemplazar reinicia historial y selección. |
| `addNode(type, title, layout?)` | Añadir un nodo con los defaults del tipo (`nodeDefaults`); permite sobrescribir posición, dimensiones y forma en una sola operación reversible. Devuelve su ID. |
| `updateNode(id, patch)` | Modificar título, tipo, referencia o tags. |
| `updateNodeLayout(id, patch)` | Cambiar forma, posición o tamaño con validación e historial. |
| `updateEdge(id, patch, layoutPatch?)` | Editar label, relation, condition, tags y presentación de una arista. |
| `reconnectEdge(id, endpoints)` | Mover origen/destino y puertos de una arista de forma atómica. `false` si la política lo rechaza. |
| `reverseEdge(id)` | Invertir dirección conservando datos semánticos y marcadores por rol. |
| `connectionIssue(source, target, ignoreEdge?)` | Motivo por el que una conexión sería rechazada, o `null`. |
| `setConnectionPolicy(policy)`, `getConnectionPolicy()` | Reglas de conexiones nuevas: bucles, múltiples aristas, ciclos. |
| `editText('node' \| 'edge', id)` | Abrir el editor en el sitio para título o label. |
| `connect(source, target, ports?)` | Crear una relación; devuelve ID o `null` si es inválida. |
| `onNodeRender(node, layer, layout)` *(opción de `createDiagram`)* | Dibujar contenido SVG propio en cada nodo (insignias, estado). Recibe el layout actual, también al redimensionar en vivo; los callbacks de dos argumentos siguen funcionando. |
| `select(selection)`, `getSelection()`, `removeSelected()` | Selección de nodo/conexión; borrar elimina lo seleccionado y sus conexiones. |
| `toggleNode(id)`, `selectNodes(ids)`, `getSelectedNodeIds()` | Selección múltiple de nodos (Shift-clic y marquesina). |
| `copySelection()`, `cut()`, `paste(offset?)` | Portapapeles con remapeo de IDs (`Cmd/Ctrl` + C / X / V). |
| `alignSelected(edge)`, `distributeSelected(axis)` | Alinear y distribuir la selección múltiple. |
| `duplicateSelected()` | Duplicar el nodo seleccionado (`Cmd/Ctrl+D` en el ejemplo). Devuelve el ID de la copia. |
| `parseFlowText(text, options?)` *(subpath `/io`)* | Importar texto estilo Mermaid a un documento v2 con layout por capas. |
| `toSVG(document, options?)` *(subpath `/export`)* | Exportar a un SVG autocontenido (opciones `links`, `tooltips` y `legend`). |
| `toFlowText(document, options?)` *(subpath `/io`)* | Exportar a texto estilo Mermaid (inverso de `parseFlowText`). |
| `parseStateText(text, options?)` *(subpath `/io`)* | Importar diagramas de estado de Mermaid (`stateDiagram`). |
| `toStateText(document)` *(subpath `/io`)* | Exportar a diagrama de estado de Mermaid (inverso de `parseStateText`). |
| `parseClassText(text, options?)` *(subpath `/io`)* | Importar diagramas de clases de Mermaid (`classDiagram`, UML). |
| `toClassText(document)`, `toErText(document)`, `toMermaid(document)` *(subpath `/io`)* | Exportar a Mermaid (clase/ER o el dialecto del perfil). |
| `parseErText(text, options?)` *(subpath `/io`)* | Importar diagramas ER de Mermaid (`erDiagram`). |
| `parseMindmap(text, options?)`, `toMindmap(document)` *(subpath `/io`)* | Importar/exportar mindmaps de Mermaid (jerarquía por indentación). |
| `parseMermaid(text)` *(subpath `/io`)* | Autodetectar el dialecto Mermaid (flow/state/class/ER/mindmap) y despachar. |
| `toCanvas(document)`, `fromCanvas(json)` *(subpath `/io`)* | Interoperar con JSON Canvas (Obsidian), con grupos nativos. |
| `fromCytoscape(input, options?)`, `toCytoscape(document)` *(subpath `/io`)* | Interoperar con Cytoscape.js / Cytoscape (redes), con grupos como nodos compuestos. |
| `fromJson(data, options?)` *(subpath `/io`)* | Visualizar JSON jerárquico (organigramas, árboles) como diagrama. |
| `toExcalidraw(document)`, `fromExcalidraw(scene)` *(subpath `/io`)* | Interoperar con Excalidraw (`.excalidraw`). |
| `fromCsv(text, options?)`, `toCsv(document, options?)` *(subpath `/io`)* | Interoperar con CSV/TSV: listas de aristas (`from,to,label`) o tablas de nodos (`id,name,type,tags`). |
| `fromGraphml(xml, options?)`, `toGraphml(document, options?)` *(subpath `/io`)* | Interoperar con GraphML (yEd, Gephi, Cytoscape, draw.io), con grupos como dato. |
| `fromDrawio(xml, options?)`, `toDrawio(document)` *(subpath `/io`)* | Interoperar con draw.io / diagrams.net (mxGraph XML sin comprimir), con grupos como contenedores. |
| `parsePlantuml(text, options?)`, `toPlantuml(document)` *(subpath `/io`)* | Interoperar con PlantUML (Confluence, Jira, IntelliJ, VS Code). |
| `convertText(input, from, to)` *(subpath `/io`)* | Convertir entre Mermaid/DOT/Canvas/Excalidraw/CSV/GraphML/draw.io/PlantUML/Cytoscape/Markdown/JSON (el render SVG/HTML/TikZ vive en `@fsaldivar.dev/diagram/export`). |
| `detectFormat(text)`, `importAny(text)` *(subpath `/io`)* | Autodetectar el formato de entrada e importar sin indicarlo. |
| `encodeDocument(document)`, `decodeDocument(code)` *(subpath `/io`)* | Código compacto y seguro para URL de un diagrama (enlaces para compartir). |
| `toShareLink(document, base?)`, `fromShareLink(urlOrHash)` *(subpath `/io`)* | Construir/leer un enlace `#d=<código>` (deep-linking). |
| `toMarkdown(document, options?)`, `fromMarkdown(markdown)` *(subpath `/io`)* | Markdown con bloque Mermaid renderizable y resumen (GitHub, Obsidian, Notion). |
| `organicLayout(document, options?)` *(subpath `/layout`)* | Layout orgánico dirigido por fuerzas (determinista) para grafos de red. |
| `radialLayout(document, options?)` *(subpath `/layout`)* | Layout radial en anillos concéntricos (árboles y mapas mentales). |
| `treeLayout(document, options?)` *(subpath `/layout`)* | Layout de árbol ordenado (jerarquías, sin solapes). |
| `resolveOverlaps(document, options?)` *(subpath `/layout`)* | Separar cajas de nodos solapadas (determinista), conservando posiciones cercanas. |
| `themes`, `getTheme(name)`, `prefersDark()` *(subpath `/themes`)* | Presets de tema curados (blueprint, highContrast, forest, solarized, mono, light, dark). |
| `themeFrom(accent, options?)` *(subpath `/themes`)* | Derivar un tema completo de un color de acento. |
| `templates`, `getTemplate(name)` *(subpath `/templates`)* | Documentos de inicio: emptyFlow, decision, architecture, mindmap, swimlane. |
| `describeDiagram(graph)` *(subpath `/analysis`)* | Resumen textual accesible del diagrama. |
| `diffDocuments(before, after)` *(subpath `/analysis`)* | Nodos/aristas añadidos, eliminados y cambiados entre versiones. |
| `analyzeGraph(graph)` *(subpath `/analysis`)* | Métricas: raíces, hojas, aislados, profundidad, ciclos, densidad. |
| `lintDocument(document, options?)` *(subpath `/analysis`)* | Validación + métricas en una llamada (CI). |
| `toReport(document, options?)` *(subpath `/analysis`)* | Informe Markdown de estructura y salud (resumen, nodos clave, diagnósticos). |
| `shortestPath(graph, from, to)`, `pathEdges(graph, path)` *(subpath `/analysis`)* | Ruta dirigida de menos saltos entre dos nodos y sus aristas. |
| `longestPath(graph)` *(subpath `/analysis`)* | Ruta crítica: el camino dirigido más largo de un DAG (o `null` si hay ciclo). |
| `topologicalOrder(graph)` *(subpath `/analysis`)* | Orden topológico (Kahn) o `null` si hay ciclo. |
| `stronglyConnectedComponents(graph)`, `hasCycle(graph)` *(subpath `/analysis`)* | Componentes fuertemente conexos (Tarjan iterativo) y detección de ciclos. |
| `connectedComponents(graph)` *(subpath `/analysis`)* | Componentes débilmente conexos (aristas no dirigidas); útil para auto-agrupar subgrafos. |
| `degrees(graph)`, `centralNodes(graph, count?)` *(subpath `/analysis`)* | Centralidad de grado y nodos más conectados (hubs). |
| `allPaths(graph, from, to, options?)` *(subpath `/analysis`)* | Todos los caminos simples entre dos nodos (acotado por maxPaths/maxDepth). |
| `neighbors(graph, id, options?)` *(subpath `/analysis`)* | Nodos a N saltos (focus/vecindario), por dirección. |
| `redundantEdges(graph)` *(subpath `/analysis`)* | Aristas de atajo redundantes (reducción transitiva). |
| `findOverlaps(document, options?)` *(subpath `/analysis`)* | Pares de nodos cuyas cajas se solapan (AABB, con padding opcional). |
| `countCrossings(document)` *(subpath `/analysis`)* | Número de cruces de aristas (métrica de calidad de layout). |
| `parseDotText(dot, options?)` *(subpath `/io`)* | Importar un subconjunto de DOT (Graphviz), incluidos grupos como `cluster_*`. |
| `toDotText(document, options?)` *(subpath `/io`)* | Exportar a DOT (Graphviz) con grupos como `subgraph cluster_N`; inverso de `parseDotText`. |
| `toPNG(document, options?)` *(subpath `/export`, async)* | Rasterizar a un PNG `Blob` vía canvas (navegador). |
| `toThumbnail(document, options?)` *(subpath `/export`)* | Miniatura SVG simplificada y ajustada al tamaño. |
| `toLegend(document, options?)` *(subpath `/export`)* | Leyenda SVG de los tipos de nodo presentes (icono + etiqueta). |
| `toTikz(document, options?)` *(subpath `/export`)* | Exportar a LaTeX/TikZ (papers, Overleaf). |
| `toHtml(document, options?)` *(subpath `/export`)* | Página HTML autónoma con el diagrama y pan/zoom. |
| `autoLayout(document, options?)` *(subpath `/layout`)* | Recolocar por capas (Kahn) con reducción de cruces y centrado, preservando tamaños y semántica. |
| `mergeLayout(target, source)` *(subpath `/layout`)* | Reimportar semántica conservando posiciones manuales por id. |
| `mergeDocuments(a, b, options?)` *(subpath `/layout`)* | Componer dos documentos (b a la derecha, ids remapeados). |
| `replaceDocument(document)` | Reemplazar el documento como un solo deshacer (no reinicia el historial). |
| `focusNode(id, options?)` | Centrar el viewport en un nodo y seleccionarlo. |
| `searchNodes(graph, query)` | Buscar nodos por título, tipo, referencia y tags. |
| `setNodeGroup(ids, group\|null)`, `getGroups()` | Agrupar/desagrupar nodos; el grupo se dibuja como contenedor. |
| `setGroupCollapsed(name, bool)`, `toggleGroupCollapsed(name)`, `isGroupCollapsed(name)` | Colapsar/expandir un grupo; las aristas que cruzan se reenrutan a la caja. |
| `setNodeLane(ids, lane\|null)`, `getLanes()`, `laneBands(document, orientation?)` | Carriles (swimlanes) por actor/fase. |
| `groupBounds(document, padding?)` | Cuadro envolvente derivado por grupo. |
| `undo()`, `redo()` | Hasta 50 operaciones; un arrastre equivale a una operación. |
| `fit(padding?, ids?)`, `fitSelection()`, `zoomBy(factor)`, `setViewport(viewport)`, `getViewport()` | Navegación del canvas; `fit(ids)` ajusta a un subconjunto. Zoom 25%–250%. |
| `setTool('select' \| 'pan' \| 'connect')` | Herramienta activa. |
| `setTheme(tokens)`, `setGrid(boolean)`, `setEdgeStyle(style)` | Presentación independiente de los datos. |
| `setReadOnly(bool)`, `isReadOnly()` | Modo visor: desactiva la edición; pan/zoom/selección siguen. |
| `setGridSnap(size)`, `getGridSnap()` | Alineado a rejilla al arrastrar/redimensionar (0 = off). |
| `setHighlight(ids)`, `clearHighlight()`, `getHighlight()` | Resaltar nodos/aristas (rutas, búsqueda) atenuando el resto. |
| `flowSteps(graph)`, `PathPlayer` *(subpath `/player`)* | Reproductor de rutas: anima el flujo resaltando paso a paso. |
| `createMinimap(editor, host, options?)` *(subpath `/minimap`)* | Minimapa con clic/arrastre y control plegable opcional, sin modificar el documento. |
| `destroy()` | Liberar recursos al desmontar. |

El documento puede incluir `profile` (familia de notación); el host lo traduce a una `ConnectionPolicy`. Doble clic en un nodo o conexión edita el texto en el sitio; arrastrar las asas de una conexión seleccionada reconecta sus extremos; arrastrar la asa de la esquina de un nodo seleccionado lo redimensiona; Shift-clic añade nodos a la selección y Shift + arrastre sobre el lienzo los selecciona por área; arrastrar un nodo de una selección múltiple mueve el grupo; al arrastrar un nodo aparecen guías de alineación y hace snap a bordes y centros de otros nodos; `R` invierte la conexión seleccionada en el ejemplo.

Callbacks: `onChange`, `onSelectionChange`, `onViewportChange`, `onHistoryChange`. `onChange` ocurre al confirmar una operación, no en cada frame. `canConnect(sourceNode, targetNode)` permite al host restringir conexiones. Por defecto se rechazan los bucles al mismo nodo y las relaciones duplicadas en la misma dirección.

Arrastra un nodo para moverlo; arrastra un puerto para conectar. Los puertos aparecen con hover, selección o modo conectar. El snapping tiene un radio de 24 px y destaca el destino válido. Espacio + arrastre o botón central desplaza; rueda desplaza y Cmd/Ctrl + rueda hace zoom. Escape cancela el gesto. Suprimir elimina. Flechas mueven la selección 8 unidades, o 1 con Shift. Cmd/Ctrl Z deshace y Shift Cmd/Ctrl Z rehace. El ejemplo añade V/H/C para elegir herramienta. Los shortcuts del editor solo actúan cuando este tiene el foco.

## Verificación y tamaño

```sh
npm run check
npm run build:lib # Las pruebas del CLI consumen dist
npm test
npx playwright install chromium webkit
npm run test:ui
npm run test:rust
npm run build
npm run size
npm run bench
npm run build:tauri
```

`npm run size` mide JS + CSS de la librería (sin la app de ejemplo ni Tauri) y comprueba un presupuesto de 20 KiB gzip. El historial usa snapshots completos acotados: simple y suficiente para diagramas moderados; no está diseñado para millones de nodos. El SVG reutiliza elementos y actualiza solo el nodo arrastrado y sus aristas incidentes, limitado por `requestAnimationFrame`. No hay un loop de animación inactivo.

Las pruebas UI ejecutan el frontend **compilado**, no el servidor de desarrollo. Cubren mover/deshacer/rehacer, conectar sin precisión de píxel, cancelar un gesto, borrar con aristas incidentes, guardar/reabrir, texto escapado, temas y niveles de detalle. Las capturas están en `artifacts/`.

Verificación del 2 de octubre de 2026: `check`, 856 pruebas unitarias, 7 Rust, 562 pruebas UI en Chromium/WebKit, build macOS aislado y límite de **19,99 KiB gzip** para núcleo + CSS. Los paquetes `@fsaldivar.dev/diagram` y `@fsaldivar.dev/plugin` se instalaron desde npm en un proyecto externo: pasaron TypeScript y Vite, y el editor mostró dos nodos conectados en navegador. [Las notas de la versión](docs/RELEASE_NOTES_0.1.0.md) detallan el alcance y los pendientes de integración nativa.

El crate Rust se consume desde el repositorio etiquetado; su publicación en crates.io es independiente. No hay prueba en Windows/Linux ni firma de distribución. El core admite selección múltiple, resize y layout opcional; siguen fuera de alcance colaboración en tiempo real y routing automático alrededor de obstáculos.

Kairo se distribuye bajo [BSD-3-Clause](LICENSE). El aviso de copyright conserva los créditos de [fsaldivar-dev y este repositorio](https://github.com/fsaldivar-dev/Kairo) en redistribuciones de fuente y binarios.

## React, Vue y Svelte

El Web Component `<kairo-diagram>` es la vía recomendada para cualquier framework; no necesita envoltorios específicos.

**React** — componente nativo `@fsaldivar.dev/diagram/react`:

```tsx
import { KairoDiagram } from '@fsaldivar.dev/diagram/react';
import '@fsaldivar.dev/diagram/style.css';
export const App = ({ document }) => <KairoDiagram document={document} style={{ height: 600 }} onChange={d => console.log(d)} />;
```

O con el Web Component (cualquier framework):

```tsx
import { useEffect, useRef } from 'react';
import { defineKairoElement } from '@fsaldivar.dev/diagram/element';
import '@fsaldivar.dev/diagram/style.css';
defineKairoElement();
export function Diagram({ document }) {
  const ref = useRef<HTMLElement & { document?: unknown }>(null);
  useEffect(() => { if (ref.current) ref.current.document = document; }, [document]);
  return <kairo-diagram ref={ref} style={{ width: '100%', height: 600 }} />;
}
```

**Vue 3** — componente nativo `@fsaldivar.dev/diagram/vue`:

```ts
import { KairoDiagram } from '@fsaldivar.dev/diagram/vue';
import '@fsaldivar.dev/diagram/style.css';
// <KairoDiagram :document="doc" :theme="lightTheme" @change="onChange" />
```

O con el Web Component:

```vue
<script setup>
import { onMounted, ref, watch } from 'vue';
import { defineKairoElement } from '@fsaldivar.dev/diagram/element';
import '@fsaldivar.dev/diagram/style.css';
defineKairoElement();
const host = ref(null);
const props = defineProps(['document']);
watch(() => props.document, d => { if (host.value) host.value.document = d; });
onMounted(() => { host.value.document = props.document; });
</script>
<template><kairo-diagram ref="host" style="width:100%;height:600px" /></template>
```

**Svelte** — action nativa `@fsaldivar.dev/diagram/svelte` (`use:kairo`), la vía idiomática para una librería imperativa; no necesita componente `.svelte` ni el compilador para integrarse:

```svelte
<script>
  import { kairo } from '@fsaldivar.dev/diagram/svelte';
  import '@fsaldivar.dev/diagram/style.css';
  export let document;
</script>
<div use:kairo={{ document }} style="width:100%;height:600px"></div>
```

La action acepta `{ document, theme, readOnly, onChange, onSelectionChange, onReady }`, reacciona a los cambios de parámetros vía `update` y libera el editor en `destroy`. También sigue disponible el Web Component:

```svelte
<script>
  import { defineKairoElement } from '@fsaldivar.dev/diagram/element';
  import '@fsaldivar.dev/diagram/style.css';
  export let document;
  defineKairoElement();
  let host;
  $: if (host) host.document = document;
</script>
<kairo-diagram bind:this={host} style="width:100%;height:600px" />
```

## Web Component (React, Vue, Svelte, HTML)

Un único componente funciona en cualquier framework:

```html
<link rel="stylesheet" href="kairo.global.css" />
<kairo-diagram id="d" style="width:100%;height:600px"></kairo-diagram>
<script src="kairo.global.js"></script>
<script>
  Kairo.defineKairoElement();
  document.getElementById('d').document = Kairo.createDocument({
    nodes: [{ id: 'a', type: 'service', title: 'AuthService' }], edges: [],
  });
  document.getElementById('d').addEventListener('change', e => console.log(e.detail));
</script>
```

También disponible como módulo: `import { defineKairoElement, type KairoDiagramHost } from '@fsaldivar.dev/diagram/element'`. Propiedades `document`/`editor`, método `reload()` para recargar el mismo `src`; atributos `theme`, `readonly` y `src`; eventos `change`, `selectionchange`, `documentload` (`{src, document}`) y `documenterror` (`{src, error}`). Ambos eventos de carga burbujean. Si falla HTTP o JSON, el diagrama anterior permanece visible. Cambiar `src`, asignar `document`, editar o retirar el elemento cancela la carga pendiente. `document = undefined` vacía la vista hasta que cambie `src` o se llame a `reload()`. En la rama principal, después de 0.1.0, al remontarlo conserva el documento actual y solicita la URL vigente si `src` cambió durante el desmontaje o la carga anterior quedó interrumpida; una asignación explícita a `document` tiene prioridad. Puedes probarlo en el [ejemplo embebido](examples/tauri/element.html) con `npm run dev -w @fsaldivar.dev/diagram-example` y `/element.html`.

## Uso sin bundler (standalone)

Para una página sin empaquetador, usa el build global por CDN o local:

```html
<link rel="stylesheet" href="kairo.global.css" />
<div id="host" style="width:100%;height:600px"></div>
<script src="kairo.global.js"></script>
<script>
  const doc = Kairo.createDocument({
    nodes: [{ id: 'a', type: 'service', title: 'AuthService' }],
    edges: [],
  });
  Kairo.createDiagram(document.getElementById('host'), { document: doc, theme: Kairo.lightTheme });
</script>
```

`window.Kairo` expone la API pública del núcleo. Los campos `unpkg`/`jsdelivr` del paquete apuntan a `dist/kairo.global.js`.

## Importar texto estilo Mermaid

`parseFlowText` convierte una sintaxis compacta en un documento completo, sin dependencias ni `eval`:

```ts
import { parseFlowText } from '@fsaldivar.dev/diagram/io';

const doc = parseFlowText(`flowchart TD
  A[Solicitud] --> B{¿Autorizado?}
  B -->|Sí| C(Conceder acceso)
  B -.->|No| D([Rechazar])`);
editor.setDocument(doc);
editor.fit();
```

Formas por corchete (`[]` rectángulo, `()` y `([])` cápsula, `{}` rombo/decisión, `(())` elipse), aristas `-->`, `---` y `-.->`, etiquetas `|texto|`, cabecera `flowchart`/`graph` con dirección `TB`/`LR`, y comentarios `%%`. El layout se calcula por capas (Kahn); los ciclos usan orden de declaración. Es un importador, no un lenguaje completo: no evalúa condiciones.

`parseFlowText` y `toSVG` viven en el subpath opcional `@fsaldivar.dev/diagram/io`, fuera del bundle del editor, para no cargar el núcleo a quien no los use. `toSVG` produce un SVG autocontenido con el tema embebido:

```ts
import { toSVG, toFlowText } from '@fsaldivar.dev/diagram/io';
const svg = toSVG(editor.getDocument(), { includeTags: true });
const mermaid = toFlowText(editor.getDocument()); // texto re-importable con parseFlowText
```

## Referencias

- [Configuración frontend de Tauri](https://v2.tauri.app/start/frontend/)
- [Desarrollo de plugins Tauri](https://v2.tauri.app/develop/plugins/)
- [Tauri con Vite](https://v2.tauri.app/start/frontend/vite/)


## Validación estructural de decisiones

```ts
import { validateFlow } from '@fsaldivar.dev/diagram/analysis';
const diagnostics = validateFlow(editor.getDocument().graph, {
  allowCycles: true,
  allowMultipleStarts: false,
});
```

Es una función pura, sin evaluación de condiciones ni ejecución de código. Cada diagnóstico incluye gravedad, código estable, mensaje y, cuando aplica, nodo/arista. El ejemplo recalcula los problemas tras editar y permite seleccionar el elemento afectado desde el panel. Los ciclos con salida son válidos por defecto; prohibirlos depende del perfil de la aplicación.

## Etiquetas multilínea (opcional)

```ts
import { createDiagram } from '@fsaldivar.dev/diagram';
import { wrapNodeLabels } from '@fsaldivar.dev/diagram/labels';
import { toSVG } from '@fsaldivar.dev/diagram/export';

const editor = createDiagram(container, { document, onNodeRender: wrapNodeLabels });
const svg = toSVG(editor.getDocument(), { wrapLabels: true });
```

El módulo `/labels` divide los títulos en hasta tres líneas en rectángulos, dos en formas compactas y una en triángulos, según la altura disponible. Respeta saltos explícitos y caracteres compuestos; muestra «…» si falta espacio. Conserva el título completo en el documento, el tooltip y el nombre accesible. Los nodos no cambian de tamaño automáticamente; al redimensionarlos, editar o deshacer se recalculan las líneas.

`wrapLabel(text, width, maxLines?)` y `layoutNodeLabel(node, layout)` también están disponibles como funciones puras. Editor y SVG usan una estimación conservadora del ancho a 13 px, sin cargar fuentes ni medir el DOM; una fuente personalizada puede necesitar más espacio. El módulo requiere `Intl.Segmenter` (disponible en los WebViews modernos de Tauri). Las coordenadas y líneas exportadas coinciden con el editor; el nivel de zoom no cambia la distribución del título.

Para combinarlo con insignias, llama a `wrapNodeLabels(node, layer, layout)` primero dentro de tu callback `onNodeRender` y dibuja tus elementos en `layer`. El ejemplo lo activa por defecto y añade **Explorar ejemplos → Etiquetas multilínea**, con referencias, formas y texto Unicode.

## Minimapa plegable (opcional)

```ts
import { createMinimap } from '@fsaldivar.dev/diagram/minimap';
const minimap = createMinimap(editor, host, {
  collapsible: true,
  collapsed: false,
  showLabel: 'Mostrar minimapa',
  hideLabel: 'Ocultar minimapa',
  onCollapsedChange: collapsed => { /* preferencia de vista del host */ },
});
// Llamar tras cambios del documento o viewport; mientras está plegado no reconstruye SVG.
minimap.update();
minimap.setCollapsed(true);
minimap.isCollapsed();
// Al desmontar:
minimap.destroy();
```

`collapsible` agrega un botón nativo con `aria-expanded` y `aria-controls`, utilizable con Enter y Espacio. Sin esta opción se conserva el SVG sin botón. `collapsed` y `setCollapsed` funcionan también si el host aporta su propio control; `onCollapsedChange` se invoca solo cuando cambia el estado, no al montar. Al abrir, `update()` toma el documento y viewport actuales. El plegado no cambia selección, posiciones, zoom, historial ni contenido guardado.

El host define la apariencia con `.cd-minimap-toggle` y `.cd-minimap`; el núcleo no añade CSS. El ejemplo recuerda la elección en `localStorage` bajo `kairo-minimap-collapsed`. Sin preferencia guardada, comienza plegado si el ancho es ≤ 1180 px o el alto ≤ 760 px, calculados al abrir. Almacenamiento bloqueado solo limita la persistencia. No se fuerza otro estado al redimensionar la ventana. Disponible también en solo lectura y como `Kairo.createMinimap` en el bundle global.

## Borradores recuperables (opcional)

El ejemplo conserva copias locales de las ediciones y las muestra en **Borradores**, junto al estado de guardado. Puedes recuperar una copia como un paso de Deshacer, exportarla a JSON o eliminarla. No se restaura ni se borra nada automáticamente al iniciar. Cada ventana tiene su propia copia y el botón **Guardar** mantiene separada la versión guardada explícitamente, tanto en navegador como en Tauri.

La API pública vive en `@fsaldivar.dev/diagram/recovery`: `createDraftStore` recibe el almacenamiento del host y ofrece `list`, `read`, `write` y `remove`; `createDraftRecovery` agrupa revisiones con `schedule`, `flush`, `markSaved`, `discard` y `destroy`. Ver el [ejemplo de integración](packages/diagram/README.md#recoverable-local-drafts). El núcleo y su límite de 20 KiB gzip no cambian; no hay dependencia nueva ni IPC durante la edición.

La copia usa 500 ms de espera y un máximo de 2 s, con vaciado al ocultar la página; el cierre abrupto puede perder cambios aún pendientes. Límites por defecto: 1 MiB por copia y 20 copias, configurables. Si el almacenamiento falla o está lleno, se conserva la copia anterior y se indica el error. Recuperar nunca sobrescribe el guardado explícito; borrar una copia no borra el diagrama abierto. El almacenamiento del navegador/WebView no sustituye una copia de respaldo externa.
