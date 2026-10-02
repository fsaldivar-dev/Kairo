import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toSankey } from '../packages/diagram/src/report.ts';
import { createDocument } from '../packages/diagram/src/document.ts';

test('toSankey emits a sankey-beta header and one CSV row per edge', () => {
  const d = createDocument({
    nodes: [{ id: 'a', type: 'process', title: 'Alpha' }, { id: 'b', type: 'process', title: 'Beta' }, { id: 'c', type: 'process', title: 'Gamma' }],
    edges: [{ id: 'e0', source: 'a', target: 'b' }, { id: 'e1', source: 'b', target: 'c' }],
  });
  const out = toSankey(d);
  assert.ok(out.startsWith('sankey-beta\n'));
  const rows = out.trim().split('\n').filter(l => l.includes(','));
  assert.equal(rows.length, 2); // one link per edge
  assert.ok(rows.includes('Alpha,Beta,1'));
  assert.ok(rows.includes('Beta,Gamma,1'));
});

test('toSankey weights trunk edges by source→sink path count on a DAG', () => {
  // diamond: s -> a, s -> b, a -> t, b -> t. The pre-trunk "s" fan-out and post-trunk converge to "t".
  const d = createDocument({
    nodes: [{ id: 'r', type: 'start', title: 'R' }, { id: 's', type: 'process', title: 'S' }, { id: 'a', type: 'process', title: 'A' }, { id: 'b', type: 'process', title: 'B' }, { id: 't', type: 'end', title: 'T' }],
    edges: [
      { id: 'e0', source: 'r', target: 's' }, // trunk: 2 source→sink paths flow through it (R-S-A-T, R-S-B-T)
      { id: 'e1', source: 's', target: 'a' }, { id: 'e2', source: 's', target: 'b' },
      { id: 'e3', source: 'a', target: 't' }, { id: 'e4', source: 'b', target: 't' },
    ],
  });
  const out = toSankey(d);
  assert.ok(out.includes('R,S,2')); // the trunk carries both paths -> weight 2
  assert.ok(out.includes('S,A,1') && out.includes('A,T,1')); // branches carry one each
});

test('toSankey falls back to uniform weight 1 on a cyclic graph, disambiguates titles, and skips self-loops', () => {
  const cyclic = createDocument({
    nodes: [{ id: 'a', type: 'process', title: 'Dup' }, { id: 'b', type: 'process', title: 'Dup' }],
    edges: [{ id: 'e0', source: 'a', target: 'b' }, { id: 'e1', source: 'b', target: 'a' }, { id: 'e2', source: 'a', target: 'a' }],
  });
  const out = toSankey(cyclic);
  const rows = out.trim().split('\n').filter(l => l.includes(','));
  assert.equal(rows.length, 2);                 // self-loop e2 dropped
  assert.ok(rows.every(r => r.endsWith(',1')));  // cyclic -> uniform weight 1
  assert.ok(out.includes('Dup,Dup (2),1') || out.includes('Dup (2),Dup,1')); // duplicate titles disambiguated
});

test('toSankey honours a custom weight callback', () => {
  const d = createDocument({ nodes: [{ id: 'a', type: 'process', title: 'A' }, { id: 'b', type: 'process', title: 'B' }], edges: [{ id: 'e0', source: 'a', target: 'b' }] });
  assert.ok(toSankey(d, { weight: () => 42 }).includes('A,B,42'));
});
