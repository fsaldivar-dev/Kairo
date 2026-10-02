import { createDiagram, darkTheme, lightTheme, nodeIcons, nodeLabels, nodeTypes, nodeShapes, arrowMarkers, labelPositions, ports, searchNodes, parseDocument, type AlignEdge, type ConnectionIssue, type ConnectionPolicy, type DiagramDocument, type DiagramEdge, type NodeType, type Port, type Selection, type Tool } from '@fsaldivar.dev/diagram';
import '@fsaldivar.dev/diagram/style.css';
import { parseMermaid, parseDotText, importAny, toMermaid, toMermaidStyled, toDotText, toCanvas, toExcalidraw, fromCsv, toCsv, toCsvNodes, fromGraphml, toGraphml, fromGexf, toGexf, fromGml, toGml, fromPajek, toPajek, toMatrixCsv, parseD2, toD2, parseOutline, toOutline, fromDrawio, toDrawio, fromCytoscape, toCytoscape, fromJson, fromParentList, toHierarchy, fromGraphql, fromJsonSchema, parsePlantuml, toPlantuml, toPlantumlMindmap, parsePlantumlMindmap, encodeDocument, fromShareLink, toMarkdown, toMarkdownTables, toReadme, toMermaidInkMarkdown, toKrokiMarkdown, toMermaidLiveUrl, fromSvg, isEditableSvg, toStructurizr, fromStructurizr, toMermaidC4, toMermaidArchitecture, toMermaidBlock, fromNomnoml, toNomnoml, fromTgf, toTgf, fromDgml, toDgml, fromGraphvizJson, fromVisNetwork, toVisNetwork, fromNodeLink, toNodeLink, fromGraphology, toGraphology, fromElk, toElk, fromJgf, toJgf, parseGantt, parseSankey, parseArchitecture, parseMermaidBlock, fromOpml, toOpml, fromBpmn, toBpmn, embedDocumentInPng, readDocumentFromPng, isPng } from '@fsaldivar.dev/diagram/io';
import { autoLayout, organicLayout, resolveOverlaps, radialLayout, treeLayout, circularLayout, arcLayout, gridLayout, fitNodeSizes, snapToGrid, subgraph, collapseGroups, groupBy, clusterLayout, scoreLayouts, reduceCrossings, stableLayout, condense, contractChains, flipLayout, rotateLayout, scaleLayout, mindmapLayout, mergeNodes, mergeDuplicates, dedupeEdges, packComponents, spanningTree, trimLeaves, splitEdge, bypassNode, mergeLayout, mergeDocuments } from '@fsaldivar.dev/diagram/layout';
import { toSVG, toPNG, toThumbnail, toHtml, toLegend, toTikz, toTypst, toAscii, toEditableSvg, toCategorySvg, toTreemapSvg, toMatrixSvg, toArcSvg, toChordSvg, toSunburstSvg, toSankeySvg, toIcicleSvg } from '@fsaldivar.dev/diagram/export';
import { validateFlow, diffDocuments, minCut, eulerianTrail, shortestPath, longestPath, pathEdges, connectedComponents, centralNodes, allPaths, neighbors, redundantEdges, criticalElements, fragmentation, topFragmenters, brokerNodes, communities, influentialNodes, influentialByEigenvector, findCycle, cycles, feedbackArcSet, descendants, dominatorChain, coreness, graphProperties, closestNodes, graphCenter, endpoints, diameterPath, layoutMetrics, cyclomaticComplexity, toReport, toProcedure, toGantt, toPie, toQuadrant, toScheduleCsv, toStatsCard, toReportPage, toReachabilityCsv, toSankey, toMermaidTimeline, suggestLinks, topHarmonic, criticalPathMethod, reciprocity, transitivity, assortativity, modularity, graphFingerprint, largestRobustCluster, kShortestPaths, similarNodes } from '@fsaldivar.dev/diagram/analysis';
import { PathPlayer, flowSteps } from '@fsaldivar.dev/diagram/player';
import { createMinimap, type MinimapController } from '@fsaldivar.dev/diagram/minimap';
import { getTheme, themeNames, themeFrom } from '@fsaldivar.dev/diagram/themes';
import { getTemplate, templateNames, gridGraph } from '@fsaldivar.dev/diagram/templates';
import { isTauri, loadDocument, saveDocument } from '@fsaldivar.dev/plugin';
import { sampleDocument, decisionDocument } from './sample';
import { createStudio } from './studio';
import { installRecovery } from './recovery';
import { confirmAction } from './confirm';
import { textPrompt } from './text-prompt';
import { installAccess } from './access';
import { wrapNodeLabels } from '@fsaldivar.dev/diagram/labels';
import { shapeLabels, shapePreset, shapesDocument } from './shapes';
import './style.css';
import './studio.css';

const uiIcons: Record<string, string> = {
  terminal: 'M3 4h14v12H3z M6 8l3 2-3 2 M11 12h4',
  impact: 'M10 10m-2 0a2 2 0 104 0 2 2 0 10-4 0 M10 10m-5 0a5 5 0 1010 0 5 5 0 10-10 0 M14 6l3-3',
  outline: 'M4 5h12 M7 10h9 M10 15h6',
  clusters: 'M2 5h7v10H2z M11 5h7v10h-7z M4 8h3 M13 8h3',
  kinds: 'M4 4h5v5H4z M13 6.5a2.5 2.5 0 100 5 2.5 2.5 0 100-5z M6.5 12l2.5 4h-5z',
  collapse: 'M3 3h14v14H3z M7 7h6v6H7z',
  snapgrid: 'M3 7h14 M3 13h14 M7 3v14 M13 3v14',
  cycle: 'M5 10a5 5 0 018-4 M15 10a5 5 0 01-8 4 M13 3v3h-3 M7 17v-3h3',
  trophy: 'M6 4h8v3a4 4 0 01-8 0z M6 5H4v1a2 2 0 002 2 M14 5h2v1a2 2 0 01-2 2 M8 11h4 M10 11v3 M7 16h6',
  d2: 'M4 6h5v8H4z M11 10h5 M14 8l2 2-2 2',
  crop: 'M6 2v12h12 M2 6h12v12',
  matrix: 'M4 3h12v14H4z M4 7.5h12 M4 12.5h12 M9 3v14 M14 3v14',
  fitwidth: 'M3 5v10 M17 5v10 M6 10h8 M6 10l2-2 M6 10l2 2 M14 10l-2-2 M14 10l-2 2',
  communities: 'M6 5a2 2 0 100 4 2 2 0 100-4z M14 5a2 2 0 100 4 2 2 0 100-4z M10 12a2 2 0 100 4 2 2 0 100-4z M6 9v1 M14 9v1',
  gephi: 'M10 2l6 4v8l-6 4-6-4V6z M10 2v16 M4 6l12 8 M16 6L4 14',
  broker: 'M3 10h3 M14 10h3 M10 6l4 4-4 4-4-4z',
  alert: 'M10 3l7 13H3z M10 8v4 M10 14v.5',
  cells: 'M3 3h6v6H3z M11 3h6v6h-6z M3 11h6v6H3z M11 11h6v6h-6z',
  plus: 'M10 4v12 M4 10h12', chevron: 'M8 5l5 5-5 5', arrow: 'M4 10h12 M12 6l4 4-4 4',
  select: 'M5 2l11 9-6 1-3 6z', hand: 'M6 10V5c0-2 3-2 3 0v4-6c0-2 3-2 3 0v6-4c0-2 3-2 3 0v5-2c0-2 3-2 3 0v5c0 4-2 6-6 6H9l-6-7c-1-2 1-3 3-1z',
  connect: 'M4 5h4c5 0 0 10 5 10h3 M3 3h3v4H3z M15 13h3v4h-3z',
  swap: 'M3 7h11 M11 4l3 3-3 3 M17 13H6 M9 10l-3 3 3 3',
  fit: 'M3 7V3h4 M13 3h4v4 M17 13v4h-4 M7 17H3v-4',
  minus: 'M4 10h12', undo: 'M6 4L2 8l4 4 M3 8h9c6 0 6 9 0 9', redo: 'M14 4l4 4-4 4 M17 8H8c-6 0-6 9 0 9',
  moon: 'M16 12A7 7 0 018 3a7.5 7.5 0 108 9z', grid: 'M4 4h1 M10 4h1 M16 4h1 M4 10h1 M10 10h1 M16 10h1 M4 16h1 M10 16h1 M16 16h1',
  save: 'M3 3h12l2 2v12H3z M6 3v5h8V3 M6 17v-6h8v6',
  download: 'M10 2v10 M6 8l4 4 4-4 M3 13v4h14v-4', upload: 'M10 13V3 M6 7l4-4 4 4 M3 13v4h14v-4',
  trash: 'M3 5h14 M7 5V3h6v2 M5 5l1 13h8l1-13 M8 8v7 M12 8v7',
  layers: 'M10 2l8 4-8 4-8-4z M2 10l8 4 8-4 M2 14l8 4 8-4',
  eye: 'M1 10s3-5 9-5 9 5 9 5-3 5-9 5-9-5-9-5z M10 8a2 2 0 100 4 2 2 0 000-4z',
  compare: 'M10 2v16 M5 6L2 9l3 3 M15 6l3 3-3 3 M2 9h6 M12 9h6',
  route: 'M6 16a2 2 0 100-4 2 2 0 000 4z M14 8a2 2 0 100-4 2 2 0 000 4z M6 12c0-4 8 0 8-4',
  bolt: 'M11 2L4 11h4l-1 7 8-9h-4z',
  star: 'M10 2l2.3 4.8 5.2.6-3.9 3.5 1.1 5.1L10 13.8 5.2 16.6l1.1-5.1L2.4 8l5.3-.6z',
  branches: 'M5 3v14 M5 7h6a3 3 0 013 3v4 M14 11l-3 3 3 3 M5 3a1.5 1.5 0 100 3 1.5 1.5 0 000-3z',
  target: 'M10 2a8 8 0 100 16 8 8 0 000-16z M10 6a4 4 0 100 8 4 4 0 000-8z M10 9a1 1 0 100 2 1 1 0 000-2z',
  magnet: 'M5 4v6a5 5 0 0010 0V4 M5 4H2v6a8 8 0 0016 0V4h-3',
  wand: 'M4 16l8-8 M11 3l1 2.5L14.5 6.5 12 7.5 11 10 10 7.5 7.5 6.5 10 5.5z',
  code: 'M7 6l-4 4 4 4 M13 6l4 4-4 4',
  table: 'M3 4h14v12H3z M3 8h14 M3 12h14 M8 4v12',
  braces: 'M8 3C6 3 6 6 6 7s-1 1-2 1c1 0 2 0 2 1s0 5 2 5 M12 3c2 0 2 3 2 4s1 1 2 1c-1 0-2 0-2 1s0 5-2 5',
  network: 'M10 3a2 2 0 100 4 2 2 0 000-4z M4 15a2 2 0 100-4 2 2 0 000 4z M16 15a2 2 0 100-4 2 2 0 000 4z M10 7l-4 4 M10 7l4 4',
  shapes: 'M6 3l3 5H3z M13 4h4v4h-4z M13 13a2.5 2.5 0 100 5 2.5 2.5 0 000-5z',
  brackets: 'M7 3H4v14h3 M13 3h3v14h-3',
  hierarchy: 'M8 3h4v3H8z M3 14h4v3H3z M13 14h4v3h-4z M10 6v3 M5 14v-2h10v2 M10 9v3',
  atom: 'M10 8a2 2 0 100 4 2 2 0 000-4z M10 3c4 0 7 3 7 7s-3 7-7 7-7-3-7-7 M3 10c2-3 12-3 14 0',
  sun: 'M10 7a3 3 0 100 6 3 3 0 000-6z M10 2v2 M10 16v2 M2 10h2 M16 10h2 M4.5 4.5l1.5 1.5 M14 14l1.5 1.5 M15.5 4.5L14 6 M6 14l-1.5 1.5',
  tree: 'M8 3h4v3H8z M3 15h3v2H3z M8.5 15h3v2h-3z M14 15h3v2h-3z M10 6v4 M4.5 15v-2h11v2 M10 10v3',
  ruler: 'M3 7h14v6H3z M6 7v3 M9 7v2 M12 7v3 M15 7v2',
  group: 'M3 3h6v6H3z M11 11h6v6h-6z M9 7h2v2',
  doc: 'M5 3h7l3 3v11H5z M12 3v3h3 M7 10h6 M7 13h5',
  list: 'M4 5h1 M8 5h8 M4 10h1 M8 10h8 M4 15h1 M8 15h8',
  sigma: 'M14 4H5l5 6-5 6h9',
  image: 'M3 4h14v12H3z M7 9a1.5 1.5 0 100-3 1.5 1.5 0 000 3z M3 13l4-4 3 3 4-4 3 3',
  share: 'M14 3a2 2 0 100 4 2 2 0 000-4z M14 13a2 2 0 100 4 2 2 0 000-4z M6 8a2 2 0 100 4 2 2 0 000-4z M8 9l4-2 M8 11l4 2',
};
function icon(name: string, className = ''): string {
  return `<svg class="icon ${className}" viewBox="0 0 20 20" aria-hidden="true"><path d="${uiIcons[name] ?? nodeIcons[name as NodeType] ?? nodeIcons.generic}" /></svg>`;
}
function escape(text: string): string { return text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!)); }
const $ = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;

$('#app').innerHTML = `
  <header class="app-header">
    <div class="brand"><span class="brand-mark"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 4H8L3 12l5 8h8l5-8z M16 8h-6l-3 4 3 4h6"/></svg></span>kairo<span class="brand-dot">/</span><span class="brand-product">diagrams</span></div>
    <div class="breadcrumbs"><span>Workspace</span>${icon('chevron')}<span>Arquitectura</span></div>
    <div class="header-actions"><select id="theme-preset" class="route-control" title="Tema" aria-label="Tema">${themeNames.map(n => `<option value="${n}">${n}</option>`).join('')}</select><input type="color" id="accent" title="Color de acento" aria-label="Color de acento" value="#8474c1" /><button class="icon-button" id="theme" title="Cambiar tema" aria-label="Cambiar tema">${icon('moon')}</button><span class="divider"></span><span class="avatar">C</span></div>
  </header>
  <div class="app-body">
    <aside class="sidebar">
      <div class="sidebar-heading"><span>EXPLORADOR</span><span class="keycap">01</span></div>
      <div class="document-card"><span class="doc-thumb" id="doc-thumb"></span><div><strong>Sistema de acceso</strong><span>Diagrama de arquitectura</span></div><span class="active-dot"></span></div>
      <div class="section-heading">Biblioteca<span>${nodeTypes.length} tipos</span></div>
      <p class="sidebar-description">Arrastra una pieza al lienzo o pulsa para añadirla.</p>
      <div class="palette" aria-label="Biblioteca de nodos">${nodeTypes.map(type => `<button class="palette-item" data-add="${type}" title="Añadir ${nodeLabels[type]}"><span class="palette-icon">${icon(type)}</span><span>${nodeLabels[type]}</span>${icon('plus', 'add-icon')}</button>`).join('')}</div>
      <div class="sidebar-bottom"><span class="small-label">HECHO PARA CONECTAR</span><p>De una idea a un sistema.<br>Una conexión a la vez.</p><div class="version"><span class="status-dot"></span>Kairo <span>v0.1</span></div></div>
    </aside>
    <main class="workspace">
      <section class="document-header"><div><div class="eyebrow">ARQUITECTURA DE SOFTWARE</div><h1>Sistema de acceso</h1><p>Una vista compartida de cómo todo se conecta.</p></div><div class="document-actions"><button class="button" id="explore-examples">Explorar ejemplos</button><button class="button" id="open-workshop">Texto / vista previa</button><select id="example-select" aria-label="Ejemplo"><option value="architecture">Arquitectura</option><option value="decisions">Decisiones</option><option value="custom" disabled>Diagrama importado</option></select><select id="template-select" aria-label="Plantilla"><option value="">Plantilla…</option>${templateNames.map(n => `<option value="${n}">${n}</option>`).join('')}</select><button class="button" id="load" title="Cargar la última versión guardada">${icon('upload')}Abrir</button><button class="button primary" id="save">${icon('save')}Guardar</button></div></section>
      <div class="canvas-topbar"><div class="canvas-tab">${icon('layers')}Diagrama<span class="count" id="count">7</span></div><div class="canvas-options"><label class="route-control"><span>Conexiones</span><select id="route" aria-label="Estilo de conexiones"><option value="rounded">Redondeadas</option><option value="smooth">Suaves</option><option value="orthogonal">Ortogonales</option></select></label><input id="search" type="search" placeholder="Buscar nodos…" aria-label="Buscar nodos" /><span id="search-count" class="search-count"></span><button id="grid" class="icon-button active" title="Mostrar cuadrícula" aria-label="Mostrar cuadrícula" aria-pressed="true">${icon('grid')}</button><button id="readonly" class="icon-button" title="Solo lectura" aria-label="Solo lectura" aria-pressed="false">${icon('eye')}</button><button id="gridsnap" class="icon-button" title="Rejilla magnética" aria-label="Rejilla magnética" aria-pressed="false">${icon('magnet')}</button><div class="cd-menu"><button class="icon-button cd-menu-trigger" aria-haspopup="true" aria-expanded="false">Análisis${icon('chevron')}</button><div class="cd-menu-panel" role="menu"><button id="diff" class="icon-button" title="Resaltar cambios sin guardar" aria-label="Resaltar cambios">${icon('compare')}</button><button id="shortest-path" class="icon-button" title="Ruta más corta entre dos nodos seleccionados" aria-label="Ruta más corta">${icon('route')}</button><button id="critical-path" class="icon-button" title="Ruta crítica (camino más largo)" aria-label="Ruta crítica">${icon('bolt')}</button><button id="cpm" class="icon-button" title="Holguras y ruta crítica (CPM, método de ruta crítica)" aria-label="Holguras">${icon('bolt')}</button><button id="diameter" class="icon-button" title="Ruta más larga (diámetro)" aria-label="Diámetro">${icon('route')}</button><button id="key-nodes" class="icon-button" title="Resaltar nodos clave (más conectados)" aria-label="Nodos clave">${icon('star')}</button><button id="all-paths" class="icon-button" title="Todas las rutas entre dos nodos seleccionados" aria-label="Todas las rutas">${icon('branches')}</button><button id="k-paths" class="icon-button" title="Rutas alternativas: las k rutas más cortas entre dos nodos (redundancia/failover)" aria-label="Rutas alternativas">${icon('branches')}</button><button id="min-cut" class="icon-button" title="Corte mínimo entre dos nodos (caminos disjuntos / enlaces a cortar)" aria-label="Corte mínimo">${icon('alert')}</button><button id="neighborhood" class="icon-button" title="Resaltar el vecindario del nodo seleccionado" aria-label="Vecindario">${icon('target')}</button><button id="similar-nodes" class="icon-button" title="Nodos similares: mismo rol estructural (similitud de Jaccard de vecinos)" aria-label="Nodos similares">${icon('target')}</button><button id="simplify" class="icon-button" title="Quitar aristas redundantes (reducción transitiva)" aria-label="Simplificar">${icon('compare')}</button><button id="critical-elements" class="icon-button" title="Puntos críticos: nodos/enlaces únicos de fallo (SPOF)" aria-label="Puntos críticos">${icon('alert')}</button><button id="fragmentation" class="icon-button" title="Fragmentación: nodos cuyo fallo parte el grafo en más piezas" aria-label="Fragmentación">${icon('alert')}</button><button id="broker-nodes" class="icon-button" title="Brokers: nodos con más intermediación (betweenness)" aria-label="Brokers">${icon('broker')}</button><button id="influential-nodes" class="icon-button" title="Influyentes: importancia por PageRank" aria-label="Influyentes">${icon('trophy')}</button><button id="eigenvector" class="icon-button" title="Centralidad de autovector (influencia por conexiones a nodos influyentes)" aria-label="Autovector">${icon('trophy')}</button><button id="dense-core" class="icon-button" title="Núcleo denso (descomposición k-core)" aria-label="Núcleo denso">${icon('communities')}</button><button id="robust-cluster" class="icon-button" title="Núcleo robusto (mayor componente 2-arista-conexo: sobrevive a cortar cualquier enlace)" aria-label="Núcleo robusto">${icon('communities')}</button><button id="closeness" class="icon-button" title="Centralidad de cercanía (nodos que alcanzan al resto más rápido)" aria-label="Cercanía">${icon('target')}</button><button id="harmonic" class="icon-button" title="Centralidad armónica (robusta en grafos desconectados)" aria-label="Centralidad armónica">${icon('target')}</button><button id="coefficients" class="icon-button" title="Coeficientes del grafo (reciprocidad y transitividad)" aria-label="Coeficientes">${icon('list')}</button><button id="fingerprint" class="icon-button" title="Huella estructural (hash estable del grafo)" aria-label="Huella">${icon('list')}</button><button id="modularity" class="icon-button" title="Modularidad de las comunidades detectadas (calidad del agrupamiento)" aria-label="Modularidad">${icon('communities')}</button><button id="graph-center" class="icon-button" title="Centro del grafo (nodos de menor excentricidad)" aria-label="Centro del grafo">${icon('target')}</button><button id="endpoints" class="icon-button" title="Entradas y salidas (fuentes/sumideros/aislados)" aria-label="Entradas y salidas">${icon('target')}</button><button id="find-cycle" class="icon-button" title="Detectar un ciclo" aria-label="Ciclos">${icon('cycle')}</button><button id="all-cycles" class="icon-button" title="Todos los bucles de retroalimentación (ciclos simples)" aria-label="Bucles">${icon('cycle')}</button><button id="eulerian" class="icon-button" title="Ruta euleriana (recorre cada conexión una vez)" aria-label="Ruta euleriana">${icon('route')}</button><button id="feedback-edges" class="icon-button" title="Aristas de retroalimentación (rompen los ciclos)" aria-label="Aristas de retroalimentación">${icon('cycle')}</button><button id="impact" class="icon-button" title="Impacto: nodos afectados aguas abajo del seleccionado" aria-label="Impacto">${icon('impact')}</button><button id="dominators" class="icon-button" title="Dominadores: pasos inevitables para llegar al nodo seleccionado" aria-label="Dominadores">${icon('route')}</button><button id="layout-metrics" class="icon-button" title="Métricas de layout (cruces, solapamientos, compacidad)" aria-label="Métricas de layout">${icon('ruler')}</button><button id="complexity" class="icon-button" title="Complejidad ciclomática (McCabe)" aria-label="Complejidad">${icon('bolt')}</button><button id="graph-props" class="icon-button" title="Propiedades del grafo (DAG, árbol, bipartito, conexo, densidad)" aria-label="Propiedades del grafo">${icon('list')}</button><button id="suggest-links" class="icon-button" title="Sugerir conexiones probables (predicción de enlaces, Adamic-Adar)" aria-label="Sugerir conexiones">${icon('plus')}</button></div></div><div class="cd-menu"><button class="icon-button cd-menu-trigger" aria-haspopup="true" aria-expanded="false">Layout${icon('chevron')}</button><div class="cd-menu-panel" role="menu"><button id="auto-layout" class="icon-button" title="Reorganizar (jerárquico)" aria-label="Reorganizar">${icon('hierarchy')}</button><button id="best-layout" class="icon-button" title="Auto-layout óptimo (prueba varios y elige el más limpio)" aria-label="Auto-layout óptimo">${icon('wand')}</button><button id="reduce-crossings" class="icon-button" title="Reducir cruces (layout jerárquico barycenter)" aria-label="Reducir cruces">${icon('route')}</button><button id="organic-layout" class="icon-button" title="Layout orgánico (fuerzas)" aria-label="Layout orgánico">${icon('atom')}</button><button id="radial-layout" class="icon-button" title="Layout radial (anillos)" aria-label="Layout radial">${icon('sun')}</button><button id="mindmap-layout" class="icon-button" title="Layout de mapa mental (raíz al centro, ramas a los lados)" aria-label="Layout mapa mental">${icon('branches')}</button><button id="tree-layout" class="icon-button" title="Layout de árbol (jerarquía)" aria-label="Layout árbol">${icon('tree')}</button><button id="circular-layout" class="icon-button" title="Layout circular (anillo)" aria-label="Layout circular">${icon('ring')}</button><button id="arc-layout" class="icon-button" title="Layout en línea (nodos en una base, orden topológico)" aria-label="Layout en línea">${icon('route')}</button><button id="grid-layout" class="icon-button" title="Layout en cuadrícula" aria-label="Layout cuadrícula">${icon('cells')}</button><button id="cluster-layout" class="icon-button" title="Layout por grupos (clústeres)" aria-label="Layout por grupos">${icon('clusters')}</button><button id="fit-sizes" class="icon-button" title="Ajustar tamaño de nodos al texto" aria-label="Ajustar tamaño al texto">${icon('fitwidth')}</button><button id="snap-grid" class="icon-button" title="Alinear nodos a la cuadrícula" aria-label="Alinear a cuadrícula">${icon('snapgrid')}</button><button id="resolve-overlaps" class="icon-button" title="Separar nodos solapados" aria-label="Separar solapamientos">${icon('ruler')}</button><button id="auto-group" class="icon-button" title="Auto-agrupar por componente conexo" aria-label="Auto-agrupar">${icon('group')}</button><button id="group-by-type" class="icon-button" title="Agrupar por tipo de nodo" aria-label="Agrupar por tipo">${icon('kinds')}</button><button id="community-group" class="icon-button" title="Agrupar por comunidad (clústeres densos)" aria-label="Agrupar por comunidad">${icon('communities')}</button><button id="collapse-groups" class="icon-button" title="Colapsar grupos en una vista de alto nivel" aria-label="Colapsar grupos">${icon('collapse')}</button><button id="condense" class="icon-button" title="Condensar ciclos (colapsa componentes fuertemente conexos en un DAG)" aria-label="Condensar ciclos">${icon('cycle')}</button><button id="contract-chains" class="icon-button" title="Contraer cadenas (quita nodos de paso, deja el esqueleto)" aria-label="Contraer cadenas">${icon('route')}</button><button id="flip-h" class="icon-button" title="Reflejar horizontalmente" aria-label="Reflejar horizontal">${icon('crop')}</button><button id="rotate" class="icon-button" title="Rotar 90° (reorientar)" aria-label="Rotar 90 grados">${icon('sun')}</button><button id="spread" class="icon-button" title="Espaciar nodos (aumentar separación)" aria-label="Espaciar nodos">${icon('ruler')}</button><button id="isolate" class="icon-button" title="Aislar la selección (extraer subdiagrama)" aria-label="Aislar selección">${icon('crop')}</button><button id="merge-nodes" class="icon-button" title="Fusionar los nodos seleccionados en uno" aria-label="Fusionar nodos">${icon('group')}</button><button id="merge-duplicates" class="icon-button" title="Fusionar nodos con el mismo título" aria-label="Fusionar duplicados">${icon('group')}</button><button id="dedupe-edges" class="icon-button" title="Quitar aristas duplicadas (conexiones paralelas repetidas)" aria-label="Quitar aristas duplicadas">${icon('compare')}</button><button id="pack-components" class="icon-button" title="Compactar componentes (junta las partes desconectadas)" aria-label="Compactar componentes">${icon('crop')}</button><button id="spanning-tree" class="icon-button" title="Árbol de expansión (reduce al esqueleto, quita ciclos)" aria-label="Árbol de expansión">${icon('tree')}</button><button id="trim-leaves" class="icon-button" title="Podar hojas (quita nodos de grado 1, deja el núcleo)" aria-label="Podar hojas">${icon('crop')}</button><button id="split-edge" class="icon-button" title="Insertar un nodo en la conexión seleccionada" aria-label="Insertar nodo en arista">${icon('plus')}</button><button id="bypass-node" class="icon-button" title="Omitir el nodo seleccionado reconectando su flujo" aria-label="Omitir nodo">${icon('route')}</button><button id="add-stable" class="icon-button" title="Añadir un nodo sin reorganizar el resto (layout estable)" aria-label="Añadir nodo estable">${icon('plus')}</button></div></div><div class="cd-menu"><button class="icon-button cd-menu-trigger" aria-haspopup="true" aria-expanded="false">Importar${icon('chevron')}</button><div class="cd-menu-panel" role="menu"><button id="import-auto" class="icon-button" title="Importar (detectar formato)" aria-label="Importar auto">${icon('wand')}</button><button id="open-file" class="icon-button" title="Abrir archivo (cualquier formato)" aria-label="Abrir archivo">${icon('upload')}</button><button id="import-text" class="icon-button" title="Importar texto (Mermaid)" aria-label="Importar texto">${icon('code')}</button><button id="import-dot" class="icon-button" title="Importar DOT (Graphviz)" aria-label="Importar DOT">${icon('share')}</button><button id="import-gvjson" class="icon-button" title="Importar Graphviz JSON (dot -Tjson, con posiciones)" aria-label="Importar Graphviz JSON">${icon('share')}</button><button id="import-csv" class="icon-button" title="Importar CSV (lista de aristas)" aria-label="Importar CSV">${icon('table')}</button><button id="import-graphml" class="icon-button" title="Importar GraphML (yEd/Gephi)" aria-label="Importar GraphML">${icon('network')}</button><button id="import-gexf" class="icon-button" title="Importar GEXF (Gephi/NetworkX)" aria-label="Importar GEXF">${icon('gephi')}</button><button id="import-gml" class="icon-button" title="Importar GML (NetworkX/igraph/Gephi/yEd)" aria-label="Importar GML">${icon('network')}</button><button id="import-pajek" class="icon-button" title="Importar Pajek (.net, NetworkX/igraph/Gephi)" aria-label="Importar Pajek">${icon('gephi')}</button><button id="import-structurizr" class="icon-button" title="Importar Structurizr DSL (C4)" aria-label="Importar Structurizr">${icon('brackets')}</button><button id="import-drawio" class="icon-button" title="Importar draw.io (mxGraph)" aria-label="Importar draw.io">${icon('shapes')}</button><button id="import-puml" class="icon-button" title="Importar PlantUML" aria-label="Importar PlantUML">${icon('brackets')}</button><button id="import-puml-mindmap" class="icon-button" title="Importar PlantUML mindmap (@startmindmap)" aria-label="Importar mindmap PlantUML">${icon('branches')}</button><button id="import-d2" class="icon-button" title="Importar D2 (Terrastruct)" aria-label="Importar D2">${icon('d2')}</button><button id="import-nomnoml" class="icon-button" title="Importar nomnoml" aria-label="Importar nomnoml">${icon('brackets')}</button><button id="import-tgf" class="icon-button" title="Importar TGF (yEd)" aria-label="Importar TGF">${icon('network')}</button><button id="import-dgml" class="icon-button" title="Importar DGML (Visual Studio)" aria-label="Importar DGML">${icon('network')}</button><button id="import-cy" class="icon-button" title="Importar Cytoscape JSON" aria-label="Importar Cytoscape">${icon('atom')}</button><button id="import-visjs" class="icon-button" title="Importar vis-network (vis.js)" aria-label="Importar vis-network">${icon('network')}</button><button id="import-nodelink" class="icon-button" title="Importar node-link JSON (NetworkX/D3)" aria-label="Importar node-link">${icon('network')}</button><button id="import-graphology" class="icon-button" title="Importar graphology (Sigma.js)" aria-label="Importar graphology">${icon('atom')}</button><button id="import-elk" class="icon-button" title="Importar ELK JSON (Eclipse Layout Kernel / Mermaid ELK)" aria-label="Importar ELK">${icon('network')}</button><button id="import-jgf" class="icon-button" title="Importar JGF (JSON Graph Format)" aria-label="Importar JGF">${icon('braces')}</button><button id="import-opml" class="icon-button" title="Importar OPML (OmniOutliner/WorkFlowy/Dynalist)" aria-label="Importar OPML">${icon('outline')}</button><button id="import-bpmn" class="icon-button" title="Importar BPMN 2.0 (Camunda/bpmn.io)" aria-label="Importar BPMN">${icon('shapes')}</button><button id="import-gantt" class="icon-button" title="Importar Mermaid gantt (plan de proyecto con after)" aria-label="Importar Gantt">${icon('bolt')}</button><button id="import-sankey" class="icon-button" title="Importar Mermaid sankey-beta (flujo ponderado)" aria-label="Importar Sankey">${icon('route')}</button><button id="import-arch" class="icon-button" title="Importar Mermaid architecture-beta (nube/servicios con grupos)" aria-label="Importar Mermaid arquitectura">${icon('network')}</button><button id="import-block" class="icon-button" title="Importar Mermaid block-beta (bloques en cuadrícula)" aria-label="Importar Mermaid bloques">${icon('cells')}</button><button id="import-jsontree" class="icon-button" title="Importar JSON jerárquico (árbol)" aria-label="Importar JSON árbol">${icon('tree')}</button><button id="import-parentlist" class="icon-button" title="Importar lista de padres ([{id, parentId, label}], org charts/SQL)" aria-label="Importar lista de padres">${icon('tree')}</button><button id="import-graphql" class="icon-button" title="Importar GraphQL SDL (tipos y sus relaciones)" aria-label="Importar GraphQL">${icon('brackets')}</button><button id="import-jsonschema" class="icon-button" title="Importar JSON Schema ($defs y referencias $ref)" aria-label="Importar JSON Schema">${icon('braces')}</button><button id="import-outline" class="icon-button" title="Importar esquema (texto indentado)" aria-label="Importar esquema">${icon('outline')}</button><button id="insert-decision" class="icon-button" title="Insertar plantilla de decisión junto al diagrama" aria-label="Insertar decisión">${icon('plus')}</button><button id="gen-grid" class="icon-button" title="Generar una cuadrícula 4×3" aria-label="Generar cuadrícula">${icon('cells')}</button></div></div><div class="cd-menu"><button class="icon-button cd-menu-trigger" aria-haspopup="true" aria-expanded="false">Exportar${icon('chevron')}</button><div class="cd-menu-panel" role="menu"><button id="export" class="icon-button" title="Exportar JSON" aria-label="Exportar JSON">${icon('download')}</button><button id="export-svg" class="icon-button" title="Exportar SVG" aria-label="Exportar SVG">${icon('image')}</button><button id="export-svg-editable" class="icon-button" title="Exportar SVG editable (reimportable)" aria-label="SVG editable">${icon('image')}</button><button id="export-selection" class="icon-button" title="Exportar la selección como SVG" aria-label="Exportar selección SVG">${icon('crop')}</button><button id="export-png" class="icon-button" title="Exportar PNG" aria-label="Exportar PNG">${icon('image')}</button><button id="export-text" class="icon-button" title="Exportar texto (Mermaid)" aria-label="Exportar texto">${icon('code')}</button><button id="export-text-styled" class="icon-button" title="Exportar Mermaid con estilo (colores por tipo)" aria-label="Exportar Mermaid con estilo">${icon('code')}</button><button id="export-dot" class="icon-button" title="Exportar DOT (Graphviz)" aria-label="Exportar DOT">${icon('share')}</button><button id="export-dot-pos" class="icon-button" title="Exportar DOT con posiciones (Graphviz neato -n)" aria-label="DOT posicionado">${icon('share')}</button><button id="export-canvas" class="icon-button" title="Exportar JSON Canvas" aria-label="Exportar Canvas">${icon('braces')}</button><button id="export-html" class="icon-button" title="Exportar HTML interactivo" aria-label="Exportar HTML">${icon('external')}</button><button id="export-excalidraw" class="icon-button" title="Exportar Excalidraw" aria-label="Exportar Excalidraw">${icon('shapes')}</button><button id="export-csv" class="icon-button" title="Exportar CSV (lista de aristas)" aria-label="Exportar CSV">${icon('table')}</button><button id="export-matrix" class="icon-button" title="Exportar matriz de adyacencia (CSV)" aria-label="Exportar matriz">${icon('matrix')}</button><button id="export-reach-matrix" class="icon-button" title="Exportar matriz de alcance (CSV, quién alcanza a quién)" aria-label="Matriz de alcance">${icon('matrix')}</button><button id="export-csv-nodes" class="icon-button" title="Exportar inventario de nodos (CSV)" aria-label="Exportar nodos CSV">${icon('table')}</button><button id="export-graphml" class="icon-button" title="Exportar GraphML (yEd/Gephi)" aria-label="Exportar GraphML">${icon('network')}</button><button id="export-gexf" class="icon-button" title="Exportar GEXF (Gephi/NetworkX)" aria-label="Exportar GEXF">${icon('gephi')}</button><button id="export-gml" class="icon-button" title="Exportar GML (NetworkX/igraph/Gephi/yEd)" aria-label="Exportar GML">${icon('network')}</button><button id="export-pajek" class="icon-button" title="Exportar Pajek (.net, NetworkX/igraph/Gephi)" aria-label="Exportar Pajek">${icon('gephi')}</button><button id="export-drawio" class="icon-button" title="Exportar draw.io (mxGraph)" aria-label="Exportar draw.io">${icon('shapes')}</button><button id="export-puml" class="icon-button" title="Exportar PlantUML" aria-label="Exportar PlantUML">${icon('brackets')}</button><button id="export-puml-mindmap" class="icon-button" title="Exportar PlantUML mindmap (jerarquía en @startmindmap)" aria-label="PlantUML mindmap">${icon('branches')}</button><button id="export-d2" class="icon-button" title="Exportar D2 (Terrastruct)" aria-label="Exportar D2">${icon('d2')}</button><button id="export-nomnoml" class="icon-button" title="Exportar nomnoml" aria-label="Exportar nomnoml">${icon('brackets')}</button><button id="export-tgf" class="icon-button" title="Exportar TGF (yEd)" aria-label="Exportar TGF">${icon('network')}</button><button id="export-dgml" class="icon-button" title="Exportar DGML (Visual Studio)" aria-label="Exportar DGML">${icon('network')}</button><button id="export-structurizr" class="icon-button" title="Exportar Structurizr DSL (C4)" aria-label="Exportar Structurizr">${icon('brackets')}</button><button id="export-c4" class="icon-button" title="Exportar Mermaid C4 (C4Context)" aria-label="Exportar Mermaid C4">${icon('code')}</button><button id="export-arch" class="icon-button" title="Exportar Mermaid architecture-beta (nube/servicios con grupos)" aria-label="Exportar Mermaid arquitectura">${icon('network')}</button><button id="export-block" class="icon-button" title="Exportar Mermaid block-beta (bloques en cuadrícula)" aria-label="Exportar Mermaid bloques">${icon('cells')}</button><button id="export-cy" class="icon-button" title="Exportar Cytoscape JSON" aria-label="Exportar Cytoscape">${icon('atom')}</button><button id="export-visjs" class="icon-button" title="Exportar vis-network (vis.js)" aria-label="Exportar vis-network">${icon('network')}</button><button id="export-nodelink" class="icon-button" title="Exportar node-link JSON (NetworkX/D3)" aria-label="Exportar node-link">${icon('network')}</button><button id="export-graphology" class="icon-button" title="Exportar graphology (Sigma.js)" aria-label="Exportar graphology">${icon('atom')}</button><button id="export-hierarchy" class="icon-button" title="Exportar jerarquía JSON (d3.hierarchy: tree/treemap/sunburst)" aria-label="Exportar jerarquía">${icon('tree')}</button><button id="export-elk" class="icon-button" title="Exportar ELK JSON (Eclipse Layout Kernel / Mermaid ELK)" aria-label="Exportar ELK">${icon('network')}</button><button id="export-jgf" class="icon-button" title="Exportar JGF (JSON Graph Format)" aria-label="Exportar JGF">${icon('braces')}</button><button id="export-opml" class="icon-button" title="Exportar OPML (OmniOutliner/WorkFlowy/Dynalist)" aria-label="Exportar OPML">${icon('outline')}</button><button id="export-bpmn" class="icon-button" title="Exportar BPMN 2.0 (Camunda/bpmn.io, con layout)" aria-label="Exportar BPMN">${icon('shapes')}</button><button id="export-markdown" class="icon-button" title="Exportar Markdown (Mermaid + resumen)" aria-label="Exportar Markdown">${icon('doc')}</button><button id="export-md-tables" class="icon-button" title="Exportar tablas Markdown (nodos + conexiones)" aria-label="Exportar tablas Markdown">${icon('table')}</button><button id="export-legend" class="icon-button" title="Exportar leyenda de tipos (SVG)" aria-label="Exportar leyenda">${icon('list')}</button><button id="export-category" class="icon-button" title="Exportar SVG coloreado por grupo" aria-label="SVG por categoría">${icon('communities')}</button><button id="export-treemap" class="icon-button" title="Exportar treemap (jerarquía por tamaño de subárbol)" aria-label="Exportar treemap">${icon('cells')}</button><button id="export-matrix-svg" class="icon-button" title="Exportar matriz de adyacencia como SVG (vista de rejilla)" aria-label="Matriz SVG">${icon('matrix')}</button><button id="export-arc" class="icon-button" title="Exportar diagrama de arcos (nodos en línea, aristas como arcos)" aria-label="Exportar arcos">${icon('route')}</button><button id="export-chord" class="icon-button" title="Exportar diagrama de cuerdas (nodos en círculo, aristas curvadas al centro)" aria-label="Exportar cuerdas">${icon('ring')}</button><button id="export-sunburst" class="icon-button" title="Exportar sunburst (jerarquía en anillos concéntricos)" aria-label="Exportar sunburst">${icon('sun')}</button><button id="export-icicle" class="icon-button" title="Exportar icicle (jerarquía en bandas por profundidad)" aria-label="Exportar icicle">${icon('cells')}</button><button id="export-sankey-svg" class="icon-button" title="Exportar Sankey SVG (flujo por capas, renderizado)" aria-label="Exportar Sankey SVG">${icon('route')}</button><button id="export-report" class="icon-button" title="Exportar informe (Markdown)" aria-label="Exportar informe">${icon('doc')}</button><button id="export-stats-card" class="icon-button" title="Exportar tarjeta de métricas (SVG infográfico)" aria-label="Exportar tarjeta de métricas">${icon('ruler')}</button><button id="export-report-page" class="icon-button" title="Exportar página de informe (HTML autocontenido)" aria-label="Exportar página de informe">${icon('doc')}</button><button id="export-procedure" class="icon-button" title="Exportar procedimiento paso a paso (Markdown)" aria-label="Exportar procedimiento">${icon('list')}</button><button id="export-gantt" class="icon-button" title="Exportar Gantt (Mermaid, cronograma por CPM)" aria-label="Exportar Gantt">${icon('bolt')}</button><button id="export-schedule-csv" class="icon-button" title="Exportar cronograma CSV (CPM: para Excel/Sheets)" aria-label="Exportar cronograma CSV">${icon('table')}</button><button id="export-pie" class="icon-button" title="Exportar Pie (Mermaid, composición por tipo)" aria-label="Exportar Pie">${icon('communities')}</button><button id="export-quadrant" class="icon-button" title="Exportar cuadrante de roles (Mermaid quadrantChart: alcance vs demanda)" aria-label="Exportar cuadrante">${icon('target')}</button><button id="export-sankey" class="icon-button" title="Exportar Sankey (Mermaid sankey-beta: flujo por arista)" aria-label="Exportar Sankey">${icon('route')}</button><button id="export-timeline" class="icon-button" title="Exportar línea de tiempo (Mermaid timeline: pasos por generación topológica)" aria-label="Exportar línea de tiempo">${icon('bolt')}</button><button id="export-readme" class="icon-button" title="Exportar README completo (Markdown)" aria-label="Exportar README">${icon('doc')}</button><button id="export-tikz" class="icon-button" title="Exportar TikZ (LaTeX)" aria-label="Exportar TikZ">${icon('sigma')}</button><button id="export-typst" class="icon-button" title="Exportar Typst (CeTZ)" aria-label="Exportar Typst">${icon('sigma')}</button><button id="export-ascii" class="icon-button" title="Exportar ASCII (texto monoespaciado)" aria-label="Exportar ASCII">${icon('terminal')}</button><button id="share-link" class="icon-button" title="Copiar enlace para compartir" aria-label="Copiar enlace">${icon('external')}</button><button id="export-ink" class="icon-button" title="Copiar imagen mermaid.ink (Markdown)" aria-label="Copiar imagen mermaid.ink">${icon('image')}</button><button id="export-kroki" class="icon-button" title="Copiar imagen Kroki (Markdown)" aria-label="Copiar imagen Kroki">${icon('image')}</button><button id="export-mermaidlive" class="icon-button" title="Copiar enlace a mermaid.live (editor)" aria-label="Editor mermaid.live">${icon('external')}</button></div></div></div></div>
      <div class="stage"><div id="diagram"></div><div class="canvas-caption"><span class="caption-dot"></span><span id="viewport-caption">VISTA DEL SISTEMA</span></div><div class="minimap-host" id="minimap"></div>
        <div class="floating-toolbar" aria-label="Herramientas del diagrama"><div class="tool-group">${(['select', 'pan', 'connect'] as Tool[]).map((tool, i) => `<button class="icon-button ${i === 0 ? 'active' : ''}" data-tool="${tool}" aria-label="${['Seleccionar', 'Desplazar', 'Conectar'][i]}" title="${['Seleccionar (V)', 'Desplazar (H)', 'Conectar (C)'][i]}" aria-pressed="${i === 0}">${icon(['select', 'hand', 'connect'][i])}</button>`).join('')}</div><span class="divider"></span><button class="icon-button" id="zoom-out" title="Alejar" aria-label="Alejar">${icon('minus')}</button><button id="zoom-value" class="zoom-value" title="Restablecer zoom">100%</button><button class="icon-button" id="zoom-in" title="Acercar" aria-label="Acercar">${icon('plus')}</button><span class="divider"></span><button class="icon-button" id="fit" title="Ajustar a la vista" aria-label="Ajustar a la vista">${icon('fit')}</button><span class="divider"></span><button class="icon-button" id="play" title="Reproducir ruta" aria-label="Reproducir ruta">${icon('arrow')}</button></div>
        <div class="history-tools"><button class="icon-button" id="undo" title="Deshacer (⌘ Z)" aria-label="Deshacer">${icon('undo')}</button><button class="icon-button" id="redo" title="Rehacer (⇧ ⌘ Z)" aria-label="Rehacer">${icon('redo')}</button></div>
      </div>
      <details id="flow-diagnostics" class="flow-diagnostics" hidden><summary id="flow-summary"></summary><div id="flow-issues" aria-live="polite"></div></details><footer class="statusbar"><span id="stats">7 nodos <span>·</span> 6 conexiones</span><span class="interaction-hint"><kbd>Espacio</kbd> para desplazar <span>·</span> <kbd>⌘</kbd> + rueda para zoom</span><span id="save-status"><span class="status-dot"></span>Listo</span></footer>
    </main>
    <aside class="inspector"><div class="inspector-heading">Inspector<span class="keycap">Detalles</span></div><div id="inspector-content"></div><div class="inspector-note">Un buen sistema empieza<br>con conexiones claras.<span>KAIRO / DIAGRAMS</span></div></aside>
  </div><div class="toast" id="toast" role="status" aria-live="polite"></div><div id="sr-status" class="sr-only" aria-live="polite"></div>
  <div class="palette-overlay" id="palette" hidden><div class="palette-box" role="dialog" aria-label="Paleta de comandos"><input id="palette-input" type="text" placeholder="Buscar una acción…" aria-label="Buscar acción" autocomplete="off" /><ul id="palette-list" role="listbox"></ul></div></div>
  <div class="ctx-menu" id="ctxmenu" role="menu" hidden></div>
  <input type="file" id="file-input" hidden accept=".mmd,.mermaid,.dot,.gv,.json,.canvas,.csv,.tsv,.graphml,.gexf,.drawio,.puml,.plantuml,.cyjs,.d2,.outline,.txt,.md,.markdown,.excalidraw,.png" />`;

/** Editing rules per notation family. The document carries `profile`; older documents without it are detected by node types. */
const profiles: Record<'architecture' | 'flow', ConnectionPolicy> = { architecture: { allowSelfLoops: true }, flow: { allowMultipleEdges: true } };
const flowTypes = ['start', 'process', 'decision', 'end'];
function profileOf(document: DiagramDocument): 'architecture' | 'flow' {
  if (document.profile) return document.profile === 'flow' ? 'flow' : 'architecture';
  return document.graph.nodes.some(n => flowTypes.includes(n.type)) ? 'flow' : 'architecture';
}
function exampleValue(document: DiagramDocument): 'architecture' | 'decisions' | 'custom' {
  if (document.profile && !['architecture', 'flow'].includes(document.profile)) return 'custom';
  return profileOf(document) === 'flow' ? 'decisions' : 'architecture';
}
const issueMessages: Record<ConnectionIssue, string> = {
  'missing-node': 'El nodo indicado ya no existe.', 'missing-edge': 'La conexión ya no existe.',
  'self-loop': 'Este perfil no permite conectar un nodo consigo mismo.', duplicate: 'Ya existe una conexión en esa dirección entre estos nodos.',
  cycle: 'Este perfil no permite ciclos.', rejected: 'La aplicación no permite esta conexión.',
};
const portLabels: Record<Port, string> = { top: 'Arriba', right: 'Derecha', bottom: 'Abajo', left: 'Izquierda' };
let dark = matchMedia('(prefers-color-scheme: dark)').matches;
let activeTheme = dark ? darkTheme : lightTheme;
let activeProfile: 'architecture' | 'flow' = 'architecture';
let grid = true, documentRevision = 0, savedRevision = 0, saving = false;
let promptInvoker: HTMLElement | null = null;
document.addEventListener('click', event => {
  const button = event.target instanceof Element ? event.target.closest<HTMLElement>('button') : null;
  if (button) promptInvoker = button.closest('.cd-menu')?.querySelector<HTMLElement>('.cd-menu-trigger') ?? button;
}, true);
async function promptForText(message: string, initial = ''): Promise<string | null> {
  if (editor.isReadOnly()) return null;
  const revision = documentRevision;
  const text = await textPrompt(message, initial, promptInvoker);
  if (text !== null && (editor.isReadOnly() || documentRevision !== revision)) {
    toast('El diagrama cambió mientras se escribía el texto. Intenta de nuevo.');
    return null;
  }
  return text;
}
let savedSnapshot: DiagramDocument = sampleDocument();
let toastTimer = 0;
// Declared before createDiagram: the editor fires onViewportChange during construction, which reads
// `minimap`. A `let` declared after would be in the temporal dead zone and throw, aborting setup.
let minimap: MinimapController | null = null;
let studio: ReturnType<typeof createStudio> | undefined;
let recovery: ReturnType<typeof installRecovery> | undefined;
let updateAccess = () => {};
const editor = createDiagram($('#diagram'), {
  document: sampleDocument(),
  onNodeRender: wrapNodeLabels,
  connections: profiles.architecture,
  theme: activeTheme,
  onChange: document => { recovery?.changed(document, documentRevision + 1); documentRevision++; updateStats(); updateSaveStatus(); renderInspector(editor.getSelection()); syncDocumentPresentation(); updateThumb(); minimap?.update(); studio?.update(); updateAccess(); },
  onSelectionChange: selection => { renderInspector(selection); announceSelection(selection); },
  onViewportChange: viewport => { $('#zoom-value').textContent = `${Math.round(viewport.zoom * 100)}%`; minimap?.update(); },
  onHistoryChange: history => { $<HTMLButtonElement>('#undo').disabled = !history.canUndo; $<HTMLButtonElement>('#redo').disabled = !history.canRedo; },
});
document.documentElement.dataset.theme = dark ? 'dark' : 'light';
const minimapPreferenceKey = 'kairo-minimap-collapsed';
let minimapCollapsed = matchMedia('(max-width: 1180px), (max-height: 760px)').matches;
try {
  const preference = localStorage.getItem(minimapPreferenceKey);
  if (preference === 'true' || preference === 'false') minimapCollapsed = preference === 'true';
} catch { /* The view still works when storage is unavailable. */ }
minimap = createMinimap(editor, $('#minimap'), {
  collapsible: true, collapsed: minimapCollapsed,
  showLabel: 'Mostrar minimapa', hideLabel: 'Ocultar minimapa',
  onCollapsedChange: value => { try { localStorage.setItem(minimapPreferenceKey, String(value)); } catch { /* Session-only preference. */ } },
});
requestAnimationFrame(() => { editor.fit(70); editor.select({ kind: 'node', id: 'auth' }); syncDocumentPresentation(); updateThumb(); savedSnapshot = editor.getDocument(); });

function toast(message: string): void { clearTimeout(toastTimer); $('#toast').textContent = message; $('#toast').classList.add('visible'); toastTimer = window.setTimeout(() => $('#toast').classList.remove('visible'), 3200); }
function updateThumb(): void { $('#doc-thumb').innerHTML = toThumbnail(editor.getDocument(), { width: 44, height: 30, theme: activeTheme }); }
function updateStats(): void {
  const { nodes, edges } = editor.getDocument().graph;
  $('#count').textContent = String(nodes.length);
  $('#stats').textContent = `${nodes.length} nodos · ${edges.length} conexiones`;
}
function updateFlowDiagnostics(): void {
  const document = editor.getDocument(), graph = document.graph;
  const flow = profileOf(document) === 'flow';
  $('#flow-diagnostics').hidden = !flow;
  if (!flow) return;
  const diagnostics = validateFlow(graph);
  const errors = diagnostics.filter(d => d.severity === 'error').length;
  $('#flow-summary').textContent = diagnostics.length ? `Validación: ${errors} errores · ${diagnostics.length - errors} avisos` : 'Estructura del flujo válida';
  $('#flow-issues').replaceChildren();
  for (const diagnostic of diagnostics) {
    const item = window.document.createElement('button');
    item.className = 'flow-issue';
    const id = diagnostic.edgeId ?? diagnostic.nodeId;
    item.textContent = `${diagnostic.severity === 'error' ? 'Error' : 'Aviso'}${id ? ` · ${id}` : ''}: ${diagnostic.message}`;
    item.disabled = !id;
    item.onclick = () => editor.select({ kind: diagnostic.edgeId ? 'edge' : 'node', id: id! });
    $('#flow-issues').append(item);
  }
}
function syncDocumentPresentation(): void {
  const document = editor.getDocument();
  const profile = profileOf(document), flow = profile === 'flow';
  const mindmap = document.profile === 'mindmap', hierarchy = document.profile === 'hierarchy', custom = exampleValue(document) === 'custom';
  if (profile !== activeProfile) { editor.setConnectionPolicy(profiles[profile]); activeProfile = profile; }
  $<HTMLSelectElement>('#example-select').value = exampleValue(document);
  $('.eyebrow').textContent = mindmap ? 'MAPA MENTAL' : hierarchy ? 'JERARQUÍA' : custom ? 'DIAGRAMA IMPORTADO' : flow ? 'FLUJOS Y DECISIONES' : 'ARQUITECTURA DE SOFTWARE';
  $('.breadcrumbs span:last-child').textContent = mindmap ? 'Mapas mentales' : hierarchy ? 'Jerarquías' : custom ? 'Importados' : flow ? 'Flujos' : 'Arquitectura';
  $('.document-card > div > span').textContent = mindmap ? 'Mapa mental' : hierarchy ? 'Diagrama jerárquico' : custom ? 'Diagrama importado' : flow ? 'Diagrama de flujo' : 'Diagrama de arquitectura';
  $('h1').textContent = mindmap ? 'Mapa mental' : hierarchy ? 'Jerarquía' : custom ? 'Diagrama importado' : flow ? 'Decisión de acceso' : 'Sistema de acceso';
  $('.document-card strong').textContent = $('h1').textContent;
  $('.document-header p').textContent = mindmap ? 'Ideas conectadas por ramas.' : hierarchy ? 'Elementos organizados por niveles.' : custom ? 'Diagrama cargado para explorar y editar.' : 'Una vista compartida de cómo todo se conecta.';
  $('#viewport-caption').textContent = mindmap ? 'MAPA DE IDEAS' : hierarchy ? 'VISTA JERÁRQUICA' : custom ? 'VISTA DEL DIAGRAMA' : flow ? 'VISTA DEL FLUJO' : 'VISTA DEL SISTEMA';
  updateFlowDiagnostics();
}
function updateSaveStatus(): void { $('#save-status').innerHTML = `<span class="status-dot ${documentRevision !== savedRevision ? 'unsaved' : ''}"></span>${documentRevision !== savedRevision ? 'Sin guardar' : 'Guardado'}`; }
function renderMultiInspector(count: number): void {
  const aligns: [string, string][] = [['left', 'Alinear izquierda'], ['center-x', 'Centrar en horizontal'], ['right', 'Alinear derecha'], ['top', 'Alinear arriba'], ['center-y', 'Centrar en vertical'], ['bottom', 'Alinear abajo']];
  $('#inspector-content').innerHTML = `<div class="node-summary"><span class="summary-icon">${icon('layers')}</span><h2>${count} nodos</h2><span>Selección múltiple</span></div><div class="properties"><div class="section-heading">Alinear</div><div class="align-grid">${aligns.map(([edge, label]) => `<button class="button" data-align="${edge}" title="${label}" aria-label="${label}">${label.split(' ').at(-1)}</button>`).join('')}</div><div class="section-heading">Distribuir</div><div class="align-grid"><button class="button" data-distribute="horizontal" aria-label="Distribuir en horizontal">Horizontal</button><button class="button" data-distribute="vertical" aria-label="Distribuir en vertical">Vertical</button></div><div class="align-grid"><button class="button" id="group-nodes" aria-label="Agrupar">Agrupar</button><button class="button" id="ungroup-nodes" aria-label="Desagrupar">Desagrupar</button><button class="button" id="lane-nodes" aria-label="Asignar carril">Carril</button></div><button class="text-button" id="delete-multi">${icon('trash')}Eliminar ${count} nodos</button></div>`;
  documentQuery('[data-align]').forEach(button => button.onclick = () => editor.alignSelected(button.dataset.align as AlignEdge));
  documentQuery('[data-distribute]').forEach(button => button.onclick = () => editor.distributeSelected(button.dataset.distribute as 'horizontal' | 'vertical'));
  $('#group-nodes').onclick = async () => {
    const name = await promptForText('Nombre del grupo (usa / para anidar):', `grupo-${editor.getGroups().length + 1}`);
    if (name && name.trim()) editor.setNodeGroup(editor.getSelectedNodeIds(), name.trim());
  };
  $('#ungroup-nodes').onclick = () => editor.setNodeGroup(editor.getSelectedNodeIds(), null);
  $('#lane-nodes').onclick = async () => {
    const name = await promptForText('Nombre del carril (actor/fase):', `carril-${editor.getLanes().length + 1}`);
    if (name && name.trim()) editor.setNodeLane(editor.getSelectedNodeIds(), name.trim());
  };
  $('#delete-multi').onclick = () => editor.removeSelected();
}
function announceSelection(selection: Selection): void {
  const el = document.getElementById('sr-status'); if (!el) return;
  // The editor fires onSelectionChange during construction (selection null), before `editor` is initialized —
  // handle that case first and never touch `editor` here (avoids a temporal-dead-zone error).
  if (!selection) { el.textContent = 'Nada seleccionado'; return; }
  const multi = editor.getSelectedNodeIds();
  if (multi.length > 1) { el.textContent = `${multi.length} nodos seleccionados`; return; }
  const g = editor.getDocument().graph;
  if (selection.kind === 'edge') { const e = g.edges.find(x => x.id === selection.id); el.textContent = e ? `Conexión seleccionada${e.label ? ` (${e.label})` : ''}` : 'Conexión seleccionada'; return; }
  const n = g.nodes.find(x => x.id === selection.id);
  el.textContent = n ? `Nodo seleccionado: ${n.title}, ${nodeLabels[n.type]}` : 'Nodo seleccionado';
}
function renderInspector(selection: Selection): void { renderInspectorContent(selection); updateAccess(); }
function renderInspectorContent(selection: Selection): void {
  if (!selection) {
    $('#inspector-content').innerHTML = `<div class="empty-inspector">${icon('select')}<h3>Todo empieza con una pieza</h3><p>Selecciona un nodo para editarlo o añade uno desde la biblioteca.</p><button class="button" id="add-empty">${icon('plus')}Añadir nodo</button></div>`;
    $('#add-empty').onclick = () => editor.addNode(); return;
  }
  const selectedIds = editor.getSelectedNodeIds();
  if (selectedIds.length >= 2) { renderMultiInspector(selectedIds.length); return; }
  const document = editor.getDocument();
  if (selection.kind === 'edge') {
    const edge = document.graph.edges.find(e => e.id === selection.id);
    if (!edge) return;
    const from = document.graph.nodes.find(n => n.id === edge.source)!, to = document.graph.nodes.find(n => n.id === edge.target)!;
    const reverseIssue = editor.connectionIssue(edge.target, edge.source, edge.id);
    const nodeOptions = (selected: string) => document.graph.nodes.map(n => `<option value="${escape(n.id)}" ${n.id === selected ? 'selected' : ''}>${escape(n.title)}</option>`).join('');
    $('#inspector-content').innerHTML = `<div class="node-summary"><span class="summary-icon">${icon('connect')}</span><h2>Conexión</h2><span>Relación dirigida</span></div><div class="properties"><div class="section-heading">Recorrido</div><p class="edge-relation">${escape(from.title)}${icon('arrow')}${escape(to.title)}</p><div class="edge-actions"><button class="button" id="reverse" ${reverseIssue ? `disabled title="${escape(issueMessages[reverseIssue])}"` : 'title="Invertir dirección (R)"'}>${icon('swap')}Invertir dirección</button><button class="button danger" id="delete">${icon('trash')}Eliminar conexión</button></div><label>Origen<select id="edge-source">${nodeOptions(edge.source)}</select></label><label>Destino<select id="edge-target">${nodeOptions(edge.target)}</select></label></div>`;
    const route = document.layout.edges[edge.id];
    const panel = $('#inspector-content .properties');
    panel.insertAdjacentHTML('beforeend', (['sourcePort', 'targetPort'] as const).map((key, i) => `<label>${i ? 'Puerto de destino' : 'Puerto de origen'}<select id="${key}">${ports.map(port => `<option value="${port}" ${port === route[key] ? 'selected' : ''}>${portLabels[port]}</option>`).join('')}</select></label>`).join(''));
    for (const end of ['source', 'target'] as const) $('#edge-' + end).onchange = e => reconnect(edge, { [end]: (e.target as HTMLSelectElement).value });
    for (const key of ['sourcePort', 'targetPort'] as const) $('#' + key).onchange = e => editor.updateEdge(edge.id, {}, { [key]: (e.target as HTMLSelectElement).value as Port });
    $('#reverse').onclick = () => reverseSelected();
    panel.insertAdjacentHTML('beforeend', `<label>Label<input id="edge-label" value="${escape(edge.label ?? '')}" maxlength="120" /></label><label>Relación<input id="edge-relation" value="${escape(edge.relation ?? '')}" maxlength="120" /></label><label>Condición<input id="edge-condition" value="${escape(edge.condition ?? '')}" maxlength="120" /></label><label>Tags<input id="edge-tags" value="${escape((edge.tags ?? []).join(', '))}" placeholder="separados por comas" /></label>${(['startMarker', 'endMarker'] as const).map((key, i) => `<label>${i ? 'Punta final' : 'Punta inicial'}<select id="${key}">${arrowMarkers.map(marker => `<option value="${marker}" ${marker === (route[key] ?? (i ? 'arrow' : 'none')) ? 'selected' : ''}>${({ none: 'Ninguna', arrow: 'Flecha', dot: 'Círculo' })[marker]}</option>`).join('')}</select></label>`).join('')}<label>Línea<select id="edge-dashed"><option value="false">Continua</option><option value="true" ${route.dashed ? 'selected' : ''}>Discontinua</option></select></label><label>Posición de etiqueta<select id="edge-label-position">${labelPositions.map(pos => `<option value="${pos}" ${pos === (route.labelPosition ?? 'middle') ? 'selected' : ''}>${({ start: 'Inicio', middle: 'Medio', end: 'Final' })[pos]}</option>`).join('')}</select></label><label>Desplazamiento <b class="offset-value">${Math.round(route.labelOffset ?? 11)}</b><input id="edge-label-offset" type="range" min="-30" max="30" step="1" value="${Math.round(route.labelOffset ?? 11)}" /></label>`);
    for (const key of ['label', 'relation', 'condition'] as const) $('#edge-' + key).onchange = e => editor.updateEdge(edge.id, { [key]: (e.target as HTMLInputElement).value });
    $('#edge-tags').onchange = e => applyTags((e.target as HTMLInputElement).value, tags => editor.updateEdge(edge.id, { tags }));
    for (const key of ['startMarker', 'endMarker'] as const) $('#' + key).onchange = e => editor.updateEdge(edge.id, {}, { [key]: (e.target as HTMLSelectElement).value });
    $('#edge-dashed').onchange = e => editor.updateEdge(edge.id, {}, { dashed: (e.target as HTMLSelectElement).value === 'true' });
    $('#edge-label-position').onchange = e => editor.updateEdge(edge.id, {}, { labelPosition: (e.target as HTMLSelectElement).value as typeof labelPositions[number] });
    $('#edge-label-offset').oninput = e => { const value = Number((e.target as HTMLInputElement).value); $('.offset-value').textContent = String(value); editor.updateEdge(edge.id, {}, { labelOffset: value }); };
    $('#delete').onclick = () => editor.removeSelected(); return;
  }
  const node = document.graph.nodes.find(n => n.id === selection.id);
  if (!node) return;
  const edges = document.graph.edges.filter(e => e.source === node.id || e.target === node.id), box = document.layout.nodes[node.id];
  $('#inspector-content').innerHTML = `
    <div class="node-summary"><span class="summary-icon">${icon(node.type)}</span><h2>${escape(node.title)}</h2><span>${nodeLabels[node.type]}<span class="tiny-dot"></span>Componente del sistema</span></div>
    <div class="properties"><div class="section-heading">Propiedades</div><label>Nombre<input id="node-title" value="${escape(node.title)}" maxlength="120" /></label><label>Tipo<select id="node-type">${nodeTypes.map(type => `<option value="${type}" ${node.type === type ? 'selected' : ''}>${nodeLabels[type]}</option>`).join('')}</select></label><label>Referencia<input id="node-source" value="${escape(node.source ?? '')}" placeholder="Ruta o referencia" /></label></div>
    <div class="connections-panel"><div class="section-heading">Conexiones<span>${edges.length}</span></div>${edges.length ? edges.map(edge => {
      const outgoing = edge.source === node.id, related = document.graph.nodes.find(n => n.id === (outgoing ? edge.target : edge.source))!;
      return `<button class="related-node" data-select="${escape(related.id)}">${icon(related.type)}<span>${escape(related.title)}<small>${outgoing ? 'Salida' : 'Entrada'}</small></span>${icon('arrow', outgoing ? '' : 'reverse')}</button>`;
    }).join('') : '<p class="muted">Arrastra desde un puerto para conectar.</p>'}</div><div class="inspector-delete"><button class="text-button" id="delete">${icon('trash')}Eliminar nodo</button></div>`;
  $('#inspector-content .properties').insertAdjacentHTML('beforeend', `<label>Forma<select id="node-shape">${nodeShapes.map(shape => `<option value="${shape}" ${shape === (box.shape ?? 'rectangle') ? 'selected' : ''}>${shapeLabels[shape]}</option>`).join('')}</select></label><label>Tags<input id="node-tags" value="${escape((node.tags ?? []).join(', '))}" placeholder="separados por comas" /></label>`);
  $('#inspector-content .properties').insertAdjacentHTML('beforeend', `<div class="geometry-fields">${(['x','y','width','height'] as const).map(k=>`<label>${({x:'X',y:'Y',width:'Ancho',height:'Alto'})[k]}<input id="node-${k}" type="number" value="${Math.round(box[k])}" ${k==='width'?'min="140"':k==='height'?'min="76"':''} max="1000000"></label>`).join('')}</div><label>Grupo<input id="node-group" maxlength="64" value="${escape(node.group??'')}" placeholder="Producto / Servicios"></label><label>Carril<input id="node-lane" maxlength="64" value="${escape(node.lane??'')}" placeholder="Actor o fase"></label><label>Conectar con<select id="connect-target"><option value="">Elegir destino…</option>${document.graph.nodes.map(n=>`<option value="${escape(n.id)}">${escape(n.title)}</option>`).join('')}</select></label><button class="button" id="connect-selected" data-mutation>Crear conexión</button>`);
  for(const key of ['x','y','width','height'] as const) $('#node-'+key).onchange=e=>{try{editor.updateNodeLayout(node.id,{[key]:Number((e.target as HTMLInputElement).value)});}catch{toast('Dimensiones inválidas. Mínimo 140 × 76.');renderInspector(editor.getSelection());}};
  $('#node-group').onchange=e=>{try{editor.setNodeGroup([node.id],(e.target as HTMLInputElement).value.trim()||null);}catch(error){toast(String(error));}};
  $('#node-lane').onchange=e=>{try{editor.setNodeLane([node.id],(e.target as HTMLInputElement).value.trim()||null);}catch(error){toast(String(error));}};
  $('#connect-selected').onclick=()=>{const target=$<HTMLSelectElement>('#connect-target').value;if(!target){toast('Elige un nodo de destino.');return;}const issue=editor.connectionIssue(node.id,target);if(issue){toast(issueMessages[issue]);return;}const id=editor.connect(node.id,target);if(id)editor.select({kind:'edge',id});};
  $('#node-shape').onchange = e => editor.updateNodeLayout(node.id, { shape: (e.target as HTMLSelectElement).value as typeof nodeShapes[number] });
  $('#node-tags').onchange = e => applyTags((e.target as HTMLInputElement).value, tags => editor.updateNode(node.id, { tags }));
  $('#node-title').onchange = e => editor.updateNode(node.id, { title: (e.target as HTMLInputElement).value.trim() || 'Sin título' });
  $('#node-type').onchange = e => editor.updateNode(node.id, { type: (e.target as HTMLSelectElement).value as NodeType });
  $('#node-source').onchange = e => editor.updateNode(node.id, { source: (e.target as HTMLInputElement).value });
  $('#delete').onclick = () => editor.removeSelected();
  documentQuery('[data-select]').forEach(button => button.onclick = () => editor.select({ kind: 'node', id: button.dataset.select! }));
}
/** Rejected reconnections leave the document untouched; explain why and restore the inspector controls. */
function reconnect(edge: DiagramEdge, patch: { source?: string; target?: string }): void {
  if (editor.reconnectEdge(edge.id, patch)) return;
  const issue = editor.connectionIssue(patch.source ?? edge.source, patch.target ?? edge.target, edge.id);
  toast(issueMessages[issue ?? 'rejected']); renderInspector(editor.getSelection());
}
function reverseSelected(): void {
  const selection = editor.getSelection();
  if (selection?.kind !== 'edge') return;
  const edge = editor.getDocument().graph.edges.find(e => e.id === selection.id);
  if (edge && !editor.reverseEdge(edge.id)) toast(issueMessages[editor.connectionIssue(edge.target, edge.source, edge.id) ?? 'rejected']);
}
function applyTags(value: string, apply: (tags: string[]) => void): void {
  try { apply(value.split(',').map(t => t.trim()).filter(Boolean)); }
  catch (error) { toast(String(error)); renderInspector(editor.getSelection()); }
}
$('#example-select').onchange = async e => {
  const input = e.target as HTMLSelectElement;
  const revision = documentRevision;
  if (documentRevision !== savedRevision && !await confirmAction('¿Cambiar de ejemplo y descartar los cambios sin guardar?', 'Cambiar ejemplo')) { input.value = exampleValue(editor.getDocument()); return; }
  if (documentRevision !== revision) { input.value = exampleValue(editor.getDocument()); toast('El diagrama cambió mientras confirmabas. Intenta de nuevo.'); return; }
  const decisions = input.value === 'decisions';
  stopPlayer(); editor.setDocument(decisions ? decisionDocument() : sampleDocument()); editor.fit(); savedSnapshot = editor.getDocument();
  syncDocumentPresentation();
  editor.select({ kind: 'node', id: decisions ? 'check' : 'auth' });
};
function documentQuery(selector: string): HTMLElement[] { return [...document.querySelectorAll<HTMLElement>(selector)]; }
documentQuery('[data-add]').forEach(button => button.onclick = () => { const type = button.dataset.add as NodeType; editor.addNode(type, `Nuevo ${nodeLabels[type]}`); });
function setTool(tool: Tool): void { editor.setTool(tool); documentQuery('button[data-tool]').forEach(button => { const active = button.dataset.tool === tool; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); }); }
documentQuery('button[data-tool]').forEach(button => button.onclick = () => setTool(button.dataset.tool as Tool));
$('#theme').onclick = () => { dark = !dark; document.documentElement.dataset.theme = dark ? 'dark' : 'light'; activeTheme = dark ? darkTheme : lightTheme; ($('#theme-preset') as HTMLSelectElement).value = dark ? 'dark' : 'light'; editor.setTheme(activeTheme); updateThumb(); minimap?.update(); };
($('#theme-preset') as HTMLSelectElement).value = dark ? 'dark' : 'light';
$('#theme-preset').onchange = e => { const name = (e.target as HTMLSelectElement).value; activeTheme = getTheme(name); dark = name === 'dark' || name === 'blueprint'; document.documentElement.dataset.theme = dark ? 'dark' : 'light'; editor.setTheme(activeTheme); updateThumb(); minimap?.update(); toast(`Tema: ${name}.`); };
$('#accent').oninput = e => { activeTheme = themeFrom((e.target as HTMLInputElement).value, { dark }); editor.setTheme(activeTheme); updateThumb(); minimap?.update(); };
$('#grid').onclick = () => { grid = !grid; editor.setGrid(grid); $('#grid').classList.toggle('active', grid); $('#grid').setAttribute('aria-pressed', String(grid)); };
$('#readonly').onclick = () => { const ro = !editor.isReadOnly(); editor.setReadOnly(ro); $('#readonly').classList.toggle('active', ro); $('#readonly').setAttribute('aria-pressed', String(ro)); updateAccess(); studio?.update(); toast(ro ? 'Modo solo lectura.' : 'Edición habilitada.'); };
$('#gridsnap').onclick = () => { const on = editor.getGridSnap() === 0; editor.setGridSnap(on ? 24 : 0); $('#gridsnap').classList.toggle('active', on); $('#gridsnap').setAttribute('aria-pressed', String(on)); toast(on ? 'Rejilla magnética activada (24 px).' : 'Rejilla magnética desactivada.'); };
$('#diff').onclick = () => {
  const d = diffDocuments(savedSnapshot, editor.getDocument());
  const ids = [...d.nodes.added, ...d.nodes.changed, ...d.edges.added, ...d.edges.changed];
  if (!ids.length) { editor.clearHighlight(); toast('Sin cambios desde la última versión guardada.'); return; }
  editor.setHighlight(ids); toast(`${d.nodes.added.length + d.nodes.changed.length} nodos y ${d.edges.added.length + d.edges.changed.length} conexiones con cambios.`);
};
$('#shortest-path').onclick = () => {
  const selected = editor.getSelectedNodeIds();
  if (selected.length !== 2) { toast('Selecciona exactamente dos nodos (Shift-clic) para trazar la ruta.'); return; }
  const graph = editor.getDocument().graph;
  const path = shortestPath(graph, selected[0], selected[1]) ?? shortestPath(graph, selected[1], selected[0]);
  if (!path) { editor.clearHighlight(); toast('No hay ruta dirigida entre los dos nodos.'); return; }
  editor.setHighlight([...path, ...pathEdges(graph, path)]);
  toast(`Ruta más corta: ${path.length} nodos, ${path.length - 1} conexiones.`);
};
$('#critical-path').onclick = () => {
  const graph = editor.getDocument().graph;
  const path = longestPath(graph);
  if (!path) { editor.clearHighlight(); toast('Hay un ciclo: la ruta crítica necesita un grafo acíclico.'); return; }
  if (path.length < 2) { editor.clearHighlight(); toast('No hay ruta con conexiones.'); return; }
  editor.setHighlight([...path, ...pathEdges(graph, path)]);
  toast(`Ruta crítica: ${path.length} nodos, ${path.length - 1} conexiones.`);
};
$('#cpm').onclick = () => {
  const r = criticalPathMethod(editor.getDocument().graph);
  if (!r) { editor.clearHighlight(); toast('Hay un ciclo: el CPM necesita un grafo acíclico.'); return; }
  if (!r.critical.length) { editor.clearHighlight(); toast('Sin actividades que programar.'); return; }
  editor.setHighlight(r.critical);
  toast(`CPM: duración ${r.projectDuration} pasos, ${r.critical.length} actividad(es) crítica(s) (holgura 0).`);
};
$('#diameter').onclick = () => {
  const graph = editor.getDocument().graph;
  const path = diameterPath(graph);
  if (path.length < 2) { editor.clearHighlight(); toast('Sin ruta que medir (grafo sin conexiones).'); return; }
  editor.setHighlight([...path, ...pathEdges(graph, path)]);
  toast(`Diámetro: ruta de ${path.length} nodos (${path.length - 1} saltos).`);
};
$('#key-nodes').onclick = () => {
  const hubs = centralNodes(editor.getDocument().graph, 3);
  if (!hubs.length) { editor.clearHighlight(); toast('No hay nodos conectados.'); return; }
  editor.setHighlight(hubs);
  toast(`Nodos clave: ${hubs.length} más conectados.`);
};
$('#critical-elements').onclick = () => {
  const { articulationPoints, bridges } = criticalElements(editor.getDocument().graph);
  if (!articulationPoints.length && !bridges.length) { editor.clearHighlight(); toast('Sin puntos críticos: la red no se parte al quitar un solo nodo o enlace.'); return; }
  editor.setHighlight([...articulationPoints, ...bridges]);
  toast(`Puntos críticos (SPOF): ${articulationPoints.length} nodo(s) y ${bridges.length} enlace(s).`);
};
$('#fragmentation').onclick = () => {
  const f = fragmentation(editor.getDocument().graph);
  if (!f.length) { editor.clearHighlight(); toast('Sin fragmentación: ningún nodo parte el grafo al quitarlo.'); return; }
  editor.setHighlight(topFragmenters(editor.getDocument().graph, 3));
  toast(`Fragmentación: «${f[0].id}» parte el grafo en ${f[0].components} componentes al fallar.`);
};
$('#broker-nodes').onclick = () => {
  const brokers = brokerNodes(editor.getDocument().graph, 3);
  if (!brokers.length) { editor.clearHighlight(); toast('Sin brokers: ningún nodo intermedia rutas entre otros.'); return; }
  editor.setHighlight(brokers);
  toast(`Brokers: ${brokers.length} nodo(s) con más intermediación.`);
};
$('#influential-nodes').onclick = () => {
  const top = influentialNodes(editor.getDocument().graph, 3);
  if (!top.length) { editor.clearHighlight(); toast('No hay nodos que clasificar.'); return; }
  editor.setHighlight(top);
  toast(`Influyentes (PageRank): ${top.length} nodo(s).`);
};
$('#eigenvector').onclick = () => {
  const top = influentialByEigenvector(editor.getDocument().graph, 3);
  if (!top.length) { editor.clearHighlight(); toast('Sin centralidad de autovector (grafo sin conexiones).'); return; }
  editor.setHighlight(top);
  toast(`Autovector: ${top.length} nodo(s) más influyentes por conexión a influyentes.`);
};
$('#suggest-links').onclick = () => {
  const doc = editor.getDocument();
  const picks = suggestLinks(doc.graph, { count: 3 });
  if (!picks.length) { editor.clearHighlight(); toast('Sin sugerencias: no hay pares con vecinos en común.'); return; }
  const titleOf = (id: string) => doc.graph.nodes.find(n => n.id === id)?.title ?? id;
  const ids = [...new Set(picks.flatMap(p => [p.source, p.target]))];
  editor.setHighlight(ids);
  const best = picks[0];
  toast(`Conexión sugerida: ${titleOf(best.source)} ↔ ${titleOf(best.target)} (+${picks.length - 1} más).`);
};
$('#dense-core').onclick = () => {
  const c = coreness(editor.getDocument().graph);
  const max = Math.max(0, ...c.values());
  if (max < 2) { editor.clearHighlight(); toast('Sin núcleo denso: todos los nodos tienen core ≤ 1.'); return; }
  const core = [...c.entries()].filter(([, k]) => k === max).map(([id]) => id);
  editor.setHighlight(core);
  toast(`Núcleo denso: ${core.length} nodo(s) con core ${max}.`);
};
$('#robust-cluster').onclick = () => {
  const cluster = largestRobustCluster(editor.getDocument().graph);
  if (!cluster.length) { editor.clearHighlight(); toast('Sin núcleo robusto: cada enlace es un puente (todo se parte al cortar uno).'); return; }
  editor.setHighlight(cluster);
  toast(`Núcleo robusto: ${cluster.length} nodo(s) que resisten cortar cualquier enlace.`);
};
$('#closeness').onclick = () => {
  const top = closestNodes(editor.getDocument().graph, 3);
  if (!top.length) { editor.clearHighlight(); toast('Sin centralidad de cercanía (ningún nodo alcanza a otros).'); return; }
  editor.setHighlight(top);
  toast(`Cercanía: ${top.length} nodo(s) que alcanzan al resto más rápido.`);
};
$('#harmonic').onclick = () => {
  const top = topHarmonic(editor.getDocument().graph, 3);
  if (!top.length) { editor.clearHighlight(); toast('Sin centralidad armónica (ningún nodo alcanza a otros).'); return; }
  editor.setHighlight(top);
  toast(`Centralidad armónica: ${top.length} nodo(s) mejor conectados al resto.`);
};
$('#coefficients').onclick = () => {
  const g = editor.getDocument().graph;
  toast(`Coeficientes: reciprocidad ${reciprocity(g)}, transitividad ${transitivity(g)}, asortatividad ${assortativity(g)}.`);
};
$('#fingerprint').onclick = () => {
  toast(`Huella estructural: ${graphFingerprint(editor.getDocument().graph)}`);
};
$('#modularity').onclick = () => {
  const g = editor.getDocument().graph;
  const groups = communities(g);
  toast(`Modularidad: ${modularity(g, groups)} en ${groups.length} comunidad(es) detectada(s).`);
};
$('#graph-center').onclick = () => {
  const c = graphCenter(editor.getDocument().graph);
  if (!c.center.length) { editor.clearHighlight(); toast('Sin centro (grafo vacío).'); return; }
  editor.setHighlight(c.center);
  toast(`Centro del grafo: ${c.center.length} nodo(s), radio ${c.radius}, diámetro ${c.diameter}.`);
};
$('#endpoints').onclick = () => {
  const e = endpoints(editor.getDocument().graph);
  const hl = [...e.sources, ...e.sinks, ...e.isolated];
  if (!hl.length) { editor.clearHighlight(); toast('Sin entradas/salidas destacables.'); return; }
  editor.setHighlight(hl);
  toast(`Entradas ${e.sources.length}, salidas ${e.sinks.length}, aislados ${e.isolated.length}.`);
};
$('#find-cycle').onclick = () => {
  const graph = editor.getDocument().graph;
  const cycle = findCycle(graph);
  if (!cycle) { editor.clearHighlight(); toast('Sin ciclos: el grafo es acíclico.'); return; }
  const edges = pathEdges(graph, [...cycle, cycle[0]]);
  editor.setHighlight([...cycle, ...edges]);
  toast(`Ciclo detectado: ${cycle.length} nodo(s).`);
};
$('#all-cycles').onclick = () => {
  const graph = editor.getDocument().graph;
  const loops = cycles(graph);
  if (!loops.length) { editor.clearHighlight(); toast('Sin bucles: el grafo es acíclico.'); return; }
  const ids = new Set<string>();
  for (const loop of loops) { for (const n of loop) ids.add(n); for (const e of pathEdges(graph, [...loop, loop[0]])) ids.add(e); }
  editor.setHighlight([...ids]);
  toast(`${loops.length} bucle(s) de retroalimentación encontrados.`);
};
$('#eulerian').onclick = () => {
  const graph = editor.getDocument().graph;
  const r = eulerianTrail(graph);
  if (!r) { editor.clearHighlight(); toast('No hay ruta euleriana (grados desbalanceados o grafo desconectado).'); return; }
  editor.setHighlight(r.circuit ? [r.trail[0]] : [r.trail[0], r.trail[r.trail.length - 1]]);
  toast(`Ruta euleriana (${r.circuit ? 'circuito' : 'camino abierto'}): recorre las ${graph.edges.length} conexión(es) una vez.`);
};
$('#feedback-edges').onclick = () => {
  const fas = feedbackArcSet(editor.getDocument().graph);
  if (!fas.length) { editor.clearHighlight(); toast('Sin aristas de retroalimentación: el grafo ya es acíclico.'); return; }
  editor.setHighlight(fas);
  toast(`Aristas de retroalimentación: ${fas.length} (quitarlas rompe todos los ciclos).`);
};
$('#layout-metrics').onclick = () => {
  const m = layoutMetrics(editor.getDocument());
  toast(`Layout: ${m.crossings} cruce(s), ${m.overlaps} solapamiento(s), densidad ${(m.density * 100).toFixed(0)}%, longitud media ${m.averageEdgeLength}px.`);
};
$('#complexity').onclick = () => {
  const c = cyclomaticComplexity(editor.getDocument().graph);
  toast(`Complejidad ciclomática: ${c.complexity} (${c.nodes} nodos, ${c.edges} aristas, ${c.decisionPoints} decisión(es)).`);
};
$('#graph-props').onclick = () => {
  const p = graphProperties(editor.getDocument().graph);
  const yes = (b: boolean) => b ? 'sí' : 'no';
  toast(`Grafo: DAG ${yes(p.isDag)}, árbol ${yes(p.isTree)}, bipartito ${yes(p.isBipartite)}, conexo ${yes(p.isConnected)}, densidad ${p.density}.`);
};
$('#impact').onclick = () => {
  const sel = editor.getSelection();
  if (!sel || sel.kind !== 'node') { toast('Selecciona un nodo para ver su impacto aguas abajo.'); return; }
  const down = descendants(editor.getDocument().graph, sel.id);
  if (!down.length) { editor.setHighlight([sel.id]); toast('El nodo no tiene dependencias aguas abajo.'); return; }
  editor.setHighlight([sel.id, ...down]);
  toast(`Impacto: ${down.length} nodo(s) afectado(s) aguas abajo.`);
};
$('#dominators').onclick = () => {
  const sel = editor.getSelection();
  if (!sel || sel.kind !== 'node') { toast('Selecciona un nodo para ver sus dominadores (pasos inevitables).'); return; }
  const chain = dominatorChain(editor.getDocument().graph, sel.id);
  if (chain.length <= 1) { editor.setHighlight([sel.id]); toast('Sin dominadores: el nodo es un inicio o no es alcanzable.'); return; }
  editor.setHighlight(chain);
  toast(`Dominadores: ${chain.length - 1} paso(s) inevitable(s) para llegar al nodo.`);
};
$('#all-paths').onclick = () => {
  const selected = editor.getSelectedNodeIds();
  if (selected.length !== 2) { toast('Selecciona exactamente dos nodos (Shift-clic) para ver todas las rutas.'); return; }
  const graph = editor.getDocument().graph;
  const paths = [...allPaths(graph, selected[0], selected[1]), ...allPaths(graph, selected[1], selected[0])];
  if (!paths.length) { editor.clearHighlight(); toast('No hay rutas dirigidas entre los dos nodos.'); return; }
  const ids = new Set<string>();
  for (const p of paths) { for (const n of p) ids.add(n); for (const e of pathEdges(graph, p)) ids.add(e); }
  editor.setHighlight([...ids]);
  toast(`${paths.length} ruta(s) resaltada(s).`);
};
$('#k-paths').onclick = () => {
  const selected = editor.getSelectedNodeIds();
  if (selected.length !== 2) { toast('Selecciona exactamente dos nodos (Shift-clic) para ver las rutas alternativas.'); return; }
  const graph = editor.getDocument().graph;
  let paths = kShortestPaths(graph, selected[0], selected[1], 3);
  if (!paths.length) paths = kShortestPaths(graph, selected[1], selected[0], 3);
  if (!paths.length) { editor.clearHighlight(); toast('No hay rutas dirigidas entre los dos nodos.'); return; }
  const ids = new Set<string>();
  for (const p of paths) { for (const n of p) ids.add(n); for (const e of pathEdges(graph, p)) ids.add(e); }
  editor.setHighlight([...ids]);
  toast(`${paths.length} ruta(s) alternativa(s); la más corta usa ${paths[0].length - 1} salto(s).`);
};
$('#min-cut').onclick = () => {
  const selected = editor.getSelectedNodeIds();
  if (selected.length !== 2) { toast('Selecciona exactamente dos nodos (Shift-clic): origen y destino del corte.'); return; }
  const graph = editor.getDocument().graph;
  let r = minCut(graph, selected[0], selected[1]);
  if (!r.value) r = minCut(graph, selected[1], selected[0]); // try the other direction
  if (!r.value) { editor.clearHighlight(); toast('No hay conexión dirigida entre los dos nodos.'); return; }
  editor.setHighlight(r.cutEdges);
  toast(`Corte mínimo: ${r.value} camino(s) disjunto(s); ${r.cutEdges.length} enlace(s) a cortar.`);
};
$('#neighborhood').onclick = () => {
  const sel = editor.getSelection();
  if (!sel || sel.kind !== 'node') { toast('Selecciona un nodo para ver su vecindario.'); return; }
  const near = neighbors(editor.getDocument().graph, sel.id, { depth: 1 });
  editor.setHighlight([sel.id, ...near]);
  toast(near.length ? `Vecindario: ${near.length} nodo(s) adyacente(s).` : 'El nodo no tiene vecinos.');
};
$('#similar-nodes').onclick = () => {
  const sel = editor.getSelection();
  if (!sel || sel.kind !== 'node') { toast('Selecciona un nodo para ver los nodos similares.'); return; }
  const similar = similarNodes(editor.getDocument().graph, sel.id, 3);
  if (!similar.length) { editor.clearHighlight(); toast('Sin nodos similares (no comparte vecinos con ningún otro).'); return; }
  editor.setHighlight([sel.id, ...similar.map(s => s.id)]);
  toast(`Nodos similares: ${similar.length} con rol parecido (Jaccard máx ${similar[0].score}).`);
};
$('#simplify').onclick = () => {
  const doc = editor.getDocument();
  const redundant = new Set(redundantEdges(doc.graph));
  if (!redundant.size) { toast('No hay aristas redundantes.'); return; }
  doc.graph.edges = doc.graph.edges.filter(e => !redundant.has(e.id));
  for (const id of redundant) delete doc.layout.edges[id];
  editor.replaceDocument(doc); toast(`${redundant.size} arista(s) redundante(s) eliminada(s).`);
};
$('#route').onchange = e => editor.setEdgeStyle((e.target as HTMLSelectElement).value as 'smooth' | 'rounded');
$('#zoom-in').onclick = () => editor.zoomBy(1.2);
$('#zoom-out').onclick = () => editor.zoomBy(1 / 1.2);
$('#zoom-value').onclick = () => editor.zoomBy(1 / editor.getViewport().zoom);
$('#fit').onclick = () => editor.fit();
let player: PathPlayer | null = null;
function stopPlayer(): void { player?.stop(); player = null; $('#play').classList.remove('active'); $('#play').setAttribute('aria-pressed', 'false'); }
$('#play').onclick = () => {
  const doc = editor.getDocument();
  if (profileOf(doc) !== 'flow') { toast('El reproductor de rutas es para flujos (ejemplo Decisiones).'); return; }
  if (player?.playing) { player.pause(); $('#play').classList.remove('active'); $('#play').setAttribute('aria-pressed', 'false'); return; }
  player?.stop();
  player = new PathPlayer(editor, flowSteps(doc.graph), { intervalMs: 700, loop: true });
  player.play(); $('#play').classList.add('active'); $('#play').setAttribute('aria-pressed', 'true');
};
let searchMatches: string[] = [], searchCursor = 0;
function runSearch(advance: boolean): void {
  const input = $<HTMLInputElement>('#search');
  searchMatches = searchNodes(editor.getDocument().graph, input.value);
  $('#search-count').textContent = input.value.trim() ? `${searchMatches.length}` : '';
  if (!input.value.trim()) { editor.clearHighlight(); return; }
  editor.setHighlight(searchMatches);
  if (!searchMatches.length) return;
  if (searchMatches.length > 1 && !advance) { editor.fit(110, searchMatches); return; }
  if (advance) searchCursor = (searchCursor + 1) % searchMatches.length; else searchCursor = 0;
  editor.focusNode(searchMatches[searchCursor]);
}
$('#search').oninput = () => runSearch(false);
$('#search').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); runSearch(searchMatches.length > 0); } };
$('#auto-layout').onclick = () => { editor.replaceDocument(autoLayout(editor.getDocument(), { direction: profileOf(editor.getDocument()) === 'flow' ? 'TB' : 'LR' })); editor.fit(); toast('Diagrama reorganizado.'); };
$('#best-layout').onclick = () => {
  const scored = scoreLayouts(editor.getDocument());
  if (!scored.length) { toast('No se pudo calcular un layout.'); return; }
  const best = scored[0];
  editor.replaceDocument(best.document); editor.fit();
  const names: Record<string, string> = { layered: 'jerárquico', tree: 'árbol', radial: 'radial', circular: 'circular', grid: 'cuadrícula', organic: 'orgánico', cluster: 'grupos' };
  toast(`Auto-layout óptimo: ${names[best.name] ?? best.name} (${best.metrics.crossings} cruce(s)).`);
};
$('#reduce-crossings').onclick = () => {
  const dir = profileOf(editor.getDocument()) === 'flow' ? 'TB' : 'LR';
  editor.replaceDocument(reduceCrossings(editor.getDocument(), { direction: dir })); editor.fit(); syncDocumentPresentation();
  toast('Cruces reducidos (layout jerárquico).');
};
$('#organic-layout').onclick = () => { editor.replaceDocument(organicLayout(editor.getDocument())); editor.fit(); toast('Layout orgánico aplicado.'); };
$('#radial-layout').onclick = () => { editor.replaceDocument(radialLayout(editor.getDocument())); editor.fit(); toast('Layout radial aplicado.'); };
$('#mindmap-layout').onclick = () => { editor.replaceDocument(mindmapLayout(editor.getDocument())); editor.fit(); toast('Layout de mapa mental aplicado.'); };
$('#tree-layout').onclick = () => { editor.replaceDocument(treeLayout(editor.getDocument())); editor.fit(); toast('Layout de árbol aplicado.'); };
$('#circular-layout').onclick = () => { editor.replaceDocument(circularLayout(editor.getDocument())); editor.fit(); toast('Layout circular aplicado.'); };
$('#arc-layout').onclick = () => { editor.replaceDocument(arcLayout(editor.getDocument())); editor.fit(); toast('Layout en línea aplicado.'); };
$('#grid-layout').onclick = () => { editor.replaceDocument(gridLayout(editor.getDocument())); editor.fit(); toast('Layout en cuadrícula aplicado.'); };
$('#cluster-layout').onclick = () => { editor.replaceDocument(clusterLayout(editor.getDocument())); editor.fit(); toast('Layout por grupos aplicado.'); };
$('#fit-sizes').onclick = () => { editor.replaceDocument(fitNodeSizes(editor.getDocument())); editor.fit(); toast('Tamaño de nodos ajustado al texto.'); };
$('#snap-grid').onclick = () => { editor.replaceDocument(snapToGrid(editor.getDocument(), 16)); editor.fit(); toast('Nodos alineados a la cuadrícula.'); };
$('#resolve-overlaps').onclick = () => { editor.replaceDocument(resolveOverlaps(editor.getDocument())); editor.fit(); toast('Nodos solapados separados.'); };
$('#auto-group').onclick = () => {
  const doc = editor.getDocument();
  const comps = connectedComponents(doc.graph);
  if (comps.length <= 1) { toast('El diagrama es un solo componente conexo.'); return; }
  const groupOf = new Map<string, string>();
  comps.forEach((c, i) => { if (c.length > 1) for (const id of c) groupOf.set(id, `componente-${i + 1}`); });
  if (!groupOf.size) { toast('No hay componentes de más de un nodo.'); return; }
  for (const n of doc.graph.nodes) n.group = groupOf.get(n.id);
  editor.replaceDocument(doc); editor.fit(); syncDocumentPresentation(); toast(`${groupOf.size ? comps.filter(c => c.length > 1).length : 0} componentes agrupados.`);
};
$('#group-by-type').onclick = () => {
  editor.replaceDocument(groupBy(editor.getDocument(), 'type')); editor.fit(); syncDocumentPresentation();
  toast('Nodos agrupados por tipo.');
};
$('#community-group').onclick = () => {
  const doc = editor.getDocument();
  const comms = communities(doc.graph).filter(c => c.length > 1);
  if (!comms.length) { toast('No se detectaron comunidades de más de un nodo.'); return; }
  const groupOf = new Map<string, string>();
  comms.forEach((c, i) => { for (const id of c) groupOf.set(id, `comunidad-${i + 1}`); });
  for (const n of doc.graph.nodes) n.group = groupOf.get(n.id);
  editor.replaceDocument(doc); editor.fit(); syncDocumentPresentation(); toast(`${comms.length} comunidad(es) detectada(s) y agrupada(s).`);
};
$('#collapse-groups').onclick = () => {
  const doc = editor.getDocument();
  if (!doc.graph.nodes.some(n => n.group)) { toast('No hay grupos que colapsar.'); return; }
  editor.replaceDocument(collapseGroups(doc)); editor.fit(); syncDocumentPresentation(); toast('Grupos colapsados en una vista de alto nivel.');
};
$('#condense').onclick = () => {
  const out = condense(editor.getDocument());
  editor.replaceDocument(out); editor.fit(); syncDocumentPresentation();
  toast(`Ciclos condensados: ${out.graph.nodes.length} nodo(s) en el DAG resultante.`);
};
$('#contract-chains').onclick = () => {
  const out = contractChains(editor.getDocument());
  editor.replaceDocument(out); editor.fit(); syncDocumentPresentation();
  toast(`Cadenas contraídas: ${out.graph.nodes.length} nodo(s) en el esqueleto.`);
};
$('#flip-h').onclick = () => {
  editor.replaceDocument(flipLayout(editor.getDocument(), { axis: 'horizontal' })); editor.fit(); syncDocumentPresentation();
  toast('Diagrama reflejado horizontalmente.');
};
$('#rotate').onclick = () => {
  editor.replaceDocument(rotateLayout(editor.getDocument(), { degrees: 90 })); editor.fit(); syncDocumentPresentation();
  toast('Diagrama rotado 90°.');
};
$('#spread').onclick = () => {
  editor.replaceDocument(scaleLayout(editor.getDocument(), { factor: 1.3 })); editor.fit(); syncDocumentPresentation();
  toast('Nodos espaciados (×1.3).');
};
$('#isolate').onclick = () => {
  const ids = editor.getSelectedNodeIds();
  if (ids.length < 1) { toast('Selecciona uno o más nodos (Shift-clic) para aislarlos.'); return; }
  editor.replaceDocument(subgraph(editor.getDocument(), ids)); editor.fit(); syncDocumentPresentation();
  toast(`Subdiagrama aislado: ${ids.length} nodo(s).`);
};
$('#merge-nodes').onclick = () => {
  const ids = editor.getSelectedNodeIds();
  if (ids.length < 2) { toast('Selecciona dos o más nodos (Shift-clic) para fusionarlos.'); return; }
  editor.replaceDocument(mergeNodes(editor.getDocument(), ids)); editor.fit(); syncDocumentPresentation();
  editor.selectNodes([ids[0]]);
  toast(`${ids.length} nodos fusionados en «${ids[0]}».`);
};
$('#merge-duplicates').onclick = () => {
  const before = editor.getDocument().graph.nodes.length;
  editor.replaceDocument(mergeDuplicates(editor.getDocument())); editor.fit(); syncDocumentPresentation();
  const after = editor.getDocument().graph.nodes.length;
  toast(before === after ? 'Sin títulos duplicados que fusionar.' : `Duplicados fusionados: ${before - after} nodo(s) menos.`);
};
$('#dedupe-edges').onclick = () => {
  const before = editor.getDocument().graph.edges.length;
  editor.replaceDocument(dedupeEdges(editor.getDocument())); syncDocumentPresentation();
  const after = editor.getDocument().graph.edges.length;
  toast(before === after ? 'Sin aristas duplicadas.' : `Aristas duplicadas quitadas: ${before - after} conexión(es) menos.`);
};
$('#pack-components').onclick = () => {
  editor.replaceDocument(packComponents(editor.getDocument())); editor.fit(); syncDocumentPresentation();
  toast('Componentes compactados.');
};
$('#spanning-tree').onclick = () => {
  const before = editor.getDocument().graph.edges.length;
  editor.replaceDocument(spanningTree(editor.getDocument())); syncDocumentPresentation();
  const after = editor.getDocument().graph.edges.length;
  toast(before === after ? 'Ya es un árbol/bosque: nada que quitar.' : `Árbol de expansión: ${before - after} conexión(es) fuera del esqueleto quitadas.`);
};
$('#trim-leaves').onclick = () => {
  const before = editor.getDocument().graph.nodes.length;
  editor.replaceDocument(trimLeaves(editor.getDocument())); editor.fit(); syncDocumentPresentation();
  const after = editor.getDocument().graph.nodes.length;
  toast(before === after ? 'Sin hojas que podar (todo es núcleo).' : `Hojas podadas: ${before - after} nodo(s) de grado ≤1 quitados.`);
};
$('#split-edge').onclick = () => {
  const sel = editor.getSelection();
  if (!sel || sel.kind !== 'edge') { toast('Selecciona una conexión para insertar un nodo en ella.'); return; }
  const id = `paso-${Date.now().toString(36)}`;
  editor.replaceDocument(splitEdge(editor.getDocument(), sel.id, { id, title: 'Paso' }));
  editor.fit(); syncDocumentPresentation(); editor.selectNodes([id]);
  toast('Nodo insertado en la conexión.');
};
$('#bypass-node').onclick = () => {
  const sel = editor.getSelection();
  if (!sel || sel.kind !== 'node') { toast('Selecciona un nodo para omitirlo (reconectando su flujo).'); return; }
  editor.replaceDocument(bypassNode(editor.getDocument(), sel.id)); editor.fit(); syncDocumentPresentation();
  toast('Nodo omitido: flujo reconectado alrededor.');
};
$('#add-stable').onclick = () => {
  const before = editor.getDocument();
  const doc = structuredClone(before);
  const id = `nodo-${Date.now().toString(36)}`;
  doc.graph.nodes.push({ id, type: 'process', title: 'Nuevo' });
  doc.layout.nodes[id] = { x: 0, y: 0, width: 200, height: 92 };
  editor.replaceDocument(stableLayout(doc, before)); syncDocumentPresentation(); editor.selectNodes([id]);
  toast('Nodo añadido sin reorganizar el resto (layout estable).'); // no fit(): keep the viewport stable too
};
$('#undo').onclick = () => editor.undo();
$('#redo').onclick = () => editor.redo();
$('#save').onclick = async () => {
  if (saving) return;
  saving = true; $<HTMLButtonElement>('#save').disabled = true;
  const revision = documentRevision, snapshot = editor.getDocument();
  try {
    if (isTauri()) await saveDocument('access-system', snapshot);
    else localStorage.setItem('codaru-diagram-example', JSON.stringify(snapshot));
    savedRevision = revision; savedSnapshot = snapshot; recovery?.markSaved(revision); updateSaveStatus(); toast(isTauri() ? 'Diagrama guardado en tu Mac.' : 'Diagrama guardado en este navegador.');
  } catch (error) { toast(`No se pudo guardar: ${String(error)}`); }
  finally { saving = false; $<HTMLButtonElement>('#save').disabled = false; }
};
$('#template-select').onchange = async e => {
  const name = (e.target as HTMLSelectElement).value;
  if (!name) return;
  const revision = documentRevision;
  if (documentRevision !== savedRevision && !await confirmAction('¿Insertar plantilla y descartar los cambios sin guardar?', 'Insertar plantilla')) { (e.target as HTMLSelectElement).value = ''; return; }
  if (documentRevision !== revision) { toast('El diagrama cambió mientras confirmabas. Intenta de nuevo.'); return; }
  stopPlayer(); editor.setDocument(getTemplate(name)); editor.fit(); syncDocumentPresentation();
  savedRevision = documentRevision; savedSnapshot = editor.getDocument(); updateSaveStatus();
  (e.target as HTMLSelectElement).value = '';
  toast(`Plantilla «${name}» insertada.`);
};
$('#load').onclick = async () => {
  const revision = documentRevision;
  if (documentRevision !== savedRevision && !await confirmAction('Hay cambios sin guardar. ¿Quieres reemplazarlos por la última versión guardada?', 'Abrir guardado')) return;
  try {
    let snapshot: DiagramDocument | null;
    if (isTauri()) snapshot = await loadDocument('access-system');
    else { const saved = localStorage.getItem('codaru-diagram-example'); snapshot = saved ? parseDocument(saved) : null; }
    if (!snapshot) { toast('Todavía no hay un diagrama guardado.'); return; }
    if (documentRevision !== revision) { toast('El diagrama cambió mientras se abría. Intenta de nuevo.'); return; }
    editor.setDocument(snapshot); editor.fit(); syncDocumentPresentation(); savedRevision = documentRevision; savedSnapshot = editor.getDocument(); recovery?.markSaved(documentRevision); updateSaveStatus(); toast('Diagrama abierto.');
  } catch (error) { toast(`No se pudo abrir: ${String(error)}`); }
};
const sampleFlowText = `flowchart TD
  A[Solicitud] --> B{¿Autorizado?}
  B -->|Sí| C(Conceder acceso)
  B -.->|No| D([Rechazar])
  C --> E([Sesión iniciada])`;
$('#import-auto').onclick = async () => {
  const text = await promptForText('Pega cualquier formato (Mermaid, DOT, GraphML, draw.io, PlantUML, Cytoscape, Canvas, Excalidraw, CSV, Markdown o JSON):', '');
  if (text === null || !text.trim()) return;
  try {
    editor.replaceDocument(isEditableSvg(text) ? fromSvg(text) : importAny(text)); editor.fit(); syncDocumentPresentation();
    toast('Diagrama importado (formato detectado).');
  } catch (error) { toast(`No se pudo importar: ${String(error)}`); }
};
async function importFile(file: File): Promise<void> {
  if (editor.isReadOnly()) return;
  const revision = documentRevision;
  try {
    if (/\.png$/i.test(file.name) || file.type === 'image/png') {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const pngDoc = isPng(bytes) ? readDocumentFromPng(bytes) : null;
      if (editor.isReadOnly() || documentRevision !== revision) { toast('El diagrama cambió mientras se leía el archivo. Intenta de nuevo.'); return; }
      if (!pngDoc) { toast('El PNG no incluye un diagrama Kairo (exporta PNG desde Kairo para reabrirlo).'); return; }
      editor.replaceDocument(pngDoc); editor.fit(); syncDocumentPresentation();
      toast(`Archivo «${file.name}» importado (PNG con diagrama).`);
      return;
    }
    const text = await file.text();
    const doc = isEditableSvg(text) ? fromSvg(text) : importAny(text);
    if (editor.isReadOnly() || documentRevision !== revision) { toast('El diagrama cambió mientras se leía el archivo. Intenta de nuevo.'); return; }
    editor.replaceDocument(doc); editor.fit(); syncDocumentPresentation();
    toast(`Archivo «${file.name}» importado.`);
  } catch (error) { toast(`No se pudo abrir el archivo: ${String(error)}`); }
}
$('#open-file').onclick = () => $('#file-input').click();
$<HTMLInputElement>('#file-input').onchange = async e => {
  const input = e.target as HTMLInputElement, file = input.files?.[0];
  if (file) await importFile(file);
  input.value = '';
};
// Drag & drop a supported file onto the canvas (auto-detected).
const dropHost = $('#diagram');
dropHost.addEventListener('dragover', e => { e.preventDefault(); dropHost.classList.add('is-dropping'); });
dropHost.addEventListener('dragleave', e => { if (e.target === dropHost) dropHost.classList.remove('is-dropping'); });
dropHost.addEventListener('drop', async e => {
  e.preventDefault(); dropHost.classList.remove('is-dropping');
  const file = e.dataTransfer?.files?.[0];
  if (file) await importFile(file);
});
$('#import-text').onclick = async () => {
  const text = await promptForText('Pega Mermaid (flowchart, state, class, ER, mindmap):', toMermaid(editor.getDocument()) || sampleFlowText);
  if (text === null) return;
  try {
    const doc = mergeLayout(parseMermaid(text), editor.getDocument());
    stopPlayer(); editor.replaceDocument(doc); editor.fit(); syncDocumentPresentation();
    toast('Diagrama importado desde texto.');
  } catch (error) { toast(`No se pudo importar: ${String(error)}`); }
};
$('#import-dot').onclick = async () => {
  const text = await promptForText('Pega un grafo DOT (Graphviz):', 'digraph {\n  a [label="Inicio"];\n  a -> b -> c;\n}');
  if (text === null) return;
  try {
    editor.replaceDocument(parseDotText(text)); editor.fit(); syncDocumentPresentation();
    toast('Diagrama importado desde DOT.');
  } catch (error) { toast(`No se pudo importar DOT: ${String(error)}`); }
};
$('#import-gvjson').onclick = async () => {
  const sample = '{\n  "directed": true,\n  "objects": [\n    {"_gvid":0,"name":"a","label":"Inicio","pos":"27,162","width":"0.9","height":"0.5"},\n    {"_gvid":1,"name":"b","label":"Proceso","pos":"27,90","width":"0.9","height":"0.5"},\n    {"_gvid":2,"name":"c","label":"Fin","pos":"27,18","width":"0.9","height":"0.5"}\n  ],\n  "edges": [{"tail":0,"head":1,"label":"ok"},{"tail":1,"head":2}]\n}';
  const text = await promptForText('Pega la salida de "dot -Tjson" (Graphviz, con posiciones):', sample);
  if (text === null) return;
  try {
    editor.replaceDocument(fromGraphvizJson(text)); editor.fit(); syncDocumentPresentation();
    toast('Diagrama importado desde Graphviz JSON.');
  } catch (error) { toast(`No se pudo importar Graphviz JSON: ${String(error)}`); }
};
$('#import-csv').onclick = async () => {
  const text = await promptForText('Pega una lista de aristas CSV/TSV (from,to,label):', 'from,to,label\nAuth,Users,verifica\nUsers,Audit,registra');
  if (text === null) return;
  try {
    editor.replaceDocument(fromCsv(text)); editor.fit(); syncDocumentPresentation();
    toast('Diagrama importado desde CSV.');
  } catch (error) { toast(`No se pudo importar CSV: ${String(error)}`); }
};
$('#import-graphml').onclick = async () => {
  const text = await promptForText('Pega GraphML (yEd, Gephi, Cytoscape, draw.io):', toGraphml(editor.getDocument()));
  if (text === null) return;
  try {
    editor.replaceDocument(fromGraphml(text)); editor.fit(); syncDocumentPresentation();
    toast('Diagrama importado desde GraphML.');
  } catch (error) { toast(`No se pudo importar GraphML: ${String(error)}`); }
};
$('#import-gexf').onclick = async () => {
  const text = await promptForText('Pega GEXF (Gephi, NetworkX):', toGexf(editor.getDocument()));
  if (text === null) return;
  try {
    editor.replaceDocument(fromGexf(text)); editor.fit(); syncDocumentPresentation();
    toast('Diagrama importado desde GEXF.');
  } catch (error) { toast(`No se pudo importar GEXF: ${String(error)}`); }
};
$('#import-gml').onclick = async () => {
  const text = await promptForText('Pega GML (NetworkX, igraph, Gephi, yEd):', toGml(editor.getDocument()));
  if (text === null) return;
  try {
    editor.replaceDocument(fromGml(text)); editor.fit(); syncDocumentPresentation();
    toast('Diagrama importado desde GML.');
  } catch (error) { toast(`No se pudo importar GML: ${String(error)}`); }
};
$('#import-pajek').onclick = async () => {
  const text = await promptForText('Pega Pajek (.net, NetworkX/igraph/Gephi):', toPajek(editor.getDocument()));
  if (text === null) return;
  try {
    editor.replaceDocument(fromPajek(text)); editor.fit(); syncDocumentPresentation();
    toast('Diagrama importado desde Pajek.');
  } catch (error) { toast(`No se pudo importar Pajek: ${String(error)}`); }
};
$('#import-structurizr').onclick = async () => {
  const text = await promptForText('Pega Structurizr DSL (C4):', toStructurizr(editor.getDocument()));
  if (text === null) return;
  try {
    editor.setDocument(fromStructurizr(text)); editor.fit(); syncDocumentPresentation();
    savedRevision = documentRevision; savedSnapshot = editor.getDocument(); updateSaveStatus(); toast('Diagrama importado desde Structurizr DSL.');
  } catch (error) { toast(`No se pudo importar Structurizr: ${String(error)}`); }
};
$('#import-drawio').onclick = async () => {
  const text = await promptForText('Pega XML de draw.io (mxGraph, sin comprimir):', toDrawio(editor.getDocument()));
  if (text === null) return;
  try {
    editor.replaceDocument(fromDrawio(text)); editor.fit(); syncDocumentPresentation();
    toast('Diagrama importado desde draw.io.');
  } catch (error) { toast(`No se pudo importar draw.io: ${String(error)}`); }
};
$('#import-puml').onclick = async () => {
  const text = await promptForText('Pega PlantUML (componentes y flechas):', toPlantuml(editor.getDocument()));
  if (text === null) return;
  try {
    editor.replaceDocument(parsePlantuml(text)); editor.fit(); syncDocumentPresentation();
    toast('Diagrama importado desde PlantUML.');
  } catch (error) { toast(`No se pudo importar PlantUML: ${String(error)}`); }
};
$('#import-puml-mindmap').onclick = async () => {
  const sample = '@startmindmap\n* Proyecto\n** Diseño\n*** Bocetos\n** Desarrollo\n** Lanzamiento\n@endmindmap';
  const text = await promptForText('Pega un PlantUML mindmap (@startmindmap con *, **, ***):', sample);
  if (text === null) return;
  try {
    editor.replaceDocument(parsePlantumlMindmap(text)); editor.fit(); syncDocumentPresentation();
    toast('Diagrama importado desde PlantUML mindmap.');
  } catch (error) { toast(`No se pudo importar mindmap: ${String(error)}`); }
};
$('#import-d2').onclick = async () => {
  const text = await promptForText('Pega D2 (Terrastruct):', toD2(editor.getDocument()));
  if (text === null) return;
  try {
    editor.replaceDocument(parseD2(text)); editor.fit(); syncDocumentPresentation();
    toast('Diagrama importado desde D2.');
  } catch (error) { toast(`No se pudo importar D2: ${String(error)}`); }
};
$('#import-nomnoml').onclick = async () => {
  const text = await promptForText('Pega nomnoml ([A] -> [B]):', toNomnoml(editor.getDocument()));
  if (text === null) return;
  try {
    editor.replaceDocument(fromNomnoml(text)); editor.fit(); syncDocumentPresentation();
    toast('Diagrama importado desde nomnoml.');
  } catch (error) { toast(`No se pudo importar nomnoml: ${String(error)}`); }
};
$('#import-tgf').onclick = async () => {
  const text = await promptForText('Pega TGF (Trivial Graph Format):', toTgf(editor.getDocument()));
  if (text === null) return;
  try {
    editor.replaceDocument(fromTgf(text)); editor.fit(); syncDocumentPresentation();
    toast('Diagrama importado desde TGF.');
  } catch (error) { toast(`No se pudo importar TGF: ${String(error)}`); }
};
$('#import-dgml').onclick = async () => {
  const text = await promptForText('Pega DGML (Visual Studio Directed Graph):', toDgml(editor.getDocument()));
  if (text === null) return;
  try {
    editor.replaceDocument(fromDgml(text)); editor.fit(); syncDocumentPresentation();
    toast('Diagrama importado desde DGML.');
  } catch (error) { toast(`No se pudo importar DGML: ${String(error)}`); }
};
$('#import-outline').onclick = async () => {
  const text = await promptForText('Pega un esquema indentado (notas, lista, TODO):', toOutline(editor.getDocument()));
  if (text === null) return;
  try {
    editor.replaceDocument(parseOutline(text)); editor.fit(); syncDocumentPresentation();
    toast('Diagrama importado desde esquema.');
  } catch (error) { toast(`No se pudo importar el esquema: ${String(error)}`); }
};
$('#import-cy').onclick = async () => {
  const text = await promptForText('Pega Cytoscape JSON ({ elements: { nodes, edges } }):', JSON.stringify(toCytoscape(editor.getDocument()), null, 2));
  if (text === null) return;
  try {
    editor.replaceDocument(fromCytoscape(text)); editor.fit(); syncDocumentPresentation();
    toast('Diagrama importado desde Cytoscape.');
  } catch (error) { toast(`No se pudo importar Cytoscape: ${String(error)}`); }
};
$('#import-visjs').onclick = async () => {
  const text = await promptForText('Pega vis-network JSON ({ nodes, edges }):', JSON.stringify(toVisNetwork(editor.getDocument()), null, 2));
  if (text === null) return;
  try {
    editor.replaceDocument(fromVisNetwork(text)); editor.fit(); syncDocumentPresentation();
    toast('Diagrama importado desde vis-network.');
  } catch (error) { toast(`No se pudo importar vis-network: ${String(error)}`); }
};
$('#import-nodelink').onclick = async () => {
  const text = await promptForText('Pega node-link JSON (NetworkX/D3, { nodes, links }):', JSON.stringify(toNodeLink(editor.getDocument()), null, 2));
  if (text === null) return;
  try {
    editor.replaceDocument(fromNodeLink(text)); editor.fit(); syncDocumentPresentation();
    toast('Diagrama importado desde node-link JSON.');
  } catch (error) { toast(`No se pudo importar node-link: ${String(error)}`); }
};
$('#import-graphology').onclick = async () => {
  const text = await promptForText('Pega un grafo graphology (Sigma.js, { nodes, edges }):', JSON.stringify(toGraphology(editor.getDocument()), null, 2));
  if (text === null) return;
  try {
    editor.replaceDocument(fromGraphology(text)); editor.fit(); syncDocumentPresentation();
    toast('Diagrama importado desde graphology.');
  } catch (error) { toast(`No se pudo importar graphology: ${String(error)}`); }
};
$('#import-elk').onclick = async () => {
  const text = await promptForText('Pega ELK JSON (Eclipse Layout Kernel, { children, edges }):', JSON.stringify(toElk(editor.getDocument()), null, 2));
  if (text === null) return;
  try {
    editor.replaceDocument(fromElk(text)); editor.fit(); syncDocumentPresentation();
    toast('Diagrama importado desde ELK JSON.');
  } catch (error) { toast(`No se pudo importar ELK: ${String(error)}`); }
};
$('#import-jgf').onclick = async () => {
  const text = await promptForText('Pega JGF (JSON Graph Format, { graph: { nodes, edges } }):', JSON.stringify(toJgf(editor.getDocument()), null, 2));
  if (text === null) return;
  try {
    editor.replaceDocument(fromJgf(text)); editor.fit(); syncDocumentPresentation();
    toast('Diagrama importado desde JGF.');
  } catch (error) { toast(`No se pudo importar JGF: ${String(error)}`); }
};
$('#import-opml').onclick = async () => {
  const sample = '<opml version="2.0">\n  <head><title>Esquema</title></head>\n  <body>\n    <outline text="Proyecto">\n      <outline text="Diseño"><outline text="Bocetos"/></outline>\n      <outline text="Desarrollo"/>\n    </outline>\n  </body>\n</opml>';
  const text = await promptForText('Pega OPML (outliner: el anidamiento se vuelve jerarquía):', sample);
  if (text === null) return;
  try {
    editor.replaceDocument(fromOpml(text)); editor.fit(); syncDocumentPresentation();
    toast('Diagrama importado desde OPML.');
  } catch (error) { toast(`No se pudo importar OPML: ${String(error)}`); }
};
$('#import-bpmn').onclick = async () => {
  const text = await promptForText('Pega BPMN 2.0 (Camunda/bpmn.io):', toBpmn(editor.getDocument()));
  if (text === null) return;
  try {
    editor.replaceDocument(fromBpmn(text)); editor.fit(); syncDocumentPresentation();
    toast('Diagrama importado desde BPMN.');
  } catch (error) { toast(`No se pudo importar BPMN: ${String(error)}`); }
};
$('#import-gantt').onclick = async () => {
  const sample = 'gantt\n  title Plan\n  section Fase 1\n  Investigar :research, 2024-01-01, 3d\n  Maquetar :mock, after research, 2d\n  section Fase 2\n  Construir :build, after mock, 5d\n  Lanzar :milestone, launch, after build, 0d';
  const text = await promptForText('Pega un Mermaid gantt (las dependencias "after" se vuelven conexiones):', sample);
  if (text === null) return;
  try {
    editor.replaceDocument(parseGantt(text)); editor.fit(); syncDocumentPresentation();
    toast('Diagrama importado desde gantt.');
  } catch (error) { toast(`No se pudo importar gantt: ${String(error)}`); }
};
$('#import-sankey').onclick = async () => {
  const sample = 'sankey-beta\n\nVisitas,Registro,120\nVisitas,Salida,80\nRegistro,Compra,45\nRegistro,Salida,75';
  const text = await promptForText('Pega un Mermaid sankey-beta (filas origen,destino,valor):', sample);
  if (text === null) return;
  try {
    editor.replaceDocument(parseSankey(text)); editor.fit(); syncDocumentPresentation();
    toast('Diagrama importado desde sankey-beta.');
  } catch (error) { toast(`No se pudo importar sankey: ${String(error)}`); }
};
$('#import-arch').onclick = async () => {
  const sample = 'architecture-beta\n  group api(cloud)[API]\n  service web(internet)[Web]\n  service srv(server)[Servidor] in api\n  service db(database)[Base de datos] in api\n  web:R --> L:srv\n  srv:B --> T:db';
  const text = await promptForText('Pega un Mermaid architecture-beta (grupos, servicios y conexiones):', sample);
  if (text === null) return;
  try {
    editor.replaceDocument(parseArchitecture(text)); editor.fit(); syncDocumentPresentation();
    toast('Diagrama importado desde architecture-beta.');
  } catch (error) { toast(`No se pudo importar architecture: ${String(error)}`); }
};
$('#import-block').onclick = async () => {
  const sample = 'block-beta\n  columns 3\n  a["Cliente"]\n  b["API"]\n  c["Base de datos"]\n  a -- "pide" --> b\n  b --> c';
  const text = await promptForText('Pega un Mermaid block-beta (bloques y flechas):', sample);
  if (text === null) return;
  try {
    editor.replaceDocument(parseMermaidBlock(text)); editor.fit(); syncDocumentPresentation();
    toast('Diagrama importado desde block-beta.');
  } catch (error) { toast(`No se pudo importar block: ${String(error)}`); }
};
$('#import-jsontree').onclick = async () => {
  const text = await promptForText('Pega JSON jerárquico ({ name, children: [...] }):', '{\n  "name": "Raíz",\n  "children": [\n    { "name": "Rama A", "children": [{ "name": "Hoja" }] },\n    { "name": "Rama B" }\n  ]\n}');
  if (text === null) return;
  try {
    editor.replaceDocument(fromJson(text)); editor.fit(); syncDocumentPresentation();
    toast('Árbol JSON importado.');
  } catch (error) { toast(`No se pudo importar JSON: ${String(error)}`); }
};
$('#import-parentlist').onclick = async () => {
  const sample = '[\n  { "id": "ceo", "label": "CEO" },\n  { "id": "cto", "parentId": "ceo", "label": "CTO" },\n  { "id": "cfo", "parentId": "ceo", "label": "CFO" },\n  { "id": "eng", "parentId": "cto", "label": "Ingeniería" }\n]';
  const text = await promptForText('Pega una lista de padres ([{ id, parentId, label }], org charts/SQL):', sample);
  if (text === null) return;
  try {
    editor.replaceDocument(fromParentList(text)); editor.fit(); syncDocumentPresentation();
    toast('Lista de padres importada.');
  } catch (error) { toast(`No se pudo importar la lista de padres: ${String(error)}`); }
};
$('#import-graphql').onclick = async () => {
  const sample = 'type User {\n  id: ID!\n  posts: [Post!]!\n  profile: Profile\n}\ntype Post { title: String author: User! }\ntype Profile { bio: String }';
  const text = await promptForText('Pega un esquema GraphQL (SDL): los campos de tipo objeto se vuelven conexiones.', sample);
  if (text === null) return;
  try {
    editor.replaceDocument(fromGraphql(text)); editor.fit(); syncDocumentPresentation();
    toast('Esquema GraphQL importado.');
  } catch (error) { toast(`No se pudo importar GraphQL: ${String(error)}`); }
};
$('#import-jsonschema').onclick = async () => {
  const sample = '{\n  "$defs": {\n    "User": { "type": "object", "properties": { "profile": { "$ref": "#/$defs/Profile" }, "posts": { "type": "array", "items": { "$ref": "#/$defs/Post" } } } },\n    "Post": { "properties": { "author": { "$ref": "#/$defs/User" } } },\n    "Profile": { "properties": { "bio": { "type": "string" } } }\n  }\n}';
  const text = await promptForText('Pega un JSON Schema: las propiedades $ref se vuelven conexiones.', sample);
  if (text === null) return;
  try {
    editor.replaceDocument(fromJsonSchema(text)); editor.fit(); syncDocumentPresentation();
    toast('JSON Schema importado.');
  } catch (error) { toast(`No se pudo importar JSON Schema: ${String(error)}`); }
};
$('#insert-decision').onclick = () => {
  editor.replaceDocument(mergeDocuments(editor.getDocument(), getTemplate('decision'))); editor.fit();
  syncDocumentPresentation(); toast('Plantilla de decisión insertada.');
};
$('#gen-grid').onclick = () => {
  editor.setDocument(gridGraph(4, 3)); editor.fit(); syncDocumentPresentation();
  savedRevision = documentRevision; savedSnapshot = editor.getDocument(); updateSaveStatus();
  toast('Cuadrícula 4×3 generada.');
};
$('#export').onclick = () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(editor.getDocument(), null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = 'diagrama.kairo.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Diagrama exportado como JSON.');
};
$('#export-text').onclick = () => {
  const url = URL.createObjectURL(new Blob([toMermaid(editor.getDocument())], { type: 'text/plain' }));
  const link = document.createElement('a'); link.href = url; link.download = 'diagrama.kairo.mmd'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Diagrama exportado como texto Mermaid.');
};
$('#export-text-styled').onclick = () => {
  const url = URL.createObjectURL(new Blob([toMermaidStyled(editor.getDocument())], { type: 'text/plain' }));
  const link = document.createElement('a'); link.href = url; link.download = 'diagrama.estilo.mmd'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Mermaid con estilo (colores por tipo) exportado.');
};
$('#export-dot').onclick = () => {
  const url = URL.createObjectURL(new Blob([toDotText(editor.getDocument())], { type: 'text/vnd.graphviz' }));
  const link = document.createElement('a'); link.href = url; link.download = 'diagrama.kairo.dot'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Diagrama exportado como DOT.');
};
$('#export-dot-pos').onclick = () => {
  const url = URL.createObjectURL(new Blob([toDotText(editor.getDocument(), { positions: true })], { type: 'text/vnd.graphviz' }));
  const link = document.createElement('a'); link.href = url; link.download = 'diagrama.posicionado.dot'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('DOT con posiciones exportado (Graphviz neato -n).');
};
$('#export-canvas').onclick = () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(toCanvas(editor.getDocument()), null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = 'diagrama.canvas'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Diagrama exportado como JSON Canvas.');
};
$('#export-html').onclick = () => {
  const url = URL.createObjectURL(new Blob([toHtml(editor.getDocument(), { theme: activeTheme, includeTags: true, title: 'Diagrama Kairo', links: true, tooltips: true })], { type: 'text/html' }));
  const link = document.createElement('a'); link.href = url; link.download = 'diagrama.kairo.html'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Diagrama exportado como HTML interactivo.');
};
$('#export-excalidraw').onclick = () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(toExcalidraw(editor.getDocument()), null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = 'diagrama.excalidraw'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Diagrama exportado para Excalidraw.');
};
$('#export-csv').onclick = () => {
  const url = URL.createObjectURL(new Blob([toCsv(editor.getDocument())], { type: 'text/csv' }));
  const link = document.createElement('a'); link.href = url; link.download = 'diagrama.kairo.csv'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Diagrama exportado como CSV.');
};
$('#export-matrix').onclick = () => {
  const url = URL.createObjectURL(new Blob([toMatrixCsv(editor.getDocument())], { type: 'text/csv' }));
  const link = document.createElement('a'); link.href = url; link.download = 'diagrama.matriz.csv'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Matriz de adyacencia exportada (CSV).');
};
$('#export-reach-matrix').onclick = () => {
  const url = URL.createObjectURL(new Blob([toReachabilityCsv(editor.getDocument())], { type: 'text/csv' }));
  const link = document.createElement('a'); link.href = url; link.download = 'diagrama.alcance.csv'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Matriz de alcance exportada (CSV).');
};
$('#export-csv-nodes').onclick = () => {
  const url = URL.createObjectURL(new Blob([toCsvNodes(editor.getDocument())], { type: 'text/csv' }));
  const link = document.createElement('a'); link.href = url; link.download = 'nodos.csv'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Inventario de nodos exportado (CSV).');
};
$('#export-graphml').onclick = () => {
  const url = URL.createObjectURL(new Blob([toGraphml(editor.getDocument())], { type: 'application/graphml+xml' }));
  const link = document.createElement('a'); link.href = url; link.download = 'diagrama.graphml'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Diagrama exportado como GraphML.');
};
$('#export-gexf').onclick = () => {
  const url = URL.createObjectURL(new Blob([toGexf(editor.getDocument())], { type: 'application/gexf+xml' }));
  const link = document.createElement('a'); link.href = url; link.download = 'diagrama.gexf'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Diagrama exportado como GEXF.');
};
$('#export-gml').onclick = () => {
  const url = URL.createObjectURL(new Blob([toGml(editor.getDocument())], { type: 'text/plain' }));
  const link = document.createElement('a'); link.href = url; link.download = 'diagrama.gml'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Diagrama exportado como GML.');
};
$('#export-pajek').onclick = () => {
  const url = URL.createObjectURL(new Blob([toPajek(editor.getDocument())], { type: 'text/plain' }));
  const link = document.createElement('a'); link.href = url; link.download = 'diagrama.net'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Diagrama exportado como Pajek (.net).');
};
$('#export-drawio').onclick = () => {
  const url = URL.createObjectURL(new Blob([toDrawio(editor.getDocument())], { type: 'application/xml' }));
  const link = document.createElement('a'); link.href = url; link.download = 'diagrama.drawio'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Diagrama exportado como draw.io.');
};
$('#export-puml').onclick = () => {
  const url = URL.createObjectURL(new Blob([toPlantuml(editor.getDocument())], { type: 'text/plain' }));
  const link = document.createElement('a'); link.href = url; link.download = 'diagrama.puml'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Diagrama exportado como PlantUML.');
};
$('#export-puml-mindmap').onclick = () => {
  const url = URL.createObjectURL(new Blob([toPlantumlMindmap(editor.getDocument())], { type: 'text/plain' }));
  const link = document.createElement('a'); link.href = url; link.download = 'diagrama.mindmap.puml'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Diagrama exportado como PlantUML mindmap.');
};
$('#export-d2').onclick = () => {
  const url = URL.createObjectURL(new Blob([toD2(editor.getDocument())], { type: 'text/plain' }));
  const link = document.createElement('a'); link.href = url; link.download = 'diagrama.d2'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Diagrama exportado como D2.');
};
$('#export-nomnoml').onclick = () => {
  const url = URL.createObjectURL(new Blob([toNomnoml(editor.getDocument())], { type: 'text/plain' }));
  const link = document.createElement('a'); link.href = url; link.download = 'diagrama.nomnoml'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Diagrama exportado como nomnoml.');
};
$('#export-tgf').onclick = () => {
  const url = URL.createObjectURL(new Blob([toTgf(editor.getDocument())], { type: 'text/plain' }));
  const link = document.createElement('a'); link.href = url; link.download = 'diagrama.tgf'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Diagrama exportado como TGF.');
};
$('#export-dgml').onclick = () => {
  const url = URL.createObjectURL(new Blob([toDgml(editor.getDocument())], { type: 'application/xml' }));
  const link = document.createElement('a'); link.href = url; link.download = 'diagrama.dgml'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Diagrama exportado como DGML.');
};
$('#export-structurizr').onclick = () => {
  const url = URL.createObjectURL(new Blob([toStructurizr(editor.getDocument(), { name: 'Kairo' })], { type: 'text/plain' }));
  const link = document.createElement('a'); link.href = url; link.download = 'diagrama.dsl'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Diagrama exportado como Structurizr DSL (C4).');
};
$('#export-c4').onclick = () => {
  const url = URL.createObjectURL(new Blob([toMermaidC4(editor.getDocument(), { title: 'Kairo' })], { type: 'text/plain' }));
  const link = document.createElement('a'); link.href = url; link.download = 'diagrama.c4.mmd'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Diagrama exportado como Mermaid C4.');
};
$('#export-arch').onclick = () => {
  const url = URL.createObjectURL(new Blob([toMermaidArchitecture(editor.getDocument(), { title: 'Kairo' })], { type: 'text/plain' }));
  const link = document.createElement('a'); link.href = url; link.download = 'diagrama.arquitectura.mmd'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Diagrama exportado como Mermaid architecture-beta.');
};
$('#export-block').onclick = () => {
  const url = URL.createObjectURL(new Blob([toMermaidBlock(editor.getDocument())], { type: 'text/plain' }));
  const link = document.createElement('a'); link.href = url; link.download = 'diagrama.block.mmd'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Diagrama exportado como Mermaid block-beta.');
};
$('#export-cy').onclick = () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(toCytoscape(editor.getDocument()), null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = 'diagrama.cyjs'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Diagrama exportado como Cytoscape JSON.');
};
$('#export-visjs').onclick = () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(toVisNetwork(editor.getDocument()), null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = 'diagrama.visjs.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Diagrama exportado como vis-network.');
};
$('#export-nodelink').onclick = () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(toNodeLink(editor.getDocument()), null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = 'diagrama.nodelink.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Diagrama exportado como node-link JSON.');
};
$('#export-graphology').onclick = () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(toGraphology(editor.getDocument()), null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = 'diagrama.graphology.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Diagrama exportado como graphology (Sigma.js).');
};
$('#export-hierarchy').onclick = () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(toHierarchy(editor.getDocument()), null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = 'diagrama.hierarchy.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Jerarquía JSON (d3.hierarchy) exportada.');
};
$('#export-elk').onclick = () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(toElk(editor.getDocument()), null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = 'diagrama.elk.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Diagrama exportado como ELK JSON.');
};
$('#export-jgf').onclick = () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(toJgf(editor.getDocument()), null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = 'diagrama.jgf.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Diagrama exportado como JGF.');
};
$('#export-opml').onclick = () => {
  const url = URL.createObjectURL(new Blob([toOpml(editor.getDocument(), { title: 'Diagrama Kairo' })], { type: 'text/xml' }));
  const link = document.createElement('a'); link.href = url; link.download = 'diagrama.opml'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Diagrama exportado como OPML.');
};
$('#export-bpmn').onclick = () => {
  const url = URL.createObjectURL(new Blob([toBpmn(editor.getDocument())], { type: 'application/xml' }));
  const link = document.createElement('a'); link.href = url; link.download = 'diagrama.bpmn'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Diagrama exportado como BPMN 2.0.');
};
$('#export-markdown').onclick = () => {
  const url = URL.createObjectURL(new Blob([toMarkdown(editor.getDocument(), { title: 'Diagrama Kairo' })], { type: 'text/markdown' }));
  const link = document.createElement('a'); link.href = url; link.download = 'diagrama.kairo.md'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Diagrama exportado como Markdown.');
};
$('#export-md-tables').onclick = () => {
  const url = URL.createObjectURL(new Blob([toMarkdownTables(editor.getDocument(), { title: 'Diagrama Kairo' })], { type: 'text/markdown' }));
  const link = document.createElement('a'); link.href = url; link.download = 'diagrama.tablas.md'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Tablas Markdown exportadas.');
};
$('#export-legend').onclick = () => {
  const svg = toLegend(editor.getDocument(), { theme: activeTheme, title: 'Tipos de nodo' });
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  const link = document.createElement('a'); link.href = url; link.download = 'diagrama.leyenda.svg'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Leyenda exportada como SVG.');
};
$('#export-category').onclick = () => {
  const svg = toCategorySvg(editor.getDocument(), { by: 'group', theme: activeTheme });
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  const link = document.createElement('a'); link.href = url; link.download = 'diagrama.categorias.svg'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('SVG por categoría exportado (coloreado por grupo).');
};
$('#export-treemap').onclick = () => {
  const url = URL.createObjectURL(new Blob([toTreemapSvg(editor.getDocument())], { type: 'image/svg+xml' }));
  const link = document.createElement('a'); link.href = url; link.download = 'diagrama.treemap.svg'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Treemap exportado (jerarquía por tamaño).');
};
$('#export-matrix-svg').onclick = () => {
  const url = URL.createObjectURL(new Blob([toMatrixSvg(editor.getDocument())], { type: 'image/svg+xml' }));
  const link = document.createElement('a'); link.href = url; link.download = 'diagrama.matriz.svg'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Matriz de adyacencia (SVG) exportada.');
};
$('#export-arc').onclick = () => {
  const url = URL.createObjectURL(new Blob([toArcSvg(editor.getDocument())], { type: 'image/svg+xml' }));
  const link = document.createElement('a'); link.href = url; link.download = 'diagrama.arcos.svg'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Diagrama de arcos (SVG) exportado.');
};
$('#export-chord').onclick = () => {
  const url = URL.createObjectURL(new Blob([toChordSvg(editor.getDocument())], { type: 'image/svg+xml' }));
  const link = document.createElement('a'); link.href = url; link.download = 'diagrama.cuerdas.svg'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Diagrama de cuerdas (SVG) exportado.');
};
$('#export-sunburst').onclick = () => {
  const url = URL.createObjectURL(new Blob([toSunburstSvg(editor.getDocument())], { type: 'image/svg+xml' }));
  const link = document.createElement('a'); link.href = url; link.download = 'diagrama.sunburst.svg'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Sunburst (SVG) exportado.');
};
$('#export-icicle').onclick = () => {
  const url = URL.createObjectURL(new Blob([toIcicleSvg(editor.getDocument())], { type: 'image/svg+xml' }));
  const link = document.createElement('a'); link.href = url; link.download = 'diagrama.icicle.svg'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Icicle (SVG) exportado.');
};
$('#export-sankey-svg').onclick = () => {
  const url = URL.createObjectURL(new Blob([toSankeySvg(editor.getDocument())], { type: 'image/svg+xml' }));
  const link = document.createElement('a'); link.href = url; link.download = 'diagrama.sankey.svg'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Sankey (SVG) exportado.');
};
$('#export-report').onclick = () => {
  const url = URL.createObjectURL(new Blob([toReport(editor.getDocument(), { title: 'Informe del diagrama' })], { type: 'text/markdown' }));
  const link = document.createElement('a'); link.href = url; link.download = 'diagrama.informe.md'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Informe exportado como Markdown.');
};
$('#export-stats-card').onclick = () => {
  const url = URL.createObjectURL(new Blob([toStatsCard(editor.getDocument(), { title: 'Métricas del diagrama' })], { type: 'image/svg+xml' }));
  const link = document.createElement('a'); link.href = url; link.download = 'diagrama.metricas.svg'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Tarjeta de métricas (SVG) exportada.');
};
$('#export-report-page').onclick = () => {
  const url = URL.createObjectURL(new Blob([toReportPage(editor.getDocument(), { title: 'Informe del diagrama' })], { type: 'text/html' }));
  const link = document.createElement('a'); link.href = url; link.download = 'diagrama.informe.html'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Página de informe (HTML) exportada.');
};
$('#export-procedure').onclick = () => {
  const url = URL.createObjectURL(new Blob([toProcedure(editor.getDocument(), { title: 'Procedimiento' })], { type: 'text/markdown' }));
  const link = document.createElement('a'); link.href = url; link.download = 'diagrama.procedimiento.md'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Procedimiento paso a paso exportado.');
};
$('#export-gantt').onclick = () => {
  const url = URL.createObjectURL(new Blob([toGantt(editor.getDocument(), { title: 'Cronograma' })], { type: 'text/plain' }));
  const link = document.createElement('a'); link.href = url; link.download = 'diagrama.gantt.mmd'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Cronograma Gantt (Mermaid) exportado.');
};
$('#export-schedule-csv').onclick = () => {
  const url = URL.createObjectURL(new Blob([toScheduleCsv(editor.getDocument())], { type: 'text/csv' }));
  const link = document.createElement('a'); link.href = url; link.download = 'diagrama.cronograma.csv'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Cronograma CSV (CPM) exportado.');
};
$('#export-pie').onclick = () => {
  const url = URL.createObjectURL(new Blob([toPie(editor.getDocument(), { title: 'Composición' })], { type: 'text/plain' }));
  const link = document.createElement('a'); link.href = url; link.download = 'diagrama.pie.mmd'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Gráfico de composición (Mermaid pie) exportado.');
};
$('#export-quadrant').onclick = () => {
  const url = URL.createObjectURL(new Blob([toQuadrant(editor.getDocument(), { title: 'Roles de nodo' })], { type: 'text/plain' }));
  const link = document.createElement('a'); link.href = url; link.download = 'diagrama.cuadrante.mmd'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Cuadrante de roles (Mermaid quadrantChart) exportado.');
};
$('#export-sankey').onclick = () => {
  const url = URL.createObjectURL(new Blob([toSankey(editor.getDocument())], { type: 'text/plain' }));
  const link = document.createElement('a'); link.href = url; link.download = 'diagrama.sankey.mmd'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Sankey (Mermaid sankey-beta) exportado.');
};
$('#export-timeline').onclick = () => {
  const url = URL.createObjectURL(new Blob([toMermaidTimeline(editor.getDocument(), { title: 'Kairo' })], { type: 'text/plain' }));
  const link = document.createElement('a'); link.href = url; link.download = 'diagrama.timeline.mmd'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Línea de tiempo (Mermaid timeline) exportada.');
};
$('#export-readme').onclick = () => {
  const url = URL.createObjectURL(new Blob([toReadme(editor.getDocument(), { title: 'Diagrama Kairo' })], { type: 'text/markdown' }));
  const link = document.createElement('a'); link.href = url; link.download = 'README.diagrama.md'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('README del diagrama exportado.');
};
$('#export-tikz').onclick = () => {
  const url = URL.createObjectURL(new Blob([toTikz(editor.getDocument())], { type: 'text/plain' }));
  const link = document.createElement('a'); link.href = url; link.download = 'diagrama.tikz.tex'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Diagrama exportado como TikZ (LaTeX).');
};
$('#export-typst').onclick = () => {
  const url = URL.createObjectURL(new Blob([toTypst(editor.getDocument())], { type: 'text/plain' }));
  const link = document.createElement('a'); link.href = url; link.download = 'diagrama.typ'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Diagrama exportado como Typst (CeTZ).');
};
$('#export-ascii').onclick = () => {
  const url = URL.createObjectURL(new Blob([toAscii(editor.getDocument())], { type: 'text/plain' }));
  const link = document.createElement('a'); link.href = url; link.download = 'diagrama.txt'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Diagrama exportado como ASCII.');
};
$('#export-png').onclick = async () => {
  try {
    const blob = await toPNG(editor.getDocument(), { theme: activeTheme, includeTags: true, scale: 2, wrapLabels: true });
    // Embed the document so the PNG reopens as an editable diagram (like Excalidraw/draw.io).
    const withDoc = embedDocumentInPng(new Uint8Array(await blob.arrayBuffer()), editor.getDocument());
    const url = URL.createObjectURL(new Blob([withDoc as BlobPart], { type: 'image/png' }));
    const link = document.createElement('a'); link.href = url; link.download = 'diagrama.kairo.png'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Diagrama exportado como PNG.');
  } catch (error) { toast(`No se pudo exportar PNG: ${String(error)}`); }
};
$('#export-svg').onclick = () => {
  const svg = toSVG(editor.getDocument(), { theme: activeTheme, includeTags: true, links: true, tooltips: true, legend: true, wrapLabels: true });
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  const link = document.createElement('a'); link.href = url; link.download = 'diagrama.kairo.svg'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Diagrama exportado como SVG.');
};
$('#export-svg-editable').onclick = () => {
  const svg = toEditableSvg(editor.getDocument(), { theme: activeTheme, includeTags: true, wrapLabels: true });
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  const link = document.createElement('a'); link.href = url; link.download = 'diagrama.editable.svg'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('SVG editable exportado: vuelve a importarlo sin pérdida.');
};
$('#export-selection').onclick = () => {
  const ids = editor.getSelectedNodeIds();
  if (!ids.length) { toast('Selecciona uno o más nodos (Shift-clic) para exportar solo esa parte.'); return; }
  const svg = toSVG(subgraph(editor.getDocument(), ids), { theme: activeTheme, includeTags: true, wrapLabels: true });
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  const link = document.createElement('a'); link.href = url; link.download = 'seleccion.kairo.svg'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast(`Selección exportada como SVG (${ids.length} nodo(s)).`);
};
$('#share-link').onclick = async () => {
  const code = encodeDocument(editor.getDocument());
  const link = `${location.origin}${location.pathname}#d=${code}`;
  try { history.replaceState(null, '', `#d=${code}`); } catch { /* fragmento no disponible */ }
  try { await navigator.clipboard?.writeText(link); toast('Enlace para compartir copiado al portapapeles.'); }
  catch { toast('Enlace para compartir listo en la barra de direcciones.'); }
};
$('#export-ink').onclick = async () => {
  const md = toMermaidInkMarkdown(editor.getDocument(), { alt: 'Diagrama Kairo' });
  try { await navigator.clipboard?.writeText(md); toast('Imagen mermaid.ink (Markdown) copiada: pégala en un README.'); }
  catch { toast('Imagen mermaid.ink lista: ' + md.slice(0, 40) + '…'); }
};
$('#export-kroki').onclick = async () => {
  const md = toKrokiMarkdown(editor.getDocument(), { alt: 'Diagrama Kairo' });
  try { await navigator.clipboard?.writeText(md); toast('Imagen Kroki (Markdown) copiada: pégala en un README/wiki.'); }
  catch { toast('Imagen Kroki lista: ' + md.slice(0, 40) + '…'); }
};
$('#export-mermaidlive').onclick = async () => {
  const url = toMermaidLiveUrl(editor.getDocument());
  try { await navigator.clipboard?.writeText(url); toast('Enlace a mermaid.live copiado: ábrelo para editar el diagrama.'); }
  catch { toast('Enlace mermaid.live listo: ' + url.slice(0, 40) + '…'); }
};
// Deep-linking: restore a shared diagram from the URL fragment on load.
(() => {
  const shared = fromShareLink(location.hash);
  if (!shared) return;
  editor.setDocument(shared); editor.fit(); syncDocumentPresentation();
  savedRevision = documentRevision; savedSnapshot = editor.getDocument(); updateSaveStatus();
  toast('Diagrama cargado desde el enlace compartido.');
})();
window.addEventListener('keydown', e => {
  if ((e.target as HTMLElement).matches('input, select, textarea')) return;
  if (!editor.isReadOnly() && (e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === 'd') { e.preventDefault(); editor.duplicateSelected(); return; }
  if (e.metaKey || e.ctrlKey || e.altKey || editor.isReadOnly()) return;
  const tool = ({ v: 'select', h: 'pan', c: 'connect' } as Record<string, Tool>)[e.key.toLowerCase()];
  if (tool) setTool(tool);
  if (e.key.toLowerCase() === 'r') reverseSelected();
  if (e.key.toLowerCase() === 'f') { editor.getSelectedNodeIds().length ? editor.fitSelection() : editor.fit(); }
});
// Dropdown menus (Análisis/Layout/Importar/Exportar): click a trigger to toggle; outside click / Escape / item click closes.
function closeMenus(): void {
  for (const open of document.querySelectorAll('.cd-menu.open')) {
    open.classList.remove('open');
    open.querySelector('.cd-menu-trigger')?.setAttribute('aria-expanded', 'false');
  }
}
document.addEventListener('click', e => {
  const trigger = (e.target as Element).closest('.cd-menu-trigger');
  if (trigger) {
    const menu = trigger.parentElement!, wasOpen = menu.classList.contains('open');
    closeMenus();
    if (!wasOpen) { menu.classList.add('open'); trigger.setAttribute('aria-expanded', 'true'); }
    return;
  }
  if ((e.target as Element).closest('.cd-menu-panel')) { setTimeout(closeMenus, 0); return; } // an item ran; close after
  closeMenus();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenus(); });
// Right-click context menu: common editing actions on the node under the cursor.
const ctxItems: { label: string; run: () => void }[] = [
  { label: 'Duplicar', run: () => { editor.duplicateSelected(); } },
  { label: 'Copiar', run: () => { if (editor.copySelection()) toast('Copiado al portapapeles.'); } },
  { label: 'Pegar', run: () => { const ids = editor.paste(); if (ids.length) { syncDocumentPresentation(); toast(`Pegado: ${ids.length} nodo(s).`); } } },
  { label: 'Eliminar', run: () => { editor.removeSelected(); syncDocumentPresentation(); } },
  { label: 'Aislar selección', run: () => { const ids = editor.getSelectedNodeIds(); if (ids.length) { editor.replaceDocument(subgraph(editor.getDocument(), ids)); editor.fit(); syncDocumentPresentation(); } } },
  { label: 'Enfocar', run: () => { editor.getSelectedNodeIds().length ? editor.fitSelection() : editor.fit(); } },
];
const ctxEl = $('#ctxmenu');
const hideCtx = (): void => { ctxEl.hidden = true; };
$('#diagram').addEventListener('contextmenu', e => {
  e.preventDefault();
  const nodeEl = (e.target as Element).closest<SVGGElement>('[data-node]');
  if (nodeEl?.dataset.node && !editor.getSelectedNodeIds().includes(nodeEl.dataset.node)) editor.select({ kind: 'node', id: nodeEl.dataset.node });
  ctxEl.innerHTML = ctxItems.map((it, i) => `<button class="ctx-item" data-ci="${i}" ${[0,2,3,4].includes(i)?'data-mutation':''} role="menuitem">${escape(it.label)}</button>`).join('');
  ctxEl.style.left = `${Math.min(e.clientX, window.innerWidth - 190)}px`;
  ctxEl.style.top = `${Math.min(e.clientY, window.innerHeight - 230)}px`;
  ctxEl.hidden = false; updateAccess();
});
ctxEl.addEventListener('click', e => { const b = (e.target as Element).closest('[data-ci]'); if (b) { ctxItems[Number(b.getAttribute('data-ci'))].run(); hideCtx(); } });
document.addEventListener('click', e => { if (!(e.target as Element).closest('#ctxmenu')) hideCtx(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') hideCtx(); });
window.addEventListener('scroll', hideCtx, true);

// Command palette (Cmd/Ctrl+K): searchable index of every toolbar/header action; runs the matching button.
interface PaletteAction { label: string; el?: HTMLElement; run?: () => void }
let paletteActions: PaletteAction[] = [], paletteFiltered: PaletteAction[] = [], paletteIndex = 0;
function collectActions(): PaletteAction[] {
  const sel = '.canvas-options button[aria-label]:not(.cd-menu-trigger), .document-actions button[aria-label], .app-header button[aria-label], .diagram-toolbar button[aria-label]';
  const scraped = [...document.querySelectorAll<HTMLElement>(sel)].map(el => ({ label: el.getAttribute('aria-label')!.trim(), el })).filter(a => a.label);
  // Keyboard-only editing commands, exposed here so they are discoverable and runnable without shortcuts.
  const ops: PaletteAction[] = [
    { label: 'Copiar selección', run: () => { if (editor.copySelection()) toast('Copiado al portapapeles.'); } },
    { label: 'Cortar selección', run: () => { if (editor.cut()) { syncDocumentPresentation(); toast('Cortado.'); } } },
    { label: 'Pegar', run: () => { const ids = editor.paste(); if (ids.length) { syncDocumentPresentation(); toast(`Pegado: ${ids.length} nodo(s).`); } } },
    { label: 'Duplicar selección', run: () => { editor.duplicateSelected(); } },
    { label: 'Eliminar selección', run: () => { editor.removeSelected(); syncDocumentPresentation(); } },
    { label: 'Seleccionar todo', run: () => editor.selectNodes(editor.getDocument().graph.nodes.map(n => n.id)) },
    { label: 'Seleccionar aguas abajo', run: () => { const sel = editor.getSelection(); if (!sel || sel.kind !== 'node') { toast('Selecciona un nodo primero.'); return; } const down = descendants(editor.getDocument().graph, sel.id); editor.selectNodes([sel.id, ...down]); toast(`Seleccionados ${down.length + 1} nodo(s) (aguas abajo).`); } },
    { label: 'Seleccionar componente conexo', run: () => { const sel = editor.getSelection(); if (!sel || sel.kind !== 'node') { toast('Selecciona un nodo primero.'); return; } const comp = connectedComponents(editor.getDocument().graph).find(c => c.includes(sel.id)) ?? [sel.id]; editor.selectNodes(comp); toast(`Seleccionados ${comp.length} nodo(s) del componente.`); } },
    { label: 'Enfocar selección', run: () => { editor.getSelectedNodeIds().length ? editor.fitSelection() : editor.fit(); } },
  ];
  return [...scraped, ...ops];
}
function renderPalette(): void {
  const list = $('#palette-list');
  list.innerHTML = paletteFiltered.map((a, i) => `<li role="option" data-i="${i}" class="${i === paletteIndex ? 'active' : ''}" aria-selected="${i === paletteIndex}">${escape(a.label)}</li>`).join('') || '<li class="palette-empty">Sin resultados</li>';
}
function filterPalette(q: string): void {
  const needle = q.trim().toLowerCase();
  paletteFiltered = needle ? paletteActions.filter(a => a.label.toLowerCase().includes(needle)) : paletteActions;
  paletteIndex = 0; renderPalette();
}
function openPalette(): void {
  paletteActions = collectActions(); paletteFiltered = paletteActions; paletteIndex = 0;
  const input = $<HTMLInputElement>('#palette-input'); input.value = '';
  $('#palette').hidden = false; renderPalette(); input.focus();
}
function closePalette(): void { $('#palette').hidden = true; }
function runPalette(i: number): void {
  const action = paletteFiltered[i]; if (!action) return;
  const mutation = action.el ? action.el.hasAttribute('data-mutation') : !/^(Copiar|Seleccionar|Enfocar)/.test(action.label);
  if (editor.isReadOnly() && mutation) { toast('Activa la edición para usar esta acción.'); return; }
  closePalette(); if (action.run) action.run(); else action.el?.click();
}
$('#palette-input').addEventListener('input', e => filterPalette((e.target as HTMLInputElement).value));
$('#palette-input').addEventListener('keydown', e => {
  if (e.key === 'ArrowDown') { e.preventDefault(); paletteIndex = Math.min(paletteIndex + 1, paletteFiltered.length - 1); renderPalette(); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); paletteIndex = Math.max(paletteIndex - 1, 0); renderPalette(); }
  else if (e.key === 'Enter') { e.preventDefault(); runPalette(paletteIndex); }
  else if (e.key === 'Escape') { e.preventDefault(); closePalette(); }
});
$('#palette-list').addEventListener('click', e => { const li = (e.target as Element).closest('li[data-i]'); if (li) runPalette(Number(li.getAttribute('data-i'))); });
$('#palette').addEventListener('click', e => { if (e.target === $('#palette')) closePalette(); });
window.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); $('#palette').hidden ? openPalette() : closePalette(); }
});

window.addEventListener('pagehide', () => editor.destroy(), { once: true });

for (const button of document.querySelectorAll<HTMLButtonElement>('.cd-menu-panel > button')) {
  const label=document.createElement('span'); label.className='menu-label'; label.textContent=button.getAttribute('aria-label')??button.title; button.append(label);
}
studio=createStudio(editor,{theme:()=>activeTheme,edgeStyle:()=>$<HTMLSelectElement>('#route').value as 'smooth'|'rounded'|'orthogonal',notify:toast,stop:stopPlayer,changed:title=>{syncDocumentPresentation();if(title){$('h1').textContent=title;$('.document-card strong').textContent=title;}}});
$('#explore-examples').onclick=()=>studio!.showGallery();$('#open-workshop').onclick=()=>studio!.openWorkshop();
updateAccess=installAccess(editor).update;
const libraryTools=document.createElement('div');libraryTools.className='library-tools';libraryTools.innerHTML='<input id="library-search" type="search" aria-label="Buscar pieza" placeholder="Buscar pieza…"><div class="library-filters"><button data-category="all" aria-pressed="true">Todas</button><button data-category="flow" aria-pressed="false">Flujo</button><button data-category="software" aria-pressed="false">Software</button><button data-category="shapes" aria-pressed="false">Formas</button></div>';
$('.palette').before(libraryTools);
const shapeLibrary=document.createElement('div');shapeLibrary.className='shape-library';shapeLibrary.hidden=true;
const shapeCatalog=shapesDocument();
shapeLibrary.innerHTML=nodeShapes.map(shape=>{
  const node=shapeCatalog.graph.nodes.find(n=>n.id===shape)!,box=shapeCatalog.layout.nodes[shape];
  const preview=toSVG({version:2,graph:{nodes:[node],edges:[]},layout:{nodes:{[shape]:{...box,x:0,y:0}},edges:{}}},{padding:12,background:false});
  return `<button class="shape-piece" data-add-shape="${shape}" data-mutation draggable="true" title="Añadir ${shapeLabels[shape]}" aria-label="Añadir ${shapeLabels[shape]}"><span class="shape-preview" aria-hidden="true">${preview}</span><span>${shapeLabels[shape]}</span></button>`;
}).join('');
$('.palette').after(shapeLibrary);
function addShape(shape:typeof nodeShapes[number],position?:{x:number;y:number}):void {
  if(editor.isReadOnly())return;
  const {type,...box}=shapePreset(shape),v=editor.getViewport(),b=dropHost.getBoundingClientRect();
  editor.addNode(type,shapeLabels[shape],{...box,...(position??{x:(b.width/2-v.x)/v.zoom-box.width/2,y:(b.height/2-v.y)/v.zoom-box.height/2})});
  studio?.showProperties();
}
for(const button of shapeLibrary.querySelectorAll<HTMLElement>('[data-add-shape]')) {
  const shape=button.dataset.addShape as typeof nodeShapes[number];
  button.onclick=()=>addShape(shape);
  button.addEventListener('dragstart',e=>{if(editor.isReadOnly()){e.preventDefault();return;}e.dataTransfer?.setData('application/kairo-shape',shape);if(e.dataTransfer)e.dataTransfer.effectAllowed='copy';});
}
updateAccess();
let libraryCategory='all';
function filterLibrary():void {
  const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase();
  const q=normalize($<HTMLInputElement>('#library-search').value);
  $('.palette').hidden=libraryCategory==='shapes';shapeLibrary.hidden=libraryCategory!=='shapes';
  for(const button of document.querySelectorAll<HTMLElement>('[data-add], [data-add-shape]')) {
    const type=button.dataset.add!,flow=flowTypes.includes(type);
    button.hidden=!normalize(button.textContent??'').includes(q)||(libraryCategory==='flow'&&!flow)||(libraryCategory==='software'&&flow);
  }
}
$('#library-search').oninput=filterLibrary;
for(const button of libraryTools.querySelectorAll<HTMLButtonElement>('[data-category]'))button.onclick=()=>{libraryCategory=button.dataset.category!;libraryTools.querySelectorAll('[data-category]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));filterLibrary();};
for(const button of document.querySelectorAll<HTMLElement>('[data-add]')){button.draggable=true;button.addEventListener('dragstart',e=>{if(editor.isReadOnly()){e.preventDefault();return;}e.dataTransfer?.setData('application/kairo-node',button.dataset.add!);if(e.dataTransfer)e.dataTransfer.effectAllowed='copy';});}
dropHost.addEventListener('drop',e=>{if(editor.isReadOnly())return;const shape=e.dataTransfer?.getData('application/kairo-shape') as typeof nodeShapes[number];if(nodeShapes.includes(shape)){e.preventDefault();const b=dropHost.getBoundingClientRect(),v=editor.getViewport();addShape(shape,{x:(e.clientX-b.left-v.x)/v.zoom,y:(e.clientY-b.top-v.y)/v.zoom});return;}const type=e.dataTransfer?.getData('application/kairo-node') as NodeType;if(!nodeTypes.includes(type))return;e.preventDefault();const b=dropHost.getBoundingClientRect(),v=editor.getViewport();editor.addNode(type,`Nuevo ${nodeLabels[type]}`,{x:(e.clientX-b.left-v.x)/v.zoom,y:(e.clientY-b.top-v.y)/v.zoom});studio?.showProperties();});
window.addEventListener('pagehide',()=>studio?.destroy(),{once:true});

recovery=installRecovery(editor, {
  dirty:()=>documentRevision!==savedRevision, title:()=>$('h1').textContent??'', stop:stopPlayer, notify:toast,
  restored:title=>{syncDocumentPresentation(); if(title){$('h1').textContent=title;$('.document-card strong').textContent=title;} savedRevision=-1; updateSaveStatus();},
});
