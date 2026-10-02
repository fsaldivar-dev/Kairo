import type { DiagramDocument } from './types';
import { layoutMetrics, type LayoutMetrics } from './flow';
import { autoLayout, treeLayout, radialLayout, circularLayout, gridLayout, organicLayout, clusterLayout } from './layout';

/** Smart auto-layout: run several of the toolkit's layouts, score each with {@link layoutMetrics}, and keep the
 * tidiest — something Mermaid/React Flow/draw.io don't do. Ranking prefers fewer edge crossings, then fewer node
 * overlaps, then shorter total edge length, then a denser (more compact) drawing; ties keep candidate order.
 * Pure and deterministic (every candidate layout is deterministic). */
export type LayoutName = 'layered' | 'tree' | 'radial' | 'circular' | 'grid' | 'organic' | 'cluster';

const BUILDERS: Record<LayoutName, (d: DiagramDocument) => DiagramDocument> = {
  layered: autoLayout, tree: treeLayout, radial: radialLayout, circular: circularLayout,
  grid: gridLayout, organic: organicLayout, cluster: clusterLayout,
};
/** Candidates tried by default. `cluster` is omitted (it needs groups); opt in via `candidates`. */
const DEFAULT_CANDIDATES: LayoutName[] = ['layered', 'tree', 'radial', 'circular', 'grid', 'organic'];

export interface BestLayoutOptions { candidates?: LayoutName[] }
export interface LayoutScore { name: LayoutName; metrics: LayoutMetrics; document: DiagramDocument }

/** Lower is better: crossings, then overlaps, then total edge length; a denser drawing wins the final tie. */
function compare(a: LayoutMetrics, b: LayoutMetrics): number {
  return a.crossings - b.crossings || a.overlaps - b.overlaps || a.totalEdgeLength - b.totalEdgeLength || b.density - a.density;
}

/** Lays the document out with each candidate and returns the scored results, best first. A candidate that throws
 * on this graph is skipped. Each result carries its re-laid `document`, so you can present alternatives. Pure. */
export function scoreLayouts(document: DiagramDocument, options: BestLayoutOptions = {}): LayoutScore[] {
  const names = (options.candidates ?? DEFAULT_CANDIDATES).filter((n, i, arr) => arr.indexOf(n) === i && n in BUILDERS);
  const scored: LayoutScore[] = [];
  for (const name of names) {
    try { const doc = BUILDERS[name](document); scored.push({ name, metrics: layoutMetrics(doc), document: doc }); }
    catch { /* a layout may reject some graphs; skip it */ }
  }
  return scored
    .map((s, i) => [s, i] as const)
    .sort((x, y) => compare(x[0].metrics, y[0].metrics) || x[1] - y[1]) // stable on ties -> candidate order
    .map(([s]) => s);
}

/** Returns the document re-laid with the best-scoring candidate layout. Falls back to the layered layout when no
 * candidate applies. Pure; the input is not mutated. */
export function bestLayout(document: DiagramDocument, options: BestLayoutOptions = {}): DiagramDocument {
  const scored = scoreLayouts(document, options);
  return scored.length ? scored[0].document : autoLayout(document);
}
