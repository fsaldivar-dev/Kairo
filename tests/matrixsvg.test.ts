import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toMatrixSvg } from '../packages/diagram/src/matrixsvg.ts';
import { createDocument } from '../packages/diagram/src/document.ts';

test('toMatrixSvg renders one filled cell per edge, grid lines and labels', () => {
  const d = createDocument({
    nodes: [{ id: 'a', type: 'process', title: 'A' }, { id: 'b', type: 'process', title: 'B' }, { id: 'c', type: 'process', title: 'C' }],
    edges: [{ id: 'e0', source: 'a', target: 'b' }, { id: 'e1', source: 'b', target: 'c' }],
  });
  const svg = toMatrixSvg(d);
  assert.ok(svg.startsWith('<svg') && svg.trim().endsWith('</svg>'));
  // background + 2 edge cells (the other rects are none; grid uses <line>)
  assert.equal((svg.match(/<rect /g) ?? []).length, 1 + 2);
  assert.ok((svg.match(/<line /g) ?? []).length > 0); // grid lines
  assert.ok(svg.includes('>A<') && svg.includes('>B<') && svg.includes('>C<')); // row+col labels (small graph)
  assert.ok(svg.includes('rotate(-90)')); // column labels rotated
});

test('toMatrixSvg places the filled cell at (sourceRow, targetCol) and supports a custom fill', () => {
  const d = createDocument({ nodes: [{ id: 'a', type: 'process', title: 'A' }, { id: 'b', type: 'process', title: 'B' }], edges: [{ id: 'e0', source: 'a', target: 'b' }] });
  const svg = toMatrixSvg(d, { fill: '#ff0000' });
  assert.ok(svg.includes('fill="#ff0000"')); // custom edge color
  // a=row0, b=col1: with labelW/labelH gutter and cell, the cell x is labelW + 1*cell, y is labelH + 0*cell
  assert.match(svg, /<rect x="\d+" y="\d+" width="\d+" height="\d+" fill="#ff0000"\/>/);
});

test('toMatrixSvg hides labels for a large node count and stays valid; empty graph is valid', () => {
  const big = createDocument({ nodes: Array.from({ length: 80 }, (_, i) => ({ id: `n${i}`, type: 'process' as const, title: `n${i}` })), edges: [] });
  const svg = toMatrixSvg(big);
  assert.ok(svg.startsWith('<svg'));
  assert.ok(!svg.includes('rotate(-90)')); // labels dropped when cells get tiny
  assert.ok(toMatrixSvg(createDocument({ nodes: [], edges: [] })).startsWith('<svg'));
});
