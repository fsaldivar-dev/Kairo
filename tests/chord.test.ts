import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toChordSvg } from '../packages/diagram/src/chord.ts';
import { createDocument } from '../packages/diagram/src/document.ts';

test('toChordSvg renders a dot per node and a quadratic chord per edge, with labels', () => {
  const d = createDocument({
    nodes: [{ id: 'a', type: 'process', title: 'Alpha' }, { id: 'b', type: 'process', title: 'Beta' }, { id: 'c', type: 'process', title: 'Gamma' }],
    edges: [{ id: 'e0', source: 'a', target: 'b' }, { id: 'e1', source: 'b', target: 'c' }, { id: 'e2', source: 'c', target: 'a' }],
  });
  const svg = toChordSvg(d);
  assert.ok(svg.startsWith('<svg') && svg.trim().endsWith('</svg>'));
  assert.equal((svg.match(/<circle /g) ?? []).length, 3); // one dot per node around the ring
  assert.equal((svg.match(/<path /g) ?? []).length, 3);    // one chord per edge
  assert.ok(svg.includes('Alpha') && svg.includes('Gamma'));
  assert.match(svg, /<path d="M [\d.]+ [\d.]+ Q /); // quadratic chord bowing to the centre
  assert.ok(svg.includes('role="img"') && svg.includes('aria-label="Diagrama de cuerdas"'));
});

test('toChordSvg honours custom colours and skips self-loops', () => {
  const d = createDocument({ nodes: [{ id: 'a', type: 'process', title: 'A' }, { id: 'b', type: 'process', title: 'B' }], edges: [{ id: 'e0', source: 'a', target: 'b' }, { id: 'e1', source: 'a', target: 'a' }] });
  const svg = toChordSvg(d, { stroke: '#00ff00', nodeFill: '#123456' });
  assert.ok(svg.includes('stroke="#00ff00"') && svg.includes('fill="#123456"'));
  assert.equal((svg.match(/<path /g) ?? []).length, 1); // self-loop e1 is not drawn as a chord
});

test('toChordSvg drops labels at a tiny radius and handles an empty graph', () => {
  const d = createDocument({ nodes: [{ id: 'a', type: 'process', title: 'A' }, { id: 'b', type: 'process', title: 'B' }], edges: [] });
  assert.ok(!toChordSvg(d, { radius: 50 }).includes('<text')); // small ring -> labels dropped
  const empty = toChordSvg(createDocument({ nodes: [], edges: [] }));
  assert.ok(empty.startsWith('<svg') && (empty.match(/<circle /g) ?? []).length === 0);
});
