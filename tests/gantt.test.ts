import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toGantt } from '../packages/diagram/src/report.ts';
import { createDocument } from '../packages/diagram/src/document.ts';

// start -> check -> allow -> done, check -> deny.  Critical path start,check,allow,done; deny has slack.
const flow = () => createDocument({
  nodes: [
    { id: 'start', type: 'start', title: 'Inicio' },
    { id: 'check', type: 'decision', title: '¿OK?' },
    { id: 'allow', type: 'process', title: 'Permitir' },
    { id: 'deny', type: 'end', title: 'Denegar' },
    { id: 'done', type: 'end', title: 'Fin' },
  ],
  edges: [
    { id: 'e0', source: 'start', target: 'check' },
    { id: 'e1', source: 'check', target: 'allow' },
    { id: 'e2', source: 'allow', target: 'done' },
    { id: 'e3', source: 'check', target: 'deny' },
  ],
});

test('toGantt emits a Mermaid gantt with CPM-scheduled tasks and crit flags', () => {
  const g = toGantt(flow(), { title: 'Plan' });
  const lines = g.split('\n');
  assert.equal(lines[0], 'gantt');
  assert.ok(g.includes('title Plan'));
  assert.ok(g.includes('dateFormat X'));
  assert.ok(g.includes('section Flujo'));         // ungrouped -> default section
  // allow is on the critical path: starts at 2 (after start,check), duration 1, flagged crit
  assert.match(g, /Permitir :crit, allow, 2, 1/);
  assert.match(g, /Inicio :crit, start, 0, 1/);
  // deny starts right after check (at 2) but has slack, so it is NOT flagged crit
  assert.match(g, /Denegar :deny, 2, 1/);
  assert.ok(!/Denegar :crit/.test(g));
});

test('toGantt groups tasks into sections by node group and honours custom durations', () => {
  const d = flow();
  d.graph.nodes[2].group = 'Backend'; // allow
  const g = toGantt(d, { duration: id => (id === 'check' ? 3 : 1) });
  assert.ok(g.includes('section Backend'));
  // check now lasts 3, so allow starts at 1 (start) + 3 (check) = 4
  assert.match(g, /Permitir :crit, allow, 4, 1/);
});

test('toGantt falls back to a sequential schedule on a cyclic graph and is pure', () => {
  const d = createDocument({
    nodes: [{ id: 'a', type: 'process', title: 'A' }, { id: 'b', type: 'process', title: 'B' }],
    edges: [{ id: 'e0', source: 'a', target: 'b' }, { id: 'e1', source: 'b', target: 'a' }],
  });
  const snap = JSON.stringify(d);
  const g = toGantt(d);
  assert.ok(g.startsWith('gantt'));
  assert.match(g, /A :a, 0, 1/);   // sequential fallback
  assert.match(g, /B :b, 1, 1/);
  assert.equal(JSON.stringify(d), snap); // pure
});

test('toGantt sanitises task names (no stray colon/newline break the syntax)', () => {
  const d = createDocument({ nodes: [{ id: 'n', type: 'process', title: 'Paso: uno\ndos' }], edges: [] });
  const g = toGantt(d);
  assert.ok(!/Paso: uno/.test(g));          // colon stripped from the label
  assert.match(g, /Paso {2}uno dos :/);     // ':' and newline -> spaces
});
