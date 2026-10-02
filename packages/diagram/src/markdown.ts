import type { DiagramDocument } from './types';
import { toMermaid, parseMermaid } from './text';
import { describeDiagram } from './flow';
import { graphReport } from './report';

/** Markdown interop for docs platforms (GitHub, GitLab, Obsidian, Notion): a diagram becomes a
 * Markdown section with a renderable ```mermaid block plus an accessible node/connection summary,
 * and a Markdown file re-imports by extracting its first mermaid block. */
export interface MarkdownExportOptions {
  title?: string;
  /** Include the renderable ```mermaid fenced block (default true). */
  mermaid?: boolean;
  /** Include the "## Nodos" list (default true). */
  includeNodes?: boolean;
  /** Include the "## Conexiones" list (default true). */
  includeConnections?: boolean;
}

const esc = (s: string): string => s.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim();

/** Serializes a document to a Markdown snippet. The mermaid block renders on GitHub/GitLab/Obsidian;
 * the lists keep the content accessible as plain text. Re-importable with fromMarkdown. */
export function toMarkdown(document: DiagramDocument, options: MarkdownExportOptions = {}): string {
  const { title = 'Diagrama', mermaid = true, includeNodes = true, includeConnections = true } = options;
  const g = document.graph, out: string[] = [`# ${esc(title)}`, ''];
  if (mermaid) out.push('```mermaid', toMermaid(document), '```', '');
  if (includeNodes && g.nodes.length) {
    out.push('## Nodos', '');
    for (const n of g.nodes) out.push(`- **${esc(n.title)}** (${n.type})${n.tags?.length ? ` — ${n.tags.map(esc).join(', ')}` : ''}`);
    out.push('');
  }
  if (includeConnections && g.edges.length) {
    out.push('## Conexiones', '');
    const titles = new Map(g.nodes.map(n => [n.id, n.title]));
    for (const e of g.edges) out.push(`- ${esc(titles.get(e.source) ?? e.source)} → ${esc(titles.get(e.target) ?? e.target)}${e.label ? `: ${esc(e.label)}` : ''}`);
    out.push('');
  }
  return out.join('\n').trimEnd() + '\n';
}

/** Parses the first ```mermaid fenced block from a Markdown document. Throws when none is present. */
export function fromMarkdown(markdown: string): DiagramDocument {
  const m = /```\s*mermaid\s*\n([\s\S]*?)```/i.exec(markdown);
  if (!m) throw new Error('El Markdown no contiene un bloque ```mermaid.');
  return parseMermaid(m[1]);
}

export interface MarkdownTablesOptions { title?: string }
/** Exports the graph as plain GitHub-flavoured Markdown tables (a nodes table + a connections table). Unlike
 * `toMarkdown` (a Mermaid code block), these render everywhere Markdown does — wikis, PRs, plain READMEs. Pure. */
export function toMarkdownTables(document: DiagramDocument, options: MarkdownTablesOptions = {}): string {
  const esc = (v: string): string => v.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim();
  const title = new Map(document.graph.nodes.map(n => [n.id, n.title]));
  const out: string[] = [];
  if (options.title) out.push(`# ${esc(options.title)}`, '');
  out.push('## Nodos', '', '| ID | Título | Tipo | Grupo | Etiquetas |', '| --- | --- | --- | --- | --- |');
  for (const n of document.graph.nodes) out.push(`| ${esc(n.id)} | ${esc(n.title)} | ${n.type} | ${esc(n.group ?? '')} | ${esc((n.tags ?? []).join(', '))} |`);
  out.push('', '## Conexiones', '', '| Origen | Destino | Etiqueta |', '| --- | --- | --- |');
  for (const e of document.graph.edges) out.push(`| ${esc(title.get(e.source) ?? e.source)} | ${esc(title.get(e.target) ?? e.target)} | ${esc(e.label ?? '')} |`);
  return out.join('\n') + '\n';
}

export interface ReadmeOptions { title?: string }
/** A complete Markdown documentation page for a diagram, one call: title, prose summary, a renderable
 * ```mermaid block, the node/connection tables and a metrics line. Composes describeDiagram + toMermaid +
 * toMarkdownTables + graphReport. Pure — ideal to drop a diagram into a repo's docs. */
export function toReadme(document: DiagramDocument, options: ReadmeOptions = {}): string {
  const title = options.title ?? 'Diagrama';
  const r = graphReport(document);
  const tables = toMarkdownTables(document).trimEnd();
  const metrics = `- Nodos: ${r.nodes} · Conexiones: ${r.edges} · Etapas: ${r.stages} · Diámetro: ${r.diameter} · Ciclos: ${r.hasCycle ? 'sí' : 'no'}`;
  return [
    `# ${title.replace(/\r?\n/g, ' ').trim()}`, '',
    describeDiagram(document.graph), '',
    '## Diagrama', '', '```mermaid', toMermaid(document), '```', '',
    tables, '',
    '## Métricas', '', metrics, '',
  ].join('\n');
}
