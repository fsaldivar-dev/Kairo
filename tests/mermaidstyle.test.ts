import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toMermaidStyled } from '../packages/diagram/src/mermaidstyle.ts';
import { createDocument } from '../packages/diagram/src/document.ts';

test('toMermaidStyled appends classDef and class lines coloring flowchart nodes by type', () => {
  const d = createDocument({
    nodes: [{ id: 'a', type: 'start', title: 'Inicio' }, { id: 'b', type: 'service', title: 'Svc' }, { id: 'c', type: 'service', title: 'Svc2' }, { id: 'z', type: 'end', title: 'Fin' }],
    edges: [{ id: 'e0', source: 'a', target: 'b' }, { id: 'e1', source: 'b', target: 'c' }, { id: 'e2', source: 'c', target: 'z' }],
  }, undefined, 'flow');
  const m = toMermaidStyled(d);
  assert.ok(m.startsWith('flowchart'));
  assert.match(m, /classDef start fill:#[0-9a-f]{6},stroke:#[0-9a-f]{6},color:#1e293b/);
  assert.match(m, /classDef service fill:#/);
  assert.match(m, /class b,c service/); // the two services grouped on one class line
  assert.match(m, /class a start/);
  assert.match(m, /class z end/);
});

test('toMermaidStyled honours a custom palette', () => {
  const d = createDocument({ nodes: [{ id: 'a', type: 'process', title: 'A' }], edges: [] }, undefined, 'flow');
  const m = toMermaidStyled(d, { palette: { process: '#000000' } });
  assert.match(m, /classDef process fill:#000000,/);
});

test('toMermaidStyled leaves non-flowchart (class/ER) output unchanged', () => {
  const uml = createDocument({ nodes: [{ id: 'A', type: 'class', title: 'A', source: 'x: int' }], edges: [] }, undefined, 'uml');
  const styled = toMermaidStyled(uml);
  assert.ok(styled.startsWith('classDiagram'));
  assert.ok(!styled.includes('classDef')); // no flowchart styling appended
});
