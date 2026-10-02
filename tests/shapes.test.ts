import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDocument, parseDocument } from '../packages/diagram/src/document.ts';
import { anchor, nearestPort } from '../packages/diagram/src/geometry.ts';
import { nodeShapes, ports } from '../packages/diagram/src/types.ts';
import { toSVG, toEditableSvg } from '../packages/diagram/src/export.ts';
import { fromSvg } from '../packages/diagram/src/svgimport.ts';
import { fromDrawio, toDrawio } from '../packages/diagram/src/drawio.ts';
import { parseFlowText, toFlowText } from '../packages/diagram/src/text.ts';
import { toDotText } from '../packages/diagram/src/dot.ts';
import { toD2 } from '../packages/diagram/src/d2.ts';
import { toExcalidraw } from '../packages/diagram/src/excalidraw.ts';
import { toGraphml } from '../packages/diagram/src/graphml.ts';
import { fromMarkdown } from '../packages/diagram/src/markdown.ts';

function catalog() {
  const doc = createDocument({ nodes: nodeShapes.map(shape => ({ id: shape, type: 'generic', title: shape })), edges: [] });
  nodeShapes.forEach(shape => { doc.layout.nodes[shape].shape = shape; });
  return doc;
}
test('all twelve shapes persist in JSON, editable SVG and draw.io with geometry', () => {
  const doc = catalog();
  for (const restored of [parseDocument(JSON.stringify(doc)), fromSvg(toEditableSvg(doc)), fromDrawio(toDrawio(doc))]) {
    assert.deepEqual(restored.layout.nodes, doc.layout.nodes);
  }
});
test('sloped and wavy contours anchor and snap to their actual boundary after resize', () => {
  for (const [width, height] of [[200, 100], [310, 180]]) {
    const doc = catalog();
    for (const shape of nodeShapes) {
      const box = { x: 42, y: -17, width, height, shape };
      doc.layout.nodes[shape] = box;
      const xRadius = shape === 'triangle' ? width / 4 : ['parallelogram', 'trapezoid'].includes(shape) ? width * .41 : width / 2;
      assert.deepEqual(anchor(box, 'left'), { x: 42 + width / 2 - xRadius, y: -17 + height / 2 });
      assert.deepEqual(anchor(box, 'right'), { x: 42 + width / 2 + xRadius, y: -17 + height / 2 });
      assert.deepEqual(anchor(box, 'bottom'), { x: 42 + width / 2, y: -17 + height * (shape === 'document' ? .85 : 1) });
      for (const port of ports) {
        const isolated = { ...doc, graph: { nodes: doc.graph.nodes.filter(n => n.id === shape), edges: [] } };
        assert.equal(nearestPort(isolated, anchor(box, port), null, 1)?.port, port);
      }
    }
  }
});
test('new database and file nodes use cylinder and document without migrating saved rectangles', () => {
  const doc = createDocument({ nodes: [{ id: 'db', type: 'database', title: 'Datos' }, { id: 'file', type: 'file', title: 'Informe' }], edges: [] });
  assert.equal(doc.layout.nodes.db.shape, 'cylinder');
  assert.equal(doc.layout.nodes.file.shape, 'document');
  delete doc.layout.nodes.db.shape;
  assert.equal(parseDocument(doc).layout.nodes.db.shape, undefined);
});
test('Markdown and Mermaid preserve cylinder, subroutine, hexagon, data and trapezoid syntax', () => {
  const source = 'flowchart LR\nA[(Datos)] --> B[[Rutina]] --> C{{Preparar}} --> D[/Entrada/] --> E[/Manual\\]';
  const doc = fromMarkdown('# Proceso\n```mermaid\n' + source + '\n```');
  assert.deepEqual(Object.values(doc.layout.nodes).map(n => n.shape), ['cylinder', 'subprocess', 'hexagon', 'parallelogram', 'trapezoid']);
  const round = parseFlowText(toFlowText(doc));
  assert.deepEqual(Object.values(round.layout.nodes).map(n => n.shape), Object.values(doc.layout.nodes).map(n => n.shape));
  doc.layout.nodes.A.shape = 'diamond';
  assert.match(toFlowText(doc), /A\{Datos\}/); // Explicit visual shape wins over database type.
});
test('every exporter handles the expanded shape union without undefined or invalid numbers', () => {
  const doc = catalog();
  for (const output of [toSVG(doc), toFlowText(doc), toDotText(doc), toD2(doc), toGraphml(doc), JSON.stringify(toExcalidraw(doc))]) {
    assert.doesNotMatch(output, /undefined|NaN|Infinity/);
  }
});
