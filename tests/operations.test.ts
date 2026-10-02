import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDocument } from '../packages/diagram/src/document.ts';
import { alignNodes, checkConnection, connectNodes, distributeNodes, duplicateNode, extractSelection, pasteClipboard, reachable, reconnectEdge, removeElement, reverseEdge, searchNodes } from '../packages/diagram/src/operations.ts';
import type { DiagramDocument } from '../packages/diagram/src/types.ts';

/** a → b → c, with b → d as a side branch. */
const chain = (): DiagramDocument => createDocument({
  nodes: ['a', 'b', 'c', 'd'].map(id => ({ id, type: 'process' as const, title: id.toUpperCase() })),
  edges: [{ id: 'ab', source: 'a', target: 'b', label: 'first' }, { id: 'bc', source: 'b', target: 'c' }, { id: 'bd', source: 'b', target: 'd' }],
});
const doc = (result: DiagramDocument | string): DiagramDocument => { assert.equal(typeof result, 'object', `rejected: ${result}`); return result as DiagramDocument; };

test('reachability follows or opposes edge direction and can ignore one edge', () => {
  const graph = chain().graph;
  assert.deepEqual([...reachable(graph, 'a')].sort(), ['a', 'b', 'c', 'd']);
  assert.deepEqual([...reachable(graph, 'c', 'in')].sort(), ['a', 'b', 'c']);
  assert.deepEqual([...reachable(graph, 'a', 'out', 'ab')], ['a']);
});
test('default policy refuses self-loops and same-direction duplicates but allows cycles and the opposite direction', () => {
  const d = chain();
  assert.equal(checkConnection(d, 'a', 'a'), 'self-loop');
  assert.equal(checkConnection(d, 'a', 'b'), 'duplicate');
  assert.equal(checkConnection(d, 'b', 'a'), null);
  assert.equal(checkConnection(d, 'c', 'a'), null);
  assert.equal(checkConnection(d, 'a', 'ghost'), 'missing-node');
});
test('profile policy toggles each rule independently and the host callback is consulted last', () => {
  const d = chain();
  assert.equal(checkConnection(d, 'a', 'a', { allowSelfLoops: true }), null);
  assert.equal(checkConnection(d, 'a', 'b', { allowMultipleEdges: true }), null);
  assert.equal(checkConnection(d, 'c', 'a', { allowCycles: false }), 'cycle');
  assert.equal(checkConnection(d, 'a', 'a', { allowSelfLoops: true, allowCycles: false }), 'cycle');
  assert.equal(checkConnection(d, 'a', 'c', { allowCycles: false }), null);
  assert.equal(checkConnection(d, 'a', 'c', {}, { canConnect: (s, t) => s.id !== 'a' || t.id !== 'c' }), 'rejected');
  assert.equal(checkConnection(d, 'a', 'c', {}, { canConnect: () => false, ignoreEdge: 'ab' }), 'rejected');
});
test('connect returns a new validated document with default ports and never mutates the input', () => {
  const d = chain(), snapshot = JSON.stringify(d);
  const next = doc(connectNodes(d, 'ca', 'c', 'a'));
  assert.equal(JSON.stringify(d), snapshot);
  assert.deepEqual(next.graph.edges.at(-1), { id: 'ca', source: 'c', target: 'a' });
  assert.deepEqual(next.layout.edges.ca, { sourcePort: 'left', targetPort: 'right' });
  assert.equal(connectNodes(d, 'dup', 'a', 'b'), 'duplicate');
  const loop = doc(connectNodes(d, 'aa', 'a', 'a', undefined, { allowSelfLoops: true }));
  assert.deepEqual(loop.layout.edges.aa, { sourcePort: 'right', targetPort: 'bottom' });
});
test('reverse swaps endpoints and ports, keeps semantic data and markers bound to their roles', () => {
  const d = chain();
  Object.assign(d.layout.edges.ab, { startMarker: 'dot', endMarker: 'arrow', dashed: true });
  const next = doc(reverseEdge(d, 'ab'));
  const edge = next.graph.edges.find(e => e.id === 'ab')!;
  assert.deepEqual(edge, { id: 'ab', source: 'b', target: 'a', label: 'first' });
  assert.deepEqual(next.layout.edges.ab, { sourcePort: 'left', targetPort: 'right', startMarker: 'dot', endMarker: 'arrow', dashed: true });
  assert.deepEqual(doc(reverseEdge(next, 'ab')).graph.edges, d.graph.edges);
  assert.equal(reverseEdge(d, 'nope'), 'missing-edge');
});
test('reverse respects duplicates and cycle rules relative to the other edges only', () => {
  const d = chain();
  const withBack = doc(connectNodes(d, 'ba', 'b', 'a'));
  assert.equal(reverseEdge(withBack, 'ab'), 'duplicate');
  assert.equal(reverseEdge(withBack, 'ab', { allowMultipleEdges: true }) !== 'duplicate', true);
  const withAc = doc(connectNodes(d, 'ac', 'a', 'c'));
  assert.equal(reverseEdge(withAc, 'ac', { allowCycles: false }), 'cycle');
  assert.equal(typeof reverseEdge(withAc, 'ab', { allowCycles: false }), 'object');
});
test('reconnect moves one end, keeps the untouched port, and recomputes only the moved port when not given', () => {
  const d = chain();
  d.layout.nodes.d = { ...d.layout.nodes.d, x: 80, y: 600 };
  const next = doc(reconnectEdge(d, 'ab', { target: 'd' }));
  assert.deepEqual(next.graph.edges[0], { id: 'ab', source: 'a', target: 'd', label: 'first' });
  assert.equal(next.layout.edges.ab.sourcePort, d.layout.edges.ab.sourcePort);
  assert.equal(next.layout.edges.ab.targetPort, 'top');
  const explicit = doc(reconnectEdge(d, 'ab', { source: 'c', sourcePort: 'top', targetPort: 'left' }));
  assert.deepEqual(explicit.layout.edges.ab, { sourcePort: 'top', targetPort: 'left' });
  assert.deepEqual(doc(reconnectEdge(d, 'ab', { sourcePort: 'bottom' })).layout.edges.ab, { sourcePort: 'bottom', targetPort: 'left' });
});
test('reconnect is refused by policy without producing a document, and does not collide with itself', () => {
  const d = chain();
  assert.equal(reconnectEdge(d, 'ab', { target: 'a' }), 'self-loop');
  assert.equal(reconnectEdge(d, 'ab', { target: 'c', source: 'b' }), 'duplicate');
  assert.equal(typeof reconnectEdge(d, 'ab', { target: 'b' }), 'object');
  assert.equal(reconnectEdge(d, 'bd', { source: 'c', target: 'a' }, { allowCycles: false }), 'cycle');
  assert.equal(typeof reconnectEdge(d, 'bc', { source: 'c', target: 'a' }, { allowCycles: false }), 'object');
  assert.equal(reconnectEdge(d, 'missing', { target: 'c' }), 'missing-edge');
  assert.equal(reconnectEdge(d, 'ab', { target: 'ghost' }), 'missing-node');
});
test('removing a node drops its edges and their layout; removing an edge keeps nodes', () => {
  const d = chain();
  const noB = removeElement(d, { kind: 'node', id: 'b' });
  assert.deepEqual(noB.graph.nodes.map(n => n.id), ['a', 'c', 'd']);
  assert.deepEqual(noB.graph.edges, []);
  assert.deepEqual(Object.keys(noB.layout.edges), []);
  const noAb = removeElement(d, { kind: 'edge', id: 'ab' });
  assert.equal(noAb.graph.nodes.length, 4);
  assert.deepEqual(Object.keys(noAb.layout.edges), ['bc', 'bd']);
  assert.equal(d.graph.edges.length, 3);
});
test('duplicateNode clones semantic and layout data with a fresh id and offset, without incident edges', () => {
  const d = chain();
  d.graph.nodes[0].tags = ['keep']; d.layout.nodes.a.shape = 'pill';
  const next = doc(duplicateNode(d, 'a', 'a2', { x: 40, y: 10 }));
  const copy = next.graph.nodes.find(n => n.id === 'a2')!;
  assert.deepEqual(copy, { id: 'a2', type: 'process', title: 'A', tags: ['keep'] });
  assert.deepEqual(next.layout.nodes.a2, { ...next.layout.nodes.a, x: next.layout.nodes.a.x + 40, y: next.layout.nodes.a.y + 10, shape: 'pill' });
  assert.equal(next.graph.edges.length, d.graph.edges.length);
  assert.equal(d.graph.nodes.length, 4);
  assert.equal(duplicateNode(d, 'ghost', 'z'), 'missing-node');
});
test('extractSelection copies nodes and only internal edges, deep-cloned', () => {
  const d = chain(); d.graph.nodes[0].tags = ['t']; d.layout.nodes.a.shape = 'pill';
  const clip = extractSelection(d, ['a', 'b']); // edge ab internal; bc, bd leave the set
  assert.deepEqual(clip.nodes.map(n => n.id), ['a', 'b']);
  assert.deepEqual(clip.edges.map(e => e.id), ['ab']);
  assert.deepEqual(Object.keys(clip.layout.nodes).sort(), ['a', 'b']);
  assert.deepEqual(Object.keys(clip.layout.edges), ['ab']);
  clip.nodes[0].tags!.push('x'); clip.layout.nodes.a.x = -999;
  assert.deepEqual(d.graph.nodes[0].tags, ['t']);
  assert.equal(d.layout.nodes.a.x, chain().layout.nodes.a.x);
  assert.deepEqual(extractSelection(d, []).nodes, []);
});
test('pasteClipboard remaps ids, offsets layout and never mutates the document', () => {
  const d = chain(), clip = extractSelection(d, ['a', 'b']), snapshot = JSON.stringify(d);
  let i = 0; const result = pasteClipboard(d, clip, prefix => `${prefix}${i++}`, { x: 40, y: 10 });
  assert.notEqual(result, 'empty');
  if (result === 'empty') return;
  assert.equal(JSON.stringify(d), snapshot);
  assert.deepEqual(result.nodeIds, ['n0', 'n1']);
  assert.deepEqual(result.edgeIds, ['e2']);
  const pasted = result.document.graph.edges.find(e => e.id === 'e2')!;
  assert.deepEqual([pasted.source, pasted.target], ['n0', 'n1']);
  assert.equal(result.document.layout.nodes.n0.x, d.layout.nodes.a.x + 40);
  assert.equal(result.document.layout.nodes.n0.y, d.layout.nodes.a.y + 10);
  assert.equal(result.document.graph.nodes.length, d.graph.nodes.length + 2);
  assert.equal(pasteClipboard(d, { nodes: [], edges: [], layout: { nodes: {}, edges: {} } }, p => p), 'empty');
});
test('alignNodes aligns to a shared edge/axis and needs at least two nodes', () => {
  const d = chain();
  Object.assign(d.layout.nodes.a, { x: 0, y: 0, width: 140, height: 80 });
  Object.assign(d.layout.nodes.b, { x: 200, y: 50, width: 160, height: 90 });
  assert.equal(alignNodes(d, ['a'], 'left'), null);
  assert.equal(alignNodes(d, ['a', 'b'], 'left')!.layout.nodes.b.x, 0);
  assert.equal(alignNodes(d, ['a', 'b'], 'right')!.layout.nodes.a.x, 360 - 140);
  assert.equal(alignNodes(d, ['a', 'b'], 'top')!.layout.nodes.b.y, 0);
  const cx = alignNodes(d, ['a', 'b'], 'center-x')!;
  assert.equal(cx.layout.nodes.a.x + 70, cx.layout.nodes.b.x + 80);
  assert.equal(d.layout.nodes.b.x, 200);
});
test('distributeNodes evenly spaces middle node centers and keeps the extremes fixed', () => {
  const d = chain();
  Object.assign(d.layout.nodes.a, { x: 0, y: 0, width: 140, height: 80 });
  Object.assign(d.layout.nodes.b, { x: 60, y: 0, width: 140, height: 80 });
  Object.assign(d.layout.nodes.c, { x: 500, y: 0, width: 140, height: 80 });
  assert.equal(distributeNodes(d, ['a', 'b'], 'horizontal'), null);
  const out = distributeNodes(d, ['a', 'b', 'c'], 'horizontal')!;
  const center = (id: string) => out.layout.nodes[id].x + out.layout.nodes[id].width / 2;
  assert.equal(center('a'), 70); assert.equal(center('c'), 570);
  assert.equal(center('b'), 320); // midpoint between 70 and 570
});
test('searchNodes matches title, type, source and tags, case-insensitively, in order', () => {
  const d = createDocument({
    nodes: [
      { id: 'a', type: 'service', title: 'AuthService', source: 'src/Auth.ts', tags: ['security'] },
      { id: 'b', type: 'database', title: 'Users', source: 'db/users.sql' },
      { id: 'c', type: 'service', title: 'Gateway' },
    ],
    edges: [],
  });
  assert.deepEqual(searchNodes(d.graph, 'auth'), ['a']);       // title
  assert.deepEqual(searchNodes(d.graph, 'SERVICE'), ['a', 'c']); // type, order preserved
  assert.deepEqual(searchNodes(d.graph, 'security'), ['a']);    // tag
  assert.deepEqual(searchNodes(d.graph, 'users.sql'), ['b']);   // source
  assert.deepEqual(searchNodes(d.graph, '   '), []);            // empty query
  assert.deepEqual(searchNodes(d.graph, 'nothing'), []);
});
