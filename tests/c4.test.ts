import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toMermaidC4 } from '../packages/diagram/src/c4.ts';
import { createDocument } from '../packages/diagram/src/document.ts';

const doc = () => createDocument({
  nodes: [
    { id: 'user', type: 'external', title: 'Cliente' },
    { id: 'web-ui', type: 'service', title: 'Web "App"' },
    { id: 'db', type: 'database', title: 'Users DB' },
  ],
  edges: [{ id: 'e0', source: 'user', target: 'web-ui', label: 'usa' }, { id: 'e1', source: 'web-ui', target: 'db' }],
});

test('toMermaidC4 emits a C4Context with mapped element kinds and Rel edges', () => {
  const c4 = toMermaidC4(doc(), { title: 'Sistema' });
  const lines = c4.trim().split('\n');
  assert.equal(lines[0], 'C4Context');
  assert.equal(lines[1], '  title Sistema');
  assert.ok(c4.includes('Person(user, "Cliente")'));          // external -> Person
  assert.ok(c4.includes('System(web_ui, "Web \'App\'")'));      // service -> System, id sanitised, quotes escaped
  assert.ok(c4.includes('SystemDb(db, "Users DB")'));          // database -> SystemDb
  assert.ok(c4.includes('Rel(user, web_ui, "usa")'));
  assert.ok(c4.includes('Rel(web_ui, db, "")'));               // unlabelled edge -> empty label
});

test('toMermaidC4 de-dupes aliases and prefixes digit-leading ids', () => {
  const d = createDocument({ nodes: [{ id: '1', type: 'service', title: 'A' }, { id: '1!', type: 'service', title: 'B' }], edges: [] });
  const c4 = toMermaidC4(d);
  assert.ok(c4.includes('System(n_1, "A")'));
  assert.ok(c4.includes('System(n_1_, "B")') || c4.includes('System(n_1_2, "B")'));
});
