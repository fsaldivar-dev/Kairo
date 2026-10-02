import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toQuadrant } from '../packages/diagram/src/report.ts';
import { createDocument } from '../packages/diagram/src/document.ts';

// src -> hub -> sink ; src -> sink.  src is a pure source, sink a pure sink, hub in the middle.
const doc = () => createDocument({
  nodes: [
    { id: 'src', type: 'start', title: 'Origen' },
    { id: 'hub', type: 'process', title: 'Centro' },
    { id: 'sink', type: 'end', title: 'Destino' },
  ],
  edges: [
    { id: 'e0', source: 'src', target: 'hub' },
    { id: 'e1', source: 'hub', target: 'sink' },
    { id: 'e2', source: 'src', target: 'sink' },
  ],
});

const points = (s: string) => Object.fromEntries(
  [...s.matchAll(/"([^"]+)": \[([\d.]+), ([\d.]+)\]/g)].map(m => [m[1], [Number(m[2]), Number(m[3])]]),
);

test('toQuadrant emits a Mermaid quadrantChart with axes and quadrant labels', () => {
  const q = toQuadrant(doc(), { title: 'Roles' });
  const lines = q.split('\n');
  assert.equal(lines[0], 'quadrantChart');
  assert.ok(q.includes('title Roles'));
  assert.ok(q.includes('x-axis Bajo alcance --> Alto alcance'));
  assert.ok(q.includes('quadrant-1 Conector'));
  assert.ok(q.includes('quadrant-4 Fuente'));
});

test('toQuadrant places nodes by normalized out-degree (x) and in-degree (y)', () => {
  const p = points(toQuadrant(doc()));
  // out: src=2 (max), hub=1, sink=0 -> x normalized by 2
  // in:  src=0, hub=1, sink=2 (max) -> y normalized by 2
  assert.deepEqual(p['Origen'], [1, 0]);   // pure source: high reach, no demand
  assert.deepEqual(p['Destino'], [0, 1]);  // pure sink: no reach, high demand
  assert.deepEqual(p['Centro'], [0.5, 0.5]); // hub in the middle
});

test('toQuadrant supports custom metrics, labels and quadrant names', () => {
  const q = toQuadrant(doc(), { x: 'total', y: 'total', xLabel: 'A --> B', quadrants: ['uno', 'dos', 'tres', 'cuatro'] });
  assert.ok(q.includes('x-axis A --> B'));
  assert.ok(q.includes('quadrant-1 uno'));
  const p = points(q);
  // total degree: src=2, hub=2, sink=2 -> all equal max -> all 1.0 on both axes
  assert.deepEqual(p['Origen'], [1, 1]);
});

test('toQuadrant disambiguates duplicate labels, escapes quotes/brackets, and is empty-safe', () => {
  const d = createDocument({ nodes: [{ id: 'a', type: 'process', title: 'X' }, { id: 'b', type: 'process', title: 'X' }, { id: 'c', type: 'process', title: 'Q "z" [1]' }], edges: [] });
  const q = toQuadrant(d);
  assert.match(q, /"X": \[0, 0\]/);
  assert.match(q, /"X \(2\)": \[0, 0\]/);     // duplicate title disambiguated
  assert.match(q, /"Q 'z' {2}1": \[0, 0\]/);   // quotes -> ', brackets -> space (then trimmed)
  assert.equal(toQuadrant(createDocument({ nodes: [], edges: [] })).split('\n').filter(l => /": \[/.test(l)).length, 0);
});
