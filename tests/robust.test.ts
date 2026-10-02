import { test } from 'node:test';
import assert from 'node:assert/strict';
import { twoEdgeConnectedComponents, largestRobustCluster } from '../packages/diagram/src/algorithms.ts';
import { createDocument } from '../packages/diagram/src/document.ts';

// A triangle a-b-c (2-edge-connected) joined by a bridge c->d to a pendant d.
const bridged = createDocument({
  nodes: [{ id: 'a', type: 'process', title: 'A' }, { id: 'b', type: 'process', title: 'B' }, { id: 'c', type: 'process', title: 'C' }, { id: 'd', type: 'process', title: 'D' }],
  edges: [
    { id: 'e0', source: 'a', target: 'b' }, { id: 'e1', source: 'b', target: 'c' }, { id: 'e2', source: 'c', target: 'a' },
    { id: 'e3', source: 'c', target: 'd' }, // bridge
  ],
});

test('twoEdgeConnectedComponents splits off bridge endpoints and keeps the cycle together', () => {
  const comps = twoEdgeConnectedComponents(bridged.graph);
  const triangle = comps.find(c => c.includes('a'))!;
  assert.deepEqual([...triangle].sort(), ['a', 'b', 'c']); // the triangle is one robust block
  assert.ok(comps.some(c => c.length === 1 && c[0] === 'd')); // the pendant is its own singleton
});

test('largestRobustCluster returns the biggest 2-edge-connected block', () => {
  assert.deepEqual([...largestRobustCluster(bridged.graph)].sort(), ['a', 'b', 'c']);
});

test('largestRobustCluster is empty when every edge is a bridge (a pure tree/chain)', () => {
  const chain = createDocument({
    nodes: [{ id: 'x', type: 'process', title: 'X' }, { id: 'y', type: 'process', title: 'Y' }, { id: 'z', type: 'process', title: 'Z' }],
    edges: [{ id: 'e0', source: 'x', target: 'y' }, { id: 'e1', source: 'y', target: 'z' }],
  });
  assert.equal(largestRobustCluster(chain.graph).length, 0); // no node survives any single cut
  assert.equal(twoEdgeConnectedComponents(chain.graph).length, 3); // three singletons
});

test('twoEdgeConnectedComponents treats parallel edges as 2-edge-connected (not a bridge)', () => {
  const parallel = createDocument({
    nodes: [{ id: 'p', type: 'process', title: 'P' }, { id: 'q', type: 'process', title: 'Q' }],
    edges: [{ id: 'e0', source: 'p', target: 'q' }, { id: 'e1', source: 'q', target: 'p' }],
  });
  assert.deepEqual([...largestRobustCluster(parallel.graph)].sort(), ['p', 'q']); // two links between them -> robust
});
