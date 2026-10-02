import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bestLayout, scoreLayouts } from '../packages/diagram/src/bestlayout.ts';
import { layoutMetrics } from '../packages/diagram/src/flow.ts';
import { createDocument } from '../packages/diagram/src/document.ts';

// A small tree: one root with three children, then a grandchild — layouts differ meaningfully.
const tree = () => createDocument({
  nodes: [
    { id: 'root', type: 'start', title: 'Root' },
    { id: 'a', type: 'process', title: 'A' }, { id: 'b', type: 'process', title: 'B' }, { id: 'c', type: 'process', title: 'C' },
    { id: 'a1', type: 'end', title: 'A1' },
  ],
  edges: [
    { id: 'e1', source: 'root', target: 'a' }, { id: 'e2', source: 'root', target: 'b' },
    { id: 'e3', source: 'root', target: 'c' }, { id: 'e4', source: 'a', target: 'a1' },
  ],
});

test('scoreLayouts returns every default candidate, best first, each with its re-laid document', () => {
  const scored = scoreLayouts(tree());
  assert.deepEqual([...scored.map(s => s.name)].sort(), ['circular', 'grid', 'layered', 'organic', 'radial', 'tree']);
  // Sorted best-first by the documented comparator.
  for (let i = 1; i < scored.length; i++) {
    const a = scored[i - 1].metrics, b = scored[i].metrics;
    const cmp = a.crossings - b.crossings || a.overlaps - b.overlaps || a.totalEdgeLength - b.totalEdgeLength || b.density - a.density;
    assert.ok(cmp <= 0, `result ${i - 1} should rank <= ${i}`);
  }
  // Every result's metrics match an independent re-measure of its document.
  for (const s of scored) assert.deepEqual(layoutMetrics(s.document), s.metrics);
});

test('bestLayout returns the top-scoring document and never has more crossings than the layered baseline', () => {
  const doc = tree();
  const best = bestLayout(doc);
  const top = scoreLayouts(doc)[0];
  assert.deepEqual(best.graph, top.document.graph);
  assert.deepEqual(best.layout, top.document.layout);
  const layered = scoreLayouts(doc).find(s => s.name === 'layered')!;
  assert.ok(top.metrics.crossings <= layered.metrics.crossings);
});

test('scoreLayouts honours a custom candidate list, de-dupes, and is pure', () => {
  const doc = tree(), snapshot = JSON.stringify(doc);
  const scored = scoreLayouts(doc, { candidates: ['grid', 'grid', 'tree'] });
  assert.deepEqual([...scored.map(s => s.name)].sort(), ['grid', 'tree']);
  assert.equal(JSON.stringify(doc), snapshot); // input untouched
});

test('bestLayout falls back to the layered layout when no candidate applies (empty candidate list)', () => {
  const best = bestLayout(tree(), { candidates: [] });
  assert.equal(best.graph.nodes.length, 5);
  assert.ok(Object.keys(best.layout.nodes).length === 5);
});
