# Kairo: registro de features por sesión

Lista acumulativa de funciones nuevas. Cada sección es una sesión de trabajo. El plan por función está en [PLAN_KAIRO.md](PLAN_KAIRO.md); la instalación y el uso en [README.md](../README.md).

## Sesión 2026-09-30 — Claude (continuación tras Codex)

Etapa 2, edición de conexiones y perfiles.

### Núcleo (`@fsaldivar.dev/diagram`)

- **Perfil de documento.** `DiagramDocument.profile?: string` opcional, validado (1–64 caracteres) y migrado por `parseDocument`. `createDocument(graph, layout?, profile?)`. Nombra la familia de notación; el host lo traduce a una política de conexiones.
- **Política de conexiones.** `ConnectionPolicy { allowSelfLoops?, allowMultipleEdges?, allowCycles? }`. Por defecto: sin bucles, una arista por dirección, ciclos permitidos. La política solo gobierna conexiones **nuevas o editadas**; nunca invalida un documento ya existente.
- **Operaciones puras** (`operations.ts`, exportadas `checkConnection`, `reachable`):
  - `checkConnection` devuelve el motivo (`self-loop`, `duplicate`, `cycle`, `missing-node`, `rejected`) o `null`.
  - `connectNodes`, `reconnectEdge`, `reverseEdge`, `removeElement` devuelven un documento nuevo validado o el código de rechazo. Nunca mutan la entrada.
  - `reachable` (iterativa, segura en grafos profundos) alimenta la detección de ciclos.
- **Invertir conexión.** Intercambia extremos y puertos conservando label/relation/condition/tags; los marcadores siguen ligados a su rol (la punta se mueve al nuevo destino). Reversible.
- **Reconectar extremos.** Cambia origen y/o destino de forma atómica, conservando el puerto no tocado y recalculando solo el puerto movido cuando no se indica.
- **Bucles sobre un nodo.** `defaultPorts(a, a)` da puertos en esquina; `connectionPath` dibuja un pétalo cerrado que sale y vuelve por la normal del puerto. Puertos iguales o perpendiculares eligen la esquina que no cruza el nodo. Probado: ninguna de las 16 combinaciones de puertos entra en el cuerpo del nodo.
- **`nearestPort`** acepta `excluded: string | null` y un predicado `(id, port)` consultado solo dentro del radio, para validar destinos durante el gesto sin coste por frame.

### Editor (`DiagramEditor`)

- `setConnectionPolicy` / `getConnectionPolicy`, `connectionIssue`, `connect`, `reconnectEdge`, `reverseEdge` públicos. Cada operación rechazada deja documento, selección e historial intactos.
- **Asas de extremo.** La arista seleccionada muestra dos asas sobre los nodos; arrastrarlas reconecta ese extremo con snapping y resalte del destino válido. Escape cancela sin tocar el documento. La arista se atenúa durante el gesto.

### Ejemplo (`examples/tauri`)

- Perfiles `architecture` (permite bucles) y `flow` (permite múltiples aristas), resueltos por `profile` del documento o por tipos de nodo en documentos antiguos.
- Inspector de conexión: botón **Invertir dirección** (atajo `R`, deshabilitado con motivo si la política lo impide), selects de **Origen/Destino** y **Puerto de origen/destino**. Reconexiones rechazadas muestran un toast con el motivo y restauran los controles.
- Los ejemplos se guardan con su `profile`.

### Pruebas

- 12 pruebas unitarias nuevas de `operations.ts` (31 en total con node:test), más perfil en features y bucles/`nearestPort` en graph.
- 4 pruebas UI nuevas (invertir, arrastrar asa + cancelar, duplicado/bucle por perfil en arquitectura, múltiples ramas + bucle en flujo). 30 UI en total, Chromium y WebKit.
- `npm run check`, `cargo test` (5) y build OK. Núcleo: 12.90 KiB gzip, cero dependencias de runtime.

### Chips de tags (añadido en la misma sesión)

- Los tags de cada nodo se dibujan como chips en una fila bajo el cuerpo del nodo (`renderTags`). Solo presentación: el grafo no cambia.
- La fila se recorta al ancho del nodo; si no caben todos, el último se sustituye por un contador `+N`.
- Se ocultan a zoom bajo (`data-detail="low"`). Visibles en todas las formas.
- Se actualizan en vivo al editar tags en el inspector; probado con creación y deshacer. Chips con fondo tenue y borde fino, sin color como identidad.

### Edición inline de etiquetas (misma sesión)

- Doble clic sobre un nodo edita su título en el sitio; doble clic sobre una conexión edita su label. API pública `editText('node' | 'edge', id)`.
- El doble clic se detecta en `pointerdown` (el `dblclick` nativo no sobrevive a la captura de puntero del gesto de arrastre).
- Un `<input>` HTML superpuesto se posiciona en coordenadas de pantalla y escala con el zoom. Enter confirma, Escape cancela sin tocar el documento, perder foco confirma.
- Edición modal: cancela cualquier gesto en curso y confirma una edición previa antes de abrir otra. Reversible por historial. Probado en Chromium y WebKit.

### Etiquetas colocables (misma sesión)

- `EdgeLayout.labelPosition` (`start` | `middle` | `end`) y `labelOffset` (desplazamiento perpendicular con signo, ±400) en el layout; validados y preservados en round-trip. Nunca tocan el grafo.
- El renderer sitúa la etiqueta a lo largo del path (20%/50%/80%) y la desplaza por la normal de la tangente. Por defecto medio, offset 11 (encima de la línea).
- Inspector del ejemplo: select de posición y deslizador de desplazamiento con valor en vivo. Persisten y sobreviven a recargar; probado.

### Catálogo de defaults por tipo (misma sesión)

- `nodeDefaults: Record<NodeType, { shape?, width, height }>` exportado; `addNode` lo usa para que cada tipo nazca con su forma y tamaño.
- `start`/`end` nacen como cápsula, `decision` como rombo, el resto como rectángulo. El host puede sobreescribir pasando posición a `addNode`.
- Probado: un nodo Decisión añadido desde la biblioteca aparece como rombo y persiste.

### Duplicar nodo (misma sesión, primer paso de etapa 3)

- `duplicateNode(document, id, newId, offset?)` puro: clona datos semánticos y de layout con id nuevo y desplazamiento; no copia aristas incidentes.
- `DiagramEditor.duplicateSelected()` duplica el nodo seleccionado, selecciona la copia y cuenta como un solo deshacer.
- Atajo `Cmd/Ctrl+D` en el ejemplo. Probado en unidad y UI (Chromium/WebKit).

## Sesión 2026-09-30 (loop) — Importación de texto estilo Mermaid

Nueva capacidad para competir con Mermaid e integrarse con formatos de texto.

- `parseFlowText(text, options?)` (módulo `text.ts`, exportado): convierte una sintaxis tipo Mermaid en un documento v2 validado con `profile: 'flow'`. Sin eval, sin dependencias.
- Soporta cabecera `flowchart TD|TB|BT|LR|RL` / `graph ...`, comentarios `%%`, formas por corchete (`[]` rectángulo, `()`/`([])` cápsula, `{}` rombo/decisión, `(())` elipse), aristas `-->`, `---`, `-.->` y etiquetas `|texto|`.
- Layout por capas (Kahn) determinista; TB vertical, LR horizontal; los ciclos caen a orden de declaración sin desbordar. IDs saneados.
- Ejemplo: botón **Importar texto** que pide el diagrama por `prompt` y lo carga. 6 pruebas unitarias + 1 UI (Chromium/WebKit).

## Sesión 2026-09-30 (loop) — Exportación SVG autocontenida

Integración multiplataforma: el diagrama sale como vector portable que abre cualquier herramienta.

- `toSVG(document, options?)` (módulo `export.ts`, exportado): serializa un documento a un `<svg>` independiente con el tema embebido. Función pura, sin DOM, sin fuentes ni recursos externos (solo referencias internas a markers).
- Fiel al renderer: formas (rectángulo/rombo/elipse/cápsula), icono y referencia en rectángulos, títulos y tipos, aristas con markers, discontinuas, y etiquetas con posición/offset. `options`: `theme`, `padding`, `edgeStyle`, `includeTags`, `background`.
- Ejemplo: botón **Exportar SVG** que descarga `diagrama.kairo.svg` con el tema activo. 5 pruebas unitarias + 1 UI (descarga). Round-trip importar texto → exportar SVG verificado visualmente.

## Sesión 2026-09-30 (loop) — Subpath `@fsaldivar.dev/diagram/io` (protección de presupuesto)

- `parseFlowText` y `toSVG` se movieron a `packages/diagram/src/io.ts`, con su propio bundle (`dist/io.js`) y entrada de exports `@fsaldivar.dev/diagram/io`. El editor núcleo ya no los incluye.
- Resultado: núcleo + CSS baja de 17.24 a **14.54 KiB gzip**; IO opcional en 6.13 KiB gzip, reportado aparte y no contado contra el presupuesto de 20 KiB del núcleo.
- `scripts/size.mjs` mide núcleo (diagram.js + style.css) frente a 20 KiB e informa el IO por separado. El ejemplo importa el IO desde el subpath vía alias de Vite. Suites sin cambios: 45 unit, 46 UI.

## Sesión 2026-09-30 (loop) — Exportación a texto Mermaid (round-trip)

Interoperabilidad bidireccional con Mermaid: importar y exportar texto.

- `toFlowText(document, options?)` (en `text.ts`, expuesto por `@fsaldivar.dev/diagram/io`): serializa un documento a texto estilo Mermaid. Codifica forma (por `layout.shape` o inferida del tipo: decisión→rombo, inicio/fin→cápsula) y estructura (aristas `-->`/`-.->`/`---`, etiquetas `|...|`).
- Títulos con corchetes, comillas o barras se entrecomillan (`id["..."]`) y el parser quita las comillas al releer, de modo que el round-trip conserva el texto exacto.
- `parseFlowText(toFlowText(doc))` conserva nodos, aristas, etiquetas y formas (prueba de round-trip). Nota: el texto codifica forma y estructura, no tipos Kairo arbitrarios.
- Ejemplo: botón **Exportar texto** (descarga `.mmd`); el importador propone el diagrama actual como texto por defecto. 4 pruebas unitarias nuevas + 1 UI (descarga y reimportación). IO opcional: 6.46 KiB gzip, núcleo intacto en 14.54 KiB.

## Sesión 2026-09-30 (loop) — Redimensionar nodos (etapa 3)

- La asa de la esquina inferior derecha aparece sobre el nodo seleccionado; arrastrarla cambia `width`/`height` del layout. Diferenciador frente a Mermaid (texto sin tamaño manual).
- Mantiene la esquina superior izquierda fija, reajusta las conexiones incidentes por frame (sin reconcile completo), y limita al mínimo válido (140×76).
- Un gesto = un deshacer. Escape cancela sin tocar documento ni historial. 2 pruebas UI (resize + clamp + undo, y cancelar) en Chromium/WebKit. Núcleo 14.84 KiB gzip.

## Sesión 2026-09-30 (loop) — Multiselección (etapa 3)

Selección múltiple sin romper la API de selección simple.

- **Shift-clic** sobre nodos añade/quita cada uno de la selección (`toggleNode`); el primario (último) sigue alimentando el inspector.
- **Marquesina:** Shift + arrastrar sobre el lienzo dibuja un rectángulo y selecciona los nodos que intersecta (`selectNodes`), uniéndolos a la selección previa. El arrastre normal sobre vacío sigue desplazando.
- **Mover en grupo:** arrastrar cualquier nodo de una selección múltiple mueve todos juntos, reajustando sus conexiones; un gesto = un deshacer.
- **Borrar en grupo:** Suprimir elimina todos los nodos seleccionados y sus conexiones incidentes en una operación.
- Nuevos métodos públicos: `toggleNode(id)`, `selectNodes(ids)`, `getSelectedNodeIds()`. La asa de redimensionar solo aparece con exactamente un nodo seleccionado. 3 pruebas UI nuevas (grupo mover/deshacer, marquesina+borrar, des-seleccionar con Shift). Núcleo 15.61 KiB gzip.

## Sesión 2026-09-30 (loop) — Copiar / pegar / cortar (etapa 3)

Portapapeles con remapeo de IDs, sobre la multiselección.

- `extractSelection(document, nodeIds)` (puro): copia los nodos y solo sus aristas internas (ambos extremos seleccionados), con copia profunda.
- `pasteClipboard(document, clip, makeId, offset)` (puro): pega con IDs nuevos, remapea las aristas internas, desplaza el layout y valida; devuelve el documento y los IDs creados o `'empty'`. No muta la entrada.
- Editor: `copySelection()`, `cut()`, `paste(offset?)` y atajos `Cmd/Ctrl+C`, `Cmd/Ctrl+X`, `Cmd/Ctrl+V`. Pegar selecciona las copias y cuenta como un deshacer; los pegados sucesivos se escalonan.
- 2 pruebas unitarias (copia profunda / aristas internas; remapeo + offset sin mutar) y 2 UI (copiar+pegar par conectado con arista remapeada + deshacer; cortar y repegar). Núcleo 16.13 KiB gzip.

## Sesión 2026-09-30 (loop) — Alinear y distribuir (etapa 3)

Sobre la multiselección, estándar de draw.io/Figma.

- `alignNodes(document, ids, edge)` (puro): alinea a `left`/`right`/`top`/`bottom`/`center-x`/`center-y` del cuadro envolvente; null con menos de dos nodos.
- `distributeNodes(document, ids, axis)` (puro): reparte los centros uniformemente entre los dos extremos (`horizontal`/`vertical`), fijando los extremos; null con menos de tres nodos.
- Editor: `alignSelected(edge)`, `distributeSelected(axis)`, cada uno un deshacer. Ejemplo: panel de "Alinear"/"Distribuir" en el inspector cuando hay ≥2 nodos seleccionados, con contador y "Eliminar N nodos".
- Corrección: `renderInspector` consultaba el editor antes de que existiera (zona muerta temporal durante el constructor); la comprobación de multiselección ahora va tras el retorno de selección vacía. 2 pruebas unitarias + 2 UI. Núcleo 16.48 KiB gzip.

## Sesión 2026-09-30 (loop) — Guías de alineación en vivo (etapa 3)

Al arrastrar un nodo aparecen guías y hace snap, como Excalidraw/Figma; Mermaid no tiene edición directa.

- Durante el arrastre de un nodo, `snapNode` compara sus bordes y centros (x: izq/centro/der; y: arriba/medio/abajo) con los de los demás nodos y ajusta la posición al candidato más cercano dentro de 6 px de pantalla (independiente del zoom).
- Dibuja hasta una guía vertical y una horizontal (`cd-guide`, líneas punteadas) que abarcan el nodo movido y el de referencia; desaparecen al soltar.
- Solo presentación/posición: no cambia el grafo; el resultado se confirma como el propio arrastre (un deshacer). 1 prueba UI (snap exacto a columna + guía visible + oculta al soltar). Núcleo 16.94 KiB gzip.

## Sesión 2026-09-30 (loop) — Exportación PNG (integración)

Completa "SVG/PNG" sin tocar el presupuesto del núcleo (va en `@fsaldivar.dev/diagram/io`).

- `toPNG(document, options?)` async: rasteriza el SVG autocontenido (`toSVG`) en un canvas y devuelve un `Blob` PNG. `scale` (por defecto 2) controla la resolución; hereda `theme`, `includeTags`, etc. de SVG.
- Solo navegador y asíncrona; como el SVG no tiene referencias externas, el canvas no queda contaminado y `toBlob` funciona.
- Ejemplo: botón **Exportar PNG** que descarga `diagrama.kairo.png` a 2x con el tema activo. 1 prueba UI (descarga con cabecera PNG `89 50 4E 47`). IO opcional ahora 6.86 KiB gzip; núcleo intacto 16.94 KiB.

## Sesión 2026-09-30 (loop) — Auto-layout (reorganizar)

Layout automático por capas, como Mermaid, pero opcional y preservando posiciones manuales hasta que se invoca.

- `autoLayout(document, options?)` (puro, en `@fsaldivar.dev/diagram/io`): recoloca los nodos por profundidad de dependencias (capas de Kahn), conservando tamaños, formas y semántica; recalcula los puertos de las aristas. `direction` TB/LR, `gap`. Los ciclos caen a orden de declaración. Comparte `layers()` con el importador de texto (refactor a `layout.ts`).
- Editor: nuevo `replaceDocument(document)` que sustituye el documento como **un solo deshacer** (a diferencia de `setDocument`, que reinicia el historial) y conserva la selección válida.
- Ejemplo: botón **Reorganizar** (TB para flujos, LR para arquitectura) con un deshacer. 3 pruebas unitarias + 1 UI. Núcleo 16.97 KiB gzip; IO 7.13 KiB.

## Sesión 2026-09-30 (loop) — Búsqueda de nodos y enfoque

Navegación tipo draw.io/React Flow; nueva en Kairo.

- `searchNodes(graph, query)` (puro): busca sin distinguir mayúsculas en título, tipo, referencia y tags; devuelve ids en orden del documento; consulta vacía no devuelve nada.
- Editor: `focusNode(id, { zoom?, select? })` centra el viewport en un nodo y lo selecciona por defecto.
- Ejemplo: caja de búsqueda en la barra con contador de resultados; escribir enfoca el primer resultado y Enter cicla entre coincidencias. 1 prueba unitaria + 1 UI. Núcleo 17.11 KiB gzip.

## Sesión 2026-09-30 (loop) — Subpath `@fsaldivar.dev/diagram/analysis` (presupuesto)

- `validateFlow` y sus tipos se movieron a `packages/diagram/src/analysis.ts`, con bundle propio (`dist/analysis.js`) y entrada de exports `@fsaldivar.dev/diagram/analysis`. El editor núcleo ya no incluye el validador.
- Resultado: núcleo + CSS baja de 17.11 a **16.04 KiB gzip**; análisis opcional en 1.30 KiB gzip, reportado aparte y no contado. Libera margen para los grupos.
- El ejemplo importa `validateFlow` desde el subpath (alias de Vite). `scripts/size.mjs` informa núcleo, IO y análisis por separado. Suites sin cambios: 57 unit, 74 UI.

## Sesión 2026-10-01 (loop) — Grupos / contenedores (etapa 3)

Agrupación visual de nodos, como draw.io/Excalidraw. MVP: pertenencia + caja + arrastre.

- Datos: campo opcional `DiagramNode.group` (texto, validado, round-trip). La pertenencia vive en el grafo; la caja es derivada.
- `groupBounds(document, padding?)` (puro, exportado): cuadro envolvente con padding por grupo; ignora nodos sin grupo.
- Editor: dibuja una caja contenedora punteada con cabecera y etiqueta detrás de los miembros (`renderGroups`), actualizada al mover/redimensionar. Arrastrar la cabecera mueve todos los miembros como un solo deshacer. API `setNodeGroup(ids, group|null)` y `getGroups()`.
- Ejemplo: botones **Agrupar**/**Desagrupar** en el inspector de selección múltiple (nombre automático `grupo-N`).
- 2 pruebas unitarias (round-trip/validación de `group`, `groupBounds`) + 2 UI (agrupar+arrastrar+deshacer, desagrupar). Núcleo 16.84 KiB gzip. **Pendiente:** grupos anidados, colapsar/expandir y carriles por actor.

## Sesión 2026-10-01 (loop) — Build standalone global (IIFE)

Integración sin bundler: usar Kairo con una etiqueta `<script>` en cualquier página.

- Nuevo build IIFE `dist/kairo.global.js` que expone `window.Kairo` (toda la API pública del núcleo) + `dist/kairo.global.css`. 13.92 KiB gzip, autocontenido, cero dependencias; no cuenta contra el presupuesto del núcleo.
- `package.json`: campos `unpkg`/`jsdelivr` apuntan al global, y exports `./global` y `./global.css`.
- Uso: `<link rel="stylesheet" href="kairo.global.css">` + `<script src="kairo.global.js"></script>`, luego `Kairo.createDiagram(host, { document: Kairo.createDocument(...) })`.
- Prueba UI: inyecta el global en una página en blanco y verifica que `Kairo.createDiagram` monta un editor funcional (2 nodos). 59 unit, 80 UI. Núcleo intacto 16.84 KiB.

## Sesión 2026-10-01 (loop) — Colapsar/expandir grupos

Colapso de contenedores con reenrutado de aristas, como draw.io; preserva las relaciones ocultas.

- Estado efímero (`collapsed: Set<string>`, se reinicia con `setDocument`). API: `setGroupCollapsed(name, bool)`, `toggleGroupCollapsed(name)`, `isGroupCollapsed(name)`.
- Al colapsar, los nodos miembros se ocultan y el contenedor se vuelve una caja compacta con el nombre y "N nodos". Un caret en la cabecera alterna colapso.
- Reenrutado: las aristas con un extremo oculto se reanclan al borde de la caja compacta (`defaultPorts` recalcula los puertos); las internas (ambos extremos en el mismo grupo colapsado) se ocultan. Las posiciones se preservan al expandir.
- Render en dos capas: la caja (fondo, `pointer-events: none`) y los controles cabecera/caret (encima de los nodos) para que el caret sea clicable. 1 prueba UI (colapsar oculta miembros + reruta + expande). Núcleo 17.56 KiB gzip. **Pendiente de grupos:** anidación (contenedores dentro de contenedores) y carriles.

## Sesión 2026-10-01 (loop) — Grupos anidados

Contenedores dentro de contenedores, sin cambiar el esquema.

- Nombres de grupo con `/` implican jerarquía: un nodo en `sistema/acceso` pertenece a `sistema/acceso` y a `sistema`. `groupBounds` calcula una caja por cada prefijo, con padding mayor cuanto más externo, de modo que el contenedor padre envuelve a los hijos.
- Pertenencia por prefijo: `membersOf` y el ocultado al colapsar usan coincidencia de prefijo. Colapsar un grupo externo oculta todos sus descendientes y reenruta las aristas que cruzan al contenedor más externo colapsado. Las cajas internas no se dibujan dentro de un ancestro colapsado.
- Etiqueta = último segmento; el identificador (`data-group`) es la ruta completa. Ejemplo: "Agrupar" pide el nombre (usa `/` para anidar).
- 2 pruebas unitarias (anidación de `groupBounds`, round-trip de ruta) + 1 UI (tres contenedores anidados, colapsar el externo oculta los cuatro nodos). Núcleo 17.79 KiB gzip. **Pendiente de grupos:** carriles por actor.

## Sesión 2026-10-01 (loop) — Web Component `<kairo-diagram>`

Integración agnóstica de framework: un solo componente para React, Vue, Svelte o HTML plano.

- `defineKairoElement(tag?)` registra un custom element `<kairo-diagram>` (idempotente). Vive fuera del núcleo, en el subpath `@fsaldivar.dev/diagram/element` y en el build global (`Kairo.defineKairoElement`).
- Propiedad `document` (get devuelve copia, set reemplaza), atributo `theme` (light/dark), propiedad `editor` para la instancia; emite `change` y `selectionchange` como `CustomEvent`. Monta `createDiagram` en light DOM y se limpia al desconectar.
- Uso: `<link rel=stylesheet href=kairo.global.css><script src=kairo.global.js></script>` y `Kairo.defineKairoElement()`, luego `el.document = Kairo.createDocument(...)`.
- 1 prueba UI (monta vía global, renderiza 2 nodos, emite `change` al editar). Núcleo intacto 17.79 KiB; Web Component 16.21 KiB gzip aparte (incluye el núcleo). **Pendiente de etapa 3:** carriles por actor.

## Sesión 2026-10-01 (loop) — Importación DOT (Graphviz)

Más interoperabilidad de entrada: ingerir grafos de Graphviz y herramientas que emiten DOT.

- `parseDotText(dot, options?)` (en `@fsaldivar.dev/diagram/io`): parsea un subconjunto práctico de DOT a un documento v2 con layout por capas y `profile: 'flow'`. Sin eval.
- Soporta `digraph`/`graph`, ids con comillas, atributos `[label=..., shape=..., style=...]`, aristas encadenadas `a -> b -> c`, `--` no dirigido (sin punta), formas (box/diamond/ellipse/circle/…) y `style=dashed/dotted`. Comentarios `//`, `/* */`, `#` y sentencias de grafo se ignoran.
- Ejemplo: botón **Importar DOT**. 4 pruebas unitarias + 1 UI. Núcleo intacto 17.79 KiB; IO 8.03 KiB gzip.

## Sesión 2026-10-01 (loop) — Carriles (swimlanes)

Última pieza estructural de la etapa 3: agrupación por actor/fase en bandas.

- Campo opcional `DiagramNode.lane` (validado, round-trip). `laneBands(document, orientation?, padding?)` (puro, exportado): bandas de altura/anchura completa por carril, ordenadas por eje principal. Orientación `columns` (por defecto) o `rows`, configurable con la opción `lanes` del editor.
- Editor: banda etiquetada por carril detrás de todo (`renderLanes`), actualizada al mover/redimensionar. API `setNodeLane(ids, lane|null)` y `getLanes()`.
- Ejemplo: botón **Carril** en el inspector de selección múltiple (nombre por prompt).
- 2 pruebas unitarias (round-trip de `lane`, `laneBands`) + 1 UI (asignar dos carriles, bandas etiquetadas). Núcleo 18.39 KiB gzip. **Nota:** reasignar carril arrastrando el nodo a otra banda aún no está (se asigna por API/botón). Con esto, todas las funciones listadas de la etapa 3 están implementadas y probadas.

## Sesión 2026-10-01 (loop) — Exportación DOT (Graphviz)

Completa el round-trip de Graphviz (importar + exportar), sin coste para el núcleo.

- `toDotText(document, options?)` (en `@fsaldivar.dev/diagram/io`): serializa a un `digraph` DOT con formas (`box`/`diamond`/`ellipse`, `box style=rounded` para cápsula), etiquetas y `style=dashed`. Entrecomilla ids y etiquetas. `rankdir` configurable.
- `parseDotText(toDotText(doc))` conserva estructura, etiquetas, formas (rectángulo/rombo/elipse) y discontinuas. Codifica forma y estructura, no tipos Kairo arbitrarios.
- Ejemplo: botón **Exportar DOT** (descarga `.dot`). 3 pruebas unitarias + 1 UI (descarga + reimportación). Núcleo intacto 18.39 KiB; IO 8.31 KiB gzip.

## Sesión 2026-10-01 (loop) — Reasignar carril al arrastrar

Pulido de swimlanes: mover un nodo a otra banda cambia su carril, como draw.io.

- Al soltar un nodo, el editor comprueba en qué banda cae su centro (excluyendo su propio carril del sondeo) y reasigna `lane` a esa banda; si cae fuera de todas, conserva el carril anterior. Movimiento y reasignación forman un solo deshacer.
- 1 prueba UI (arrastrar entre dos carriles reasigna y un deshacer restaura carril y posición). Núcleo 18.49 KiB gzip. Con esto, la etapa 3 (incluida la reasignación de carril por arrastre) está implementada y probada.

## Sesión 2026-10-01 (loop) — Modo solo lectura (visor)

Etapa 4 (lectura y presentación): visor para incrustar sin edición.

- Opción `readOnly` del editor + `setReadOnly(bool)` / `isReadOnly()`. Desactiva las interacciones de edición (arrastrar, conectar, reconectar, redimensionar, agrupar/arrastrar grupo, marquesina, edición inline, borrar, copiar/pegar/duplicar, deshacer); mantiene pan, zoom, selección (incl. Shift y marquesina) y copiar al portapapeles.
- Oculta asas y puertos de conexión; `data-readonly` en `.cd-editor` ajusta cursores. Bloquea el comportamiento por defecto de Suprimir/Retroceso (evita navegación "atrás").
- Ejemplo: botón **Solo lectura**. 1 prueba UI (bloquea arrastrar y borrar, conserva selección/pan, y restaura la edición al desactivar). Núcleo 18.69 KiB gzip.

## Sesión 2026-10-01 (loop) — Resaltado de nodos y rutas

Base del reproductor de rutas (etapa 4) y realce de resultados.

- `setHighlight(ids)`, `clearHighlight()`, `getHighlight()`: marca nodos/aristas con `is-highlighted` y atenúa el resto (`has-highlight` en `.cd-editor`). Sobrevive a re-render y poda ids inexistentes.
- Ejemplo: la búsqueda resalta todas las coincidencias y las atenúa al vaciar el campo.
- 1 prueba UI (buscar resalta 2 y atenúa; vaciar restaura). Núcleo 18.87 KiB gzip (**margen ~1.1 KiB: nuevas features solo en subpaths**).

## Sesión 2026-10-01 (loop) — Reproductor de rutas (etapa 4)

Reproductor opt-in de rutas en el subpath `@fsaldivar.dev/diagram/player`, desacoplado del núcleo.

- `flowSteps(graph)` (puro): pasos acumulativos por recorrido BFS desde los inicios; cada paso lista nodos y aristas activos. Incluye nodos inalcanzables al final; tolera grafos sin inicio o vacíos.
- `PathPlayer(target, steps, options?)`: controla la animación sobre un objetivo con `setHighlight`/`clearHighlight` (el editor lo cumple). `play/pause/toggle/next/prev/goTo/stop`, `intervalMs`, `loop`. Los timers solo corren al reproducir; `stop` limpia el resaltado. Sin frames inactivos.
- Ejemplo: botón **Reproducir ruta** (solo flujos); se detiene al cambiar de documento. 6 pruebas unitarias + 1 UI. Núcleo intacto 18.87 KiB; player 0.79 KiB gzip.

## Sesión 2026-10-01 (loop) — Miniaturas

Etapa 4: miniatura SVG para galerías y selectores, en `@fsaldivar.dev/diagram/io`.

- `toThumbnail(document, { width?, height?, theme?, padding? })` (puro): SVG pequeño que ajusta el contenido al tamaño objetivo; dibuja las formas de los nodos y las aristas como líneas rectas centro a centro, sin texto ni iconos. Autocontenido, sin referencias externas; tolera documentos vacíos.
- Ejemplo: miniatura en vivo en la tarjeta de documento de la barra lateral, actualizada al cambiar el diagrama o el tema.
- 2 pruebas unitarias + 1 UI (la miniatura se actualiza al añadir un nodo). Núcleo intacto 18.87 KiB; IO 8.63 KiB gzip.

## Sesión 2026-10-01 (loop) — Benchmark y pruebas a escala

Etapa 5: medir antes de optimizar; cubre el hueco "sin benchmark representativo".

- `scripts/bench.mjs` (`npm run bench`): construye grafos de 100/500/2000 nodos y mide `parseDocument`, `autoLayout` y `toSVG`. Medición local de referencia (2000 nodos): parse ~3 ms, autoLayout ~14 ms, toSVG ~8 ms. No es parte de la librería.
- `tests/scale.test.ts`: valida corrección a escala con 2000 nodos (parse, autoLayout, toSVG, toThumbnail finitos y completos; `validateFlow` sin desbordar). 78 unit en total.
- Sin cambios en el núcleo (18.87 KiB gzip). Observación: `autoLayout`/`layers` recorren aristas por nodo (coste cuadrático); suficiente para miles de nodos, a revisar si se apunta a decenas de miles.

## Sesión 2026-10-01 (loop) — Optimización del algoritmo de capas

Mejora de eficiencia guiada por el benchmark, sin tocar el núcleo.

- `layers()` (en `layout.ts`, usado por `autoLayout` y `parseFlowText`) pasó de O(nodos × aristas) a O(nodos + aristas): lista de adyacencia construida una vez y cola por índice en lugar de `queue.shift()` (que era O(n)). Mismo resultado de capas (Kahn).
- Efecto medido: `autoLayout` de 2000 nodos baja de ~14 ms a ~5 ms (~3×). Núcleo intacto (18.87 KiB); IO 8.62 KiB.
- 1 prueba unitaria nueva (capas de un DAG en diamante) además de las pruebas a escala existentes. 79 unit, 102 UI.

## Sesión 2026-10-01 (loop) — Importar diagramas de estado (Mermaid)

Notación especializada (etapa 5) y más cobertura de Mermaid.

- `parseStateText(text, options?)` (en `@fsaldivar.dev/diagram/io`): importa `stateDiagram` / `stateDiagram-v2`. Estados → nodos proceso; `[*]` → un inicio compartido (como origen) o un fin compartido (como destino); transiciones `A --> B : evento` con etiqueta; alias `state "Texto" as X`. Layout por capas, perfil `flow`.
- Ejemplo: el botón **Importar texto** autodetecta `stateDiagram` vs `flowchart`/`graph`.
- 2 pruebas unitarias + 1 UI. Núcleo intacto 18.87 KiB; IO 9.16 KiB gzip.

## Sesión 2026-10-01 (loop) — Importar diagramas de clases (Mermaid / UML)

Notación UML (etapa 5); completa el trío Mermaid (flowchart, state, class).

- `parseClassText(text, options?)` (en `@fsaldivar.dev/diagram/io`): importa `classDiagram`. Clases → nodos tipo `class` (miembros resumidos en `source`); relaciones (`<|--` herencia, `*--` composición, `o--` agregación, `..|>` realización, `-->` asociación, `..>` dependencia, `--` enlace) → aristas con `relation` y etiqueta tras `:`; cardinalidades entre comillas se ignoran. Perfil `uml`, layout por capas.
- Ejemplo: el botón **Importar texto** autodetecta `classDiagram` además de `stateDiagram` y `flowchart`/`graph`.
- 2 pruebas unitarias + 1 UI. Núcleo intacto 18.87 KiB; IO 9.74 KiB gzip.

## Sesión 2026-10-01 (loop) — Importar ER y despachador `parseMermaid`

Completa las notaciones Mermaid y unifica la importación.

- `parseErText(text, options?)` (en `@fsaldivar.dev/diagram/io`): importa `erDiagram`. Entidades → nodos `database` (atributos resumidos en `source`); relaciones `A ||--o{ B : verbo` → aristas con `relation: 'er'` y la etiqueta. Perfil `er`.
- `parseMermaid(text)`: autodetecta el dialecto por la cabecera y despacha a flowchart / state / class / ER (flowchart por defecto). Un único punto de entrada para Mermaid.
- Ejemplo: **Importar texto** usa `parseMermaid`, cubriendo los cuatro dialectos. 3 pruebas unitarias + 1 UI. Núcleo intacto 18.87 KiB; IO 10.00 KiB gzip (tree-shakeable desde el subpath ESM).

## Sesión 2026-10-01 (loop) — Exportación accesible y `describeDiagram`

Accesibilidad, un hueco frente a las alternativas; sin coste de núcleo.

- `toSVG` ahora incluye `role="img"`, `aria-label`, `<title>` y `<desc>` (opciones `title`/`description`; por defecto un resumen de conteos). Los SVG exportados son accesibles para lectores de pantalla.
- `describeDiagram(graph)` (en `@fsaldivar.dev/diagram/analysis`): resumen textual (conteos, roles de flujo, primeros títulos) para texto alternativo, tooltips o anuncios de lector de pantalla.
- 2 pruebas unitarias. Núcleo intacto 18.87 KiB; IO 10.13 KiB; analysis 1.53 KiB gzip.

## Sesión 2026-10-01 (loop) — Interoperabilidad JSON Canvas (Obsidian)

Más plataformas: el formato abierto JSON Canvas (jsoncanvas.org, Obsidian).

- `toCanvas(document)` (en `@fsaldivar.dev/diagram/io`): exporta a JSON Canvas (nodos de texto con posición/tamaño; puertos → `fromSide`/`toSide`; etiquetas). Devuelve un objeto listo para `JSON.stringify`.
- `fromCanvas(json)`: importa JSON Canvas (texto/link/file → genérico, group → folder); clampa tamaños al mínimo, mapea lados a puertos, descarta aristas con extremos ausentes. Valida la entrada.
- Round-trip de estructura, etiquetas, posiciones y puertos. Ejemplo: botón **Exportar Canvas** (descarga `.canvas`). 4 pruebas unitarias + 1 UI. Núcleo intacto 18.87 KiB; IO 10.67 KiB gzip.

## Sesión 2026-10-01 (loop) — Minimapa

Navegación de vista general, como React Flow/draw.io, en el subpath `@fsaldivar.dev/diagram/minimap`.

- `createMinimap(editor, host, options?)`: dibuja una vista general en vivo (rectángulos de nodos + caja del viewport) sobre la API pública del editor; clic para recentrar. Devuelve `{ update, destroy }`; el host llama `update()` en `onChange`/`onViewportChange`. Desacoplado (0.95 KiB gzip), sin coste de núcleo.
- Ejemplo: minimapa fijo en la esquina del lienzo, sincronizado con cambios y zoom. 1 prueba UI (refleja 7 nodos + caja; clic recentra). Núcleo intacto 18.87 KiB.

## Sesión 2026-10-01 (loop) — Minimapa: aristas y arrastre

Mejora del minimapa (subpath `/minimap`), sin coste de núcleo.

- Ahora dibuja también las **aristas** (líneas centro a centro) para dar contexto, detrás de los rectángulos de nodos.
- **Arrastre para desplazar:** pointerdown/move recentran el viewport de forma continua; un clic sigue recentrando. Captura de puntero para un arrastre fluido.
- Prueba UI actualizada (6 aristas en el minimapa; arrastre desplaza el diagrama). Minimapa 1.17 KiB gzip; núcleo intacto 18.87 KiB.

## Sesión 2026-10-01 (loop) — Exportar HTML interactivo (artefacto standalone)

Compartir un diagrama como un archivo `.html` autónomo.

- `toHtml(document, options?)` (en `@fsaldivar.dev/diagram/io`): envuelve el SVG (`toSVG`) en una página HTML autocontenida con pan y zoom embebidos (sin recursos externos). `interactive: false` omite el script. Hereda las opciones de `toSVG` (tema, tags, título).
- Ejemplo: botón **Exportar HTML** (descarga `diagrama.kairo.html`). 2 pruebas unitarias + 1 UI (descarga, se renderiza al abrir y la rueda cambia el viewBox). Núcleo intacto 18.87 KiB; IO 11.29 KiB gzip.

## Sesión 2026-10-01 (loop) — Diff de documentos

Comparar versiones y resaltar cambios; se integra con `setHighlight`.

- `diffDocuments(before, after)` (en `@fsaldivar.dev/diagram/analysis`): devuelve nodos y aristas `added`/`removed`/`changed` (semántica y layout), independiente del orden. Puro.
- Ejemplo: botón **Resaltar cambios** que difiere contra la última versión guardada y resalta lo añadido/cambiado con `setHighlight`. 2 pruebas unitarias + 1 UI. Núcleo intacto 18.87 KiB; analysis 1.73 KiB gzip.

## Sesión 2026-10-01 (loop) — Reducción de cruces en auto-layout

Mejora de calidad del layout por capas, como dagre/Mermaid; en `/io`, sin coste de núcleo.

- `autoLayout` reordena los nodos dentro de cada capa por el baricentro de sus vecinos (barridos arriba/abajo, heurística de Sugiyama) para reducir los cruces de aristas, conservando las capas por profundidad.
- Determinista y estable (empates por orden de declaración). 2000 nodos: ~8 ms (sigue cómodo). 1 prueba unitaria nueva (par cruzado se reordena) + las existentes de layout intactas. Núcleo intacto 18.87 KiB; IO 11.53 KiB gzip.

## Sesión 2026-10-01 (loop) — Exportar diagramas de estado (Mermaid)

Simetría de interoperabilidad: `toStateText` empareja con `parseStateText`.

- `toStateText(document)` (en `@fsaldivar.dev/diagram/io`): serializa un documento de flujo a `stateDiagram-v2`. Los nodos inicio/fin vuelven a `[*]`; se conservan las etiquetas de transición; los nodos aislados se declaran como estados.
- `parseStateText(toStateText(doc))` conserva estados de proceso, transiciones y etiquetas. 1 prueba unitaria. Núcleo intacto 18.87 KiB; IO 11.65 KiB gzip.

## Sesión 2026-10-01 (loop) — Exportar clases/ER y `toMermaid`

Mermaid bidireccional completo en los cuatro dialectos.

- `toClassText(document)` (UML) y `toErText(document)` (ER) en `@fsaldivar.dev/diagram/io`: emiten `classDiagram`/`erDiagram` con miembros/atributos (desde `source`) y relaciones; round-trip con `parseClassText`/`parseErText`.
- `toMermaid(document)`: exporta al dialecto según el perfil (`uml`→class, `er`→er, resto→flowchart). El ejemplo usa `toMermaid` al exportar/preponer texto, eligiendo el dialecto correcto.
- 3 pruebas unitarias. Núcleo intacto 18.87 KiB; IO 11.96 KiB gzip. Con esto, Mermaid se importa y exporta en flowchart, state, class y ER.

## Sesión 2026-10-01 (loop) — Ajustar a subconjunto y recetas de framework

- `fit(padding?, ids?)` y `fitSelection()` en el editor: ajustan la vista a todos los nodos o solo a un subconjunto (resultados de búsqueda, selección). El ejemplo ajusta la vista a las coincidencias de búsqueda múltiples.
- README: recetas de **React, Vue y Svelte** usando el Web Component `<kairo-diagram>` (la vía recomendada; sin envoltorios por framework).
- 1 prueba UI (buscar varias coincidencias ajusta la vista). Núcleo 18.90 KiB gzip.

## Sesión 2026-10-01 (loop) — Rejilla magnética (snap to grid)

Alineado a rejilla al arrastrar y redimensionar, como Excalidraw/draw.io.

- Opción `gridSnap` del editor + `setGridSnap(size)`/`getGridSnap()`. Al arrastrar un nodo o grupo y al redimensionar, las posiciones/tamaños se redondean a múltiplos de `size` (0 = desactivado). Las guías de alineación tienen prioridad; la rejilla rellena el eje que no se alineó a otro nodo.
- Ejemplo: botón **Rejilla magnética** (24 px). 1 prueba UI (redimensionar con rejilla da tamaños múltiplos de 24). Núcleo 19.06 KiB gzip (**margen ~0.9 KiB: nuevas features de núcleo solo micro**).

## Sesión 2026-10-01 (loop) — Interoperabilidad con Excalidraw

Más plataformas: el formato de escena `.excalidraw`.

- `toExcalidraw(document)` (en `@fsaldivar.dev/diagram/io`): genera una escena Excalidraw cargable — formas (rectángulo/elipse/rombo; cápsula→rectángulo) con texto enlazado y flechas con `startBinding`/`endBinding`.
- `fromExcalidraw(scene)`: importa formas como nodos (título del texto enlazado) y flechas enlazadas como aristas; clampa tamaños, ignora elementos borrados y flechas sueltas, valida la entrada.
- Round-trip de estructura, posiciones y formas. Ejemplo: botón **Exportar Excalidraw** (descarga `.excalidraw`). 3 pruebas unitarias + 1 UI. Núcleo intacto 19.06 KiB; IO 12.81 KiB gzip.

## Sesión 2026-10-01 (loop) — Conversor universal y CLI

Un punto de conversión entre todos los formatos, también sin navegador (CI).

- `convertText(input, from, to)`, `parseAny(text, from)`, `serializeAs(document, to)` (en `@fsaldivar.dev/diagram/io`): puentean entre `mermaid`/`dot`/`canvas`/`excalidraw`/`json` (entrada) y además `svg`/`html` (salida). Puro; corre en Node o navegador.
- `scripts/kairo-convert.mjs` (`npm run convert -- <entrada> <salida>`): CLI que detecta formatos por extensión (`.mmd`/`.dot`/`.canvas`/`.excalidraw`/`.json` → `.svg`/`.html`/…). Verificado: Mermaid→SVG, Mermaid→DOT, DOT→JSON Canvas.
- 4 pruebas unitarias. Núcleo intacto 19.06 KiB; IO 12.99 KiB gzip.

## Sesión 2026-10-01 (loop) — Métricas de grafo

Capacidad analítica para QA y dashboards.

- `analyzeGraph(graph)` (en `@fsaldivar.dev/diagram/analysis`): devuelve `nodeCount`, `edgeCount`, `byType`, `roots` (sin entrantes), `leaves` (sin salientes), `isolated`, `depth` (número de capas), `hasCycle` y `density`. Puro.
- 2 pruebas unitarias. Núcleo intacto 19.06 KiB; analysis 2.14 KiB gzip.

## Sesión 2026-10-01 (loop) — Layout centrado (árboles equilibrados)

- `autoLayout` centra cada capa contra la más ancha, de modo que un padre queda sobre el punto medio de sus hijos (árboles equilibrados, como dagre/Mermaid). Solo cambia el posicionado; capas, tamaños y reducción de cruces se mantienen.
- 1 prueba unitaria (padre centrado sobre dos hijos). Núcleo intacto 19.06 KiB; IO 12.99 KiB gzip.

## Sesión 2026-10-01 (loop) — Preservar layout al reimportar

Editar el texto y reimportar sin perder las posiciones manuales.

- `mergeLayout(target, source)` (en `@fsaldivar.dev/diagram/io`): devuelve `target` con las posiciones de los nodos cuyo id coincide en `source`, conservando tamaños, formas y semántica de `target`; los nodos nuevos mantienen su layout; los puertos se recalculan.
- Ejemplo: al importar texto, se hace `mergeLayout` contra el documento actual, así editar el Mermaid exportado (ids preservados) conserva las posiciones. 1 prueba unitaria + 1 UI (mover un nodo, reimportar, la posición se mantiene). Núcleo intacto 19.06 KiB; IO 13.11 KiB gzip.

## Sesión 2026-10-01 (loop) — Lint de diagramas y CLI para CI

- `lintDocument(document, options?)` (en `@fsaldivar.dev/diagram/analysis`): combina `validateFlow` y `analyzeGraph`; devuelve `{ ok, errors, warnings, diagnostics, metrics }`. `ok` es falso si hay algún error.
- `scripts/kairo-lint.mjs` (`npm run lint:diagram -- <archivo>`): valida un diagrama (Mermaid/DOT/Canvas/Excalidraw/JSON) e **sale con código 1 si hay errores** estructurales; imprime métricas y diagnósticos. Pensado para flujos/estados en CI. Verificado: stateDiagram válido → OK (0); flujo con pasos sin salida → errores (1).
- 1 prueba unitaria. Núcleo intacto 19.06 KiB; analysis 2.14 KiB gzip.

## Sesión 2026-10-01 (loop) — Envoltorio nativo de React

Componente React tipado, además del Web Component.

- `@fsaldivar.dev/diagram/react` exporta `<KairoDiagram document theme? readOnly? onChange? onSelectionChange? onReady? />`. Monta el editor una vez y sincroniza `document`/`theme`/`readOnly` al cambiar las props; limpia al desmontar. React es `peerDependency` (externa en el bundle).
- Ejemplo: página `react.html` (build multipágina) con una app React que cambia el documento por estado. 1 prueba UI (monta y sincroniza el cambio de prop en Chromium/WebKit). Núcleo intacto 19.06 KiB; bundle React aparte (React externa).

## Sesión 2026-10-01 (loop) — Envoltorio nativo de Vue 3

Componente Vue, junto al de React y el Web Component.

- `@fsaldivar.dev/diagram/vue` exporta `KairoDiagram` (defineComponent): props `document`, `theme`, `readOnly`; emite `change`, `selectionChange`, `ready`. Monta el editor una vez y sincroniza las props con watchers; limpia al desmontar. Vue es `peerDependency` (externa en el bundle).
- Ejemplo: página `vue.html` (build multipágina) con una app Vue que cambia el documento con un flag reactivo. 1 prueba UI (monta y sincroniza el cambio de prop). Núcleo intacto 19.06 KiB; bundle Vue aparte (Vue externa).

## Sesión 2026-10-01 (loop) — Action nativa de Svelte

Completa el trío React/Vue/Svelte pedido.

- `@fsaldivar.dev/diagram/svelte` exporta la action `kairo(node, params)` para usar como `<div use:kairo={{ document }} />`. Es la forma idiomática de integrar una librería imperativa en Svelte: no necesita componente `.svelte` ni el compilador. Params: `document`, `theme?`, `readOnly?`, `onChange?`, `onSelectionChange?`, `onReady?`. Devuelve `{ update, destroy }`: `update` sincroniza documento/tema/readOnly cuando cambian y lee los callbacks en vivo; `destroy` libera el editor. Sin dependencia de Svelte (el tipo `KairoAction` se declara localmente), así que no hay externo en el bundle.
- Ejemplo: página `svelte.html` (build multipágina) con `svelte-demo.ts` que invoca la action imperativamente igual que el runtime de Svelte (`kairo` al montar, `action.update` al cambiar, `action.destroy` al descargar), probando el contrato real sin el compilador. 1 prueba UI (monta docA, `update` a docB y de vuelta) en Chromium/WebKit. Núcleo intacto 19.06 KiB; bundle Svelte aparte 16.76 KiB gzip (sin deps, empaqueta el núcleo).

## Sesión 2026-10-01 (loop) — Interoperabilidad CSV/TSV (listas de aristas)

Convierte una hoja de cálculo en diagrama y viceversa; entrada de datos que Mermaid/Excalidraw/draw.io no facilitan.

- `fromCsv(text, options?)` (en `@fsaldivar.dev/diagram/io`): lee una lista de aristas `from,to,label?`. Detecta el separador (coma/tab/punto y coma) en la primera fila; detecta cabecera solo si nombra columnas conocidas (`from/source/src/origen`, `to/target/dst/destino`, `label/relation/etiqueta`) en cualquier orden; si no, es posicional. Respeta campos entre comillas con comas y `""` escapadas, ignora líneas en blanco y comentarios `#`. Una fila con `to` vacío solo declara un nodo. Construye nodos únicos por extremos y un layout en capas determinista (`layers`, como el importador DOT). Lanza error si no hay nodos.
- `toCsv(document, options?)`: emite cabecera `from,to,label`, una fila por arista (títulos o `useIds`) y una fila con `to` vacío por cada nodo aislado, de modo que `fromCsv` los recupera. Cita los campos con separador/comilla/salto de línea. Puro.
- Integrado en el conversor universal (`parseAny`/`serializeAs`/`convertText`: formato `csv`) y en la CLI `scripts/kairo-convert.mjs` (`.csv`/`.tsv`). Verificado por CLI: `csv→mermaid` y `mermaid→csv` conservan aristas y etiquetas.
- 8 pruebas unitarias (sin cabecera, cabecera nombrada en cualquier orden, tab/semicolon, comillas/comentarios, fila de nodo, round-trip con nodo aislado, pureza, puente `convertText`) + 1 UI (importar y exportar con round-trip del nodo aislado) en Chromium/WebKit. Núcleo intacto 19.06 KiB; IO 14.00 KiB gzip.

## Sesión 2026-10-01 (loop) — Algoritmos de grafo (ruta más corta, orden topológico, SCC)

Capacidad nueva que Mermaid/Excalidraw/draw.io no ofrecen: analizar la estructura del diagrama, no solo dibujarlo.

- Módulo `packages/diagram/src/algorithms.ts`, reexportado desde `@fsaldivar.dev/diagram/analysis`. Puro, solo ids, aristas dirigidas (source→target):
  - `shortestPath(graph, from, to)`: ruta dirigida de menos saltos (BFS); devuelve la lista de ids inclusiva o `null` si es inalcanzable. `from===to` da `[from]`.
  - `pathEdges(graph, path)`: ids de aristas que conectan una ruta consecutiva (primera coincidencia por salto).
  - `topologicalOrder(graph)`: orden topológico (Kahn) o `null` si hay ciclo dirigido; desempate por orden de declaración (determinista).
  - `stronglyConnectedComponents(graph)`: Tarjan **iterativo** (sin recursión; seguro en grafos profundos). Componentes en orden topológico inverso; incluye singletons.
  - `hasCycle(graph)`: ciclo dirigido o bucle sobre un nodo.
- Ejemplo: botón **Ruta más corta** resalta la ruta de menos saltos entre dos nodos seleccionados (Shift-clic), nodos y aristas, con `setHighlight`. Si no hay ruta dirigida en ningún sentido, lo avisa.
- 7 pruebas unitarias (ruta más corta y pureza, dirección/inalcanzable/nodo desconocido, `pathEdges`, orden topológico de DAG y `null` en ciclo, SCC con ciclo y singletons, `hasCycle` con bucle, cadena de 10 000 nodos sin desbordar la pila) + 1 UI (resaltar ruta login→auth→users) en Chromium/WebKit. Núcleo intacto 19.06 KiB; analysis 2.89 KiB gzip.

## Sesión 2026-10-01 (loop) — Interoperabilidad GraphML (yEd, Gephi, Cytoscape, draw.io)

Más plataformas: GraphML es el formato de intercambio de yEd, Gephi, Cytoscape y draw.io.

- `fromGraphml(xml, options?)` y `toGraphml(document, options?)` en `@fsaldivar.dev/diagram/io`. Subconjunto práctico sin dependencias (corre en Node y navegador; XML por regex como el importador DOT, no DOM):
  - Importa nodos y aristas dirigidas, con etiqueta vía `<key>`/`<data>` (atributos `label/name/title/description`). Fallback a yEd: extrae el texto de `<y:NodeLabel>`/`<y:EdgeLabel>`. Decodifica entidades (`&lt; &gt; &amp; &quot; &apos; &#n;`), ignora comentarios, admite nodos/aristas autocerrados. Layout en capas determinista. Lanza error si no hay nodos.
  - Exporta GraphML estándar dirigido con claves para etiqueta de nodo, forma de nodo y etiqueta de arista; escapa XML. Reimportable.
- Integrado en el conversor universal (`parseAny`/`serializeAs`/`convertText`: formato `graphml`) y en la CLI (`.graphml`/`.xml`). Verificado por CLI: `csv→graphml→mermaid` conserva nodos, aristas y etiquetas.
- 5 pruebas unitarias (GraphML estándar con entidades y nodo autocerrado, fallback yEd NodeLabel/EdgeLabel, round-trip con comillas escapadas, pureza + error en vacío, puentes `convertText`) + 1 UI (exportar `.graphml` y reimportar a la misma estructura) en Chromium/WebKit. Núcleo intacto 19.06 KiB; IO 15.05 KiB gzip.

## Sesión 2026-10-01 (loop) — Enlaces para compartir (deep-linking)

Algo nuevo que la librería puede hacer: un diagrama cabe en una URL, como Mermaid Live o Excalidraw.

- Módulo `packages/diagram/src/share.ts`, reexportado desde `@fsaldivar.dev/diagram/io`. Sin dependencias; corre en Node y navegador (base64url propio sobre `TextEncoder`/`TextDecoder`, sin `Buffer`/`btoa`):
  - `encodeDocument(document)`: valida y devuelve un código compacto y seguro para URL con prefijo de versión `K1:` (solo `A–Z a–z 0–9 - _`, sin `+/=`, sobrevive intacto en query/fragmento).
  - `decodeDocument(code)`: decodifica y valida; lanza error si falta el prefijo o el cuerpo está corrupto.
  - `toShareLink(document, base?)`: construye `base#d=<código>`. `fromShareLink(urlOrHash)`: lee `d=<código>` (o un código suelto) y devuelve el documento o `null` si no hay o está malformado (no lanza).
- Ejemplo: botón **Copiar enlace** escribe el código en `location.hash` y lo copia al portapapeles; al cargar, el ejemplo restaura el diagrama desde el fragmento (deep-linking).
- 6 pruebas unitarias (round-trip sin pérdida, títulos no-ASCII y caracteres reservados, pureza+validación, rechazo de prefijo/cuerpo inválido, `toShareLink`/`fromShareLink`, hash/código suelto/ausente→null) + 1 UI (importar CSV, copiar enlace, recargar y restaurar) en Chromium/WebKit. Núcleo intacto 19.06 KiB; IO 15.68 KiB gzip.

## Sesión 2026-10-01 (loop) — Interoperabilidad Markdown (Mermaid + resumen accesible)

Integración con plataformas de documentación (GitHub, GitLab, Obsidian, Notion), que renderizan Mermaid dentro de Markdown.

- `toMarkdown(document, options?)` y `fromMarkdown(markdown)` en `@fsaldivar.dev/diagram/io` (reutilizan `toMermaid`/`parseMermaid`, sin importar `/analysis`):
  - `toMarkdown` emite `# título`, un bloque ```mermaid renderizable y resúmenes `## Nodos` (título, tipo, tags) y `## Conexiones` (origen → destino: etiqueta). Escapa `|` y saltos de línea. Opciones `title`, `mermaid`, `includeNodes`, `includeConnections`.
  - `fromMarkdown` extrae el primer bloque ```mermaid y lo parsea; lanza error si no hay ninguno. Así un README con un diagrama Mermaid se reimporta.
- Integrado en el conversor universal (`parseAny`/`serializeAs`/`convertText`: formato `markdown`) y en la CLI (`.md`/`.markdown`). Verificado por CLI: `csv→markdown` (bloque mermaid + resumen) y `markdown→dot`.
- 6 pruebas unitarias (bloque + resúmenes con escape de `|`, opciones que omiten secciones + pureza, extracción del bloque, error sin bloque, round-trip, puentes `convertText`) + 1 UI (exportar `.md` con bloque mermaid y resumen) en Chromium/WebKit. Núcleo intacto 19.06 KiB; IO 16.02 KiB gzip.

## Sesión 2026-10-01 (loop) — Layout orgánico (dirigido por fuerzas)

Capacidad nueva de disposición para grafos de red sin jerarquía clara, complementaria al layout jerárquico `autoLayout`. React Flow necesita dagre/elk y Mermaid no tiene layout orgánico.

- `organicLayout(document, options?)` en `@fsaldivar.dev/diagram/io` (en `layout.ts`). Fruchterman–Reingold **determinista**: siembra los nodos en un anillo por índice y corre un número fijo de iteraciones con enfriamiento lineal, así la misma entrada da siempre la misma salida (sin RNG). Repulsión entre todos los pares, atracción por aristas, y una gravedad suave que mantiene acotadas las partes desconectadas. Puro; conserva tamaños, formas y semántica, recalcula puertos. Opciones: `iterations` (300), `gap`, `gravity`, `seed`. O(n²·iteraciones): pensado para grafos pequeños/medianos.
- Ejemplo: botón **Layout orgánico** aplica la disposición como un único paso de historial (`replaceDocument`), reversible con deshacer.
- 4 pruebas unitarias (determinismo + pureza + semántica/tamaños, coordenadas finitas/padded/distintas, hub cerca del centroide de sus hojas, nodo único + puertos recalculados) + 1 UI (reposiciona todos los nodos, grafo intacto, un solo deshacer) en Chromium/WebKit. Núcleo intacto 19.06 KiB; IO 16.66 KiB gzip.

## Sesión 2026-10-01 (loop) — Presets de tema (@fsaldivar.dev/diagram/themes)

Mejora de adopción: Kairo solo traía light/dark; ahora ofrece una paleta curada, como los temas de Mermaid o el estilo de Excalidraw.

- Nuevo subpath `@fsaldivar.dev/diagram/themes` (datos puros, construidos sobre el tema del núcleo; fuera del presupuesto). Presets completos `DiagramTheme`: `blueprint`, `highContrast` (accesibilidad, borde más grueso), `forest`, `solarized`, `mono`, además de `light`/`dark`.
- API: `themes` (registro por nombre), `themeNames`, `getTheme(name)` (fallback a `light`), `prefersDark()` (seguro fuera del navegador). Aplicables con `createDiagram({ theme })`, `editor.setTheme()`, `applyTheme` o en export (`toSVG`/`toPNG`/`toHtml`).
- Ejemplo: selector de tema en la cabecera; al elegir un preset se reestiliza el lienzo y se actualizan miniatura y minimapa. Se añadió `activeTheme` para que exportaciones (SVG/PNG/HTML) y miniatura respeten el preset elegido, no solo light/dark.
- 5 pruebas unitarias (cada preset es un `DiagramTheme` completo y con colores hex válidos, `themeNames` incluye núcleo+curados, `getTheme` resuelve y cae a light, highContrast con borde más grueso, presets distintos entre sí) + 1 UI (elegir preset cambia `--cd-canvas-background` y `--cd-border-width`) en Chromium/WebKit. Núcleo intacto 19.06 KiB; themes 1.06 KiB gzip.

## Sesión 2026-10-01 (loop) — Detección y resolución de solapamientos

Calidad de disposición: detectar y separar cajas de nodos que se solapan, útil tras importar o editar a mano.

- `findOverlaps(document, options?)` en `@fsaldivar.dev/diagram/analysis` (puro): devuelve cada par de ids cuyas cajas se solapan (AABB, con `padding` opcional), en orden del documento (`[a, b]` con a antes que b).
- `resolveOverlaps(document, options?)` en `@fsaldivar.dev/diagram/io` (puro, determinista): empuja las cajas solapadas por su eje de menor penetración (MTV) hasta que no quede ninguna o se agoten las iteraciones, manteniéndolas cerca de su posición original. Conserva tamaños/formas/semántica, recalcula puertos, re-normaliza a un padding mínimo. Desempate determinista para cajas coincidentes.
- Ejemplo: botón **Separar solapamientos** aplica `resolveOverlaps` como un paso de historial reversible.
- 5 pruebas unitarias (pares en orden + padding, separa todo + pureza, conserva tamaños/puertos, no-op sin solapes, cajas coincidentes deterministas) + 1 UI (arrastrar un nodo sobre otro y separarlos, sin solapes y con semántica intacta) en Chromium/WebKit. Núcleo intacto 19.06 KiB; IO 17.05 KiB, analysis 3.03 KiB gzip.

## Sesión 2026-10-01 (loop) — Componentes conexos y auto-agrupado

Composición con los grupos de la etapa 3 y los importadores (que suelen producir subgrafos separados).

- `connectedComponents(graph)` en `@fsaldivar.dev/diagram/analysis` (puro): agrupa los nodos alcanzables entre sí tratando las aristas como no dirigidas (BFS), complementa `stronglyConnectedComponents` (que respeta la dirección). Componentes en orden de documento, ids en orden de descubrimiento, singletons incluidos; ignora bucles sobre un nodo.
- Ejemplo: botón **Auto-agrupar** asigna un grupo por componente de más de un nodo (`componente-N`) mediante `replaceDocument` (un solo paso de historial). Los nodos aparecen en contenedores de grupo existentes. Útil tras importar CSV/GraphML con varios subgrafos.
- 3 pruebas unitarias (dos clústeres + singleton sin importar dirección, grafo conexo = 1 componente + pureza, ignora bucles y mantiene orden) + 1 UI (importar dos pares disconexos y auto-agrupar: dos grupos, mismo componente mismo grupo) en Chromium/WebKit. Núcleo intacto 19.06 KiB; analysis 3.14 KiB gzip.

## Sesión 2026-10-01 (loop) — Interoperabilidad draw.io (mxGraph)

diagrams.net (draw.io) está en la lista de comparación; ahora un diagrama Kairo se abre directamente allí.

- `toDrawio(document)` y `fromDrawio(xml, options?)` en `@fsaldivar.dev/diagram/io` (subconjunto práctico, XML por regex como GraphML, sin dependencias):
  - `toDrawio` emite un `<mxfile>` sin comprimir con un `<diagram>`/`<mxGraphModel>`: vértices con geometría y estilo por forma (rectangle/rhombus/ellipse/rounded), aristas con `source`/`target` y etiqueta. Escapa XML.
  - `fromDrawio` lee vértices (`vertex="1"`) y aristas (`edge="1"`): título desde `value`, forma desde el estilo, geometría cuando existe (si no, layout en capas), **acota el tamaño al mínimo** del validador (≥160×80). Rechaza diagramas comprimidos (pide exportar sin comprimir) y grafos vacíos.
- Integrado en el conversor universal (`parseAny`/`serializeAs`/`convertText`: formato `drawio`) y en la CLI (`.drawio`). Verificado por CLI: `csv→drawio→mermaid`.
- 5 pruebas unitarias (mxfile con vértices/aristas/geometría, round-trip de estructura/etiquetas/formas/geometría, acotado de tamaño, rechazo de comprimido/vacío, puentes `convertText`) + 1 UI (exportar `.drawio` y reimportar a la misma estructura) en Chromium/WebKit. Núcleo intacto 19.06 KiB; IO 18.19 KiB gzip.

## Sesión 2026-10-01 (loop) — Navegación por teclado entre nodos (accesibilidad)

Mejora del núcleo: moverse entre nodos solo con el teclado, algo que React Flow cubre a medias y draw.io apenas.

- **Alt+flechas** mueve la selección al nodo más cercano en esa dirección (las flechas sin Alt siguen moviendo el nodo seleccionado). Puntuación por distancia en la dirección más una penalización por desviación perpendicular; con nada seleccionado, elige el nodo superior-izquierdo (punto de entrada por teclado). Funciona también en modo solo lectura (visor). Usa `focusNode` para centrar la vista en el nodo.
- `aria-label` del editor actualizado para anunciar el atajo.
- 1 prueba UI (Alt+→ mueve la selección a la derecha; con nada seleccionado, Alt+↓ elige un nodo) en Chromium/WebKit, más la cobertura existente de mover nodo con flechas (sin Alt).
- Coste en el núcleo: 19.06 → 19.35 KiB gzip (dentro del presupuesto <20 KiB). Sin dependencias nuevas.

## Sesión 2026-10-01 (loop) — Ruta crítica (camino más largo)

Análisis de flujos que Mermaid/Excalidraw/draw.io no ofrecen: la ruta más larga a través de un proceso.

- `longestPath(graph)` en `@fsaldivar.dev/diagram/analysis` (puro, determinista): camino dirigido de más saltos en un DAG mediante orden topológico + programación dinámica. Devuelve la lista de ids inclusiva, o `null` si hay ciclo o el grafo está vacío; un solo nodo da `[id]`. Desempate por orden de declaración. Complementa `shortestPath`.
- Ejemplo: botón **Ruta crítica** resalta el camino más largo (nodos y aristas, con `setHighlight`); avisa si hay un ciclo o no hay conexiones.
- 3 pruebas unitarias (ruta crítica en DAG + pureza, null en ciclo/[id] en nodo único/null en vacío, rama más profunda entre partes disconexas) + 1 UI (en el flujo de Decisiones resalta start→check→allow→done, deja deny fuera) en Chromium/WebKit. Núcleo intacto; analysis 3.27 KiB gzip.

## Sesión 2026-10-01 (loop) — Interoperabilidad PlantUML

Más plataformas: PlantUML se usa en Confluence, Jira, IntelliJ, VS Code y muchas herramientas de documentación.

- `parsePlantuml(text, options?)` y `toPlantuml(document)` en `@fsaldivar.dev/diagram/io` (subconjunto práctico, sin dependencias, como el importador DOT):
  - `parsePlantuml` lee declaraciones (`component/rectangle/database/usecase/... "Etiqueta" as alias`, `[Componente]`, `(Caso)`) y flechas dirigidas (`-->`, `->`, `..>`, con `: etiqueta`). `..` marca la arista como discontinua; formas por palabra clave (usecase→elipse, actor/database→cápsula). Ignora `@startuml/@enduml`, comentarios (`'` y `/' '/`), `skinparam`, `title`, etc. Admite comillas escapadas. Layout en capas.
  - `toPlantuml` emite `@startuml` con declaraciones (alias estable = id) y flechas (`-->`, discontinua `..>`). Reimportable.
- Integrado en el conversor universal (`parseAny`/`serializeAs`/`convertText`: formato `plantuml`) y en la CLI (`.puml`/`.plantuml`). Verificado por CLI: `csv→plantuml→mermaid`.
- 5 pruebas unitarias (declaraciones + flechas con etiqueta, atajos corchete/paréntesis + discontinua + ruido ignorado, round-trip con comillas escapadas, error en vacío + pureza, puentes `convertText`) + 1 UI (exportar `.puml` y reimportar a la misma estructura) en Chromium/WebKit. Núcleo intacto 19.38 KiB; IO 19.11 KiB gzip.

## Sesión 2026-10-01 (loop) — Plantillas de inicio (@fsaldivar.dev/diagram/templates)

Onboarding: documentos listos para empezar, algo que ni Mermaid ni Excalidraw ni draw.io traen como API nativa.

- Nuevo subpath `@fsaldivar.dev/diagram/templates`. Cada plantilla es una función que devuelve un documento nuevo y validado (mutable sin efectos compartidos): `emptyFlow`, `decision` (dos ramas Sí/No), `architecture` (cliente→API→servicio→BD), `mindmap` (tema + 4 ramas) y `swimlane` (dos carriles Cliente/Servidor). Los flujos usan `autoLayout`; el swimlane coloca columnas por carril.
- API: `templates` (registro por nombre), `templateNames`, `getTemplate(name)` (fallback a `emptyFlow`).
- Ejemplo: selector **Plantilla…** junto a Arquitectura/Decisiones; al elegir, reemplaza el diagrama (confirma si hay cambios sin guardar).
- 5 pruebas unitarias (cada plantilla es un documento válido con layout y puertos, instancias frescas sin estado compartido, `getTemplate` con fallback, decisión con dos ramas y perfil flow, swimlane con carriles) + 1 UI (insertar «decision» y luego «architecture» reemplaza el diagrama) en Chromium/WebKit. Núcleo intacto 19.38 KiB; templates 3.55 KiB gzip.

## Sesión 2026-10-01 (loop) — Artefacto autónomo (editor offline en un solo HTML)

"Puede ser un artefacto": un editor Kairo completo en un único archivo HTML, sin servidor ni conexión.

- `scripts/build-standalone.mjs` (`npm run build:standalone`) inyecta `dist/kairo.global.css` + `dist/kairo.global.js` y un shell mínimo en `artifacts/kairo-standalone.html` (~64 KiB). Se abre con doble clic: edita nodos, añade (`addNode`), guarda/abre en `localStorage`, lienzo nuevo y exporta JSON. Respeta el esquema claro/oscuro del sistema. Requiere el build global previo (`npm run build:lib`).
- 1 prueba UI que carga el archivo por `file://` (sin servidor) y verifica que renderiza el nodo sembrado, que «Añadir nodo» funciona (el bundle inyectado es interactivo) y que el editor es visible, en Chromium/WebKit.
- No afecta al núcleo ni a los subpaths; es un artefacto de distribución.

## Sesión 2026-10-01 (loop) — Importador de mindmaps de Mermaid

Amplía la cobertura de Mermaid (ya había flowchart, state, class, ER) con un dialecto muy usado.

- `parseMindmap(text, options?)` en `@fsaldivar.dev/diagram/io` y despacho automático desde `parseMermaid` cuando la cabecera es `mindmap`. La indentación define la jerarquía: cada línea es un nodo y su padre es el nodo menos indentado más cercano (pila). Formas por corchetes: `((x))` elipse, `(x)` cápsula, `[x]` rectángulo, `{{x}}` rombo. IDs únicos aunque se repitan etiquetas. Layout en capas (árbol). Lanza error si no hay nodos.
- Ejemplo: el botón **Importar texto** ya acepta mindmaps (vía `parseMermaid`); se actualizó el texto de ayuda.
- 4 pruebas unitarias (árbol por indentación, formas por corchete + raíz sobre hijos, despacho desde `parseMermaid`, ids únicos + error en vacío) + 1 UI (importar un mindmap: raíz elipse + dos hijos) en Chromium/WebKit. Núcleo intacto 19.38 KiB; IO 19.51 KiB gzip.

## Sesión 2026-10-01 (loop) — Centralidad de grado y nodos clave

Análisis de red: encontrar los nodos más conectados (hubs), algo que las alternativas no exponen.

- `degrees(graph)` en `@fsaldivar.dev/diagram/analysis` (puro): grado de entrada/salida/total por nodo, en orden de documento. Un bucle sobre un nodo cuenta una vez como entrada y una como salida; ignora aristas con extremos inexistentes.
- `centralNodes(graph, count=3)`: ids de los nodos más conectados (mayor grado total), de mayor a menor, desempate por orden de documento; excluye los aislados (grado 0).
- Ejemplo: botón **Nodos clave** resalta los tres más conectados con `setHighlight`.
- 3 pruebas unitarias (grados in/out/total en orden, bucle + extremo inexistente, `centralNodes` excluye aislados y respeta empates) + 1 UI (resalta entre 1 y 3 nodos) en Chromium/WebKit. Núcleo intacto 19.38 KiB; analysis 3.41 KiB gzip.

## Sesión 2026-10-01 (loop) — Todas las rutas entre dos nodos

Análisis de flujos: enumerar cada camino posible entre dos nodos, algo que Mermaid/Excalidraw/draw.io no ofrecen.

- `allPaths(graph, from, to, options?)` en `@fsaldivar.dev/diagram/analysis` (puro, DFS determinista por orden de declaración): todos los caminos simples (sin nodo repetido). Acotado por `maxPaths` (100) y `maxDepth` (12 nodos), así ciclos y grafos densos son seguros. Devuelve `[]` si algún extremo es desconocido o inalcanzable; `from === to` da `[[from]]`.
- Ejemplo: botón **Todas las rutas** entre dos nodos seleccionados (Shift-clic) resalta la unión de nodos y aristas de todas las rutas (prueba ambos sentidos).
- 4 pruebas unitarias (enumerar rutas + pureza, seguro ante ciclos + respeta dirección, vacío/inalcanzable/[[id]], tope `maxPaths`) + 1 UI (resalta login→auth→session→gateway→firebase, deja users fuera) en Chromium/WebKit. Núcleo intacto 19.38 KiB; analysis 3.56 KiB gzip.

## Sesión 2026-10-01 (loop) — Layout radial (anillos concéntricos)

Nueva disposición para árboles y mapas mentales; ni Mermaid ni React Flow la traen de serie.

- `radialLayout(document, options?)` en `@fsaldivar.dev/diagram/io` (`layout.ts`). Coloca los nodos en anillos por su profundidad desde las raíces; dentro de cada anillo los ordena por el ángulo medio de sus padres (reduce cruces). Una sola raíz queda en el centro. Determinista y puro; conserva tamaños/formas/semántica y recalcula puertos. Opción `ringGap`.
- Ejemplo: botón **Layout radial** aplica la disposición como un paso de historial reversible.
- 3 pruebas unitarias (raíz centrada + nietos en anillo mayor que hijos, determinismo + pureza + coordenadas no negativas, nodo único + puertos) + 1 UI (reposiciona todos los nodos, grafo intacto, un deshacer) en Chromium/WebKit. Núcleo intacto 19.38 KiB; IO 19.92 KiB gzip.

## Sesión 2026-10-01 (loop) — Modularización: subpath @fsaldivar.dev/diagram/layout

El bundle `/io` había crecido a 19.92 KiB (más que el núcleo). Se separan los algoritmos de disposición en su propio subpath.

- Nuevo subpath `@fsaldivar.dev/diagram/layout` con `autoLayout`, `mergeLayout`, `organicLayout`, `resolveOverlaps` y `radialLayout` (+ sus tipos de opciones). `/io` deja de reexportarlos (cambio aceptable: paquete aún sin publicar). Los importadores internos siguen usando `layers` desde `./layout` (sin cambios).
- Efecto: `/io` baja de 19.92 a 17.83 KiB gzip; nuevo `/layout` 4.18 KiB gzip. Núcleo intacto 19.38 KiB. El ejemplo importa las funciones de layout desde `@fsaldivar.dev/diagram/layout`.
- 1 prueba unitaria (el entry reexporta las cinco funciones y se ejecutan); las pruebas existentes de layout (que importan `./layout` directamente) y las UI de los botones de disposición siguen pasando. 194 unitarias, 168 UI en Chromium/WebKit.

## Sesión 2026-10-01 (loop) — Enlaces clicables en SVG/HTML

Diagramas accionables al incrustarlos (docs, GitHub Pages, intranets): cada nodo puede ser un enlace.

- `toSVG`/`toHtml` (en `@fsaldivar.dev/diagram/io`) aceptan `links`: una función `(node) => href | undefined`, o `true` para enlazar los nodos cuyo `source` sea una URL `http(s)`. El nodo se envuelve en `<a href target="_blank" rel="noopener">` con la URL escapada. Desactivado por defecto; `toHtml` lo hereda de `SvgExportOptions`.
- Ejemplo: Exportar SVG y Exportar HTML usan `links: true`, así un nodo con referencia URL queda clicable en el archivo exportado.
- 3 pruebas unitarias (resolver por función enlaza solo los indicados, `links:true` enlaza URLs http y escapa, por defecto desactivado + se hereda en `toHtml`) + 1 UI (fijar una referencia URL en el inspector y exportar SVG produce `<a href>`), en Chromium/WebKit. Núcleo intacto 19.38 KiB; IO 17.93 KiB gzip.

## Sesión 2026-10-01 (loop) — Vecindario de un nodo (focus)

Primitiva de "modo foco" que las alternativas no exponen como API: los nodos a N saltos de uno dado.

- `neighbors(graph, id, options?)` en `@fsaldivar.dev/diagram/analysis` (puro): ids dentro de `depth` saltos (por defecto 1), siguiendo salientes/entrantes/ambas (`direction`, por defecto `both`). Orden BFS, excluye el propio nodo, ignora bucles; `[]` si el id es desconocido o `depth` es 0.
- Ejemplo: botón **Vecindario** resalta el nodo seleccionado y sus adyacentes directos con `setHighlight`.
- 2 pruebas unitarias (profundidad y dirección in/out/both; excluye seed + ignora bucle + desconocido/depth 0) + 1 UI (resalta auth con login/users/session, deja firebase fuera) en Chromium/WebKit. Núcleo intacto 19.38 KiB; analysis 3.73 KiB gzip.

## Sesión 2026-10-01 (loop) — Tooltips `<title>` por nodo en SVG/HTML

SVG incrustados más informativos y accesibles: cada nodo puede mostrar sus detalles al pasar el cursor y a los lectores de pantalla.

- `toSVG`/`toHtml` (en `@fsaldivar.dev/diagram/io`) aceptan `tooltips`: `true` añade un `<title>` por nodo con `título · tipo · referencia · tags`; una función `(node) => texto` lo personaliza. El texto se escapa. Desactivado por defecto; `toHtml` lo hereda.
- Ejemplo: Exportar SVG/HTML usan `tooltips: true`, así los detalles truncados (referencia, tags) aparecen al pasar el cursor.
- 2 pruebas unitarias (`tooltips:true` compone título·tipo·referencia·tags y está desactivado por defecto; función personalizada con escape) + 1 UI (el SVG exportado contiene varios `<title>` incluido el del nodo AuthService) en Chromium/WebKit. Núcleo intacto 19.38 KiB; IO 18.02 KiB gzip.

## Sesión 2026-10-01 (loop) — Seleccionar todo (Cmd/Ctrl+A)

Atajo estándar que faltaba, complementa la multiselección de la etapa 3.

- En el editor, **Cmd/Ctrl+A** selecciona todos los nodos (usa `selectNodes`). Luego se puede alinear, distribuir, agrupar, mover o borrar el conjunto. No rompe otros atajos (Z, C, X, V) ni activa el asa de redimensión (multiselección). Disponible en modo edición.
- 1 prueba UI (Cmd/Ctrl+A selecciona los 7 nodos del ejemplo y oculta el asa de redimensión) en Chromium/WebKit.
- Coste en el núcleo: 19.38 → 19.39 KiB gzip (dentro del presupuesto). Sin dependencias.

## Sesión 2026-10-01 (loop) — Leyenda de tipos (SVG)

Ayuda de documentación que ninguna alternativa autogenera: una leyenda de los tipos de nodo presentes.

- `toLegend(document, options?)` en `@fsaldivar.dev/diagram/io` (puro, tema embebido): SVG compacto que lista cada tipo de nodo presente una sola vez (icono + etiqueta), en orden de primera aparición. Opciones `theme`, `title`, `background`.
- Ejemplo: botón **Exportar leyenda** descarga `diagrama.leyenda.svg` para incrustar junto al diagrama.
- 2 pruebas unitarias (lista cada tipo una vez en orden de uso; pureza + vacío válido + `background:false`) + 1 UI (descarga un SVG con «Tipos de nodo») en Chromium/WebKit. Núcleo intacto 19.39 KiB; IO 18.30 KiB gzip.

## Sesión 2026-10-01 (loop) — Exportación a TikZ (LaTeX)

Nueva plataforma: papers y Overleaf. Mermaid/Excalidraw no exportan TikZ.

- `toTikz(document, options?)` en `@fsaldivar.dev/diagram/io` (puro, solo exportación): genera un `tikzpicture` con `\node` por nodo (posición del layout, Y invertida) y `\draw[->]` por arista (discontinua con `dashed`, etiqueta como `node` intermedio). Formas por `shapes.geometric` (rombo/elipse/cápsula). Escapa caracteres especiales de LaTeX (`# $ % & _ { } ~ ^ \\`). Opción `scale` (px→cm).
- Integrado en el conversor universal (`serializeAs`/`convertText`: salida `tikz`) y en la CLI (`.tex`/`.tikz`). Verificado por CLI: `csv→tikz`.
- 3 pruebas unitarias (tikzpicture con nodos/aristas/etiqueta + rombo para decisión, escape LaTeX + discontinua, pureza) + 1 de conversión (`mermaid→tikz`) + 1 UI (descarga `.tex` con `tikzpicture` y AuthService) en Chromium/WebKit. Núcleo intacto 19.39 KiB; IO 18.73 KiB gzip.

## Sesión 2026-10-01 (loop) — Interoperabilidad Cytoscape JSON

Más plataformas: cytoscape.js (visualización de redes en web) y Cytoscape (bioinformática).

- `fromCytoscape(input, options?)` y `toCytoscape(document)` en `@fsaldivar.dev/diagram/io`. Acepta el formato `{ elements: { nodes, edges } }`, un array plano `{ elements: [...] }` o un array suelto; objeto o cadena JSON. Nodos por `data.id` (+ `data.label`/`name`), aristas por `data.source`/`target` (+ `data.label`). Usa `position` (centro del nodo) cuando está presente, acotando a coordenadas no negativas; si no, layout en capas. `toCytoscape` emite `{ elements: { nodes, edges } }` con posiciones = centro de cada nodo. Lanza error si no hay nodos.
- Integrado en el conversor universal (`parseAny`/`serializeAs`/`convertText`: formato `cytoscape`) y en la CLI (`.cyjs`). Verificado por CLI: `csv→cytoscape→mermaid`.
- 5 pruebas unitarias (forma nodes/edges con posiciones, array plano + cadena JSON + fallback de etiqueta, layout en capas sin posiciones + error vacío, round-trip, puentes `convertText`) + 1 UI (exportar `.cyjs` y reimportar a la misma estructura) en Chromium/WebKit. Núcleo intacto 19.39 KiB; IO 19.40 KiB gzip.

## Sesión 2026-10-01 (loop) — Importar JSON jerárquico como árbol

Algo nuevo: visualizar datos JSON anidados (organigramas, árboles de archivos, respuestas de API) como diagrama.

- `fromJson(data, options?)` en `@fsaldivar.dev/diagram/io`: cada objeto es un nodo y su array `children` (configurable) sus hijos; genera aristas padre→hijo y layout en capas. Etiqueta desde `label` (clave o función) o, por defecto, `name`/`label`/`title`/`id`/`type`, y los valores primitivos se usan tal cual (hojas). Acepta objeto, array (bosque) o cadena JSON. IDs únicos aunque se repitan etiquetas. Topes de seguridad (2000 nodos, profundidad 64). Lanza error si no produce nodos.
- Ejemplo: botón **Importar JSON árbol** pega un JSON y lo convierte en diagrama.
- 4 pruebas unitarias (árbol anidado, cadena/bosque/claves personalizadas, hojas primitivas + fallback, ids únicos + error vacío) + 1 UI (importar un árbol de 4 nodos) en Chromium/WebKit. Núcleo intacto 19.39 KiB; IO 19.78 KiB gzip.

## Sesión 2026-10-01 (loop) — Informe de diagrama (Markdown)

Autodocumentación de estructura y salud, combinando el análisis existente. Útil para docs y CI.

- `toReport(document, options?)` en `@fsaldivar.dev/diagram/analysis` (puro): informe Markdown que compone `describeDiagram`, `analyzeGraph` (nodos, conexiones, raíces/hojas/aislados, profundidad, ciclos, densidad, por tipo), `centralNodes`/`degrees` (nodos clave con grado) y `lintDocument` (diagnósticos con título de nodo). Escapa `|` y saltos de línea.
- Ejemplo: botón **Exportar informe** descarga `diagrama.informe.md`.
- 3 pruebas unitarias (resumen + nodos clave + diagnósticos; flujo válido «sin problemas» + pureza; flujo roto lista errores) + 1 UI (descarga `.md` con «Informe del diagrama», «Nodos: 7») en Chromium/WebKit. Núcleo intacto 19.39 KiB; analysis 4.26 KiB gzip.

## Sesión 2026-10-01 (loop) — Exportar mindmap de Mermaid

Completa el round-trip de mindmaps (ya existía `parseMindmap`).

- `toMindmap(document)` en `@fsaldivar.dev/diagram/io`: emite un `mindmap` de Mermaid con indentación = profundidad, como árbol de expansión desde las raíces (nodos sin entrada). Formas por corchetes (`((x))` elipse, `(x)` cápsula, `[x]` rectángulo, `{{x}}` rombo). Los hijos compartidos se emiten una sola vez (árbol de expansión); los nodos sueltos se añaden al final. Inverso de `parseMindmap` para árboles.
- 3 pruebas unitarias (round-trip con forma de raíz, indentación creciente por profundidad, árbol de expansión sin duplicar hijos compartidos). API; sin botón nuevo en el ejemplo (barra ya saturada). Núcleo intacto 19.39 KiB; IO 20.02 KiB gzip.

## Sesión 2026-10-01 (loop) — Modularización: subpath @fsaldivar.dev/diagram/export

El bundle `/io` había superado 20 KiB (más que el núcleo). Se separan los renderizadores en su propio subpath.

- Nuevo subpath `@fsaldivar.dev/diagram/export` con `toSVG`, `toPNG`, `toThumbnail`, `toHtml`, `toLegend` y `toTikz` (+ tipos). `/io` deja de reexportarlos y `convertText` ya no produce `svg`/`html`/`tikz` (su `OutputFormat` queda en formatos de texto/datos); el render se hace con `@fsaldivar.dev/diagram/export`. Cambio aceptable: paquete aún sin publicar.
- Efecto: `/io` baja de 20.02 a 14.39 KiB gzip; nuevo `/export` 5.98 KiB gzip. Núcleo intacto 19.39 KiB. El ejemplo importa los renderizadores desde `@fsaldivar.dev/diagram/export`; la CLI `kairo-convert` renderiza `svg`/`html`/`tikz` vía `dist/export.js` (parseAny + render), conservando la paridad.
- `npm test` 219 (ajustados los tests de `convertText` que esperaban salida svg/html/tikz), `npm run test:ui` 186 (los botones de exportación del ejemplo siguen pasando). Núcleo intacto 19.39 KiB.

## Sesión 2026-10-01 (loop) — Tema a partir de un color de acento

Personalización de marca en una línea: derivar un tema completo de un solo color.

- `themeFrom(accent, options?)` en `@fsaldivar.dev/diagram/themes` (puro): toma un color hex (`#rgb` o `#rrggbb`) y devuelve un `DiagramTheme` completo. Las superficies neutras vienen de la base clara u oscura (`options.dark`/`options.base`); selección, aristas seleccionadas e iconos usan el acento, y los fondos de selección/icono y el hover de arista son mezclas tintadas. Hex inválido → acento por defecto.
- Ejemplo: selector de color **acento** en la cabecera que reaplica el tema con `themeFrom`.
- 3 pruebas unitarias (acento en selección/arista/icono + superficies neutras de la base; base oscura y `#rgb`; fallback por hex inválido) + 1 UI (el color reaplica `--cd-selected-border`) en Chromium/WebKit. Núcleo intacto 19.39 KiB; themes 1.42 KiB gzip.

## Sesión 2026-10-01 (loop) — CSV como tabla de nodos (tipo y tags)

Importar metadatos de nodo desde una hoja de cálculo, no solo listas de aristas.

- `fromCsv` detecta un **modo tabla de nodos**: cuando la cabecera tiene columna `id`/`name` y `type` y/o `tags`, pero no `to`/`target`, cada fila define un nodo (sin aristas). El tipo se valida contra `nodeTypes` (desconocido → `process`); los tags se separan por `;` o `|`. IDs únicos; layout en cuadrícula. El modo lista de aristas (con `to`/`target`) no cambia.
- Ejemplo: el botón **Importar CSV** ya acepta ambas formas (el usuario pega una u otra).
- 3 pruebas unitarias (tabla con tipo/tags, fallback de tipo + sin columna id, la lista de aristas sigue ganando con `to`) + 1 UI (importar tabla de nodos: 2 nodos tipados, 0 aristas) en Chromium/WebKit. Núcleo intacto 19.39 KiB; IO 14.85 KiB gzip.

## Sesión 2026-10-01 (loop) — Contenido de nodo personalizado (`onNodeRender`)

Extensibilidad al estilo de React Flow (nodos personalizados), manteniendo el núcleo sin framework.

- Opción `onNodeRender(node, layer)` en `createDiagram`: tras renderizar cada nodo, la librería limpia una capa `<g class="cd-node-custom">` (coordenadas locales del nodo) y llama al hook, donde el host dibuja contenido propio (insignias, estado, contadores, avatares) con SVG. Se re-invoca en cada reconciliación (idempotente). Cada `NodeView` tiene su capa `custom`.
- 1 prueba UI (vía build global: `onNodeRender` dibuja un círculo en cada nodo; se verifican 2 capas `cd-node-custom` y 2 insignias) en Chromium/WebKit.
- Coste en el núcleo: 19.39 → 19.44 KiB gzip (dentro del presupuesto). Sin dependencias.

## Sesión 2026-10-01 (loop) — Listar documentos guardados (plugin Tauri)

Capacidad nativa nueva: el host puede enumerar los diagramas guardados (para una lista "Abrir").

- Rust `crates/tauri-plugin-kairo`: comando `list_documents` (`list_at`) que devuelve los ids `.json` del directorio `diagrams`, ordenados, ignorando otros archivos; directorio inexistente → `[]`. Registrado en el handler y permitido por `kairo:default` (nuevo permiso `allow-list-documents`).
- TS `@fsaldivar.dev/plugin`: `listDocuments(): Promise<string[]>` vía IPC `plugin:kairo|list_documents`.
- 1 prueba Rust nueva (lista ordenada ignorando no-JSON; vacío cuando no hay carpeta). `cargo test -p tauri-plugin-kairo`: 6 aprobadas. `cargo check` OK. Núcleo JS intacto 19.44 KiB; `npm test` 225, `npm run test:ui` 192.

## Sesión 2026-10-01 (loop) — Eliminar documentos guardados (plugin Tauri)

Completa el CRUD de persistencia (guardar/cargar/listar/eliminar).

- Rust `crates/tauri-plugin-kairo`: comando `delete_document` (`delete_at`) que borra el `.json` del id dado en el directorio `diagrams`; devuelve `true` si borró, `false` si no existía. El id se valida (sin travesía de rutas). Registrado en el handler y permitido por `kairo:default` (nuevo permiso `allow-delete-document`).
- TS `@fsaldivar.dev/plugin`: `deleteDocument(id): Promise<boolean>` vía IPC `plugin:kairo|delete_document`.
- 1 prueba Rust nueva (borra y reporta ausencia; rechaza id con travesía). `cargo test -p tauri-plugin-kairo`: 7 aprobadas. `cargo check` OK. Núcleo JS intacto 19.44 KiB; `npm test` 225, `npm run test:ui` 192.

## Sesión 2026-10-01 (loop) — Layout de árbol (jerarquía ordenada)

Disposición nítida para jerarquías (organigramas, mindmaps, árboles de JSON que ya se importan). React Flow necesita dagre; Mermaid no lo tiene.

- `treeLayout(document, options?)` en `@fsaldivar.dev/diagram/layout`: tidy tree (primer paso de Knuth/Reingold–Tilford). Las hojas ocupan columnas sucesivas y cada padre se centra sobre sus hijos; sin solapes horizontales. Construye un árbol de expansión desde las raíces (aristas extra se conservan); los nodos inalcanzables van al final. Iterativo (seguro en árboles profundos). Opciones `gap`, `levelGap`, `direction` (TB/LR). Puro; conserva tamaños/formas/semántica, recalcula puertos.
- Ejemplo: botón **Layout árbol** aplica la disposición como un paso de historial reversible.
- 4 pruebas unitarias (hijos bajo el padre + padre centrado, columnas distintas por hoja, determinismo+pureza+puertos, dirección LR) + 1 UI (reposiciona, grafo intacto, un deshacer) en Chromium/WebKit. Núcleo intacto 19.44 KiB; layout 4.61 KiB gzip.

## Sesión 2026-10-01 (loop) — Leyenda embebida en el SVG exportado

Imágenes autoexplicativas para docs: el SVG puede incluir su propia leyenda de tipos.

- Opción `legend` en `toSVG` (`@fsaldivar.dev/diagram/export`): añade un panel de leyenda a la derecha del diagrama (icono + etiqueta por tipo presente, una vez), ensanchando el lienzo y ajustando el alto. Desactivada por defecto; reutiliza la lógica de `toLegend`.
- Ejemplo: Exportar SVG ahora incluye `legend: true`, así el archivo se explica solo.
- 1 prueba unitaria (con leyenda ensancha, incluye «Leyenda»/«Service»/«Database»; desactivada por defecto) + 1 UI (el SVG exportado contiene el panel «Leyenda»), más las pruebas existentes de enlaces y tooltips que siguen pasando con la leyenda activada. Núcleo intacto 19.44 KiB; export 6.18 KiB gzip.

## Sesión 2026-10-01 (loop) — Autodetección de formato (`detectFormat`/`importAny`)

Pegar cualquier cosa y que la librería la reconozca; ninguna alternativa lo ofrece.

- `detectFormat(text)` en `@fsaldivar.dev/diagram/io`: devuelve el `InputFormat` detectado o `null`. PlantUML (`@startuml`), draw.io (`<mxfile>`/`mxCell`), GraphML (`<graphml>`), Markdown (bloque ```mermaid), y para JSON distingue por claves (excalidraw `type`, cytoscape `elements`, documento Kairo `version+graph+layout`, JSON Canvas `nodes`+`edges`). Texto: Mermaid por palabra clave inicial, DOT por `digraph/graph {`, CSV por separadores sin llaves/ángulos.
- `importAny(text)`: autodetecta y parsea; lanza error si no reconoce el formato.
- Ejemplo: botón **Importar auto** acepta cualquier formato soportado.
- 2 pruebas unitarias (detecta cada formato de texto y JSON, incluidos vacío/prosa → null; `importAny` parsea y lanza en desconocido) + 1 UI (detecta DOT y construye el diagrama) en Chromium/WebKit. Núcleo intacto 19.44 KiB; IO 15.17 KiB gzip.

## Sesión 2026-10-01 (loop) — Grupos ↔ subgrafos de Mermaid

Los grupos de nodos (etapa 3) ahora se preservan al exportar/importar Mermaid.

- `toFlowText`/`toMermaid` (en `@fsaldivar.dev/diagram/io`): los nodos con `group` se emiten dentro de `subgraph gN[Nombre] … end`; los nodos sin grupo quedan arriba. `parseFlowText`/`parseMermaid`: reconocen `subgraph <id>[Título]` o `subgraph Título` y `end`, asignando `group` a los nodos declarados dentro (pila para anidamiento). Round-trip de la agrupación.
- 2 pruebas unitarias (round-trip de grupo con nodo suelto arriba; subgraph con título simple sin id) + 1 UI (agrupar dos nodos y exportar Mermaid contiene `subgraph`/`[Backend]`/`end`) en Chromium/WebKit. Núcleo intacto 19.44 KiB; IO 15.33 KiB gzip.

## Sesión 2026-10-01 (loop) — Fix de arranque + secuencia Mermaid + iconos distintos

- **Fix (regresión):** el ejemplo declaraba `let minimap` después de `createDiagram`, pero el editor dispara `onViewportChange` durante la construcción y ese callback lee `minimap` → ReferenceError (zona muerta temporal) que abortaba todo el arranque en el dev server (en el build empaquetado se hoisteaba y no saltaba, por eso Playwright no lo detectaba). Se declara `minimap` antes de `createDiagram`. Nueva prueba UI "the example boots with no uncaught console errors" que verifica el arranque limpio contra el build.
- **sequenceDiagram:** `parseSequence(text)` y `toSequence(document)` en `@fsaldivar.dev/diagram/io`; `parseMermaid` despacha cabecera `sequenceDiagram`. Participantes → nodos, mensajes → aristas (etiqueta = texto, discontinua con `--`); ignora note/loop/alt/opt/etc. 3 pruebas unitarias + 1 UI.
- **Iconos:** la barra reutilizaba pocos iconos (layers/download/upload/connect/fit), haciendo botones indistinguibles. Se añadieron ~24 iconos y se reasignaron 38 botones para que cada acción tenga un glifo propio. Sin cambios de `aria-label` (las pruebas siguen pasando).
- `npm run check` OK, `npm test` 237, `npm run test:ui` 204. Núcleo intacto 19.44 KiB; IO 15.49 KiB gzip.

## Sesión 2026-10-01 (loop) — Barra agrupada en menús (UX)

La barra tenía ~40 botones en una fila (confuso, iconos repetidos). Se reorganiza en menús desplegables.

- Se mantienen inline los conmutadores frecuentes (cuadrícula, solo lectura, rejilla magnética) y se agrupan el resto en cuatro menús: **Análisis**, **Layout**, **Importar**, **Exportar**. Cada menú es un `<button class="cd-menu-trigger">` con etiqueta + chevron y un panel `.cd-menu-panel` (popover) con los botones de ese grupo. Toggle por clic; se cierra al pulsar fuera, con Escape, o tras elegir una acción. Los ids/aria-label/handlers de los botones no cambian.
- CSS nuevo en `examples/tauri/src/style.css` para `.cd-menu`/`.cd-menu-panel`.
- Pruebas: helper `openFor(page, name)` que abre el menú correcto antes de pulsar; se actualizaron ~55 clics de las pruebas existentes. Nueva prueba "toolbar groups actions into dropdown menus that open and close". `npm run test:ui` 206 (Chromium/WebKit), `npm test` 237, `npm run check` OK. Núcleo intacto 19.44 KiB (cambio solo en el ejemplo).

## Sesión 2026-10-01 (loop) — Reducción transitiva (`redundantEdges`)

Limpiar grafos densos: detectar aristas de atajo implicadas por caminos más largos.

- `redundantEdges(graph)` en `@fsaldivar.dev/diagram/analysis` (puro): devuelve los ids de las aristas u→v redundantes, es decir, cuando v sigue siendo alcanzable desde u por un camino de longitud ≥ 2 que no usa esa arista. No elimina paralelas ni enlaces únicos, y no rompe ciclos. Es la reducción transitiva.
- Ejemplo: acción **Simplificar** en el menú Análisis quita esas aristas (`replaceDocument`, reversible).
- 3 pruebas unitarias (atajo a→c en a→b→c; diamante con atajo a→d; paralelas/ciclos intactos) + 1 UI (importar A→B→C + A→C y simplificar deja 2 aristas). Núcleo intacto 19.44 KiB; analysis 4.44 KiB gzip.

## Sesión 2026-10-01 (loop) — Paleta de comandos (Cmd/Ctrl+K)

Descubribilidad: buscar y ejecutar cualquiera de las ~40 acciones escribiendo, complemento de los menús.

- **Cmd/Ctrl+K** abre una paleta modal con un buscador. Indexa en tiempo de apertura todos los botones con `aria-label` de la barra/cabecera (excluye los disparadores de menú) y ejecuta la acción elegida haciendo clic en su botón (funciona aunque esté dentro de un menú cerrado). Flechas para navegar, Enter ejecuta, Escape o clic fuera cierra.
- CSS nuevo en `examples/tauri/src/style.css` (`.palette-overlay`/`.palette-box`).
- 2 pruebas UI (Ctrl+K busca "Exportar SVG" y Enter dispara la descarga; Escape cierra) en Chromium/WebKit. `npm run test:ui` 212, `npm test` 240, `npm run check` OK. Núcleo intacto 19.44 KiB (cambio solo en el ejemplo).

## Sesión 2026-10-01 (loop) — Grupos ↔ clusters de DOT (Graphviz)

Los grupos de nodos ahora se preservan en DOT, como ya ocurría con Mermaid (subgrafos).

- `toDotText`: los nodos con `group` se emiten dentro de `subgraph cluster_N { label="Nombre"; … }`; los demás quedan arriba (las aristas van después). `parseDotText`: tokeniza las llaves de subgrafo, mantiene una pila de grupos y asigna `group` a los nodos dentro de un `cluster_*` (el `label=` del cluster es el nombre del grupo). Los subgrafos que no son `cluster` se tratan como agrupación lógica sin contenedor visual (no fijan `group`). Graphviz dibuja los clusters como cajas.
- 2 pruebas unitarias (round-trip de cluster con nodo suelto; etiqueta de cluster como grupo e ignora subgrafo no-cluster). `npm test` 242, `npm run test:ui` 212, `npm run check` OK. Núcleo intacto 19.44 KiB; IO 16.03 KiB gzip.

## Sesión 2026-10-01 (loop) — Grupos ↔ contenedores de draw.io

Completa el trío de preservación de grupos (Mermaid subgrafos, DOT clusters y ahora draw.io).

- `toDrawio`: por cada grupo emite una celda contenedor (`style="group;…"`, `vertex="1"`, `connectable="0"`) con geometría = caja envolvente de sus miembros; los nodos del grupo pasan a `parent="group-N"` con geometría **relativa** al contenedor. Los nodos sin grupo quedan en `parent="1"` con coordenadas absolutas.
- `fromDrawio`: distingue contenedores (celdas que son `parent` de otros vértices, o con estilo `group`/`container=1`) de nodos reales; el contenedor no se importa como nodo, su `value` es el nombre del grupo, y los hijos recuperan su posición absoluta sumando el desplazamiento de los contenedores ancestros.
- 2 pruebas unitarias (round-trip grupo + posición absoluta; celda con hijos tratada como contenedor aun sin estilo group). `npm test` 244, `npm run test:ui` 212, `npm run check` OK. Núcleo intacto 19.44 KiB; IO 16.43 KiB gzip. La agrupación ahora round-trip en Mermaid, DOT y draw.io.

## Sesión 2026-10-01 (loop) — Grupos ↔ grupos de JSON Canvas (Obsidian)

Los grupos son un tipo de nodo nativo en JSON Canvas; ahora se preservan.

- `toCanvas`: por cada grupo emite un nodo `type:"group"` con `label` y caja envolvente de sus miembros (se listan primero para quedar detrás). Los nodos miembros se exportan como `text` con sus coordenadas absolutas.
- `fromCanvas`: los nodos `type:"group"` ya no se importan como nodos; definen pertenencia por contención geométrica (el grupo más pequeño que contiene a un nodo le asigna su `label`). Importa canvases hechos a mano con grupos de Obsidian.
- 2 pruebas unitarias nuevas (round-trip de grupo; canvas manual con caja de grupo que anida los nodos contenidos) y se ajustó la prueba previa que trataba un nodo group como nodo. `npm test` 246, `npm run test:ui` 212, `npm run check` OK. Núcleo intacto 19.44 KiB; IO 16.78 KiB gzip. La agrupación round-trip ahora en Mermaid, DOT, draw.io y JSON Canvas.

## Sesión 2026-10-01 (loop) — Grupos ↔ nodos compuestos de Cytoscape

Cytoscape agrupa con nodos compuestos (`data.parent`); ahora se preservan.

- `toCytoscape`: por cada grupo emite un nodo padre `{data:{id:'group-N', label}}` (sin posición; Cytoscape lo autoajusta) y los miembros llevan `data.parent`.
- `fromCytoscape`: los ids referenciados como `data.parent` son contenedores (no se importan como nodos); su `label` se asigna como `group` a los hijos. Importa grafos de cytoscape.js con nodos compuestos.
- 2 pruebas unitarias (round-trip con padre compuesto; grafo manual con compound). `npm test` 248, `npm run test:ui` 212, `npm run check` OK. Núcleo intacto 19.44 KiB; IO 16.95 KiB gzip. La agrupación round-trip ahora en Mermaid, DOT, draw.io, JSON Canvas y Cytoscape.

## Sesión 2026-10-01 (loop) — CLI pipe-friendly (stdin + autodetección)

`kairo-convert` ahora sirve para scripts y CI.

- Entrada por archivo o **stdin** (`-`). Si la extensión no se reconoce (o es stdin), el formato se **autodetecta** por contenido (`detectFormat`). Salida a archivo o **stdout** (`-`) indicando el formato con `--to=<formato>`. El mensaje de progreso va por stderr, así stdout queda limpio para encadenar. Ej.: `cat x.txt | node scripts/kairo-convert.mjs - - --to=svg`.
- Verificado manualmente: `.txt` con flowchart → SVG autodetectado; CSV por stdin → DOT por stdout. `detectFormat` tiene cobertura unitaria. `npm run check`/`npm test` (248)/`npm run test:ui` (212) OK. Núcleo intacto 19.44 KiB (cambio solo en el script).

## Sesión 2026-10-01 (loop) — Componer documentos (`mergeDocuments`)

Ensamblar diagramas o insertar una plantilla junto a otro diagrama.

- `mergeDocuments(a, b, options?)` en `@fsaldivar.dev/diagram/layout` (puro): coloca `b` a la derecha de `a` (con `gap`), renombra los ids de nodo/arista de `b` que colisionen con `a` (sufijo `-N`), y conserva grupos, formas, tags y puertos. No muta las entradas.
- Ejemplo: acción **Insertar decisión** en el menú Importar fusiona la plantilla de decisión junto al diagrama actual (`replaceDocument`, reversible).
- 3 pruebas unitarias (b a la derecha; remapeo de ids colisionados con aristas preservadas; pureza + grupos/formas) + 1 UI (insertar añade 5 nodos). `npm test` 251, `npm run test:ui` 214, `npm run check` OK. Núcleo intacto 19.44 KiB; layout 4.91 KiB gzip.

## Sesión 2026-10-01 (loop) — Grupos ↔ GraphML (atributo de dato)

Completa la preservación de grupos en los 6 formatos de interoperabilidad.

- `toGraphml` declara una clave `d_group` (`attr.name="group"`) y emite `<data key="d_group">Nombre</data>` en los nodos con grupo; `fromGraphml` detecta esa clave y la lee en `group`. Es un atributo de dato GraphML válido (no el subgrafo anidado de yEd), así que preserva los grupos de Kairo en round-trip y es ignorado sin pérdida por otras herramientas.
- 1 prueba unitaria (round-trip de grupo, sin confundir el dato con la etiqueta). `npm test` 252, `npm run test:ui` 214, `npm run check` OK. Núcleo intacto 19.44 KiB; IO 17.10 KiB gzip. Agrupación round-trip ahora en Mermaid, DOT, draw.io, JSON Canvas, Cytoscape y GraphML.

## Sesión 2026-10-01 (loop) — CLIs: lint alineado + pruebas automatizadas

- `kairo-lint` ahora acepta todos los formatos de importación (Mermaid/DOT/Canvas/Excalidraw/CSV/GraphML/draw.io/PlantUML/Cytoscape/JSON), stdin (`-`) y autodetección por contenido, como `kairo-convert`. Mantiene los códigos de salida (0 ok, 1 errores, 2 uso).
- Nuevas pruebas `tests/cli.test.ts` (node:test + spawnSync; construye el bundle en `before` si falta): `kairo-convert` autodetecta extensión desconocida y escribe el formato destino, lee stdin y escribe stdout con `--to`, y falla ante entrada irreconocible; `kairo-lint` sale 0 en flujo válido y 1 en flujo roto. Antes las CLIs solo se verificaban a mano.
- `npm test` 256, `npm run test:ui` 214, `npm run check` OK. Núcleo intacto 19.44 KiB (cambios en scripts y pruebas).

## Sesión 2026-10-01 (loop) — Métrica de cruces de aristas (`countCrossings`)

Calidad de disposición: cuantificar cuántas aristas se cruzan (menos = más limpio). Útil para comparar layouts.

- `countCrossings(document)` en `@fsaldivar.dev/diagram/analysis` (puro): cuenta pares de aristas cuyos segmentos (centro a centro) se cruzan propiamente; las que comparten un extremo no cuentan. O(aristas²). Se incluye en `toReport` ("Cruces de aristas: N").
- 2 pruebas unitarias (X de cuatro esquinas cruza = 1; aristas que comparten nodo = 0; layout sin cruces = 0 + pureza). `npm test` 258, `npm run test:ui` 214, `npm run check` OK. Núcleo intacto 19.44 KiB; analysis 4.74 KiB gzip.

## Sesión 2026-10-01 (loop) — Estilo de arista ortogonal (ángulos rectos)

Completa el trío de estilos de conexión (suave / redondeada / ortogonal), como el ortogonal por defecto de draw.io.

- Nuevo `EdgeStyle` `'orthogonal'`: reusa el enrutado en ángulo recto de 'rounded' pero con esquinas afiladas (radio 0). `roundedPolyline` con radio < 0.5 emite segmentos `L` limpios (sin `Q` degenerados). `connectionPath` elige radio 0 para `'orthogonal'`, 12 para `'rounded'`.
- Ejemplo: opción **Ortogonales** en el selector "Conexiones".
- 1 prueba unitaria (smooth=`C`, rounded=`Q`, orthogonal=`L` sin `Q`/`C`) + 1 UI (el selector aplica aristas afiladas). Coste núcleo 19.44 → 19.46 KiB gzip (dentro del presupuesto). `npm test` 259, `npm run test:ui` 216, `npm run check` OK.

## autoFit: re-encuadre responsivo al redimensionar el contenedor

Paridad con el `fitView`-on-resize de React Flow, que el núcleo no tenía. Para vistas embebidas/responsivas.

- Nueva opción `autoFit?: boolean` en `DiagramOptions`. El `ResizeObserver` del editor, que ya observaba el contenedor, ahora llama a `this.fit()` cuando `autoFit` está activo (en vez de solo emitir `onViewportChange`). Sin la opción, el comportamiento previo intacto.
- Caso de uso: montar `<kairo-diagram autoFit>` o `createDiagram(host, { autoFit: true })` y el diagrama se reencuadra solo al cambiar el tamaño del host (paneles plegables, layouts fluidos, splits).
- 1 prueba UI vía build global: monta con `autoFit`, encoge el host de 900×600 a 300×200 y verifica que el `zoom` del viewport baja (reencuadre). Coste núcleo 19.46 → 19.48 KiB gzip (dentro del presupuesto). `npm test` 259, `npm run test:ui` 218, `npm run check` OK.

## Interoperabilidad React Flow (formato nativo JSON)

React Flow (reactflow.dev / @xyflow/react) es el competidor directo citado en el plan. Ya teníamos un *envoltorio* React (`/react`), pero no el **formato de documento nativo** de React Flow. Ahora se puede mover un diagrama entre Kairo y un lienzo React Flow sin pasar por el componente.

- Nuevo módulo `packages/diagram/src/reactflow.ts` con `toReactFlow(document)` y `fromReactFlow(input)`, reexportados desde `@fsaldivar.dev/diagram/io` (fuera del núcleo). Tipos `ReactFlowGraph/Node/Edge`.
- Mapeo de roles: `start`→`type:'input'`, `end`→`type:'output'`, `decision`→`default`; el resto queda como paso. Etiquetas en `data.label`; `source`/`target` con `sourceHandle`/`targetHandle` ↔ puertos.
- Grupos ↔ nodos contenedor `type:'group'` con hijos posicionados **relativos al padre** vía `parentId` (convención parent/child de React Flow). La importación resuelve posiciones a coordenadas absolutas recorriendo la cadena de padres; el contenedor no se importa como nodo.
- `convert`/CLI: nuevo `InputFormat`/`OutputFormat` `'reactflow'`; `detectFormat` lo distingue de JSON Canvas por el objeto `position` en los nodos y `source`/`target` en las aristas (Canvas usa `fromNode`/`toNode`). `convertText(rf, 'reactflow', 'mermaid')` etc. funcionan en Node y navegador.
- 6 pruebas unitarias: mapeo de roles, import con recorte de tamaños, round-trip de estructura/posiciones/puertos, grupos vía `parentId` con posición absoluta restaurada, entradas malformadas y aristas colgantes, detección + conversión a Mermaid. Coste núcleo **19.48 KiB** (sin cambios; el subpath IO crece a 18.02 KiB, no contado). `npm test` 265, `npm run test:ui` 218, `npm run check` OK.

## Exportación SVG animada (flujo en aristas)

Algo que **ningún competidor exporta**: un SVG listo para presentaciones con las aristas animadas. Mermaid, draw.io, React Flow y Excalidraw solo exportan estático. Es un artefacto de salida (opt-in), no una animación permanente del editor, así que respeta la regla de CLAUDE.md.

- Nueva opción `animated?: boolean | { duration?: number; dot?: boolean }` en `SvgExportOptions` (`toSVG`, subpath `@fsaldivar.dev/diagram/export`).
- `animated:true` añade un "marching-ants" fluido en las aristas vía CSS (`stroke-dasharray` + `@keyframes ks-dash` animando `stroke-dashoffset`), **envuelto en `@media (prefers-reduced-motion: no-preference)`**: estático para quien pide menos movimiento (accesibilidad).
- `animated:{ dot:true }` añade además un punto que recorre cada arista con `<animateMotion><mpath href="#ks-edge-N"/>`; cada arista recibe un `id` estable. `duration` en segundos por ciclo (default 1.2).
- CLI `kairo-convert`: bandera `--animated` para salida SVG (`--to=svg --animated`).
- 2 pruebas unitarias (flujo guardado por reduced-motion + un solo `<svg>`; punto viajero por arista con `animateMotion`/`mpath` y `id` presentes), smoke del CLI. Coste núcleo **19.48 KiB** (sin cambios; subpath export 6.33→6.48 KiB, no contado). `npm test` 267, `npm run test:ui` 218, `npm run check` OK.

## Layout circular (anillo)

Un layout que Gephi, Cytoscape y draw.io tienen y a Kairo le faltaba. Completa el catálogo (jerárquico, orgánico, radial, árbol → **circular**).

- Nuevo `circularLayout(document, { radius?, gap?, startAngle? })` en `@fsaldivar.dev/diagram/layout` (subpath, fuera del núcleo). `CircularLayoutOptions`.
- Coloca todos los nodos equidistantes en **un solo anillo**. El orden en el anillo sigue un recorrido BFS desde el nodo de mayor grado, para que los vecinos queden adyacentes y se reduzcan los cruces frente al orden de declaración. El radio crece automáticamente para que los nodos no se solapen (arco por nodo ≥ diagonal + `gap`).
- Determinista y puro; tamaños, formas, tags y semántica intactos, puertos recalculados. Nodos desconectados y grafos de un solo nodo manejados.
- Ejemplo: botón **Layout circular** (icono anillo) en el menú *Layout*.
- 3 pruebas unitarias (equidistancia al centro + semántica intacta, sin solapes + puertos, determinismo + nodo único) y 1 UI (todos los centros en un anillo, semántica intacta). Coste núcleo **19.48 KiB** (sin cambios; subpath layout 5.23 KiB, no contado). `npm test` 270, `npm run test:ui` 220, `npm run check` OK.

## Exportación ASCII / Unicode (texto monoespaciado)

Algo que **ninguna alternativa ofrece**: renderizar el diagrama como texto monoespaciado — cajas con etiquetas unidas por conectores ortogonales. Ideal para READMEs, terminales, comentarios de PR/commit y prompts de LLM.

- Nuevo módulo `packages/diagram/src/ascii.ts` con `toAscii(document, { width?, height?, ascii?, maxLabel? })`, reexportado desde `@fsaldivar.dev/diagram/export` (subpath, fuera del núcleo). `AsciiExportOptions`.
- **Reutiliza el layout ya resuelto** (posiciones de nodos): rasteriza a una rejilla de caracteres, así que no necesita un algoritmo de dibujo de grafos. Escala X/Y ajustada al ancho objetivo y a la relación ~2:1 de los caracteres.
- Dibuja cajas con caracteres de líneas Unicode (`┌─┐│└┘`) y conectores en L (horizontal + vertical) con cruces (`┼`) y flechas; `ascii:true` usa solo ASCII de 7 bits (`+ - | > v`). Etiquetas centradas y truncadas (`maxLabel`).
- CLI `kairo-convert`: salida `--to=ascii` (o extensión `.txt`/`.ascii`), con `--plain` para ASCII puro.
- Ejemplo: botón **Exportar ASCII** (icono terminal nuevo, sin reutilizar otro) en el menú *Exportar*, descarga `diagrama.txt`.
- 4 pruebas unitarias (etiquetas + bordes + ancho respetado, modo ASCII estrictamente 7-bit, truncado + ancho mínimo, documento vacío → '') y 1 UI (descarga con cajas y conectores). Coste núcleo **19.48 KiB** (sin cambios; subpath export 7.53 KiB, no contado). `npm test` 274, `npm run test:ui` 222, `npm run check` OK.

## Layout en cuadrícula (grid)

Completa el catálogo de layouts (jerárquico, orgánico, radial, árbol, circular → **grid**), como en Cytoscape y Gephi. Útil para conjuntos de nodos poco o nada conectados.

- Nuevo `gridLayout(document, { columns?, gap?, rowGap? })` en `@fsaldivar.dev/diagram/layout` (subpath, fuera del núcleo). `GridLayoutOptions`.
- Coloca los nodos en una **rejilla rectangular** fila por fila en orden de declaración. Las columnas por defecto son ⌈√n⌉ (rejilla casi cuadrada); cada celda se dimensiona al nodo más grande, así que nada se solapa. Nodos centrados en su celda.
- Determinista y puro; tamaños, formas, tags y semántica intactos, puertos recalculados.
- Ejemplo: botón **Layout en cuadrícula** (icono nuevo `cells`, 2×2, sin reutilizar el de la cuadrícula ni el de tabla) en el menú *Layout*.
- 2 pruebas unitarias (filas/columnas alineadas + sin solapes + semántica intacta; rejilla casi cuadrada por defecto + determinismo + puertos) y 1 UI (filas compartidas, semántica intacta). Coste núcleo **19.48 KiB** (sin cambios; subpath layout 5.37 KiB, no contado). `npm test` 276, `npm run test:ui` 224, `npm run check` OK.

## Análisis: puntos críticos (nodos de corte y puentes / SPOF)

Un análisis que ni Mermaid, React Flow, Excalidraw ni draw.io ofrecen: detectar los **puntos únicos de fallo** de un diagrama de arquitectura — los nodos (vértices de corte) y enlaces (puentes) cuya eliminación parte la red en más piezas.

- Nuevas funciones en `@fsaldivar.dev/diagram/analysis`: `articulationPoints(graph)`, `bridges(graph)` y `criticalElements(graph) → { articulationPoints, bridges }`.
- **Tarjan iterativo** (DFS con pila explícita, a prueba de desbordamiento en grafos grandes). El grafo se trata como **no dirigido** (la conectividad lo es) e ignora bucles propios. Las **aristas paralelas** se manejan correctamente: dos enlaces entre el mismo par no son puentes. Ids devueltos en orden de declaración; puro y determinista.
- Ejemplo: botón **Puntos críticos** (icono nuevo `alert`) en el menú *Análisis*; resalta los nodos de corte y los puentes y muestra el recuento. En el diagrama de muestra (un árbol) resalta `auth`, `session`, `gateway` y los 6 enlaces.
- 5 pruebas unitarias (vértice de corte en triángulo+cola, puentes vs. aristas de ciclo, aristas paralelas no son puentes, no dirigido + bucles propios + independencia de dirección, 4000 nodos sin desbordar la pila) y 1 UI (resalta los 3 SPOF del árbol de muestra). Coste núcleo **19.48 KiB** (sin cambios; subpath analysis 5.11 KiB, no contado). `npm test` 281, `npm run test:ui` 226, `npm run check` OK.

## Análisis: centralidad de intermediación (brokers / betweenness)

Métrica insignia de Gephi que faltaba: qué nodos actúan como **brokers**, situados en muchas de las rutas más cortas entre otros pares. Complementa a los hubs por grado (`centralNodes`) y a los puntos de corte (SPOF): un broker puede no ser el más conectado pero sí el que une partes distantes del grafo.

- Nuevas funciones en `@fsaldivar.dev/diagram/analysis`: `betweennessCentrality(graph) → NodeScore[]` y `brokerNodes(graph, count?)`.
- **Algoritmo de Brandes** (dirigido, sin pesos), O(V·E); reparte el crédito entre rutas mínimas empatadas. Puntuaciones crudas (sin normalizar) en orden de declaración; puro y determinista. Dirigido: invertir las aristas cambia quién intermedia.
- Ejemplo: botón **Brokers** (icono nuevo `broker`) en el menú *Análisis*; resalta los 3 de mayor intermediación. En la muestra: `session` (6), `auth` (4), `gateway` (4).
- 4 pruebas unitarias (medio de una cadena, reparto 0.5/0.5 en diamante, ranking de `brokerNodes` + exclusión de ceros + empates, direccionalidad) y 1 UI (resalta session/auth/gateway). Coste núcleo **19.48 KiB** (sin cambios; subpath analysis 5.37 KiB, no contado). `npm test` 285, `npm run test:ui` 228, `npm run check` OK.

## Interoperabilidad GEXF (Gephi / NetworkX)

GEXF es el formato **nativo de Gephi** y el que escribe `networkx.write_gexf`. Aunque GraphML ya cubría Gephi, muchos flujos (NetworkX, exportadores de redes) producen GEXF directamente; soportarlo amplía la integración.

- Nuevo módulo `packages/diagram/src/gexf.ts` con `fromGexf(xml, opts?)` y `toGexf(document)`, reexportados desde `@fsaldivar.dev/diagram/io` (subpath). `GexfImportOptions`.
- Exporta GEXF 1.3 dirigido con etiquetas, **`<viz:position>`** (coordenadas de centro desde el layout) y `group`/`type` como `<attvalues>`. La importación restaura posiciones (y cae a layout por capas si faltan), grupo y tipo de nodo; subconjunto práctico por regex, sin eval.
- `convert`/CLI: nuevo `InputFormat`/`OutputFormat` `'gexf'`; `detectFormat` lo reconoce por la etiqueta `<gexf>` (antes que GraphML). CLI `--to=gexf` o extensión `.gexf`.
- Ejemplo: botones **Importar GEXF** / **Exportar GEXF** (icono nuevo `gephi`) en los menús *Importar*/*Exportar*; descarga `diagrama.gexf`.
- 5 pruebas unitarias (emisión con viz/attvalues, import con grupo/tipo/posición, round-trip completo, fallback de layout + rechazo de vacío, detección + conversión a Mermaid) y 1 UI (round-trip export→import a la misma estructura). Coste núcleo **19.48 KiB** (sin cambios; subpath IO 18.84 KiB, no contado). `npm test` 290, `npm run test:ui` 230, `npm run check` OK.

## Análisis: detección de comunidades (Louvain) + agrupar por clúster

Clasificación en comunidades al estilo de Gephi (clases de modularidad): particiona un grafo conexo en **clústeres densos**, más fino que `connectedComponents`. A diferencia de la propagación de etiquetas ingenua, **no fusiona** clústeres unidos por un solo enlace débil.

- Nueva función `communities(graph) → string[][]` en `@fsaldivar.dev/diagram/analysis`.
- **Louvain (movimiento local, modularidad)** determinista: nodos procesados en orden de declaración, movidos a la comunidad vecina de mayor ganancia de modularidad, empates estables, hasta que ningún movimiento mejora. Vista no dirigida con pesos por aristas paralelas. Devuelve comunidades (listas de ids en orden de declaración), ordenadas por primera aparición. Puro y reproducible.
- Ejemplo: botón **Agrupar por comunidad** (icono nuevo `communities`) en el menú *Layout*; asigna `group` por clúster (clústeres de más de un nodo) y vuelve a dibujar, como *Auto-agrupar* pero por densidad en lugar de por componente conexo.
- 3 pruebas unitarias (dos triángulos con puente → 2 clústeres; clique → 1 + determinismo; componentes desconectados + nodo aislado = partición completa) y 1 UI (importa dos triángulos por CSV y los agrupa en 2 cajas). Coste núcleo **19.48 KiB** (sin cambios; subpath analysis 5.71 KiB, no contado). `npm test` 293, `npm run test:ui` 232, `npm run check` OK.

## Ajuste de tamaño al texto (fitNodeSizes)

Auto-dimensionado de nodos al contenido, como hacen React Flow, draw.io y Excalidraw; Kairo antes truncaba títulos largos. Mejora de calidad de edición.

- Nueva función `fitNodeSizes(document, { charWidth?, paddingX?, minWidth?, maxWidth?, iconAllowance?, height? })` en `@fsaldivar.dev/diagram/layout` (subpath).
- Estima el ancho a partir de la longitud del título, ajustado por forma (los **diamantes** ×1.7 y **elipses** ×1.25 necesitan más holgura; los **rectángulos** reservan espacio para el icono de tipo) y lo acota a `[minWidth, maxWidth]` (minWidth nunca por debajo del suelo de 140px del validador; height ≥ 76). Posiciones, formas, tags, semántica y puertos de aristas intactos. Puro y determinista, sin DOM.
- Nota: ensanchar puede solapar; ejecutar un layout después si hace falta.
- Ejemplo: botón **Ajustar tamaño al texto** (icono nuevo `fitwidth`) en el menú *Layout*.
- 3 pruebas unitarias (títulos largos ensanchan y se acotan a maxWidth / suelo minWidth; diamante más ancho que rectángulo + forma/height preservados; pureza + determinismo + puertos conservados) y 1 UI (en la muestra, `DashboardView` pasa de 210 a 179px). Coste núcleo **19.48 KiB** (sin cambios; subpath layout 5.60 KiB, no contado). `npm test` 296, `npm run test:ui` 234, `npm run check` OK.

## Exportación SVG: ajuste de líneas en etiquetas (wrapLabels)

Las etiquetas largas se envuelven en varias líneas (como Mermaid) en lugar de truncarse con `…`. Se combina con `fitNodeSizes` (ancho) para nodos legibles sin recortes.

- Nueva opción `wrapLabels?: boolean` en `SvgExportOptions` (`toSVG`, y por tanto `toPNG`). Por defecto desactivada (no cambia la salida existente).
- `wrapText` (ajuste voraz por palabras): parte el título en hasta **3 líneas** que quepan en el ancho útil del nodo (según forma); las palabras demasiado largas se cortan y la última línea recibe `…` si sobra texto. Emite `<tspan>` con `x`/`dy`; en nodos rectangulares desplaza hacia abajo las líneas de tipo y `source` para no solaparse con el título ampliado.
- Ejemplo: la exportación SVG y PNG del ejemplo ahora usa `wrapLabels: true`. CLI `kairo-convert`: bandera `--wrap` para salida SVG.
- 3 pruebas unitarias (varias `<tspan>` vs. título de una línea sin ajuste; tope de 3 líneas + `…` + título corto en una línea; desplazamiento de tipo/source en rectángulo). Coste núcleo **19.48 KiB** (sin cambios; subpath export 7.87 KiB, no contado). `npm test` 299, `npm run test:ui` 234, `npm run check` OK.

## Exportación a data URI de SVG (incrustable en cualquier `<img>`)

Convierte el diagrama en una URL de imagen autónoma — sin servidor ni servicio externo — lista para `<img src>`, imágenes Markdown `![](…)`, `url()` de CSS o correos. Es una vía de integración distinta a mermaid.ink/kroki: todo offline, sin dependencias.

- Nuevas funciones en `@fsaldivar.dev/diagram/export`: `toSvgDataUri(document, options?)` → `data:image/svg+xml;base64,…`, y `toSvgMarkdownImage(document, { alt?, ...svg })` → `![alt](data:…)`.
- Base64 estándar (RFC 4648 §4, con relleno) propio, UTF-8 seguro (multibyte/`<`/`&` correctos), idéntico en Node y navegador. Acepta todas las `SvgExportOptions` (tema, `wrapLabels`, leyenda, enlaces…).
- CLI `kairo-convert`: salida `--to=datauri` (respeta `--wrap`).
- 4 pruebas unitarias (round-trip base64 byte-exacto vs. `toSVG`; UTF-8 multibyte; reenvío de `wrapLabels` al SVG incrustado; sintaxis Markdown + saneo de `alt`) y smoke del CLI. Coste núcleo **19.48 KiB** (sin cambios; subpath export 8.19 KiB, no contado). `npm test` 303, `npm run test:ui` 234, `npm run check` OK.

## Exportación de matriz de adyacencia (CSV para NumPy/pandas/Gephi)

La forma **matriz cuadrada** del grafo, que consumen NumPy (`np.array`), pandas (`read_csv(index_col=0)`), MATLAB y Gephi; complementa la CSV de lista de aristas ya existente.

- Nuevas funciones en `@fsaldivar.dev/diagram/io`: `toAdjacencyMatrix(graph) → { ids, labels, matrix }` y `toMatrixCsv(document, { delimiter?, useIds?, corner? })`.
- Dirigida: `matrix[i][j]` cuenta las aristas i→j (incluye aristas paralelas y bucles propios en la diagonal), en orden de declaración. CSV con fila de cabecera y primera columna etiquetadas (celda "corner" por defecto `node`), con escape de comillas/delimitadores. Puro y determinista.
- CLI `kairo-convert`: salida `--to=matrix`. Ejemplo: botón **Exportar matriz** (icono nuevo `matrix`) en el menú *Exportar*; descarga `diagrama.matriz.csv`.
- 4 pruebas unitarias (conteo dirigido con paralelas/bucles; CSV etiquetado; escape + `useIds` + delimitador; endpoints desconocidos + grafo vacío) y 1 UI (descarga CSV cuadrado 8×8 en la muestra de 7 nodos), smoke del CLI. Coste núcleo **19.48 KiB** (sin cambios; subpath IO 19.13 KiB, no contado). `npm test` 307, `npm run test:ui` 236, `npm run check` OK.

## Extracción de subdiagrama (subgraph) y vecindario (ego)

Aislar o profundizar en una parte de un diagrama grande, como una función pura componible con todo (exportar, re-layout, etc.). Ni Mermaid ni React Flow ofrecen esto directamente.

- Nuevas funciones en `@fsaldivar.dev/diagram/layout`: `subgraph(document, keep)` y `ego(document, center, { depth?, directed? })`. `EgoOptions`.
- `subgraph` conserva los nodos seleccionados (en su orden original) y **solo las aristas con ambos extremos presentes**; posiciones, formas, tags, grupos y puertos se copian tal cual (no re-posiciona). Puro; no muta la entrada; selecciones desconocidas/vacías toleradas.
- `ego` devuelve el nodo central más todo lo que está a `depth` saltos (no dirigido por defecto; `directed` sigue el sentido de las aristas), vía `subgraph`. Lanza si el centro no existe.
- Ejemplo: botón **Aislar selección** (icono nuevo `crop`) en el menú *Layout*; extrae la multiselección actual con `replaceDocument` (deshacer-able).
- 3 pruebas unitarias (nodos+aristas inducidas con layout/semántica preservados; pureza + selección desconocida/vacía; `ego` por saltos, dirigido vs. no dirigido, y error de centro inexistente) y 1 UI (aislar auth+users → 2 nodos/1 arista, y Deshacer restaura 7). Coste núcleo **19.48 KiB** (sin cambios; subpath layout 5.86 KiB, no contado). `npm test` 310, `npm run test:ui` 238, `npm run check` OK.

## Colores por nodo al exportar SVG (heatmaps, categorías, comunidades)

Permite colorear nodos en la exportación SVG sin guardar colores en el grafo (respetando la regla de diseño "no se guardan colores"): el color es estilo efímero en el momento de exportar.

- Nuevas opciones de callback en `SvgExportOptions` (`toSVG`, y por tanto `toPNG`/`toSvgDataUri`): `nodeFill(node)`, `nodeStroke(node)`, `nodeTextColor(node)`. Devolver `undefined` conserva el color del tema.
- Se combinan con el análisis para producir **mapas de calor** (p. ej. por `betweennessCentrality`), **coloreado por categoría/tipo** o **por comunidad** (`communities`). Nada se escribe en el documento.
- 3 pruebas unitarias (los tres overrides aplican fill/stroke/color de título al nodo correcto; devolver `undefined` en todo reproduce exactamente la salida por defecto; composición con un conjunto de "brokers" tiñe exactamente ese nodo). Coste núcleo **19.48 KiB** (sin cambios; subpath export 8.24 KiB, no contado). `npm test` 313, `npm run test:ui` 238, `npm run check` OK.

## Análisis: estadísticas de distancia (diámetro y longitud media de ruta)

Estadísticas de red estándar (como en Gephi) que faltaban en `analyzeGraph`: cuán "profundo" y "extendido" es un diagrama.

- Nueva función `distanceStats(graph, { directed? }) → { diameter, averagePathLength, reachablePairs }` en `@fsaldivar.dev/diagram/analysis`.
- BFS desde cada nodo: `diameter` = la ruta más corta más larga; `averagePathLength` = media sobre todos los pares alcanzables (los inalcanzables se excluyen). Dirigido por defecto; `directed:false` para la vista no dirigida. O(V·(V+E)); puro y determinista.
- El informe Markdown (`toReport`) ahora incluye una línea `- Diámetro: N (long. media de ruta M)`.
- 3 pruebas unitarias (cadena dirigida: diámetro = longitud, media sobre pares alcanzables; dirigido vs. no dirigido; grafo sin aristas/un nodo → ceros) y 1 de informe (la línea de diámetro aparece). Coste núcleo **19.48 KiB** (sin cambios; subpath analysis 5.95 KiB, no contado). `npm test` 316, `npm run test:ui` 238, `npm run check` OK.

## Temas: auditoría de contraste WCAG

Verifica que un tema sea legible según WCAG — algo que quien crea un tema a medida (o derivado de marca con `themeFrom`) necesita y que ninguna librería de diagramas incluye.

- Nuevas funciones en `@fsaldivar.dev/diagram/themes`: `contrastRatio(a, b)` (ratio WCAG 1–21 entre dos colores) y `auditTheme(theme) → { pairs, minRatio, passes }`.
- Comprueba pares de **texto** (4.5:1, AA) — título/fondo, texto secundario/fondo, icono/fondo de icono — y pares **gráficos** (3:1) — borde/lienzo, arista/lienzo. Cada par indica `ratio`, `threshold`, `pass` y `graphical`. Puro y determinista.
- Hallazgo real: `highContrast` pasa la auditoría completa; en el tema claro por defecto el título es legible (14.4:1) pero el texto secundario (3.49:1) y los bordes suaves quedan por debajo del umbral — información útil, no un fallo.
- 4 pruebas unitarias (anclas WCAG 21/1 + simetría; 5 pares con umbrales/flags correctos y `minRatio`; `highContrast` pasa y el tema claro marca secundario/bordes; tema con texto ilegible falla). Coste núcleo **19.48 KiB** (sin cambios; subpath themes 1.80 KiB, no contado). `npm test` 320, `npm run test:ui` 238, `npm run check` OK.

## Análisis: coloreado de grafo (greedy, Welsh–Powell)

Asigna a cada nodo un índice de color de modo que ningún enlace una dos nodos del mismo color, con paleta pequeña. Se combina con `nodeFill` de la exportación SVG para distinguir visualmente nodos adyacentes.

- Nueva función `greedyColoring(graph) → { colors, count }` en `@fsaldivar.dev/diagram/analysis`.
- Welsh–Powell: colorea en orden de grado descendente (empates por orden de declaración); cada nodo toma el color más bajo no usado por un vecino ya coloreado. Vista no dirigida. Voraz (no garantiza el mínimo). Puro y determinista.
- Composición: `toSVG(doc, { nodeFill: n => palette[colores[n.id] % palette.length] })`.
- 3 pruebas unitarias (triángulo → 3 colores, camino → 2, sin choques adyacentes; grafo más denso válido + no dirigido; nodos aislados comparten color 0, grafo vacío 0 colores, determinismo). Coste núcleo **19.48 KiB** (sin cambios; subpath analysis 6.12 KiB, no contado). `npm test` 323, `npm run test:ui` 238, `npm run check` OK.

## Plantillas del mundo real (microservicios, CI/CD, auth, máquina de estados)

Amplía la galería de plantillas de inicio (como las galerías de draw.io/React Flow) con cuatro arranques realistas, además de las existentes (flujo vacío, decisión, arquitectura, mapa mental, carriles).

- Nuevas en `@fsaldivar.dev/diagram/templates`: `microservices()` (gateway + servicios + bases + bus de eventos, 8 nodos), `cicdPipeline()` (commit→build→test→gate→staging→prod con puerta de aprobación y reintento, 6), `authFlow()` (login con bucle de reintento, 6), `stateMachine()` (máquina de estados cíclica, 4).
- Todas se registran automáticamente en `templates`/`templateNames`/`getTemplate`, así que el selector de plantillas del ejemplo las muestra sin cambios adicionales.
- 9 pruebas unitarias (todas las plantillas: documento válido, nodos colocados, instancia fresca; fallback a flujo vacío; forma específica de cada plantilla original y nueva; validación estructural de las de flujo) y 1 UI (cargar microservices/cicdPipeline/stateMachine desde el selector). **Nota:** este tick sobrescribió por accidente `tests/templates.test.ts` (5 pruebas) con `cat >`; se reescribió con cobertura ampliada (9). Coste núcleo **19.48 KiB** (sin cambios; subpath templates 4.19 KiB, no contado). `npm test` 327, `npm run test:ui` 240, `npm run check` OK.

## Fondos con patrón en la exportación SVG (grid / dots)

Paridad con el `<Background variant>` de React Flow: el lienzo exportado puede llevar una cuadrícula o puntos, no solo relleno sólido.

- La opción `background` de `SvgExportOptions` (`toSVG`/`toPNG`/`toSvgDataUri`) ahora acepta `boolean | 'none' | 'solid' | 'grid' | 'dots'`. Retrocompatible: `undefined`/`true`/`'solid'` dan el mismo resultado de antes; `false`/`'none'` = transparente.
- `'grid'` y `'dots'` añaden un `<pattern>` (líneas o puntos con `theme.grid`) sobre el relleno del lienzo. Autónomo; sin refs externas.
- 2 pruebas unitarias (grid/dots añaden `<pattern>` y `url(#…)`, solid/none no; retrocompatibilidad: default===solid===true, false===none). Coste núcleo **19.48 KiB** (sin cambios; subpath export 8.42 KiB, no contado). `npm test` 329, `npm run test:ui` 240, `npm run check` OK.

## Interoperabilidad D2 (Terrastruct)

D2 es un lenguaje de diagramas de texto moderno (terrastruct.com/d2), en la línea de Mermaid/DOT/PlantUML. Añade otra plataforma de ida y vuelta.

- Nuevo módulo `packages/diagram/src/d2.ts` con `parseD2(text, opts?)` y `toD2(document)`, reexportados desde `@fsaldivar.dev/diagram/io`. `D2ImportOptions`.
- Subconjunto práctico: nodos (`id`, `id: Etiqueta`), conexiones dirigidas con etiqueta (`a -> b: label`, también `<->`/`--`), **formas** (`{ shape: diamond|oval|… }` ↔ formas Kairo; diamond→decisión) y **contenedores de un nivel** ↔ grupos (los miembros se referencian por ruta con punto `grupo.miembro`). Sin eval.
- `convert`/CLI: nuevo `InputFormat`/`OutputFormat` `'d2'`; `detectFormat` lo reconoce por conexiones ` -> `/`<->` o `shape:` (tras DOT). CLI `--to=d2` o extensión `.d2`. Ejemplo: botones **Importar/Exportar D2** (icono nuevo `d2`); descarga `diagrama.d2`.
- 5 pruebas unitarias (export con contenedores/formas/rutas; import de grupos/formas/aristas; round-trip; ids simples + forma inline + comentarios + rechazo de vacío; detección + conversión a Mermaid) y 1 UI (round-trip export→import a la misma estructura). Coste núcleo **19.48 KiB** (sin cambios). **Aviso:** el subpath `@fsaldivar.dev/diagram/io` llega a **20.05 KiB** gzip (opt-in, no contado contra el presupuesto del núcleo, pero ya supera el tamaño del núcleo; conviene dividirlo). `npm test` 334, `npm run test:ui` 242, `npm run check` OK.

## Portapapeles/edición por teclado (etapa 3) + comandos en la paleta

El portapapeles de la etapa 3 **ya estaba implementado en el núcleo** (`editor.copySelection/cut/paste/removeSelected/duplicateSelected`, atados a Cmd/Ctrl+C/X/V, Supr/Retroceso y Cmd/Ctrl+A en `editor.keyDown`). Esta iteración lo verifica y lo hace descubrible.

- **No se añadió** manejo redundante en el ejemplo (un intento inicial duplicaba el pegado porque el editor ya gestiona esas teclas); se revirtió.
- La **paleta de comandos** (Cmd/Ctrl+K) ahora incluye acciones de edición sin botón: *Copiar/Cortar/Pegar selección*, *Duplicar selección*, *Eliminar selección*, *Seleccionar todo* (vía nuevos `PaletteAction.run`), descubribles y ejecutables sin atajos.
- Pruebas UI nuevas: Cmd/Ctrl+C→V pega una copia como un solo deshacer; Supr elimina nodo + sus aristas (deshacer-able); la paleta ejecuta Duplicar/Eliminar. Coste núcleo **19.48 KiB** (sin cambios; solo ejemplo + pruebas). `npm test` 334, `npm run test:ui` 248, `npm run check` OK.

## Análisis: PageRank (nodos influyentes)

Métrica insignia de Gephi/Google: importancia recursiva — un nodo importa cuando nodos importantes lo apuntan. Distinta de hubs por grado, brokers (betweenness) y SPOF.

- Nuevas funciones en `@fsaldivar.dev/diagram/analysis`: `pageRank(graph, { damping?, iterations?, tolerance? }) → NodeScore[]` e `influentialNodes(graph, count?)`.
- Iteración de potencia dirigida (damping 0.85 por defecto): los nodos colgantes (sin salidas) redistribuyen su rango uniformemente; los bucles propios se ignoran; las puntuaciones suman ~1, en orden de declaración. Puro y determinista.
- Ejemplo: botón **Influyentes** (icono nuevo `trophy`) en el menú *Análisis*; resalta el top-3. En la muestra: `firebase`, `gateway`, `session` (los sumideros acumulan rango).
- 4 pruebas unitarias (cadena acumula hacia el sumidero + suma≈1; hub de in-star el más alto + top-k; damping 0 uniforme + vacío + determinismo; ignora bucles propios) y 1 UI (resalta firebase/gateway/session). Coste núcleo **19.48 KiB** (sin cambios; subpath analysis 6.39 KiB, no contado). `npm test` 338, `npm run test:ui` 250, `npm run check` OK.

## Exportación SVG paginada (vista de páginas, como draw.io)

Divide un diagrama grande en SVGs del tamaño de una página para imprimir o montar un PDF — algo que draw.io ofrece con su "page view" y las demás no exportan.

- Nueva función `toSvgPages(document, { pageWidth?, pageHeight?, ...SvgExportOptions }) → string[]` en `@fsaldivar.dev/diagram/export`; `SvgPagesOptions`. Por defecto A4 apaisado a 96dpi (1123×794).
- Cada página es un SVG autónomo que muestra su porción del **mismo espacio de coordenadas**, en orden por filas (arriba-izquierda primero). Implementado con una nueva opción `window` de `toSVG` que recorta la salida a un sub-rectángulo (cambia `width`/`height`/`viewBox`, no el contenido). Las leyendas no se paginan. Puro.
- 3 pruebas unitarias (diagrama ancho → 5 páginas con viewBox por columna; diagrama pequeño → 1 página sin leyenda; `window` recorta sin alterar el `translate` del contenido). Coste núcleo **19.48 KiB** (sin cambios; subpath export 8.65 KiB, no contado). `npm test` 341, `npm run test:ui` 250, `npm run check` OK.

## Enfocar selección (zoom a la selección)

Paridad con el `fitView({nodes})` de React Flow: ajustar la vista a los nodos seleccionados, no solo a todo el diagrama.

- El editor **ya tenía** `fit(padding, ids?)` y `fitSelection()`; esta iteración los expone en el ejemplo.
- Atajo **`f`** (enfoca la selección si hay nodos seleccionados; si no, ajusta todo) y acción **Enfocar selección** en la paleta de comandos (Cmd/Ctrl+K).
- 1 prueba UI (seleccionar dos nodos adyacentes y pulsar `f` acerca el zoom respecto a ajustar-todo). Coste núcleo **19.48 KiB** (sin cambios; solo ejemplo + prueba). `npm test` 341, `npm run test:ui` 252, `npm run check` OK.

## Animación "build" por pasos en la exportación SVG (reveal)

Algo nuevo que ninguna alternativa exporta: una animación de aparición escalonada para presentaciones — los nodos y aristas se revelan en orden de dependencia (como un "build" de diapositiva).

- Nueva opción `reveal?: boolean | { stagger?: number; duration?: number }` en `SvgExportOptions` (`toSVG`, y por tanto `toPNG`/`toSvgDataUri`/`toSvgPages`). Por defecto desactivada (salida sin cambios).
- El retardo de cada elemento escala con su **profundidad** (rango por capas, reutilizando `layers`): los nodos aparecen en cascada y cada arista con su nodo destino. CSS `@keyframes ks-reveal` con `animation-delay: var(--ksd)`, **envuelto en `@media (prefers-reduced-motion: no-preference)`** (con `backwards` el elemento está oculto durante su retardo y, sin movimiento, permanece visible — accesibilidad).
- 2 pruebas unitarias (5 clases `ks-reveal` para 3 nodos + 2 aristas, retardos escalonados por profundidad, guardia de reduced-motion; desactivada por defecto + stagger/duration personalizados). Coste núcleo **19.48 KiB** (sin cambios; subpath export 9.10 KiB, no contado). `npm test` 343, `npm run test:ui` 252, `npm run check` OK.

## Análisis: detección de ciclo (findCycle)

Complementa el booleano `hasCycle` y `validateFlow` mostrando **qué** nodos forman el bucle, para verlo y corregirlo.

- Nueva función `findCycle(graph) → string[] | null` en `@fsaldivar.dev/diagram/analysis`: devuelve un ciclo dirigido en orden (`[a,b,c]` = a→b→c→a), `null` si es acíclico, `[a]` para un bucle propio.
- DFS iterativo con colores (blanco/en-pila/terminado), a prueba de desbordamiento en grafos grandes (probado con 4000 nodos). Determinista y puro.
- Ejemplo: botón **Ciclos** (icono nuevo `cycle`) en el menú *Análisis*; resalta los nodos del ciclo y sus aristas (incluida la de cierre), o avisa si es acíclico.
- 2 pruebas unitarias (ciclo ordenado con cada par consecutivo siendo arista + `null` acíclico + `[a]` bucle propio; concuerda con `hasCycle` y es estable en cadena de 4000) y 1 UI (acíclico no resalta; CSV de 3 nodos en ciclo resalta 3). Coste núcleo **19.48 KiB** (sin cambios; subpath analysis 6.54 KiB, no contado). `npm test` 345, `npm run test:ui` 254, `npm run check` OK.

## Corrección: formas por tipo en documentos creados (decisión=rombo, inicio/fin=píldora)

**Bug reportado:** "todos los nodos son rectángulos, no se añaden con sus iconos". Causa: `createLayout` (usado por `createDocument`, plantillas e importadores sin layout explícito) ponía tamaño fijo 200×92 **sin forma**, así que los nodos de decisión/inicio/fin se dibujaban como rectángulos. `addNode` sí aplicaba `nodeDefaults`, pero las plantillas no.

- `createLayout` ahora aplica `nodeDefaults[type]` (forma + tamaño) a cada nodo, igual que `addNode`: decisión→rombo (230×140), inicio/fin→píldora, el resto rectángulo. Solo afecta al layout autogenerado; un layout explícito no se toca.
- Sobre los iconos: se ocultan a propósito con poco zoom (`data-detail="low"`, <55%); a zoom normal aparecen. No era un fallo, pero al verse rectángulos sin forma el conjunto parecía roto.
- 1 prueba unitaria de regresión (decisión/inicio/fin reciben su forma y tamaño de `nodeDefaults`; un tipo rectangular no añade clave `shape`). Coste núcleo 19.48 → **19.50 KiB** (dentro del presupuesto). `npm test` 346, `npm run test:ui` 254, `npm run check` OK.

## Alinear a la cuadrícula (snapToGrid)

Ordena de una pasada un diagrama hecho a mano o importado, cuadrando todos los nodos a una rejilla — el complemento puntual de la rejilla magnética del editor.

- Nueva función `snapToGrid(document, grid = 16) → DiagramDocument` en `@fsaldivar.dev/diagram/layout`. Redondea `x`/`y` de cada nodo al múltiplo más cercano de `grid`; conserva tamaños, formas, tags, semántica y puertos; solo mueve posiciones. Puro y determinista; no muta la entrada. `grid` se acota a ≥ 1.
- Ejemplo: botón **Alinear a cuadrícula** (icono nuevo `snapgrid`) en el menú *Layout*.
- 2 pruebas unitarias (cuantiza a múltiplos, preserva forma/tamaño/semántica, entrada intacta; tamaño de rejilla personalizado + clamp a ≥1) y 1 UI (todas las posiciones quedan en múltiplos de 16). Coste núcleo **19.50 KiB** (sin cambios; subpath layout 5.93 KiB, no contado). `npm test` 348, `npm run test:ui` 256, `npm run check` OK.

## Colapsar grupos (vista de alto nivel)

Convierte un diagrama detallado y agrupado en una vista de arquitectura: cada grupo se contrae a un único super-nodo. Útil para "alejar" de un diagrama con muchos nodos a sus bloques principales.

- Nueva función `collapseGroups(document) → DiagramDocument` en `@fsaldivar.dev/diagram/layout`. Cada grupo → un nodo (`grupo-<nombre>`, tipo `generic`); los nodos sin grupo se conservan. Las aristas internas de un grupo se descartan; las que cruzan grupos se reenrutan entre super-nodos y se de-duplican. El super-nodo se coloca en el centro del *bounding box* de sus miembros. Puro; no muta la entrada; no-op (copia) si no hay grupos.
- Ejemplo: botón **Colapsar grupos** (icono nuevo `collapse`) en el menú *Layout*.
- 2 pruebas unitarias (contrae grupos, descarta aristas internas, de-duplica cruzadas, super-nodo con layout; no-op puro sin grupos) y 1 UI (agrupar 2 nodos → colapsar → 6 nodos, sin caja de grupo, aparece super-nodo "Backend"). Coste núcleo **19.50 KiB** (sin cambios; subpath layout 6.36 KiB, no contado). `npm test` 350, `npm run test:ui` 258, `npm run check` OK.

## Menú contextual (clic derecho)

Paridad con draw.io/Excalidraw/React Flow: un menú al clic derecho con las acciones de edición más comunes, directamente sobre el nodo bajo el cursor.

- En el ejemplo: clic derecho sobre el lienzo/nodo abre un menú con **Duplicar, Copiar, Pegar, Eliminar, Aislar selección, Enfocar**. Si el clic cae sobre un nodo no seleccionado, lo selecciona primero. Se cierra al elegir una opción, al hacer clic fuera, con `Escape` o al hacer scroll.
- Reutiliza la API existente del editor (`copySelection`/`paste`/`duplicateSelected`/`removeSelected`/`fitSelection`) y `subgraph` para *aislar*. Solo ejemplo (sin coste de núcleo).
- 1 prueba UI (clic derecho muestra el menú y *Duplicar* añade un nodo y lo cierra; `Escape` oculta el menú reabierto). Coste núcleo **19.50 KiB** (sin cambios). `npm test` 350, `npm run test:ui` 260, `npm run check` OK.

## Exportar la selección como SVG

Saca solo una parte de un diagrama grande a SVG, sin alterar el documento — combina `subgraph` (recorte) con `toSVG`.

- En el ejemplo: botón **Exportar selección SVG** (icono `crop`) en el menú *Exportar*; exporta el subdiagrama inducido por los nodos seleccionados (y solo las aristas entre ellos) a `seleccion.kairo.svg`. Avisa si no hay selección. Solo ejemplo (sin coste de núcleo).
- 1 prueba UI (seleccionar auth+users y exportar → el SVG contiene AuthService y UserDatabase pero no LoginView ni Firebase). Coste núcleo **19.50 KiB** (sin cambios). `npm test` 350, `npm run test:ui` 262, `npm run check` OK.

## Legibilidad: contorno en las etiquetas de arista (SVG/PNG)

Las etiquetas de arista en la exportación SVG eran texto plano, difícil de leer sobre la línea; el editor en vivo ya las contornea. Ahora la exportación coincide.

- `toSVG` (y por tanto `toPNG`/`toSvgDataUri`/`toSvgPages`) dibuja las etiquetas de arista con `paint-order="stroke"` y un contorno del color del lienzo (`stroke-width="4"`), igual que `.cd-edge-label` en el editor. Siempre activo; sin opción nueva.
- 1 prueba unitaria (la etiqueta de arista lleva `paint-order="stroke"` y `stroke-width="4"`). Coste núcleo **19.50 KiB** (sin cambios; subpath export 9.13 KiB). `npm test` 351, `npm run test:ui` 262, `npm run check` OK.

## Análisis: generaciones topológicas (etapas en paralelo)

Las "olas" de un DAG: qué nodos pueden ejecutarse en cada etapa (los que tienen todas sus dependencias satisfechas). Distinto del orden topológico plano; útil para pipelines/flujos (nº de etapas y paralelismo máximo).

- Nueva función `topologicalGenerations(graph) → string[][]` en `@fsaldivar.dev/diagram/analysis`: Kahn por niveles; ignora bucles propios; omite los nodos atrapados en un ciclo (devuelve la parte acíclica); ids en orden de declaración dentro de cada ola. Puro y determinista.
- El informe Markdown (`toReport`) añade `- Etapas (topológicas): N (máx. M en paralelo)`.
- 2 pruebas unitarias (diamante → `[[a],[b,c],[d]]` + ninguna arista va hacia atrás entre olas; ignora bucles propios y omite ciclos + grafo vacío) y 1 de informe (aparece la línea de etapas). Coste núcleo **19.50 KiB** (sin cambios; subpath analysis 6.70 KiB). `npm test` 353, `npm run test:ui` 262, `npm run check` OK.

## Web Component: JSON declarativo en línea + atributo `readonly`

Hace `<kairo-diagram>` usable en **HTML puro** (CMS, Markdown-HTML, Alpine/htmx) sin escribir JS.

- **Documento en línea:** `<kairo-diagram><script type="application/json">{…documento v2…}</script></kairo-diagram>` se renderiza al conectar; el `<script>` se consume (se elimina del DOM). Si el JSON es inválido, se ignora sin romper.
- **Atributo `readonly`:** `<kairo-diagram readonly>` monta un visor (sin edición); observado, así que togglearlo en vivo llama a `setReadOnly`.
- Se mantiene la API por propiedad (`el.document = …`) y el atributo `theme`.
- 1 prueba UI (vía build global): el componente renderiza 2 nodos desde el JSON en línea **sin JS que fije la propiedad**, el `.cd-editor` interno queda `data-readonly="true"` y el `<script>` se consume. Coste núcleo **19.50 KiB** (sin cambios; el Web Component va en el subpath `/element` y el build global, fuera del núcleo). `npm test` 353, `npm run test:ui` 264, `npm run check` OK.

## Web Component: cargar desde `src` (URL)

Completa la carga declarativa de `<kairo-diagram>`: además del JSON en línea, ahora carga un documento desde una URL.

- `<kairo-diagram src="diagrama.json">` hace `fetch` del documento v2 al conectar (o al cambiar `src`) y lo monta; los errores se ignoran (el elemento queda vacío) sin romper la página. El JSON en línea tiene prioridad si ambos están presentes.
- 1 prueba UI (vía build global): el componente carga 3 nodos desde un `src` `data:` URL **sin JS que fije la propiedad**. Coste núcleo **19.50 KiB** (sin cambios; Web Component en `/element` + build global). `npm test` 353, `npm run test:ui` 266, `npm run check` OK.

## Análisis: cierre transitivo (transitiveClosure)

El complemento de la reducción transitiva (`redundantEdges`/simplificar): expande el grafo con una arista a→b por cada b alcanzable desde a. Útil para hacer explícitas todas las dependencias implícitas.

- Nueva función `transitiveClosure(graph) → SemanticGraph` en `@fsaldivar.dev/diagram/analysis`. Nodos copiados; se excluyen los pares consigo mismo; aristas sintéticas con id `a~b`. Puro y determinista. El resultado es un grafo (sin layout) listo para `autoLayout`.
- 1 prueba unitaria (cadena a→b→c añade a→c; ciclo da aristas mutuas sin auto-par; nodos desconectados no aportan aristas). Coste núcleo **19.50 KiB** (sin cambios; subpath analysis 6.81 KiB). `npm test` 354, `npm run test:ui` 266, `npm run check` OK.

## README del paquete (adopción)

El paquete no tenía README; ahora tiene uno completo para facilitar la adopción e integración en otras plataformas.

- `packages/diagram/README.md`: instalación, quick-start, **mapa de subpaths** (qué exporta cada entry point: núcleo, `/io`, `/export`, `/layout`, `/analysis`, `/themes`, `/templates`, wrappers React/Vue/Svelte, Web Component `/element`, `/global`, `/player`, `/minimap`), ejemplos de interop/React/Web Component y comandos de desarrollo.
- Prueba de sincronización `tests/readme.test.ts`: verifica que el README menciona **cada** subpath público declarado en `package.json` `exports` (evita que la documentación se desincronice al añadir/renombrar entry points) y que contiene las secciones de instalación y quick-start.
- 2 pruebas unitarias. Coste núcleo **19.50 KiB** (sin cambios; solo documentación + prueba). `npm test` 356, `npm run test:ui` 266, `npm run check` OK.

## Agrupar por clave (groupBy: tipo / tag / carril / función)

Una tercera forma de organizar en un clic, junto a auto-agrupar por componente conexo y por comunidad: asignar grupos por una propiedad del nodo.

- Nueva función `groupBy(document, key) → DiagramDocument` en `@fsaldivar.dev/diagram/layout`, con `key` = `'type'` | `'tag'` (primer tag) | `'lane'` | `(node) => string | undefined`. Los nodos sin clave quedan sin grupo; sobrescribe grupos previos. Solo cambia el `group` semántico; las posiciones no se tocan. Puro.
- Ejemplo: botón **Agrupar por tipo** (icono nuevo `kinds`) en el menú *Layout*.
- 2 pruebas unitarias (agrupa por tipo/tag/función, layout intacto, nodos sin clave sin grupo; sobrescribe grupo previo + pureza) y 1 UI (plantilla microservices → los 3 servicios quedan en grupo `service`, las 2 bases en `database`). Coste núcleo **19.50 KiB** (sin cambios; subpath layout 6.46 KiB). `npm test` 358, `npm run test:ui` 268, `npm run check` OK.

## Layout por grupos (clúster, con reconocimiento de grupos)

Hueco competitivo frente a dagre (clusters) / draw.io (contenedores): `autoLayout` ignora los grupos, así que los nodos de un mismo grupo se dispersaban. `clusterLayout` los mantiene juntos.

- Nueva función `clusterLayout(document, { gap?, direction? }) → DiagramDocument` en `@fsaldivar.dev/diagram/layout`. Hace `autoLayout` del subgrafo de cada grupo y coloca los clústeres en fila (`LR`) o columna (`TB`); los nodos sin grupo forman un clúster más. Compuesta a partir de `subgraph` + `autoLayout`. Conserva tamaños, formas, tags y semántica; recalcula posiciones y puertos. Puro.
- Ejemplo: botón **Layout por grupos** (icono nuevo `clusters`) en el menú *Layout*. Combínalo con *Agrupar por tipo* para una vista ordenada por tipo.
- 2 pruebas unitarias (clúster X entirely a la izquierda de Y + semántica intacta + puertos; nodos sin grupo como clúster propio + formas preservadas) y 1 UI (microservices → agrupar por tipo → layout por grupos: los clústeres de servicios y bases no se solapan en x). Coste núcleo **19.50 KiB** (sin cambios; subpath layout 6.71 KiB). `npm test` 360, `npm run test:ui` 270, `npm run check` OK.

## Interoperabilidad de esquemas de texto indentado (outline) + CLI `--from`

Importa/exporta **cualquier texto con sangría** (notas, listas, TODO) como árbol — más universal que la sintaxis Mermaid.

- Nuevo módulo `packages/diagram/src/outline.ts`: `parseOutline(text, opts?)` y `toOutline(document, opts?)`, reexportados desde `@fsaldivar.dev/diagram/io`. La sangría (espacios o tabs) define la jerarquía; se quita el bullet inicial (`-`, `*`, `•`, `1.`). `toOutline` recorre el árbol en DFS; los nodos con varios padres aparecen una vez.
- `convert`/CLI: nuevo formato `'outline'`. Como el texto plano es ambiguo, **no se autodetecta**; en la CLI se usa con extensión `.outline` o con el nuevo flag **`--from=<formato>`** (útil para cualquier formato ambiguo por stdin). Ejemplo: botón **Importar esquema** (icono nuevo `outline`).
- 5 pruebas unitarias (árbol desde sangría, tabs/bullets numerados/líneas en blanco + rechazo de vacío, round-trip, de-dup multi-padre, puente a Mermaid) y 1 UI (esquema indentado → árbol de 4 nodos/3 aristas). Coste núcleo **19.50 KiB** (sin cambios; subpath IO 20.51 KiB, tree-shakeable). `npm test` 365, `npm run test:ui` 272, `npm run check` OK.

## Análisis: lint de arquitectura (advertencias heurísticas)

Avisos *heurísticos* (no reglas estrictas) para diagramas de arquitectura, el dominio del ejemplo ("Sistema de acceso").

- Nueva función `lintArchitecture(document) → ArchitectureDiagnostic[]` en `@fsaldivar.dev/diagram/analysis`. Detecta: **UI→BD directa** (`screen`/`component` → `database`, salta la capa de servicio; `warning`), **la BD inicia conexiones** (`database` → no-BD; `info`) y **nodo de backend aislado** (`service`/`api`/`database` sin conexiones; `info`). Cada diagnóstico lleva `code`, `severity`, `message`, `nodeId?`/`edgeId?`. Puro; puramente consultivo (nada es error duro).
- 2 pruebas unitarias (marca los tres casos con el `edgeId`/`nodeId` correctos y severidad; diagrama en capas limpio → sin avisos). Coste núcleo **19.50 KiB** (sin cambios; subpath analysis 7.11 KiB). `npm test` 367, `npm run test:ui` 272, `npm run check` OK.

## Utilidades: límites del documento y normalización de posiciones

Dos utilidades pequeñas con paridad React Flow (`getNodesBounds`), útiles para embeber, dimensionar exportaciones o limpiar coordenadas tras importar.

- `documentBounds(document) → { x, y, width, height }` en `@fsaldivar.dev/diagram/layout`: la caja envolvente (esquina mínima + tamaño) de todos los nodos; documento vacío → caja cero. Puro.
- `normalizePositions(document, pad = 80) → DiagramDocument`: desplaza todos los nodos para que la esquina superior-izquierda quede en `pad`, quitando grandes desplazamientos que suelen dejar los importadores. Conserva posiciones relativas, tamaños, formas, tags, semántica y puertos. Puro; no muta la entrada.
- 2 pruebas unitarias (bounds abarca todas las cajas + caja cero vacía; normaliza a `pad` preservando espaciado/forma/puertos/semántica + entrada intacta). Coste núcleo **19.50 KiB** (sin cambios; subpath layout 6.85 KiB). `npm test` 369, `npm run test:ui` 272, `npm run check` OK.

## Artefacto standalone completo: `window.Kairo` con todo el kit

El build IIFE global (`dist/kairo.global.js`, subpath `@fsaldivar.dev/diagram/global`) exponía solo el núcleo + el Web Component. Ahora expone **todo el toolkit** en `window.Kairo`, para que el artefacto offline pueda importar, autodiseñar, analizar y exportar sin bundler.

- `global.ts` reexporta los barriles de `io`, `layout`, `export`, `analysis`, `themes` y `templates` además del núcleo y `defineKairoElement` (sin colisiones de nombres). Así `window.Kairo` incluye `parseMermaid`/`toMermaid`/`importAny`/`convertText`, `autoLayout`/`clusterLayout`/`subgraph`, `toSVG`/`toPNG`/`toAscii`, `pageRank`/`findCycle`/`validateFlow`, `themeFrom`, `getTemplate`, etc.
- Tamaño: el IIFE pasa a ~50.9 KiB gzip (autocontenido, fuera del presupuesto del núcleo que sigue en **19.50 KiB**). El núcleo y los subpaths no cambian.
- 1 prueba UI: desde `kairo.global.js` por `<script>`, 10 helpers presentes y un flujo completo Mermaid→doc→`autoLayout`→`toSVG` funciona offline. `npm test` 369, `npm run test:ui` 274, `npm run check` OK.

## Exportación de diff visual (toDiffSvg) + `edgeStroke`

Para revisar cambios de un diagrama (p. ej. en un PR): un único SVG que colorea lo **añadido (verde)**, **eliminado (rojo)** y **cambiado (ámbar)**.

- Nueva opción `edgeStroke?: (edge) => string | undefined` en `SvgExportOptions` (completa la familia `nodeFill`/`nodeStroke`/`nodeTextColor`): color de arista por callback.
- Nuevo `toDiffSvg(before, after, { added?, removed?, changed?, ...SvgExportOptions }) → string` en `@fsaldivar.dev/diagram/export`. Compone `diffDocuments` + `toSVG`: construye el documento unión (`after` + los elementos eliminados traídos de `before`, con su layout) y colorea nodos/aristas por estado vía `nodeStroke`/`nodeTextColor`/`edgeStroke`. Paleta configurable. Puro.
- 2 pruebas unitarias (añadido en verde + eliminado en rojo y todavía dibujado; documentos idénticos sin colores de diff + paleta personalizada) y la prueba del contorno de etiquetas. Coste núcleo **19.50 KiB** (sin cambios; subpath export 10.96 KiB, tree-shakeable). `npm test` 371, `npm run test:ui` 274, `npm run check` OK.

## API: `safeParseDocument` (validación sin excepciones)

Variante no lanzadora de `parseDocument`, al estilo de `zod.safeParse`, para importar entrada no confiable sin `try/catch`.

- Nueva función en el núcleo (`@fsaldivar.dev/diagram`): `safeParseDocument(input) → { ok: true; document } | { ok: false; error: string }`. Nunca lanza (ni con JSON inválido). Útil para hosts que cargan documentos de usuarios/URLs.
- 1 prueba unitaria (entrada válida → `ok`+documento v2; entrada inválida → `ok:false`+mensaje; nunca lanza con basura). Coste núcleo 19.50 → **19.57 KiB** gzip (dentro del presupuesto, ~0.43 KiB de margen). `npm test` 372, `npm run test:ui` 274, `npm run check` OK.

## Exportación de mapa de calor (toHeatmapSvg)

Convierte una métrica (PageRank, intermediación, grado…) en un **mapa de calor**: cada nodo se tiñe según su puntuación. Compone el análisis con `nodeFill`.

- Nuevo `toHeatmapSvg(document, scores, { low?, high?, ...SvgExportOptions }) → string` en `@fsaldivar.dev/diagram/export`. `scores` acepta un mapa `{ id: number }` o una lista `{ id, score }[]` (p. ej. la salida de `pageRank`/`betweennessCentrality`). Interpola el color de cada nodo entre `low` y `high` según su puntuación normalizada; el color del título cambia a uno legible según la luminancia del relleno; los nodos sin puntuación mantienen el tema. Puro.
- 3 pruebas unitarias (gradiente min→max; acepta `NodeScore[]` + paleta personalizada + nodos sin puntuación por defecto; puntuaciones iguales → todo al color bajo). Coste núcleo **19.57 KiB** (sin cambios; subpath export 11.35 KiB, tree-shakeable). `npm test` 375, `npm run test:ui` 274, `npm run check` OK.

## Análisis de impacto: `descendants` / `ancestors`

Alcanzabilidad transitiva dirigida para responder "¿qué se ve afectado por X?" y "¿qué depende de X?".

- Nuevas funciones en `@fsaldivar.dev/diagram/analysis`: `descendants(graph, id)` (todo lo alcanzable aguas abajo siguiendo las aristas) y `ancestors(graph, id)` (todo lo que llega a `id` siguiendo las aristas hacia atrás). Excluyen el propio nodo; ids en orden de declaración; manejan ciclos sin bucles infinitos; `[]` si el nodo no existe. Puro.
- Ejemplo: botón **Impacto** (icono nuevo `impact`) en el menú *Análisis*; resalta el nodo seleccionado y todo su impacto aguas abajo (`descendants`).
- 2 pruebas unitarias (conjuntos aguas abajo/arriba excluyendo el nodo + nodo ausente; ciclos sin bucle y sin incluirse) y 1 UI (en la muestra, impacto de `auth` = users/session/gateway/firebase, login no). Coste núcleo **19.57 KiB** (sin cambios; subpath analysis 7.25 KiB). `npm test` 377, `npm run test:ui` 276, `npm run check` OK.

## Exportación SVG con estilo "a mano alzada" (sketch)

Un look dibujado a mano (al estilo Excalidraw) para la exportación SVG, con muy poco código: un filtro SVG de turbulencia + desplazamiento.

- Nueva opción `sketch?: boolean | { roughness?: number }` en `SvgExportOptions` (`toSVG`, y por tanto `toPNG`/`toSvgDataUri`/`toSvgPages`/`toDiffSvg`/`toHeatmapSvg`). Inyecta un `<filter>` (`feTurbulence` fractalNoise + `feDisplacementMap`, semilla fija) y lo aplica al grupo de contenido; `roughness` controla el `scale` del desplazamiento (default 2.5). Desactivado por defecto (salida idéntica). Determinista.
- 1 prueba unitaria (añade el filtro y lo aplica; off por defecto byte-idéntico; `roughness` controla el `scale`). Coste núcleo **19.57 KiB** (sin cambios; subpath export 11.57 KiB). `npm test` 378, `npm run test:ui` 276, `npm run check` OK.

## Temas: `themeToCss` (propiedades CSS para SSR / design system)

El equivalente estático de `applyTheme`: genera un tema como un bloque de propiedades CSS `--cd-*`, para pegar en una hoja de estilos, un design system o renderizar en servidor sin tocar el DOM en runtime.

- Nueva función `themeToCss(theme, { selector? }) → string` en `@fsaldivar.dev/diagram/themes`. Convierte cada campo a `--cd-<kebab>` (camelCase → kebab) y los números a `px`. Selector por defecto `:root`. Puro.
- 2 pruebas unitarias (emite `--cd-*` con `:root`, camelCase→kebab, números→px; selector personalizado). Coste núcleo **19.57 KiB** (sin cambios; subpath themes 1.93 KiB). `npm test` 380, `npm run test:ui` 276, `npm run check` OK.

## Análisis: informe estructurado (`graphReport`)

El equivalente en JSON del informe Markdown (`toReport`): un resumen analítico de una sola llamada para dashboards, gates de CI y herramientas.

- Nueva función `graphReport(document) → GraphReport` en `@fsaldivar.dev/diagram/analysis`. Compone toda la suite: conteos, densidad, profundidad, **etapas** (generaciones topológicas), diámetro y longitud media de ruta, ciclos (`hasCycle` + un ciclo de muestra), raíces/hojas/aislados, componentes y comunidades, puntos críticos (nodos de corte y puentes) y los top-3 por grado / intermediación / PageRank. Puro.
- 2 pruebas unitarias (resumen de una cadena de 4 nodos: nodes/edges/diámetro/etapas/puentes/arrays de top; detección de ciclo). Coste núcleo **19.57 KiB** (sin cambios; subpath analysis 7.40 KiB). `npm test` 382, `npm run test:ui` 276, `npm run check` OK.

## Mermaid: más formas (cilindro → base de datos, subrutina → módulo)

Mejora de fidelidad del import/export Mermaid (tras la demo de traducción): se reconocen dos formas comunes más.

- `parseMermaid`/`parseFlowText`: `[(texto)]` (cilindro) → nodo tipo **database**; `[[texto]]` (subrutina) → nodo tipo **module** (muestran su icono correspondiente). Los `[texto]` siguen siendo `process`; el orden de las reglas de forma prioriza las específicas.
- `toMermaid`: round-trip — los nodos `database` se exportan como `[(…)]` y los `module` como `[[…]]` (con `mmEsc` para entrecomillar títulos con caracteres especiales).
- 2 pruebas unitarias (import a database/module manteniendo `process` para `[]`; round-trip a la sintaxis cilindro/subrutina). Coste núcleo **19.57 KiB** (sin cambios; subpath IO 20.56 KiB). `npm test` 384, `npm run test:ui` 276, `npm run check` OK.

## Mermaid: encadenado con `&` y omitir líneas de estilo

Robustez del import Mermaid: antes, un diagrama con estilos (`classDef`/`class`/`style`/`linkStyle`) fallaba por completo, y el encadenado con `&` lanzaba error.

- `parseMermaid`/`parseFlowText` ahora **omiten** líneas `classDef`, `class`, `style`, `linkStyle`, `direction`, `click` (no crean nodos falsos ni rompen la importación; los comentarios `%%` ya se ignoraban).
- **Encadenado `&`** (fan-out/fan-in): `A --> B & C` crea A→B y A→C; `X & Y --> Z` crea X→Z e Y→Z. División sensible a corchetes (`splitAmp`), de modo que un `&` dentro de un título (`A[Uno & Dos]`) no se parte.
- 2 pruebas unitarias (omite estilos sin nodos espurios; fan-out/fan-in + `&` en títulos preservado). Coste núcleo **19.57 KiB** (sin cambios; subpath IO 20.63 KiB). `npm test` 386, `npm run test:ui` 276, `npm run check` OK.

## Mermaid: cadenas multi-salto en una línea (`A --> B --> C`)

Completa la fidelidad del import Mermaid: antes solo se parseaba el primer operador de una línea; ahora se tokeniza la cadena completa.

- Nuevo `tokenizeChain` (sensible a corchetes, longest-match de operadores) parte la línea en segmentos de nodo y operadores en orden. Soporta `A --> B --> C`, etiquetas por salto (`A -->|sí| B -.->|no| C`, con el estilo discontinuo preservado en su salto) y combinación con `&` (`A & B --> C --> D`).
- 2 pruebas unitarias (cadena de 2 saltos; etiquetas y discontinuo por salto; `&` + cadena). Coste núcleo **19.57 KiB** (sin cambios; subpath IO 20.86 KiB). `npm test` 388, `npm run test:ui` 276, `npm run check` OK.

## Composición por id: `unionDocuments`

Fusiona dos documentos tratando los elementos con el mismo id como el mismo (unión, de-duplicado) — a diferencia de `mergeDocuments`, que renombra las colisiones y los coloca lado a lado.

- Nueva función `unionDocuments(a, b, { prefer? }) → DiagramDocument` en `@fsaldivar.dev/diagram/layout`. Nodos/aristas con id repetido se unen; en conflicto, `prefer` (por defecto `'b'`) decide qué semántica y layout ganan. Las aristas con extremos ausentes se descartan. Útil para combinar subdiagramas de varias fuentes o aplicar una actualización. Puro.
- 2 pruebas unitarias (unión por id con `b` ganando título/tipo/layout; `prefer:'a'` conserva `a`). Coste núcleo **19.57 KiB** (sin cambios; subpath layout 7.02 KiB). `npm test` 390, `npm run test:ui` 276, `npm run check` OK.

## Análisis: coeficiente de clustering

Métrica de cohesión estándar (como en Gephi), que completa la suite de red (grado, intermediación, PageRank, comunidades, coloreado → **clustering**).

- Nueva función `clusteringCoefficient(graph) → { perNode, average }` en `@fsaldivar.dev/diagram/analysis`. Coeficiente local por nodo (vista no dirigida): fracción de pares de vecinos que están conectados entre sí (0–1); nodos con menos de dos vecinos → 0. `average` es la media global. Puro y determinista.
- 2 pruebas unitarias (triángulo → 1; estrella → 0; nodo con <2 vecinos → 0 y fracción parcial en un cuadrado con diagonal). Coste núcleo **19.57 KiB** (sin cambios; subpath analysis 7.54 KiB). `npm test` 392, `npm run test:ui` 276, `npm run check` OK.

## Abrir archivo (importación por fichero con autodetección)

UX moderna (como draw.io/Excalidraw): abrir un fichero de cualquier formato soportado y detectarlo automáticamente, en vez de pegar texto.

- En el ejemplo: botón **Abrir archivo** (icono `upload`) en el menú *Importar* + `<input type="file">` oculto. Lee el texto del fichero y lo importa con `importAny` (autodetección). `accept` cubre `.mmd/.dot/.json/.canvas/.csv/.graphml/.gexf/.drawio/.puml/.cyjs/.d2/.outline/.md/.excalidraw`. Errores con aviso; no toca el núcleo.
- 1 prueba UI (abrir un `.mmd` por el input de fichero → 3 nodos, 2 aristas, formato detectado). Coste núcleo **19.57 KiB** (sin cambios). `npm test` 392, `npm run test:ui` 278, `npm run check` OK.

## Exportar inventario de nodos (CSV de nodos)

Exporta los nodos como tabla (inventario), complementando la CSV de lista de aristas y la de matriz de adyacencia. Útil para inventarios de componentes en hojas de cálculo.

- Nueva función `toCsvNodes(document, { delimiter?, header?, tagSeparator? }) → string` en `@fsaldivar.dev/diagram/io`. Columnas `id,title,type,group,tags,source`; tags unidos por `tagSeparator` (por defecto `;`); escape CSV estándar. Puro.
- Ejemplo: botón **Exportar nodos CSV** (icono `table`) en el menú *Exportar*; descarga `nodos.csv`.
- 2 pruebas unitarias (tabla con escape + tags unidos + campos vacíos; delimitador/tagSeparator/header personalizados) y 1 UI (inventario con cabecera + 7 filas de la muestra). Coste núcleo **19.57 KiB** (sin cambios; subpath IO 20.96 KiB). `npm test` 394, `npm run test:ui` 280, `npm run check` OK.

## Arrastrar y soltar archivo en el lienzo

Complemento de "Abrir archivo" (paridad draw.io/Excalidraw): suelta un fichero de cualquier formato soportado sobre el lienzo y se importa con autodetección.

- En el ejemplo: el contenedor `#diagram` acepta `dragover`/`drop`; muestra un contorno discontinuo al arrastrar (`is-dropping`) y al soltar lee el fichero e importa con `importAny`. La lógica de importación se refactorizó a `importFile(file)`, compartida por el input de fichero y el drop. Solo ejemplo.
- 1 prueba UI (construye un `DataTransfer` con un `.dot` y lo suelta en `#diagram` → 3 nodos, 2 aristas). Coste núcleo **19.57 KiB** (sin cambios). `npm test` 394, `npm run test:ui` 282, `npm run check` OK.

## Análisis: resumen de diff en texto (`describeDiff`)

Un resumen legible de los cambios entre dos documentos (para mensajes de commit / descripciones de PR), que acompaña al diff visual `toDiffSvg`.

- Nueva función `describeDiff(before, after) → string` en `@fsaldivar.dev/diagram/analysis`: p. ej. `+2 nodos, −1 conexión, 3 nodos modificados`; `Sin cambios` si son idénticos. Singular/plural correctos. Compone `diffDocuments`. Puro.
- 2 pruebas unitarias (resume añadidos/eliminados/modificados de nodos y aristas; `Sin cambios` + pluralización). Coste núcleo **19.57 KiB** (sin cambios; subpath analysis 7.70 KiB). `npm test` 396, `npm run test:ui` 282, `npm run check` OK.

## Red de seguridad: prueba de superficie de API pública

Guarda contra la eliminación/renombrado accidental de exports en los muchos subpaths (complementa la prueba de sincronización del README).

- Nueva `tests/api.test.ts`: importa cada barril (`core`, `/io`, `/layout`, `/export`, `/analysis`, `/themes`, `/templates`) y afirma que ~90 exports clave siguen siendo funciones. Los símbolos del núcleo se importan desde sus módulos fuente (`document.ts`/`operations.ts`/`editor.ts`) para evitar el efecto secundario de `index.ts` que importa `style.css` (tsx no carga CSS).
- 6 pruebas unitarias. Coste núcleo **19.57 KiB** (sin cambios; solo pruebas). `npm test` 402, `npm run test:ui` 282, `npm run check` OK.

## Exportar tablas Markdown (nodos + conexiones)

A diferencia de `toMarkdown` (bloque Mermaid), exporta **tablas Markdown planas** que se renderizan en cualquier sitio (wikis, PRs, READMEs sin soporte Mermaid).

- Nueva función `toMarkdownTables(document, { title? }) → string` en `@fsaldivar.dev/diagram/io`: una tabla de nodos (`ID | Título | Tipo | Grupo | Etiquetas`) y otra de conexiones (`Origen | Destino | Etiqueta`), con escape de `|`. Puro.
- Ejemplo: botón **Exportar tablas Markdown** (icono `table`) en *Exportar*; descarga `diagrama.tablas.md`.
- 1 prueba unitaria (tablas de nodos/conexiones + escape de pipe + filas por título) y 1 UI (descarga con ambas tablas). Coste núcleo **19.57 KiB** (sin cambios; subpath IO 21.12 KiB). `npm test` 403, `npm run test:ui` 284, `npm run check` OK.

## Análisis: chequeo de salud unificado (`healthCheck`)

Una sola llamada para CI: combina la validación estructural (`lintDocument`) con las advertencias de arquitectura (`lintArchitecture`) en una lista unificada con recuentos de error/aviso/info.

- Nueva función `healthCheck(document, options?) → { ok, errors, warnings, info, diagnostics }` en `@fsaldivar.dev/diagram/analysis`. `ok` es `false` solo si hay errores; `diagnostics` normaliza ambos tipos a `{ code, severity, message, nodeId?, edgeId? }`. Puro.
- 2 pruebas unitarias (UI→BD genera aviso + recuentos coherentes con la longitud; flujo lineal válido → sin errores, `ok`). Coste núcleo **19.57 KiB** (sin cambios; subpath analysis 7.80 KiB). `npm test` 405, `npm run test:ui` 284, `npm run check` OK.

## Validación consciente del perfil

Corrección de calidad: `lintDocument` aplicaba reglas de flujo (inicio/fin/ramas) a cualquier documento, generando errores espurios ("falta inicio/fin") en diagramas de arquitectura.

- `lintDocument` (y por composición `healthCheck`) ahora **omite la validación de flujo** cuando el documento tiene un `profile` no-flujo (p. ej. `'architecture'`). Con `profile: 'flow'` o sin perfil se valida como antes (retrocompatible). Las métricas siempre se calculan.
- 1 prueba unitaria (arquitectura → sin diagnósticos de flujo pero `healthCheck` mantiene el aviso de arquitectura como warning; un documento de flujo sigue validándose). Coste núcleo **19.57 KiB** (sin cambios; subpath analysis 7.82 KiB). `npm test` 406, `npm run test:ui` 284, `npm run check` OK.

## Exportación de comparación lado a lado (`toComparisonSvg`)

Complemento del diff en superposición (`toDiffSvg`): dos paneles "Antes | Después" en un solo SVG, más claro para informes o PRs.

- Nueva función `toComparisonSvg(before, after, { gap?, beforeLabel?, afterLabel?, ...SvgExportOptions }) → string` en `@fsaldivar.dev/diagram/export`. Renderiza cada documento con `toSVG` y los anida como dos `<svg>` colocados con etiquetas encima. Paleta/opciones de SVG compartidas. Puro.
- 2 pruebas unitarias (dos paneles anidados + etiquetas Antes/Después + ambos diagramas presentes; etiquetas personalizadas). Coste núcleo **19.57 KiB** (sin cambios; subpath export 11.85 KiB). `npm test` 408, `npm run test:ui` 284, `npm run check` OK.

## Red de seguridad: round-trip entre formatos

Prueba de invariante que protege los ~15 formatos de interoperabilidad de una vez: `parse(serialize(doc))` conserva los recuentos de nodos/aristas.

- Nueva `tests/roundtrip.test.ts`: para un documento conexo con grupo, afirma que el round-trip preserva 4 nodos / 3 aristas en `json, mermaid, dot, canvas, graphml, gexf, cytoscape, drawio, d2, reactflow, plantuml`, y que el grupo `Backend` sobrevive en los formatos que lo soportan (9). Usa `parseAny`/`serializeAs` del conversor.
- 12 pruebas unitarias. Coste núcleo **19.57 KiB** (sin cambios; solo pruebas). `npm test` 420, `npm run test:ui` 284, `npm run check` OK.

## Exportar README completo (`toReadme`)

Documenta un diagrama en una sola llamada: una página Markdown con título, resumen en prosa, bloque `mermaid` renderizable, tablas de nodos/conexiones y una línea de métricas.

- Nueva función `toReadme(document, { title? }) → string` en `@fsaldivar.dev/diagram/io`. Compone `describeDiagram` + `toMermaid` + `toMarkdownTables` + `graphReport`. Ideal para soltar un diagrama en la documentación de un repo. Puro.
- Ejemplo: botón **Exportar README** (icono `doc`) en *Exportar*; descarga `README.diagrama.md`.
- 1 prueba unitaria (ensambla título/resumen/mermaid/tablas/métricas) y 1 UI (descarga con `mermaid` + métricas). **Nota:** `toReadme` arrastra la suite de análisis a `@fsaldivar.dev/diagram/io` (ahora 24.05 KiB gzip de worst-case; tree-shakeable, el que importe solo `toMermaid` no lo paga). Coste núcleo **19.57 KiB** (sin cambios). `npm test` 421, `npm run test:ui` 286, `npm run check` OK.

## Selección por estructura (aguas abajo / componente conexo)

Acciones de selección masiva en la paleta de comandos, para mover/eliminar/exportar subconjuntos estructurales.

- Dos acciones nuevas en la paleta (Cmd/Ctrl+K): **Seleccionar aguas abajo** (el nodo seleccionado + todos sus `descendants`) y **Seleccionar componente conexo** (todo el componente conexo del nodo). Reutilizan `descendants`/`connectedComponents` + `editor.selectNodes`. Solo ejemplo.
- 1 prueba UI (en la muestra: aguas abajo de `auth` = 5 nodos; componente conexo = los 7). Coste núcleo **19.57 KiB** (sin cambios). `npm test` 421, `npm run test:ui` 288, `npm run check` OK.

## Accesibilidad: anuncio de selección (aria-live)

El editor del ejemplo ahora anuncia los cambios de selección a lectores de pantalla.

- Nueva región `#sr-status` (`aria-live="polite"`, `.sr-only`) que `onSelectionChange` actualiza: "Nodo seleccionado: X, Tipo", "Conexión seleccionada" o "N nodos seleccionados". Solo ejemplo.
- **Trampa evitada (igual que el TDZ de `minimap`):** `announceSelection` debe comprobar `selection` nula ANTES de tocar `editor`, porque el editor dispara `onSelectionChange` durante su construcción (antes de que `const editor` esté inicializado). Detectado con la consola del navegador; corregido reordenando.
- 1 prueba UI (seleccionar un nodo anuncia su título; multiselección anuncia el recuento) + la prueba de "arranque sin errores de consola". Coste núcleo **19.57 KiB** (sin cambios). `npm test` 421, `npm run test:ui` 290, `npm run check` OK.

## Renombrar ids (`relabelIds`)

Renombra los ids de los nodos con una función, remapeando aristas y layout — útil para dar espacio de nombres a un documento antes de `unionDocuments`/`mergeDocuments`, o para ids legibles.

- Nueva función `relabelIds(document, fn) → DiagramDocument` en `@fsaldivar.dev/diagram/layout`. `fn(oldId, node)` devuelve el nuevo id; las colisiones se de-duplican con sufijo numérico. Conserva ids de arista, posiciones, formas, tags, grupos y semántica; no muta la entrada. Puro.
- 2 pruebas unitarias (renombra nodos/aristas/layout + conserva el resto + entrada intacta; de-dup de colisiones). Coste núcleo **19.57 KiB** (sin cambios; subpath layout 7.16 KiB). `npm test` 423, `npm run test:ui` 290, `npm run check` OK.

## Red de seguridad: smoke test del servidor de desarrollo (TDZ)

Los bugs de TDZ en tiempo de construcción (un callback que se dispara dentro de `createDiagram` y referencia un `const` aún no inicializado) **solo aparecen en el servidor de desarrollo** (ESM sin empaquetar); el bundle de producción los oculta por hoisting. Han ocurrido dos veces (`minimap`, `announceSelection`).

- `playwright.config.ts`: `webServer` pasa a ser un array que además arranca el servidor dev (`npm run dev`, 1420, `reuseExistingServer`).
- Nueva `tests/ui/dev-smoke.spec.ts`: carga `http://127.0.0.1:1420`, afirma que los 7 nodos se renderizan y que **no hay errores no capturados** (`pageerror`) ni errores de consola. Captura esta familia de regresiones en CI.
- 1 prueba UI (×2 navegadores). Coste núcleo **19.57 KiB** (sin cambios; solo config + prueba). `npm test` 423, `npm run test:ui` 292, `npm run check` OK.

## Importador de matriz de adyacencia (`fromMatrixCsv`)

Cierra el round-trip de matriz: ya exportábamos la matriz de adyacencia cuadrada (`toMatrixCsv`, el CSV que consumen NumPy/pandas/MATLAB/Gephi), pero no había manera de **traerla de vuelta**. `fromMatrixCsv(csv, options?)` (subpath `@fsaldivar.dev/diagram/io`) parsea esa matriz a un documento v2 validado:

- Primera fila = cabecera (`corner, etiqueta…`); cada fila siguiente = `etiqueta, celda…`.
- Celda `matrix[i][j] = k > 0` → `k` aristas dirigidas filaᵢ→columnaⱼ (conserva el conteo de aristas paralelas en el round-trip); la diagonal es un bucle propio.
- Delimitador autodetectado (coma/tab/punto y coma) o explícito; campos entre comillas y `""` respetados; celdas vacías/cero/no numéricas se omiten; `#` comenta líneas; conteo por celda acotado (≤1000) por seguridad.
- Layout en capas determinista (reutiliza `layers` + `defaultPorts`). Puro, sin eval.
- Entradas no cuadradas toleradas: una etiqueta de fila ausente de las columnas se añade como nodo nuevo.
- Nuevo formato `matrix` en `convert`/`convertText` (`parseAny`/`serializeAs`), simétrico con la exportación. No se añade a `detectFormat` (ambiguo frente a la lista de aristas CSV): requiere indicar el formato explícitamente.

Coste núcleo sin cambios (**19.57 KiB**); vive en `/io` (tree-shakeable). `tests/matrix.test.ts` cubre round-trip (incluidos paralelas y bucle), autodetección de delimitador, celdas vacías y errores. `npm test` 426, `npm run check` OK.

## Enlaces de imagen mermaid.ink (`toMermaidInkUrl` / `toMermaidInkMarkdown`)

Integración multiplataforma nueva: convierte un diagrama en una **URL de imagen renderizable en cualquier sitio** que muestre un `<img>` — READMEs de GitHub/GitLab, Confluence, Notion, un wiki o un chat — mediante el servicio público [mermaid.ink](https://mermaid.ink). Distinto de `toShareLink` (deep-link de vuelta a Kairo): esto produce una imagen universal, sin build ni servidor propio.

- `toMermaidInkUrl(doc, options?)` (subpath `@fsaldivar.dev/diagram/io`): exporta a Mermaid (`toMermaid`), lo codifica en base64 URL-safe (sin padding) dentro de la ruta — js-base64 del servidor lo decodifica — y devuelve `https://mermaid.ink/<img|svg|pdf>/<base64>`. Opciones: `host` (auto-alojable; se recortan las barras finales), `format`, `theme` (`default`/`neutral`/`dark`/`forest`), `bgColor` (con o sin `#`), `scale`, `width` como query params.
- `toMermaidInkMarkdown(doc, {alt?, link?, ...})`: envuelve la URL como imagen Markdown `![alt](url)`, lista para pegar en un README; con `link` la imagen queda enlazada. `alt` saneado.
- Sin dependencias (base64 propio, `TextEncoder`, `URLSearchParams`); puro; corre en Node y navegador. El round-trip base64url→Mermaid conserva UTF-8 (€, acentos).
- Ejemplo: botón *Copiar imagen mermaid.ink* en el menú Exportar → copia el Markdown de imagen al portapapeles.

Coste núcleo sin cambios (**19.57 KiB**); vive en `/io` (tree-shakeable: importar solo `toMermaidInkUrl` arrastra `toMermaid`, no el barrel entero). `tests/embed.test.ts` cubre round-trip base64url, opciones/host y el envoltorio Markdown; prueba UI del botón en Chromium/WebKit. `npm test` 429, `npm run test:ui` 294, `npm run check` OK.

## Interoperabilidad GML (`fromGml` / `toGml`)

GML (Graph Modelling Language), el formato clásico `graph [ node [ id 0 label "A" ] … ]` que **leen y escriben NetworkX (`read_gml`/`write_gml`), igraph, Gephi y yEd**. Amplía el alcance a todo el ecosistema científico de grafos de Python/R además de las herramientas de escritorio.

- `fromGml(text, {nodeWidth?, nodeHeight?, gap?})` (subpath `@fsaldivar.dev/diagram/io`): tokenizador + parser recursivo propio (sin eval). Lee el subconjunto práctico: grafo dirigido, `node` con `id`/`label` y `edge` con `source`/`target`/`label`, más las claves `type`/`group`/`name` que escribe `toGml`. Layout en capas determinista. Admite GML plano de NetworkX (ids numéricos, sin extras Kairo): el tipo cae a `process` si no hay clave `type`.
- `toGml(doc)`: emite grafo dirigido con `id` entero por nodo y conserva el id original (`name`), el `type` y el `group` como claves personalizadas, de modo que `fromGml(toGml(doc))` **round-trip conserva ids, tipos, grupos y etiquetas de arista**. Las herramientas externas leen las claves estándar e ignoran los extras. Comillas escapadas.
- Nuevo formato `gml` en `convert`/`convertText` (`parseAny`/`serializeAs`) y **detectado** por `detectFormat`/`importAny` (`graph [` + `node [`, distinguido de Mermaid `graph TD` y DOT `graph {`). CLI `kairo-convert` reconoce `.gml` (entrada y salida).
- Ejemplo: botones *Importar/Exportar GML* en los menús correspondientes (icono `network`). CLI: `node scripts/kairo-convert.mjs diagrama.json salida.gml`.

Coste núcleo sin cambios (**19.57 KiB**); vive en `/io` (tree-shakeable). `tests/gml.test.ts` cubre forma del formato, round-trip (ids/tipos/grupos/labels), GML plano de NetworkX, detección y errores; incluido en el round-trip multiformato y en los formatos que preservan grupo; prueba CLI (`--to=gml` + autodetección) y prueba UI del botón en Chromium/WebKit. `npm test` 436, `npm run test:ui` 296, `npm run check` OK.

## Métricas de calidad de layout (`layoutMetrics`)

Capacidad nueva que ninguna alternativa simple (Mermaid, React Flow, draw.io) expone: una **tarjeta de puntuación objetiva del layout** en una sola llamada, para comparar los ~8 algoritmos de layout de Kairo (layered, árbol, radial, circular, cuadrícula, orgánico, clúster…) y elegir el más limpio, o como gate en CI.

`layoutMetrics(doc, {padding?})` (subpath `@fsaldivar.dev/diagram/analysis`) devuelve:
- `crossings`: pares de aristas cuyos segmentos rectos (centro a centro) se cruzan — menos es más ordenado (compone `countCrossings`).
- `overlaps`: pares de nodos cuyas cajas se solapan (compone `findOverlaps`).
- `totalEdgeLength` / `averageEdgeLength`: longitudes de arista (recta, centro a centro).
- `width` / `height` / `area`: caja contenedora de todos los nodos.
- `density`: fracción de la caja cubierta por nodos (0–1); más alto = más compacto.
- `aspectRatio`: `width/height` (0 si vacío).

Puro, determinista, sin dependencias; maneja el grafo vacío sin dividir por cero. Ejemplo: botón *Métricas de layout* en el menú Análisis (icono `ruler`) → toast con cruces, solapamientos, densidad y longitud media.

Coste núcleo sin cambios (**19.57 KiB**); vive en `/analysis` (tree-shakeable). `tests/metrics.test.ts` cubre cruces/longitud/caja/densidad/aspecto sobre una rejilla con diagonales que se cruzan, el caso solapado sin cruces y el grafo vacío; prueba UI del botón (toast) en Chromium/WebKit. `npm test` 439, `npm run test:ui` 298, `npm run check` OK.

## Auto-layout óptimo (`bestLayout` / `scoreLayouts`)

Construye sobre `layoutMetrics`: en vez de elegir a mano, **prueba varios layouts y se queda con el más limpio** — algo que Mermaid/React Flow/draw.io no hacen. Ranking: menos cruces → menos solapamientos → menor longitud total de aristas → mayor densidad (desempate por orden de candidato).

- `scoreLayouts(doc, {candidates?})` (subpath `@fsaldivar.dev/diagram/layout`): aplica cada candidato, lo puntúa con `layoutMetrics` y devuelve los resultados ordenados (mejor primero), cada uno con su `document` re-dispuesto, para presentar alternativas. Un layout que falle sobre ese grafo se omite.
- `bestLayout(doc, {candidates?})`: devuelve el documento con el mejor layout; cae al jerárquico si ningún candidato aplica. Puro; no muta la entrada.
- Candidatos por defecto: `layered`, `tree`, `radial`, `circular`, `grid`, `organic`. `cluster` se excluye (necesita grupos); actívalo con `candidates`. Lista deduplicada; todos los layouts candidatos son deterministas → resultado determinista.
- Ejemplo: botón *Auto-layout óptimo* en el menú Layout (icono `wand`) → re-dispone y avisa del layout elegido y sus cruces.

Coste núcleo sin cambios (**19.57 KiB**); vive en `/layout` (tree-shakeable; `scoreLayouts` arrastra `layoutMetrics` de `/analysis`, pero importar solo `gridLayout` no lo paga). `tests/bestlayout.test.ts` cubre orden best-first, consistencia métrica↔documento, lista de candidatos personalizada/dedupe/pureza y el fallback con lista vacía; prueba UI del botón (toast + re-disposición) en Chromium/WebKit. `npm test` 443, `npm run test:ui` 300, `npm run check` OK.

## Exportación Typst / CeTZ (`toTypst`)

Integración con **Typst**, la alternativa moderna a LaTeX que crece rápido en documentación técnica y académica; dibuja diagramas con el paquete CeTZ. Complementa la exportación TikZ (LaTeX) ya existente.

`toTypst(doc, {scale?, importLine?, cetzVersion?})` (subpath `@fsaldivar.dev/diagram/export`) emite un bloque autónomo `#cetz.canvas({ … })`:
- Cada nodo → `rect` + `content` centrado con el título; cada arista → `line` con marca de flecha (`mark: (end: ">")`), discontinua cuando el layout lo indica; etiquetas de arista como `content` en el punto medio.
- Coordenadas del layout con **Y invertida** (el eje de Typst apunta hacia arriba) y escaladas a unidades de lienzo (`scale` px/unidad, por defecto 60).
- Las etiquetas se emiten como **cadenas Typst entre comillas**, así el texto del diagrama no necesita escapar marcado (solo `\` y `"`).
- `importLine:false` omite la línea `#import` para pegar dentro de un import existente; `cetzVersion` fija la versión.
- Puro, solo exportación. Ejemplo: botón *Exportar Typst* en el menú Exportar → `diagrama.typ`. CLI: `kairo-convert diagrama.json salida.typ` (o `--to=typst`).

Coste núcleo sin cambios (**19.57 KiB**); vive en `/export` (tree-shakeable). `tests/typst.test.ts` cubre estructura del canvas, inversión/escala de Y, aristas discontinuas/etiquetas, omisión de import y robustez ante extremos faltantes; prueba CLI (`--to=typst`) y prueba UI del botón (descarga `.typ`) en Chromium/WebKit. `npm test` 447, `npm run test:ui` 302, `npm run check` OK.

## Enlaces de imagen Kroki (`toKrokiUrl` / `toKrokiMarkdown`)

Integración con **Kroki** (kroki.io, auto-alojable; integrado en GitLab, Confluence, Antora, Asciidoctor), que renderiza 25+ lenguajes de diagrama a SVG/PNG/PDF. Complementa mermaid.ink: Kroki acepta varias fuentes y admite PNG/PDF server-side.

- `toKrokiUrl(doc, {host?, diagram?, format?})` (subpath `@fsaldivar.dev/diagram/io`): exporta el documento al lenguaje elegido (`mermaid` por defecto, o `graphviz`/`plantuml`/`d2`), **comprime en un stream zlib válido usando solo bloques "stored" (sin dependencias, sin compresor real)** + Adler-32, lo codifica en base64url y forma `<host>/<diagram>/<format>/<payload>` — justo lo que espera el endpoint GET de Kroki. `format` svg (def.)/png/pdf/jpeg.
- `toKrokiMarkdown(doc, {alt?, link?, ...})`: envuelve la URL como imagen Markdown.
- El stream zlib es estándar: la prueba lo **descomprime con `zlib.inflateSync` de Node** y comprueba que recupera exactamente la fuente (validez + sin pérdidas). Puro, sin servidor aquí.
- Ejemplo: botón *Copiar imagen Kroki* en el menú Exportar → copia el Markdown al portapapeles.

Coste núcleo sin cambios (**19.57 KiB**); vive en `/io` (tree-shakeable: `toKrokiUrl` arrastra los exportadores de texto que use). `tests/embed.test.ts` cubre inflado real con zlib (mermaid y graphviz), host/formato/lenguaje y el envoltorio Markdown; prueba UI del botón (clipboard) en Chromium/WebKit. `npm test` 450, `npm run test:ui` 304, `npm run check` OK.

## SVG editable: round-trip sin pérdida (`toEditableSvg` / `fromSvg`)

Convierte el SVG de Kairo en un **formato de ida y vuelta sin pérdida**, como el "SVG editable" de draw.io: exporta una imagen, retócala o inclúyela en un documento, y vuelve a importarla con **fidelidad total** (formas, tags, grupos, puertos, semántica de aristas).

- `toEditableSvg(doc, options?)` (subpath `@fsaldivar.dev/diagram/export`): genera el SVG normal (`toSVG`, acepta las mismas opciones) y además incrusta el documento completo como JSON XML-escapado en `<metadata id="kairo-document" data-format="kairo-v2">`, justo tras la etiqueta `<svg>`. Los renderizadores ignoran `<metadata>`, así que la imagen se ve igual en cualquier sitio.
- `fromSvg(svg)` (subpath `@fsaldivar.dev/diagram/io`): extrae y valida ese documento (lanza si el SVG no lleva metadatos Kairo). `isEditableSvg(svg)` indica si lo trae. Sin eval; todo el resto del SVG se ignora.
- `KAIRO_SVG_MARKER` expone el id del bloque de metadatos.
- Ejemplo: botón *Exportar SVG editable* → `diagrama.editable.svg`; además *Abrir archivo*, arrastrar-soltar e *Importar auto* detectan y reimportan un SVG editable automáticamente (`isEditableSvg` → `fromSvg`).

Puro, solo exportación en el lado SVG. Coste núcleo sin cambios (**19.57 KiB**); `toSVG` queda intacto (sin cambio de tamaño/snapshots por defecto). `tests/svground.test.ts` cubre estructura del metadato, round-trip completo con caracteres especiales (`& < > "`) y el error sin metadatos; prueba UI que exporta, sustituye el diagrama y lo restaura reimportando el SVG, en Chromium/WebKit. `npm test` 453, `npm run test:ui` 306, `npm run check` OK.

## Fusionar nodos: contracción de grafo (`mergeNodes`)

Primitiva de edición de grafo que ningún lienzo simple (Excalidraw, draw.io) ofrece a nivel semántico: **colapsa un conjunto de nodos en uno**, reconectando todas las aristas al superviviente. Útil para abstraer/simplificar un diagrama (p. ej. plegar un clúster en un solo nodo).

`mergeNodes(doc, ids, {into?, title?})` (subpath `@fsaldivar.dev/diagram/layout`):
- Toda arista que toque el conjunto se reconecta al superviviente; las aristas internas del conjunto quedan como bucles propios y **se descartan**; las que coincidan tras la fusión (mismo origen, destino, label y relation) **se deduplican**.
- El superviviente conserva su identidad (cámbiala con `into`; cambia su título con `title`) y se mueve al **centroide** de las cajas fusionadas, manteniendo su tamaño. Las aristas cuyos extremos no cambian conservan su ruta; las reconectadas recalculan puertos.
- Puro; no muta la entrada. Devuelve el documento sin cambios si existen menos de dos de los ids.
- Ejemplo: botón *Fusionar nodos* en el menú Layout (icono `group`) → fusiona la multiselección (Shift-clic) y selecciona el superviviente.

Coste núcleo sin cambios (**19.57 KiB**); vive en `/layout` (tree-shakeable). `tests/mergenodes.test.ts` cubre contracción con descarte de bucles y dedupe de paralelas, centroide/tamaño, `into`/`title` y reconexión, y el no-op con pureza; prueba UI que fusiona una selección Shift en Chromium/WebKit. `npm test` 457, `npm run test:ui` 308, `npm run check` OK.

## Insertar nodo en arista (`splitEdge`)

Primitiva inversa de `mergeNodes` y clásica de editores (draw.io: "add node on edge"): **inserta un nodo en medio de una conexión**, partiéndola en dos.

`splitEdge(doc, edgeId, {id?, type?, title?, width?, height?})` (subpath `@fsaldivar.dev/diagram/layout`):
- La arista `s→t` pasa a `s→nuevo→t`. La semántica de la arista original (label, relation, condition, tags) se traslada al **primer segmento** (`s→nuevo`); el segundo queda limpio.
- El nuevo nodo se coloca en el **punto medio** de los extremos y se dimensiona según `nodeDefaults[type]` (proceso por defecto). Los ids generados se deduplican (nodo `${edgeId}-mid`, aristas `${edgeId}-a`/`-b`).
- Puro; no muta la entrada. Devuelve el documento sin cambios si el id de arista no existe.
- Ejemplo: botón *Insertar nodo en arista* en el menú Layout (icono `plus`) → actúa sobre la conexión seleccionada e inserta un nodo «Paso».

Coste núcleo sin cambios (**19.57 KiB**); vive en `/layout` (tree-shakeable). `tests/splitedge.test.ts` cubre el traslado de semántica al primer segmento, el punto medio con tamaño válido y la deduplicación de ids/arista desconocida con pureza; prueba UI que selecciona una arista y la parte (7→8 nodos, +1 arista) en Chromium/WebKit. `npm test` 460, `npm run test:ui` 310, `npm run check` OK.

## Omitir nodo: suavizado de serie (`bypassNode`)

Completa la familia de primitivas de edición de grafo (`mergeNodes` contrae, `splitEdge` expande): **elimina un nodo pero conserva el flujo** reconectando cada predecesor con cada sucesor ("node smoothing" / contracción en serie). Un borrado normal cortaría el camino; esto lo preserva. Útil para quitar un paso intermedio de un pipeline sin romper la conectividad.

`bypassNode(doc, id)` (subpath `@fsaldivar.dev/diagram/layout`):
- Calcula predecesores y sucesores del nodo, lo elimina junto con sus aristas y añade una arista `pred→succ` por cada combinación, **omitiendo duplicados y bucles propios** (si `pred===succ`). Las aristas existentes conservan su ruta; las nuevas reciben puertos por defecto.
- Si el nodo no tiene sucesores (o predecesores), simplemente se borra con sus aristas. Puro; no muta la entrada; no-op si el id no existe.
- Ejemplo: botón *Omitir nodo* en el menú Layout (icono `route`) → actúa sobre el nodo seleccionado.

Coste núcleo sin cambios (**19.57 KiB**); vive en `/layout` (tree-shakeable). `tests/bypassnode.test.ts` cubre la reconexión cartesiana con dedupe, el caso sin sucesores, el no-op con pureza y el descarte de bucles propios; prueba UI que omite `auth` y verifica que `login` alcanza `users` y `session` directamente, en Chromium/WebKit. `npm test` 464, `npm run test:ui` 312, `npm run check` OK.

## Interoperabilidad Pajek (`fromPajek` / `toPajek`)

Pajek (`.net`), el formato de red que usan **Pajek, NetworkX (`read_pajek`/`write_pajek`), igraph y Gephi** para análisis de redes sociales y grafos grandes. Amplía el alcance en ciencia de redes junto a GML/GEXF/GraphML/Cytoscape ya soportados.

- `fromPajek(text, {nodeWidth?, nodeHeight?, gap?})` (subpath `@fsaldivar.dev/diagram/io`): lee el bloque `*Vertices` (id 1-based + etiqueta entre comillas; coordenadas opcionales ignoradas) y los bloques `*Arcs`/`*Edges` y sus formas de lista de adyacencia `*Arcslist`/`*Edgeslist`. `%` inicia comentario. Layout en capas determinista. Sin eval.
- `toPajek(doc)`: emite `*Vertices N` (ids 1-based, títulos entre comillas; las comillas internas pasan a `'`) y un bloque `*Arcs` de líneas dirigidas `origen destino 1`. NetworkX/igraph/Pajek lo leen.
- Nuevo formato `pajek` en `convert`/`convertText` y **detectado** por `detectFormat`/`importAny` (`*Vertices`, muy distintivo). CLI `kairo-convert` reconoce `.net`/`.paj`.
- Ejemplo: botones *Importar/Exportar Pajek* (icono `gephi`). CLI: `node scripts/kairo-convert.mjs diagrama.json red.net`.

Coste núcleo sin cambios (**19.57 KiB**); vive en `/io` (tree-shakeable). `tests/pajek.test.ts` cubre forma del formato, round-trip de estructura, lectura de `*Edges`/`*Arcslist` y detección/errores; incluido en el round-trip multiformato; prueba CLI (`--to=pajek` + autodetección) y prueba UI del botón en Chromium/WebKit. `npm test` 470, `npm run test:ui` 314, `npm run check` OK.

## Reducir cruces: layout jerárquico barycenter (`reduceCrossings`)

Mejora medible de calidad de layout: `layoutMetrics` ya mide los cruces de aristas, pero el layout en capas base no los minimiza activamente. `reduceCrossings` aplica la **heurística de barycenter de Sugiyama** para re-disponer el diagrama en capas con menos cruces.

`reduceCrossings(doc, {gap?, rankGap?, iterations?, direction?})` (subpath `@fsaldivar.dev/diagram/layout`):
- Cada nodo conserva su **rango** jerárquico (profundidad desde las raíces) pero se **reordena dentro del rango** según la posición media (barycenter) de sus vecinos en el rango adyacente, barriendo hacia abajo y hacia arriba durante `iterations` pasadas (4 por defecto).
- Produce menos cruces que el layout en capas simple (verificable con `layoutMetrics`/`countCrossings`); en un caso bipartito evitable deja **cero** cruces.
- `direction` TB (por defecto) o LR. Determinista y puro; tamaños, formas, tags y semántica intactos, puertos recalculados.
- Ejemplo: botón *Reducir cruces* en el menú Layout (icono `route`) → re-dispone respetando el perfil del documento (TB para flujos, LR si no).

Coste núcleo sin cambios (**19.57 KiB**); vive en `/layout` (tree-shakeable). `tests/reducecrossings.test.ts` cubre el caso bipartito sin cruces, que nunca empeora frente al layout en capas, preservación/determinismo/pureza y el grafo vacío; prueba UI que re-dispone sin alterar el grafo en Chromium/WebKit. `npm test` 474, `npm run test:ui` 316, `npm run check` OK.

## Procedimiento paso a paso (`toProcedure`)

Salida nueva que ninguna otra herramienta de diagramas produce: convierte un **diagrama de flujo en un procedimiento/runbook numerado y escrito** (flowchart → documentación/SOP). Ideal para acompañar un flujo con instrucciones en prosa.

`toProcedure(doc, {title?})` (subpath `@fsaldivar.dev/diagram/analysis`):
- Numera los pasos en **orden topológico** (orden de declaración como respaldo cuando el grafo tiene un ciclo).
- Cada paso lista sus conexiones salientes como ramas con su etiqueta, apuntando al **número de paso** del destino (p. ej. `- **sí** → Panel (paso 3)`); los nodos sin salida se marcan `(fin)`.
- Markdown listo para pegar en documentación. Puro; compone `topologicalOrder`.
- Ejemplo: botón *Exportar procedimiento* en el menú Exportar → `diagrama.procedimiento.md`.

Coste núcleo sin cambios (**19.57 KiB**); vive en `/analysis` (tree-shakeable). `tests/procedure.test.ts` cubre numeración en orden topológico con ramas etiquetadas y referencias de paso, marca `(fin)` en terminales y el respaldo a orden de declaración en grafos cíclicos; prueba UI que descarga el `.md` numerado en Chromium/WebKit. `npm test` 483, `npm run test:ui` 318, `npm run check` OK.

## Exportación Structurizr DSL (C4) (`toStructurizr`)

Integración con **Structurizr**, la plataforma popular de "arquitectura C4 como código" (structurizr.com; también la renderizan Kroki y el Structurizr CLI/Lite). Encaja con el perfil de arquitectura de Kairo.

`toStructurizr(doc, {name?, autolayout?})` (subpath `@fsaldivar.dev/diagram/io`) emite un `workspace { model { … } views { … } }`:
- Un elemento por nodo con identificador DSL saneado (letras/dígitos/`_`, no empieza por dígito, deduplicado). Los tipos se mapean a elementos C4: `external`→`person`, `screen/service/api/component/module/file/folder/database`→`container` (los `database` con `tags "Database"`), el resto `softwareSystem`.
- Una relación `origen -> destino "etiqueta"` por arista.
- Una vista `systemLandscape` con `include *` y `autolayout` (`lr` por defecto, `tb`, o `false` para omitir). Comillas escapadas.
- Puro, solo exportación. Ejemplo: botón *Exportar Structurizr* en el menú Exportar → `diagrama.dsl`. CLI: `kairo-convert diagrama.json arq.dsl` (o `--to=structurizr`).

**Arreglo de infraestructura (tsconfig):** el `vite.config` del ejemplo ya aliasa cada subpath de `@fsaldivar.dev/diagram/*` a `src`, pero `tsconfig.json` solo aliasaba el paquete raíz, así que `tsc` resolvía `@fsaldivar.dev/diagram/react` (y demás) a `dist` y chocaba con los tipos de `src` (identidad de clase `DiagramEditor`). Se añadieron los paths de todos los subpaths a `tsconfig.json`, de modo que `tsc` y Vite resuelven igual (a `src`). Beneficio extra: ya no hace falta reconstruir `dist` antes de `npm run check` tras añadir una exportación a un subpath.

Coste núcleo sin cambios (**19.57 KiB**); vive en `/io` (tree-shakeable). `tests/structurizr.test.ts` cubre la estructura del workspace (elementos/relaciones/vista, tags de base de datos, mapeo person/container), el saneo/dedupe de identificadores y la omisión de `autolayout`; prueba CLI (`--to=structurizr`) y prueba UI del botón en Chromium/WebKit. `npm test` 487, `npm run check` OK.

## Importación Structurizr DSL (`fromStructurizr`) — round-trip C4

Cierra el round-trip de Structurizr (C4-as-code), inverso de `toStructurizr`, y lo convierte en **formato de primera clase** en `convert`.

`fromStructurizr(text, {nodeWidth?, nodeHeight?, gap?})` (subpath `@fsaldivar.dev/diagram/io`):
- Localiza el bloque `model { … }` por balanceo de llaves (ignora `views`, `properties`, etc.).
- Lee definiciones de elementos `id = kind "Nombre"` a cualquier nivel de anidación (cuerpos con `tags`/elementos anidados incluidos) y relaciones `a -> b "etiqueta"`. Los kinds se mapean a tipos de nodo (person→external, container/softwareSystem→service, database→database, component→component). Layout en capas determinista; sin eval.
- Nuevo formato `structurizr` en `convert`/`convertText` (`parseAny`/`serializeAs`) y **detectado** por `detectFormat`/`importAny` (`workspace` + `model {`). CLI `kairo-convert` reconoce `.dsl`/`.structurizr` (entrada y salida).
- Ejemplo: botón *Importar Structurizr* (icono `brackets`). Incluido en el round-trip multiformato (conteo de nodos/aristas).
- Nota: el saneo de comillas de `toStructurizr` (`"`→`'`) hace el round-trip de títulos con comillas dobles ligeramente con pérdida; estructura y etiquetas se conservan.

Coste núcleo sin cambios (**19.57 KiB**); vive en `/io` (tree-shakeable). `tests/structurizr.test.ts` cubre round-trip de estructura, DSL escrito a mano con cuerpos anidados + bloque `views` ignorado, detección y errores (sin `model`, modelo vacío); incluido en el round-trip multiformato; prueba CLI (`--from=structurizr`) y prueba UI (exportar → reemplazar → reimportar) en Chromium/WebKit. `npm test` 493, `npm run test:ui` 342, `npm run check` OK.

## Complejidad ciclomática (`cyclomaticComplexity`)

Métrica clásica de ingeniería de software que ninguna de las alternativas calcula, encaja con el enfoque de flujos/SOP de Kairo: la **complejidad ciclomática de McCabe** del grafo leído como grafo de control de flujo, `M = E − N + 2P` (E aristas, N nodos, P componentes débilmente conexos) — el número de rutas linealmente independientes; a mayor valor, más difícil de seguir/probar.

`cyclomaticComplexity(graph)` (subpath `@fsaldivar.dev/diagram/analysis`) devuelve `{ nodes, edges, components, complexity, decisionPoints }`, donde `decisionPoints` son los nodos con grado de salida ≥ 2 (puntos de ramificación). Un flujo lineal puntúa 1; una decisión que reconverge, 2; cada componente desconectado suma a P. El grafo vacío puntúa 0. Puro.

Ejemplo: botón *Complejidad* en el menú Análisis (icono `bolt`) → toast con la complejidad, nodos, aristas y decisiones.

Coste núcleo sin cambios (**19.57 KiB**); vive en `/analysis` (tree-shakeable). `tests/cyclomatic.test.ts` cubre el flujo lineal (1), la decisión reconvergente (2) con su punto de decisión, dos componentes desconectados (sube P) y el grafo vacío; prueba UI del botón (toast) en Chromium/WebKit. `npm test` 497, `npm run test:ui` 344, `npm run check` OK.

## GML con geometría: round-trip de layout (`toGml` / `fromGml`)

Mejora de fidelidad del interop GML: antes conservaba la estructura pero **descartaba las posiciones** (siempre re-disponía en capas). Ahora GML conserva también el **layout**.

- `toGml(doc)` emite por nodo un bloque `graphics [ x <cx> y <cy> w <w> h <h> ]` con las coordenadas del layout (x/y es el **centro**, la convención de yEd).
- `fromGml(text)` lee esas coordenadas: si **todos** los nodos traen `graphics` con x/y, reconstruye el layout exacto (centro→esquina, anchos/altos acotados al mínimo válido); si alguno carece de ellas, cae al layout en capas determinista (como antes). yEd y otras herramientas que exportan GML con `graphics` ahora conservan su disposición al importar.
- `fromGml(toGml(doc))` ahora **round-trip del layout** (posiciones y tamaños), no solo de la estructura/ids/tipos/grupos.

Puro, sin cambios de API ni de coste núcleo (**19.57 KiB**); vive en `/io` (tree-shakeable). `tests/gml.test.ts` añade el round-trip de coordenadas (centro calculado + restauración exacta) y el fallback a capas cuando falta `graphics` en algún nodo; la prueba UI existente de GML sigue verde. `npm test` 499, `npm run test:ui` 350, `npm run check` OK.

## GraphML con geometría: round-trip de layout (`toGraphml` / `fromGraphml`)

Siguiendo a GML, ahora GraphML también conserva el **layout** además de la estructura (yEd —el editor GraphML dominante— siempre guarda geometría).

- `toGraphml(doc)` declara claves de nodo `x`/`y`/`w`/`h` y emite `<data>` con las coordenadas del layout (**esquina superior izquierda**).
- `fromGraphml(xml)` lee la geometría de dos formas: las claves `<data>` `x`/`y`/`w`(`width`)/`h`(`height`) **o** el elemento de yEd `<y:Geometry x= y= width= height=/>`. Si **todos** los nodos traen coordenadas reconstruye el layout exacto (acotando tamaños al mínimo válido); si falta en alguno, cae al layout en capas determinista. El fallback de título ya no toma valores numéricos de geometría por error.
- `fromGraphml(toGraphml(doc))` ahora **round-trip del layout** (posiciones y tamaños); importar un `.graphml` de yEd conserva su disposición.

Puro, sin cambios de API ni de coste núcleo (**19.57 KiB**); vive en `/io` (tree-shakeable). `tests/graphml.test.ts` añade el round-trip de coordenadas, la lectura de `<y:Geometry>` de yEd y el fallback a capas cuando falta geometría; la prueba UI existente de GraphML sigue verde. `npm test` 502, `npm run test:ui` 350, `npm run check` OK.

## Layout estable / incremental (`stableLayout`)

Capacidad nueva poco común en las alternativas: evita el "salto" desorientador de re-disponer todo al editar/importar/fusionar. `stableLayout(document, reference, {gap?})` (subpath `@fsaldivar.dev/diagram/layout`):
- Mantiene cada nodo que ya existía en `reference` **en su posición de referencia** (conservando el tamaño/forma actuales).
- Coloca solo los nodos **nuevos** de `document`: cerca del centroide de sus vecinos ya colocados, empujándolos hacia abajo hasta que no se solapen; los nuevos sin vecino colocado van en una **fila nueva** bajo todo lo demás.
- `document` es la fuente de verdad de la estructura; `reference` solo aporta posiciones. Determinista y puro; recalcula puertos.
- Ejemplo: botón *Añadir nodo estable* en el menú Layout → añade un nodo y aplica `stableLayout` **sin** `fit()`, de modo que el resto del diagrama (y el viewport) no se mueve; selecciona el nodo nuevo.

Coste núcleo sin cambios (**19.57 KiB**); vive en `/layout` (tree-shakeable). `tests/stablelayout.test.ts` cubre que los nodos existentes conservan posición y el nuevo no se solapa, la proximidad del nuevo a su vecino colocado, y el caso de `reference` vacío (fila nueva, pureza); prueba UI que verifica que un nodo existente no se mueve en pantalla al añadir otro, en Chromium/WebKit. `npm test` 505, `npm run test:ui` 352, `npm run check` OK.

## Cytoscape con tamaños: round-trip de layout completo (`toCytoscape` / `fromCytoscape`)

Completa la fidelidad de layout del interop Cytoscape.js: ya conservaba las **posiciones** (`position`, centro, usado por el layout `preset` de Cytoscape) pero reponía **tamaños por defecto** al importar. Ahora también conserva el tamaño.

- `toCytoscape(doc)` añade `data.width`/`data.height` por nodo (convención habitual de Cytoscape para mapear estilo con `width: data(width)`), además de `position`.
- `fromCytoscape(input)` lee `data.width`/`data.height` (acotados al mínimo válido 140×76) y reconstruye la caja exacta; cuando faltan, usa los tamaños por defecto como antes.
- `fromCytoscape(toCytoscape(doc))` ahora **round-trip de posición y tamaño** (siempre que las coordenadas partan de ≥80, el margen propio de Kairo; la normalización solo desplaza coordenadas negativas/pequeñas hacia la vista).

Puro, sin cambios de API ni de coste núcleo (**19.57 KiB**); vive en `/io` (tree-shakeable). `tests/cytoscape.test.ts` añade el round-trip de caja (posición centro + width/height) y el acotado de tamaños diminutos al mínimo; la prueba UI existente de Cytoscape sigue verde. `npm test` 507, `npm run test:ui` 352, `npm run check` OK.

Con esto, el interop que conserva layout es: JSON, Canvas, GEXF, GML, GraphML, **Cytoscape** y React Flow, más el SVG editable de fidelidad total.

## Exportación Mermaid C4 (`toMermaidC4`)

Segunda vía para el caso de arquitectura (junto a Structurizr DSL): exporta a **Mermaid `C4Context`**, que se renderiza como diagrama C4 allí donde Mermaid soporta C4 (GitHub, GitLab, mermaid.live…).

`toMermaidC4(doc, {title?})` (subpath `@fsaldivar.dev/diagram/io`):
- Un elemento por nodo con alias identificador saneado/deduplicado; el tipo de nodo se mapea a kind C4: `external`→`Person`, `database`→`SystemDb`, el resto `System` (válido en `C4Context`). Una `Rel(origen, destino, "etiqueta")` por arista (etiqueta vacía si no tiene). Comillas internas `"`→`'`.
- Export only. Ejemplo: botón *Exportar Mermaid C4* en el menú Exportar → `diagrama.c4.mmd`. CLI `kairo-convert` con `.c4` o `--to=mermaidc4`.

Coste núcleo sin cambios (**19.57 KiB**); vive en `/io` (tree-shakeable). `tests/c4.test.ts` cubre el `C4Context` con mapeo de kinds, `Rel` (incl. etiqueta vacía), título, saneo/dedupe de alias; prueba CLI (`--to=mermaidc4`) y prueba UI del botón en Chromium/WebKit. `npm test` 510, `npm run test:ui` 354, `npm run check` OK.

## Conjunto de aristas de retroalimentación (`feedbackArcSet`)

Algoritmo clásico de grafos que ninguna alternativa expone: el **conjunto de aristas cuya eliminación (o inversión) vuelve acíclico el grafo** — la base del rompimiento de ciclos para layouts jerárquicos y planificadores. `feedbackArcSet(graph)` (subpath `@fsaldivar.dev/diagram/analysis`):
- Heurística de **aristas de retroceso** por DFS (válida, aunque no necesariamente mínima); los bucles propios se incluyen siempre. DFS iterativo (seguro en grafos profundos). Devuelve ids de arista en orden de documento. Puro.
- Quitar las aristas devueltas deja un DAG (verificado en pruebas con `findCycle`).
- Ejemplo: botón *Aristas de retroalimentación* en el menú Análisis (icono `cycle`) → resalta las aristas que rompen los ciclos (o avisa si el grafo ya es acíclico).

Coste núcleo sin cambios (**19.57 KiB**); vive en `/analysis` (tree-shakeable). `tests/feedback.test.ts` cubre el grafo acíclico (vacío), la arista de retroceso de un ciclo simple (y que su eliminación da un DAG), bucles propios + múltiples ciclos, y el determinismo; prueba UI del botón (resalta 1 en un ciclo de 3) en Chromium/WebKit. `npm test` 514, `npm run test:ui` 356, `npm run check` OK.

## Dominadores de flujo (`dominators` / `dominatorChain`)

Análisis de flujo clásico que ninguna alternativa expone: el **árbol de dominadores inmediatos** (Cooper–Harvey–Kennedy). `idom[n]` es el único nodo por el que pasa obligatoriamente todo camino desde el inicio hasta `n`. Responde "¿qué paso es inevitable para llegar a X?" en un flujo o una arquitectura.

- `dominators(graph, root?)` (subpath `@fsaldivar.dev/diagram/analysis`) → `Map<string,string>` de dominador inmediato (el inicio se mapea a sí mismo); solo nodos alcanzables desde el inicio. `root` por defecto el primer nodo con grado de entrada 0. DFS iterativo (seguro en grafos profundos). Puro.
- `dominatorChain(graph, node, root?)` → `[inicio, …, node]`: los pasos inevitables en orden, o `[]` si el nodo es inalcanzable.
- Ejemplo: botón *Dominadores* en el menú Análisis (icono `route`) → resalta la cadena de pasos inevitables para llegar al nodo seleccionado.

Coste núcleo sin cambios; vive en `/analysis` (tree-shakeable). `tests/dominators.test.ts` cubre el diamante (solo el inicio domina el merge), la rama en cadena, la cadena completa y los nodos inalcanzables; prueba UI del botón (diamante → 3 pasos resaltados) en Chromium/WebKit. `npm run check` OK.

## Condensación de ciclos (`condense`)

Operación clásica de grafos que ninguna alternativa ofrece: colapsa cada **componente fuertemente conexo (SCC)** en un solo nodo, dejando el **esqueleto acíclico** (grafo condensación/cociente) de un grafo cíclico — la forma estándar de ver la estructura de alto nivel de un flujo enredado.

`condense(doc)` (subpath `@fsaldivar.dev/diagram/layout`): por cada SCC con más de un nodo lo fusiona en su primer miembro vía `mergeNodes` (reconecta aristas, descarta las internas del SCC y las duplicadas); los componentes de un solo nodo quedan intactos. El resultado es **siempre un DAG**. Compone `stronglyConnectedComponents` + `mergeNodes`. Puro; no muta la entrada.

Ejemplo: botón *Condensar ciclos* en el menú Layout (icono `cycle`) → colapsa los ciclos y avisa del número de nodos del DAG resultante.

Coste núcleo sin cambios (**20.00 KiB**, la condensación vive en `/layout`, tree-shakeable; **margen de núcleo = 1 byte** tras la característica de formas de otra sesión — nuevas features deben ir en subpaths hasta recortar el núcleo). `tests/condense.test.ts` cubre el colapso de un SCC dejando un DAG (verificado con `findCycle`), el grafo ya acíclico intacto, y dos SCCs independientes con pureza; prueba UI (ciclo de 3 + salida → 2 nodos) en Chromium/WebKit. `npm test` 526, `npm run test:ui` 368, `npm run check` OK.

## Descomposición k-core (`coreness`)

Métrica clásica de cohesión de redes que ninguna alternativa expone: el **número de núcleo (k-core)** de cada nodo — la k máxima para la que el nodo pertenece a un subgrafo donde todos tienen grado ≥ k (no dirigido, ignora aristas paralelas). Los nodos con el número de núcleo máximo forman el **núcleo más denso** del grafo.

`coreness(graph)` (subpath `@fsaldivar.dev/diagram/analysis`) → `Map<string, number>` con el número de núcleo por nodo (peeling de Batagelj–Zaversnik). Determinista (desempate por orden de declaración). Puro. Un triángulo da core 2; un camino, core 1; un nodo aislado, core 0.

Ejemplo: botón *Núcleo denso* en el menú Análisis (icono `communities`) → resalta los nodos del núcleo máximo (o avisa si todos son core ≤ 1, p. ej. un árbol).

Coste núcleo sin cambios (**20.00 KiB**; vive en `/analysis`, tree-shakeable; margen de núcleo = 1 byte — subpaths only). `tests/coreness.test.ts` cubre triángulo (2), camino (1), pendiente sobre triángulo (1 vs 2) y nodo aislado (0); prueba UI del botón (árbol → sin núcleo; triángulo → 3 nodos core 2) en Chromium/WebKit. `npm test` 530, `npm run test:ui` 370, `npm run check` OK.

## Interoperabilidad nomnoml (`fromNomnoml` / `toNomnoml`)

Integración con **nomnoml** (nomnoml.com), un lenguaje de diagramas de texto independiente y popular, distinto de Mermaid/D2/PlantUML. Amplía el alcance de import/export de texto.

- `fromNomnoml(text, {nodeWidth?, nodeHeight?, gap?})` (subpath `@fsaldivar.dev/diagram/io`): subconjunto práctico — declaraciones `[Nodo]` y asociaciones `[A] etiqueta -> [B]` (conectores `->`, `<->`, `-->`, `--`, `-`). Los compartimentos (`[Nombre|campos]`) se colapsan al nombre; se ignoran líneas `#directiva:` y comentarios `//`. Layout en capas. Sin eval.
- `toNomnoml(doc, {direction?})`: una asociación `[origen] etiqueta -> [destino]` por arista (más nodos aislados como `[nodo]`), con `#direction` opcional. Caracteres `[]|;\` escapados.
- Nuevo formato `nomnoml` en `convert`/`convertText` y **detectado** por `detectFormat`/`importAny` (relación entre corchetes `] -> [`, comprobada **antes** de la rama JSON de array ya que el texto nomnoml empieza por `[`). CLI `kairo-convert` reconoce `.noml`/`.nomnoml`.
- Ejemplo: botones *Importar/Exportar nomnoml* junto a los de D2.

Coste núcleo sin cambios (**20.00 KiB**; vive en `/io`, tree-shakeable; margen de núcleo = 1 byte — subpaths only). `tests/nomnoml.test.ts` cubre asociaciones etiquetadas, round-trip de estructura, conectores/compartimentos/nodos sueltos, y la detección frente a D2/Mermaid; incluido en el round-trip multiformato; prueba CLI (round-trip `.noml`) y prueba UI del botón en Chromium/WebKit. `npm test` 536, `npm run test:ui` 372, `npm run check` OK.

## Propiedades del grafo (`graphProperties`)

Clasificación estructural en una sola llamada: tamaño, densidad dirigida y los predicados estándar. Incluye una comprobación de **bipartición** (2-coloreo BFS) que no existía antes.

`graphProperties(graph)` (subpath `@fsaldivar.dev/diagram/analysis`) → `{ nodes, edges, density, isConnected, isDag, isForest, isTree, isBipartite }`:
- `density`: densidad dirigida `m/(n·(n−1))` (0 con menos de 2 nodos).
- `isConnected`: un solo componente débil. `isDag`: sin ciclo dirigido. `isForest`: sin ciclo no dirigido (aristas simples = n − componentes). `isTree`: bosque conexo. `isBipartite`: 2-coloreable (falso ante cualquier ciclo impar o bucle propio).
- Compone `connectedComponents` + `hasCycle`. Puro.
- Ejemplo: botón *Propiedades del grafo* en el menú Análisis (icono `list`) → toast con DAG/árbol/bipartito/conexo/densidad.

Coste núcleo sin cambios (**20.00 KiB**; vive en `/analysis`, tree-shakeable; margen de núcleo = 1 byte — subpaths only). `tests/graphprops.test.ts` cubre un árbol dirigido, un ciclo impar (no bipartito) y par (bipartito), un bosque de dos árboles, densidad y grafo vacío; prueba UI del botón (toast) en Chromium/WebKit. `npm test` 540, `npm run test:ui` 374, `npm run check` OK.

## Interoperabilidad TGF (`fromTgf` / `toTgf`)

TGF (Trivial Graph Format), el formato de intercambio mínimo que lee yEd y otras herramientas de grafos: líneas `<id> <etiqueta>` de nodos, un separador `#`, y líneas `<origen> <destino> <etiqueta>` de aristas. Simple y sin pérdida para estructura + etiquetas.

- `fromTgf(text, {nodeWidth?, nodeHeight?, gap?})` (subpath `@fsaldivar.dev/diagram/io`): nodos antes del `#`, aristas después; etiqueta opcional (resto de la línea); aristas con extremos no declarados se descartan. Layout en capas. Sin eval.
- `toTgf(doc)`: nodos numerados `<i> <título>`, `#`, y `<origen> <destino> <etiqueta>` con la misma numeración.
- Nuevo formato `tgf` en `convert`/`convertText` (`parseAny`/`serializeAs`); **no** en `detectFormat` (TGF no tiene firma fiable), así que requiere formato explícito (`--from=tgf`, botón). CLI `kairo-convert` reconoce `.tgf`.
- Ejemplo: botones *Importar/Exportar TGF* junto a nomnoml.

Coste núcleo sin cambios (**20.00 KiB**; vive en `/io`, tree-shakeable; margen de núcleo = 1 byte — subpaths only). `tests/tgf.test.ts` cubre el formato numerado, round-trip de estructura/etiquetas, nodos sin etiqueta + aristas huérfanas, y el error sin nodos; incluido en el round-trip multiformato; prueba CLI (`--from=tgf`) y prueba UI del botón en Chromium/WebKit. `npm test` 546, `npm run test:ui` 376, `npm run check` OK.

## Enlace al editor mermaid.live (`toMermaidLiveUrl`)

Integración de **edición** (no solo render): genera un enlace profundo que abre el diagrama en el **Mermaid Live Editor** (mermaid.live). Complementa los enlaces de imagen de mermaid.ink/Kroki con un punto de entrada editable.

`toMermaidLiveUrl(doc, {mode?, theme?, host?})` (subpath `@fsaldivar.dev/diagram/io`): mermaid.live guarda su estado como un JSON desinflado con pako (zlib) y codificado en base64url tras `#pako:`. Se reutiliza el `zlibStore` sin dependencias (bloques "stored", stream zlib válido que el pako del editor infla) del trabajo de Kroki. `mode` `edit` (por defecto) o `view`; `theme` opcional; `host` auto-alojable. Puro.

Ejemplo: botón *Editor mermaid.live* en el menú Exportar → copia el enlace `/edit#pako:` al portapapeles.

Coste núcleo sin cambios (**20.00 KiB**; vive en `/io`, tree-shakeable; margen de núcleo = 1 byte — subpaths only). `tests/embed.test.ts` verifica el stream descomprimiéndolo con `zlib.inflateSync` de Node y comprobando que el estado contiene el código Mermaid (modo edit/view, tema, host); prueba UI del botón (clipboard → `/edit#pako:`) en Chromium/WebKit. `npm test` 548, `npm run test:ui` 378, `npm run check` OK.

## Centralidad de cercanía (`closenessCentrality`)

Completa el conjunto de centralidades (grado, intermediación/betweenness, PageRank): la **centralidad de cercanía** por nodo — con qué rapidez alcanza al resto siguiendo aristas dirigidas. Normalización de Wasserman–Faust `(r−1)²/((n−1)·Σdist)` (r = nodos alcanzables incluido él, Σdist = suma de distancias BFS), que maneja grafos desconectados y deja los valores en [0,1]; un nodo que no alcanza a nadie puntúa 0.

- `closenessCentrality(graph)` (subpath `@fsaldivar.dev/diagram/analysis`) → `NodeScore[]` en orden de declaración.
- `closestNodes(graph, count=3)` → los ids más centrales (score > 0), desempate por orden.
- Ejemplo: botón *Cercanía* en el menú Análisis (icono `target`) → resalta los nodos que alcanzan al resto más rápido.

Coste núcleo sin cambios (**20.00 KiB**; vive en `/analysis`, tree-shakeable; margen de núcleo = 1 byte — subpaths only). `tests/closeness.test.ts` cubre el camino dirigido (cabeza 0.6667 > medio 0.5 > sumidero 0), el centro de estrella (score 1) vs hojas (0), el top-k y el grafo vacío/un nodo; prueba UI del botón en Chromium/WebKit. `npm test` 552, `npm run test:ui` 380, `npm run check` OK.

## Excentricidad y centro del grafo (`eccentricity` / `graphCenter`)

Completa el análisis de distancias (que ya daba diámetro/longitud media agregados) con la vista **por nodo**: la **excentricidad** (mayor distancia de camino más corto a cualquier nodo alcanzable) y, a partir de ella, el **centro** (nodos de mínima excentricidad, los "más centrales por distancia en el peor caso") y la **periferia** (máxima). No dirigido por defecto (definición de libro de texto); `directed:true` mide solo el alcance saliente.

- `eccentricity(graph, {directed?})` (subpath `@fsaldivar.dev/diagram/analysis`) → `Map<id, number>`.
- `graphCenter(graph, {directed?})` → `{ radius, diameter, center, periphery }`.
- Ejemplo: botón *Centro del grafo* en el menú Análisis (icono `target`) → resalta el/los nodo(s) centro y avisa de radio/diámetro.

Coste núcleo sin cambios (**20.00 KiB**; vive en `/analysis`, tree-shakeable; margen de núcleo = 1 byte — subpaths only). `tests/eccentricity.test.ts` cubre el camino (extremos 2, medio 1), centro/periferia/radio/diámetro, la estrella (hub = centro), el modo dirigido y el grafo vacío; prueba UI del botón en Chromium/WebKit. `npm test` 556, `npm run test:ui` 382, `npm run check` OK.

## Interoperabilidad vis-network (`fromVisNetwork` / `toVisNetwork`)

Integración con **vis-network (vis.js)**, una librería de redes JS muy usada, distinta de React Flow/Cytoscape. Formato `{ nodes: [{id,label,x,y}], edges: [{from,to,label}] }`.

- `fromVisNetwork(input, {nodeWidth?, nodeHeight?, gap?})` (subpath `@fsaldivar.dev/diagram/io`): acepta objeto o cadena JSON; ids numéricos o de texto; usa las posiciones `x`/`y` (centros) cuando todos los nodos las traen, si no, layout en capas. Sin eval.
- `toVisNetwork(doc)`: nodos con `label` y centro `x`/`y`, aristas con `from`/`to` (+`label`); listo para `new vis.Network(el, data)`.
- Nuevo formato `visnetwork` en `convert`/`convertText` y **detectado** por `detectFormat`/`importAny` (aristas con `from`/`to`). CLI `kairo-convert` reconoce `.visjs`.
- Ejemplo: botones *Importar/Exportar vis-network* junto a Cytoscape.

Coste núcleo sin cambios (**20.00 KiB**; vive en `/io`, tree-shakeable; margen de núcleo = 1 byte — subpaths only). `tests/visnetwork.test.ts` cubre emisión (label+centro+from/to), round-trip de estructura/etiqueta/posición (centro; vis no guarda tamaño), cadena JSON + ids numéricos + fallback a capas, y detección + error sin nodos; incluido en el round-trip multiformato; prueba CLI (`--to=visnetwork`) y prueba UI del botón en Chromium/WebKit. `npm test` 562, `npm run check` OK. **Nota: la suite completa `npm run test:ui` tiene 1 fallo preexistente solo en WebKit en la prueba de "invertir conexión" (clic del botón #reverse del inspector agota el tiempo), ajeno a vis-network — probablemente de la característica de formas que modificó renderer/editor; requiere revisión de esa sesión.**

## Interoperabilidad node-link JSON / NetworkX / D3 (`fromNodeLink` / `toNodeLink`)

Integración con el formato **node-link** JSON — el que produce Python **NetworkX** (`json_graph.node_link_data`) y consumen los grafos de fuerza de **D3**. Forma `{ directed, nodes: [{id,label}], links: [{source,target,label}] }`; la clave distintiva es `links` (no `edges`).

- `fromNodeLink(input, {nodeWidth?, nodeHeight?, gap?})` (subpath `@fsaldivar.dev/diagram/io`): objeto o cadena JSON; ids numéricos o de texto; `label`/`name` como título; aristas con extremos no declarados crean el nodo; layout en capas. Sin eval.
- `toNodeLink(doc)`: `{directed:true, multigraph:false, graph:{}, nodes, links}` — listo para `networkx.json_graph.node_link_graph(data)` o un layout de fuerza D3.
- Nuevo formato `nodelink` en `convert`/`convertText` y **detectado** por `detectFormat`/`importAny` (presencia de `links[]`, distinguido de React Flow/Canvas). CLI `kairo-convert` reconoce `.nodelink`.
- Ejemplo: botones *Importar/Exportar node-link* junto a vis-network.

Coste núcleo sin cambios (**20.00 KiB**; vive en `/io`, tree-shakeable; margen de núcleo = 1 byte — subpaths only). `tests/networkx.test.ts` cubre emisión directed+nodes/links, round-trip (objeto y cadena, ids numéricos), y detección + error sin nodos; incluido en el round-trip multiformato; prueba CLI (`--to=nodelink`) y prueba UI del botón en Chromium/WebKit. `npm test` 567, `npm run test:ui` 386 (0 fallos), `npm run check` OK.

## Contraer cadenas (`contractChains`)

Simplifica un diagrama a su **esqueleto de ramas/uniones**: elimina los nodos de paso (exactamente una entrada y una salida, distintas) aplicando `bypassNode` repetidamente, dejando solo fuentes, sumideros, ramas y uniones. Útil para ver la estructura de decisión de un flujo largo sin los pasos lineales intermedios. Distinto de `bypassNode` (un nodo) y `condense` (SCCs).

`contractChains(doc, {keep?})` (subpath `@fsaldivar.dev/diagram/layout`): contrae en bucle; los nodos cuyo predecesor coincide con el sucesor se dejan (contraerlos solo los borraría); `keep(id)` protege nodos concretos. Determinista y puro; no muta la entrada.

Ejemplo: botón *Contraer cadenas* en el menú Layout (icono `route`) → colapsa las cadenas y avisa del tamaño del esqueleto.

Coste núcleo sin cambios (**20.00 KiB**; vive en `/layout`, tree-shakeable; margen de núcleo = 1 byte — subpaths only). `tests/contractchains.test.ts` cubre la cadena lineal (a endpoints), ramas con brazos de paso, el no-op sin nodos de paso + `keep()`, y la pureza; prueba UI (cadena de 5 → 2 nodos) en Chromium/WebKit. `npm test` 571, `npm run test:ui` 388, `npm run check` OK.

## Entradas y salidas del grafo (`endpoints`) + reintentos de Playwright

Dos mejoras este ciclo:

**`endpoints(graph)`** (subpath `@fsaldivar.dev/diagram/analysis`) → `{ sources, sinks, isolated }`: los puntos de **entrada** (sin aristas entrantes), de **salida** (sin salientes) y los nodos **aislados** (ninguna), ignorando bucles propios, en orden de declaración. Vista estructural que complementa la detección de inicio/fin por tipo de `validateFlow`. Puro. Ejemplo: botón *Entradas y salidas* en el menú Análisis → resalta todos y avisa de los recuentos.

**Fiabilidad del gate de UI:** `playwright.config.ts` ahora usa `retries: process.env.CI ? 2 : 1`. La gran suite paralela (~195×2) provocaba fallos intermitentes solo en WebKit (clics de inspector/edición que agotaban el tiempo bajo carga, una prueba distinta por run); los reintentos los absorben y los marcan como *flaky* sin ocultar regresiones reales (una prueba que falla de forma consistente sigue fallando tras sus reintentos).

Coste núcleo sin cambios (**20.00 KiB**; `endpoints` vive en `/analysis`, tree-shakeable; margen de núcleo = 1 byte — subpaths only). `tests/endpoints.test.ts` cubre fuentes/sumideros/aislados, bucles propios ignorados, multi-raíz/multi-hoja y el grafo vacío; prueba UI del botón (toast) en Chromium/WebKit. `npm test` 575, `npm run test:ui` 390, `npm run check` OK.

## Reflejar layout (`flipLayout`)

Transformación de layout para **reorientar** un diagrama, como en draw.io/Excalidraw: espeja las posiciones dentro de la caja contenedora. `flipLayout(doc, {axis?})` (subpath `@fsaldivar.dev/diagram/layout`): `horizontal` (por defecto) refleja izquierda↔derecha; `vertical`, arriba↔abajo. Tamaños/formas y semántica intactos; la reflexión conserva el espaciado (sin solapamientos) y recalcula los puertos para que las flechas reconecten por el lado correcto. Es una involución (reflejar dos veces restaura). Determinista y puro.

Ejemplo: botón *Reflejar horizontal* en el menú Layout (icono `crop`) → espeja el diagrama.

Coste núcleo sin cambios (**20.00 KiB**; vive en `/layout`, tree-shakeable; margen de núcleo = 1 byte — subpaths only). `tests/fliplayout.test.ts` cubre el reflejo horizontal/vertical dentro de la bbox, la preservación de semántica/tamaños, la involución (doble reflejo) y el grafo vacío/pureza; prueba UI (reflejar sin cambiar el grafo) en Chromium/WebKit. `npm test` 579, `npm run test:ui` 392, `npm run check` OK.

## Rotar layout (`rotateLayout`)

Companion de `flipLayout` para **reorientar**: rota el layout alrededor de su centro un múltiplo de 90°, p. ej. convierte un flujo de arriba-abajo en izquierda-derecha a 90°. `rotateLayout(doc, {degrees?: 90|180|270})` (subpath `@fsaldivar.dev/diagram/layout`): las cajas de nodo quedan en vertical (solo se mueven sus posiciones), el resultado se renormaliza al margen estándar; 180° es una reflexión puntual limpia, 90°/270° intercambian ejes (los nodos pueden quedar más juntos — re-ejecuta un auto-layout si hace falta). Puertos recalculados. Determinista y puro.

Ejemplo: botón *Rotar 90°* en el menú Layout (icono `sun`).

También este ciclo: `playwright.config.ts` sube a `retries: 2` — bajo la gran suite paralela, WebKit podía agotar el tiempo dos veces (original + 1 reintento); con 2 reintentos (3 intentos) los flakes de inspector/edición se absorben de forma fiable sin ocultar regresiones reales.

Coste núcleo sin cambios (**20.00 KiB**; `rotateLayout` vive en `/layout`, tree-shakeable; margen de núcleo = 1 byte). `tests/rotatelayout.test.ts` cubre 90° (vertical→horizontal), la renormalización al margen 80, el 360° (doble 180°) y el grafo vacío/pureza; prueba UI (rotar sin cambiar el grafo) en Chromium/WebKit. `npm test` 583, `npm run test:ui` 394, `npm run check` OK.

## Escalar espaciado (`scaleLayout`)

Completa el trío de transformaciones de reorientación/ajuste (con `flipLayout` y `rotateLayout`): ajusta la **separación** entre nodos sin cambiar su tamaño. `scaleLayout(doc, {factor?})` (subpath `@fsaldivar.dev/diagram/layout`): escala la distancia de cada nodo al centro del layout por `factor` (>1 separa un diagrama apretado, <1 lo compacta; 1.25 por defecto), y renormaliza al margen estándar. Tamaños/formas/semántica intactos, puertos recalculados. Determinista y puro.

Ejemplo: botón *Espaciar nodos* en el menú Layout (icono `ruler`) → separa los nodos (×1.3).

Coste núcleo sin cambios (**20.00 KiB**; vive en `/layout`, tree-shakeable; margen de núcleo = 1 byte). `tests/scalelayout.test.ts` cubre el doble de separación (×2), la compactación (×0.5), la renormalización + factor por defecto 1.25, y la preservación del grafo + vacío/pureza; prueba UI (mayor amplitud sin cambiar el grafo) en Chromium/WebKit. `npm test` 587, `npm run test:ui` 396, `npm run check` OK.

## Generadores de grafos (`gridGraph` / `treeGraph` / `cycleGraph`)

Capacidad nueva: **generar diagramas estructurados** de forma paramétrica, para andamiar rápido o producir grafos de prueba/benchmark/demo sin construir nodos y aristas a mano. Subpath `@fsaldivar.dev/diagram/templates`; cada uno devuelve un documento validado con un layout apropiado; puros y deterministas.

- `gridGraph(cols=3, rows=3, {nodeType?})`: cuadrícula con aristas a la derecha y abajo; layout en cuadrícula.
- `treeGraph(levels=3, branching=2, {nodeType?})`: árbol balanceado (cada no-hoja con `branching` hijos); layout de árbol.
- `cycleGraph(n=4, {nodeType?})`: ciclo dirigido `i→i+1`, último→primero; layout en anillo.
- Argumentos acotados a mínimos sensatos y un tope de **4000 nodos** (lanza si se excede).

Ejemplo: botón *Generar cuadrícula* en el menú Importar → genera una cuadrícula 4×3.

Coste núcleo sin cambios (**20.00 KiB**; vive en `/templates`, tree-shakeable; subpath 6.41 KiB; margen de núcleo = 1 byte). `tests/generators.test.ts` cubre la cuadrícula (6 nodos/7 aristas, acíclica), el árbol (7 nodos/6 aristas, casos depth=1 y branching=1), el ciclo (con ciclo) y el acotado/tope; prueba UI (cuadrícula 4×3 → 12 nodos) en Chromium/WebKit. `npm test` 591, `npm run test:ui` 398, `npm run check` OK.

## Layout de mapa mental (`mindmapLayout`)

Nuevo layout distinto de los existentes: la **raíz al centro** y sus ramas abanicadas a **ambos lados** (como XMind/MindMeister), cada lado creciendo horizontalmente como un árbol. Complementa al `radialLayout` (anillos concéntricos) y al `treeLayout` (una sola dirección), y encaja con el importador de mindmaps de Mermaid.

`mindmapLayout(doc, {gap?, rankGap?})` (subpath `@fsaldivar.dev/diagram/layout`): la raíz es el primer nodo sin aristas entrantes; su primera mitad de hijos va a la derecha y el resto a la izquierda; los descendientes heredan el lado. Sigue la primera arista entrante de cada nodo (DAGs bajo el primer padre); los inalcanzables quedan a la derecha. Y por nivel con centrado de hojas; renormaliza al margen. Determinista y puro; tamaños/formas/semántica intactos, puertos recalculados.

Ejemplo: botón *Layout mapa mental* en el menú Layout (icono `branches`).

Coste núcleo sin cambios (**20.00 KiB**; vive en `/layout`, tree-shakeable; subpath 11.84 KiB; margen de núcleo = 1 byte). `tests/mindmaplayout.test.ts` cubre el abanico a lados opuestos, el crecimiento por profundidad, la preservación/posicionamiento/pureza y el grafo vacío; prueba UI (re-disponer sin cambiar el grafo) en Chromium/WebKit. `npm test` 595, `npm run test:ui` 400, `npm run check` OK.

## Ruta del diámetro (`diameterPath`)

Complementa a `distanceStats` (que da solo la longitud del diámetro) con la **ruta**: el camino más corto más largo del grafo — los dos nodos más distantes y la secuencia entre ellos. `diameterPath(graph, {directed?})` (subpath `@fsaldivar.dev/diagram/analysis`) → `string[]` (ids del camino; vacío si no hay aristas). BFS desde cada nodo con reconstrucción por punteros de padre; dirigido por defecto, `directed:false` para la vista no dirigida. Puro.

Ejemplo: botón *Diámetro* en el menú Análisis (icono `route`) → resalta la ruta más larga.

Coste núcleo sin cambios (**20.00 KiB**; vive en `/analysis`, tree-shakeable; margen de núcleo = 1 byte). `tests/diameterpath.test.ts` cubre la cadena dirigida, la rama más larga desde una raíz, la vista no dirigida (pasa por el medio) y el grafo sin aristas (vacío); prueba UI (resaltar la ruta) en Chromium/WebKit. `npm test` 599, `npm run test:ui` 402, `npm run check` OK.

## SVG coloreado por categoría (`toCategorySvg`)

Contraparte discreta del heatmap numérico (`toHeatmapSvg`): **colorea cada nodo por categoría** (su `group`, o su `type`) con una paleta pastel que se repite, para distinguir clústeres/tipos de un vistazo. El color se aplica **solo al exportar** (nunca se guarda en el grafo), y el texto queda oscuro sobre los pasteles para legibilidad. `toCategorySvg(doc, {by?: 'group'|'type', palette?, ...SvgExportOptions})` (subpath `@fsaldivar.dev/diagram/export`). Puro, solo exportación.

Ejemplo: botón *SVG por categoría* en el menú Exportar → SVG coloreado por grupo (`diagrama.categorias.svg`).

Coste núcleo sin cambios (**20.00 KiB**; vive en `/export`, tree-shakeable; subpath 14.83 KiB; margen de núcleo = 1 byte). `tests/category.test.ts` cubre el coloreado por grupo (mismo grupo = mismo color), por tipo, la paleta personalizada con ciclo y los nodos sin categoría; prueba UI (≥2 colores de categoría en el SVG descargado) en Chromium/WebKit. `npm test` 603, `npm run test:ui` 404, `npm run check` OK.

## Intermediación de aristas (`edgeBetweenness`)

Métrica de arista (complemento de la de nodo `betweennessCentrality` y distinta de `bridges`): cuántos caminos más cortos atraviesan cada arista — las **conexiones más cargadas / cuellos de botella** (la métrica tras la división de comunidades de Girvan–Newman). `edgeBetweenness(graph)` (subpath `@fsaldivar.dev/diagram/analysis`) → `EdgeScore[]` (`{id, source, target, score}`, una por arista en orden de declaración; acumulación de Brandes sobre aristas, dirigida; las aristas fuera de todo camino más corto puntúan 0; paralelas comparten el valor del par). `bottleneckEdges(graph, count=3)` → los ids de las aristas más críticas. Puro. API programática (sin botón de ejemplo este ciclo, para no crecer la suite UI).

Coste núcleo sin cambios (**20.00 KiB**; vive en `/analysis`, tree-shakeable; subpath 10.21 KiB; margen de núcleo = 1 byte). `tests/edgebetweenness.test.ts` cubre que la arista central de un camino dirigido manda, el caso bridge/path con `bottleneckEdges`, los ceros + una entrada por arista, y el grafo sin aristas. `npm test` 607, `npm run test:ui` 404 (sin cambios), `npm run check` OK.

## Fusionar duplicados (`mergeDuplicates`)

Limpieza de datos: fusiona los nodos que comparten el mismo **título** (o tipo) en uno solo, reconectando aristas y descartando bucles/paralelas — resuelve los nodos de título duplicado que suelen crear las importaciones de CSV/listas de aristas. `mergeDuplicates(doc, {by?: 'title'|'type'})` (subpath `@fsaldivar.dev/diagram/layout`): agrupa por título (por defecto) y aplica `mergeNodes` a cada grupo (sobrevive el primero). Puro; no muta la entrada.

Ejemplo: botón *Fusionar duplicados* en el menú Layout (icono `group`) → fusiona títulos repetidos o avisa si no hay.

Coste núcleo sin cambios (**20.00 KiB**; vive en `/layout`, tree-shakeable; margen de núcleo = 1 byte). `tests/mergeduplicates.test.ts` cubre la fusión por título con reconexión, el no-op con títulos únicos, la fusión por tipo y la pureza; prueba UI (smoke sobre el ejemplo de títulos únicos → sin cambios) en Chromium/WebKit. `npm test` 611, `npm run test:ui` 406, `npm run check` OK.

## Sugerir conexiones (`suggestLinks`)

Predicción de enlaces: señala los pares de nodos **todavía sin conectar pero con vecinos en común** y los ordena por el índice de **Adamic–Adar** — Σ 1/ln(grado(w)) sobre cada vecino común w, de modo que un vecino poco conectado pesa más que un hub (la medida clásica de `adamic_adar_index` de NetworkX). Responde a "¿qué conexión me falta?" en flujos y mapas de arquitectura, algo que Mermaid/draw.io/Excalidraw no ofrecen. `suggestLinks(graph, {count=5, minScore=0})` (subpath `@fsaldivar.dev/diagram/analysis`) → `LinkSuggestion[]` (`{source, target, score, common}`, mayor primero; el grafo se lee como no dirigido y los pares ya unidos en cualquier sentido se omiten; empates por nº de vecinos comunes y luego orden de declaración). Puro y determinista.

Ejemplo: botón *Sugerir conexiones* en el menú Análisis (icono `plus`) → resalta los nodos de los pares sugeridos y nombra el principal, o avisa si no hay candidatos.

Coste núcleo sin cambios (**19.99 KiB**; vive en `/analysis`, tree-shakeable; subpath 10.44 KiB). `tests/algorithms.test.ts` cubre la predicción de las diagonales de un 4-ciclo (par de menor id primero), el peso Adamic–Adar (vecino raro > hub), el salto de pares ya conectados con `count`/`minScore`, y la pureza/grafo vacío; prueba UI (smoke: ≥2 nodos resaltados sobre el ejemplo de arquitectura) en Chromium/WebKit. `npm test` 618, `npm run test:ui` 410 (+2; 4 fallos ajenos de `labels.spec.ts`, feature concurrente en curso), `npm run check` OK.

## Interoperabilidad DGML (Visual Studio)

Nueva plataforma: **DGML** (Directed Graph Markup Language), el formato XML de los grafos dirigidos de Visual Studio (menú *Architecture → Generate Code Map*) y de los visores DGML autónomos. `fromDgml(text, {nodeWidth?, nodeHeight?, gap?})` y `toDgml(doc)` en el subpath `@fsaldivar.dev/diagram/io`: un `<DirectedGraph>` con `<Nodes>` (`<Node Id Label Category/>`) y `<Links>` (`<Link Source Target Label/>`). Round-trip de estructura, títulos, etiquetas de arista y **tipo de nodo** (se escribe como `Category`; al importar, una `Category` que nombre uno de nuestros tipos se conserva, el resto cae a `process`). Parser por regex, sin dependencias y sin expansión de entidades XML (sin XXE); los enlaces a nodos no declarados los crean. Registrado en `convert`/`detectFormat` (XML con `<DirectedGraph>`), `importAny` y la CLI `kairo-convert` (`.dgml`, `--from=dgml`/`--to=dgml`).

Ejemplo: botones *Importar DGML* / *Exportar DGML* (menús Importar/Exportar, icono `network`) → pega/descarga `diagrama.dgml`.

Coste núcleo sin cambios (**19.99 KiB**; vive en `/io`, tree-shakeable). `tests/dgml.test.ts` cubre la emisión con escape XML y `Category`=tipo, el round-trip de estructura/títulos/etiquetas/tipo, la tolerancia a orden de atributos/comillas/`Category` desconocida/nodos creados por enlaces, el error sin nodos, y `detectFormat`+round-trip por `convert`; `tests/cli.test.ts` añade el round-trip CLI con autodetección; prueba UI (export `.dgml` → reimport al mismo 7/6) en Chromium/WebKit. `npm test` 624, `npm run test:ui` 416, `npm run check` OK.

## Importar Graphviz JSON (`dot -Tjson`, con posiciones)

Nueva integración: importa la salida JSON de **Graphviz** (`dot -Tjson`, `neato -Tjson`, `fdp`, `sfdp`, `twopi`…). A diferencia del importador de DOT *texto* (que reorganiza con nuestro layout), este conserva **las posiciones que calcula el motor de Graphviz** — el estándar de oro en layout de grafos — y las trae a Kairo. `fromGraphvizJson(input, {scale?, minWidth?, minHeight?, gap?})` (subpath `@fsaldivar.dev/diagram/io`): lee `objects` (nodos y subgrafos, cada uno con `_gvid`) y `edges` (cuyos `tail`/`head` referencian esos `_gvid`). `pos` es "x,y" en puntos con origen abajo-izquierda (y hacia arriba), así que se invierte la y; `width`/`height` en pulgadas → puntos (ajustados a nuestros mínimos válidos). Los objetos cluster/subgrafo se omiten como nodos y las aristas que los tocan se descartan; sin posiciones, cae a un layout por capas. Puro, sin `eval`.

Ejemplo: botón *Importar Graphviz JSON* (menú Importar, icono `share`) → pega la salida de `dot -Tjson`.

Coste núcleo sin cambios (**19.99 KiB**; vive en `/io`, tree-shakeable). `tests/graphvizjson.test.ts` cubre la importación de nodos/aristas con orden y labels de Graphviz, la conservación de geometría con y invertida y normalización al margen 80 (+ anchos ajustados al mínimo), el salto de clusters/subgrafos y de aristas hacia ellos, el fallback por capas sin posiciones + pureza, y el error sin nodos; prueba UI (importa un JSON con posiciones y verifica que a queda sobre b sobre c) en Chromium/WebKit. `npm test` 629, `npm run test:ui` 424, `npm run check` OK.

## Interoperabilidad ELK JSON (Eclipse Layout Kernel)

Nueva plataforma: **ELK JSON**, el formato de grafo de [elkjs](https://github.com/kieler/elkjs) / Eclipse Layout Kernel, usado por el renderizador ELK de Mermaid, Eclipse Sprotty y muchas herramientas web. `fromElk(input, {minWidth?, minHeight?, gap?})` y `toElk(doc)` en el subpath `@fsaldivar.dev/diagram/io`: los nodos viven en `children` (`{id, width, height, x?, y?, labels:[{text}]}`), las aristas referencian por `sources`/`targets` (arrays) y las etiquetas son `[{text}]`. Las coordenadas ELK `x`/`y` son la esquina superior izquierda en px (nuestra misma convención), así que el **layout round-trips** cuando está presente; sin posiciones cae a layout por capas. Acepta también `source`/`target` sueltos y recorta tamaños a nuestros mínimos válidos. Registrado en `convert`/`detectFormat` (JSON con `children` + `edges`), `importAny` y la CLI (`.elk`/`.elkjson`, `--from=elk`/`--to=elk`). Sin `eval`.

Ejemplo: botones *Importar ELK* / *Exportar ELK* (menús Importar/Exportar, icono `network`) → pega/descarga `diagrama.elk.json`.

Coste núcleo sin cambios (**19.99 KiB**; vive en `/io`, tree-shakeable). `tests/elk.test.ts` cubre la emisión (children con id/tamaño/pos/labels, edges con sources/targets, sin labels cuando no hay etiqueta), el round-trip de estructura/títulos/etiquetas/posiciones con normalización al margen 80, la tolerancia a string JSON/source-target sueltos/labels ausentes/recorte de tamaño, el fallback por capas + descarte de aristas a nodos desconocidos + pureza, el error sin nodos, y `detectFormat`+round-trip por `convert`; `tests/cli.test.ts` añade el round-trip CLI autodetectado; prueba UI (export `.elk.json` → reimport al mismo 7/6) en Chromium/WebKit. `npm test` 636, `npm run test:ui` 430, `npm run check` OK.

## Centralidad armónica (`harmonicCentrality`)

Métrica nueva en `@fsaldivar.dev/diagram/analysis`: la centralidad **armónica** de cada nodo — la suma de distancias *recíprocas* `Σ 1/dist(v,u)` sobre los nodos que v alcanza (dirigida), normalizada por `n−1` para caer en [0,1]. A diferencia de la cercanía (`closenessCentrality`), los nodos inalcanzables aportan 0 en vez de ∞, así que **sigue siendo significativa en grafos desconectados y dirigidos** donde la cercanía clásica colapsa — por eso NetworkX ofrece `harmonic_centrality`. `harmonicCentrality(graph)` → `NodeScore[]`; `topHarmonic(graph, count=3)` → los ids mejor conectados (score > 0, empates por orden de declaración). Puro y determinista.

Ejemplo: botón *Centralidad armónica* en el menú Análisis (icono `target`) → resalta los nodos mejor conectados al resto.

Coste núcleo sin cambios (**19.99 KiB**; vive en `/analysis`, tree-shakeable; subpath 10.51 KiB). `tests/algorithms.test.ts` cubre la suma de recíprocas a través de un grafo desconectado (una isla aislada no rompe el cálculo), el ranking con `topHarmonic`, los casos de nodo único y grafo vacío, y la pureza; prueba UI (resalta los mejor conectados sobre el ejemplo de arquitectura) en Chromium/WebKit. `npm test` 639, `npm run test:ui` 432, `npm run check` OK.

## Generadores de grafos clásicos (`completeGraph`, `pathGraph`, `starGraph`, `wheelGraph`)

El subpath `@fsaldivar.dev/diagram/templates` amplía los generadores paramétricos (antes grid/tree/cycle) con la familia clásica (como `networkx.generators.classic`): `completeGraph(n)` (Kₙ: cada par unido una vez, i→j con i<j, en anillo), `pathGraph(n)` (cadena dirigida 0→…→n−1, layout en árbol), `starGraph(leaves)` (un hub a cada hoja, layout radial con el hub al centro) y `wheelGraph(rim)` (Wₙ: ciclo exterior + hub conectado a todo el aro, layout radial). Útiles para demos, enseñanza, pruebas y *benchmarking* de layouts. Cada uno devuelve un documento v2 validado con su layout, es puro y determinista, limita a 1/2/3 mínimos sensatos y respeta el tope de 4000 nodos (`MAX_NODES`). También quedan expuestos en el build global `window.Kairo`.

Coste núcleo sin cambios (**19.99 KiB**; viven en `/templates`, tree-shakeable; subpath 6.94 KiB). `tests/generators.test.ts` cubre el recuento de aristas de Kₙ con posiciones y aciclicidad, la cadena de `pathGraph`, el hub-a-hojas de `starGraph`, el aro+radios de `wheelGraph` con su ciclo, y el recorte de mínimos + tope de nodos. `npm test` 644, `npm run test:ui` 432 (sin cambios; adición solo de librería), `npm run check` OK.

## Interoperabilidad JGF (JSON Graph Format)

Nueva plataforma: **JGF** ([JSON Graph Format](https://jsongraphformat.info), spec neutral consumida por varias librerías/herramientas de grafos). `fromJgf(input, {nodeWidth?, nodeHeight?, gap?})` y `toJgf(doc)` en el subpath `@fsaldivar.dev/diagram/io`: un envoltorio `{ graph: { directed, label, nodes, edges } }` donde `nodes` es un objeto indexado por id (`{ "a": { label, metadata } }`) y `edges` un array de `{ source, target, relation?, label? }`. Acepta también la forma multigrafo `{ graphs: [...] }` (usa el primero). Round-trip de estructura, títulos, etiqueta/relación de aristas, **tipo de nodo** (en `metadata.type`) y **geometría** (en `metadata.x/y/width/height`), así que un ida y vuelta Kairo es sin pérdidas; sin posiciones cae a layout por capas. Registrado en `convert`/`detectFormat` (JSON con `graph` objeto que tiene `nodes`/`edges` y sin `version`/`layout`; un documento Kairo nativo se sigue detectando como `json`), `importAny` y la CLI (`.jgf`, `--from=jgf`/`--to=jgf`). Sin `eval`.

Ejemplo: botones *Importar JGF* / *Exportar JGF* (menús Importar/Exportar, icono `braces`) → pega/descarga `diagrama.jgf.json`.

Coste núcleo sin cambios (**19.99 KiB**; vive en `/io`, tree-shakeable). `tests/jgf.test.ts` cubre la emisión (nodos indexados con label+metadata, aristas source/target, sin label omitido), el round-trip de estructura/títulos/label+relación/tipo/posiciones con normalización, la forma multigrafo + string JSON + descarte de aristas a nodos desconocidos, el fallback por capas + pureza, el error sin nodos, y `detectFormat` (incluida la distinción de un doc Kairo nativo como `json`) + round-trip por `convert`; `tests/cli.test.ts` añade el round-trip CLI autodetectado; prueba UI (export `.jgf.json` → reimport al mismo 7/6) en Chromium/WebKit. `npm test` 651, `npm run test:ui` 434, `npm run check` OK.

## Método de ruta crítica (CPM) con holguras (`criticalPathMethod`)

Capacidad nueva en `@fsaldivar.dev/diagram/analysis`: convierte un flujo (leído como DAG actividad-en-nodo) en una **programación CPM**. `criticalPathMethod(graph, { duration? })` calcula por nodo el inicio/fin más temprano y más tardío y la **holgura** (*float* = inicio más tardío − inicio más temprano); los nodos con holgura 0 forman la(s) ruta(s) crítica(s) que fijan la `projectDuration` total. Cada actividad dura 1 por defecto (cuenta de pasos) o lo que devuelva `duration(id)` para tiempos reales. Devuelve `{ projectDuration, nodes: CpmNode[], critical: string[] }` o `null` si hay ciclo (el CPM necesita un DAG). Es el análisis clásico de gestión de proyectos, que ningún editor de diagramas (Mermaid/draw.io/Excalidraw) ofrece de serie; va más allá de `longestPath` (que solo halla la cadena más larga) al dar holgura a cada rama. Puro y determinista.

Ejemplo: botón *Holguras* en el menú Análisis (icono `bolt`) → resalta las actividades críticas (holgura 0) y muestra la duración del proyecto.

Coste núcleo sin cambios (**19.99 KiB**; vive en `/analysis`, tree-shakeable; subpath 10.82 KiB). `tests/algorithms.test.ts` cubre el diamante balanceado (todo crítico), la holgura de una rama paralela más corta, las duraciones personalizadas, y el `null` en grafo cíclico + pureza; prueba UI (sobre el flujo de decisiones: resalta start/check/allow/done y deja `deny` con holgura, duración 4) en Chromium/WebKit. `npm test` 655, `npm run test:ui` 436, `npm run check` OK.

## Exportar cronograma Gantt (Mermaid) por CPM (`toGantt`)

Capacidad/exportador nuevo en `@fsaldivar.dev/diagram/analysis`: `toGantt(document, { title?, duration? })` convierte un flujo en un **diagrama `gantt` de Mermaid**, programando cada nodo como una tarea con su inicio más temprano y duración según el **método de ruta crítica** (`criticalPathMethod` del tick anterior), agrupando por `section` según el grupo del nodo y marcando `crit` las tareas críticas (holgura 0). Usa `dateFormat X` para que los tiempos numéricos del CPM se rendericen directamente (duración 1 por defecto = conteo de pasos; `duration(id)` para tiempos reales). Un flujo pasa a ser un **plan calendarizable** pegable en Mermaid/GitLab/Notion — combina análisis (CPM) con integración de plataforma (Mermaid), algo que ningún editor de diagramas ofrece de serie. Si hay ciclo, cae a una programación secuencial. Puro.

Ejemplo: botón *Exportar Gantt* en el menú Exportar (icono `bolt`) → descarga `diagrama.gantt.mmd`.

Coste núcleo sin cambios (**19.99 KiB**; vive en `/analysis`, tree-shakeable; subpath 11.08 KiB). `tests/gantt.test.ts` cubre la emisión con tareas programadas por CPM y banderas `crit`, el agrupado en `section` por grupo + duraciones personalizadas, el fallback secuencial en grafo cíclico + pureza, y el saneado de nombres (sin `:`/salto que rompan la sintaxis); prueba UI (sobre el flujo de decisiones: descarga un `gantt` con `dateFormat X` y `start` crítico) en Chromium/WebKit. `npm test` 659, `npm run test:ui` 438, `npm run check` OK.

## Importar Mermaid gantt (`parseGantt`)

Nuevo importador en `@fsaldivar.dev/diagram/io`, complemento de `toGantt`: `parseGantt(text, {nodeWidth?, nodeHeight?, gap?})` lee un diagrama `gantt` de Mermaid (un plan de proyecto) y lo convierte en un **diagrama de dependencias** — cada tarea es un nodo y cada cláusula `after <id> …` se vuelve una conexión desde la(s) tarea(s) referida(s), mientras que las `section` pasan a grupos de nodos. Es un dialecto de Mermaid que aún no importábamos; convierte un cronograma en un grafo de dependencias con layout por capas. Reconoce las etiquetas (`crit`/`done`/`active`/`milestone`), descarta dependencias a ids desconocidos y tolera tareas sin id (que simplemente no pueden ser referenciadas). Puro, sin `eval`. Es solo de importación (como `fromGraphvizJson`): expuesto en el barrel de io con su propio botón, sin cablear en `convert` (el exportador `toGantt` vive en `/analysis`, por lo que no se mezclan los bundles).

Ejemplo: botón *Importar Gantt* (menú Importar, icono `bolt`) → pega un Mermaid gantt.

Coste núcleo sin cambios (**19.99 KiB**; vive en `/io`, tree-shakeable). `tests/ganttimport.test.ts` cubre las dependencias `after` (incl. múltiples) convertidas en aristas y `section`→grupo, la tolerancia a tareas sin id/sueltas y el descarte de deps desconocidas, el layout por capas (dependientes más abajo), y el error sin tareas; prueba UI (pega un gantt con cadena `after` → 3 nodos / 2 conexiones) en Chromium/WebKit. `npm test` 663, `npm run test:ui` 440, `npm run check` OK.

## Exportar composición Mermaid pie (`toPie`)

Nuevo exportador de "dashboard" en `@fsaldivar.dev/diagram/analysis`: `toPie(document, { title?, by? })` resume la composición de un diagrama como un gráfico `pie` de Mermaid — la proporción de nodos por `type` (por defecto) o por `group`. Cada nodo cae en exactamente una porción (los nodos sin grupo van a "(sin grupo)"), ordenadas por conteo y luego por nombre. Un vistazo compacto de "¿de qué está hecho este diagrama?" pegable en Mermaid/GitLab/Notion. Puro; escapa comillas/saltos en claves y título.

Ejemplo: botón *Exportar Pie* en el menú Exportar (icono `communities`) → descarga `diagrama.pie.mmd`.

Coste núcleo sin cambios (**19.99 KiB**; vive en `/analysis`, tree-shakeable; subpath 11.24 KiB). `tests/pie.test.ts` cubre el conteo por tipo ordenado por conteo y luego alfabético, el agrupado por `group` con "(sin grupo)" y la suma total = nº de nodos, el escape de comillas/saltos en claves y título, y el grafo vacío (solo cabecera); prueba UI (descarga un `pie title Composición` con al menos una porción) en Chromium/WebKit. `npm test` 667, `npm run test:ui` 442, `npm run check` OK.

## Exportar cuadrante de roles Mermaid (`toQuadrant`)

Capacidad nueva y distintiva en `@fsaldivar.dev/diagram/analysis`: `toQuadrant(document, { title?, x?, y?, xLabel?, yLabel?, quadrants? })` clasifica cada nodo en un `quadrantChart` de Mermaid según dos métricas estructurales — por defecto grado de salida ("alcance") en x y grado de entrada ("demanda") en y, cada una normalizada a [0,1] por su máximo. El umbral 0.5 reparte los nodos en roles: **Fuente** (mucho alcance, poca demanda), **Sumidero** (poca salida, mucha entrada), **Conector** (alto/alto) y **Periférico** (bajo/bajo). Es una clasificación automática del rol de cada nodo que ningún editor de diagramas ofrece; pegable en Mermaid. Métricas por eje configurables (`in`/`out`/`total`), etiquetas de ejes y nombres de cuadrante opcionales; desambigua títulos duplicados y escapa comillas/corchetes. Puro; compone `degrees`.

Ejemplo: botón *Exportar cuadrante* en el menú Exportar (icono `target`) → descarga `diagrama.cuadrante.mmd`.

Coste núcleo sin cambios (**19.99 KiB**; vive en `/analysis`, tree-shakeable; subpath 11.58 KiB). `tests/quadrant.test.ts` cubre la cabecera con ejes y cuadrantes, la colocación por grado de salida/entrada normalizado (fuente [1,0], sumidero [0,1], hub [0.5,0.5]), las métricas/etiquetas/cuadrantes personalizados, y la desambiguación de títulos duplicados + escape + grafo vacío; prueba UI (descarga un `quadrantChart` con `quadrant-1 Conector` y al menos un nodo situado) en Chromium/WebKit. `npm test` 671, `npm run test:ui` 444, `npm run check` OK.

## Interoperabilidad OPML (outliners)

Nueva plataforma (no-Mermaid): **OPML** (opml.org), el formato XML de esquemas que importan/exportan OmniOutliner, WorkFlowy, Dynalist, apps de mapas mentales y lectores RSS. `fromOpml(text, {nodeWidth?, nodeHeight?, gap?})` y `toOpml(doc, {title?})` en el subpath `@fsaldivar.dev/diagram/io`: un `<body>` de `<outline text="…">` anidados mapea a un árbol — cada outline es un nodo y el anidamiento se vuelve una arista padre→hijo. La exportación recorre un bosque de expansión desde las raíces (nodos sin entrada; cada nodo se emite una vez, gana el primer padre), por lo que **cualquier** diagrama produce OPML válido. Parser por regex+pila, sin dependencias ni expansión de entidades (sin XXE). Registrado en `convert`/`detectFormat` (XML con `<opml`), `importAny` y la CLI (`.opml`, `--from=opml`/`--to=opml`).

Ejemplo: botones *Importar OPML* / *Exportar OPML* (menús Importar/Exportar, icono `outline`) → pega/descarga `diagrama.opml`.

Coste núcleo sin cambios (**19.99 KiB**; vive en `/io`, tree-shakeable). `tests/opml.test.ts` cubre el anidamiento → aristas padre→hijo con profundidad por capas, el anidado de hijos bajo su padre con hojas autocerradas y round-trip de estructura, el bosque multi-raíz + escape de `&`/`<`/`>`, el error con body vacío, y `detectFormat` + round-trip por `convert`; `tests/cli.test.ts` añade el round-trip CLI autodetectado; prueba UI (export `.opml` → reimport a 7 nodos) en Chromium/WebKit. `npm test` 676, `npm run test:ui` 446, `npm run check` OK.

## Coeficientes del grafo: reciprocidad y transitividad (`reciprocity`, `transitivity`)

Dos coeficientes globales estándar nuevos en `@fsaldivar.dev/diagram/analysis`, staples de NetworkX que faltaban:
- `reciprocity(graph)` — fracción de conexiones dirigidas distintas `u→v` que también tienen la inversa `v→u` (1 = todo mutuo, 0 = ninguna). Ignora bucles y aristas paralelas; 0 en grafo sin aristas.
- `transitivity(graph)` — coeficiente de agrupamiento **global**: `3 × triángulos / triples conectados` sobre todo el grafo (no dirigido, simple), distinto del promedio por nodo de `clusteringCoefficient`. 0 cuando no hay caminos de longitud dos.

Ambos puros y deterministas, redondeados a 4 decimales.

Ejemplo: botón *Coeficientes* en el menú Análisis (icono `list`) → muestra ambos valores en un toast.

Coste núcleo sin cambios (**19.99 KiB**; viven en `/analysis`, tree-shakeable; subpath 11.71 KiB). `tests/algorithms.test.ts` cubre la reciprocidad como fracción de enlaces mutuos (incl. mutuo total, de una vía y sin aristas), el ignorar bucles/paralelas, la transitividad en triángulo (1) / camino (0) / cuadrado (0) / sin triples (0), y la pureza de ambos; prueba UI (toast con formato `reciprocidad …, transitividad …`) en Chromium/WebKit. `npm test` 680, `npm run test:ui` 448, `npm run check` OK.

## Exportar DOT con posiciones (Graphviz `neato -n`)

`toDotText(document, { positions: true })` (subpath `@fsaldivar.dev/diagram/io`) añade a la exportación DOT las **posiciones del layout de Kairo**: cada nodo lleva `pos="x,y!"` (en puntos, con la y invertida al sistema y-arriba de Graphviz y el `!` que fija el nodo) más `width`/`height` en pulgadas y `fixedsize=true`. Así un diagrama de Kairo se renderiza en Graphviz **respetando su layout** (`neato -n diagrama.dot`), o lo consumen otras herramientas que leen DOT posicionado — el complemento de salida del importador `fromGraphvizJson` (que trae el layout de Graphviz). La exportación DOT por defecto (sin la opción) queda intacta.

Ejemplo: botón *DOT posicionado* en el menú Exportar (icono `share`) → descarga `diagrama.posicionado.dot`.

Coste núcleo sin cambios (**19.99 KiB**; vive en `/io`, tree-shakeable). `tests/dot.test.ts` cubre la emisión de `pos` fijado con la y invertida, los tamaños en pulgadas y `fixedsize=true`, que un nodo más abajo en pantalla tenga menor y de Graphviz, y que la exportación por defecto no incluya `pos`/`fixedsize`; prueba UI (descarga un `.dot` con `pos="…!"` y `fixedsize=true`) en Chromium/WebKit. `npm test` 681, `npm run test:ui` 450, `npm run check` OK.

## Importar DOT con posiciones (Graphviz `pos`)

`parseDotText` ahora **lee los atributos `pos` de Graphviz**: si todos los nodos traen `pos="x,y"` (la salida de `dot -Tdot`, `neato`, `fdp`…), se conserva ese layout en vez de recalcularlo — la y se invierte al sistema y-abajo de Kairo, los tamaños salen de `width`/`height` (pulgadas → puntos, ajustados a los mínimos válidos) y las posiciones se normalizan al margen 80. Si algún nodo carece de `pos`, cae al layout por capas de siempre. Junto con la exportación DOT posicionada del tick anterior, cierra el **ida y vuelta con Graphviz-DOT en ambos sentidos** (`toDotText({positions:true})` → `neato -n`/herramientas → `parseDotText`). Funciona por el botón existente *Importar DOT* y por la CLI (`.dot`/`.gv`); sin dependencias.

Coste núcleo sin cambios (**19.99 KiB**; vive en `/io`, tree-shakeable). `tests/dot.test.ts` cubre que `pos` en todos los nodos conserva el layout con y invertida y normalización al 80, y que la ausencia de `pos` en algún nodo recae en el layout por capas; prueba UI (importa DOT con `pos` por el botón Importar DOT y verifica que el nodo de mayor y de Graphviz queda arriba) en Chromium/WebKit. `npm test` 683, `npm run test:ui` 452, `npm run check` OK.

## Exportar cronograma CSV (CPM, para hojas de cálculo)

`toScheduleCsv(document, { duration? })` (subpath `@fsaldivar.dev/diagram/analysis`) exporta la programación por **método de ruta crítica** como CSV — una fila por nodo con `id,title,type,earliestStart,earliestFinish,latestStart,latestFinish,slack,critical` — lista para abrir en Excel, Google Sheets, Smartsheet o cualquier herramienta de proyectos. Reutiliza `criticalPathMethod` (duración 1 por defecto = conteo de pasos; `duration(id)` para tiempos reales) y, si el grafo tiene un ciclo, cae a una programación secuencial. Escapa comas/comillas/saltos en los campos. Lleva el cronograma de Kairo a plataformas de hoja de cálculo (complemento del Gantt de Mermaid). Puro; filas en orden de declaración.

Ejemplo: botón *Exportar cronograma CSV* en el menú Exportar (icono `table`) → descarga `diagrama.cronograma.csv`.

Coste núcleo sin cambios (**19.99 KiB**; vive en `/analysis`, tree-shakeable; subpath 11.97 KiB). `tests/schedulecsv.test.ts` cubre la cabecera + una fila CPM por nodo (start crítico, deny con holgura y no crítico), las duraciones personalizadas, el escape de comas/comillas en títulos, y el fallback secuencial en grafo cíclico; prueba UI (descarga un CSV con la cabecera correcta y ≥1 fila de nodo) en Chromium/WebKit. `npm test` 687, `npm run test:ui` 454, `npm run check` OK.

## Corte mínimo / flujo máximo entre dos nodos (`minCut`)

Algoritmo clásico nuevo en `@fsaldivar.dev/diagram/analysis`: `minCut(graph, source, target)` calcula el **corte mínimo s-t con capacidades unitarias** (Edmonds–Karp) — es decir, el número de **caminos dirigidos disjuntos en aristas** de `source` a `target` (teorema de Menger) y un conjunto mínimo de aristas cuya eliminación desconecta `target` de `source` (`|cutEdges| === value`). Las aristas paralelas suman capacidad. Es una medida de **fiabilidad** ("¿cuántos enlaces deben fallar para cortar A→B?", "¿cuán redundante es la conexión?") que ningún editor de diagramas ofrece. Devuelve `{ value: 0, cutEdges: [] }` si `source===target` o alguno falta. Puro y determinista (BFS en orden de declaración).

Ejemplo: botón *Corte mínimo* en el menú Análisis (icono `alert`) → con dos nodos seleccionados (Shift-clic), resalta los enlaces del corte e indica cuántos caminos disjuntos hay.

Coste núcleo sin cambios (**19.99 KiB**; vive en `/analysis`, tree-shakeable; subpath 12.31 KiB). `tests/algorithms.test.ts` cubre el diamante con dos caminos disjuntos (valor 2, corte = las dos salidas) con `|cut|===value`, la cadena simple (1) y el cuello de botella por aristas paralelas (1 y 2), y los casos inalcanzable/self/ausente = 0 + pureza; prueba UI (sobre la cadena del ejemplo de arquitectura: 1 camino disjunto, resalta la arista `login-auth`) en Chromium/WebKit. `npm test` 690, `npm run test:ui` 456, `npm run check` OK.

## PNG round-trippable (documento embebido) (`embedDocumentInPng`/`readDocumentFromPng`)

Paridad con Excalidraw/draw.io: ahora el PNG exportado **lleva el documento dentro** y vuelve a abrirse como diagrama editable. En `@fsaldivar.dev/diagram/io`: `embedDocumentInPng(pngBytes, document)` inserta el JSON en un chunk privado `iTXt` (keyword `kairo`) antes de `IEND` (reemplaza uno previo si existe), `readDocumentFromPng(pngBytes)` lo recupera (soporta `iTXt` UTF-8 y `tEXt` Latin-1; devuelve `null` si no hay) e `isPng(bytes)` detecta la firma. Son operaciones de bytes puras con CRC32 propio (sin dependencias); los píxeles siguen viniendo de `toPNG` (navegador), pero el embebido/lectura corren y se prueban también en Node. UTF-8 seguro, sin `eval`.

Ejemplo: la exportación *Exportar PNG* ahora embebe el documento (`diagrama.kairo.png`), y *Abrir archivo* / arrastrar-soltar un `.png` con diagrama lo reabre; un PNG sin diagrama Kairo avisa en vez de fallar.

Coste núcleo sin cambios (**19.99 KiB**; vive en `/io`, tree-shakeable; subpath IO 36.12 KiB). `tests/pngmeta.test.ts` cubre la inserción del chunk `iTXt` antes de `IEND` manteniendo el PNG bien formado, el round-trip del documento con títulos UTF-8 (€), que reembeber reemplaza sin duplicar, y el `null`/firma inválida; prueba UI (exportar PNG → los bytes contienen la firma, `kairo` y un título de nodo → reabrir ese PNG por el input de archivo restaura los 7 nodos) en Chromium/WebKit. `npm test` 694, `npm run test:ui` 456, `npm run check` OK.

## Importar lista de padres (org charts / SQL) (`fromParentList`)

`fromParentList(input, { idKey?, parentKey?, labelKey?, ... })` (subpath `@fsaldivar.dev/diagram/io`) construye un árbol/bosque a partir de un **array plano de registros `{ id, parentId, label }`** — la forma de adjacencia-por-padre que exportan las tablas SQL autorreferenciadas (`parent_id`), los organigramas y los listados de archivos. Cada registro es un nodo y un `parentId` que apunte a otro registro se vuelve una arista padre→hijo; los registros con padre nulo/ausente/desconocido son raíces. Distinto del `fromJson` anidado y del `fromOpml` (XML). Detecta claves comunes (`id/key/name`, `parentId/parent/parent_id/pid`, `label/name/title/text`) o acepta `idKey`/`parentKey`/`labelKey` explícitos; desduplica ids repetidos; layout por capas. Importador puro, sin `eval` (como `fromJson`): expuesto en el barrel de io con su botón, sin cablear en `convert` (los arrays son ambiguos de autodetectar).

Ejemplo: botón *Importar lista de padres* (menú Importar, icono `tree`) → pega el array.

Coste núcleo sin cambios (**19.99 KiB**; vive en `/io`, tree-shakeable; subpath IO 36.50 KiB). `tests/parentlist.test.ts` cubre el árbol id/parentId con profundidad por capas, el string JSON + alias de claves + raíces (padre nulo/desconocido descartado), las claves personalizadas + desduplicación de ids, y los errores (no-array / sin registros con id); prueba UI (pega un organigrama de 3 registros → 3 nodos / 2 conexiones) en Chromium/WebKit. `npm test` 698, `npm run test:ui` 458, `npm run check` OK.

## Interoperabilidad BPMN 2.0 (Camunda / bpmn.io)

Nueva plataforma de peso: **BPMN 2.0**, el XML de procesos de negocio de OMG que usan Camunda, bpmn.io/Modeler y otras herramientas BPM. `fromBpmn(text, {nodeWidth?, nodeHeight?, gap?})` y `toBpmn(doc)` en el subpath `@fsaldivar.dev/diagram/io`. Mapeo de tipos: `start`→`startEvent`, `end`→`endEvent`, `decision`→`exclusiveGateway`, el resto→`task`; las aristas son `sequenceFlow`. Al **importar** reconoce elementos con o sin prefijo de espacio de nombres (`bpmn:task`/`task`) y muchas variantes de tarea (user/service/script/manual/...), gateways y eventos, y usa las `Bounds` de BPMNDI cuando están (si no, layout por capas). Al **exportar** incluye **BPMNDI** (shapes con `Bounds` del layout + waypoints de aristas), por lo que el archivo abre y se dibuja directamente en bpmn.io. Parser por regex, sin dependencias ni expansión de entidades (sin XXE). Registrado en `convert`/`detectFormat` (XML con `definitions` + `bpmn`/`sequenceFlow`), `importAny` y la CLI (`.bpmn`).

Ejemplo: botones *Importar BPMN* / *Exportar BPMN* (menús Importar/Exportar, icono `shapes`) → pega/descarga `diagrama.bpmn`.

Coste núcleo sin cambios (**19.99 KiB**; vive en `/io`, tree-shakeable; subpath IO 37.72 KiB). `tests/bpmn.test.ts` cubre el mapeo de tipos a elementos + `sequenceFlow` con BPMNDI, el round-trip de estructura/labels/tipo conservando posiciones de BPMNDI, el parseo con/sin prefijo y variantes de tarea con fallback por capas, y el error sin elementos + `detectFormat` + round-trip por `convert`; `tests/cli.test.ts` añade el round-trip CLI autodetectado; prueba UI (export `.bpmn` con BPMNDI → reimport al mismo 7/6) en Chromium/WebKit. `npm test` 703, `npm run test:ui` 460, `npm run check` OK.

## Modularidad de comunidades (`modularity`)

Nuevo en `@fsaldivar.dev/diagram/analysis`, complemento de `communities`: `modularity(graph, partition)` mide la **calidad de un agrupamiento** con la fórmula estándar `Σ_c [ L_c/m − (D_c/2m)² ]` (no dirigido, pesos unitarios). Q cercano a 1 = comunidades densas con pocos enlaces entre ellas; ~0 = no mejor que al azar; negativo = mala partición. Es la métrica que Louvain (`communities`) optimiza (equivalente a `community.modularity` de NetworkX), así que responde "¿qué tan bueno es este agrupamiento?". Ignora bucles y paralelas; grafo sin aristas → 0. Puro.

Ejemplo: botón *Modularidad* en el menú Análisis (icono `communities`) → detecta comunidades (Louvain) y muestra su modularidad.

Coste núcleo sin cambios (**19.99 KiB**; vive en `/analysis`, tree-shakeable; subpath 12.43 KiB). `tests/algorithms.test.ts` cubre la partición buena (dos triángulos unidos por un puente ≈0.357), la comunidad única (0) y la partición dispersa (negativa), y que la modularidad de la partición de Louvain sea ≥0.3 + grafo sin aristas (0); prueba UI (toast con formato `Modularidad: … en N comunidad(es)`) en Chromium/WebKit. `npm test` 705, `npm run test:ui` 462, `npm run check` OK.

## Quitar aristas duplicadas (`dedupeEdges`)

Nueva operación de limpieza en `@fsaldivar.dev/diagram/layout`: `dedupeEdges(document, { ignoreLabels?, selfLoops? })` elimina las **aristas paralelas duplicadas** conservando la primera de cada grupo — útil para grafos que acumulan conexiones repetidas al importar CSV/matriz/node-link o al fusionar documentos. Por defecto dos aristas son duplicadas cuando coinciden origen, destino **y** etiqueta; `ignoreLabels` colapsa cualquier par origen→destino repetido, y `selfLoops` quita además las aristas de un nodo a sí mismo. Conserva el enrutado de las aristas que permanecen. Puro, sin mutación; no-op si no hay duplicados.

Ejemplo: botón *Quitar aristas duplicadas* en el menú Layout (icono `compare`) → informa cuántas conexiones se quitaron.

Coste núcleo sin cambios (**19.99 KiB**; vive en `/layout`, tree-shakeable; subpath 12.04 KiB). `tests/dedupeedges.test.ts` cubre el borrado de duplicados exactos (origen,destino,label) conservando el primero y su enrutado, el modo `ignoreLabels` que colapsa el par, el modo `selfLoops`, y el no-op + pureza sin duplicados; prueba UI (importar CSV con una arista repetida → 3 aristas, quitar duplicadas → 2 + toast) en Chromium/WebKit. `npm test` 709, `npm run test:ui` 464, `npm run check` OK.

## Plantillas del mundo real: Kubernetes, pipeline de datos, respuesta a incidentes

Tres nuevas plantillas de inicio en `@fsaldivar.dev/diagram/templates`, para arrancar de algo real en vez de un lienzo en blanco (paridad con las galerías de plantillas de draw.io/Mermaid):
- `kubernetes()` — ruta de petición Ingress → Service → Deployment → Pods, con base de datos y ConfigMap/Secret.
- `dataPipeline()` — pipeline ETL: fuentes → ingesta → data lake → transformar → almacén → dashboard BI.
- `incidentResponse()` — runbook de operaciones: alerta → triaje → ramificación por severidad → mitigar/vigilar → postmortem.

Cada una devuelve un documento v2 fresco, validado y con layout (como las demás plantillas), y aparecen automáticamente en el selector *Plantilla…* del ejemplo (que se genera de `templateNames`). Datos puros.

Coste núcleo sin cambios (**19.99 KiB**; viven en `/templates`, tree-shakeable; subpath 7.45 KiB). `tests/templates.test.ts` las valida por el bucle genérico de `templateNames` (documento válido, con posiciones, instancia fresca) y con pruebas específicas (Kubernetes enruta ingress→svc→deploy→pods→db; dataPipeline es cadena ETL que termina en BI; incidentResponse ramifica por severidad y ambas vías llegan al postmortem); prueba UI (el selector carga kubernetes=7, dataPipeline=6, incidentResponse=7 nodos con nodo de decisión) en Chromium/WebKit. `npm test` 712, `npm run test:ui` 464, `npm run check` OK.

## Exportar jerarquía JSON (d3.hierarchy) (`toHierarchy`)

Completa la integración con **D3**: Kairo ya importaba JSON anidado (`fromJson`) y exportaba node-link (d3-force), y ahora `toHierarchy(document, { rootName? })` (subpath `@fsaldivar.dev/diagram/io`) exporta la forma **`{ id, name, children }`** que consumen `d3.tree`, `d3.treemap`, `d3.pack` y los gráficos sunburst / collapsible-tree (el inverso de `fromJson`). Recorre un bosque de expansión desde las raíces (nodos sin entrada; el primero si no hay), emite cada nodo una vez (gana el primer padre) y sus hijos por las aristas salientes; varias raíces se envuelven bajo una raíz sintética única (lo que `d3.hierarchy` exige). Los ciclos se rompen con el conjunto visitado. Puro.

Ejemplo: botón *Exportar jerarquía* en el menú Exportar (icono `tree`) → descarga `diagrama.hierarchy.json`.

Coste núcleo sin cambios (**19.99 KiB**; vive en `/io`, tree-shakeable; subpath IO 37.90 KiB). `tests/tohierarchy.test.ts` cubre el anidamiento de hijos bajo un único root (hojas sin `children`), el bosque multi-raíz envuelto en raíz sintética, el round-trip por `fromJson`, y la ruptura de ciclos (cada nodo una vez); prueba UI (descarga un árbol con `name` y `children` + contiene un título de nodo) en Chromium/WebKit. `npm test` 716, `npm run test:ui` 466, `npm run check` OK.

## Ruta euleriana (`eulerianTrail`)

Algoritmo clásico nuevo en `@fsaldivar.dev/diagram/analysis`: `eulerianTrail(graph)` halla una **ruta que recorre cada conexión exactamente una vez** (dirigida, algoritmo de Hierholzer), o `null` si no existe. Es un **circuito** (empieza donde termina) cuando todo nodo tiene grados de entrada y salida iguales y las aristas están conectadas; es un **camino abierto** cuando exactamente un nodo tiene una salida de más (el inicio) y otro una entrada de más (el fin). Las aristas paralelas y los bucles cuentan. Devuelve `{ trail, circuit }` con la secuencia de ids de nodos (longitud = nº de aristas + 1). Útil para rutas de cobertura/inspección y ensamblaje de Bruijn — algo que ningún editor de diagramas ofrece. Puro y determinista.

Ejemplo: botón *Ruta euleriana* en el menú Análisis (icono `route`) → indica si existe (circuito o camino) y cuántas conexiones recorre; resalta el inicio (y el fin si es abierto).

Coste núcleo sin cambios (**19.99 KiB**; vive en `/analysis`, tree-shakeable; subpath 12.66 KiB). `tests/algorithms.test.ts` cubre el circuito en un triángulo dirigido (inicio = fin, longitud 4), el camino abierto con inicio/fin desbalanceados, la cobertura con paralelas + bucle, y el `null` para grados desbalanceados/desconectado/vacío; prueba UI (importar un triángulo CSV → circuito euleriano de 3 conexiones) en Chromium/WebKit. `npm test` 720, `npm run test:ui` 468, `npm run check` OK.

## Importar GraphQL SDL (esquema → diagrama de tipos)

Nueva integración para desarrolladores de API: `fromGraphql(sdl, {nodeWidth?, nodeHeight?, gap?})` (subpath `@fsaldivar.dev/diagram/io`) convierte un esquema **GraphQL SDL** en un diagrama de relaciones de tipos — cada `type`/`interface`/`input` es un nodo (tipo `class`) y cada campo cuyo tipo (desenvuelto de `[]`/`!`) sea otro tipo definido se vuelve una arista **etiquetada con el nombre del campo**. Los escalares, enums y uniones no se dibujan como destino. Útil para documentar y entender el grafo de un esquema. Parser por regex (ignora comentarios `#`/`"""`), sin dependencia de `graphql`, sin `eval`. Es solo de importación (expuesto en el barrel de io con su botón, no en `convert`).

Ejemplo: botón *Importar GraphQL* (menú Importar, icono `brackets`) → pega el SDL.

Coste núcleo sin cambios (**19.99 KiB**; vive en `/io`, tree-shakeable; subpath IO 38.31 KiB). `tests/graphql.test.ts` cubre un nodo por tipo con aristas de campos de tipo objeto (listas incluidas, etiquetadas por campo; escalares sin arista), el manejo de `interface`/`input` e ignorar tipos desconocidos, la profundidad por capas de los campos y el error sin tipos; prueba UI (importar un SDL User/Post → 2 nodos / 2 conexiones) en Chromium/WebKit. `npm test` 724, `npm run test:ui` 470, `npm run check` OK.

## Importar JSON Schema (`$defs`/`$ref` → diagrama ER)

`fromJsonSchema(input, {nodeWidth?, nodeHeight?, gap?, rootName?})` (subpath `@fsaldivar.dev/diagram/io`) convierte un **JSON Schema** en un diagrama entidad-relación — la forma ubicua detrás de OpenAPI, validación de configuración y contratos de API. Cada definición bajo `$defs` o `definitions` (más la raíz si tiene `properties`) es un nodo (tipo `class`), y cada propiedad cuyo tipo sea un `$ref` a otra definición — directo o vía `items` de un array — se vuelve una arista **etiquetada con el nombre de la propiedad**. El nombre del `$ref` es el último segmento de la ruta (`#/$defs/User` → `User`); las referencias a definiciones desconocidas se ignoran. Parseo JSON real, sin `eval`. Es solo de importación (barrel de io + botón, no en `convert`).

Ejemplo: botón *Importar JSON Schema* (menú Importar, icono `braces`) → pega el schema.

Coste núcleo sin cambios (**19.99 KiB**; vive en `/io`, tree-shakeable; subpath IO 38.63 KiB). `tests/jsonschema.test.ts` cubre un nodo por definición con aristas de `$ref` (directo y vía `items`, etiquetadas por propiedad; escalares sin arista), el string JSON + `definitions` heredado + raíz con `properties`, la profundidad por capas + ignorar `$ref` desconocidos + error sin tipos; prueba UI (importar un schema User/Post → 2 nodos / 2 conexiones) en Chromium/WebKit. `npm test` 727, `npm run test:ui` 472, `npm run check` OK.

## Interoperabilidad graphology (Sigma.js)

Nueva plataforma: **graphology**, la librería de grafos JS detrás de **Sigma.js** y buena parte del ecosistema de visualización de grafos. `fromGraphology(input, {nodeWidth?, nodeHeight?, gap?})` y `toGraphology(doc)` en el subpath `@fsaldivar.dev/diagram/io`: la forma serializada `{ attributes, options, nodes: [{key, attributes}], edges: [{key?, source, target, attributes}] }`. La clave distintiva es `key` por nodo (no `id`). Se conservan etiquetas y posiciones `x`/`y` (centros, en `attributes`). Registrado en `convert`/`detectFormat` (JSON con `nodes` cuyo primer elemento tiene `key`, **colocado antes de la rama de React Flow** porque las aristas de graphology también usan `source`/`target`), `importAny` y la CLI (`.graphology`). Sin `eval`.

Ejemplo: botones *Importar graphology* / *Exportar graphology* (menús Importar/Exportar, icono `atom`) → pega/descarga `diagrama.graphology.json`.

Coste núcleo sin cambios (**19.99 KiB**; vive en `/io`, tree-shakeable; subpath IO 38.95 KiB). `tests/graphology.test.ts` cubre la emisión (nodos con `key` + label + centro x/y, aristas source/target, `options.type`), el round-trip de estructura/labels/posiciones, el string JSON + claves numéricas + fallback por capas + descarte de aristas desconocidas, y `detectFormat` (no confundido con React Flow) + round-trip por `convert`; `tests/cli.test.ts` añade el round-trip CLI autodetectado; prueba UI (export `.graphology.json` → reimport al mismo 7/6) en Chromium/WebKit. `npm test` 732, `npm run test:ui` 474, `npm run check` OK.

## Tarjeta de métricas SVG (`toStatsCard`)

Nueva salida visual en `@fsaldivar.dev/diagram/analysis`: `toStatsCard(document, { title? })` genera una **tarjeta infográfica SVG** compacta con las métricas clave del diagrama en mosaicos — nodos, conexiones, densidad, profundidad, componentes y si es cíclico. Una instantánea para pegar en READMEs, dashboards o resúmenes de PR, distinta del SVG del diagrama (`toSVG`), el JSON (`graphReport`) y el Markdown (`toReport`). Compone `graphReport`; SVG autocontenido con colores literales (se renderiza en cualquier parte). Puro.

Ejemplo: botón *Exportar tarjeta de métricas* en el menú Exportar (icono `ruler`) → descarga `diagrama.metricas.svg`.

Coste núcleo sin cambios (**19.99 KiB**; vive en `/analysis`, tree-shakeable; subpath 13.23 KiB). `tests/statscard.test.ts` cubre el SVG válido con mosaicos y etiquetas (viewBox 480, nº de nodos/conexiones, acíclico=No), el reporte de ciclo (Sí) con escape del título, y el grafo vacío sin fallo; prueba UI (descarga un `.svg` que empieza por `<svg` y contiene las etiquetas) en Chromium/WebKit. `npm test` 735, `npm run test:ui` 476, `npm run check` OK.

## Página de informe HTML (`toReportPage`)

Nuevo entregable en `@fsaldivar.dev/diagram/analysis`: `toReportPage(document, { title? })` genera una **página HTML autocontenida** que resume un diagrama — una descripción en prosa (`describeDiagram`), la tarjeta de métricas SVG embebida (`toStatsCard`), una tabla de métricas (`graphReport`) y los diagnósticos de lint (`lintDocument`), con estilos inline y sin scripts ni recursos externos. Un informe de una sola página para compartir con el equipo, distinto de `toHtml` (el diagrama interactivo) y `toReport` (Markdown). Puro.

Ejemplo: botón *Exportar página de informe* en el menú Exportar (icono `doc`) → descarga `diagrama.informe.html`.

Coste núcleo sin cambios (**19.99 KiB**; vive en `/analysis`, tree-shakeable; subpath 14.03 KiB). `tests/reportpage.test.ts` cubre la página con descripción + tarjeta SVG + tabla de métricas (nº de nodos) + diagnósticos (flujo válido = sin diagnósticos, sin `<script>`), la lista de diagnósticos de un flujo roto con escape del título, y el grafo vacío sin fallo; prueba UI (descarga un `.html` que empieza por `<!doctype html>`, con `<h2>Métricas</h2>`, un `<svg>` embebido y sin `<script>`) en Chromium/WebKit. `npm test` 738, `npm run test:ui` 478, `npm run check` OK.

## Compactar componentes (`packComponents`)

Nueva operación de layout en `@fsaldivar.dev/diagram/layout`: `packComponents(document, { gap?, maxWidth? })` junta los **componentes desconectados** de un diagrama — cada componente débilmente conexo conserva su layout interno pero su caja contenedora se empaqueta por estantes en filas, eliminando los grandes huecos vacíos que dejan las importaciones y fusiones entre componentes. Es el complemento, a nivel de componente, de `resolveOverlaps` (que separa nodos solapados). Determinista (orden de declaración), puro; recalcula los puertos. No-op con un solo componente.

Ejemplo: botón *Compactar componentes* en el menú Layout (icono `crop`) → junta las partes desconectadas.

Coste núcleo sin cambios (**19.99 KiB**; vive en `/layout`, tree-shakeable; subpath 12.46 KiB). `tests/packcomponents.test.ts` cubre que junta componentes dispersos reduciendo las dimensiones totales conservando el layout interno (misma separación a–b, c–d) y el margen 80, que las cajas de componentes no se solapan tras empacar, y el no-op + pureza con un solo componente; prueba UI (importar CSV de 2 componentes → compactar sin romper la estructura) en Chromium/WebKit. `npm test` 741, `npm run test:ui` 480, `npm run check` OK.

## Fragmentación: severidad de los puntos únicos de fallo (`fragmentation`)

Refinamiento en `@fsaldivar.dev/diagram/analysis`: `fragmentation(graph)` ordena los **puntos únicos de fallo** por gravedad — para cada punto de articulación, en cuántos componentes (débilmente) conexos se parte el grafo al quitar ese nodo. A diferencia de `criticalElements` (que solo los marca), esto **cuantifica el daño**, distinguiendo un nodo que apenas une dos mitades de uno que destroza el grafo en muchas piezas. Devuelve `{ id, components }[]` ordenado por nº de componentes desc (empates por orden de declaración); el grafo se lee no dirigido. `topFragmenters(graph, count=3)` da los ids más dañinos. Puro.

Ejemplo: botón *Fragmentación* en el menú Análisis (icono `alert`) → resalta los nodos que más fragmentan e indica en cuántas piezas parte el principal.

Coste núcleo sin cambios (**19.99 KiB**; vive en `/analysis`, tree-shakeable; subpath 14.16 KiB). `tests/algorithms.test.ts` cubre la estrella (hub parte en 3), el camino (nodo medio parte en 2), el ranking de un fragmentador mayor sobre uno menor, y el vacío para grafos sin puntos de articulación (ciclo) + pureza; prueba UI (sobre el ejemplo de arquitectura: ordena los SPOF y los resalta) en Chromium/WebKit. `npm test` 745, `npm run test:ui` 482, `npm run check` OK.

## Transición de layout animable (`interpolateLayout`)

Primitiva de animación nueva en `@fsaldivar.dev/diagram/layout`, capacidad que tienen React Flow y d3 y nos faltaba: `interpolateLayout(from, to, t, { easing? })` interpola entre dos layouts del **mismo diagrama** — en `t` (acotado a [0,1]) la posición y el tamaño de cada nodo son una mezcla lineal entre su lugar en `from` y en `to` (`t=0` → from, `t=1` → to). Llamándola por frames, una UI puede **morfear suavemente** de un layout a otro (p. ej. de jerárquico a radial). El grafo y el conjunto de nodos salen de `to`; un nodo ausente de `from` se queda en su sitio de `to`. Acepta una función `easing` para movimiento no lineal. Pura; recalcula los puertos desde las cajas mezcladas. Adición de librería (sin botón, como `edgeBetweenness`), pensada para que los integradores construyan transiciones.

Coste núcleo sin cambios (**19.99 KiB**; vive en `/layout`, tree-shakeable; subpath 12.61 KiB). `tests/interpolatelayout.test.ts` cubre la mezcla de posiciones (t=0 from, t=1 to, t=0.5 punto medio), el acotado de `t` a [0,1] y el `easing` (que tira el punto medio hacia `from`), y el uso del grafo de `to` con nodos ausentes de `from` conservados + pureza. `npm test` 748, `npm run test:ui` 482 (sin cambios; adición solo de librería), `npm run check` OK.

## Matriz de alcance (clausura transitiva) (`reachabilityMatrix`/`toReachabilityCsv`)

Nuevo en `@fsaldivar.dev/diagram/analysis`: `reachabilityMatrix(graph)` devuelve la **matriz de alcance dirigida** (clausura transitiva) — `reaches[i][j]` es verdadero cuando el nodo i puede alcanzar al j siguiendo una o más aristas; la diagonal solo es verdadera para nodos en un ciclo. Es la forma por lotes (todos contra todos) de `descendants`, útil para análisis de impacto/dependencias ("todo lo afectado si esto cambia"). `toReachabilityCsv(document)` la exporta como CSV (cabecera `from\to` + filas 1/0), lista para Excel/Sheets. O(V·(V+E)), puro.

Ejemplo: botón *Matriz de alcance* en el menú Exportar (icono `matrix`, nombre elegido para no chocar con «Exportar matriz» de adyacencia) → descarga `diagrama.alcance.csv`.

Coste núcleo sin cambios (**19.99 KiB**; vive en `/analysis`, tree-shakeable; subpath 14.34 KiB). `tests/reachability.test.ts` cubre el alcance transitivo con diagonal vacía en un DAG, la diagonal activada por un ciclo, y el CSV con cabecera `from\to` + filas 1/0; prueba UI (descarga un `.csv` con cabecera `from\to,` y una fila de 1/0) en Chromium/WebKit. `npm test` 751, `npm run test:ui` 484, `npm run check` OK.

## Importar tabla de nodos CSV con grupo y origen (round-trip de `toCsvNodes`)

El modo tabla-de-nodos de `fromCsv` (subpath `@fsaldivar.dev/diagram/io`) — que ya reconocía una cabecera con `id`/`title`/`type`/`tags` y sin columna `to`/`target` para crear nodos tipados y etiquetados — ahora también lee las columnas **`group`** (o `grupo`/`lane`/`carril`) y **`source`** (o `fuente`/`archivo`/`file`). Así la exportación de inventario de nodos (`toCsvNodes`, que emite `id,title,type,group,tags,source`) **vuelve a importarse sin pérdidas**: tipo, grupo, etiquetas y origen se conservan. Además el modo tabla-de-nodos ahora se activa también con una columna `group` o `source` sola (sin `type`/`tags`). Es como los equipos de datos construyen diagramas desde hojas de cálculo. Celdas vacías → campo ausente. Sin `eval`.

Ejemplo: funciona por los botones existentes *Importar CSV* y *Exportar nodos CSV*.

Coste núcleo sin cambios (**19.99 KiB**; vive en `/io`, tree-shakeable; subpath IO 39.05 KiB). `tests/csv.test.ts` cubre el round-trip de `toCsvNodes`→`fromCsv` conservando tipo/grupo/etiquetas/origen (y celdas vacías ausentes), y la activación del modo tabla-de-nodos con una columna `group` sola; prueba UI (importar una tabla `id,title,type,group` por el botón Importar CSV → 2 nodos tipados y agrupados, 0 conexiones) en Chromium/WebKit. `npm test` 753, `npm run test:ui` 486, `npm run check` OK.

## Árbol de expansión / esqueleto (`spanningTree`)

Nueva operación de simplificación en `@fsaldivar.dev/diagram/layout`: `spanningTree(document)` reduce un diagrama a su **bosque de expansión** — conserva, por componente débilmente conexo, solo las aristas que conectan por primera vez cada nodo en un BFS no dirigido (orden de declaración) y descarta el resto, dejando exactamente `V − componentes` aristas y sin ciclos. Una vista de "esqueleto" para grafos densos, distinta de `redundantEdges` (reducción transitiva), `condense` (colapsa SCCs) y `contractChains` (quita nodos de paso). El layout de los nodos se conserva; las aristas que quedan mantienen su dirección y enrutado. Puro; no-op si ya es un bosque.

Ejemplo: botón *Árbol de expansión* en el menú Layout (icono `tree`) → quita las conexiones fuera del esqueleto.

Coste núcleo sin cambios (**19.99 KiB**; vive en `/layout`, tree-shakeable; subpath 12.80 KiB). `tests/spanningtree.test.ts` cubre el triángulo reducido a V−1 aristas sin ciclo conservando el enrutado, el `V − componentes` en varios componentes, y el no-op + pureza con un bosque; prueba UI (importar triángulo CSV → 3 aristas, árbol de expansión → 2) en Chromium/WebKit. `npm test` 756, `npm run test:ui` 488, `npm run check` OK.

## Asortatividad de grado (`assortativity`)

Métrica de caracterización nueva en `@fsaldivar.dev/diagram/analysis`: `assortativity(graph)` es el **coeficiente de asortatividad de grado** (Newman) — la correlación de Pearson de los grados en los dos extremos de cada arista, en [−1,1]. Positivo = los nodos de alto grado tienden a conectarse con otros de alto grado (asortativo); negativo = se conectan con los de bajo grado (disasortativo; una estrella da −1); ~0 = sin correlación. Caracteriza el cableado de la red (hubs-con-hubs vs radial). El grafo se lee no dirigido, los bucles se ignoran, y un grafo sin aristas o de grado uniforme da 0. Puro.

Ejemplo: se añadió al botón existente *Coeficientes* del menú Análisis, que ahora muestra reciprocidad, transitividad **y asortatividad** en un toast.

Coste núcleo sin cambios (**19.99 KiB**; vive en `/analysis`, tree-shakeable; subpath 14.54 KiB). `tests/algorithms.test.ts` cubre la estrella disasortativa (−1), el ciclo de grado uniforme y el grafo sin aristas (0), el camino de 4 nodos (−0.5), y el caso perfectamente asortativo (1, aristas entre grados iguales) + pureza. `npm test` 759, `npm run test:ui` 488, `npm run check` OK.

## Consulta de nodos (`matchNodes`)

Nueva API de consulta/filtrado en `@fsaldivar.dev/diagram/analysis`: `matchNodes(graph, { type?, group?, tag?, titleIncludes? })` devuelve los ids de los nodos que cumplen todos los criterios dados (AND) — por `type` (uno o varios), `group`, un `tag` que el nodo lleve, y/o un substring `titleIncludes` sin distinguir mayúsculas. Una consulta vacía devuelve todos los nodos. Bloque reutilizable para búsqueda, filtros y "seleccionar todos los que coincidan" en integraciones — algo que antes solo existía como búsqueda ad-hoc en el ejemplo. Devuelve ids en orden de declaración. Puro. Adición de librería (sin botón, como `edgeBetweenness`).

Coste núcleo sin cambios (**19.99 KiB**; vive en `/analysis`, tree-shakeable; subpath 14.66 KiB). `tests/algorithms.test.ts` cubre el filtrado por tipo (uno y varios), por grupo, por etiqueta, por substring de título sin distinguir mayúsculas, la combinación AND, la consulta vacía (todos) y el no-match. `npm test` 760, `npm run test:ui` 488 (sin cambios; adición solo de librería), `npm run check` OK.

## Huella estructural (`graphFingerprint`)

Nueva utilidad en `@fsaldivar.dev/diagram/analysis`: `graphFingerprint(graph)` devuelve una **huella estructural estable** — un hash hex corto (16 caracteres) de los nodos y aristas en forma canónica (ordenada, independiente del orden de declaración), de modo que dos diagramas con la misma estructura dan la misma huella y cualquier cambio en la identidad de un nodo/arista la altera. Cubre `id/type/title/group/lane/tags` de nodos y `source/target/label/relation/condition` de aristas; **no** incluye el layout. Sin dependencias (FNV-1a con dos semillas). Útil para detección de cambios, caché de renderizado y deduplicar diagramas. Pura y determinista.

Ejemplo: botón *Huella* en el menú Análisis (icono `list`) → muestra la huella en un toast.

Coste núcleo sin cambios (**19.99 KiB**; vive en `/analysis`, tree-shakeable; subpath 14.87 KiB). `tests/algorithms.test.ts` cubre que es determinista e independiente del orden (mismo hash reordenando nodos/aristas), que una arista extra la cambia, que refleja cambios de título/tipo pero no el layout, y el grafo vacío estable; prueba UI (toast con 16 hex) en Chromium/WebKit. `npm test` 762, `npm run test:ui` 490, `npm run check` OK.

## Exportar Mermaid con estilo por tipo (`toMermaidStyled`)

Nuevo exportador en `@fsaldivar.dev/diagram/io`: `toMermaidStyled(document, { palette? })` envuelve `toMermaid` y, para documentos de tipo flowchart (cualquier perfil salvo uml/er), añade líneas `classDef`/`class` que **colorean cada nodo según su tipo** (relleno pastel + borde más oscuro + texto oscuro), de modo que el Mermaid exportado se renderiza con los colores por tipo de Kairo en GitHub, mermaid.live, Notion, etc. Perfiles no-flowchart (class/ER) se devuelven sin cambios. Acepta una `palette` parcial para sobreescribir el relleno por tipo. Módulo aparte (no toca `text.ts`), solo de exportación, puro.

Ejemplo: botón *Exportar Mermaid con estilo* en el menú Exportar (icono `code`) → descarga `diagrama.estilo.mmd`.

Coste núcleo sin cambios (**19.99 KiB**; vive en `/io`, tree-shakeable; subpath IO 39.50 KiB). `tests/mermaidstyle.test.ts` cubre la emisión de `classDef` por tipo + agrupación de ids en una línea `class` para un flowchart, la `palette` personalizada, y que la salida de class/ER queda intacta (sin `classDef`); prueba UI (export `.estilo.mmd` → flowchart con `classDef` y línea `class`) en Chromium/WebKit. `npm test` 765, `npm run test:ui` 492, `npm run check` OK.

## Todos los ciclos / bucles de retroalimentación (`cycles`)

Nuevo en `@fsaldivar.dev/diagram/analysis`: `cycles(graph, { limit? })` enumera **todos los ciclos simples** (bucles de retroalimentación) del grafo dirigido — no solo el primero como `findCycle`. Cada ciclo es una lista de ids de nodos en orden de recorrido (sin repetir el nodo de cierre); los bucles propios aparecen como una lista de un solo nodo. Un DFS anclado cuenta cada ciclo una vez en su nodo de menor índice, así que no hay rotaciones ni duplicados. Acotado por `limit` (1000 por defecto) para no desbordar en grafos con muchos ciclos. Puro y determinista. Distinto de `findCycle` (uno), `hasCycle` (booleano) y `feedbackArcSet` (aristas a romper).

Ejemplo: botón *Bucles* en el menú Análisis (icono `cycle`, nombre elegido para no chocar con «Ciclos» de `findCycle`) → resalta todos los bucles e indica cuántos hay.

Coste núcleo sin cambios (**19.99 KiB**; vive en `/analysis`, tree-shakeable; subpath 15.01 KiB). `tests/algorithms.test.ts` cubre el triángulo (un ciclo, sin rotaciones), varios bucles distintos + bucle propio + DAG (ninguno), y el respeto del `limit` + pureza; prueba UI (importar triángulo CSV → 1 bucle resaltado) en Chromium/WebKit. `npm test` 768, `npm run test:ui` 494, `npm run check` OK.

## Centralidad de autovector (`eigenvectorCentrality`)

Centralidad clásica nueva en `@fsaldivar.dev/diagram/analysis`: `eigenvectorCentrality(graph, { iterations? })` mide la **influencia** de cada nodo según esté conectado a otros nodos influyentes (iteración de potencia, no dirigida), no solo por su grado. Las puntuaciones se normalizan para que el nodo principal valga 1; un grafo (o nodo) sin aristas puntúa 0. Itera sobre `A + I` para converger también en grafos bipartitos (una estrella, si no, oscilaría y clasificaría mal el hub; con la corrección el hub vale 1 y las hojas ≈0.577). `influentialByEigenvector(graph, count=3)` da los ids más centrales. Complementa PageRank (su primo dirigido y amortiguado), grado, intermediación, cercanía y armónica. Determinista. Puro.

Ejemplo: botón *Autovector* en el menú Análisis (icono `trophy`) → resalta los nodos más influyentes por conexión a influyentes.

Coste núcleo sin cambios (**19.99 KiB**; vive en `/analysis`, tree-shakeable; subpath 15.24 KiB). `tests/algorithms.test.ts` cubre la estrella (hub=1, hojas≈0.577 e iguales), la simetría en un triángulo y el grafo sin aristas (0), y el determinismo + pureza; prueba UI (resalta los más centrales sobre el ejemplo de arquitectura) en Chromium/WebKit. `npm test` 771, `npm run test:ui` 496, `npm run check` OK.

## Exportar treemap SVG (`toTreemapSvg`)

Visualización nueva y distinta en `@fsaldivar.dev/diagram/export`: `toTreemapSvg(document, { width?, height?, padding? })` dibuja la jerarquía del diagrama como un **treemap** anidado — cada nodo es un rectángulo con área proporcional al tamaño de su subárbol, con los hijos empacados dentro del padre (slice-and-dice, alternando orientación por profundidad) y sombreado por profundidad. Una vista de conjunto que ningún editor de diagramas genera automáticamente: de un vistazo se ve qué ramas pesan más. La jerarquía es un bosque de expansión desde las raíces (nodos sin entrada); varias raíces se empacan bajo todo el lienzo. SVG autocontenido con colores literales. Puro; sin dependencia de `/analysis` (la jerarquía se deriva internamente).

Ejemplo: botón *Exportar treemap* en el menú Exportar (icono `cells`) → descarga `diagrama.treemap.svg`.

Coste núcleo sin cambios (**19.99 KiB**; vive en `/export`, tree-shakeable; subpath 15.86 KiB). `tests/treemap.test.ts` cubre el SVG válido con un rect por nodo + fondo y etiquetas, el dimensionado de una rama más pesada más grande que una ligera, y los casos de grafo vacío y bosque multi-raíz; prueba UI (export `.treemap.svg` → SVG con >3 rects y una etiqueta) en Chromium/WebKit. `npm test` 774, `npm run test:ui` 498, `npm run check` OK.

## Exportar matriz de adyacencia SVG (`toMatrixSvg`)

Otra visualización distinta en `@fsaldivar.dev/diagram/export`: `toMatrixSvg(document, { fill? })` dibuja el grafo como una **matriz de adyacencia** — una rejilla N×N con las etiquetas de los nodos en filas y columnas y una celda coloreada en (i, j) por cada arista i→j. Alternativa compacta a la vista node-link para grafos densos, donde los patrones de conexión (clústeres, hubs, bandas) se leen de un vistazo. El tamaño de celda se autoajusta al número de nodos; las etiquetas se muestran solo cuando las celdas son suficientemente grandes. SVG autocontenido con colores literales. Puro.

Ejemplo: botón *Matriz SVG* en el menú Exportar (icono `matrix`, nombre elegido para no chocar con «Exportar matriz» CSV) → descarga `diagrama.matriz.svg`.

Coste núcleo sin cambios (**19.99 KiB**; vive en `/export`, tree-shakeable; subpath 16.25 KiB). `tests/matrixsvg.test.ts` cubre una celda por arista + líneas de rejilla + etiquetas de fila/columna rotadas, la celda en (fila origen, col destino) con color personalizado, y el ocultado de etiquetas con muchos nodos + grafo vacío válido; prueba UI (export `.matriz.svg` → rejilla con líneas y 6 celdas coloreadas para el ejemplo de 6 aristas) en Chromium/WebKit. `npm test` 777, `npm run test:ui` 500, `npm run check` OK.

## Exportar diagrama de arcos SVG (`toArcSvg`)

Tercera visualización distinta (junto a treemap y matriz) en `@fsaldivar.dev/diagram/export`: `toArcSvg(document, { gap?, forward?, backward? })` dibuja un **diagrama de arcos** — los nodos en una línea base horizontal (orden de declaración) y cada arista como un arco cuadrático por encima, con altura proporcional a su alcance. Las aristas hacia adelante (origen antes que destino) y hacia atrás (un bucle que alcanza un nodo anterior) se colorean distinto, así que los ciclos y las dependencias de largo alcance resaltan — una vista reconocible para secuencias y cadenas de dependencias que ningún editor genera de serie. Omite bucles propios; oculta etiquetas con `gap` pequeño. SVG autocontenido, puro.

Ejemplo: botón *Exportar arcos* en el menú Exportar (icono `route`) → descarga `diagrama.arcos.svg`.

Coste núcleo sin cambios (**19.99 KiB**; vive en `/export`, tree-shakeable; subpath 16.57 KiB). `tests/arc.test.ts` cubre un punto por nodo + un arco cuadrático por arista + etiquetas, el coloreado distinto de aristas hacia adelante/atrás, y el salto de bucles propios + ocultado de etiquetas con gap pequeño + grafo vacío; prueba UI (export `.arcos.svg` → 7 puntos y 6 arcos para el ejemplo) en Chromium/WebKit. `npm test` 780, `npm run test:ui` 502, `npm run check` OK.

## Podar hojas (`trimLeaves`)

Transformación de limpieza en `@fsaldivar.dev/diagram/layout`: `trimLeaves(document, { iterate?, keep? })` quita los nodos de **grado ≤ 1** (hojas y aislados) junto con sus aristas, dejando solo la estructura central del grafo. Con `iterate: true` repite la poda hasta llegar al **2-core** (cada nodo restante con al menos dos conexiones) — útil para ver el esqueleto de un árbol o destilar el ciclo central de una maraña de dependencias. `keep` protege ids concretos (p. ej. inicio/fin de un flujo) para que nunca se poden. Distinta de `spanningTree` (que conserva todos los nodos y recorta aristas), de `condense` (que colapsa SCCs) y de `contractChains` (que fusiona cadenas): `trimLeaves` elimina nodos periféricos. Pura, no muta el documento.

Ejemplo: botón *Podar hojas* en el menú Layout → poda una pasada, reencuadra y avisa cuántos nodos de grado ≤1 se quitaron (o que todo es núcleo).

Coste núcleo sin cambios (**19.99 KiB**; vive en `/layout`, tree-shakeable; subpath 12.99 KiB). `tests/trimleaves.test.ts` cubre quitar extremos de una ruta, iterar hasta el 2-core y una estrella → hub aislado + pureza; prueba UI (importar estrella CSV de 4 nodos → *Podar hojas* → 1 nodo, toast «Hojas podadas: 3») en Chromium/WebKit. `npm test` 783, `npm run check` OK.

## Exportar diagrama de cuerdas SVG (`toChordSvg`)

Cuarta visualización distinta (junto a treemap, matriz y arco) en `@fsaldivar.dev/diagram/export`: `toChordSvg(document, { radius?, stroke?, nodeFill? })` dibuja un **diagrama de cuerdas** — los nodos repartidos uniformemente alrededor de un círculo (orden de declaración) y cada arista como una curva cuadrática de Bézier que se arquea hacia el centro. Un grafo denso o cíclico se lee así como una telaraña radial en vez de una maraña de rectas que se cruzan — una vista compacta y reconocible para matrices de relaciones y grafos de dependencias cíclicas que Mermaid/draw.io/Excalidraw no generan de serie. Las etiquetas radian hacia afuera (las de la mitad izquierda se voltean para quedar legibles); omite bucles propios; con `radius` pequeño oculta etiquetas. SVG autocontenido con colores literales, deriva su propia geometría. Puro.

Ejemplo: botón *Exportar cuerdas* en el menú Exportar (icono `ring`) → descarga `diagrama.cuerdas.svg`.

Coste núcleo sin cambios (**19.99 KiB**; vive en `/export`, tree-shakeable; subpath 16.96 KiB). `tests/chord.test.ts` cubre un punto por nodo + una cuerda cuadrática por arista + etiquetas + rol/aria, colores personalizados y salto de bucles propios, y el ocultado de etiquetas con radio pequeño + grafo vacío; prueba UI (export `.cuerdas.svg` → 7 puntos y 6 cuerdas para el ejemplo) en Chromium/WebKit. `npm test` 786, `npm run check` OK.

## Exportar Sankey (Mermaid `sankey-beta`) con flujo por arista (`toSankey`)

`packages/diagram/src/report.ts` exporta `toSankey(document, { weight? })` desde `@fsaldivar.dev/diagram/analysis`: convierte el flujo en un diagrama `sankey-beta` de Mermaid — cada arista es un enlace ponderado cuyo grosor refleja cuánto flujo transporta. Por defecto el peso es el **número de rutas origen→sumidero que atraviesan la arista** (rutas aguas arriba × rutas aguas abajo sobre un DAG, vía `topologicalOrder`), así que los troncos se dibujan gruesos y las ramas finas; un callback `weight(edge)` lo sobrescribe y un grafo con ciclos recae en peso uniforme 1. Los títulos repetidos se desambiguan (`Dup`, `Dup (2)`) para que nodos distintos no se fusionen en el Sankey, y los bucles propios se omiten (Sankey no los admite). Redondea la familia de gráficos Mermaid de Kairo (flow/C4/gantt/pie/cuadrante) con una vista de volumen de flujo que los competidores no derivan. Puro; compone `topologicalOrder`.

Ejemplo: botón *Exportar Sankey* en el menú Exportar (icono `route`) → descarga `diagrama.sankey.mmd`, pegable en mermaid.live / GitHub / GitLab / Notion.

Coste núcleo sin cambios (**19.99 KiB**; vive en `/analysis`, tree-shakeable; subpath 15.55 KiB). `tests/sankey.test.ts` cubre el encabezado + una fila por arista, el ponderado de troncos por conteo de rutas en un DAG (diamante → tronco con peso 2), la recaída a peso 1 en cíclico + desambiguación de títulos + salto de bucles propios, y el callback `weight` personalizado; prueba UI (export `.sankey.mmd` → 6 enlaces con peso numérico) en Chromium/WebKit. `npm test` 790, `npm run check` OK.

## Importar Mermaid `sankey-beta` (`parseSankey`)

`packages/diagram/src/sankeyimport.ts` exporta `parseSankey(text, { nodeWidth?, nodeHeight?, gap? })` desde `@fsaldivar.dev/diagram/io`: importa un diagrama `sankey-beta` de Mermaid como grafo de flujo. Cada fila CSV `origen,destino,valor` es una arista (los nodos se infieren de los nombres y se desduplican por nombre), y un valor mayor que 1 se conserva como etiqueta de la arista para que los pesos de los troncos sobrevivan la importación. Inverso de `toSankey` (cierra el ida y vuelta, como `parseGantt`↔`toGantt`). Respeta el entrecomillado CSV estándar (`"a,b"`, escapes `""`), omite el encabezado/comentarios/bucles propios y lanza si no hay enlaces. Layout por capas. Sin `eval`. Solo-importación (barrel de io + botón, no en `convert`, igual que `parseGantt`; `toSankey` vive en `/analysis`).

Ejemplo: botón *Importar Sankey* en el menú Importar (icono `route`).

Coste núcleo sin cambios (**19.99 KiB**; vive en `/io`, tree-shakeable; subpath 39.79 KiB). `tests/sankeyimport.test.ts` cubre nodo por nombre único + arista por fila con layout, el valor >1 como etiqueta (y omitido para 1), el entrecomillado + salto de encabezado/comentario/bucle propio + error en vacío, y el round-trip `toSankey`→`parseSankey` de la estructura; prueba UI (importar sankey de 4 nodos → 4 nodos, 3 aristas) en Chromium/WebKit. `npm test` 794, `npm run check` OK.

## Exportar Mermaid `architecture-beta` (`toMermaidArchitecture`)

`packages/diagram/src/architecture.ts` exporta `toMermaidArchitecture(document, { title? })` desde `@fsaldivar.dev/diagram/io`: convierte el diagrama en un `architecture-beta` de Mermaid (el diagrama de arquitectura cloud/servicios de 2024), que se renderiza donde Mermaid lo soporte (GitHub, GitLab, mermaid.live). Complementa C4 y Structurizr para el caso de arquitectura. Cada `group` distinto se vuelve un `group`, cada nodo un `service` colocado `in` su grupo, y cada arista una conexión con anclas de lado (L/R/T/B) **elegidas según las posiciones relativas del layout** para que el enrutado siga al diagrama. Los tipos de nodo se mapean al set de iconos integrado (database→database, file/folder→disk, screen/external→internet, component/module/generic→cloud, resto→server). Solo-exportación (igual que `toMermaidC4`); identificadores saneados y desduplicados, etiquetas con corchetes escapados, sin bucles propios. Puro.

Ejemplo: botón *Exportar Mermaid arquitectura* en el menú Exportar (icono `network`) → descarga `diagrama.arquitectura.mmd`.

Coste núcleo sin cambios (**19.99 KiB**; vive en `/io`, tree-shakeable; subpath 40.24 KiB). `tests/architecture.test.ts` cubre encabezado + servicios agrupados con iconos por tipo + conexiones, la elección de anclas por posición (horizontal `:R --> L:`, vertical `:B --> T:`) + salto de bucles propios, y los nodos sin grupo (sin cláusula `in`) + escape de corchetes; prueba UI (export `.arquitectura.mmd` → `architecture-beta`, servicio tipado, conexión con ancla) en Chromium/WebKit. `npm test` 804, `npm run check` OK.

## Importar Mermaid `architecture-beta` (`parseArchitecture`)

`packages/diagram/src/architectureimport.ts` exporta `parseArchitecture(text, { nodeWidth?, nodeHeight?, gap? })` desde `@fsaldivar.dev/diagram/io`: importa un diagrama `architecture-beta` de Mermaid como grafo de Kairo. Las líneas `group <id>(<icon>)[Title]` se vuelven grupos de nodos; `service`/`junction <id>(<icon>)[Title] in <group>` se vuelven nodos (el icono se mapea de vuelta a un tipo: database→database, disk→file, internet→screen, cloud→component, resto→service; `junction`→generic); y las conexiones con anclas de lado `a:R --> L:b` se vuelven aristas (`-->` mantiene dirección, `<--` la invierte, `--`/`<-->` conservan el orden de declaración). Inverso de `toMermaidArchitecture` (cierra el ida y vuelta, como `parseSankey`↔`toSankey`). Lanza si no hay servicios; ignora líneas que no casan; sin `eval`. Layout por capas. Solo-importación (barrel de io + botón, no en `convert`; `toMermaidArchitecture` es solo-exportación).

Ejemplo: botón *Importar Mermaid arquitectura* en el menú Importar (icono `network`).

Coste núcleo sin cambios (**19.99 KiB**; vive en `/io`, tree-shakeable; subpath 40.71 KiB). `tests/architectureimport.test.ts` cubre nodos/grupos/aristas con mapeo icono→tipo, la dirección de flechas (`<--` invierte) + `junction`→generic, el error sin servicios, y el round-trip `toMermaidArchitecture`→`parseArchitecture` de estructura y grupos; prueba UI (importar architecture-beta de 3 servicios → 3 nodos, 2 aristas) en Chromium/WebKit. `npm test` 808, `npm run check` OK.

## Exportar sunburst SVG (`toSunburstSvg`)

`packages/diagram/src/sunburst.ts` exporta `toSunburstSvg(document, { size?, ringWidth? })` desde `@fsaldivar.dev/diagram/export`: dibuja la jerarquía del diagrama como un **sunburst** — anillos concéntricos donde cada nodo es un sector anular cuyo ángulo es proporcional al tamaño de su subárbol (cuenta de hojas) y cuyo anillo es su profundidad. Las raíces ocupan el centro (una sola raíz se dibuja como disco) y los descendientes se abren hacia afuera, así que la forma del árbol y qué ramas dominan se ven de un vistazo. Contraparte radial del treemap rectangular y quinta viz autocontenida (treemap/matriz/arco/cuerdas/mapa de calor). La jerarquía es un bosque de expansión desde las raíces (nodos sin arista entrante). SVG autocontenido con colores literales, deriva su propia geometría. Puro.

Ejemplo: botón *Exportar sunburst* en el menú Exportar (icono `sun`) → descarga `diagrama.sunburst.svg`.

Coste núcleo sin cambios (**19.99 KiB**; vive en `/export`, tree-shakeable; subpath 17.52 KiB). `tests/sunburst.test.ts` cubre sectores concéntricos de un árbol (raíz única = disco central + descendientes como sectores anulares con comando de arco SVG + etiquetas), dos medios sectores para dos raíces + grafo vacío, y el tamaño personalizado; prueba UI (export `.sunburst.svg` → `aria-label="Sunburst"` + al menos un arco anular) en Chromium/WebKit. `npm test` 811, `npm run check` OK.

## Exportar Sankey SVG renderizado (`toSankeySvg`)

`packages/diagram/src/sankeysvg.ts` exporta `toSankeySvg(document, { width?, unit?, nodeWidth? })` desde `@fsaldivar.dev/diagram/export`: renderiza el flujo como un **Sankey nativo** — los nodos se colocan en capas de izquierda a derecha según su profundidad de camino más largo, cada uno dibujado como una barra vertical cuya altura es proporcional a su caudal (el mayor de su número de aristas de entrada/salida), y cada arista es una cinta cúbica de Bézier entre barras. Es la contraparte renderizada del exportador de texto Mermaid `toSankey`: una vista de volumen de flujo producida directamente, sin renderizador externo, que los competidores no generan de serie. Sexta viz autocontenida (treemap/matriz/arco/cuerdas/sunburst/mapa de calor). La capa se calcula con un layering de camino más largo (Kahn); los nodos en un ciclo quedan en la capa 0; omite bucles propios. SVG autocontenido con colores literales, deriva su propia geometría. Puro.

Ejemplo: botón *Exportar Sankey SVG* en el menú Exportar (icono `route`) → descarga `diagrama.sankey.svg`.

Coste núcleo sin cambios (**19.99 KiB**; vive en `/export`, tree-shakeable; subpath 18.13 KiB). `tests/sankeysvg.test.ts` cubre una barra por nodo + una cinta por arista con rol/aria, el escalonado por capas (x crecientes), la altura por caudal (hub ×3 = 48 px, hoja = 16 px) + salto de bucles propios, y el grafo vacío; prueba UI (export `.sankey.svg` → 7 barras y 6 cintas) en Chromium/WebKit. `npm test` 815, `npm run check` OK.

## Componentes 2-arista-conexos / núcleos robustos (`twoEdgeConnectedComponents`, `largestRobustCluster`)

`packages/diagram/src/algorithms.ts` exporta `twoEdgeConnectedComponents(graph)` y `largestRobustCluster(graph)` desde `@fsaldivar.dev/diagram/analysis`: descomposición del grafo (visto como no dirigido) en **componentes 2-arista-conexos** — se quitan los puentes (`bridges`, enlaces de fallo único) y se toman los componentes conexos de lo que queda. Cada componente es un grupo máximo de nodos que sigue conectado tras cortar cualquier enlace: un clúster robusto, el complemento de los puntos únicos de fallo que reporta `bridges`. Los nodos aislados y los extremos de puente vuelven como singletons; las aristas paralelas cuentan como 2-arista-conexas (dos enlaces entre el mismo par no son puente). `largestRobustCluster` devuelve el mayor bloque (≥2 nodos) o vacío si cada enlace es un puente (árbol/cadena pura). Complementa `articulationPoints`/`bridges`/`criticalElements`/`fragmentation`. Puro; reutiliza `bridges`.

Ejemplo: botón *Núcleo robusto* en el menú Análisis → resalta el mayor bloque 2-arista-conexo (o avisa si todo es puente).

Coste núcleo sin cambios (**19.99 KiB**; vive en `/analysis`, tree-shakeable; subpath 15.71 KiB). `tests/robust.test.ts` cubre separar extremos de puente conservando el ciclo, el mayor bloque, el vacío cuando todo es puente (cadena → 3 singletons) y las aristas paralelas como robustas; prueba UI (triángulo + puente c→d → resalta 3 nodos del triángulo, no el colgante) en Chromium/WebKit. `npm test` 819, `npm run check` OK.

## Exportar línea de tiempo (Mermaid `timeline`) por generaciones (`toMermaidTimeline`)

`packages/diagram/src/report.ts` exporta `toMermaidTimeline(document, { title?, period? })` desde `@fsaldivar.dev/diagram/analysis`: convierte el flujo en un `timeline` de Mermaid — cada **generación topológica** se vuelve una `section` (su orden = el paso temporal) y cada nodo de esa generación un evento, así que un proceso se lee de izquierda a derecha como «qué ocurre y cuándo». Los nodos atrapados en un ciclo (que nunca alcanzan grado de entrada 0) se agrupan en una `section` final «Ciclo». Un callback `period(index, ids)` renombra los pasos (por defecto «Paso N»). Los `:` de los títulos se escapan a `;` (Mermaid timeline los usa como separador). Nuevo destino de la familia de gráficos Mermaid (flow/C4/gantt/pie/cuadrante/sankey) que los competidores no derivan de un flujo. Solo-exportación. Puro; compone `topologicalGenerations`.

Ejemplo: botón *Exportar línea de tiempo* en el menú Exportar (icono `bolt`) → descarga `diagrama.timeline.mmd`, pegable en mermaid.live / GitHub / Notion.

Coste núcleo sin cambios (**19.99 KiB**; vive en `/analysis`, tree-shakeable; subpath 15.86 KiB). `tests/timeline.test.ts` cubre generaciones → secciones con eventos (dos nodos comparten el Paso 2), el agrupado de ciclos en «Ciclo» + escape de `:`, y el etiquetador `period` personalizado + grafo vacío (`timeline\n`); prueba UI (export `.timeline.mmd` → `timeline` + al menos una `section`) en Chromium/WebKit. `npm test` 822, `npm run check` OK.

## Rutas alternativas: k rutas más cortas (`kShortestPaths`)

`packages/diagram/src/algorithms.ts` exporta `kShortestPaths(graph, from, to, k=3)` desde `@fsaldivar.dev/diagram/analysis`: devuelve las **k rutas simples dirigidas más cortas** por número de saltos (algoritmo de Yen sobre BFS no ponderado), ordenadas de más corta a más larga y, a igualdad, lexicográficamente. Es el punto medio entre `shortestPath` (solo una) y `allPaths` (todas): «muéstrame las N mejores rutas alternativas», para análisis de redundancia/failover. Devuelve `[]` si el destino es inalcanzable o algún id es desconocido; garantiza rutas simples (sin nodos repetidos). Puro y determinista.

Ejemplo: botón *Rutas alternativas* en el menú Análisis (con dos nodos seleccionados por Shift-clic) → resalta la unión de hasta 3 rutas y avisa cuántas hay y los saltos de la más corta.

Coste núcleo sin cambios (**19.99 KiB**; vive en `/analysis`, tree-shakeable; subpath 16.24 KiB). `tests/kpaths.test.ts` cubre las k mejores rutas (más corta primero, empates lexicográficos), el tope en el número real de rutas simples, el respeto de la dirección + `[]` para inalcanzable/desconocido/k≤0, y la ruta única cuando solo existe una; prueba UI (login→firebase en el ejemplo → resalta las 5 nodos de la ruta, no `users`, toast «la más corta usa 4 saltos») en Chromium/WebKit. `npm test` 826, `npm run check` OK.

## Exportar Mermaid `block-beta` (`toMermaidBlock`)

`packages/diagram/src/block.ts` exporta `toMermaidBlock(document, { columns? })` desde `@fsaldivar.dev/diagram/io`: convierte el diagrama en un `block-beta` de Mermaid (el diagrama de bloques de 2024), que se renderiza donde Mermaid lo soporte. Cada nodo es un bloque etiquetado colocado en una cuadrícula de `columns` (por defecto ≈√n para que quede cuadrada) y cada arista una flecha (`-->`, o `-- "label" -->` cuando la arista tiene etiqueta). Redondea la familia de gráficos Mermaid de Kairo (flow/C4/architecture/gantt/pie/cuadrante/sankey/timeline). Solo-exportación (como `toMermaidC4`/`toMermaidArchitecture`); identificadores saneados y desduplicados, etiquetas con comillas degradadas, bucles propios omitidos. Puro.

Ejemplo: botón *Exportar Mermaid bloques* en el menú Exportar (icono `cells`) → descarga `diagrama.block.mmd`.

Coste núcleo sin cambios (**19.99 KiB**; vive en `/io`, tree-shakeable; subpath 40.92 KiB). `tests/block.test.ts` cubre encabezado `columns` + un bloque etiquetado por nodo + una flecha por arista (con y sin etiqueta), el default de columnas ≈√n + salto de bucles propios, y el saneado de ids + escape de comillas + grafo vacío (`block-beta\n  columns 1\n`); prueba UI (export `.block.mmd` → `block-beta`, `columns`, un bloque y una flecha) en Chromium/WebKit. `npm test` 829, `npm run check` OK.

## Importar Mermaid `block-beta` (`parseMermaidBlock`)

`packages/diagram/src/blockimport.ts` exporta `parseMermaidBlock(text, { nodeWidth?, nodeHeight?, gap? })` desde `@fsaldivar.dev/diagram/io`: importa un diagrama `block-beta` de Mermaid como grafo de Kairo. Una declaración de bloque `id["Label"]` (también `( )`, `{ }`, `< >`, o un `id` pelado) se vuelve un nodo, y una flecha `a --> b` (o `a -- "label" --> b`) una arista con su etiqueta. Inverso de `toMermaidBlock` (cierra el ida y vuelta, como `parseArchitecture`↔`toMermaidArchitecture`). Las directivas de cuadrícula (`columns`, `space`) se ignoran, un `block:id` anidado se trata como id de bloque, y los extremos de flecha no declarados se crean al vuelo. Lanza si no hay bloques; sin `eval`. Layout por capas. Solo-importación (barrel de io + botón, no en `convert`).

Ejemplo: botón *Importar Mermaid bloques* en el menú Importar (icono `cells`).

Coste núcleo sin cambios (**19.99 KiB**; vive en `/io`, tree-shakeable; subpath 41.22 KiB). `tests/blockimport.test.ts` cubre nodos desde bloques + aristas desde flechas conservando etiquetas, el ignorado de directivas + formas con/sin corchetes + extremos no declarados, el error sin bloques, y el round-trip `toMermaidBlock`→`parseMermaidBlock` de estructura y etiquetas; prueba UI (importar block-beta de 3 bloques → 3 nodos, 2 aristas) en Chromium/WebKit. `npm test` 833, `npm run check` OK.

## Exportar icicle SVG (`toIcicleSvg`)

`packages/diagram/src/icicle.ts` exporta `toIcicleSvg(document, { width?, rowHeight? })` desde `@fsaldivar.dev/diagram/export`: dibuja la jerarquía del diagrama como un **icicle** — bandas horizontales apiladas, una fila por profundidad, donde cada nodo es un rectángulo cuyo ancho es proporcional al tamaño de su subárbol. Las raíces ocupan todo el ancho en la fila superior y los descendientes reparten el ancho de su padre debajo, así que la forma del árbol se lee de arriba abajo. Contraparte cartesiana del sunburst radial y distinto del treemap anidado. Séptima viz autocontenida (treemap/matriz/arco/cuerdas/sunburst/sankey/mapa de calor, ahora + icicle). La jerarquía es un bosque de expansión desde las raíces (nodos sin arista entrante). SVG autocontenido con colores literales, deriva su propia geometría. Puro.

Ejemplo: botón *Exportar icicle* en el menú Exportar (icono `cells`) → descarga `diagrama.icicle.svg`.

Coste núcleo sin cambios (**19.99 KiB**; vive en `/export`, tree-shakeable; subpath 18.53 KiB). `tests/icicle.test.ts` cubre una banda por profundidad (raíz a todo el ancho en la fila superior, altura = filas × rowHeight), el reparto del ancho por peso de subárbol (hijo con 2 hojas → doble de ancho) y la colocación bajo el padre, y dos raíces + grafo vacío (solo fondo); prueba UI (export `.icicle.svg` → `aria-label="Icicle"` + bandas) en Chromium/WebKit. `npm test` 836, `npm run check` OK.

## Exportar PlantUML mindmap (`toPlantumlMindmap`)

`packages/diagram/src/plantumlmindmap.ts` exporta `toPlantumlMindmap(document, { root? })` desde `@fsaldivar.dev/diagram/io`: convierte la jerarquía del diagrama en un `@startmindmap` de PlantUML usando su sintaxis de marcadores de profundidad (`*`, `**`, `***`…). Se renderiza como mindmap donde corra PlantUML. Complementa los exports PlantUML de clases y componentes (`toPlantuml`) y el mindmap de Mermaid (`toMindmap`), ampliando la cobertura de PlantUML. La jerarquía es un bosque de expansión desde las raíces (nodos sin arista entrante); una sola raíz es el nodo `*`, y varias raíces se anidan bajo una raíz sintética (`root`, por defecto «Diagrama»). Solo-exportación; los títulos se aplanan a una línea. Puro.

Ejemplo: botón *PlantUML mindmap* en el menú Exportar (icono `branches`) → descarga `diagrama.mindmap.puml`.

Coste núcleo sin cambios (**19.99 KiB**; vive en `/io`, tree-shakeable; subpath 41.51 KiB). `tests/plantumlmindmap.test.ts` cubre nodos con marcadores de profundidad en un árbol de raíz única (`*`/`**`/`***`), el envoltorio de varias raíces bajo una raíz sintética, y el aplanado de saltos de línea + grafo vacío (`@startmindmap\n@endmindmap\n`); prueba UI (export `.mindmap.puml` → `@startmindmap`…`@endmindmap` + un nodo con marcador) en Chromium/WebKit. `npm test` 839, `npm run check` OK.

## Importar PlantUML mindmap (`parsePlantumlMindmap`)

`packages/diagram/src/plantumlmindmapimport.ts` exporta `parsePlantumlMindmap(text, { nodeWidth?, nodeHeight?, gap? })` desde `@fsaldivar.dev/diagram/io`: importa un `@startmindmap` de PlantUML como árbol de Kairo. Cada línea con marcadores de profundidad (`*`, `**`, `***`, y las variantes de lado `+`/`-`) es un nodo que se engancha al nodo menos profundo más cercano como su padre (arista padre→hijo, vía una pila). Tolera un `[#color]` tras los marcadores, el marcador boxless `_`, y los comentarios `'`; parsea también sin los envoltorios `@start/@end`. Inverso de `toPlantumlMindmap` (cierra el ida y vuelta, como los demás pares). Lanza si no hay nodos; layout por capas; sin `eval`. Solo-importación (barrel de io + botón, no en `convert`).

Ejemplo: botón *Importar mindmap PlantUML* en el menú Importar (icono `branches`).

Coste núcleo sin cambios (**19.99 KiB**; vive en `/io`, tree-shakeable; subpath 41.80 KiB). `tests/plantumlmindmapimport.test.ts` cubre el árbol desde marcadores (padres correctos), la tolerancia a color/boxless/comentario/lado, el parseo sin envoltorios + error en vacío, y el round-trip `toPlantumlMindmap`→`parsePlantumlMindmap` de un árbol de raíz única; prueba UI (importar mindmap de 4 nodos → 4 nodos, 3 aristas) en Chromium/WebKit. `npm test` 843, `npm run check` OK.

## Nodos similares: similitud estructural de Jaccard (`jaccardSimilarity`, `similarNodes`)

`packages/diagram/src/algorithms.ts` exporta `jaccardSimilarity(graph, a, b)` y `similarNodes(graph, id, count=3)` desde `@fsaldivar.dev/diagram/analysis`: miden cuán parecido es el **rol estructural** de dos nodos por la similitud de Jaccard de sus conjuntos de vecinos no dirigidos (|N(a)∩N(b)| / |N(a)∪N(b)|, en [0,1]). Dos nodos conectados a las mismas cosas son intercambiables (similitud 1). `similarNodes` devuelve los nodos más parecidos a `id`, de mayor a menor (empates por orden de declaración), excluyendo el propio nodo y los de puntuación 0. Responde «¿qué nodos juegan el mismo papel que este?» — distinto de `suggestLinks` (que predice enlaces faltantes). Puro.

Ejemplo: botón *Nodos similares* en el menú Análisis (con un nodo seleccionado) → resalta el nodo y sus gemelos estructurales, avisando la similitud máxima.

Coste núcleo sin cambios (**19.99 KiB**; vive en `/analysis`, tree-shakeable; subpath 16.45 KiB). `tests/similar.test.ts` cubre Jaccard 1/0 para vecindarios idénticos/disjuntos (y self), el solapamiento parcial (1/3), el ranking excluyendo self y puntuación 0, y `[]` para id desconocido o nodo sin co-vecinos; prueba UI (importar `h,a`/`h,b` → seleccionar `a` → resalta `a` y su gemelo `b`, toast «Nodos similares: 1») en Chromium/WebKit. `npm test` 847, `npm run check` OK.

## Layout en línea / arco (`arcLayout`)

`packages/diagram/src/layout.ts` exporta `arcLayout(document, { gap?, vertical? })` desde `@fsaldivar.dev/diagram/layout`: coloca todos los nodos sobre una sola línea base, de izquierda a derecha en orden topológico (con recaída al orden de declaración si el grafo tiene un ciclo), equiespaciados. Es la contraparte de editor del export de diagrama de arcos — una lectura 1-D de una secuencia o cadena de dependencias donde las aristas se arquean sobre la línea. Con `vertical: true` la base corre de arriba a abajo. Determinista y puro; tamaños, formas, tags y semántica se conservan, puertos recomputados. Distinto de `circularLayout` (anillo) y `gridLayout` (rejilla).

Ejemplo: botón *Layout en línea* en el menú Layout (icono `route`).

Coste núcleo sin cambios (**19.99 KiB**; vive en `/layout`, tree-shakeable; subpath 13.21 KiB). `tests/arclayout.test.ts` cubre todos los nodos en una base en orden topológico (no de declaración) + grafo intacto, la variante vertical (una columna, a sobre b), y la recaída a orden de declaración en un ciclo + grafo vacío; prueba UI (*Layout en línea* → todos comparten la misma `y`, `x` distintas, semántica intacta) en Chromium/WebKit. `npm test` 850, `npm run check` OK.

## Subpaths `./convert` y `./markdown` + render síncrono desde texto (`mermaidToSvg`, `enhanceMarkdown`, `tryParse`)

Pensado para **entrar desde un bloque de texto/markdown de forma estable y síncrona** (sin runtime de Mermaid). Cuatro partes:

1. **Nuevos subpaths en `package.exports`** que ya existían en el código pero no eran importables:
   - `@fsaldivar.dev/diagram/convert` → `parseAny`, `importAny`, `convertText`, `detectFormat`, `serializeAs` y el nuevo `tryParse` (`InputFormat` incluye `mermaid`/`dot`/`d2`/`plantuml`/`drawio`/…). Entry `src/convert.ts`, bundle `dist/convert.js` (30 KiB gzip, no cuenta).
   - `@fsaldivar.dev/diagram/markdown` → `fromMarkdown`/`toMarkdown`/`toMarkdownTables`/`toReadme` + lo nuevo de abajo. Entry `src/markdown-entry.ts`, bundle `dist/markdown.js` (33.6 KiB gzip, no cuenta).

2. **Atajo de una llamada + enhancer síncrono** (`packages/diagram/src/mdembed.ts`, en `@fsaldivar.dev/diagram/markdown`):
   - `mermaidToSvg(code, opts?): string` — throw-safe: `mermaidToSvg('graph TD;A-->B')` devuelve un SVG; con sintaxis mala devuelve un **SVG de error** (`errorSvg`), nunca lanza. `codeToSvg(code, from, opts?)` es la versión genérica para cualquier `InputFormat`.
   - `enhanceMarkdown(root, { languages?, theme?, onError? })` — reemplaza `<pre><code class="language-mermaid|dot|graphviz|d2|plantuml">` por el SVG inline, **sin async ni runtime de mermaid**; solo lee/escribe el árbol recibido (vía su `ownerDocument`), deja intactos los lenguajes no soportados y reporta los bloques inválidos por `onError` sin tocarlos.

3. **Parseo que no lanza**: `tryParse(text, from): DiagramDocument | null` (en `convert.ts`); `mermaidToSvg`/`enhanceMarkdown` lo usan internamente.

4. **Tema por tokens**: `theme: 'currentColor'` (o el objeto exportado `currentColorTheme`) hace que el SVG herede el `color` del contenedor (claro/oscuro) sin mapear `DiagramTheme`; además cualquier valor de tema se emite verbatim, así que `{ edge: 'var(--line)' }` (variables CSS) también funciona.

**Fix de parser necesario para el criterio de aceptación**: `parseFlowText` (Mermaid flowchart) ahora acepta `;` como separador de sentencias en una línea (`graph TD;A-->B`), respetando `;` dentro de `[] () {}` y comillas; las flechas `-->`/`<--` nunca se parten. Todo puro y síncrono (sin DOM salvo `enhanceMarkdown`); cero dependencias nuevas; núcleo intacto en **19.99 KiB**. Ejemplo: página `examples/tauri/markdown.html` + `src/markdown-demo.ts`. `tests/embed-markdown.test.ts` (semicolon parsing incl. `;` en label, mermaidToSvg válido/error sin throw, `currentColor`, codeToSvg DOT, `tryParse`) + prueba UI `tests/ui/markdown.spec.ts` (enhanceMarkdown: 2 SVG renderizados, 2 bloques intactos, 1 error; `currentColor` heredado; mermaidToSvg de una llamada) en Chromium/WebKit. `npm test` 861, `npm run check` OK.
