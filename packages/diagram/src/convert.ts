import type { DiagramDocument } from './types';
import { parseDocument } from './document';
import { parseMermaid, toMermaid } from './text';
import { parseDotText, toDotText } from './dot';
import { parseD2, toD2 } from './d2';
import { parseOutline, toOutline } from './outline';
import { fromCanvas, toCanvas } from './canvas';
import { fromReactFlow, toReactFlow } from './reactflow';
import { fromCytoscape, toCytoscape } from './cytoscape';
import { fromExcalidraw, toExcalidraw } from './excalidraw';
import { fromCsv, toCsv } from './csv';
import { fromMatrixCsv, toMatrixCsv } from './matrix';
import { fromGraphml, toGraphml } from './graphml';
import { fromGexf, toGexf } from './gexf';
import { fromGml, toGml } from './gml';
import { fromPajek, toPajek } from './pajek';
import { fromNomnoml, toNomnoml } from './nomnoml';
import { fromTgf, toTgf } from './tgf';
import { fromDgml, toDgml } from './dgml';
import { fromVisNetwork, toVisNetwork } from './visnetwork';
import { fromNodeLink, toNodeLink } from './networkx';
import { fromGraphology, toGraphology } from './graphology';
import { fromElk, toElk } from './elk';
import { fromJgf, toJgf } from './jgf';
import { fromOpml, toOpml } from './opml';
import { fromBpmn, toBpmn } from './bpmn';
import { fromStructurizr, toStructurizr } from './structurizr';
import { fromDrawio, toDrawio } from './drawio';
import { parsePlantuml, toPlantuml } from './plantuml';
import { fromMarkdown, toMarkdown } from './markdown';

export type InputFormat = 'mermaid' | 'dot' | 'canvas' | 'reactflow' | 'excalidraw' | 'csv' | 'graphml' | 'drawio' | 'plantuml' | 'cytoscape' | 'gexf' | 'd2' | 'outline' | 'markdown' | 'matrix' | 'gml' | 'pajek' | 'structurizr' | 'nomnoml' | 'tgf' | 'dgml' | 'visnetwork' | 'nodelink' | 'graphology' | 'elk' | 'jgf' | 'opml' | 'bpmn' | 'json';
export type OutputFormat = InputFormat;

/** Parses any supported text/JSON format into a validated document. */
export function parseAny(text: string, from: InputFormat): DiagramDocument {
  switch (from) {
    case 'mermaid': return parseMermaid(text);
    case 'dot': return parseDotText(text);
    case 'd2': return parseD2(text);
    case 'outline': return parseOutline(text);
    case 'canvas': return fromCanvas(text);
    case 'reactflow': return fromReactFlow(text);
    case 'cytoscape': return fromCytoscape(text);
    case 'excalidraw': return fromExcalidraw(text);
    case 'csv': return fromCsv(text);
    case 'matrix': return fromMatrixCsv(text);
    case 'graphml': return fromGraphml(text);
    case 'gexf': return fromGexf(text);
    case 'gml': return fromGml(text);
    case 'pajek': return fromPajek(text);
    case 'structurizr': return fromStructurizr(text);
    case 'nomnoml': return fromNomnoml(text);
    case 'tgf': return fromTgf(text);
    case 'dgml': return fromDgml(text);
    case 'visnetwork': return fromVisNetwork(text);
    case 'nodelink': return fromNodeLink(text);
    case 'graphology': return fromGraphology(text);
    case 'elk': return fromElk(text);
    case 'jgf': return fromJgf(text);
    case 'opml': return fromOpml(text);
    case 'bpmn': return fromBpmn(text);
    case 'drawio': return fromDrawio(text);
    case 'plantuml': return parsePlantuml(text);
    case 'markdown': return fromMarkdown(text);
    case 'json': return parseDocument(text);
  }
}
/** Serializes a document to any supported output format (string). */
export function serializeAs(document: DiagramDocument, to: OutputFormat): string {
  switch (to) {
    case 'mermaid': return toMermaid(document);
    case 'dot': return toDotText(document);
    case 'd2': return toD2(document);
    case 'outline': return toOutline(document);
    case 'canvas': return JSON.stringify(toCanvas(document), null, 2);
    case 'reactflow': return JSON.stringify(toReactFlow(document), null, 2);
    case 'cytoscape': return JSON.stringify(toCytoscape(document), null, 2);
    case 'excalidraw': return JSON.stringify(toExcalidraw(document), null, 2);
    case 'csv': return toCsv(document);
    case 'matrix': return toMatrixCsv(document);
    case 'graphml': return toGraphml(document);
    case 'gexf': return toGexf(document);
    case 'gml': return toGml(document);
    case 'pajek': return toPajek(document);
    case 'structurizr': return toStructurizr(document);
    case 'nomnoml': return toNomnoml(document);
    case 'tgf': return toTgf(document);
    case 'dgml': return toDgml(document);
    case 'visnetwork': return JSON.stringify(toVisNetwork(document), null, 2);
    case 'nodelink': return JSON.stringify(toNodeLink(document), null, 2);
    case 'graphology': return JSON.stringify(toGraphology(document), null, 2);
    case 'elk': return JSON.stringify(toElk(document), null, 2);
    case 'jgf': return JSON.stringify(toJgf(document), null, 2);
    case 'opml': return toOpml(document);
    case 'bpmn': return toBpmn(document);
    case 'drawio': return toDrawio(document);
    case 'plantuml': return toPlantuml(document);
    case 'markdown': return toMarkdown(document);
    case 'json': return JSON.stringify(document, null, 2);
  }
}
/** One-call conversion between any supported formats (string in, string out). Framework-free; runs in Node or the browser. */
export function convertText(input: string, from: InputFormat, to: OutputFormat): string {
  return serializeAs(parseAny(input, from), to);
}

/** Best-effort detection of an input format from its content. Returns null when nothing matches.
 * JSON shapes are told apart by their keys; text formats by their leading keyword or markup. */
export function detectFormat(text: string): InputFormat | null {
  const t = text.trim();
  if (!t) return null;
  if (/^@startuml/i.test(t)) return 'plantuml';
  if (/<(?:\w+:)?definitions[\s>]/i.test(t) && /bpmn|sequenceFlow/i.test(t)) return 'bpmn';
  if (/<opml[\s>]/i.test(t)) return 'opml';
  if (/^<\?xml|^<mxfile|^<mxGraphModel/i.test(t) && /mxCell|mxGraphModel/i.test(t)) return 'drawio';
  if (/<DirectedGraph[\s>]/i.test(t)) return 'dgml';
  if (/<gexf[\s>]/i.test(t)) return 'gexf';
  if (/^<\?xml|^<graphml/i.test(t) && /<graphml/i.test(t)) return 'graphml';
  if (/```\s*mermaid/i.test(t)) return 'markdown';
  if (/\][^\]\n]*(->|<->|--)\s*\[/.test(t)) return 'nomnoml'; // nomnoml: [A] -> [B] (before the JSON-array branch)
  if (t.startsWith('{') || t.startsWith('[')) {
    try {
      const o = JSON.parse(t) as Record<string, unknown>;
      if (o && typeof o === 'object') {
        if (o.type === 'excalidraw' || (Array.isArray(o.elements) && o.type)) return 'excalidraw';
        if (Array.isArray(o.children) && Array.isArray(o.edges)) return 'elk';
        if (o.elements) return 'cytoscape';
        if (o.version && o.graph && o.layout) return 'json';
        { const jg = o.graph as { nodes?: unknown; edges?: unknown } | undefined;
          if ((jg && typeof jg === 'object' && !Array.isArray(jg) && (jg.nodes || jg.edges)) || Array.isArray(o.graphs)) return 'jgf'; }
        if (Array.isArray(o.nodes) && Array.isArray(o.links)) return 'nodelink';
        if (Array.isArray(o.nodes) && Array.isArray(o.edges)) {
          const n0 = o.nodes[0] as Record<string, unknown> | undefined;
          const e0 = o.edges[0] as Record<string, unknown> | undefined;
          if (n0 && 'key' in n0) return 'graphology';
          if (e0 && 'from' in e0 && 'to' in e0) return 'visnetwork';
          // React Flow nodes carry a `position` object; its edges use source/target (Canvas uses fromNode/toNode).
          if ((n0 && typeof n0.position === 'object') || (e0 && 'source' in e0 && 'target' in e0)) return 'reactflow';
          return 'canvas';
        }
      }
    } catch { /* not JSON */ }
    return null;
  }
  if (/^\s*workspace\b/i.test(t) && /\bmodel\b\s*\{/i.test(t)) return 'structurizr';
  if (/^\s*\*vertices\b/im.test(t)) return 'pajek';
  if (/^graph\s*\[/i.test(t) && /\bnode\s*\[/i.test(t)) return 'gml';
  if (/^(?:(?:flowchart|graph)\s+(?:TB|TD|BT|LR|RL)\b|stateDiagram|classDiagram|erDiagram|mindmap|sequenceDiagram)/im.test(t)) return 'mermaid';
  if (/^(strict\s+)?(di)?graph\b[\s\S]*\{/i.test(t)) return 'dot';
  if (/(^|\n)\s*[^\n]*\s(->|<->)\s/.test(t) || /\bshape\s*:/.test(t)) return 'd2';
  if (/[,;\t]/.test(t.split('\n')[0]) && !/[{}<]/.test(t)) return 'csv';
  return null;
}
/** Parses any supported text/JSON by auto-detecting its format. Throws when the format can't be recognised. */
export function importAny(text: string): DiagramDocument {
  const format = detectFormat(text);
  if (!format) throw new Error('No se reconoció el formato del texto.');
  return parseAny(text, format);
}
