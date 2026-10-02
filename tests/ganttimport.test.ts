import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseGantt } from '../packages/diagram/src/ganttimport.ts';

const plan = `gantt
  title Lanzamiento
  dateFormat YYYY-MM-DD
  section Diseño
  Investigar :done, research, 2024-01-01, 3d
  Maquetar :crit, mock, after research, 2d
  section Construcción
  Backend :api, after mock, 5d
  Frontend :ui, after mock api, 4d
  Lanzar :milestone, launch, after ui, 0d
`;

test('parseGantt turns after-dependencies into edges and sections into groups', () => {
  const d = parseGantt(plan);
  assert.deepEqual(d.graph.nodes.map(n => n.title), ['Investigar', 'Maquetar', 'Backend', 'Frontend', 'Lanzar']);
  const id = (title: string) => d.graph.nodes.find(n => n.title === title)!.id;
  const has = (from: string, to: string) => d.graph.edges.some(e => e.source === id(from) && e.target === id(to));
  assert.ok(has('Investigar', 'Maquetar'));  // after research
  assert.ok(has('Maquetar', 'Backend'));      // after mock
  assert.ok(has('Maquetar', 'Frontend'));     // after mock api
  assert.ok(has('Backend', 'Frontend'));      // after mock api -> two deps
  assert.ok(has('Frontend', 'Lanzar'));       // after ui (milestone, 0d)
  assert.equal(d.graph.edges.length, 5);
  // sections -> groups
  assert.equal(d.graph.nodes.find(n => n.title === 'Investigar')!.group, 'Diseño');
  assert.equal(d.graph.nodes.find(n => n.title === 'Backend')!.group, 'Construcción');
});

test('parseGantt tolerates tag-only/id-less tasks and ignores deps to unknown ids', () => {
  const d = parseGantt(`gantt
  section S
  Primera tarea :a1, 2024-01-01, 1d
  Suelta :2024-01-02, 1d
  Colgada :b1, after ghost, 1d
`);
  assert.equal(d.graph.nodes.length, 3);
  assert.equal(d.graph.edges.length, 0); // "Suelta" has no id; "after ghost" references an unknown task
  assert.ok(d.graph.nodes.every(n => d.layout.nodes[n.id]));
});

test('parseGantt lays dependents on deeper layers than their prerequisites', () => {
  const d = parseGantt(`gantt
  A :a, 2024-01-01, 1d
  B :b, after a, 1d
`);
  const by = (t: string) => d.layout.nodes[d.graph.nodes.find(n => n.title === t)!.id];
  assert.ok(by('B').y > by('A').y); // B depends on A -> lower layer
});

test('parseGantt throws when there are no tasks', () => {
  assert.throws(() => parseGantt('gantt\n  title Vacío\n  dateFormat X\n'), /no contiene tareas/);
});
