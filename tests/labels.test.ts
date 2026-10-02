import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wrapLabel, layoutNodeLabel } from '../packages/diagram/src/labels.ts';
import { toSVG } from '../packages/diagram/src/export.ts';
import { createDocument } from '../packages/diagram/src/document.ts';

test('labels preserve hard breaks and whole graphemes, including emoji and combining accents', () => {
  assert.deepEqual(wrapLabel('Inicio\r\n\r\nFin', 400), ['Inicio', '', 'Fin']);
  assert.deepEqual(wrapLabel('', 200), ['']);
  const cluster = '👩🏽‍💻', accent = 'e\u0301';
  assert.deepEqual(wrapLabel(cluster.repeat(4), 33), [cluster.repeat(2), cluster.repeat(2)]);
  assert.deepEqual(wrapLabel(accent.repeat(4), 17), [accent.repeat(2), accent.repeat(2)]);
  assert.equal(wrapLabel('uno\ndos\ntres', 200, 2).join('|'), 'uno|dos…');
  assert.equal(wrapLabel('abcdefghij', 32, 2).join('|'), 'abcd|efg…');
});

test('rectangle labels reserve room for metadata at minimum/default/expanded heights', () => {
  for (const height of [76, 92, 110, 140]) for (const source of [undefined, 'src/archivo.ts']) {
    const node = { title: 'Un título muy largo con varias palabras para comprobar el ajuste', source };
    const box = { x: 0, y: 0, width: 210, height };
    const before = JSON.stringify({node, box}), layout = layoutNodeLabel(node, box);
    assert.ok(layout.y >= 13);
    assert.ok(layout.typeY - (layout.y + (layout.lines.length - 1) * 16) >= 18);
    assert.ok((source ? layout.sourceY : layout.typeY) <= height - 10);
    assert.equal(JSON.stringify({node, box}), before);
  }
});

test('SVG uses the same lines and positions as the opt-in renderer and escapes literal text', () => {
  const node = { id: 'a', type: 'service' as const, title: 'Revisar <script> & detalles\npara el equipo', source: 'src/a.ts' };
  const box = { x: 0, y: 0, width: 270, height: 150 };
  const doc = createDocument({ nodes: [node], edges: [] }, { nodes: { a: box }, edges: {} });
  const layout = layoutNodeLabel(node, box), svg = toSVG(doc, { wrapLabels: true });
  assert.equal((svg.match(/<tspan /g) ?? []).length, layout.lines.length);
  for (const [i, line] of layout.lines.entries()) {
    const escaped = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    assert.ok(svg.includes(`<tspan x="${layout.x}" y="${layout.y + 16 * i}">${escaped}</tspan>`));
  }
  assert.ok(!svg.includes('<script>'));
});
