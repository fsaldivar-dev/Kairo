import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toMarkdown, fromMarkdown } from '../packages/diagram/src/markdown.ts';
import { createDocument } from '../packages/diagram/src/document.ts';
import { convertText } from '../packages/diagram/src/convert.ts';

function doc() {
  return createDocument({
    nodes: [{ id: 'a', type: 'start', title: 'Inicio', tags: ['acceso'] }, { id: 'b', type: 'decision', title: '¿Ok | listo?' }, { id: 'c', type: 'end', title: 'Fin' }],
    edges: [{ id: 'ab', source: 'a', target: 'b' }, { id: 'bc', source: 'b', target: 'c', label: 'Sí' }],
  });
}

test('toMarkdown emits a mermaid block plus node and connection summaries', () => {
  const md = toMarkdown(doc(), { title: 'Flujo de acceso' });
  assert.ok(md.startsWith('# Flujo de acceso'));
  assert.match(md, /```mermaid\n[\s\S]*```/);
  assert.ok(md.includes('## Nodos'));
  assert.ok(md.includes('- **Inicio** (start) — acceso'));
  assert.ok(md.includes('## Conexiones'));
  assert.ok(md.includes('Inicio → ¿Ok \\| listo?')); // pipe escaped for Markdown tables/safety
  assert.ok(md.includes('¿Ok \\| listo? → Fin: Sí'));
});
test('toMarkdown options can drop sections and is pure', () => {
  const d = doc(), original = JSON.stringify(d);
  const md = toMarkdown(d, { mermaid: false, includeConnections: false });
  assert.ok(!md.includes('```mermaid'));
  assert.ok(!md.includes('## Conexiones'));
  assert.ok(md.includes('## Nodos'));
  assert.equal(JSON.stringify(d), original);
});
test('fromMarkdown extracts and parses the first mermaid block', () => {
  const md = '# Título\n\nTexto.\n\n```mermaid\nflowchart TD\n  A[Inicio] --> B[Fin]\n```\n\nMás texto.';
  const back = fromMarkdown(md);
  assert.deepEqual(back.graph.nodes.map(n => n.title), ['Inicio', 'Fin']);
  assert.equal(back.graph.edges.length, 1);
});
test('fromMarkdown throws when there is no mermaid block', () => {
  assert.throws(() => fromMarkdown('# Solo texto\n\nSin diagrama.'), /no contiene un bloque/);
});
test('toMarkdown then fromMarkdown round-trips the structure via the mermaid block', () => {
  const back = fromMarkdown(toMarkdown(doc()));
  assert.deepEqual(back.graph.nodes.map(n => n.title).sort(), ['Fin', 'Inicio', '¿Ok | listo?'].sort());
  assert.equal(back.graph.edges.length, 2);
});
test('convertText bridges Markdown to DOT and DOT to Markdown', () => {
  const md = '```mermaid\nflowchart TD\n A[Uno] --> B[Dos]\n```';
  assert.ok(convertText(md, 'markdown', 'dot').startsWith('digraph'));
  const out = convertText('digraph { A -> B }', 'dot', 'markdown');
  assert.ok(out.includes('```mermaid'));
  assert.ok(out.includes('## Nodos'));
});

import { toMarkdownTables } from '../packages/diagram/src/markdown.ts';
import { createDocument as mkMdDoc } from '../packages/diagram/src/document.ts';
test('toMarkdownTables emits nodes + connections tables with pipe escaping', () => {
  const d = mkMdDoc({ nodes: [{ id: 'a', type: 'service', title: 'Auth', group: 'Backend', tags: ['core'] }, { id: 'b', type: 'database', title: 'Users | DB' }], edges: [{ id: 'ab', source: 'a', target: 'b', label: 'lee' }] });
  const md = toMarkdownTables(d, { title: 'Sistema' });
  assert.match(md, /^# Sistema/);
  assert.match(md, /## Nodos/);
  assert.match(md, /\| ID \| Título \| Tipo \| Grupo \| Etiquetas \|/);
  assert.match(md, /\| a \| Auth \| service \| Backend \| core \|/);
  assert.match(md, /Users \\\| DB/); // pipe escaped in a cell
  assert.match(md, /## Conexiones/);
  assert.match(md, /\| Auth \| Users \\\| DB \| lee \|/); // edge rows use titles
});

import { toReadme } from '../packages/diagram/src/markdown.ts';
test('toReadme assembles a full doc page: title, summary, mermaid block, tables, metrics', () => {
  const d = mkMdDoc({ nodes: [{ id: 'a', type: 'start', title: 'Inicio' }, { id: 'b', type: 'end', title: 'Fin' }], edges: [{ id: 'ab', source: 'a', target: 'b' }] });
  const md = toReadme(d, { title: 'Mi flujo' });
  assert.match(md, /^# Mi flujo/);
  assert.match(md, /```mermaid[\s\S]*flowchart[\s\S]*```/);
  assert.match(md, /## Nodos/);
  assert.match(md, /## Conexiones/);
  assert.match(md, /## Métricas/);
  assert.match(md, /- Nodos: 2 · Conexiones: 1/);
});
