import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDocument } from '../packages/diagram/src/document.ts';
import { autoLayout } from '../packages/diagram/src/layout.ts';

const graph = () => ({
  nodes: [
    { id: 'a', type: 'start' as const, title: 'A' },
    { id: 'b', type: 'process' as const, title: 'B' },
    { id: 'c', type: 'process' as const, title: 'C' },
    { id: 'd', type: 'end' as const, title: 'D' },
  ],
  edges: [
    { id: 'ab', source: 'a', target: 'b' },
    { id: 'ac', source: 'a', target: 'c' },
    { id: 'bd', source: 'b', target: 'd' },
    { id: 'cd', source: 'c', target: 'd' },
  ],
});
test('autoLayout stacks nodes by dependency depth (TB) and preserves sizes, shapes and graph', () => {
  const d = createDocument(graph()); d.layout.nodes.a.shape = 'pill'; d.layout.nodes.b.width = 180;
  const out = autoLayout(d);
  // a at level 0, b/c at level 1, d at level 2 -> increasing y
  assert.ok(out.layout.nodes.a.y < out.layout.nodes.b.y);
  assert.ok(out.layout.nodes.b.y < out.layout.nodes.d.y);
  assert.equal(out.layout.nodes.b.y, out.layout.nodes.c.y); // siblings share a level
  assert.equal(out.layout.nodes.a.shape, 'pill');
  assert.equal(out.layout.nodes.b.width, 180);
  assert.deepEqual(out.graph, d.graph);
});
test('LR direction lays levels out horizontally and never overlaps siblings', () => {
  const out = autoLayout(createDocument(graph()), { direction: 'LR', gap: 40 });
  assert.ok(out.layout.nodes.a.x < out.layout.nodes.b.x);
  assert.equal(out.layout.nodes.b.x, out.layout.nodes.c.x);
  // b and c are siblings stacked on y with a gap >= 40
  const [top, bottom] = [out.layout.nodes.b, out.layout.nodes.c].sort((p, q) => p.y - q.y);
  assert.ok(bottom.y >= top.y + top.height + 40 - 0.001);
});
test('autoLayout is pure and handles cycles without overlap or error', () => {
  const g = graph(); g.edges.push({ id: 'da', source: 'd', target: 'a' });
  const d = createDocument(g), snapshot = JSON.stringify(d);
  const out = autoLayout(d);
  assert.equal(JSON.stringify(d), snapshot);
  assert.ok(Object.values(out.layout.nodes).every(n => Number.isFinite(n.x) && Number.isFinite(n.y)));
});
test('layered placement is stable for a diamond DAG regardless of layering internals', () => {
  // a -> b, a -> c, b -> d, c -> d : a@0, b/c@1, d@2.
  const doc = autoLayout(createDocument({
    nodes: ['a', 'b', 'c', 'd'].map(id => ({ id, type: 'process' as const, title: id })),
    edges: [{ id: 'ab', source: 'a', target: 'b' }, { id: 'ac', source: 'a', target: 'c' }, { id: 'bd', source: 'b', target: 'd' }, { id: 'cd', source: 'c', target: 'd' }],
  }));
  assert.ok(doc.layout.nodes.a.y < doc.layout.nodes.b.y);
  assert.equal(doc.layout.nodes.b.y, doc.layout.nodes.c.y);
  assert.ok(doc.layout.nodes.d.y > doc.layout.nodes.b.y);
});
test('autoLayout reorders within a level to reduce edge crossings (barycenter)', () => {
  // a,b on level 0; c,d on level 1; edges a->d and b->c cross in declaration order.
  const doc = autoLayout(createDocument({
    nodes: [{ id: 'a', type: 'process' as const, title: 'A' }, { id: 'b', type: 'process' as const, title: 'B' }, { id: 'c', type: 'process' as const, title: 'C' }, { id: 'd', type: 'process' as const, title: 'D' }],
    edges: [{ id: 'ad', source: 'a', target: 'd' }, { id: 'bc', source: 'b', target: 'c' }],
  }));
  // a left of b on level 0; after reduction, d should be left of c on level 1 (uncrossed).
  assert.ok(doc.layout.nodes.a.x < doc.layout.nodes.b.x);
  assert.ok(doc.layout.nodes.d.x < doc.layout.nodes.c.x);
});
test('autoLayout centers a parent over its children (balanced levels)', () => {
  const doc = autoLayout(createDocument({
    nodes: [{ id: 'a', type: 'process' as const, title: 'A' }, { id: 'b', type: 'process' as const, title: 'B' }, { id: 'c', type: 'process' as const, title: 'C' }],
    edges: [{ id: 'ab', source: 'a', target: 'b' }, { id: 'ac', source: 'a', target: 'c' }],
  }));
  const cx = (id: string) => doc.layout.nodes[id].x + doc.layout.nodes[id].width / 2;
  // Parent 'a' centered over the midpoint of its children b and c.
  assert.ok(Math.abs(cx('a') - (cx('b') + cx('c')) / 2) < 1);
});
import { mergeLayout } from '../packages/diagram/src/layout.ts';
test('mergeLayout keeps manual positions by id and grid-places new nodes', () => {
  const target = createDocument({ nodes: [{ id: 'a', type: 'process' as const, title: 'A' }, { id: 'b', type: 'process' as const, title: 'B' }, { id: 'c', type: 'process' as const, title: 'C (nuevo)' }], edges: [{ id: 'ab', source: 'a', target: 'b' }] });
  const targetAx = target.layout.nodes.a.x, targetCx = target.layout.nodes.c.x;
  const source = createDocument({ nodes: [{ id: 'a', type: 'process' as const, title: 'A old' }, { id: 'b', type: 'process' as const, title: 'B old' }], edges: [] });
  source.layout.nodes.a.x = 777; source.layout.nodes.a.y = 333;
  const merged = mergeLayout(target, source);
  assert.equal(merged.layout.nodes.a.x, 777); // position from source
  assert.equal(merged.layout.nodes.a.y, 333);
  assert.equal(merged.graph.nodes.find(n => n.id === 'a')!.title, 'A'); // semantics from target
  assert.equal(merged.layout.nodes.c.x, targetCx); // new node keeps target layout
  assert.notEqual(targetAx, 777);
});

import { organicLayout } from '../packages/diagram/src/layout.ts';
import { createDocument as makeDocForOrganic } from '../packages/diagram/src/document.ts';

function star() {
  return makeDocForOrganic({
    nodes: ['hub', 'a', 'b', 'c', 'd'].map(id => ({ id, type: 'process' as const, title: id })),
    edges: [
      { id: 'ha', source: 'hub', target: 'a' }, { id: 'hb', source: 'hub', target: 'b' },
      { id: 'hc', source: 'hub', target: 'c' }, { id: 'hd', source: 'hub', target: 'd' },
    ],
  });
}

test('organicLayout is deterministic and pure, preserving sizes, shapes and semantics', () => {
  const doc = star(), original = JSON.stringify(doc);
  const a = organicLayout(doc), b = organicLayout(doc);
  assert.deepEqual(a.layout.nodes, b.layout.nodes); // same input -> same output
  assert.equal(JSON.stringify(doc), original); // input untouched
  assert.deepEqual(a.graph, doc.graph);
  assert.equal(a.layout.nodes.hub.width, doc.layout.nodes.hub.width);
});
test('organicLayout yields finite, padded, distinct coordinates', () => {
  const laid = organicLayout(star());
  const points = Object.values(laid.layout.nodes);
  for (const p of points) {
    assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
    assert.ok(p.x >= 0 && p.y >= 0);
  }
  const keys = new Set(points.map(p => `${p.x},${p.y}`));
  assert.equal(keys.size, points.length); // no two nodes overlap exactly
});
test('organicLayout places the hub near the centroid of its leaves', () => {
  const laid = organicLayout(star()).layout.nodes;
  const leaves = ['a', 'b', 'c', 'd'].map(id => laid[id]);
  const cx = leaves.reduce((s, p) => s + p.x, 0) / 4, cy = leaves.reduce((s, p) => s + p.y, 0) / 4;
  const spread = Math.max(...leaves.map(p => Math.hypot(p.x - cx, p.y - cy)));
  const hubToCentroid = Math.hypot(laid.hub.x - cx, laid.hub.y - cy);
  assert.ok(hubToCentroid < spread, `hub ${hubToCentroid} should sit inside the leaf spread ${spread}`);
});
test('organicLayout handles a single node and recomputes edge ports', () => {
  const one = makeDocForOrganic({ nodes: [{ id: 'x', type: 'process', title: 'X' }], edges: [] });
  const laid = organicLayout(one);
  assert.ok(Number.isFinite(laid.layout.nodes.x.x));
  const s = star(); const laidStar = organicLayout(s);
  assert.ok(laidStar.layout.edges.ha.sourcePort); // ports present
});

import { radialLayout } from '../packages/diagram/src/layout.ts';
import { createDocument as makeDocForRadial } from '../packages/diagram/src/document.ts';

function tree() {
  return makeDocForRadial({
    nodes: ['root', 'a', 'b', 'c', 'a1', 'a2'].map(id => ({ id, type: 'process' as const, title: id })),
    edges: [
      { id: 'ra', source: 'root', target: 'a' }, { id: 'rb', source: 'root', target: 'b' }, { id: 'rc', source: 'root', target: 'c' },
      { id: 'aa1', source: 'a', target: 'a1' }, { id: 'aa2', source: 'a', target: 'a2' },
    ],
  });
}

test('radialLayout centers a single root and pushes deeper nodes to larger radii', () => {
  const laid = radialLayout(tree()).layout.nodes;
  const c = (id: string) => ({ x: laid[id].x + laid[id].width / 2, y: laid[id].y + laid[id].height / 2 });
  const root = c('root');
  const rOf = (id: string) => Math.hypot(c(id).x - root.x, c(id).y - root.y);
  const depth1 = Math.max(rOf('a'), rOf('b'), rOf('c'));
  const depth2 = Math.min(rOf('a1'), rOf('a2'));
  assert.ok(depth1 > 1, 'children are off-center');
  assert.ok(depth2 > depth1, 'grandchildren sit on a larger ring than children');
});
test('radialLayout is deterministic and pure, preserving sizes and semantics', () => {
  const doc = tree(), original = JSON.stringify(doc);
  const a = radialLayout(doc), b = radialLayout(doc);
  assert.deepEqual(a.layout.nodes, b.layout.nodes);
  assert.equal(JSON.stringify(doc), original);
  assert.deepEqual(a.graph, doc.graph);
  assert.equal(a.layout.nodes.root.width, doc.layout.nodes.root.width);
  for (const id of Object.keys(a.layout.nodes)) { assert.ok(a.layout.nodes[id].x >= 0 && a.layout.nodes[id].y >= 0); }
});
test('radialLayout handles a single node and recomputes edge ports', () => {
  const one = makeDocForRadial({ nodes: [{ id: 'x', type: 'process', title: 'X' }], edges: [] });
  assert.ok(Number.isFinite(radialLayout(one).layout.nodes.x.x));
  assert.ok(radialLayout(tree()).layout.edges.ra.sourcePort);
});

import { treeLayout } from '../packages/diagram/src/layout.ts';
import { createDocument as makeDocForTree } from '../packages/diagram/src/document.ts';

function hierarchy() {
  return makeDocForTree({
    nodes: ['root', 'a', 'b', 'a1', 'a2', 'b1'].map(id => ({ id, type: 'process' as const, title: id })),
    edges: [
      { id: 'ra', source: 'root', target: 'a' }, { id: 'rb', source: 'root', target: 'b' },
      { id: 'aa1', source: 'a', target: 'a1' }, { id: 'aa2', source: 'a', target: 'a2' }, { id: 'bb1', source: 'b', target: 'b1' },
    ],
  });
}

test('treeLayout places children below parents and centers parents over their children', () => {
  const laid = treeLayout(hierarchy()).layout.nodes;
  const cx = (id: string) => laid[id].x + laid[id].width / 2;
  // Depth increases downward.
  assert.ok(laid.a.y > laid.root.y);
  assert.ok(laid.a1.y > laid.a.y);
  // 'a' is centered between its children a1 and a2.
  assert.ok(Math.abs(cx('a') - (cx('a1') + cx('a2')) / 2) < 1);
});
test('treeLayout gives every leaf a distinct column (no horizontal overlap)', () => {
  const laid = treeLayout(hierarchy()).layout.nodes;
  const leaves = ['a1', 'a2', 'b1'].map(id => laid[id].x);
  assert.equal(new Set(leaves).size, 3);
});
test('treeLayout is deterministic and pure, preserving sizes and recomputing ports', () => {
  const doc = hierarchy(), original = JSON.stringify(doc);
  const x = treeLayout(doc), y = treeLayout(doc);
  assert.deepEqual(x.layout.nodes, y.layout.nodes);
  assert.equal(JSON.stringify(doc), original);
  assert.deepEqual(x.graph, doc.graph);
  assert.ok(x.layout.edges.ra.sourcePort);
});
test('treeLayout LR direction swaps the growth axis', () => {
  const tb = treeLayout(hierarchy(), { direction: 'TB' }).layout.nodes;
  const lr = treeLayout(hierarchy(), { direction: 'LR' }).layout.nodes;
  assert.ok(tb.a1.y > tb.root.y); // TB: deeper = lower
  assert.ok(lr.a1.x > lr.root.x); // LR: deeper = further right
});

import { mergeDocuments } from '../packages/diagram/src/layout.ts';
import { createDocument as makeDocMerge } from '../packages/diagram/src/document.ts';
test('mergeDocuments places b to the right of a and keeps both graphs', () => {
  const a = makeDocMerge({ nodes: [{ id: 'x', type: 'process', title: 'X' }], edges: [] });
  const b = makeDocMerge({ nodes: [{ id: 'y', type: 'process', title: 'Y' }], edges: [] });
  const m = mergeDocuments(a, b);
  assert.equal(m.graph.nodes.length, 2);
  assert.ok(m.layout.nodes.y.x > m.layout.nodes.x.x + m.layout.nodes.x.width); // b is to the right
});
test('mergeDocuments remaps colliding node and edge ids, preserving edges', () => {
  const a = makeDocMerge({ nodes: [{ id: 'a', type: 'process', title: 'A1' }, { id: 'b', type: 'process', title: 'B1' }], edges: [{ id: 'ab', source: 'a', target: 'b' }] });
  const b = makeDocMerge({ nodes: [{ id: 'a', type: 'process', title: 'A2' }, { id: 'c', type: 'process', title: 'C2' }], edges: [{ id: 'ab', source: 'a', target: 'c' }] });
  const m = mergeDocuments(a, b);
  assert.equal(m.graph.nodes.length, 4);
  assert.deepEqual(m.graph.nodes.map(n => n.id).sort(), ['a', 'a-2', 'b', 'c'].sort()); // b's 'a' renamed
  assert.equal(m.graph.edges.length, 2);
  const bEdge = m.graph.edges.find(e => e.id !== 'ab')!;
  assert.equal(bEdge.source, 'a-2'); assert.equal(bEdge.target, 'c'); // remapped endpoints
});
test('mergeDocuments is pure and preserves groups/shapes', () => {
  const a = makeDocMerge({ nodes: [{ id: 'x', type: 'process', title: 'X', group: 'G' }], edges: [] });
  const b = makeDocMerge({ nodes: [{ id: 'y', type: 'decision', title: 'Y' }], edges: [] });
  b.layout.nodes.y.shape = 'diamond';
  const aorig = JSON.stringify(a), borig = JSON.stringify(b);
  const m = mergeDocuments(a, b);
  assert.equal(m.graph.nodes.find(n => n.id === 'x')!.group, 'G');
  assert.equal(m.layout.nodes.y.shape, 'diamond');
  assert.equal(JSON.stringify(a), aorig); assert.equal(JSON.stringify(b), borig);
});

import { circularLayout } from '../packages/diagram/src/layout.ts';
test('circularLayout places every node equidistant from the ring centre and preserves the graph', () => {
  const d = createDocument(graph()); d.layout.nodes.a.shape = 'ellipse'; d.layout.nodes.b.width = 170;
  const out = circularLayout(d);
  const c = (id: string) => ({ x: out.layout.nodes[id].x + out.layout.nodes[id].width / 2, y: out.layout.nodes[id].y + out.layout.nodes[id].height / 2 });
  const cx = Object.keys(out.layout.nodes).reduce((s, id) => s + c(id).x, 0) / 4;
  const cy = Object.keys(out.layout.nodes).reduce((s, id) => s + c(id).y, 0) / 4;
  const radii = ['a', 'b', 'c', 'd'].map(id => Math.hypot(c(id).x - cx, c(id).y - cy));
  for (const r of radii) assert.ok(Math.abs(r - radii[0]) < 1.5, 'all nodes share one ring radius');
  assert.ok(radii[0] > 0);
  assert.equal(out.layout.nodes.a.shape, 'ellipse'); // size/shape preserved
  assert.equal(out.layout.nodes.b.width, 170);
  assert.deepEqual(out.graph, d.graph); // semantics untouched
  assert.ok(!/NaN|Infinity/.test(JSON.stringify(out.layout)));
});
test('circularLayout keeps nodes apart (no overlaps) and recomputes ports', () => {
  const d = circularLayout(createDocument(graph()));
  const boxes = Object.values(d.layout.nodes);
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j];
    const apart = a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y;
    assert.ok(apart, 'nodes on the ring do not overlap');
  }
  for (const e of Object.values(d.layout.edges)) { assert.ok(e.sourcePort); assert.ok(e.targetPort); }
});
test('circularLayout is deterministic and handles a single node', () => {
  const a = JSON.stringify(circularLayout(createDocument(graph())).layout);
  const b = JSON.stringify(circularLayout(createDocument(graph())).layout);
  assert.equal(a, b);
  const one = circularLayout(createDocument({ nodes: [{ id: 'x', type: 'process', title: 'X' }], edges: [] }));
  assert.ok(Number.isFinite(one.layout.nodes.x.x) && Number.isFinite(one.layout.nodes.x.y));
});

import { gridLayout } from '../packages/diagram/src/layout.ts';
const sixNodes = () => ({
  nodes: Array.from({ length: 6 }, (_, i) => ({ id: `n${i}`, type: 'process' as const, title: `N${i}` })),
  edges: [{ id: 'e', source: 'n0', target: 'n5' }],
});
test('gridLayout arranges nodes in rows without overlap and preserves semantics', () => {
  const d = createDocument(sixNodes()); d.layout.nodes.n0.shape = 'pill'; d.layout.nodes.n1.width = 220;
  const out = gridLayout(d, { columns: 3 });
  // 6 nodes, 3 columns -> 2 rows. Row 0 shares a y, row 1 shares a larger y.
  const y0 = out.layout.nodes.n0.y;
  assert.equal(out.layout.nodes.n1.y, y0);
  assert.equal(out.layout.nodes.n2.y, y0);
  assert.ok(out.layout.nodes.n3.y > y0);
  // Columns advance in x within a row.
  assert.ok(out.layout.nodes.n0.x < out.layout.nodes.n1.x);
  assert.ok(out.layout.nodes.n1.x < out.layout.nodes.n2.x);
  // No overlaps.
  const boxes = Object.values(out.layout.nodes);
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j];
    const apart = a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y;
    assert.ok(apart, 'grid cells do not overlap');
  }
  assert.equal(out.layout.nodes.n0.shape, 'pill'); // preserved
  assert.deepEqual(out.graph, d.graph); // semantics untouched
});
test('gridLayout defaults to a near-square grid and is deterministic', () => {
  const a = gridLayout(createDocument(sixNodes())); // 6 -> ceil(sqrt)=3 columns
  const rows = new Set(Object.values(a.layout.nodes).map(b => b.y));
  assert.equal(rows.size, 2); // 3 columns x 2 rows
  const b = gridLayout(createDocument(sixNodes()));
  assert.equal(JSON.stringify(a.layout), JSON.stringify(b.layout));
  for (const e of Object.values(a.layout.edges)) { assert.ok(e.sourcePort); assert.ok(e.targetPort); }
});

import { fitNodeSizes } from '../packages/diagram/src/layout.ts';
test('fitNodeSizes widens nodes to fit long titles and clamps to maxWidth', () => {
  const d = createDocument({
    nodes: [{ id: 'short', type: 'process', title: 'Hi' }, { id: 'long', type: 'process', title: 'A very very long descriptive node title that overflows' }],
    edges: [],
  }, { nodes: { short: { x: 0, y: 0, width: 200, height: 92 }, long: { x: 300, y: 0, width: 200, height: 92 } }, edges: {} });
  const out = fitNodeSizes(d, { minWidth: 120, maxWidth: 300 });
  assert.equal(out.layout.nodes.short.width, 140); // floored to the 140px minimum
  assert.equal(out.layout.nodes.long.width, 300); // clamped to maxWidth
  assert.equal(out.layout.nodes.short.x, 0); // position preserved
  assert.deepEqual(out.graph, d.graph); // semantics untouched
});
test('fitNodeSizes gives diamonds more room than rectangles for the same text, preserves shape and height', () => {
  const d = createDocument({
    nodes: [{ id: 'r', type: 'process', title: 'Decision point here' }, { id: 'dm', type: 'decision', title: 'Decision point here' }],
    edges: [],
  }, { nodes: { r: { x: 0, y: 0, width: 200, height: 92 }, dm: { x: 300, y: 0, width: 200, height: 92, shape: 'diamond' } }, edges: {} });
  const out = fitNodeSizes(d, { maxWidth: 1000, height: 110 });
  assert.ok(out.layout.nodes.dm.width > out.layout.nodes.r.width, 'diamond needs more width');
  assert.equal(out.layout.nodes.dm.shape, 'diamond'); // shape preserved
  assert.equal(out.layout.nodes.r.height, 110); // custom height applied
});
test('fitNodeSizes is pure, deterministic and keeps edge ports', () => {
  const d = createDocument({
    nodes: [{ id: 'a', type: 'process', title: 'Alpha' }, { id: 'b', type: 'process', title: 'Beta' }],
    edges: [{ id: 'ab', source: 'a', target: 'b' }],
  }, { nodes: { a: { x: 0, y: 0, width: 200, height: 92 }, b: { x: 300, y: 0, width: 200, height: 92 } }, edges: { ab: { sourcePort: 'right', targetPort: 'left' } } });
  const before = JSON.stringify(d.layout.nodes.a);
  const out = fitNodeSizes(d);
  assert.equal(JSON.stringify(d.layout.nodes.a), before); // input not mutated
  assert.deepEqual(out.layout.edges.ab, { sourcePort: 'right', targetPort: 'left' });
  assert.equal(JSON.stringify(out.layout), JSON.stringify(fitNodeSizes(d).layout)); // deterministic
});

import { subgraph, ego } from '../packages/diagram/src/layout.ts';
const net = () => createDocument({
  nodes: [
    { id: 'a', type: 'process', title: 'A', group: 'G', tags: ['x'] }, { id: 'b', type: 'process', title: 'B' },
    { id: 'c', type: 'process', title: 'C' }, { id: 'd', type: 'process', title: 'D' },
  ],
  edges: [{ id: 'ab', source: 'a', target: 'b' }, { id: 'bc', source: 'b', target: 'c' }, { id: 'ad', source: 'a', target: 'd' }],
}, {
  nodes: { a: { x: 10, y: 20, width: 200, height: 92, shape: 'pill' }, b: { x: 300, y: 20, width: 200, height: 92 }, c: { x: 600, y: 20, width: 200, height: 92 }, d: { x: 10, y: 300, width: 200, height: 92 } },
  edges: { ab: { sourcePort: 'right', targetPort: 'left' }, bc: { sourcePort: 'right', targetPort: 'left' }, ad: { sourcePort: 'bottom', targetPort: 'top' } },
});
test('subgraph keeps the selected nodes and only edges among them, preserving layout and semantics', () => {
  const out = subgraph(net(), ['a', 'b']);
  assert.deepEqual(out.graph.nodes.map(n => n.id), ['a', 'b']); // original order
  assert.deepEqual(out.graph.edges.map(e => e.id), ['ab']); // bc (c dropped) and ad (d dropped) excluded
  assert.equal(out.layout.nodes.a.shape, 'pill'); // layout preserved verbatim
  assert.equal(out.layout.nodes.a.x, 10);
  assert.deepEqual(out.layout.edges.ab, { sourcePort: 'right', targetPort: 'left' });
  assert.deepEqual(out.graph.nodes[0].tags, ['x']); // tags/group preserved
  assert.equal(out.graph.nodes[0].group, 'G');
});
test('subgraph is pure and tolerates unknown / empty selections', () => {
  const src = net();
  const snapshot = JSON.stringify(src);
  const out = subgraph(src, ['a', 'ghost']);
  assert.deepEqual(out.graph.nodes.map(n => n.id), ['a']);
  assert.equal(out.graph.edges.length, 0);
  assert.equal(JSON.stringify(src), snapshot); // input untouched
  assert.equal(subgraph(src, []).graph.nodes.length, 0); // empty is valid
});
test('ego returns the neighbourhood within N hops (undirected by default) and respects direction', () => {
  // depth 1 around b (undirected): b + a + c.
  const d1 = ego(net(), 'b', { depth: 1 });
  assert.deepEqual(d1.graph.nodes.map(n => n.id).sort(), ['a', 'b', 'c']);
  // depth 1 directed from a: a -> b, a -> d (not c, which is two hops).
  const dir = ego(net(), 'a', { depth: 1, directed: true });
  assert.deepEqual(dir.graph.nodes.map(n => n.id).sort(), ['a', 'b', 'd']);
  // depth 2 undirected from a reaches everything.
  assert.equal(ego(net(), 'a', { depth: 2 }).graph.nodes.length, 4);
  assert.throws(() => ego(net(), 'nope'), /no existe/);
});

import { snapToGrid } from '../packages/diagram/src/layout.ts';
test('snapToGrid quantizes positions to the grid, preserving sizes, shapes and semantics', () => {
  const d = createDocument({ nodes: [{ id: 'a', type: 'process', title: 'A' }, { id: 'b', type: 'decision', title: 'B' }], edges: [{ id: 'ab', source: 'a', target: 'b' }] },
    { nodes: { a: { x: 61, y: 27, width: 200, height: 92 }, b: { x: 389, y: 140, width: 230, height: 140, shape: 'diamond' } }, edges: { ab: { sourcePort: 'right', targetPort: 'left' } } });
  const before = JSON.stringify(d);
  const out = snapToGrid(d, 16);
  assert.equal(out.layout.nodes.a.x, 64); // 61 -> 64
  assert.equal(out.layout.nodes.a.y, 32); // 27 -> 32
  assert.equal(out.layout.nodes.b.x, 384); // 389 -> 384
  for (const b of Object.values(out.layout.nodes)) { assert.equal(b.x % 16, 0); assert.equal(b.y % 16, 0); }
  assert.equal(out.layout.nodes.b.shape, 'diamond'); // shape/size preserved
  assert.equal(out.layout.nodes.b.width, 230);
  assert.deepEqual(out.layout.edges.ab, { sourcePort: 'right', targetPort: 'left' });
  assert.deepEqual(out.graph, d.graph);
  assert.equal(JSON.stringify(d), before); // input untouched
});
test('snapToGrid respects a custom grid size and clamps to >= 1', () => {
  const d = createDocument({ nodes: [{ id: 'a', type: 'process', title: 'A' }], edges: [] }, { nodes: { a: { x: 103, y: 97, width: 200, height: 92 } }, edges: {} });
  assert.equal(snapToGrid(d, 50).layout.nodes.a.x, 100);
  assert.equal(snapToGrid(d, 50).layout.nodes.a.y, 100);
  assert.doesNotThrow(() => snapToGrid(d, 0)); // clamped to 1
});

import { collapseGroups } from '../packages/diagram/src/layout.ts';
test('collapseGroups contracts each group to a super-node, dropping internal and de-duping cross-group edges', () => {
  const d = createDocument({
    nodes: [{ id: 'a', type: 'service', title: 'A', group: 'Backend' }, { id: 'b', type: 'database', title: 'B', group: 'Backend' }, { id: 'c', type: 'screen', title: 'C', group: 'Frontend' }, { id: 'd', type: 'generic', title: 'D' }],
    edges: [{ id: 'ab', source: 'a', target: 'b' }, { id: 'ca', source: 'c', target: 'a' }, { id: 'c2', source: 'c', target: 'b' }, { id: 'cd', source: 'c', target: 'd' }],
  });
  const o = collapseGroups(d);
  assert.deepEqual(o.graph.nodes.map(n => n.id).sort(), ['d', 'grupo-Backend', 'grupo-Frontend']);
  assert.equal(o.graph.nodes.find(n => n.id === 'grupo-Backend')!.title, 'Backend');
  // ab internal -> dropped; ca & c2 both Frontend->Backend -> one edge; cd -> Frontend->d.
  const pairs = o.graph.edges.map(e => `${e.source}->${e.target}`).sort();
  assert.deepEqual(pairs, ['grupo-Frontend->d', 'grupo-Frontend->grupo-Backend']);
  assert.ok(o.layout.nodes['grupo-Backend']); // super-node has layout
});
test('collapseGroups is a pure no-op copy when there are no groups', () => {
  const d = createDocument({ nodes: [{ id: 'a', type: 'process', title: 'A' }, { id: 'b', type: 'process', title: 'B' }], edges: [{ id: 'ab', source: 'a', target: 'b' }] });
  const before = JSON.stringify(d);
  const o = collapseGroups(d);
  assert.deepEqual(o.graph.nodes.map(n => n.id), ['a', 'b']);
  assert.equal(o.graph.edges.length, 1);
  assert.equal(JSON.stringify(d), before); // input untouched
});

import { groupBy } from '../packages/diagram/src/layout.ts';
test('groupBy assigns group from type / tag / custom key, leaving layout untouched', () => {
  const d = createDocument({
    nodes: [
      { id: 'a', type: 'service', title: 'A', tags: ['core'] }, { id: 'b', type: 'service', title: 'B' },
      { id: 'c', type: 'database', title: 'C', tags: ['core', 'x'] },
    ],
    edges: [],
  }, { nodes: { a: { x: 5, y: 5, width: 200, height: 92 }, b: { x: 300, y: 5, width: 200, height: 92 }, c: { x: 600, y: 5, width: 200, height: 92 } }, edges: {} });
  const byType = groupBy(d, 'type');
  assert.equal(byType.graph.nodes.find(n => n.id === 'a')!.group, 'service');
  assert.equal(byType.graph.nodes.find(n => n.id === 'b')!.group, 'service');
  assert.equal(byType.graph.nodes.find(n => n.id === 'c')!.group, 'database');
  assert.deepEqual(byType.layout, d.layout); // positions untouched
  const byTag = groupBy(d, 'tag');
  assert.equal(byTag.graph.nodes.find(n => n.id === 'a')!.group, 'core'); // first tag
  assert.equal(byTag.graph.nodes.find(n => n.id === 'b')!.group, undefined); // no tag -> ungrouped
  const custom = groupBy(d, n => n.id === 'a' ? 'solo' : undefined);
  assert.equal(custom.graph.nodes.find(n => n.id === 'a')!.group, 'solo');
  assert.equal(custom.graph.nodes.find(n => n.id === 'b')!.group, undefined);
});
test('groupBy overwrites any pre-existing group and is pure', () => {
  const d = createDocument({ nodes: [{ id: 'a', type: 'service', title: 'A', group: 'old' }], edges: [] }, { nodes: { a: { x: 0, y: 0, width: 200, height: 92 } }, edges: {} });
  const before = JSON.stringify(d);
  const out = groupBy(d, 'type');
  assert.equal(out.graph.nodes[0].group, 'service'); // replaced 'old'
  assert.equal(JSON.stringify(d), before); // input untouched
});

import { clusterLayout } from '../packages/diagram/src/layout.ts';
test('clusterLayout keeps each group cohesive and separates clusters (LR)', () => {
  const d = createDocument({
    nodes: [{ id: 'a', type: 'process', title: 'A', group: 'X' }, { id: 'b', type: 'process', title: 'B', group: 'X' }, { id: 'c', type: 'process', title: 'C', group: 'Y' }, { id: 'd', type: 'process', title: 'D', group: 'Y' }],
    edges: [{ id: 'ab', source: 'a', target: 'b' }, { id: 'cd', source: 'c', target: 'd' }, { id: 'bc', source: 'b', target: 'c' }],
  });
  const o = clusterLayout(d, { direction: 'LR' });
  const bbox = (g: string) => { const bs = o.graph.nodes.filter(n => n.group === g).map(n => o.layout.nodes[n.id]); return { minX: Math.min(...bs.map(b => b.x)), maxX: Math.max(...bs.map(b => b.x + b.width)) }; };
  assert.ok(bbox('X').maxX <= bbox('Y').minX, 'cluster X is entirely left of cluster Y');
  assert.deepEqual(o.graph, d.graph); // semantics (incl. groups) untouched
  assert.ok(!/NaN/.test(JSON.stringify(o.layout)));
  for (const e of Object.values(o.layout.edges)) { assert.ok(e.sourcePort); assert.ok(e.targetPort); }
});
test('clusterLayout places ungrouped nodes as their own cluster and preserves sizes/shapes', () => {
  const d = createDocument({
    nodes: [{ id: 'a', type: 'process', title: 'A', group: 'G' }, { id: 'b', type: 'decision', title: 'B' }],
    edges: [],
  }, { nodes: { a: { x: 0, y: 0, width: 200, height: 92 }, b: { x: 0, y: 0, width: 230, height: 140, shape: 'diamond' } }, edges: {} });
  const o = clusterLayout(d);
  assert.equal(o.layout.nodes.b.shape, 'diamond'); // shape preserved
  assert.equal(o.layout.nodes.b.width, 230);
  assert.equal(o.graph.nodes.length, 2);
});

import { documentBounds, normalizePositions } from '../packages/diagram/src/layout.ts';
test('documentBounds spans all node boxes; empty doc is a zero box', () => {
  const d = createDocument({ nodes: [{ id: 'a', type: 'process', title: 'A' }, { id: 'b', type: 'process', title: 'B' }], edges: [] },
    { nodes: { a: { x: 100, y: 50, width: 200, height: 92 }, b: { x: 500, y: 300, width: 200, height: 92 } }, edges: {} });
  assert.deepEqual(documentBounds(d), { x: 100, y: 50, width: 600, height: 342 }); // 700-100, 392-50
  assert.deepEqual(documentBounds(createDocument({ nodes: [], edges: [] })), { x: 0, y: 0, width: 0, height: 0 });
});
test('normalizePositions shifts the top-left to pad, keeping relative layout and semantics', () => {
  const d = createDocument({ nodes: [{ id: 'a', type: 'process', title: 'A' }, { id: 'b', type: 'decision', title: 'B' }], edges: [{ id: 'ab', source: 'a', target: 'b' }] },
    { nodes: { a: { x: 1000, y: 500, width: 200, height: 92 }, b: { x: 1400, y: 500, width: 230, height: 140, shape: 'diamond' } }, edges: { ab: { sourcePort: 'right', targetPort: 'left' } } });
  const before = JSON.stringify(d);
  const out = normalizePositions(d, 80);
  const b = documentBounds(out);
  assert.equal(b.x, 80); assert.equal(b.y, 80); // top-left moved to pad
  assert.equal(out.layout.nodes.b.x - out.layout.nodes.a.x, 400); // relative spacing preserved
  assert.equal(out.layout.nodes.b.shape, 'diamond');
  assert.deepEqual(out.layout.edges.ab, { sourcePort: 'right', targetPort: 'left' });
  assert.equal(JSON.stringify(d), before); // input untouched
});

import { unionDocuments } from '../packages/diagram/src/layout.ts';
test('unionDocuments merges by id (dedup), unlike mergeDocuments which renames', () => {
  const a = createDocument({ nodes: [{ id: 'x', type: 'process', title: 'X' }, { id: 'y', type: 'process', title: 'Y' }], edges: [{ id: 'xy', source: 'x', target: 'y' }] },
    { nodes: { x: { x: 0, y: 0, width: 200, height: 92 }, y: { x: 300, y: 0, width: 200, height: 92 } }, edges: { xy: { sourcePort: 'right', targetPort: 'left' } } });
  const b = createDocument({ nodes: [{ id: 'y', type: 'service', title: 'Y2' }, { id: 'z', type: 'process', title: 'Z' }], edges: [{ id: 'yz', source: 'y', target: 'z' }] },
    { nodes: { y: { x: 999, y: 10, width: 200, height: 92 }, z: { x: 600, y: 0, width: 200, height: 92 } }, edges: { yz: { sourcePort: 'right', targetPort: 'left' } } });
  const u = unionDocuments(a, b); // prefer b
  assert.deepEqual(u.graph.nodes.map(n => n.id).sort(), ['x', 'y', 'z']); // y deduped
  const y = u.graph.nodes.find(n => n.id === 'y')!;
  assert.equal(y.title, 'Y2'); // b wins on conflict
  assert.equal(y.type, 'service');
  assert.equal(u.layout.nodes.y.x, 999); // b's layout wins
  assert.deepEqual(u.graph.edges.map(e => e.id).sort(), ['xy', 'yz']);
});
test('unionDocuments with prefer:a keeps a on conflicts', () => {
  const a = createDocument({ nodes: [{ id: 'y', type: 'process', title: 'KeepMe' }], edges: [] }, { nodes: { y: { x: 1, y: 1, width: 200, height: 92 } }, edges: {} });
  const b = createDocument({ nodes: [{ id: 'y', type: 'process', title: 'Override' }], edges: [] }, { nodes: { y: { x: 9, y: 9, width: 200, height: 92 } }, edges: {} });
  const u = unionDocuments(a, b, { prefer: 'a' });
  assert.equal(u.graph.nodes.find(n => n.id === 'y')!.title, 'KeepMe');
  assert.equal(u.layout.nodes.y.x, 1);
});

import { relabelIds } from '../packages/diagram/src/layout.ts';
test('relabelIds renames nodes, remaps edges and layout, dedups collisions, preserves the rest', () => {
  const d = createDocument({ nodes: [{ id: 'a', type: 'process', title: 'A', group: 'G' }, { id: 'b', type: 'decision', title: 'B' }], edges: [{ id: 'ab', source: 'a', target: 'b' }] },
    { nodes: { a: { x: 5, y: 5, width: 200, height: 92 }, b: { x: 300, y: 5, width: 230, height: 140, shape: 'diamond' } }, edges: { ab: { sourcePort: 'right', targetPort: 'left' } } });
  const before = JSON.stringify(d);
  const r = relabelIds(d, id => 'ns_' + id);
  assert.deepEqual(r.graph.nodes.map(n => n.id), ['ns_a', 'ns_b']);
  assert.equal(r.graph.edges[0].source, 'ns_a');
  assert.equal(r.graph.edges[0].target, 'ns_b');
  assert.equal(r.graph.edges[0].id, 'ab'); // edge id unchanged
  assert.ok(r.layout.nodes.ns_a && r.layout.nodes.ns_b); // layout keys remapped
  assert.equal(r.layout.nodes.ns_b.shape, 'diamond'); // layout preserved
  assert.equal(r.graph.nodes[0].group, 'G'); // group preserved
  assert.equal(JSON.stringify(d), before); // input untouched
});
test('relabelIds de-duplicates colliding results with a numeric suffix', () => {
  const d = createDocument({ nodes: [{ id: 'a', type: 'process', title: 'A' }, { id: 'b', type: 'process', title: 'B' }], edges: [] });
  const r = relabelIds(d, () => 'x');
  assert.deepEqual(r.graph.nodes.map(n => n.id).sort(), ['x', 'x-2']);
});
