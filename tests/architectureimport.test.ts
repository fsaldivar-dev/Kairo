import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseArchitecture } from '../packages/diagram/src/architectureimport.ts';
import { toMermaidArchitecture } from '../packages/diagram/src/architecture.ts';
import { createDocument } from '../packages/diagram/src/document.ts';

const SAMPLE = `architecture-beta
  group api(cloud)[API]
  service web(internet)[Web]
  service srv(server)[Servidor] in api
  service db(database)[Base de datos] in api
  web:R --> L:srv
  srv:B --> T:db`;

test('parseArchitecture builds nodes, groups and edges with icon→type mapping', () => {
  const doc = parseArchitecture(SAMPLE);
  assert.equal(doc.graph.nodes.length, 3);
  assert.equal(doc.graph.edges.length, 2);
  const byTitle = new Map(doc.graph.nodes.map(n => [n.title, n]));
  assert.equal(byTitle.get('Web')!.type, 'screen');       // internet -> screen
  assert.equal(byTitle.get('Servidor')!.type, 'service'); // server -> service
  assert.equal(byTitle.get('Base de datos')!.type, 'database');
  assert.equal(byTitle.get('Servidor')!.group, 'API');    // group title carried via its [Title]
  assert.equal(byTitle.get('Web')!.group, undefined);     // ungrouped
});

test('parseArchitecture respects arrow direction and treats junctions as generic nodes', () => {
  const doc = parseArchitecture('architecture-beta\n  service a(server)[A]\n  junction j\n  service b(server)[B]\n  a:R <-- L:b');
  const id = (title: string) => doc.graph.nodes.find(n => n.title === title)!.id;
  // `a:R <-- L:b` reverses to b -> a
  assert.equal(doc.graph.edges.length, 1);
  assert.equal(doc.graph.edges[0].source, id('B'));
  assert.equal(doc.graph.edges[0].target, id('A'));
  const junction = doc.graph.nodes.find(n => n.id === 'j');
  assert.ok(junction && junction.type === 'generic'); // junction -> generic node
});

test('parseArchitecture throws when there are no services', () => {
  assert.throws(() => parseArchitecture('architecture-beta\n  group api(cloud)[API]'), /no contiene servicios/);
});

test('toMermaidArchitecture → parseArchitecture round-trips structure and groups', () => {
  const original = createDocument({
    nodes: [
      { id: 'web', type: 'screen', title: 'Web', group: 'Frontend' },
      { id: 'srv', type: 'service', title: 'API', group: 'Backend' },
      { id: 'db', type: 'database', title: 'Store', group: 'Backend' },
    ],
    edges: [{ id: 'e0', source: 'web', target: 'srv' }, { id: 'e1', source: 'srv', target: 'db' }],
  });
  const back = parseArchitecture(toMermaidArchitecture(original));
  assert.equal(back.graph.nodes.length, 3);
  assert.equal(back.graph.edges.length, 2);
  const byTitle = new Map(back.graph.nodes.map(n => [n.title, n]));
  assert.equal(byTitle.get('Web')!.group, 'Frontend');
  assert.equal(byTitle.get('Store')!.group, 'Backend');
  assert.equal(byTitle.get('Store')!.type, 'database');
});
