import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDocument, parseDocument } from '../packages/diagram/src/document.ts';
const base = () => createDocument({ nodes: [{ id: 'a', type: 'decision', title: '¿Sí?' }, { id: 'b', type: 'end', title: 'Fin' }], edges: [{ id: 'ab', source: 'a', target: 'b' }] });
test('v1 migrates to v2 without modifying the input', () => {
  const legacy = { ...base(), version: 1 };
  assert.equal(parseDocument(legacy).version, 2);
  assert.equal(legacy.version, 1);
  assert.deepEqual(parseDocument(legacy).graph, legacy.graph);
});
test('v2 preserves semantic metadata and separate visual styles on round-trip', () => {
  const d = base();
  d.graph.nodes[0].tags = [' security ', 'security'];
  Object.assign(d.graph.edges[0], { label: 'Sí', relation: 'condition', condition: 'authorized', tags: ['allow'] });
  d.layout.nodes.a.shape = 'diamond';
  Object.assign(d.layout.edges.ab, { startMarker: 'dot', endMarker: 'none', dashed: true, labelPosition: 'end', labelOffset: -14 });
  const saved = parseDocument(JSON.stringify(d));
  assert.deepEqual(saved.graph.nodes[0].tags, ['security']);
  assert.deepEqual(saved.graph.edges, d.graph.edges);
  assert.deepEqual(saved.layout, d.layout);
  assert.ok(!('shape' in saved.graph.nodes[0]));
});
test('rejects malformed new fields and unknown future document versions', () => {
  for (const mutate of [
    (d: any) => d.version = 3,
    (d: any) => d.graph.nodes[0].tags = [''],
    (d: any) => d.graph.nodes[0].tags = ['x'.repeat(65)],
    (d: any) => d.graph.edges[0].condition = {},
    (d: any) => d.layout.nodes.a.shape = 'unknown',
    (d: any) => d.layout.edges.ab.endMarker = 'unknown',
    (d: any) => d.layout.edges.ab.dashed = 'true',
  ]) { const d = base(); mutate(d); assert.throws(() => parseDocument(d)); }
});
test('document profile is optional, validated and preserved on round-trip', () => {
  const d = createDocument(base().graph, undefined, 'flow');
  assert.equal(parseDocument(JSON.stringify(d)).profile, 'flow');
  assert.ok(!('profile' in parseDocument(base())));
  assert.throws(() => parseDocument({ ...base(), profile: '' }));
  assert.throws(() => parseDocument({ ...base(), profile: 'x'.repeat(65) }));
  assert.throws(() => parseDocument({ ...base(), profile: 7 }));
});
test('label placement is validated and preserved; bad values are rejected', () => {
  const d = base(); Object.assign(d.layout.edges.ab, { labelPosition: 'start', labelOffset: 20 });
  const saved = parseDocument(JSON.stringify(d));
  assert.equal(saved.layout.edges.ab.labelPosition, 'start');
  assert.equal(saved.layout.edges.ab.labelOffset, 20);
  for (const bad of [{ labelPosition: 'corner' }, { labelOffset: 1000 }, { labelOffset: 'x' }, { labelOffset: Infinity }]) {
    const broken = base(); Object.assign(broken.layout.edges.ab, bad);
    assert.throws(() => parseDocument(broken));
  }
});
import { nodeDefaults, nodeShapes } from '../packages/diagram/src/types.ts';
test('every node type has a usable creation default and flow types carry their shape', () => {
  for (const preset of Object.values(nodeDefaults)) {
    assert.ok(preset.width >= 140 && preset.height >= 76);
    assert.ok(preset.shape === undefined || nodeShapes.includes(preset.shape));
  }
  assert.equal(nodeDefaults.decision.shape, 'diamond');
  assert.equal(nodeDefaults.start.shape, 'pill');
  assert.equal(nodeDefaults.end.shape, 'pill');
});
test('node group membership round-trips and rejects invalid values', () => {
  const d = base(); d.graph.nodes[0].group = 'seguridad';
  assert.equal(parseDocument(JSON.stringify(d)).graph.nodes[0].group, 'seguridad');
  assert.ok(!('group' in parseDocument(base()).graph.nodes[0]));
  for (const bad of ['', '   ', 'x'.repeat(65), 7 as unknown as string]) {
    const broken = base(); (broken.graph.nodes[0] as { group?: unknown }).group = bad;
    assert.throws(() => parseDocument(broken));
  }
});
test('group paths may use "/" for nesting and still round-trip', () => {
  const d = base(); d.graph.nodes[0].group = 'sistema/seguridad';
  assert.equal(parseDocument(JSON.stringify(d)).graph.nodes[0].group, 'sistema/seguridad');
});
test('node lane membership round-trips and rejects invalid values', () => {
  const d = base(); d.graph.nodes[0].lane = 'Cliente';
  assert.equal(parseDocument(JSON.stringify(d)).graph.nodes[0].lane, 'Cliente');
  assert.ok(!('lane' in parseDocument(base()).graph.nodes[0]));
  const broken = base(); (broken.graph.nodes[0] as { lane?: unknown }).lane = '   ';
  assert.throws(() => parseDocument(broken));
});

import { createLayout } from '../packages/diagram/src/document.ts';
test('createLayout/createDocument apply per-type default shape and size (decision->diamond, start/end->pill)', () => {
  const doc = createDocument({
    nodes: [
      { id: 'a', type: 'start', title: 'Inicio' }, { id: 'b', type: 'decision', title: '¿Sí?' },
      { id: 'c', type: 'end', title: 'Fin' }, { id: 'd', type: 'service', title: 'Svc' },
    ],
    edges: [],
  });
  assert.equal(doc.layout.nodes.a.shape, 'pill');
  assert.equal(doc.layout.nodes.b.shape, 'diamond');
  assert.equal(doc.layout.nodes.c.shape, 'pill');
  assert.equal(doc.layout.nodes.d.shape, undefined); // service default is a rectangle (no shape key)
  // Sizes come from the nodeDefaults catalog, matching addNode.
  assert.equal(doc.layout.nodes.b.width, nodeDefaults.decision.width);
  assert.equal(doc.layout.nodes.b.height, nodeDefaults.decision.height);
  // createLayout directly honours it too.
  assert.equal(createLayout({ nodes: [{ id: 'x', type: 'decision', title: 'X' }], edges: [] }).nodes.x.shape, 'diamond');
});

import { safeParseDocument } from '../packages/diagram/src/document.ts';
test('safeParseDocument returns ok/document for valid input and an error string for invalid', () => {
  const good = safeParseDocument(base());
  assert.equal(good.ok, true);
  if (good.ok) assert.equal(good.document.version, 2);
  const bad = safeParseDocument({ nope: 1 });
  assert.equal(bad.ok, false);
  if (!bad.ok) assert.ok(typeof bad.error === 'string' && bad.error.length > 0);
  // Never throws, even on junk.
  assert.doesNotThrow(() => safeParseDocument('not json'));
  assert.equal(safeParseDocument('not json').ok, false);
});
