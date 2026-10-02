import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toArcSvg } from '../packages/diagram/src/arc.ts';
import { createDocument } from '../packages/diagram/src/document.ts';

test('toArcSvg renders a dot per node and a quadratic arc per edge, with labels', () => {
  const d = createDocument({
    nodes: [{ id: 'a', type: 'process', title: 'Alpha' }, { id: 'b', type: 'process', title: 'Beta' }, { id: 'c', type: 'process', title: 'Gamma' }],
    edges: [{ id: 'e0', source: 'a', target: 'b' }, { id: 'e1', source: 'b', target: 'c' }],
  });
  const svg = toArcSvg(d);
  assert.ok(svg.startsWith('<svg') && svg.trim().endsWith('</svg>'));
  assert.equal((svg.match(/<circle /g) ?? []).length, 3); // one dot per node
  assert.equal((svg.match(/<path /g) ?? []).length, 2);    // one arc per edge
  assert.ok(svg.includes('Alpha') && svg.includes('Gamma'));
  assert.match(svg, /<path d="M [\d.]+ [\d.]+ Q /); // quadratic arc
});

test('toArcSvg colors forward and backward edges differently', () => {
  const d = createDocument({ nodes: [{ id: 'a', type: 'process', title: 'A' }, { id: 'b', type: 'process', title: 'B' }], edges: [{ id: 'e0', source: 'a', target: 'b' }, { id: 'e1', source: 'b', target: 'a' }] });
  const svg = toArcSvg(d, { forward: '#00ff00', backward: '#0000ff' });
  assert.ok(svg.includes('stroke="#00ff00"')); // a->b forward (idx 0 -> 1)
  assert.ok(svg.includes('stroke="#0000ff"')); // b->a backward (idx 1 -> 0)
});

test('toArcSvg skips self-loops, hides labels when crowded, and handles an empty graph', () => {
  const selfLoop = createDocument({ nodes: [{ id: 'a', type: 'process', title: 'A' }], edges: [{ id: 'e0', source: 'a', target: 'a' }] });
  assert.equal((toArcSvg(selfLoop).match(/<path /g) ?? []).length, 0); // self-loop not drawn as an arc
  const crowded = createDocument({ nodes: [{ id: 'a', type: 'process', title: 'A' }, { id: 'b', type: 'process', title: 'B' }], edges: [] });
  assert.ok(!toArcSvg(crowded, { gap: 10 }).includes('<text')); // tiny gap -> labels dropped
  assert.ok(toArcSvg(createDocument({ nodes: [], edges: [] })).startsWith('<svg'));
});
