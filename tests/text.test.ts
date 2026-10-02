import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFlowText } from '../packages/diagram/src/text.ts';

test('parses nodes, shapes, labels and arrow styles from Mermaid-like text', () => {
  const doc = parseFlowText(`flowchart TD
    A[Solicitud] --> B{Autorizado?}
    B -->|Sí| C(Conceder)
    B -.->|No| D([Rechazar])
    C --- E((Fin))`);
  assert.equal(doc.profile, 'flow');
  assert.deepEqual(doc.graph.nodes.map(n => n.id), ['A', 'B', 'C', 'D', 'E']);
  assert.equal(doc.graph.nodes.find(n => n.id === 'B')!.type, 'decision');
  assert.equal(doc.layout.nodes.B.shape, 'diamond');
  assert.equal(doc.layout.nodes.C.shape, 'pill');
  assert.equal(doc.layout.nodes.D.shape, 'pill');
  assert.equal(doc.layout.nodes.E.shape, 'ellipse');
  assert.equal(doc.graph.edges.find(e => e.target === 'C')!.label, 'Sí');
  assert.equal(doc.layout.edges[doc.graph.edges.find(e => e.target === 'D')!.id].dashed, true);
  assert.equal(doc.layout.edges[doc.graph.edges.find(e => e.target === 'E')!.id].endMarker, 'none');
});
test('layers nodes by edge depth; a later declaration enriches an earlier reference', () => {
  const doc = parseFlowText(`A --> B
    B --> C
    A[Inicio]`);
  assert.ok(doc.layout.nodes.A.y < doc.layout.nodes.B.y);
  assert.ok(doc.layout.nodes.B.y < doc.layout.nodes.C.y);
  assert.equal(doc.graph.nodes.find(n => n.id === 'A')!.title, 'Inicio');
});
test('LR direction lays nodes out horizontally', () => {
  const doc = parseFlowText(`graph LR
    A --> B`);
  assert.ok(doc.layout.nodes.A.x < doc.layout.nodes.B.x);
  assert.equal(doc.layout.nodes.A.y, doc.layout.nodes.B.y);
});
test('cycles still produce a finite layout and valid document', () => {
  const doc = parseFlowText(`A --> B
    B --> C
    C --> A`);
  assert.equal(doc.graph.nodes.length, 3);
  assert.ok(Object.values(doc.layout.nodes).every(n => Number.isFinite(n.x) && Number.isFinite(n.y)));
});
test('ids with punctuation are sanitized and remain unique endpoints', () => {
  const doc = parseFlowText('svc.auth[Auth] --> db:users[Users]');
  assert.deepEqual(doc.graph.nodes.map(n => n.id), ['svc_auth', 'db_users']);
  assert.equal(doc.graph.edges[0].source, 'svc_auth');
});
test('empty or comment-only input is rejected with a clear error', () => {
  assert.throws(() => parseFlowText('   \n %% solo comentario'), /no contiene nodos/);
  assert.throws(() => parseFlowText('A --> B[bad'), /Forma de nodo/);
});

import { toFlowText } from '../packages/diagram/src/text.ts';
import { createDocument } from '../packages/diagram/src/document.ts';

test('toFlowText encodes shapes, arrow styles and labels as Mermaid-like text', () => {
  const text = toFlowText(parseFlowText(`flowchart TD
    A[Solicitud] --> B{Autorizado?}
    B -.->|No| C([Rechazar])
    A --- D((Fin))`));
  assert.ok(text.startsWith('flowchart TD'));
  assert.ok(text.includes('B{Autorizado?}'));
  assert.ok(text.includes('C(["Rechazar"]') || text.includes('C([Rechazar])'));
  assert.ok(text.includes('D((Fin))'));
  assert.ok(text.includes('B -.->|No| C'));
  assert.ok(text.includes('A --- D'));
});
test('text survives a parse -> serialize -> parse round trip (structure, labels, shapes)', () => {
  const source = parseFlowText(`flowchart LR
    A[Inicio] --> B{Check}
    B -->|Sí| C(Ok)
    B -.->|No| D[Stop]`);
  const round = parseFlowText(toFlowText(source));
  assert.deepEqual(round.graph.nodes, source.graph.nodes);
  assert.deepEqual(round.graph.edges.map(e => ({ s: e.source, t: e.target, l: e.label })), source.graph.edges.map(e => ({ s: e.source, t: e.target, l: e.label })));
  for (const id of Object.keys(source.layout.nodes)) assert.equal(round.layout.nodes[id].shape, source.layout.nodes[id].shape);
  for (const e of source.graph.edges) assert.equal(!!round.layout.edges[e.id].dashed, !!source.layout.edges[e.id].dashed);
});
test('titles with brackets, quotes or pipes are quoted and round-trip exactly', () => {
  const doc = createDocument({ nodes: [{ id: 'a', type: 'process', title: 'A [x] "y"' }, { id: 'b', type: 'decision', title: 'c | d' }], edges: [{ id: 'ab', source: 'a', target: 'b', label: 'go' }] }, undefined);
  const round = parseFlowText(toFlowText(doc));
  assert.equal(round.graph.nodes.find(n => n.id === 'a')!.title, 'A [x] "y"');
  assert.equal(round.graph.nodes.find(n => n.id === 'b')!.title, 'c | d');
});
test('Kairo flow types map to Mermaid shapes even without an explicit layout shape', () => {
  const doc = createDocument({ nodes: [{ id: 's', type: 'start', title: 'S' }, { id: 'e', type: 'end', title: 'E' }], edges: [{ id: 'se', source: 's', target: 'e' }] });
  const text = toFlowText(doc);
  assert.ok(text.includes('s([S])'));
  assert.ok(text.includes('e([E])'));
});

import { parseStateText } from '../packages/diagram/src/text.ts';
test('parseStateText maps states, transitions and [*] to start/end', () => {
  const doc = parseStateText(`stateDiagram-v2
    [*] --> Idle
    Idle --> Active : start
    Active --> Idle : stop
    Active --> [*]`);
  assert.equal(doc.profile, 'flow');
  const start = doc.graph.nodes.find(n => n.type === 'start');
  const end = doc.graph.nodes.find(n => n.type === 'end');
  assert.ok(start && end);
  assert.deepEqual(doc.graph.nodes.filter(n => n.type === 'process').map(n => n.id).sort(), ['Active', 'Idle']);
  assert.equal(doc.graph.edges.find(e => e.source === 'Idle' && e.target === 'Active')!.label, 'start');
  assert.equal(doc.graph.edges.some(e => e.source === start!.id && e.target === 'Idle'), true);
  assert.equal(doc.graph.edges.some(e => e.source === 'Active' && e.target === end!.id), true);
});
test('parseStateText resolves "state X as" aliases and rejects empty input', () => {
  const doc = parseStateText(`stateDiagram
    state "En espera" as waiting
    [*] --> waiting`);
  assert.equal(doc.graph.nodes.find(n => n.id === 'waiting')!.title, 'En espera');
  assert.throws(() => parseStateText('stateDiagram-v2\n  %% vacío'), /no contiene estados/);
});

import { parseClassText } from '../packages/diagram/src/text.ts';
test('parseClassText maps classes, members and relationships', () => {
  const doc = parseClassText(`classDiagram
    class Animal {
      +int age
      +run()
    }
    Animal <|-- Dog
    Dog : +bark()
    Animal "1" --> "*" Leg : has`);
  assert.equal(doc.profile, 'uml');
  assert.deepEqual(doc.graph.nodes.map(n => n.id).sort(), ['Animal', 'Dog', 'Leg']);
  assert.ok(doc.graph.nodes.every(n => n.type === 'class'));
  assert.match(doc.graph.nodes.find(n => n.id === 'Animal')!.source!, /age/);
  assert.equal(doc.graph.nodes.find(n => n.id === 'Dog')!.source, '+bark()');
  assert.equal(doc.graph.edges.find(e => e.source === 'Animal' && e.target === 'Dog')!.relation, 'inheritance');
  const has = doc.graph.edges.find(e => e.target === 'Leg')!;
  assert.equal(has.relation, 'association'); assert.equal(has.label, 'has');
});
test('parseClassText rejects empty input', () => {
  assert.throws(() => parseClassText('classDiagram\n  %% nada'), /no contiene clases/);
});

import { parseErText, parseMermaid } from '../packages/diagram/src/text.ts';
test('parseErText maps entities, attributes and relationships with cardinality', () => {
  const doc = parseErText(`erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE-ITEM : contains
    CUSTOMER {
      string name
      string email
    }`);
  assert.equal(doc.profile, 'er');
  assert.deepEqual(doc.graph.nodes.map(n => n.id).sort(), ['CUSTOMER', 'LINE_ITEM', 'ORDER']);
  assert.ok(doc.graph.nodes.every(n => n.type === 'database'));
  assert.match(doc.graph.nodes.find(n => n.id === 'CUSTOMER')!.source!, /name/);
  const places = doc.graph.edges.find(e => e.source === 'CUSTOMER' && e.target === 'ORDER')!;
  assert.equal(places.relation, 'er'); assert.equal(places.label, 'places');
});
test('parseMermaid dispatches by dialect header', () => {
  assert.equal(parseMermaid('stateDiagram-v2\n [*] --> A').profile, 'flow');
  assert.equal(parseMermaid('classDiagram\n class X').profile, 'uml');
  assert.equal(parseMermaid('erDiagram\n A ||--o{ B : r').profile, 'er');
  assert.equal(parseMermaid('flowchart TD\n A-->B').profile, 'flow');
  assert.equal(parseMermaid('A --> B').graph.nodes.length, 2); // defaults to flowchart
});

import { toStateText } from '../packages/diagram/src/text.ts';
test('toStateText emits [*] for start/end and round-trips with parseStateText', () => {
  const source = parseStateText(`stateDiagram-v2
    [*] --> Idle
    Idle --> Active : go
    Active --> [*]`);
  const text = toStateText(source);
  assert.ok(text.startsWith('stateDiagram-v2'));
  assert.ok(text.includes('[*] --> '));
  assert.ok(text.includes(' --> [*]'));
  assert.ok(text.includes(': go'));
  const round = parseStateText(text);
  // Same process states and the same transition into Active with its label.
  assert.deepEqual(round.graph.nodes.filter(n => n.type === 'process').map(n => n.id).sort(), ['Active', 'Idle']);
  assert.equal(round.graph.edges.find(e => e.target === 'Active')!.label, 'go');
  assert.equal(round.graph.nodes.some(n => n.type === 'start'), true);
  assert.equal(round.graph.nodes.some(n => n.type === 'end'), true);
});

import { toClassText, toErText, toMermaid } from '../packages/diagram/src/text.ts';
test('toClassText round-trips classes, members and relation kinds', () => {
  const source = parseClassText(`classDiagram
    class Animal {
      +int age
    }
    Animal <|-- Dog
    Animal --> Leg : has`);
  const round = parseClassText(toClassText(source));
  assert.deepEqual(round.graph.nodes.map(n => n.id).sort(), ['Animal', 'Dog', 'Leg']);
  assert.match(round.graph.nodes.find(n => n.id === 'Animal')!.source!, /age/);
  assert.equal(round.graph.edges.find(e => e.target === 'Dog')!.relation, 'inheritance');
  assert.equal(round.graph.edges.find(e => e.target === 'Leg')!.label, 'has');
});
test('toErText round-trips entities, attributes and relationship labels', () => {
  const source = parseErText(`erDiagram
    CUSTOMER ||--o{ ORDER : places
    CUSTOMER {
      string name
    }`);
  const round = parseErText(toErText(source));
  assert.deepEqual(round.graph.nodes.map(n => n.id).sort(), ['CUSTOMER', 'ORDER']);
  assert.equal(round.graph.edges.find(e => e.target === 'ORDER')!.label, 'places');
  assert.match(round.graph.nodes.find(n => n.id === 'CUSTOMER')!.source!, /name/);
});
test('toMermaid picks the dialect by profile', () => {
  assert.ok(toMermaid(parseClassText('classDiagram\n class X')).startsWith('classDiagram'));
  assert.ok(toMermaid(parseErText('erDiagram\n A ||--|| B : r')).startsWith('erDiagram'));
  assert.ok(toMermaid(parseFlowText('flowchart TD\n A-->B')).startsWith('flowchart'));
});

import { toFlowText as toFlowTextG, parseFlowText as parseFlowTextG } from '../packages/diagram/src/text.ts';
test('toFlowText emits groups as subgraphs and parseFlowText reads them back', () => {
  const doc = createDocument({
    nodes: [
      { id: 'a', type: 'process', title: 'A', group: 'Backend' },
      { id: 'b', type: 'process', title: 'B', group: 'Backend' },
      { id: 'c', type: 'process', title: 'C' },
    ],
    edges: [{ id: 'ab', source: 'a', target: 'b' }, { id: 'ac', source: 'a', target: 'c' }],
  });
  const text = toFlowTextG(doc);
  assert.match(text, /subgraph g0\[Backend\]/);
  assert.match(text, /\n  end/);
  const back = parseFlowTextG(text);
  const byId = Object.fromEntries(back.graph.nodes.map(n => [n.id, n]));
  assert.equal(byId.a.group, 'Backend');
  assert.equal(byId.b.group, 'Backend');
  assert.equal(byId.c.group, undefined); // ungrouped node stays top-level
  assert.equal(back.graph.edges.length, 2);
});
test('parseFlowText reads a plain subgraph title without a bracket id', () => {
  const back = parseFlowTextG('flowchart TD\n  subgraph Servicios\n    x[X]\n    y[Y]\n  end\n  x --> y');
  const byId = Object.fromEntries(back.graph.nodes.map(n => [n.id, n]));
  assert.equal(byId.x.group, 'Servicios');
  assert.equal(byId.y.group, 'Servicios');
});

import { parseSequence, toSequence, parseMermaid as parseMermaidSeq } from '../packages/diagram/src/text.ts';
test('parseSequence reads participants and messages as an interaction graph', () => {
  const doc = parseSequence(`sequenceDiagram
  participant A as Alice
  A->>Bob: Hola
  Bob-->>A: Responde
  Note over A: pensando
  loop cada día
    A->>Bob: Otra`);
  const byId = Object.fromEntries(doc.graph.nodes.map(n => [n.id, n]));
  assert.equal(byId.A.title, 'Alice');
  assert.ok(byId.Bob); // referenced participant auto-created
  assert.equal(doc.graph.edges.length, 3);
  assert.equal(doc.graph.edges[0].label, 'Hola');
  assert.equal(doc.layout.edges[doc.graph.edges[1].id].dashed, true); // -->> is dashed
});
test('parseMermaid dispatches a sequenceDiagram header, and toSequence round-trips', () => {
  const doc = parseMermaidSeq('sequenceDiagram\n  A->>B: x');
  assert.equal(doc.graph.nodes.length, 2);
  const text = toSequence(doc);
  assert.ok(text.startsWith('sequenceDiagram'));
  assert.ok(text.includes('A->>B: x'));
  const back = parseSequence(text);
  assert.equal(back.graph.edges[0].label, 'x');
  assert.deepEqual(back.graph.nodes.map(n => n.id).sort(), ['A', 'B']);
});
test('parseSequence throws when there are no participants', () => {
  assert.throws(() => parseSequence('sequenceDiagram\n  note over X: hi'), /no contiene participantes/);
});

import { parseMermaid as pm2, toMermaid as tm2 } from '../packages/diagram/src/text.ts';
test('Mermaid cylinder [(...)] imports as a database and subroutine [[...]] as a module', () => {
  const d = pm2('flowchart TD\n  A[App] --> B[(Usuarios)]\n  A --> C[[Librería]]');
  const byId = Object.fromEntries(d.graph.nodes.map(n => [n.id, n]));
  assert.equal(byId.B.type, 'database');
  assert.equal(byId.B.title, 'Usuarios');
  assert.equal(byId.C.type, 'module');
  assert.equal(byId.A.type, 'process'); // plain [ ] still a process
});
test('database/module round-trip back to Mermaid cylinder/subroutine syntax', () => {
  const src = 'flowchart TD\n  A[App] --> B[(Usuarios)]\n  A --> C[[Librería]]';
  const out = tm2(pm2(src));
  assert.match(out, /B\[\(Usuarios\)\]/);
  assert.match(out, /C\[\[Librería\]\]/);
});

import { parseMermaid as pm3 } from '../packages/diagram/src/text.ts';
test('parseMermaid skips styling/directive lines (classDef/class/style/linkStyle) without error', () => {
  const d = pm3('flowchart TD\n  %% a comment\n  A[Inicio] --> B[Fin]\n  classDef big fill:#f00\n  class A big\n  style B fill:#0f0\n  linkStyle 0 stroke:#f00');
  assert.deepEqual(d.graph.nodes.map(n => n.id).sort(), ['A', 'B']); // no bogus nodes from styling lines
  assert.equal(d.graph.edges.length, 1);
});
test('parseMermaid supports ampersand fan-out and fan-in, keeping & inside titles', () => {
  const fan = pm3('flowchart TD\n  A --> B & C');
  assert.deepEqual(fan.graph.edges.map(e => `${e.source}>${e.target}`).sort(), ['A>B', 'A>C']);
  const fin = pm3('flowchart LR\n  X & Y --> Z');
  assert.deepEqual(fin.graph.edges.map(e => `${e.source}>${e.target}`).sort(), ['X>Z', 'Y>Z']);
  const title = pm3('flowchart TD\n  A[Uno & Dos] --> B');
  assert.equal(title.graph.nodes.find(n => n.id === 'A')!.title, 'Uno & Dos'); // & inside [] not a separator
  assert.equal(title.graph.edges.length, 1);
});

import { parseMermaid as pm4 } from '../packages/diagram/src/text.ts';
test('parseMermaid parses one-line multi-hop chains with per-hop labels and styles', () => {
  const d = pm4('flowchart TD\n  A --> B --> C');
  assert.deepEqual(d.graph.edges.map(e => `${e.source}>${e.target}`), ['A>B', 'B>C']);
  const labelled = pm4('flowchart TD\n  A -->|sí| B -.->|no| C');
  assert.equal(labelled.graph.edges[0].label, 'sí');
  assert.equal(labelled.graph.edges[1].label, 'no');
  assert.equal(labelled.layout.edges[labelled.graph.edges[1].id].dashed, true); // the -.-> hop stays dashed
});
test('parseMermaid combines ampersand fan-out with chains', () => {
  const d = pm4('flowchart TD\n  A & B --> C --> D');
  assert.deepEqual(d.graph.edges.map(e => `${e.source}>${e.target}`).sort(), ['A>C', 'B>C', 'C>D']);
});
