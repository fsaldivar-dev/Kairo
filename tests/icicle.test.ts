import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toIcicleSvg } from '../packages/diagram/src/icicle.ts';
import { createDocument } from '../packages/diagram/src/document.ts';

test('toIcicleSvg renders one band per depth with a rect per node', () => {
  const d = createDocument({
    nodes: [
      { id: 'root', type: 'start', title: 'Root' },
      { id: 'a', type: 'process', title: 'A' }, { id: 'b', type: 'process', title: 'B' },
      { id: 'a1', type: 'process', title: 'A1' },
    ],
    edges: [{ id: 'e0', source: 'root', target: 'a' }, { id: 'e1', source: 'root', target: 'b' }, { id: 'e2', source: 'a', target: 'a1' }],
  });
  const svg = toIcicleSvg(d, { width: 400, rowHeight: 40 });
  assert.ok(svg.startsWith('<svg') && svg.trim().endsWith('</svg>'));
  assert.ok(svg.includes('role="img"') && svg.includes('aria-label="Icicle"'));
  // background + 4 node rects
  assert.equal((svg.match(/<rect /g) ?? []).length, 5);
  // depth 0..2 -> height = 3 rows * 40
  assert.ok(svg.includes('height="120"'));
  // root band spans the full width on the top row (y="0")
  assert.match(svg, /<rect x="0" y="0" width="400"/);
  assert.ok(svg.includes('Root') && svg.includes('A1'));
});

test('toIcicleSvg places children below their parent and splits the width by subtree weight', () => {
  // root -> a (has 2 leaves) and b (leaf): a should be twice as wide as b on row 1
  const d = createDocument({
    nodes: [{ id: 'r', type: 'start', title: 'R' }, { id: 'a', type: 'process', title: 'A' }, { id: 'b', type: 'process', title: 'B' }, { id: 'a1', type: 'process', title: 'A1' }, { id: 'a2', type: 'process', title: 'A2' }],
    edges: [{ id: 'e0', source: 'r', target: 'a' }, { id: 'e1', source: 'r', target: 'b' }, { id: 'e2', source: 'a', target: 'a1' }, { id: 'e3', source: 'a', target: 'a2' }],
  });
  const svg = toIcicleSvg(d, { width: 300, rowHeight: 30 });
  // row 1 (y="30"): a width 200, b width 100 (weights 2 vs 1 of 300)
  assert.match(svg, /<rect x="0" y="30" width="200"/);
  assert.match(svg, /<rect x="200" y="30" width="100"/);
});

test('toIcicleSvg handles two roots and an empty graph', () => {
  const two = toIcicleSvg(createDocument({ nodes: [{ id: 'x', type: 'process', title: 'X' }, { id: 'y', type: 'process', title: 'Y' }], edges: [] }), { width: 200 });
  assert.equal((two.match(/<rect /g) ?? []).length, 3); // background + 2 roots side by side
  const empty = toIcicleSvg(createDocument({ nodes: [], edges: [] }));
  assert.ok(empty.startsWith('<svg') && (empty.match(/<rect /g) ?? []).length === 1); // background only
});
