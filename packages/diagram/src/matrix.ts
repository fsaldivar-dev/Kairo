import type { DiagramDocument, DiagramEdge, DiagramLayout, SemanticGraph } from './types';
import { parseDocument } from './document';
import { defaultPorts } from './geometry';
import { layers } from './layout';

/** Adjacency-matrix views of the graph — the square form NumPy (`np.array`), pandas (`read_csv(index_col=0)`),
 * MATLAB and Gephi consume, complementing the edge-list CSV. Directed: `matrix[i][j]` counts edges i→j. Pure. */
export interface AdjacencyMatrix { ids: string[]; labels: string[]; matrix: number[][] }

/** Builds the directed adjacency matrix. Rows/columns follow node declaration order; cells count parallel
 * edges. Self-loops land on the diagonal. */
export function toAdjacencyMatrix(graph: SemanticGraph): AdjacencyMatrix {
  const ids = graph.nodes.map(n => n.id), labels = graph.nodes.map(n => n.title);
  const index = new Map(ids.map((id, i) => [id, i])), n = ids.length;
  const matrix = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (const e of graph.edges) {
    const i = index.get(e.source), j = index.get(e.target);
    if (i === undefined || j === undefined) continue;
    matrix[i][j] += 1;
  }
  return { ids, labels, matrix };
}

export interface MatrixCsvOptions { delimiter?: string; useIds?: boolean; corner?: string }
const esc = (field: string, d: string): string => (field.includes(d) || field.includes('"') || field.includes('\n')) ? `"${field.replace(/"/g, '""')}"` : field;

/** Serializes the adjacency matrix to CSV with a labelled header row and first column (a "corner" cell tops
 * the header). Ready for `pandas.read_csv(…, index_col=0)` or a spreadsheet. */
export function toMatrixCsv(document: DiagramDocument, options: MatrixCsvOptions = {}): string {
  const d = options.delimiter ?? ',', corner = options.corner ?? 'node';
  const { ids, labels, matrix } = toAdjacencyMatrix(document.graph);
  const heads = options.useIds ? ids : labels;
  const rows = [[corner, ...heads].map(h => esc(h, d)).join(d)];
  for (let i = 0; i < ids.length; i++) rows.push([esc(heads[i], d), ...matrix[i].map(String)].join(d));
  return rows.join('\n');
}

/** Splits one delimited line honouring "quoted" fields and "" escapes; cells are trimmed. */
function splitRow(line: string, d: string): string[] {
  const out: string[] = []; let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) { if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else inQ = false; } else cur += c; }
    else if (c === '"') inQ = true;
    else if (c === d) { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out.map(s => s.trim());
}
const sanitizeId = (raw: string): string => raw.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 120) || 'n';

export interface MatrixImportOptions { delimiter?: string; nodeWidth?: number; nodeHeight?: number; gap?: number }

/** Imports an adjacency matrix (the square CSV NumPy/pandas/MATLAB/Gephi emit) into a validated v2 document —
 * the inverse of {@link toMatrixCsv}, closing the matrix round-trip. The first row is a header
 * (`corner, colLabel…`); each following row is `rowLabel, cell…`. A non-zero cell `matrix[i][j]=k` becomes
 * `k` directed edges rowᵢ→colⱼ (so parallel-edge counts survive the round-trip); the diagonal is a self-loop.
 * Delimiter auto-detected (comma/tab/semicolon) when omitted. Deterministic layered layout. Pure, no eval. */
export function fromMatrixCsv(csv: string, options: MatrixImportOptions = {}): DiagramDocument {
  const width = options.nodeWidth ?? 200, height = options.nodeHeight ?? 92, gap = options.gap ?? 64;
  const lines = csv.replace(/\r\n?/g, '\n').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  if (lines.length < 2) throw new Error('La matriz necesita una fila de cabecera y al menos una fila de datos.');
  const delim = options.delimiter ?? [',', '\t', ';'].map(d => [d, (lines[0].split(d).length - 1)] as const).sort((a, b) => b[1] - a[1])[0][0];
  const header = splitRow(lines[0], delim);
  const colLabels = header.slice(1);
  if (!colLabels.length) throw new Error('La cabecera de la matriz no declara columnas.');

  // Nodes come from the column labels; a row label not among them is appended (defensive, non-square input).
  const labelToId = new Map<string, string>(), order: string[] = [], titleById = new Map<string, string>();
  const used = new Set<string>();
  const ensure = (label: string): string => {
    const existing = labelToId.get(label); if (existing) return existing;
    let id = sanitizeId(label), i = 2; while (used.has(id)) id = `${sanitizeId(label)}-${i++}`;
    used.add(id); labelToId.set(label, id); order.push(id); titleById.set(id, label); return id;
  };
  for (const label of colLabels) ensure(label);
  const colIds = colLabels.map(l => labelToId.get(l)!);

  const edges: DiagramEdge[] = [];
  for (let r = 1; r < lines.length; r++) {
    const cells = splitRow(lines[r], delim);
    const rowId = ensure(cells[0] ?? `fila-${r}`);
    for (let c = 0; c < colIds.length; c++) {
      const v = Number(cells[c + 1]);
      if (!Number.isFinite(v) || v <= 0) continue;
      const count = Math.min(Math.round(v), 1000);
      for (let k = 0; k < count; k++) edges.push({ id: `e-${edges.length}`, source: rowId, target: colIds[c] });
    }
  }

  const level = layers(order, edges), perLevel = new Map<number, number>();
  const nodeLayout: DiagramLayout['nodes'] = Object.create(null);
  for (const id of order) {
    const depth = level.get(id) ?? 0, slot = perLevel.get(depth) ?? 0; perLevel.set(depth, slot + 1);
    nodeLayout[id] = { x: slot * (width + gap) + 80, y: depth * (height + gap) + 80, width, height };
  }
  const graph: SemanticGraph = { nodes: order.map(id => ({ id, type: 'process', title: titleById.get(id)! })), edges };
  const edgeLayout: DiagramLayout['edges'] = Object.create(null);
  for (const e of edges) edgeLayout[e.id] = defaultPorts(nodeLayout[e.source], nodeLayout[e.target]);
  return parseDocument({ version: 2, graph, layout: { nodes: nodeLayout, edges: edgeLayout } });
}
