#!/usr/bin/env node
// Valida un diagrama y sale con código 1 si hay errores estructurales. Útil en CI.
// Acepta archivo o stdin ("-"); autodetecta el formato si la extensión no se reconoce.
import { readFileSync } from 'node:fs';
import { parseAny, detectFormat } from '../packages/diagram/dist/io.js';
import { lintDocument } from '../packages/diagram/dist/analysis.js';

const INPUT = { '.mmd': 'mermaid', '.mermaid': 'mermaid', '.dot': 'dot', '.gv': 'dot', '.canvas': 'canvas', '.excalidraw': 'excalidraw', '.csv': 'csv', '.tsv': 'csv', '.graphml': 'graphml', '.xml': 'graphml', '.drawio': 'drawio', '.puml': 'plantuml', '.plantuml': 'plantuml', '.cyjs': 'cytoscape', '.json': 'json' };
const file = process.argv[2];
if (!file) { console.error('Uso: node scripts/kairo-lint.mjs <archivo|-> [--no-cycles]'); process.exit(2); }
const src = file === '-' ? readFileSync(0, 'utf8') : readFileSync(file, 'utf8');
const from = (file !== '-' && INPUT[file.slice(file.lastIndexOf('.')).toLowerCase()]) || detectFormat(src);
if (!from) { console.error('No se pudo detectar el formato de entrada.'); process.exit(2); }
const allowCycles = !process.argv.includes('--no-cycles');
const result = lintDocument(parseAny(src, from), { allowCycles });
const { metrics: m } = result;
console.log(`${file}: ${m.nodeCount} nodos, ${m.edgeCount} conexiones, profundidad ${m.depth}${m.hasCycle ? ', con ciclos' : ''}.`);
for (const d of result.diagnostics) console.log(`  ${d.severity === 'error' ? 'ERROR' : 'aviso'}${d.nodeId || d.edgeId ? ` [${d.nodeId ?? d.edgeId}]` : ''}: ${d.message}`);
console.log(result.ok ? `OK (${result.warnings} avisos)` : `${result.errors} errores, ${result.warnings} avisos`);
process.exit(result.ok ? 0 : 1);
