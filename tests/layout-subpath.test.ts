import { test } from 'node:test';
import assert from 'node:assert/strict';
// The public /layout entry must surface every layout helper (and nothing throws on import).
import { autoLayout, mergeLayout, organicLayout, resolveOverlaps, radialLayout } from '../packages/diagram/src/layout-entry.ts';
import { createDocument } from '../packages/diagram/src/document.ts';

test('the /layout entry re-exports every layout function and they run', () => {
  const doc = createDocument({ nodes: [{ id: 'a', type: 'process', title: 'A' }, { id: 'b', type: 'process', title: 'B' }], edges: [{ id: 'ab', source: 'a', target: 'b' }] });
  for (const fn of [autoLayout, organicLayout, radialLayout, resolveOverlaps]) {
    assert.equal(typeof fn, 'function');
    assert.ok(fn(doc).graph.nodes.length === 2);
  }
  assert.equal(typeof mergeLayout, 'function');
});
