import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fromGraphql } from '../packages/diagram/src/graphql.ts';

const sdl = `
# a blog schema
"""User docstring"""
type User {
  id: ID!
  name: String!
  posts: [Post!]!
  profile: Profile
}
type Post {
  title: String
  author: User!
}
type Profile { bio: String }
enum Role { ADMIN USER }
scalar DateTime
`;

test('fromGraphql makes a node per type and edges for object-typed fields', () => {
  const g = fromGraphql(sdl).graph;
  assert.deepEqual(g.nodes.map(n => n.title), ['User', 'Post', 'Profile']); // enum/scalar are not nodes
  assert.ok(g.nodes.every(n => n.type === 'class'));
  const id = (t: string) => g.nodes.find(n => n.title === t)!.id;
  const edge = (from: string, to: string) => g.edges.find(e => e.source === id(from) && e.target === id(to));
  assert.equal(edge('User', 'Post')!.label, 'posts'); // list type [Post!]! -> Post, labelled by field
  assert.equal(edge('User', 'Profile')!.label, 'profile');
  assert.equal(edge('Post', 'User')!.label, 'author');
  // scalar/String/ID fields produce no edges
  assert.equal(g.edges.length, 3);
});

test('fromGraphql handles interface/input and ignores unknown field types', () => {
  const g = fromGraphql(`
    interface Node { id: ID! }
    input Filter { owner: Account }
    type Account { node: Node }
  `).graph;
  assert.deepEqual(g.nodes.map(n => n.title).sort(), ['Account', 'Filter', 'Node']);
  const id = (t: string) => g.nodes.find(n => n.title === t)!.id;
  assert.ok(g.edges.some(e => e.source === id('Filter') && e.target === id('Account'))); // owner: Account
  assert.ok(g.edges.some(e => e.source === id('Account') && e.target === id('Node')));   // node: Node
});

test('fromGraphql lays dependents by field depth and throws on a schema with no types', () => {
  const g = fromGraphql('type A { b: B }\ntype B { c: C }\ntype C { x: String }');
  const by = (t: string) => g.layout.nodes[g.graph.nodes.find(n => n.title === t)!.id];
  assert.ok(by('B').y > by('A').y && by('C').y > by('B').y); // A -> B -> C deepening
  assert.throws(() => fromGraphql('enum Only { X }\nscalar Date'), /no declara tipos/);
});

test('fromGraphql handles multiple fields on one line (whitespace-separated, not just newlines)', () => {
  // inline fields are valid GraphQL and must each be parsed
  const g = fromGraphql('type User { id: ID! posts: [Post!]! profile: Profile } type Post { author: User! } type Profile { bio: String }').graph;
  const id = (t: string) => g.nodes.find(n => n.title === t)!.id;
  const has = (from: string, to: string, label: string) => g.edges.some(e => e.source === id(from) && e.target === id(to) && e.label === label);
  assert.ok(has('User', 'Post', 'posts') && has('User', 'Profile', 'profile') && has('Post', 'User', 'author'));
  assert.equal(g.edges.length, 3);
});
