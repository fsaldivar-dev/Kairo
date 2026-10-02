import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fromGraphvizJson } from '../packages/diagram/src/graphvizjson.ts';

// A `dot -Tjson` of  a -> b -> c  (vertical chain). pos is "x,y" in points, y-up (c lowest y = bottom).
const chain = () => JSON.stringify({
  name: 'G', directed: true,
  objects: [
    { _gvid: 0, name: 'a', label: 'Start', pos: '27,234', width: '0.75', height: '0.5' },
    { _gvid: 1, name: 'b', pos: '27,126', width: '0.75', height: '0.5' },
    { _gvid: 2, name: 'c', label: 'End', pos: '27,18', width: '0.75', height: '0.5' },
  ],
  edges: [
    { _gvid: 0, tail: 0, head: 1, label: 'go' },
    { _gvid: 1, tail: 1, head: 2 },
  ],
});

test('fromGraphvizJson imports nodes/edges and preserves Graphviz order with labels', () => {
  const doc = fromGraphvizJson(chain());
  assert.deepEqual(doc.graph.nodes.map(n => n.title), ['Start', 'b', 'End']); // label, else name
  assert.equal(doc.graph.edges.length, 2);
  const e = doc.graph.edges.find(x => x.label === 'go')!;
  const titleOf = (id: string) => doc.graph.nodes.find(n => n.id === id)!.title;
  assert.equal(titleOf(e.source), 'Start');
  assert.equal(titleOf(e.target), 'b');
});

test('fromGraphvizJson keeps Graphviz geometry: y is flipped so lower pos.y sits lower on screen', () => {
  const doc = fromGraphvizJson(chain());
  const [a, b, c] = ['a', 'b', 'c'].map(id => doc.layout.nodes[id]);
  // a (pos.y 234, top) must end up above c (pos.y 18, bottom): smaller screen-y = higher.
  assert.ok(a.y < b.y && b.y < c.y);
  // normalised so the topmost node starts at the 80 margin
  assert.equal(Math.min(a.y, b.y, c.y), 80);
  // widths clamped to our minimum (0.75in = 54pt < 200) so the node stays valid
  assert.ok(a.width >= 200 && a.height >= 92);
});

test('fromGraphvizJson accepts an object, skips cluster/subgraph objects, and drops edges to them', () => {
  const g = {
    directed: true,
    objects: [
      { _gvid: 0, name: 'cluster_0', nodes: [1], subgraphs: [] }, // a cluster, not a node
      { _gvid: 1, name: 'x', pos: '10,10' },
      { _gvid: 2, name: 'y', pos: '10,80' },
    ],
    edges: [{ _gvid: 0, tail: 1, head: 2 }, { _gvid: 1, tail: 0, head: 2 }], // 2nd edge touches the cluster
  };
  const doc = fromGraphvizJson(g);
  assert.deepEqual(doc.graph.nodes.map(n => n.title), ['x', 'y']); // cluster skipped
  assert.equal(doc.graph.edges.length, 1);                         // cluster edge dropped
});

test('fromGraphvizJson falls back to a layered layout when positions are absent, and is pure', () => {
  const g = { objects: [{ _gvid: 0, name: 'a' }, { _gvid: 1, name: 'b' }], edges: [{ tail: 0, head: 1 }] };
  const snapshot = JSON.stringify(g);
  const doc = fromGraphvizJson(g);
  assert.equal(doc.graph.nodes.length, 2);
  assert.ok(doc.layout.nodes.b.y > doc.layout.nodes.a.y); // b is one layer below a
  assert.equal(JSON.stringify(g), snapshot);              // input untouched
});

test('fromGraphvizJson throws when there are no node objects', () => {
  assert.throws(() => fromGraphvizJson({ objects: [], edges: [] }), /no contiene nodos/);
});
