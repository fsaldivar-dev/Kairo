import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDocument } from '../packages/diagram/src/document.ts';
import { toTreemapSvg } from '../packages/diagram/src/treemap.ts';
import { toSunburstSvg } from '../packages/diagram/src/sunburst.ts';
import { toIcicleSvg } from '../packages/diagram/src/icicle.ts';
import { toPlantumlMindmap } from '../packages/diagram/src/plantumlmindmap.ts';
import { kShortestPaths } from '../packages/diagram/src/algorithms.ts';

const graph = createDocument({
  nodes: ['a','b','c','d','e','f'].map(id => ({id,title:id,type:'process' as const})),
  edges: [['a','b'],['a','c'],['b','c'],['a','b'],['d','e'],['e','d']].map(([source,target],i)=>({id:`e${i}`,source,target})),
});

for (const render of [toTreemapSvg, toSunburstSvg, toIcicleSvg]) {
  test(`${render.name} visits each node once across transitive/parallel edges and disconnected cycles`, () => {
    const before = JSON.stringify(graph), svg = render(graph);
    for (const {id} of graph.graph.nodes) assert.equal((svg.match(new RegExp(`>${id}</text>`, 'g')) ?? []).length, 1, id);
    assert.equal(JSON.stringify(graph), before);
  });
}
test('PlantUML spanning forest does not duplicate cross-linked siblings and retains disconnected branches', () => {
  const text = toPlantumlMindmap(graph);
  for (const {id} of graph.graph.nodes) assert.equal((text.match(new RegExp(`^\\*+ ${id}$`, 'gm')) ?? []).length, 1, id);
  assert.match(text, /\*\* d\n\*\*\* e/);
});
test('kShortestPaths breaks equal-hop ties lexicographically regardless of edge declaration order', () => {
  const d = createDocument({
    nodes: ['s','b','a','t'].map(id=>({id,title:id,type:'process' as const})),
    edges: [['s','b'],['b','t'],['s','a'],['a','t']].map(([source,target],i)=>({id:`e${i}`,source,target})),
  });
  assert.deepEqual(kShortestPaths(d.graph,'s','t',1), [['s','a','t']]);
  assert.deepEqual(kShortestPaths(d.graph,'s','t',2), [['s','a','t'],['s','b','t']]);
  assert.deepEqual(kShortestPaths({...d.graph,edges:[...d.graph.edges].reverse()},'s','t',2), kShortestPaths(d.graph,'s','t',2));
});
