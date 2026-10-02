import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cyclomaticComplexity } from '../packages/diagram/src/algorithms.ts';
import { createDocument } from '../packages/diagram/src/document.ts';

test('cyclomaticComplexity: a linear flow has complexity 1', () => {
  const g = createDocument({
    nodes: ['a', 'b', 'c'].map(id => ({ id, type: 'process' as const, title: id })),
    edges: [{ id: '1', source: 'a', target: 'b' }, { id: '2', source: 'b', target: 'c' }],
  }).graph;
  const m = cyclomaticComplexity(g);
  assert.deepEqual(m, { nodes: 3, edges: 2, components: 1, complexity: 1, decisionPoints: 0 }); // 2-3+2 = 1
});

test('cyclomaticComplexity: a reconverging decision has complexity 2 and one decision point', () => {
  const g = createDocument({
    nodes: ['s', 'q', 'y', 'n', 'e'].map(id => ({ id, type: 'process' as const, title: id })),
    edges: [
      { id: '1', source: 's', target: 'q' }, { id: '2', source: 'q', target: 'y' }, { id: '3', source: 'q', target: 'n' },
      { id: '4', source: 'y', target: 'e' }, { id: '5', source: 'n', target: 'e' },
    ],
  }).graph;
  const m = cyclomaticComplexity(g);
  assert.equal(m.complexity, 2);      // E5 - N5 + 2*1
  assert.equal(m.decisionPoints, 1);  // q has out-degree 2
});

test('cyclomaticComplexity: two disconnected components raise P (and complexity)', () => {
  const g = createDocument({
    nodes: ['a', 'b', 'c', 'd'].map(id => ({ id, type: 'process' as const, title: id })),
    edges: [{ id: '1', source: 'a', target: 'b' }, { id: '2', source: 'c', target: 'd' }],
  }).graph;
  const m = cyclomaticComplexity(g);
  assert.equal(m.components, 2);
  assert.equal(m.complexity, 2); // 2 - 4 + 2*2
});

test('cyclomaticComplexity: empty graph scores 0', () => {
  assert.deepEqual(cyclomaticComplexity(createDocument({ nodes: [], edges: [] }).graph), { nodes: 0, edges: 0, components: 0, complexity: 0, decisionPoints: 0 });
});
