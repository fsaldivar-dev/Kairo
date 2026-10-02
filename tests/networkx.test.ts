import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDocument } from '../packages/diagram/src/document.ts';
import { fromNodeLink, toNodeLink } from '../packages/diagram/src/networkx.ts';
import { detectFormat } from '../packages/diagram/src/convert.ts';

const doc = () => createDocument({
  nodes: [{ id: 'a', type: 'process', title: 'A' }, { id: 'b', type: 'process', title: 'B' }, { id: 'c', type: 'process', title: 'C' }],
  edges: [{ id: 'ab', source: 'a', target: 'b', label: 'usa' }, { id: 'bc', source: 'b', target: 'c' }],
});

test('toNodeLink emits directed node-link JSON with nodes/links (source/target)', () => {
  const nl = toNodeLink(doc());
  assert.equal(nl.directed, true);
  assert.deepEqual(nl.nodes[0], { id: 'a', label: 'A' });
  assert.deepEqual(nl.links[0], { source: 'a', target: 'b', label: 'usa' });
  assert.equal(nl.links.length, 2);
});

test('fromNodeLink round-trips structure and labels (object or JSON string, numeric ids)', () => {
  const back = fromNodeLink(toNodeLink(doc())).graph;
  assert.deepEqual(back.nodes.map(n => n.title), ['A', 'B', 'C']);
  assert.equal(back.edges.find(e => e.source === 'a')!.label, 'usa');
  const g = fromNodeLink('{"directed":true,"nodes":[{"id":1,"label":"One"},{"id":2}],"links":[{"source":1,"target":2}]}').graph;
  assert.equal(g.nodes[0].title, 'One');
  assert.equal(g.edges.length, 1);
});

test('detectFormat recognises node-link (links[]) distinctly from React Flow/Canvas', () => {
  assert.equal(detectFormat(JSON.stringify(toNodeLink(doc()))), 'nodelink');
  assert.throws(() => fromNodeLink({ nodes: [], links: [] }), /no contiene nodos/);
});
