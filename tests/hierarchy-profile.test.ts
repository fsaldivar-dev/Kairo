import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDocument } from '../packages/diagram/src/document.ts';
import { lintDocument } from '../packages/diagram/src/flow.ts';
import { fromOpml } from '../packages/diagram/src/opml.ts';
import { fromJson } from '../packages/diagram/src/jsontree.ts';
import { fromParentList } from '../packages/diagram/src/parentlist.ts';
import { parseOutline } from '../packages/diagram/src/outline.ts';

test('hierarchy importers preserve their notation and skip decision-flow diagnostics', () => {
  const documents = [
    fromOpml('<opml version="2.0"><body><outline text="Root"><outline text="Child"/></outline></body></opml>'),
    fromJson({ name: 'Root', children: [{ name: 'Child' }] }),
    fromParentList([{ id: 'root', label: 'Root' }, { id: 'child', parentId: 'root', label: 'Child' }]),
    parseOutline('Root\n  - Child'),
  ];
  for (const doc of documents) {
    assert.equal(doc.profile, 'hierarchy');
    assert.equal(doc.graph.nodes.length, 2);
    assert.equal(doc.graph.edges.length, 1);
    assert.equal(lintDocument(doc).errors, 0);
    assert.equal(parseDocument(JSON.stringify(doc)).profile, 'hierarchy');
  }
});
