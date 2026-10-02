import { test } from 'node:test';
import assert from 'node:assert/strict';
import { flowSteps, PathPlayer, type HighlightTarget } from '../packages/diagram/src/player.ts';
import type { SemanticGraph } from '../packages/diagram/src/types.ts';

const graph = (): SemanticGraph => ({
  nodes: [{ id: 's', type: 'start', title: 'S' }, { id: 'a', type: 'process', title: 'A' }, { id: 'b', type: 'process', title: 'B' }, { id: 'e', type: 'end', title: 'E' }],
  edges: [{ id: 'sa', source: 's', target: 'a' }, { id: 'ab', source: 'a', target: 'b' }, { id: 'be', source: 'b', target: 'e' }],
});
test('flowSteps grows cumulatively from the start in BFS order', () => {
  const steps = flowSteps(graph());
  assert.equal(steps.length, 4);
  assert.deepEqual(steps[0], { nodes: ['s'], edges: [] });
  assert.deepEqual(steps[1], { nodes: ['s', 'a'], edges: ['sa'] });
  assert.deepEqual(steps[3].nodes, ['s', 'a', 'b', 'e']);
  assert.deepEqual(steps[3].edges, ['sa', 'ab', 'be']);
});
test('flowSteps includes unreachable nodes at the end and tolerates no start', () => {
  const g = graph(); g.nodes.push({ id: 'x', type: 'process', title: 'X' });
  assert.equal(flowSteps(g).at(-1)!.nodes.includes('x'), true);
  const noStart: SemanticGraph = { nodes: [{ id: 'p', type: 'process', title: 'P' }], edges: [] };
  assert.deepEqual(flowSteps(noStart), [{ nodes: ['p'], edges: [] }]);
  assert.deepEqual(flowSteps({ nodes: [], edges: [] }), []);
});
function recorder(): HighlightTarget & { last: string[]; cleared: number } {
  const state = { last: [] as string[], cleared: 0,
    setHighlight(ids: Iterable<string>) { state.last = [...ids]; },
    clearHighlight() { state.cleared++; state.last = []; } };
  return state;
}
test('PathPlayer advances, clamps, loops and stops clearing the highlight', () => {
  const target = recorder(), steps = flowSteps(graph());
  const player = new PathPlayer(target, steps);
  assert.equal(player.length, 4);
  player.goTo(0); assert.deepEqual(target.last, ['s']);
  player.next(); assert.deepEqual(target.last.sort(), ['a', 's', 'sa'].sort());
  player.prev(); assert.deepEqual(target.last, ['s']);
  player.prev(); assert.equal(player.index, 0); // clamps at the start
  player.goTo(99); assert.equal(player.index, 3); // clamps at the end
  player.next(); assert.equal(player.index, 3); // no loop: stays
  player.stop(); assert.equal(player.index, -1); assert.equal(target.cleared, 1);
});
test('PathPlayer loop wraps to the first step at the end', () => {
  const target = recorder();
  const player = new PathPlayer(target, flowSteps(graph()), { loop: true });
  player.goTo(3); player.next();
  assert.equal(player.index, 0);
});
