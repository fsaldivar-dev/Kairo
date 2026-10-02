import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toReport } from '../packages/diagram/src/report.ts';
import { createDocument } from '../packages/diagram/src/document.ts';

function flow() {
  return createDocument({
    nodes: [{ id: 's', type: 'start', title: 'Inicio' }, { id: 'd', type: 'decision', title: '¿Ok?' }, { id: 'a', type: 'process', title: 'Hacer' }, { id: 'e', type: 'end', title: 'Fin' }],
    edges: [{ id: 'sd', source: 's', target: 'd' }, { id: 'da', source: 'd', target: 'a', label: 'Sí' }, { id: 'db', source: 'd', target: 'e', label: 'No' }, { id: 'ae', source: 'a', target: 'e' }],
  }, undefined, 'flow');
}

test('toReport renders a Markdown report with summary, key nodes and diagnostics', () => {
  const md = toReport(flow(), { title: 'Mi flujo' });
  assert.ok(md.startsWith('# Mi flujo'));
  assert.ok(md.includes('## Resumen'));
  assert.ok(md.includes('- Nodos: 4'));
  assert.ok(md.includes('- Conexiones: 4'));
  assert.ok(md.includes('- Diámetro:')); // distance stats surfaced
  assert.ok(md.includes('- Etapas (topológicas):')); // parallel waves surfaced
  assert.ok(md.includes('- Ciclos: no'));
  assert.ok(md.includes('## Nodos clave'));
  assert.ok(/grado \d+/.test(md));
  assert.ok(md.includes('## Diagnósticos'));
});
test('toReport reports no structural problems for a valid flow and is pure', () => {
  const d = flow(), original = JSON.stringify(d);
  assert.ok(toReport(d).includes('Sin problemas estructurales.'));
  assert.equal(JSON.stringify(d), original);
});
test('toReport lists diagnostics with node titles for a broken flow', () => {
  const broken = createDocument({ nodes: [{ id: 'p', type: 'process', title: 'Suelto' }], edges: [] }, undefined, 'flow');
  const md = toReport(broken);
  assert.ok(/error\(es\)/.test(md));
  assert.ok(md.includes('[error]')); // a start-count / end-missing error is listed
});

import { graphReport } from '../packages/diagram/src/report.ts';
import { createDocument as mkDoc } from '../packages/diagram/src/document.ts';
test('graphReport returns a structured analytics summary composing the analysis suite', () => {
  const d = mkDoc({
    nodes: [{ id: 'a', type: 'start', title: 'A' }, { id: 'b', type: 'process', title: 'B' }, { id: 'c', type: 'process', title: 'C' }, { id: 'd', type: 'end', title: 'D' }],
    edges: [{ id: 'ab', source: 'a', target: 'b' }, { id: 'bc', source: 'b', target: 'c' }, { id: 'cd', source: 'c', target: 'd' }],
  });
  const r = graphReport(d);
  assert.equal(r.nodes, 4);
  assert.equal(r.edges, 3);
  assert.equal(r.hasCycle, false);
  assert.equal(r.cycle, null);
  assert.equal(r.diameter, 3); // a..d
  assert.equal(r.stages, 4); // a|b|c|d chain
  assert.equal(r.components, 1);
  assert.deepEqual(r.bridges.length, 3); // every chain edge is a bridge
  assert.ok(Array.isArray(r.topPageRank) && Array.isArray(r.topBetweenness) && Array.isArray(r.topDegree));
  assert.equal(typeof r.density, 'number');
});
test('graphReport reports a cycle when present', () => {
  const d = mkDoc({ nodes: [{ id: 'a', type: 'process', title: 'A' }, { id: 'b', type: 'process', title: 'B' }], edges: [{ id: 'ab', source: 'a', target: 'b' }, { id: 'ba', source: 'b', target: 'a' }] });
  const r = graphReport(d);
  assert.equal(r.hasCycle, true);
  assert.ok(r.cycle && r.cycle.length >= 2);
});
