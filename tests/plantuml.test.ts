import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePlantuml, toPlantuml } from '../packages/diagram/src/plantuml.ts';
import { createDocument } from '../packages/diagram/src/document.ts';
import { convertText } from '../packages/diagram/src/convert.ts';

test('parsePlantuml reads declarations and directed arrows with labels', () => {
  const puml = `@startuml
component "Auth Service" as auth
database "Users" as users
auth --> users : verifica
@enduml`;
  const doc = parsePlantuml(puml);
  assert.deepEqual(doc.graph.nodes.map(n => n.title), ['Auth Service', 'Users']);
  assert.equal(doc.graph.edges[0].source, 'auth');
  assert.equal(doc.graph.edges[0].target, 'users');
  assert.equal(doc.graph.edges[0].label, 'verifica');
});
test('parsePlantuml supports bracket/paren shorthand, dashed arrows and skips noise', () => {
  const puml = `@startuml
' a comment
skinparam monochrome true
[Gateway] ..> (Login) : usa
@enduml`;
  const doc = parsePlantuml(puml);
  assert.deepEqual(doc.graph.nodes.map(n => n.title).sort(), ['Gateway', 'Login'].sort());
  assert.equal(doc.graph.edges.length, 1);
  assert.equal(doc.layout.edges[doc.graph.edges[0].id].dashed, true); // ..> is dashed
});
test('toPlantuml emits @startuml with aliases and arrows, round-tripping through parsePlantuml', () => {
  const doc = createDocument({
    nodes: [{ id: 'a', type: 'service', title: 'Auth "svc"' }, { id: 'b', type: 'database', title: 'Users' }],
    edges: [{ id: 'ab', source: 'a', target: 'b', label: 'verifica' }],
  });
  const puml = toPlantuml(doc);
  assert.ok(puml.startsWith('@startuml'));
  assert.ok(puml.includes('as a'));
  assert.ok(puml.includes('a --> b : verifica'));
  const back = parsePlantuml(puml);
  assert.deepEqual(back.graph.nodes.map(n => n.title).sort(), ['Auth "svc"', 'Users'].sort());
  assert.equal(back.graph.edges[0].label, 'verifica');
  assert.equal(back.graph.edges[0].source, 'a');
});
test('parsePlantuml throws on an empty diagram and is pure for export', () => {
  assert.throws(() => parsePlantuml('@startuml\n@enduml'), /no contiene nodos/);
  const doc = createDocument({ nodes: [{ id: 'x', type: 'process', title: 'X' }], edges: [] });
  const original = JSON.stringify(doc); toPlantuml(doc);
  assert.equal(JSON.stringify(doc), original);
});
test('convertText bridges PlantUML to Mermaid and DOT to PlantUML', () => {
  assert.ok(convertText('@startuml\nA --> B : go\n@enduml', 'plantuml', 'mermaid').includes('go'));
  const puml = convertText('digraph { A -> B [label="x"] }', 'dot', 'plantuml');
  assert.ok(puml.includes('@startuml'));
  assert.ok(/A --> B : x/.test(puml));
});
