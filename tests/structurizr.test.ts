import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toStructurizr } from '../packages/diagram/src/structurizr.ts';
import { createDocument } from '../packages/diagram/src/document.ts';

const doc = () => createDocument({
  nodes: [
    { id: 'web-ui', type: 'screen', title: 'Web "App"' },
    { id: 'auth', type: 'service', title: 'Auth' },
    { id: 'db', type: 'database', title: 'Users DB' },
    { id: 'user', type: 'external', title: 'Cliente' },
  ],
  edges: [
    { id: 'e0', source: 'user', target: 'web-ui', label: 'usa' },
    { id: 'e1', source: 'web-ui', target: 'auth' },
    { id: 'e2', source: 'auth', target: 'db', label: 'lee' },
  ],
});

test('toStructurizr emits a workspace with model elements, relationships and a view', () => {
  const dsl = toStructurizr(doc(), { name: 'Mi Sistema' });
  assert.ok(dsl.startsWith('workspace "Mi Sistema" {'));
  assert.ok(dsl.includes('model {'));
  assert.ok(dsl.includes('web_ui = container "Web \'App\'"')); // id sanitised (- -> _), quotes escaped
  assert.ok(dsl.includes('user = person "Cliente"'));          // external -> person
  assert.ok(dsl.includes('tags "Database"'));                  // database tagged
  assert.ok(dsl.includes('user -> web_ui "usa"'));             // relationship with label
  assert.ok(dsl.includes('web_ui -> auth\n') || dsl.includes('web_ui -> auth'));
  assert.ok(dsl.includes('views {'));
  assert.ok(dsl.includes('include *'));
  assert.ok(dsl.includes('autolayout lr'));
  assert.ok(dsl.trimEnd().endsWith('}'));
});

test('toStructurizr sanitises ids that start with a digit and de-dupes collisions', () => {
  const d = createDocument({
    nodes: [
      { id: '1', type: 'generic', title: 'One' },     // digit-leading -> prefixed
      { id: 'x-1', type: 'generic', title: 'Two' },   // -> x_1
      { id: 'x.1', type: 'generic', title: 'Three' }, // also -> x_1 -> de-duped
    ],
    edges: [],
  });
  const dsl = toStructurizr(d);
  assert.ok(dsl.includes('n_1 = softwareSystem "One"'));    // digit-leading prefixed
  assert.ok(dsl.includes('x_1 = softwareSystem "Two"'));
  assert.ok(dsl.includes('x_1_2 = softwareSystem "Three"')); // collision de-duped
});

test('toStructurizr can omit autolayout', () => {
  assert.ok(!toStructurizr(doc(), { autolayout: false }).includes('autolayout'));
});

import { fromStructurizr } from '../packages/diagram/src/structurizr.ts';
import { detectFormat } from '../packages/diagram/src/convert.ts';

test('fromStructurizr round-trips toStructurizr structure (titles, relationships, labels)', () => {
  const back = fromStructurizr(toStructurizr(doc())).graph;
  assert.equal(back.nodes.length, 4);
  assert.deepEqual(back.nodes.map(n => n.title).sort(), ['Auth', 'Cliente', 'Users DB', "Web 'App'"].sort());
  assert.equal(back.edges.length, 3);
  const titleOf = (id: string) => back.nodes.find(n => n.id === id)!.title;
  assert.ok(back.edges.some(e => titleOf(e.source) === 'Cliente' && titleOf(e.target) === "Web 'App'" && e.label === 'usa'));
});

test('fromStructurizr parses hand-written DSL with nested bodies and ignores the views block', () => {
  const dsl = `workspace "W" {
    model {
      u = person "User"
      sys = softwareSystem "System" {
        web = container "Web App"
        db = container "Database" {
          tags "Database"
        }
        web -> db "reads"
      }
      u -> web "uses"
    }
    views {
      systemContext sys { include * }
    }
  }`;
  const g = fromStructurizr(dsl).graph;
  assert.deepEqual(g.nodes.map(n => n.title).sort(), ['Database', 'System', 'User', 'Web App'].sort());
  assert.equal(g.nodes.find(n => n.title === 'User')!.type, 'external'); // person -> external
  assert.equal(g.edges.length, 2); // web->db, u->web
});

test('detectFormat recognises Structurizr and fromStructurizr rejects a model-less workspace', () => {
  assert.equal(detectFormat(toStructurizr(doc())), 'structurizr');
  assert.throws(() => fromStructurizr('workspace "x" { views {} }'), /no contiene un bloque `model/);
  assert.throws(() => fromStructurizr('workspace "x" { model { } }'), /no declara elementos/);
});
