import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fromJsonSchema } from '../packages/diagram/src/jsonschema.ts';

const schema = {
  $defs: {
    User: { type: 'object', properties: { name: { type: 'string' }, profile: { $ref: '#/$defs/Profile' }, posts: { type: 'array', items: { $ref: '#/$defs/Post' } } } },
    Post: { type: 'object', properties: { author: { $ref: '#/$defs/User' } } },
    Profile: { type: 'object', properties: { bio: { type: 'string' } } },
  },
};

test('fromJsonSchema makes a node per definition and edges for $ref properties', () => {
  const g = fromJsonSchema(schema).graph;
  assert.deepEqual(g.nodes.map(n => n.title).sort(), ['Post', 'Profile', 'User']);
  assert.ok(g.nodes.every(n => n.type === 'class'));
  const id = (t: string) => g.nodes.find(n => n.title === t)!.id;
  const edge = (from: string, to: string) => g.edges.find(e => e.source === id(from) && e.target === id(to));
  assert.equal(edge('User', 'Profile')!.label, 'profile'); // direct $ref
  assert.equal(edge('User', 'Post')!.label, 'posts');       // array items $ref
  assert.equal(edge('Post', 'User')!.label, 'author');
  assert.equal(g.edges.length, 3); // scalar "name"/"bio" produce no edges
});

test('fromJsonSchema accepts a JSON string, legacy "definitions", and a root with properties', () => {
  const g = fromJsonSchema(JSON.stringify({
    title: 'Root', properties: { main: { $ref: '#/definitions/Thing' } },
    definitions: { Thing: { type: 'object', properties: {} } },
  })).graph;
  assert.deepEqual(g.nodes.map(n => n.title).sort(), ['Root', 'Thing']);
  const id = (t: string) => g.nodes.find(n => n.title === t)!.id;
  assert.ok(g.edges.some(e => e.source === id('Root') && e.target === id('Thing') && e.label === 'main'));
});

test('fromJsonSchema lays referenced types deeper and ignores refs to unknown defs; throws when empty', () => {
  const g = fromJsonSchema({ $defs: { A: { properties: { b: { $ref: '#/$defs/B' } } }, B: { properties: { c: { $ref: '#/$defs/Ghost' } } } } });
  const by = (t: string) => g.layout.nodes[g.graph.nodes.find(n => n.title === t)!.id];
  assert.ok(by('B').y > by('A').y);          // A -> B deepens
  assert.equal(g.graph.edges.length, 1);     // B -> Ghost dropped (unknown)
  assert.throws(() => fromJsonSchema({ type: 'string' }), /no define tipos/);
});
