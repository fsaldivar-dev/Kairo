import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDocument, parseDocument } from '../packages/diagram/src/document.ts';
import { anchor, connectionPath, defaultPorts, groupBounds, laneBands, nearestPort, roundedPolyline } from '../packages/diagram/src/geometry.ts';
import { detailLevel } from '../packages/diagram/src/theme.ts';
import { ports, type Port } from '../packages/diagram/src/types.ts';

const graph = () => ({ nodes: [{ id: 'a', title: 'Auth', type: 'service' as const }, { id: 'b', title: 'Users', type: 'database' as const }], edges: [{ id: 'ab', source: 'a', target: 'b' }] });
test('document serializes semantic content independently from layout and styling', () => {
  const original = graph(), doc = createDocument(original);
  doc.layout.nodes.a.x = 500;
  assert.deepEqual(doc.graph, original);
  const roundTrip = parseDocument(JSON.stringify(doc));
  assert.equal(roundTrip.layout.nodes.a.x, 500);
  assert.deepEqual(roundTrip.graph, original);
});
test('import creates an owned copy and strips decorative fields', () => {
  const input = createDocument(graph());
  Object.assign(input.graph.nodes[0], { background: 'pink', x: 999 });
  const parsed = parseDocument(input);
  input.graph.nodes[0].title = 'Mutated';
  assert.equal(parsed.graph.nodes[0].title, 'Auth');
  assert.deepEqual(Object.keys(parsed.graph.nodes[0]).sort(), ['id', 'title', 'type']);
});
test('rejects duplicate IDs, missing endpoints, bad ports and non-finite positions', () => {
  const invalid = [
    (d: ReturnType<typeof createDocument>) => { d.graph.nodes[1].id = 'a'; },
    (d: ReturnType<typeof createDocument>) => { d.graph.edges[0].target = 'missing'; },
    (d: ReturnType<typeof createDocument>) => { d.layout.nodes.a.x = Infinity; },
    (d: ReturnType<typeof createDocument>) => { d.layout.edges.ab.sourcePort = 'center' as Port; },
    (d: ReturnType<typeof createDocument>) => { d.graph.nodes[0].id = '__proto__'; },
  ];
  invalid.forEach(mutate => { const d = createDocument(graph()); mutate(d); assert.throws(() => parseDocument(d)); });
});
test('self-loops are valid document data; whether they can be created is a profile policy', () => {
  const d = createDocument(graph()); d.graph.edges[0].target = 'a';
  assert.equal(parseDocument(d).graph.edges[0].target, 'a');
});
test('a self-loop gets corner ports by default and every self-loop route stays outside the node body', () => {
  const box = { x: 100, y: 100, width: 200, height: 92 };
  assert.deepEqual(defaultPorts(box, box), { sourcePort: 'right', targetPort: 'bottom' });
  for (const source of ports) for (const target of ports) {
    const path = connectionPath(anchor(box, source), anchor(box, target), source, target, 'rounded');
    assert.ok(!/NaN|Infinity/.test(path));
    const inside = [...path.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map(m => ({ x: +m[1], y: +m[2] }))
      .filter(p => p.x > box.x + 1 && p.x < box.x + box.width - 1 && p.y > box.y + 1 && p.y < box.y + box.height - 1);
    assert.deepEqual(inside, [], `${source}→${target} enters the node: ${path}`);
  }
});
test('anchors use node bounds, including negative world positions', () => {
  const box = { x: -40, y: 20, width: 200, height: 100 };
  assert.deepEqual(anchor(box, 'right'), { x: 160, y: 70 });
  assert.deepEqual(anchor(box, 'top'), { x: 60, y: 20 });
});
test('every port combination produces finite paths ending at the target', () => {
  for (const source of ports) for (const target of ports) for (const style of ['smooth', 'rounded'] as const) {
    for (const end of [{ x: 300, y: 160 }, { x: -100, y: -50 }, { x: 0, y: 0 }]) {
      const path = connectionPath({ x: 0, y: 0 }, end, source, target, style);
      assert.ok(path.startsWith('M 0 0'));
      assert.ok(path.endsWith(`${end.x} ${end.y}`));
      assert.ok(!/NaN|Infinity/.test(path));
    }
  }
});
test('rounded path softens corners and keeps straight lines simple', () => {
  assert.equal(roundedPolyline([{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 100, y: 0 }], 12), 'M 0 0 L 100 0');
  assert.match(connectionPath({ x: 0, y: 0 }, { x: 300, y: 150 }, 'right', 'left', 'rounded'), / Q /);
  assert.match(connectionPath({ x: 0, y: 0 }, { x: 300, y: 150 }, 'right', 'left', 'smooth'), / C /);
});
test('snapping uses a forgiving radius, rejects invalid targets, and excludes origin', () => {
  const d = createDocument(graph()), left = anchor(d.layout.nodes.b, 'left');
  assert.equal(nearestPort(d, { x: left.x - 20, y: left.y + 2 }, 'a', 24)?.id, 'b');
  assert.equal(nearestPort(d, { x: left.x - 30, y: left.y }, 'a', 24), null);
  assert.equal(nearestPort(d, left, 'a', 24, () => false), null);
  assert.equal(nearestPort(d, anchor(d.layout.nodes.a, 'top'), 'a', 24), null);
  assert.deepEqual(nearestPort(d, anchor(d.layout.nodes.a, 'top'), null, 24, (id, port) => id === 'a' && port !== 'right')?.port, 'top');
});
test('detail thresholds hide optional content before it gets too small', () => {
  assert.equal(detailLevel(0.3), 'low'); assert.equal(detailLevel(0.8), 'medium'); assert.equal(detailLevel(1.5), 'high');
});
test('groupBounds wraps each group of nodes with padding and ignores ungrouped nodes', () => {
  const doc = createDocument({
    nodes: [
      { id: 'a', type: 'service', title: 'A', group: 'core' },
      { id: 'b', type: 'database', title: 'B', group: 'core' },
      { id: 'c', type: 'api', title: 'C' },
    ],
    edges: [],
  });
  doc.layout.nodes.a = { x: 100, y: 100, width: 200, height: 92 };
  doc.layout.nodes.b = { x: 400, y: 260, width: 200, height: 92 };
  const bounds = groupBounds(doc, 20);
  assert.deepEqual(Object.keys(bounds), ['core']);
  assert.deepEqual(bounds.core, { x: 80, y: 80, width: 540, height: 292, label: 'core' });
});
test('groupBounds nests ancestor prefixes so outer groups enclose inner ones', () => {
  const doc = createDocument({
    nodes: [
      { id: 'a', type: 'service', title: 'A', group: 'sys/auth' },
      { id: 'b', type: 'database', title: 'B', group: 'sys/auth' },
      { id: 'c', type: 'api', title: 'C', group: 'sys/data' },
      { id: 'd', type: 'screen', title: 'D' },
    ],
    edges: [],
  });
  doc.layout.nodes.a = { x: 0, y: 0, width: 200, height: 100 };
  doc.layout.nodes.b = { x: 300, y: 0, width: 200, height: 100 };
  doc.layout.nodes.c = { x: 0, y: 300, width: 200, height: 100 };
  const bounds = groupBounds(doc, 10);
  assert.deepEqual(Object.keys(bounds).sort(), ['sys', 'sys/auth', 'sys/data']);
  assert.equal(bounds['sys/auth'].label, 'auth');
  // sys encloses both children (outer padding larger for the shallower group).
  const outer = bounds.sys, inner = bounds['sys/auth'];
  assert.ok(outer.x < inner.x && outer.y < inner.y);
  assert.ok(outer.x + outer.width > inner.x + inner.width && outer.y + outer.height > inner.y + inner.height);
});
test('laneBands build full-height columns per lane, ordered left to right', () => {
  const doc = createDocument({
    nodes: [
      { id: 'a', type: 'service', title: 'A', lane: 'Cliente' },
      { id: 'b', type: 'api', title: 'B', lane: 'Servidor' },
      { id: 'c', type: 'database', title: 'C', lane: 'Servidor' },
    ],
    edges: [],
  });
  doc.layout.nodes.a = { x: 0, y: 0, width: 180, height: 90 };
  doc.layout.nodes.b = { x: 300, y: 0, width: 180, height: 90 };
  doc.layout.nodes.c = { x: 300, y: 300, width: 180, height: 90 };
  const bands = laneBands(doc, 'columns', 20);
  assert.deepEqual(bands.map(b => b.lane), ['Cliente', 'Servidor']);
  // Every column spans the full vertical extent (0..390 + padding).
  for (const band of bands) { assert.equal(band.y, -20); assert.equal(band.height, 390 + 40); }
  assert.ok(bands[0].x < bands[1].x);
});

test('connectionPath renders smooth as a curve, rounded with arcs, orthogonal as sharp corners', () => {
  const a = { x: 0, y: 0 }, b = { x: 200, y: 120 };
  const smooth = connectionPath(a, b, 'right', 'left', 'smooth');
  const rounded = connectionPath(a, b, 'right', 'left', 'rounded');
  const ortho = connectionPath(a, b, 'right', 'left', 'orthogonal');
  assert.ok(smooth.includes('C')); // cubic bezier
  assert.ok(rounded.includes('Q')); // rounded corners use quadratics
  assert.ok(ortho.includes('L') && !ortho.includes('Q') && !ortho.includes('C')); // sharp polyline
});
