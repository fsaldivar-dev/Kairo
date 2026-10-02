import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toMermaidArchitecture } from '../packages/diagram/src/architecture.ts';
import { createDocument } from '../packages/diagram/src/document.ts';

test('toMermaidArchitecture emits a header, grouped services and connections', () => {
  const d = createDocument({
    nodes: [
      { id: 'web', type: 'screen', title: 'Web', group: 'Frontend' },
      { id: 'srv', type: 'service', title: 'API', group: 'Backend' },
      { id: 'db', type: 'database', title: 'Store', group: 'Backend' },
    ],
    edges: [{ id: 'e0', source: 'web', target: 'srv' }, { id: 'e1', source: 'srv', target: 'db' }],
  });
  const out = toMermaidArchitecture(d);
  assert.ok(out.startsWith('architecture-beta\n'));
  assert.match(out, /group \w+\(cloud\)\[Frontend\]/);
  assert.match(out, /group \w+\(cloud\)\[Backend\]/);
  assert.match(out, /service \w+\(internet\)\[Web\] in \w+/); // screen -> internet icon, in a group
  assert.match(out, /service \w+\(server\)\[API\] in \w+/);   // service -> server icon
  assert.match(out, /service \w+\(database\)\[Store\] in \w+/); // database -> database icon
  assert.equal((out.match(/ --> /g) ?? []).length, 2); // two connections
});

test('toMermaidArchitecture picks side anchors from relative positions and drops self-edges', () => {
  const d = createDocument({
    nodes: [{ id: 'a', type: 'service', title: 'A' }, { id: 'b', type: 'service', title: 'B' }, { id: 'c', type: 'service', title: 'C' }],
    edges: [{ id: 'e0', source: 'a', target: 'b' }, { id: 'e1', source: 'a', target: 'c' }, { id: 'e2', source: 'a', target: 'a' }],
  });
  // place b to the right of a, c below a
  d.layout.nodes['a'] = { x: 0, y: 0, width: 100, height: 60 };
  d.layout.nodes['b'] = { x: 300, y: 0, width: 100, height: 60 };
  d.layout.nodes['c'] = { x: 0, y: 300, width: 100, height: 60 };
  const out = toMermaidArchitecture(d);
  assert.match(out, /:R --> L:/); // a -> b is horizontal
  assert.match(out, /:B --> T:/); // a -> c is vertical
  assert.equal((out.match(/ --> /g) ?? []).length, 2); // self-edge a->a dropped
});

test('toMermaidArchitecture places ungrouped nodes without an "in" clause and escapes brackets', () => {
  const d = createDocument({ nodes: [{ id: 'x', type: 'generic', title: 'Box [1]' }], edges: [] });
  const out = toMermaidArchitecture(d);
  assert.match(out, /service \w+\(cloud\)\[Box {2}1\]\n/); // brackets in the title replaced with spaces (then trimmed), no "in"
  assert.ok(!out.includes(' in '));
});
