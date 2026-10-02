import { parseDocument } from '../packages/diagram/dist/diagram.js';
import { autoLayout } from '../packages/diagram/dist/layout.js';
import { toSVG } from '../packages/diagram/dist/export.js';

function build(n) {
  const nodes = [], edges = [], lnodes = {}, ledges = {};
  for (let i = 0; i < n; i++) { nodes.push({ id: 'n' + i, type: 'process', title: 'Node ' + i }); lnodes['n' + i] = { x: (i % 20) * 240, y: ((i / 20) | 0) * 150, width: 200, height: 92 }; }
  for (let i = 1; i < n; i++) { edges.push({ id: 'e' + i, source: 'n' + (i - 1), target: 'n' + i }); ledges['e' + i] = { sourcePort: 'right', targetPort: 'left' }; }
  return { version: 2, graph: { nodes, edges }, layout: { nodes: lnodes, edges: ledges } };
}
const ms = fn => { const t = performance.now(); fn(); return (performance.now() - t).toFixed(1); };
console.log('nodes | parse(ms) | autoLayout(ms) | toSVG(ms)');
for (const n of [100, 500, 2000]) {
  const raw = build(n);
  let doc;
  const p = ms(() => { doc = parseDocument(raw); });
  const l = ms(() => autoLayout(doc));
  const s = ms(() => toSVG(doc));
  console.log(`${String(n).padStart(5)} | ${p.padStart(9)} | ${l.padStart(14)} | ${s.padStart(9)}`);
}
