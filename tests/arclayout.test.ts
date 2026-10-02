import { test } from 'node:test';
import assert from 'node:assert/strict';
import { arcLayout } from '../packages/diagram/src/layout.ts';
import { createDocument } from '../packages/diagram/src/document.ts';

test('arcLayout places every node on one baseline in topological order', () => {
  const d = createDocument({
    nodes: [{ id: 'c', type: 'process', title: 'C' }, { id: 'a', type: 'start', title: 'A' }, { id: 'b', type: 'process', title: 'B' }],
    edges: [{ id: 'e0', source: 'a', target: 'b' }, { id: 'e1', source: 'b', target: 'c' }], // a -> b -> c
  });
  const out = arcLayout(d);
  const y = out.graph.nodes.map(n => out.layout.nodes[n.id].y);
  assert.ok(y.every(v => v === y[0])); // all share one baseline
  const x = (id: string) => out.layout.nodes[id].x;
  assert.ok(x('a') < x('b') && x('b') < x('c')); // left-to-right in topological order, not declaration order
  assert.deepEqual(out.graph, d.graph); // layout-only: the graph is unchanged
});

test('arcLayout lays nodes out vertically when asked', () => {
  const d = createDocument({
    nodes: [{ id: 'a', type: 'start', title: 'A' }, { id: 'b', type: 'process', title: 'B' }],
    edges: [{ id: 'e0', source: 'a', target: 'b' }],
  });
  const out = arcLayout(d, { vertical: true });
  const xs = out.graph.nodes.map(n => out.layout.nodes[n.id].x);
  assert.ok(xs.every(v => v === xs[0])); // single column
  assert.ok(out.layout.nodes['a'].y < out.layout.nodes['b'].y); // a above b
});

test('arcLayout falls back to declaration order on a cycle and handles an empty graph', () => {
  const cyclic = createDocument({
    nodes: [{ id: 'x', type: 'process', title: 'X' }, { id: 'y', type: 'process', title: 'Y' }],
    edges: [{ id: 'e0', source: 'x', target: 'y' }, { id: 'e1', source: 'y', target: 'x' }],
  });
  const out = arcLayout(cyclic);
  assert.ok(out.layout.nodes['x'].x < out.layout.nodes['y'].x); // declaration order x then y
  assert.doesNotThrow(() => arcLayout(createDocument({ nodes: [], edges: [] })));
});
