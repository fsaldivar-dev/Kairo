import type { DiagramDocument, DiagramEdge, NodeType, SemanticGraph } from './types';

export type FlowDiagnosticCode = 'start-count' | 'end-missing' | 'endpoint-missing' | 'start-incoming' | 'end-outgoing' | 'decision-branches' | 'branch-label' | 'branch-duplicate' | 'dead-end' | 'unreachable' | 'no-exit' | 'cycle';
export interface FlowDiagnostic {
  code: FlowDiagnosticCode;
  severity: 'error' | 'warning';
  message: string;
  nodeId?: string;
  edgeId?: string;
}
export interface FlowValidationOptions { allowCycles?: boolean; allowMultipleStarts?: boolean }

export type ArchitectureDiagnosticCode = 'ui-to-db' | 'db-initiates' | 'isolated-backend';
export interface ArchitectureDiagnostic { code: ArchitectureDiagnosticCode; severity: 'warning' | 'info'; message: string; nodeId?: string; edgeId?: string }
/** Heuristic advisories for architecture diagrams (not strict rules): a view wired straight to a database
 * (skipping the service layer), a database that initiates connections, and isolated backend nodes. Pure;
 * purely advisory — nothing here is a hard error. */
export function lintArchitecture(document: DiagramDocument): ArchitectureDiagnostic[] {
  const graph = document.graph, type = new Map(graph.nodes.map(n => [n.id, n.type]));
  const degree = new Map<string, number>(graph.nodes.map(n => [n.id, 0]));
  for (const e of graph.edges) { if (!type.has(e.source) || !type.has(e.target)) continue; degree.set(e.source, (degree.get(e.source) ?? 0) + 1); degree.set(e.target, (degree.get(e.target) ?? 0) + 1); }
  const out: ArchitectureDiagnostic[] = [];
  for (const e of graph.edges) {
    const s = type.get(e.source), t = type.get(e.target);
    if (!s || !t) continue;
    if ((s === 'screen' || s === 'component') && t === 'database') out.push({ code: 'ui-to-db', severity: 'warning', message: 'La vista accede directamente a la base de datos (salta la capa de servicio).', edgeId: e.id });
    else if (s === 'database' && t !== 'database') out.push({ code: 'db-initiates', severity: 'info', message: 'La base de datos inicia una conexión saliente (normalmente debería ser al revés).', edgeId: e.id });
  }
  for (const n of graph.nodes) if ((n.type === 'service' || n.type === 'api' || n.type === 'database') && (degree.get(n.id) ?? 0) === 0) out.push({ code: 'isolated-backend', severity: 'info', message: 'Nodo de backend sin conexiones.', nodeId: n.id });
  return out;
}

/** Structural validation only. Conditions are data, never executed or interpreted. */
export function validateFlow(graph: SemanticGraph, options: FlowValidationOptions = {}): FlowDiagnostic[] {
  const diagnostics: FlowDiagnostic[] = [];
  const nodes = new Map(graph.nodes.map(node => [node.id, node]));
  const outgoing = new Map<string, DiagramEdge[]>(), incoming = new Map<string, DiagramEdge[]>();
  for (const id of nodes.keys()) { outgoing.set(id, []); incoming.set(id, []); }
  for (const edge of graph.edges) {
    if (!nodes.has(edge.source) || !nodes.has(edge.target)) {
      diagnostics.push({ code: 'endpoint-missing', severity: 'error', message: 'La conexión tiene un origen o destino inexistente.', edgeId: edge.id });
      continue;
    }
    outgoing.get(edge.source)!.push(edge); incoming.get(edge.target)!.push(edge);
  }
  const starts = graph.nodes.filter(node => node.type === 'start');
  const ends = graph.nodes.filter(node => node.type === 'end');
  if (!starts.length || (!options.allowMultipleStarts && starts.length !== 1)) diagnostics.push({ code: 'start-count', severity: 'error', message: options.allowMultipleStarts ? 'El flujo necesita al menos un inicio.' : 'El flujo necesita exactamente un inicio.' });
  if (!ends.length) diagnostics.push({ code: 'end-missing', severity: 'error', message: 'El flujo necesita al menos un final.' });
  for (const node of graph.nodes) {
    const exits = outgoing.get(node.id)!;
    const error = (code: FlowDiagnosticCode, message: string) => diagnostics.push({ code, severity: 'error', message, nodeId: node.id });
    if (node.type === 'start' && incoming.get(node.id)!.length) error('start-incoming', 'Un inicio no debe tener conexiones entrantes.');
    if (node.type === 'end' && exits.length) error('end-outgoing', 'Un final no debe tener conexiones salientes.');
    if (node.type !== 'end' && !exits.length) error('dead-end', 'Este paso no tiene continuación; conéctalo o conviértelo en un final.');
    if (node.type === 'decision') {
      if (exits.length < 2) error('decision-branches', 'Una decisión necesita al menos dos alternativas.');
      const labels = new Set<string>();
      for (const edge of exits) {
        const label = edge.label?.trim().toLocaleLowerCase();
        if (!label) diagnostics.push({ code: 'branch-label', severity: 'error', message: 'Asigna un nombre a esta alternativa, por ejemplo Sí o No.', edgeId: edge.id, nodeId: node.id });
        else if (labels.has(label)) diagnostics.push({ code: 'branch-duplicate', severity: 'error', message: 'Las alternativas de una decisión deben tener nombres distintos.', edgeId: edge.id, nodeId: node.id });
        else labels.add(label);
      }
    }
  }
  const visit = (roots: string[], reverse: boolean): Set<string> => {
    const reached = new Set(roots), pending = [...roots];
    while (pending.length) {
      const id = pending.pop()!;
      for (const edge of (reverse ? incoming : outgoing).get(id) ?? []) {
        const next = reverse ? edge.source : edge.target;
        if (!reached.has(next)) { reached.add(next); pending.push(next); }
      }
    }
    return reached;
  };
  const reached = visit(starts.map(n => n.id), false), canFinish = visit(ends.map(n => n.id), true);
  for (const node of graph.nodes) {
    if (starts.length && !reached.has(node.id)) diagnostics.push({ code: 'unreachable', severity: 'warning', message: 'Este paso no es alcanzable desde un inicio.', nodeId: node.id });
    else if (ends.length && node.type !== 'end' && !canFinish.has(node.id)) diagnostics.push({ code: 'no-exit', severity: 'warning', message: 'Desde este paso no existe una ruta hacia un final.', nodeId: node.id });
  }
  // Iterative DFS keeps large graphs and loops away from the JS recursion limit.
  if (options.allowCycles === false) {
    const color = new Map<string, number>();
    for (const root of nodes.keys()) {
      if (color.has(root)) continue;
      color.set(root, 1);
      const stack = [{ id: root, next: 0 }];
      while (stack.length) {
        const frame = stack[stack.length - 1], edges = outgoing.get(frame.id)!;
        if (frame.next === edges.length) { color.set(frame.id, 2); stack.pop(); continue; }
        const edge = edges[frame.next++], state = color.get(edge.target);
        if (state === 1) diagnostics.push({ code: 'cycle', severity: 'error', message: 'Esta conexión forma un ciclo y el perfil actual no lo permite.', edgeId: edge.id });
        else if (!state) { color.set(edge.target, 1); stack.push({ id: edge.target, next: 0 }); }
      }
    }
  }
  return diagnostics;
}

/** A concise human/screen-reader summary of a graph: counts, flow roles and the first node titles. Pure. */
export function describeDiagram(graph: SemanticGraph): string {
  const n = graph.nodes.length, e = graph.edges.length;
  const count = (type: string) => graph.nodes.filter(node => node.type === type).length;
  const starts = count('start'), ends = count('end'), decisions = count('decision');
  let summary = `Diagrama con ${n} ${n === 1 ? 'nodo' : 'nodos'} y ${e} ${e === 1 ? 'conexión' : 'conexiones'}.`;
  if (starts || ends || decisions) summary += ` Flujo con ${starts} inicio${starts === 1 ? '' : 's'}, ${decisions} decisión${decisions === 1 ? '' : 'es'} y ${ends} final${ends === 1 ? '' : 'es'}.`;
  const titles = graph.nodes.slice(0, 5).map(node => node.title).filter(Boolean);
  if (titles.length) summary += ` Nodos: ${titles.join(', ')}${n > titles.length ? '…' : ''}.`;
  return summary;
}

export interface DiagramDiff { nodes: { added: string[]; removed: string[]; changed: string[] }; edges: { added: string[]; removed: string[]; changed: string[] } }
/** Compares two documents and returns added/removed/changed node and edge ids (semantics and layout). Pure; order-independent. */
export function diffDocuments(before: DiagramDocument, after: DiagramDocument): DiagramDiff {
  const nodeKey = (doc: DiagramDocument, id: string) => JSON.stringify([doc.graph.nodes.find(n => n.id === id), doc.layout.nodes[id]]);
  const edgeKey = (doc: DiagramDocument, id: string) => JSON.stringify([doc.graph.edges.find(e => e.id === id), doc.layout.edges[id]]);
  const diffPart = <T extends { id: string }>(a: T[], b: T[], key: (id: string) => string, keyB: (id: string) => string) => {
    const aIds = new Set(a.map(x => x.id)), bIds = new Set(b.map(x => x.id));
    const added = b.filter(x => !aIds.has(x.id)).map(x => x.id);
    const removed = a.filter(x => !bIds.has(x.id)).map(x => x.id);
    const changed = b.filter(x => aIds.has(x.id) && key(x.id) !== keyB(x.id)).map(x => x.id);
    return { added, removed, changed };
  };
  return {
    nodes: diffPart(before.graph.nodes, after.graph.nodes, id => nodeKey(before, id), id => nodeKey(after, id)),
    edges: diffPart(before.graph.edges, after.graph.edges, id => edgeKey(before, id), id => edgeKey(after, id)),
  };
}
/** A concise human-readable summary of what changed between two documents (e.g. "+2 nodos, −1 conexión,
 * 3 modificados"), for commit messages or PR descriptions. "Sin cambios" when identical. Pure. */
export function describeDiff(before: DiagramDocument, after: DiagramDocument): string {
  const d = diffDocuments(before, after), parts: string[] = [];
  const plural = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`;
  if (d.nodes.added.length) parts.push(`+${plural(d.nodes.added.length, 'nodo', 'nodos')}`);
  if (d.nodes.removed.length) parts.push(`−${plural(d.nodes.removed.length, 'nodo', 'nodos')}`);
  if (d.nodes.changed.length) parts.push(`${plural(d.nodes.changed.length, 'nodo modificado', 'nodos modificados')}`);
  if (d.edges.added.length) parts.push(`+${plural(d.edges.added.length, 'conexión', 'conexiones')}`);
  if (d.edges.removed.length) parts.push(`−${plural(d.edges.removed.length, 'conexión', 'conexiones')}`);
  if (d.edges.changed.length) parts.push(`${plural(d.edges.changed.length, 'conexión modificada', 'conexiones modificadas')}`);
  return parts.length ? parts.join(', ') : 'Sin cambios';
}

export interface GraphMetrics { nodeCount: number; edgeCount: number; byType: Partial<Record<NodeType, number>>; roots: string[]; leaves: string[]; isolated: string[]; depth: number; hasCycle: boolean; density: number }
/** Structural metrics of a graph: roots/leaves/isolated nodes, layer depth, cycle presence and edge density. Pure. */
export function analyzeGraph(graph: SemanticGraph): GraphMetrics {
  const ids = graph.nodes.map(n => n.id), idSet = new Set(ids);
  const incoming = new Map(ids.map(id => [id, 0] as [string, number])), outgoing = new Map(ids.map(id => [id, 0] as [string, number]));
  const adj = new Map<string, string[]>();
  let edgeCount = 0;
  for (const e of graph.edges) {
    if (!idSet.has(e.source) || !idSet.has(e.target)) continue;
    edgeCount++;
    outgoing.set(e.source, (outgoing.get(e.source) ?? 0) + 1);
    incoming.set(e.target, (incoming.get(e.target) ?? 0) + 1);
    if (e.source !== e.target) (adj.get(e.source) ?? adj.set(e.source, []).get(e.source)!).push(e.target);
  }
  const byType: Partial<Record<NodeType, number>> = {};
  for (const n of graph.nodes) byType[n.type] = (byType[n.type] ?? 0) + 1;
  const roots = ids.filter(id => (incoming.get(id) ?? 0) === 0);
  const leaves = ids.filter(id => (outgoing.get(id) ?? 0) === 0);
  const isolated = ids.filter(id => (incoming.get(id) ?? 0) === 0 && (outgoing.get(id) ?? 0) === 0);
  // Kahn pass for layer depth and cycle detection (ignoring self-loops in in-degree).
  const indeg = new Map(ids.map(id => [id, 0] as [string, number]));
  for (const e of graph.edges) if (idSet.has(e.source) && idSet.has(e.target) && e.source !== e.target) indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1);
  const level = new Map(ids.map(id => [id, 0] as [string, number]));
  const queue = ids.filter(id => (indeg.get(id) ?? 0) === 0);
  let processed = 0, depth = 0;
  for (let head = 0; head < queue.length; head++) {
    const id = queue[head]; processed++; depth = Math.max(depth, level.get(id) ?? 0);
    for (const t of adj.get(id) ?? []) { level.set(t, Math.max(level.get(t) ?? 0, (level.get(id) ?? 0) + 1)); const left = (indeg.get(t) ?? 1) - 1; indeg.set(t, left); if (left === 0) queue.push(t); }
  }
  const hasCycle = processed < ids.length || graph.edges.some(e => e.source === e.target && idSet.has(e.source));
  const n = ids.length;
  const density = n > 1 ? edgeCount / (n * (n - 1)) : 0;
  return { nodeCount: n, edgeCount, byType, roots, leaves, isolated, depth: n ? depth + 1 : 0, hasCycle, density };
}

export interface LintResult { ok: boolean; errors: number; warnings: number; diagnostics: FlowDiagnostic[]; metrics: GraphMetrics }
/** Runs structural validation plus metrics over a document. Flow validation is skipped for documents whose
 * `profile` is set to a non-flow value (e.g. 'architecture'). `ok` is false when there is any error diagnostic. Pure. */
export function lintDocument(document: DiagramDocument, options: FlowValidationOptions = {}): LintResult {
  // Flow rules (start/end/branches…) only apply to flow documents; a non-flow profile (e.g. architecture) opts out.
  const isFlow = !document.profile || document.profile === 'flow';
  const diagnostics = isFlow ? validateFlow(document.graph, options) : [];
  const errors = diagnostics.filter(d => d.severity === 'error').length;
  return { ok: errors === 0, errors, warnings: diagnostics.length - errors, diagnostics, metrics: analyzeGraph(document.graph) };
}

export interface OverlapOptions { padding?: number }
/** Returns every pair of node ids whose layout boxes overlap (axis-aligned, optional padding gap).
 * Pairs are ordered by document order; `[a, b]` has a before b. Pure. Useful as a layout-quality check. */
export function findOverlaps(document: DiagramDocument, options: OverlapOptions = {}): [string, string][] {
  const pad = options.padding ?? 0;
  const ids = document.graph.nodes.map(n => n.id).filter(id => document.layout.nodes[id]);
  const pairs: [string, string][] = [];
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
    const a = document.layout.nodes[ids[i]], b = document.layout.nodes[ids[j]];
    if (a.x < b.x + b.width + pad && a.x + a.width + pad > b.x && a.y < b.y + b.height + pad && a.y + a.height + pad > b.y) pairs.push([ids[i], ids[j]]);
  }
  return pairs;
}

/** Counts pairs of edges whose straight segments (node center to node center) properly cross. Edges that
 * share an endpoint are not counted (they meet at a node). A layout-quality metric: fewer is tidier. Pure. */
export function countCrossings(document: DiagramDocument): number {
  type Seg = { ax: number; ay: number; bx: number; by: number; s: string; t: string };
  const segs: Seg[] = [];
  for (const e of document.graph.edges) {
    const s = document.layout.nodes[e.source], t = document.layout.nodes[e.target];
    if (!s || !t || e.source === e.target) continue;
    segs.push({ ax: s.x + s.width / 2, ay: s.y + s.height / 2, bx: t.x + t.width / 2, by: t.y + t.height / 2, s: e.source, t: e.target });
  }
  const sign = (n: number): number => (n > 1e-9 ? 1 : n < -1e-9 ? -1 : 0);
  const ccw = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number): number => sign((bx - ax) * (cy - ay) - (by - ay) * (cx - ax));
  let count = 0;
  for (let i = 0; i < segs.length; i++) for (let j = i + 1; j < segs.length; j++) {
    const p = segs[i], q = segs[j];
    if (p.s === q.s || p.s === q.t || p.t === q.s || p.t === q.t) continue; // share a node
    const d1 = ccw(q.ax, q.ay, q.bx, q.by, p.ax, p.ay), d2 = ccw(q.ax, q.ay, q.bx, q.by, p.bx, p.by);
    const d3 = ccw(p.ax, p.ay, p.bx, p.by, q.ax, q.ay), d4 = ccw(p.ax, p.ay, p.bx, p.by, q.bx, q.by);
    if (d1 * d2 < 0 && d3 * d4 < 0) count++;
  }
  return count;
}

export interface LayoutMetrics {
  nodes: number; edges: number;
  /** Pairs of edges whose straight segments cross (fewer is tidier). */
  crossings: number;
  /** Pairs of nodes whose boxes overlap. */
  overlaps: number;
  /** Sum and mean of straight-line (centre-to-centre) edge lengths. */
  totalEdgeLength: number; averageEdgeLength: number;
  /** Axis-aligned bounding box of all node boxes. */
  width: number; height: number; area: number;
  /** Fraction of the bounding box covered by node boxes (0–1); higher is more compact. */
  density: number;
  /** width / height of the bounding box (0 when empty). */
  aspectRatio: number;
}
/** One-call layout-quality scorecard: edge crossings, node overlaps, edge-length totals and the bounding-box
 * shape/compactness. Lets you compare the toolkit's layouts (layered, tree, radial, circular, grid, organic,
 * cluster…) objectively and pick the tidiest, or gate a layout in CI. Straight centre-to-centre segments, matching
 * {@link countCrossings}. Composes countCrossings + findOverlaps. Pure. */
export function layoutMetrics(document: DiagramDocument, options: OverlapOptions = {}): LayoutMetrics {
  const boxes = document.graph.nodes.map(n => document.layout.nodes[n.id]).filter(Boolean);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, nodeArea = 0;
  for (const b of boxes) {
    minX = Math.min(minX, b.x); minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.width); maxY = Math.max(maxY, b.y + b.height);
    nodeArea += b.width * b.height;
  }
  const width = boxes.length ? maxX - minX : 0, height = boxes.length ? maxY - minY : 0, area = width * height;
  let total = 0, counted = 0;
  for (const e of document.graph.edges) {
    const s = document.layout.nodes[e.source], t = document.layout.nodes[e.target];
    if (!s || !t || e.source === e.target) continue;
    total += Math.hypot((t.x + t.width / 2) - (s.x + s.width / 2), (t.y + t.height / 2) - (s.y + s.height / 2));
    counted++;
  }
  return {
    nodes: document.graph.nodes.length, edges: document.graph.edges.length,
    crossings: countCrossings(document), overlaps: findOverlaps(document, options).length,
    totalEdgeLength: Math.round(total), averageEdgeLength: counted ? Math.round(total / counted) : 0,
    width: Math.round(width), height: Math.round(height), area: Math.round(area),
    density: area > 0 ? Math.min(1, +(nodeArea / area).toFixed(3)) : 0,
    aspectRatio: height > 0 ? +(width / height).toFixed(3) : 0,
  };
}

export interface HealthDiagnostic { code: string; severity: 'error' | 'warning' | 'info'; message: string; nodeId?: string; edgeId?: string }
export interface HealthResult { ok: boolean; errors: number; warnings: number; info: number; diagnostics: HealthDiagnostic[] }
/** One-call health check: combines structural validation (lintDocument) with architecture advisories
 * (lintArchitecture) into a unified list with error/warning/info counts. `ok` is false only on errors.
 * Handy as a CI gate. Pure. */
export function healthCheck(document: DiagramDocument, options: FlowValidationOptions = {}): HealthResult {
  const lint = lintDocument(document, options);
  const diagnostics: HealthDiagnostic[] = [
    ...lint.diagnostics.map(d => ({ code: d.code as string, severity: d.severity as HealthDiagnostic['severity'], message: d.message, nodeId: d.nodeId, edgeId: d.edgeId })),
    ...lintArchitecture(document).map(d => ({ code: d.code as string, severity: d.severity, message: d.message, nodeId: d.nodeId, edgeId: d.edgeId })),
  ];
  const errors = diagnostics.filter(d => d.severity === 'error').length;
  const warnings = diagnostics.filter(d => d.severity === 'warning').length;
  const info = diagnostics.filter(d => d.severity === 'info').length;
  return { ok: errors === 0, errors, warnings, info, diagnostics };
}
