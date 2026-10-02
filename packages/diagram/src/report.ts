import type { DiagramDocument, DiagramEdge } from './types';
import { analyzeGraph, lintDocument, describeDiagram, countCrossings } from './flow';
import { centralNodes, degrees, distanceStats, topologicalGenerations, brokerNodes, influentialNodes, communities, criticalElements, findCycle, connectedComponents, topologicalOrder, criticalPathMethod, reachabilityMatrix } from './algorithms';

export interface ReportOptions { title?: string }

export interface GraphReport {
  nodes: number; edges: number; density: number; depth: number; stages: number;
  diameter: number; averagePathLength: number;
  hasCycle: boolean; cycle: string[] | null;
  roots: number; leaves: number; isolated: number; components: number; communities: number;
  articulationPoints: string[]; bridges: string[];
  topDegree: string[]; topBetweenness: string[]; topPageRank: string[];
}
/** One-call STRUCTURED analytics summary (the JSON counterpart to the Markdown toReport): counts, density,
 * depth/stages, distance stats, cycles, components/communities, single points of failure and the top nodes by
 * degree / betweenness / PageRank. For dashboards, CI gates and tooling. Pure; composes the analysis suite. */
export function graphReport(document: DiagramDocument): GraphReport {
  const g = document.graph, m = analyzeGraph(g), ds = distanceStats(g), crit = criticalElements(g);
  return {
    nodes: m.nodeCount, edges: m.edgeCount, density: m.density, depth: m.depth, stages: topologicalGenerations(g).length,
    diameter: ds.diameter, averagePathLength: ds.averagePathLength,
    hasCycle: m.hasCycle, cycle: findCycle(g),
    roots: m.roots.length, leaves: m.leaves.length, isolated: m.isolated.length,
    components: connectedComponents(g).length, communities: communities(g).length,
    articulationPoints: crit.articulationPoints, bridges: crit.bridges,
    topDegree: centralNodes(g, 3), topBetweenness: brokerNodes(g, 3), topPageRank: influentialNodes(g, 3),
  };
}
/** A human-readable Markdown report of a diagram's structure and health: summary metrics, key nodes and
 * lint diagnostics. Composes analyzeGraph + lintDocument + centralNodes. Pure. For docs and CI. */
export function toReport(document: DiagramDocument, options: ReportOptions = {}): string {
  const g = document.graph, m = analyzeGraph(g), lint = lintDocument(document);
  const title = new Map(g.nodes.map(n => [n.id, n.title]));
  const esc = (s: string): string => s.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim();
  const out: string[] = [`# ${esc(options.title ?? 'Informe del diagrama')}`, '', esc(describeDiagram(g)), '', '## Resumen', ''];
  out.push(`- Nodos: ${m.nodeCount}`);
  out.push(`- Conexiones: ${m.edgeCount}`);
  out.push(`- Raíces: ${m.roots.length}, Hojas: ${m.leaves.length}, Aislados: ${m.isolated.length}`);
  out.push(`- Profundidad: ${m.depth}`);
  out.push(`- Ciclos: ${m.hasCycle ? 'sí' : 'no'}`);
  out.push(`- Densidad: ${m.density.toFixed(3)}`);
  const ds = distanceStats(g);
  out.push(`- Diámetro: ${ds.diameter} (long. media de ruta ${ds.averagePathLength})`);
  const gens = topologicalGenerations(g);
  if (gens.length) out.push(`- Etapas (topológicas): ${gens.length} (máx. ${Math.max(...gens.map(w => w.length))} en paralelo)`);
  out.push(`- Cruces de aristas: ${countCrossings(document)}`);
  const byType = Object.entries(m.byType).map(([t, n]) => `${t} (${n})`).join(', ');
  if (byType) out.push(`- Por tipo: ${byType}`);
  out.push('', '## Nodos clave', '');
  const deg = new Map(degrees(g).map(d => [d.id, d.total]));
  const hubs = centralNodes(g, 3);
  if (hubs.length) for (const id of hubs) out.push(`- ${esc(title.get(id) ?? id)} (grado ${deg.get(id) ?? 0})`);
  else out.push('- (ninguno)');
  out.push('', '## Diagnósticos', '');
  if (lint.ok && !lint.diagnostics.length) out.push('- Sin problemas estructurales.');
  else {
    out.push(`- ${lint.errors} error(es), ${lint.warnings} aviso(s).`);
    for (const d of lint.diagnostics) out.push(`  - [${d.severity}] ${esc(d.message)}${d.nodeId ? ` (nodo ${esc(title.get(d.nodeId) ?? d.nodeId)})` : ''}`);
  }
  return out.join('\n').trimEnd() + '\n';
}

export interface ProcedureOptions { title?: string }
const pEsc = (s: string): string => s.replace(/\r?\n/g, ' ').trim();
/** Turns a flow diagram into a numbered, written step-by-step procedure (a runbook/SOP) — an output no other
 * diagram tool produces. Steps follow the topological order (declaration order as a fallback when the graph has a
 * cycle); each step lists its outgoing connections with their labels as branches, pointing to the target's step
 * number. Great for turning a flowchart into documentation. Pure; composes topologicalOrder. */
export function toProcedure(document: DiagramDocument, options: ProcedureOptions = {}): string {
  const g = document.graph;
  const order = topologicalOrder(g) ?? g.nodes.map(n => n.id);
  const step = new Map(order.map((id, i) => [id, i + 1]));
  const title = new Map(g.nodes.map(n => [n.id, n.title]));
  const typeOf = new Map(g.nodes.map(n => [n.id, n.type]));
  const outEdges = new Map<string, DiagramEdge[]>(g.nodes.map(n => [n.id, []]));
  for (const e of g.edges) outEdges.get(e.source)?.push(e);
  const out: string[] = [];
  if (options.title) out.push(`# ${pEsc(options.title)}`, '');
  order.forEach((id, i) => {
    out.push(`${i + 1}. **${pEsc(title.get(id) ?? id)}** _(${typeOf.get(id)})_`);
    const outs = outEdges.get(id) ?? [];
    if (!outs.length) { out.push('   - (fin)'); return; }
    for (const e of outs) {
      const tgt = pEsc(title.get(e.target) ?? e.target), sn = step.get(e.target);
      const label = e.label ? `**${pEsc(e.label)}** → ` : '→ ';
      out.push(`   - ${label}${tgt}${sn ? ` (paso ${sn})` : ''}`);
    }
  });
  return out.join('\n') + '\n';
}

export interface GanttOptions { title?: string; duration?: (id: string) => number }
const gEsc = (s: string): string => s.replace(/[\r\n:#]/g, ' ').trim() || ' ';
/** Turns a flow into a Mermaid `gantt` project timeline: every node becomes a task scheduled by the Critical
 * Path Method (earliest start + duration), grouped into `section`s by node group, with the zero-slack critical
 * tasks flagged `crit`. `dateFormat X` is used so the numeric CPM times render directly (unit durations by
 * default; pass `duration` for real ones). A genuinely new output — a flowchart becomes a schedulable plan you
 * can paste into Mermaid/GitLab/Notion. Falls back to a sequential schedule if the graph has a cycle. Pure. */
export function toGantt(document: DiagramDocument, options: GanttOptions = {}): string {
  const g = document.graph;
  const cpm = criticalPathMethod(g, options.duration ? { duration: options.duration } : {});
  const dur = (id: string) => { const d = options.duration ? options.duration(id) : 1; return Number.isFinite(d) && d > 0 ? d : 1; };
  const start = new Map<string, number>(), critical = new Set<string>();
  if (cpm) { for (const n of cpm.nodes) start.set(n.id, n.earliestStart); for (const id of cpm.critical) critical.add(id); }
  else { let t = 0; for (const n of g.nodes) { start.set(n.id, t); t += dur(n.id); } } // cyclic: lay out sequentially
  const title = new Map(g.nodes.map(n => [n.id, n.title]));
  const lines = ['gantt', `  title ${gEsc(options.title ?? 'Kairo')}`, '  dateFormat X', '  axisFormat %s'];
  const byGroup = new Map<string, DiagramDocument['graph']['nodes']>();
  for (const n of g.nodes) (byGroup.get(n.group ?? '') ?? byGroup.set(n.group ?? '', []).get(n.group ?? '')!).push(n);
  for (const [group, members] of byGroup) {
    lines.push(`  section ${gEsc(group || 'Flujo')}`);
    for (const n of members) {
      const tags = critical.has(n.id) ? 'crit, ' : '';
      lines.push(`  ${gEsc(title.get(n.id) ?? n.id)} :${tags}${n.id}, ${start.get(n.id) ?? 0}, ${dur(n.id)}`);
    }
  }
  return lines.join('\n') + '\n';
}

export interface PieOptions { title?: string; by?: 'type' | 'group' }
const pieEsc = (s: string): string => s.replace(/"/g, "'").replace(/[\r\n]/g, ' ').trim();
/** Summarises a diagram's composition as a Mermaid `pie` chart: the share of nodes by `type` (default) or by
 * `group`. Each node falls in exactly one slice (ungrouped nodes → "(sin grupo)"), slices sorted by count then
 * name. A compact "what is this diagram made of?" dashboard pasteable into Mermaid/GitLab/Notion. Pure. */
export function toPie(document: DiagramDocument, options: PieOptions = {}): string {
  const by = options.by ?? 'type';
  const counts = new Map<string, number>();
  for (const n of document.graph.nodes) {
    const key = by === 'group' ? (n.group || '(sin grupo)') : n.type;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const lines = [`pie title ${pieEsc(options.title ?? 'Composición')}`];
  for (const [key, count] of [...counts].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))) {
    lines.push(`  "${pieEsc(key)}" : ${count}`);
  }
  return lines.join('\n') + '\n';
}

export type QuadrantMetric = 'in' | 'out' | 'total';
export interface QuadrantOptions { title?: string; x?: QuadrantMetric; y?: QuadrantMetric; xLabel?: string; yLabel?: string; quadrants?: [string, string, string, string] }
const qEsc = (s: string): string => s.replace(/"/g, "'").replace(/[\r\n[\]]/g, ' ').trim();
/** Classifies every node into a Mermaid `quadrantChart` by two structural metrics — by default out-degree
 * ("alcance") on x and in-degree ("demanda") on y — each normalized to [0,1] by its maximum. The 0.5 threshold
 * then sorts nodes into roles: a source (high out/low in), a sink (low out/high in), a connector (high/high) or a
 * peripheral leaf (low/low). An automatic node-role classification no diagram tool offers; pasteable into
 * Mermaid. Pure; composes {@link degrees}. */
export function toQuadrant(document: DiagramDocument, options: QuadrantOptions = {}): string {
  const xSel = options.x ?? 'out', ySel = options.y ?? 'in';
  const pick = (d: { in: number; out: number; total: number }, s: QuadrantMetric) => s === 'in' ? d.in : s === 'total' ? d.total : d.out;
  const degs = degrees(document.graph);
  const maxX = Math.max(0, ...degs.map(d => pick(d, xSel))), maxY = Math.max(0, ...degs.map(d => pick(d, ySel)));
  const title = new Map(document.graph.nodes.map(n => [n.id, n.title]));
  const seen = new Map<string, number>();
  const [q1, q2, q3, q4] = options.quadrants ?? ['Conector', 'Sumidero', 'Periférico', 'Fuente'];
  const lines = [
    'quadrantChart',
    `  title ${qEsc(options.title ?? 'Roles de nodo')}`,
    `  x-axis ${qEsc(options.xLabel ?? 'Bajo alcance --> Alto alcance')}`,
    `  y-axis ${qEsc(options.yLabel ?? 'Baja demanda --> Alta demanda')}`,
    `  quadrant-1 ${qEsc(q1)}`, `  quadrant-2 ${qEsc(q2)}`, `  quadrant-3 ${qEsc(q3)}`, `  quadrant-4 ${qEsc(q4)}`,
  ];
  for (const d of degs) {
    const x = maxX ? +(pick(d, xSel) / maxX).toFixed(3) : 0, y = maxY ? +(pick(d, ySel) / maxY).toFixed(3) : 0;
    let label = qEsc(title.get(d.id) || d.id); const dup = seen.get(label) ?? 0; seen.set(label, dup + 1); if (dup) label = `${label} (${dup + 1})`;
    lines.push(`  "${label}": [${x}, ${y}]`);
  }
  return lines.join('\n') + '\n';
}

export interface SankeyOptions { weight?: (edge: DiagramEdge) => number }
const sankeyCell = (s: string): string => { const t = s.replace(/[\r\n]/g, ' ').trim() || '?'; return /[",]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
/** Exports the flow as a Mermaid `sankey-beta` diagram: every edge becomes a weighted link whose width shows
 * how much flow it carries. By default the weight is the number of source→sink paths that traverse the edge
 * (upstream path count × downstream path count on a DAG), so trunk edges render thick and leaf branches thin; a
 * `weight` callback overrides it, and a cyclic graph falls back to uniform weight 1. Rounds out Kairo's Mermaid
 * chart family (flow/C4/gantt/pie/quadrant) with a flow-volume view that competitors don't derive. Repeated node
 * titles are disambiguated so distinct nodes never merge, and self-loops are dropped. Pure; composes topologicalOrder. */
export function toSankey(document: DiagramDocument, options: SankeyOptions = {}): string {
  const g = document.graph;
  const title = new Map(g.nodes.map(n => [n.id, n.title]));
  const label = new Map<string, string>(), seen = new Map<string, number>();
  for (const n of g.nodes) { const base = (title.get(n.id) || n.id).replace(/[\r\n]/g, ' ').trim() || n.id; const dup = seen.get(base) ?? 0; seen.set(base, dup + 1); label.set(n.id, dup ? `${base} (${dup + 1})` : base); }
  let flow: ((e: DiagramEdge) => number) | null = null;
  if (!options.weight) {
    const order = topologicalOrder(g); // null when the graph has a cycle
    if (order) {
      const outEdges = new Map<string, DiagramEdge[]>(), inEdges = new Map<string, DiagramEdge[]>();
      const push = (m: Map<string, DiagramEdge[]>, k: string, e: DiagramEdge) => { const a = m.get(k); if (a) a.push(e); else m.set(k, [e]); };
      for (const e of g.edges) { if (e.source === e.target) continue; push(outEdges, e.source, e); push(inEdges, e.target, e); }
      const up = new Map<string, number>(), down = new Map<string, number>();
      for (const id of order) { const ins = inEdges.get(id) ?? []; up.set(id, ins.length ? ins.reduce((s, e) => s + (up.get(e.source) ?? 0), 0) : 1); }
      for (let i = order.length - 1; i >= 0; i--) { const id = order[i], outs = outEdges.get(id) ?? []; down.set(id, outs.length ? outs.reduce((s, e) => s + (down.get(e.target) ?? 0), 0) : 1); }
      flow = (e) => Math.max(1, (up.get(e.source) ?? 1) * (down.get(e.target) ?? 1));
    }
  }
  const weight = options.weight ?? flow ?? (() => 1);
  const rows: string[] = ['sankey-beta', ''];
  for (const e of g.edges) {
    if (e.source === e.target) continue; // a sankey has no self-loops
    const s = label.get(e.source), t = label.get(e.target);
    if (s == null || t == null) continue;
    rows.push(`${sankeyCell(s)},${sankeyCell(t)},${Math.max(0, weight(e))}`);
  }
  return rows.join('\n') + '\n';
}

export interface TimelineOptions { title?: string; period?: (index: number, ids: string[]) => string }
const tlEsc = (s: string): string => s.replace(/:/g, ';').replace(/[\r\n]/g, ' ').trim() || '?';
/** Exports the flow as a Mermaid `timeline` chart: each topological generation becomes a time `section` (its
 * order = the temporal step) and every node in that generation an event, so a process reads left-to-right as
 * "what happens, and when". Nodes that sit in a cycle (never reaching in-degree 0) are grouped in a final
 * "Ciclo" section. A new Mermaid chart target that competitors don't derive from a flow. Export only. Pure;
 * composes topologicalGenerations. */
export function toMermaidTimeline(document: DiagramDocument, options: TimelineOptions = {}): string {
  const g = document.graph, title = new Map(g.nodes.map(n => [n.id, n.title]));
  const gens = topologicalGenerations(g);
  const placed = new Set(gens.flat());
  const leftover = g.nodes.map(n => n.id).filter(id => !placed.has(id));
  const periods = leftover.length ? [...gens, leftover] : gens;
  const lines = ['timeline'];
  if (options.title) lines.push(`  title ${tlEsc(options.title)}`);
  periods.forEach((ids, i) => {
    const isLeftover = leftover.length > 0 && i === periods.length - 1;
    const name = options.period ? options.period(i, ids) : isLeftover ? 'Ciclo' : `Paso ${i + 1}`;
    lines.push(`  section ${tlEsc(name)}`);
    for (const id of ids) lines.push(`    ${tlEsc(title.get(id) ?? id)}`);
  });
  return lines.join('\n') + '\n';
}

export interface ScheduleCsvOptions { duration?: (id: string) => number }
const csvCell = (v: string | number | boolean): string => { const s = String(v); return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
/** Exports the Critical Path Method schedule as CSV — one row per node with id, title, type, earliest/latest
 * start & finish, slack and a `critical` flag — ready to open in Excel, Google Sheets, Smartsheet or any project
 * tool. Reuses {@link criticalPathMethod} (unit durations by default; pass `duration` for real times) and, when
 * the graph has a cycle, falls back to a sequential schedule. Rows follow node declaration order. Pure. */
export function toScheduleCsv(document: DiagramDocument, options: ScheduleCsvOptions = {}): string {
  const g = document.graph;
  const dur = (id: string) => { const d = options.duration ? options.duration(id) : 1; return Number.isFinite(d) && d > 0 ? d : 1; };
  const cpm = criticalPathMethod(g, options.duration ? { duration: options.duration } : {});
  type Row = { es: number; ef: number; ls: number; lf: number; slack: number; critical: boolean };
  const sched = new Map<string, Row>();
  if (cpm) { for (const n of cpm.nodes) sched.set(n.id, { es: n.earliestStart, ef: n.earliestFinish, ls: n.latestStart, lf: n.latestFinish, slack: n.slack, critical: n.critical }); }
  else { let t = 0; for (const n of g.nodes) { const d = dur(n.id); sched.set(n.id, { es: t, ef: t + d, ls: t, lf: t + d, slack: 0, critical: true }); t += d; } } // cyclic fallback
  const title = new Map(g.nodes.map(n => [n.id, n.title]));
  const type = new Map(g.nodes.map(n => [n.id, n.type]));
  const out = ['id,title,type,earliestStart,earliestFinish,latestStart,latestFinish,slack,critical'];
  for (const n of g.nodes) {
    const r = sched.get(n.id)!;
    out.push([n.id, title.get(n.id) ?? n.id, type.get(n.id) ?? '', r.es, r.ef, r.ls, r.lf, r.slack, r.critical].map(csvCell).join(','));
  }
  return out.join('\n') + '\n';
}

export interface StatsCardOptions { title?: string }
const svgEsc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** Renders a compact SVG "report card" infographic of a diagram's key metrics — nodes, connections, density,
 * depth, components and whether it is cyclic — as stat tiles. A shareable snapshot for READMEs, dashboards or
 * PR summaries, distinct from the diagram SVG (`toSVG`), the JSON ({@link graphReport}) and the Markdown
 * ({@link toReport}). Self-contained SVG string with literal colours (renders anywhere). Pure. */
export function toStatsCard(document: DiagramDocument, options: StatsCardOptions = {}): string {
  const r = graphReport(document);
  const tiles: Array<[string, string]> = [
    [String(r.nodes), 'Nodos'], [String(r.edges), 'Conexiones'], [String(r.density), 'Densidad'],
    [String(r.depth), 'Profundidad'], [String(r.components), 'Componentes'], [r.hasCycle ? 'Sí' : 'No', '¿Cíclico?'],
  ];
  const pad = 20, gap = 12, cols = 3, tileW = Math.round((480 - 2 * pad - (cols - 1) * gap) / cols), tileH = 72, top = 56;
  const rows = Math.ceil(tiles.length / cols), width = 480, height = top + rows * tileH + (rows - 1) * gap + pad;
  const cells = tiles.map(([value, label], i) => {
    const c = i % cols, row = Math.floor(i / cols), x = pad + c * (tileW + gap), y = top + row * (tileH + gap);
    return `<g transform="translate(${x} ${y})"><rect width="${tileW}" height="${tileH}" rx="10" fill="#f4f6fb" stroke="#e2e8f0"/>`
      + `<text x="${tileW / 2}" y="34" text-anchor="middle" font-size="26" font-weight="700" fill="#1e293b">${svgEsc(value)}</text>`
      + `<text x="${tileW / 2}" y="56" text-anchor="middle" font-size="12" fill="#64748b">${svgEsc(label)}</text></g>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="system-ui, sans-serif" role="img" aria-label="${svgEsc(options.title ?? 'Métricas del diagrama')}">`
    + `<rect width="${width}" height="${height}" rx="14" fill="#ffffff" stroke="#e2e8f0"/>`
    + `<text x="${pad}" y="36" font-size="18" font-weight="700" fill="#0f172a">${svgEsc(options.title ?? 'Métricas del diagrama')}</text>`
    + `${cells}</svg>`;
}

export interface ReportPageOptions { title?: string }
const hEsc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** Renders a self-contained HTML page summarising a diagram: a prose description, the SVG metrics card
 * ({@link toStatsCard}), a metrics table ({@link graphReport}) and the lint findings ({@link lintDocument}).
 * A shareable one-pager deliverable — distinct from `toHtml` (the interactive diagram) and `toReport` (Markdown).
 * No external assets or scripts. Pure. */
export function toReportPage(document: DiagramDocument, options: ReportPageOptions = {}): string {
  const title = options.title ?? 'Informe del diagrama', g = document.graph;
  const r = graphReport(document), lint = lintDocument(document);
  const rows: Array<[string, string]> = [
    ['Nodos', String(r.nodes)], ['Conexiones', String(r.edges)], ['Densidad', String(r.density)],
    ['Profundidad', String(r.depth)], ['Etapas', String(r.stages)], ['Diámetro', String(r.diameter)],
    ['Longitud media de ruta', String(r.averagePathLength)], ['Componentes', String(r.components)],
    ['Comunidades', String(r.communities)], ['Raíces', String(r.roots)], ['Hojas', String(r.leaves)],
    ['Aislados', String(r.isolated)], ['¿Cíclico?', r.hasCycle ? 'Sí' : 'No'],
  ];
  const table = rows.map(([k, v]) => `<tr><th>${hEsc(k)}</th><td>${hEsc(v)}</td></tr>`).join('');
  const diags = lint.diagnostics.length
    ? `<ul class="diag">${lint.diagnostics.map(d => `<li class="${d.severity}">${hEsc(d.severity === 'error' ? '✖' : '⚠')} ${hEsc(d.message)}</li>`).join('')}</ul>`
    : '<p class="ok">✓ Sin diagnósticos.</p>';
  const css = 'body{font-family:system-ui,sans-serif;margin:0;background:#f8fafc;color:#0f172a}'
    + 'main{max-width:720px;margin:0 auto;padding:32px 20px}h1{font-size:24px}h2{font-size:16px;margin-top:28px;color:#334155}'
    + 'p.desc{color:#475569}table{border-collapse:collapse;width:100%;font-size:14px}th,td{text-align:left;padding:6px 10px;border-bottom:1px solid #e2e8f0}'
    + 'th{color:#64748b;font-weight:600;width:50%}.diag{list-style:none;padding:0}.diag li{padding:6px 10px;border-radius:8px;margin:4px 0;font-size:14px}'
    + '.diag li.error{background:#fef2f2;color:#b91c1c}.diag li.warning{background:#fffbeb;color:#92400e}.ok{color:#15803d}svg{max-width:100%;height:auto}';
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>`
    + `<title>${hEsc(title)}</title><style>${css}</style></head><body><main>`
    + `<h1>${hEsc(title)}</h1><p class="desc">${hEsc(describeDiagram(g))}</p>`
    + `<div class="card">${toStatsCard(document, { title })}</div>`
    + `<h2>Métricas</h2><table>${table}</table>`
    + `<h2>Diagnósticos</h2>${diags}`
    + `</main></body></html>`;
}

/** Exports the reachability matrix ({@link reachabilityMatrix}) as CSV — a `from\to` header row of node ids and
 * one row per node with 1/0 for whether it can reach each other node (transitively). Opens in Excel/Sheets for
 * impact/dependency analysis. Pure. */
export function toReachabilityCsv(document: DiagramDocument): string {
  const { ids, reaches } = reachabilityMatrix(document.graph);
  const out = [['from\\to', ...ids].map(csvCell).join(',')];
  ids.forEach((id, i) => out.push([csvCell(id), ...reaches[i].map(b => (b ? '1' : '0'))].join(',')));
  return out.join('\n') + '\n';
}
