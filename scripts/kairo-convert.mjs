#!/usr/bin/env node
// Convierte entre formatos de diagrama sin navegador: Mermaid, DOT, JSON Canvas, Excalidraw, CSV/TSV, GraphML, draw.io, PlantUML, Markdown, Cytoscape, React Flow, D2, esquema, JSON, SVG, HTML, TikZ, ASCII, data-URI, matriz de adyacencia.
// Entrada por archivo o stdin ("-"); si la extensión no se reconoce, el formato se autodetecta (o fuerza con --from=<formato>). Salida a archivo o stdout ("-", con --to=<formato>).
import { readFileSync, writeFileSync } from 'node:fs';
import { convertText, parseAny, detectFormat, toMatrixCsv, toStructurizr, toMermaidC4 } from '../packages/diagram/dist/io.js';
import { toSVG, toHtml, toTikz, toTypst, toAscii, toSvgDataUri } from '../packages/diagram/dist/export.js';

const INPUT = { '.mmd': 'mermaid', '.mermaid': 'mermaid', '.dot': 'dot', '.gv': 'dot', '.d2': 'd2', '.outline': 'outline', '.canvas': 'canvas', '.excalidraw': 'excalidraw', '.csv': 'csv', '.tsv': 'csv', '.graphml': 'graphml', '.gexf': 'gexf', '.gml': 'gml', '.net': 'pajek', '.paj': 'pajek', '.dsl': 'structurizr', '.structurizr': 'structurizr', '.noml': 'nomnoml', '.nomnoml': 'nomnoml', '.tgf': 'tgf', '.dgml': 'dgml', '.visjs': 'visnetwork', '.nodelink': 'nodelink', '.graphology': 'graphology', '.elk': 'elk', '.elkjson': 'elk', '.jgf': 'jgf', '.opml': 'opml', '.bpmn': 'bpmn', '.xml': 'graphml', '.drawio': 'drawio', '.puml': 'plantuml', '.plantuml': 'plantuml', '.md': 'markdown', '.markdown': 'markdown', '.cyjs': 'cytoscape', '.reactflow': 'reactflow', '.json': 'json' };
const OUTPUT = { ...INPUT, '.svg': 'svg', '.html': 'html', '.tex': 'tikz', '.tikz': 'tikz', '.txt': 'ascii', '.ascii': 'ascii', '.datauri': 'datauri', '.matrix': 'matrix', '.typ': 'typst', '.typst': 'typst', '.dsl': 'structurizr', '.structurizr': 'structurizr', '.c4': 'mermaidc4' };
const OUTPUT_FORMATS = new Set(Object.values(OUTPUT));
const extOf = (p) => p.slice(p.lastIndexOf('.')).toLowerCase();

const [, , input, output, ...rest] = process.argv;
if (!input || !output) { console.error('Uso: node scripts/kairo-convert.mjs <entrada|-> <salida|-> [--to=<formato>]'); process.exit(1); }

const src = input === '-' ? readFileSync(0, 'utf8') : readFileSync(input, 'utf8');
const from = rest.find(a => a.startsWith('--from='))?.slice(7) || (input !== '-' && INPUT[extOf(input)]) || detectFormat(src);
if (!from) { console.error('No se pudo detectar el formato de entrada; usa una extensión conocida o un contenido reconocible.'); process.exit(1); }

const to = rest.find(a => a.startsWith('--to='))?.slice(5) || (output !== '-' ? OUTPUT[extOf(output)] : undefined);
if (!to || !OUTPUT_FORMATS.has(to)) { console.error(`Formato de salida no soportado: ${to ?? extOf(output)} (usa --to=<formato> para stdout)`); process.exit(1); }

const animated = rest.includes('--animated'), wrap = rest.includes('--wrap');
const RENDER = { svg: (d) => toSVG(d, { ...(animated ? { animated: true } : {}), ...(wrap ? { wrapLabels: true } : {}) }), html: toHtml, tikz: toTikz, ascii: (d) => toAscii(d, { ascii: rest.includes('--plain') }), datauri: (d) => toSvgDataUri(d, wrap ? { wrapLabels: true } : {}), matrix: (d) => toMatrixCsv(d), typst: toTypst, structurizr: toStructurizr, mermaidc4: toMermaidC4 };
const result = RENDER[to] ? RENDER[to](parseAny(src, from)) : convertText(src, from, to);
if (output === '-') process.stdout.write(result);
else { writeFileSync(output, result); console.error(`${input} (${from}) -> ${output} (${to})`); }
