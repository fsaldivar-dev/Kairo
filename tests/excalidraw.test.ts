import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDocument } from '../packages/diagram/src/document.ts';
import { toExcalidraw, fromExcalidraw } from '../packages/diagram/src/excalidraw.ts';

const doc = () => createDocument({
  nodes: [{ id: 'a', type: 'service', title: 'Auth' }, { id: 'b', type: 'decision', title: 'Ok?' }],
  edges: [{ id: 'ab', source: 'a', target: 'b', label: 'go' }],
}, {
  nodes: { a: { x: 0, y: 0, width: 200, height: 92 }, b: { x: 300, y: 0, width: 200, height: 92, shape: 'diamond' } },
  edges: { ab: { sourcePort: 'right', targetPort: 'left' } },
});

test('toExcalidraw emits shapes with bound text and bound arrows', () => {
  const scene = toExcalidraw(doc());
  assert.equal(scene.type, 'excalidraw');
  const shapes = scene.elements.filter(e => e.type === 'rectangle' || e.type === 'diamond');
  assert.equal(shapes.length, 2);
  assert.equal(scene.elements.find(e => e.type === 'diamond')!.id, 'b');
  const texts = scene.elements.filter(e => e.type === 'text');
  assert.equal(texts.length, 2);
  assert.equal(texts.find(t => t.containerId === 'a')!.text, 'Auth');
  const arrows = scene.elements.filter(e => e.type === 'arrow');
  assert.equal(arrows.length, 1);
  assert.equal((arrows[0].startBinding as { elementId: string }).elementId, 'a');
  assert.equal((arrows[0].endBinding as { elementId: string }).elementId, 'b');
});
test('fromExcalidraw imports shapes and bound arrows; round-trips structure and shapes', () => {
  const round = fromExcalidraw(toExcalidraw(doc()));
  assert.deepEqual(round.graph.nodes.map(n => n.id).sort(), ['a', 'b']);
  assert.ok(round.graph.nodes.every(n => n.type === 'generic'));
  assert.equal(round.graph.nodes.find(n => n.id === 'a')!.title, 'Auth');
  assert.equal(round.layout.nodes.b.shape, 'diamond');
  assert.deepEqual(round.graph.edges.map(e => [e.source, e.target]), [['a', 'b']]);
  assert.equal(round.layout.nodes.a.x, 0);
});
test('fromExcalidraw clamps sizes, ignores deleted and unbound/self arrows, rejects bad input', () => {
  const scene = { type: 'excalidraw', version: 2, source: '', appState: {}, files: {}, elements: [
    { id: 'n', type: 'rectangle', x: 0, y: 0, width: 10, height: 5 },
    { id: 'g', type: 'ellipse', x: 0, y: 0, width: 200, height: 92, isDeleted: true },
    { id: 'loose', type: 'arrow', x: 0, y: 0, width: 1, height: 1 },
  ] };
  const d = fromExcalidraw(scene as never);
  assert.deepEqual(d.graph.nodes.map(n => n.id), ['n']); // deleted ellipse skipped
  assert.equal(d.layout.nodes.n.width, 140); // clamped
  assert.equal(d.graph.edges.length, 0); // unbound arrow skipped
  assert.throws(() => fromExcalidraw({} as never), /Escena Excalidraw inválida/);
});
