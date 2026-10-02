import type { DiagramDocument } from './types';

/** Typst export via the CeTZ drawing package — Typst is a fast-growing LaTeX alternative for technical and
 * academic docs. Emits a self-contained `#cetz.canvas({ … })` block: each node a `rect` + centred label, each
 * edge a `line` with an arrow mark (dashed when the layout says so), optional edge labels at the midpoint.
 * Coordinates come from the layout (Y flipped, since Typst's axis points up) and are scaled to canvas units.
 * Labels are emitted as quoted Typst strings, so diagram text needs no markup escaping. Pure, export only. */
export interface TypstExportOptions {
  /** Pixels per canvas unit (default 60 → 120px node ≈ 2 units). */
  scale?: number;
  /** Emit the `#import "@preview/cetz:…"` line (default true). Set false to paste inside an existing import. */
  importLine?: boolean;
  /** CeTZ version for the import line (default '0.2.2'). */
  cetzVersion?: string;
}

const str = (s: string): string => '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, ' ') + '"';

export function toTypst(document: DiagramDocument, options: TypstExportOptions = {}): string {
  const scale = options.scale ?? 60, importLine = options.importLine !== false, version = options.cetzVersion ?? '0.2.2';
  const X = (px: number): number => +(px / scale).toFixed(3);
  const Y = (px: number): number => +(-px / scale).toFixed(3); // flip: Typst y points up
  const body: string[] = ['  import cetz.draw: *'];
  for (const node of document.graph.nodes) {
    const b = document.layout.nodes[node.id]; if (!b) continue;
    body.push(`  rect((${X(b.x)}, ${Y(b.y + b.height)}), (${X(b.x + b.width)}, ${Y(b.y)}))`);
    body.push(`  content((${X(b.x + b.width / 2)}, ${Y(b.y + b.height / 2)}), ${str(node.title)})`);
  }
  for (const edge of document.graph.edges) {
    const s = document.layout.nodes[edge.source], t = document.layout.nodes[edge.target];
    if (!s || !t) continue;
    const dashed = document.layout.edges[edge.id]?.dashed ? ', stroke: (dash: "dashed")' : '';
    body.push(`  line((${X(s.x + s.width / 2)}, ${Y(s.y + s.height / 2)}), (${X(t.x + t.width / 2)}, ${Y(t.y + t.height / 2)}), mark: (end: ">")${dashed})`);
    if (edge.label) body.push(`  content((${X((s.x + s.width / 2 + t.x + t.width / 2) / 2)}, ${Y((s.y + s.height / 2 + t.y + t.height / 2) / 2)}), ${str(edge.label)}, frame: "rect", fill: white, stroke: none, padding: 2pt)`);
  }
  const head = importLine ? [`#import "@preview/cetz:${version}"`, ''] : [];
  return [...head, '#cetz.canvas({', ...body, '})'].join('\n') + '\n';
}
