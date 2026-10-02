import { test } from 'node:test';
import assert from 'node:assert/strict';
import { feedbackArcSet, findCycle } from '../packages/diagram/src/algorithms.ts';
import { createDocument } from '../packages/diagram/src/document.ts';
import type { SemanticGraph } from '../packages/diagram/src/types.ts';

const graph = (nodeIds: string[], edges: [string, string, string][]): SemanticGraph =>
  createDocument({
    nodes: nodeIds.map(id => ({ id, type: 'process' as const, title: id })),
    edges: edges.map(([s, t, id]) => ({ id, source: s, target: t })),
  }).graph;

const isAcyclicAfterRemoval = (g: SemanticGraph, remove: string[]): boolean => {
  const set = new Set(remove);
  return findCycle({ nodes: g.nodes, edges: g.edges.filter(e => !set.has(e.id)) }) === null;
};

test('feedbackArcSet is empty for an acyclic graph', () => {
  const g = graph(['a', 'b', 'c'], [['a', 'b', '1'], ['b', 'c', '2'], ['a', 'c', '3']]);
  assert.deepEqual(feedbackArcSet(g), []);
});

test('feedbackArcSet finds a back edge that breaks a simple cycle', () => {
  const g = graph(['a', 'b', 'c'], [['a', 'b', '1'], ['b', 'c', '2'], ['c', 'a', '3']]);
  const fas = feedbackArcSet(g);
  assert.equal(fas.length, 1);
  assert.ok(isAcyclicAfterRemoval(g, fas)); // removing it yields a DAG
});

test('feedbackArcSet includes self-loops and breaks multiple cycles', () => {
  const g = graph(['a', 'b', 'c', 'd'], [
    ['a', 'a', 'self'], ['a', 'b', '1'], ['b', 'a', '2'], // 2-cycle a<->b
    ['c', 'd', '3'], ['d', 'c', '4'], // 2-cycle c<->d
  ]);
  const fas = feedbackArcSet(g);
  assert.ok(fas.includes('self'));
  assert.ok(isAcyclicAfterRemoval(g, fas)); // all cycles broken
});

test('feedbackArcSet is deterministic', () => {
  const g = graph(['a', 'b', 'c'], [['a', 'b', '1'], ['b', 'c', '2'], ['c', 'a', '3']]);
  assert.deepEqual(feedbackArcSet(g), feedbackArcSet(g));
});
