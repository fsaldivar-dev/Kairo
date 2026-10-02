import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toSunburstSvg } from '../packages/diagram/src/sunburst.ts';
import { createDocument } from '../packages/diagram/src/document.ts';

test('toSunburstSvg renders concentric sectors for a tree hierarchy', () => {
  const d = createDocument({
    nodes: [
      { id: 'root', type: 'start', title: 'Root' },
      { id: 'a', type: 'process', title: 'A' }, { id: 'b', type: 'process', title: 'B' },
      { id: 'a1', type: 'process', title: 'A1' }, { id: 'a2', type: 'process', title: 'A2' },
    ],
    edges: [
      { id: 'e0', source: 'root', target: 'a' }, { id: 'e1', source: 'root', target: 'b' },
      { id: 'e2', source: 'a', target: 'a1' }, { id: 'e3', source: 'a', target: 'a2' },
    ],
  });
  const svg = toSunburstSvg(d);
  assert.ok(svg.startsWith('<svg') && svg.trim().endsWith('</svg>'));
  assert.ok(svg.includes('role="img"') && svg.includes('aria-label="Sunburst"'));
  // single root fills the centre disc; the 4 descendants become annular sectors
  assert.equal((svg.match(/<circle /g) ?? []).length, 1);
  assert.equal((svg.match(/<path /g) ?? []).length, 4);
  assert.match(svg, /A [\d.]+ [\d.]+ 0 [01] [01] /); // an SVG arc command in a sector
  assert.ok(svg.includes('Root') && svg.includes('A1'));
});

test('toSunburstSvg draws two half-circle sectors for two roots and handles an empty graph', () => {
  const two = createDocument({ nodes: [{ id: 'x', type: 'process', title: 'X' }, { id: 'y', type: 'process', title: 'Y' }], edges: [] });
  const svg = toSunburstSvg(two);
  assert.equal((svg.match(/<circle /g) ?? []).length, 0); // not a single full circle
  assert.equal((svg.match(/<path /g) ?? []).length, 2);   // two half sectors
  const empty = toSunburstSvg(createDocument({ nodes: [], edges: [] }));
  assert.ok(empty.startsWith('<svg') && (empty.match(/<path /g) ?? []).length === 0);
});

test('toSunburstSvg honours a custom size', () => {
  const d = createDocument({ nodes: [{ id: 'r', type: 'process', title: 'R' }], edges: [] });
  assert.ok(toSunburstSvg(d, { size: 300 }).includes('width="300" height="300"'));
});
