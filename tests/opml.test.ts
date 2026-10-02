import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDocument } from '../packages/diagram/src/document.ts';
import { fromOpml, toOpml } from '../packages/diagram/src/opml.ts';
import { detectFormat, parseAny, serializeAs } from '../packages/diagram/src/convert.ts';

const sample = `<?xml version="1.0"?>
<opml version="2.0">
  <head><title>Plan</title></head>
  <body>
    <outline text="Raíz">
      <outline text="Rama A">
        <outline text="Hoja A1"/>
      </outline>
      <outline text="Rama B"/>
    </outline>
  </body>
</opml>`;

test('fromOpml turns outline nesting into parent -> child edges', () => {
  const d = fromOpml(sample);
  assert.deepEqual(d.graph.nodes.map(n => n.title), ['Raíz', 'Rama A', 'Hoja A1', 'Rama B']);
  const id = (t: string) => d.graph.nodes.find(n => n.title === t)!.id;
  const has = (a: string, b: string) => d.graph.edges.some(e => e.source === id(a) && e.target === id(b));
  assert.ok(has('Raíz', 'Rama A'));
  assert.ok(has('Rama A', 'Hoja A1'));
  assert.ok(has('Raíz', 'Rama B'));
  assert.equal(d.graph.edges.length, 3);
  // deeper nodes land on deeper layers
  assert.ok(d.layout.nodes[id('Hoja A1')].y > d.layout.nodes[id('Raíz')].y);
});

test('toOpml nests children under their parent and emits valid OPML', () => {
  const xml = toOpml(fromOpml(sample), { title: 'Mi plan' });
  assert.ok(xml.startsWith('<?xml'));
  assert.match(xml, /<opml version="2\.0">/);
  assert.match(xml, /<title>Mi plan<\/title>/);
  assert.match(xml, /<outline text="Raíz">/);
  assert.match(xml, /<outline text="Hoja A1"\/>/); // leaf is self-closing
  // round-trip: structure survives
  const back = fromOpml(xml).graph;
  assert.deepEqual(back.nodes.map(n => n.title).sort(), ['Hoja A1', 'Rama A', 'Rama B', 'Raíz']);
  assert.equal(back.edges.length, 3);
});

test('toOpml handles a forest (multiple roots) and escapes special chars', () => {
  const d = createDocument({
    nodes: [{ id: 'a', type: 'process', title: 'A & <B>' }, { id: 'b', type: 'process', title: 'Solo' }],
    edges: [],
  });
  const xml = toOpml(d);
  assert.match(xml, /text="A &amp; &lt;B&gt;"/); // escaped
  assert.equal((xml.match(/<outline /g) ?? []).length, 2); // two top-level outlines
});

test('fromOpml throws on an empty body; detectFormat recognises OPML and convert round-trips', () => {
  assert.throws(() => fromOpml('<opml><body></body></opml>'), /no contiene outlines/);
  assert.equal(detectFormat(sample), 'opml');
  const back = parseAny(serializeAs(fromOpml(sample), 'opml'), 'opml').graph;
  assert.equal(back.nodes.length, 4);
});
