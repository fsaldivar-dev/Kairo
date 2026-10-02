import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDocument } from '../packages/diagram/src/document.ts';
import { parseAny, serializeAs, type InputFormat } from '../packages/diagram/src/convert.ts';

// A connected document (no isolated nodes) with a group, to exercise structure across formats.
const doc = () => createDocument({
  nodes: [
    { id: 'a', type: 'service', title: 'Auth', group: 'Backend' },
    { id: 'b', type: 'database', title: 'Users', group: 'Backend' },
    { id: 'c', type: 'screen', title: 'Login' },
    { id: 'd', type: 'process', title: 'Audit' },
  ],
  edges: [
    { id: 'ca', source: 'c', target: 'a', label: 'auth' },
    { id: 'ab', source: 'a', target: 'b' },
    { id: 'ad', source: 'a', target: 'd' },
  ],
});

// Formats whose round-trip preserves node/edge counts.
const FORMATS: InputFormat[] = ['json', 'mermaid', 'dot', 'canvas', 'graphml', 'gexf', 'cytoscape', 'drawio', 'd2', 'reactflow', 'plantuml', 'gml', 'pajek', 'structurizr', 'nomnoml', 'tgf', 'visnetwork', 'nodelink'];
for (const fmt of FORMATS) {
  test(`round-trip preserves node/edge counts: ${fmt}`, () => {
    const back = parseAny(serializeAs(doc(), fmt), fmt);
    assert.equal(back.graph.nodes.length, 4, `${fmt}: node count`);
    assert.equal(back.graph.edges.length, 3, `${fmt}: edge count`);
    assert.ok(!back.graph.nodes.some(n => !n.id), `${fmt}: every node has an id`);
  });
}
test('group-preserving formats keep the Backend group through a round-trip', () => {
  for (const fmt of ['json', 'mermaid', 'dot', 'graphml', 'gexf', 'drawio', 'canvas', 'cytoscape', 'd2', 'gml'] as InputFormat[]) {
    const back = parseAny(serializeAs(doc(), fmt), fmt);
    assert.ok(back.graph.nodes.some(n => n.group === 'Backend'), `${fmt}: Backend group preserved`);
  }
});
