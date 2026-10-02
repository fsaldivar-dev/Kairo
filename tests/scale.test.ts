import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDocument } from '../packages/diagram/src/document.ts';
import { autoLayout } from '../packages/diagram/src/layout.ts';
import { toSVG, toThumbnail } from '../packages/diagram/src/export.ts';
import { validateFlow } from '../packages/diagram/src/flow.ts';
import type { DiagramDocument } from '../packages/diagram/src/types.ts';

/** A branching DAG of `n` nodes: a chain with a side branch every 8th node. */
function bigDocument(n: number): DiagramDocument {
  const graph = { nodes: [] as { id: string; type: 'process'; title: string }[], edges: [] as { id: string; source: string; target: string }[] };
  const layoutNodes: Record<string, { x: number; y: number; width: number; height: number }> = {};
  for (let i = 0; i < n; i++) { graph.nodes.push({ id: 'n' + i, type: 'process', title: 'Node ' + i }); layoutNodes['n' + i] = { x: (i % 20) * 240, y: Math.floor(i / 20) * 150, width: 200, height: 92 }; }
  const layoutEdges: Record<string, { sourcePort: 'right'; targetPort: 'left' }> = {};
  for (let i = 1; i < n; i++) { graph.edges.push({ id: 'e' + i, source: 'n' + (i - 1), target: 'n' + i }); layoutEdges['e' + i] = { sourcePort: 'right', targetPort: 'left' }; }
  for (let i = 8; i < n; i += 8) { graph.edges.push({ id: 'b' + i, source: 'n' + (i - 8), target: 'n' + i }); layoutEdges['b' + i] = { sourcePort: 'right', targetPort: 'left' }; }
  return parseDocument({ version: 2, graph, layout: { nodes: layoutNodes, edges: layoutEdges } });
}

test('parse, autoLayout, toSVG and toThumbnail handle a 2000-node document correctly', () => {
  const doc = bigDocument(2000);
  assert.equal(doc.graph.nodes.length, 2000);
  const laid = autoLayout(doc);
  assert.equal(laid.graph.nodes.length, 2000);
  assert.ok(Object.values(laid.layout.nodes).every(b => Number.isFinite(b.x) && Number.isFinite(b.y)));
  const svg = toSVG(doc);
  assert.ok(svg.startsWith('<svg') && !/NaN|Infinity/.test(svg));
  assert.ok(svg.includes('Node 1999'));
  const thumb = toThumbnail(doc, { width: 160, height: 120 });
  assert.ok(thumb.startsWith('<svg') && !/NaN/.test(thumb));
});
test('validateFlow handles a 2000-node graph without overflow', () => {
  const doc = bigDocument(2000);
  assert.ok(Array.isArray(validateFlow(doc.graph, { allowCycles: false })));
});
