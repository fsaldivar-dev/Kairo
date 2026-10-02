import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toTreemapSvg } from '../packages/diagram/src/treemap.ts';
import { createDocument } from '../packages/diagram/src/document.ts';

const rectCount = (svg: string) => (svg.match(/<rect /g) ?? []).length;

test('toTreemapSvg renders a rect per node plus the background and keeps labels', () => {
  const d = createDocument({
    nodes: [{ id: 'root', type: 'process', title: 'Root' }, { id: 'a', type: 'process', title: 'Alpha' }, { id: 'b', type: 'process', title: 'Beta' }],
    edges: [{ id: 'e0', source: 'root', target: 'a' }, { id: 'e1', source: 'root', target: 'b' }],
  });
  const svg = toTreemapSvg(d);
  assert.ok(svg.startsWith('<svg') && svg.trim().endsWith('</svg>'));
  assert.match(svg, /viewBox="0 0 640 420"/);
  assert.equal(rectCount(svg), 1 + 3); // background + 3 nodes
  assert.ok(svg.includes('Root') && svg.includes('Alpha') && svg.includes('Beta'));
});

test('toTreemapSvg sizes a heavier branch larger than a lighter one', () => {
  // root -> big (with 3 children) and small (leaf): big's subtree weight is larger.
  const d = createDocument({
    nodes: ['root', 'big', 'small', 'x', 'y', 'z'].map(id => ({ id, type: 'process' as const, title: id })),
    edges: [{ id: 'e0', source: 'root', target: 'big' }, { id: 'e1', source: 'root', target: 'small' }, { id: 'e2', source: 'big', target: 'x' }, { id: 'e3', source: 'big', target: 'y' }, { id: 'e4', source: 'big', target: 'z' }],
  });
  const svg = toTreemapSvg(d);
  // depth 1 split under root is horizontal: big and small get widths proportional to weight (big=4, small=1)
  const widths = [...svg.matchAll(/<rect x="[\d.]+" y="[\d.]+" width="([\d.]+)"/g)].map(m => Number(m[1]));
  const big = Math.max(...widths.filter(w => w < 640)); // ignore the full-width background
  assert.ok(big > 640 * 0.5); // the heavy branch takes more than half the width
});

test('toTreemapSvg handles an empty graph and a forest (multiple roots)', () => {
  assert.ok(toTreemapSvg(createDocument({ nodes: [], edges: [] })).startsWith('<svg'));
  const forest = createDocument({ nodes: [{ id: 'a', type: 'process', title: 'A' }, { id: 'b', type: 'process', title: 'B' }], edges: [] });
  assert.equal(rectCount(toTreemapSvg(forest)), 1 + 2); // bg + 2 roots
});
