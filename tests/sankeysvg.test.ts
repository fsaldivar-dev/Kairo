import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toSankeySvg } from '../packages/diagram/src/sankeysvg.ts';
import { createDocument } from '../packages/diagram/src/document.ts';

test('toSankeySvg renders a bar per node and a ribbon per edge', () => {
  const d = createDocument({
    nodes: [{ id: 'a', type: 'process', title: 'Alpha' }, { id: 'b', type: 'process', title: 'Beta' }, { id: 'c', type: 'process', title: 'Gamma' }],
    edges: [{ id: 'e0', source: 'a', target: 'b' }, { id: 'e1', source: 'b', target: 'c' }],
  });
  const svg = toSankeySvg(d);
  assert.ok(svg.startsWith('<svg') && svg.trim().endsWith('</svg>'));
  assert.ok(svg.includes('role="img"') && svg.includes('aria-label="Diagrama Sankey"'));
  assert.equal((svg.match(/<rect x=/g) ?? []).length, 3); // one bar per node (plus the background rect has no x=)
  assert.equal((svg.match(/<path /g) ?? []).length, 2);   // one ribbon per edge
  assert.match(svg, /<path d="M [\d.]+ [\d.]+ C /);        // cubic-bezier ribbon
  assert.ok(svg.includes('Alpha') && svg.includes('Gamma'));
});

test('toSankeySvg layers nodes left-to-right by longest-path depth', () => {
  const d = createDocument({
    nodes: [{ id: 'a', type: 'process', title: 'A' }, { id: 'b', type: 'process', title: 'B' }, { id: 'c', type: 'process', title: 'C' }],
    edges: [{ id: 'e0', source: 'a', target: 'b' }, { id: 'e1', source: 'b', target: 'c' }],
  });
  const svg = toSankeySvg(d);
  const xs = [...svg.matchAll(/<rect x="([\d.]+)" y=/g)].map(m => Number(m[1]));
  assert.equal(xs.length, 3);
  assert.ok(xs[0] < xs[1] && xs[1] < xs[2]); // a (layer 0) left of b (layer 1) left of c (layer 2)
});

test('toSankeySvg scales bar height with throughput and skips self-loops', () => {
  // hub has out-degree 3 -> taller bar than a leaf (throughput 1)
  const d = createDocument({
    nodes: [{ id: 'h', type: 'process', title: 'Hub' }, { id: 'x', type: 'process', title: 'X' }, { id: 'y', type: 'process', title: 'Y' }, { id: 'z', type: 'process', title: 'Z' }],
    edges: [{ id: 'e0', source: 'h', target: 'x' }, { id: 'e1', source: 'h', target: 'y' }, { id: 'e2', source: 'h', target: 'z' }, { id: 'e3', source: 'h', target: 'h' }],
  });
  const svg = toSankeySvg(d);
  assert.equal((svg.match(/<path /g) ?? []).length, 3); // self-loop e3 dropped
  const heights = [...svg.matchAll(/<rect x="[\d.]+" y="[\d.]+" width="\d+" height="([\d.]+)"/g)].map(m => Number(m[1]));
  assert.equal(Math.max(...heights), 48); // hub throughput 3 * unit 16
  assert.equal(Math.min(...heights), 16); // leaf throughput 1 * unit 16
});

test('toSankeySvg handles an empty graph', () => {
  const svg = toSankeySvg(createDocument({ nodes: [], edges: [] }));
  assert.ok(svg.startsWith('<svg') && (svg.match(/<rect x=/g) ?? []).length === 0 && (svg.match(/<path /g) ?? []).length === 0);
});
