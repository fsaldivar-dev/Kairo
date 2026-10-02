import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDocument } from '../packages/diagram/src/document.ts';
import { fromVisNetwork, toVisNetwork } from '../packages/diagram/src/visnetwork.ts';
import { detectFormat } from '../packages/diagram/src/convert.ts';

function doc() {
  const d = createDocument({
    nodes: [{ id: 'a', type: 'process', title: 'A' }, { id: 'b', type: 'process', title: 'B' }],
    edges: [{ id: 'ab', source: 'a', target: 'b', label: 'usa' }],
  });
  d.layout.nodes.a = { x: 100, y: 120, width: 160, height: 80 };
  d.layout.nodes.b = { x: 400, y: 300, width: 160, height: 80 };
  return d;
}

test('toVisNetwork emits nodes with label + centre x/y and edges with from/to/label', () => {
  const v = toVisNetwork(doc());
  assert.deepEqual(v.nodes[0], { id: 'a', label: 'A', x: 180, y: 160 }); // centre of (100,120,160,80)
  assert.deepEqual(v.edges[0], { id: 'ab', from: 'a', to: 'b', label: 'usa' });
});

test('fromVisNetwork round-trips structure, labels and positions', () => {
  const back = fromVisNetwork(toVisNetwork(doc()));
  assert.deepEqual(back.graph.nodes.map(n => n.title), ['A', 'B']);
  assert.equal(back.graph.edges[0].label, 'usa');
  const a = back.layout.nodes.a; // vis carries no size, so the CENTRE is preserved (box uses the default size)
  assert.deepEqual([a.x + a.width / 2, a.y + a.height / 2], [180, 160]);
});

test('fromVisNetwork accepts a JSON string, numeric ids, and layered layout when positions are absent', () => {
  const g = fromVisNetwork('{"nodes":[{"id":1,"label":"One"},{"id":2,"label":"Two"}],"edges":[{"from":1,"to":2}]}').graph;
  assert.equal(g.nodes.length, 2);
  assert.equal(g.nodes[0].title, 'One');
  assert.equal(g.edges.length, 1);
});

test('detectFormat recognises vis-network (edges with from/to) and fromVisNetwork rejects a nodeless graph', () => {
  assert.equal(detectFormat(JSON.stringify(toVisNetwork(doc()))), 'visnetwork');
  assert.throws(() => fromVisNetwork({ nodes: [], edges: [] }), /no contiene nodos/);
});
