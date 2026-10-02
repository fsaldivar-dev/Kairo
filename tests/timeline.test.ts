import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toMermaidTimeline } from '../packages/diagram/src/report.ts';
import { createDocument } from '../packages/diagram/src/document.ts';

test('toMermaidTimeline maps topological generations to sections and nodes to events', () => {
  const d = createDocument({
    nodes: [
      { id: 'a', type: 'start', title: 'Inicio' },
      { id: 'b', type: 'process', title: 'Cargar' }, { id: 'c', type: 'process', title: 'Validar' },
      { id: 'e', type: 'end', title: 'Fin' },
    ],
    edges: [
      { id: 'e0', source: 'a', target: 'b' }, { id: 'e1', source: 'a', target: 'c' }, // b and c share generation 2
      { id: 'e2', source: 'b', target: 'e' }, { id: 'e3', source: 'c', target: 'e' },
    ],
  });
  const out = toMermaidTimeline(d, { title: 'Flujo' });
  assert.equal(out.split('\n')[0], 'timeline');
  assert.ok(out.includes('  title Flujo'));
  assert.ok(out.includes('  section Paso 1') && out.includes('  section Paso 2') && out.includes('  section Paso 3'));
  // generation 2 holds both b and c as events
  const lines = out.split('\n');
  const p2 = lines.indexOf('  section Paso 2'), p3 = lines.indexOf('  section Paso 3');
  const gen2 = lines.slice(p2 + 1, p3).map(l => l.trim());
  assert.deepEqual(gen2.sort(), ['Cargar', 'Validar']);
});

test('toMermaidTimeline groups cyclic nodes into a final Ciclo section and escapes colons', () => {
  const d = createDocument({
    nodes: [{ id: 'a', type: 'process', title: 'A: start' }, { id: 'b', type: 'process', title: 'B' }],
    edges: [{ id: 'e0', source: 'a', target: 'b' }, { id: 'e1', source: 'b', target: 'a' }], // a<->b cycle, no root
  });
  const out = toMermaidTimeline(d);
  assert.ok(out.includes('  section Ciclo')); // nothing reaches in-degree 0
  assert.ok(out.includes('A; start')); // the ':' in the title is escaped to ';'
});

test('toMermaidTimeline accepts a custom period labeller and handles an empty graph', () => {
  const d = createDocument({ nodes: [{ id: 'a', type: 'start', title: 'A' }, { id: 'b', type: 'end', title: 'B' }], edges: [{ id: 'e0', source: 'a', target: 'b' }] });
  const out = toMermaidTimeline(d, { period: (i) => `T${i}` });
  assert.ok(out.includes('  section T0') && out.includes('  section T1'));
  assert.equal(toMermaidTimeline(createDocument({ nodes: [], edges: [] })), 'timeline\n');
});
