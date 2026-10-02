import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toStatsCard } from '../packages/diagram/src/report.ts';
import { createDocument } from '../packages/diagram/src/document.ts';

const doc = () => createDocument({
  nodes: [{ id: 'a', type: 'start', title: 'A' }, { id: 'b', type: 'process', title: 'B' }, { id: 'c', type: 'end', title: 'C' }],
  edges: [{ id: 'e0', source: 'a', target: 'b' }, { id: 'e1', source: 'b', target: 'c' }],
});

test('toStatsCard renders a valid SVG with the metric tiles and labels', () => {
  const svg = toStatsCard(doc(), { title: 'Mi diagrama' });
  assert.ok(svg.startsWith('<svg') && svg.trim().endsWith('</svg>'));
  assert.match(svg, /viewBox="0 0 480 \d+"/);
  assert.ok(svg.includes('Mi diagrama'));
  for (const label of ['Nodos', 'Conexiones', 'Densidad', 'Profundidad', 'Componentes', '¿Cíclico?']) assert.ok(svg.includes(label));
  assert.match(svg, />3<\/text>/);  // 3 nodes
  assert.match(svg, />2<\/text>/);  // 2 edges
  assert.ok(svg.includes('>No<')); // acyclic
});

test('toStatsCard reports a cycle and escapes the title', () => {
  const cyc = createDocument({ nodes: [{ id: 'a', type: 'process', title: 'A' }, { id: 'b', type: 'process', title: 'B' }], edges: [{ id: 'e0', source: 'a', target: 'b' }, { id: 'e1', source: 'b', target: 'a' }] });
  const svg = toStatsCard(cyc, { title: 'A & <B>' });
  assert.ok(svg.includes('>Sí<')); // cyclic
  assert.ok(svg.includes('A &amp; &lt;B&gt;') && !svg.includes('<B>')); // escaped
});

test('toStatsCard handles an empty graph without throwing', () => {
  const svg = toStatsCard(createDocument({ nodes: [], edges: [] }));
  assert.ok(svg.startsWith('<svg'));
  assert.ok(svg.includes('Nodos'));
});
