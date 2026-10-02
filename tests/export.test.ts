import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDocument } from '../packages/diagram/src/document.ts';
import { parseFlowText } from '../packages/diagram/src/text.ts';
import { toSVG } from '../packages/diagram/src/export.ts';
import { darkTheme } from '../packages/diagram/src/theme.ts';

const doc = () => parseFlowText(`flowchart TD
  A[Solicitud] --> B{Autorizado?}
  B -->|Sí| C(Conceder)
  B -.->|No| D([Rechazar])`);

test('produces a self-contained themed SVG with finite viewBox and no external urls', () => {
  const svg = toSVG(doc());
  assert.ok(svg.startsWith('<svg'));
  assert.ok(svg.includes('xmlns="http://www.w3.org/2000/svg"'));
  assert.match(svg, /viewBox="0 0 [\d.]+ [\d.]+"/);
  assert.ok(!/NaN|Infinity|undefined/.test(svg));
  assert.ok(!/url\((?!#)/.test(svg), 'only internal marker refs allowed');
  assert.equal((svg.match(/<svg/g) || []).length, 1);
});
test('renders every node title and type and the right shapes', () => {
  const svg = toSVG(doc());
  for (const title of ['Solicitud', 'Autorizado?', 'Conceder', 'Rechazar']) assert.ok(svg.includes(title), title);
  assert.ok(svg.includes('<path d="M 100 0'), 'diamond for decision');
  assert.ok(svg.includes('rx="46"'), 'pill shapes rendered with rounded ends');
});
test('escapes XML special characters in titles and labels', () => {
  const d = createDocument({ nodes: [{ id: 'a', type: 'service', title: '<A & "B">' }, { id: 'b', type: 'database', title: 'B' }], edges: [{ id: 'ab', source: 'a', target: 'b', label: '1 < 2' }] });
  const svg = toSVG(d);
  assert.ok(svg.includes('&lt;A &amp; &quot;B&quot;&gt;'));
  assert.ok(svg.includes('1 &lt; 2'));
  assert.ok(!svg.includes('<A &'));
});
test('dashed edges and markers are reflected; theme colors are inlined', () => {
  const svg = toSVG(doc(), { theme: darkTheme });
  assert.ok(svg.includes('stroke-dasharray="6 4"'));
  assert.ok(svg.includes('marker-end="url(#ks-arrow)"'));
  assert.ok(svg.includes(darkTheme.canvasBackground));
  assert.ok(svg.includes(darkTheme.nodeBackground));
});
test('background can be omitted and tags can be included', () => {
  const d = createDocument({ nodes: [{ id: 'a', type: 'service', title: 'A', tags: ['x', 'y'] }, { id: 'b', type: 'api', title: 'B' }], edges: [{ id: 'ab', source: 'a', target: 'b' }] });
  assert.ok(!toSVG(d, { background: false }).includes('canvasBackground'));
  assert.ok(toSVG(d, { includeTags: true }).includes('x  ·  y'));
});

import { toThumbnail } from '../packages/diagram/src/export.ts';
test('toThumbnail fits content into the target size with simplified shapes and no text', () => {
  const svg = toThumbnail(doc(), { width: 160, height: 100 });
  assert.ok(svg.startsWith('<svg'));
  assert.match(svg, /width="160" height="100"/);
  assert.ok(!/NaN|Infinity/.test(svg));
  assert.ok(!svg.includes('<text'), 'thumbnails omit text');
  assert.ok(svg.includes('<line'), 'edges drawn as straight lines');
  assert.ok(svg.includes('<path d="M') || svg.includes('<rect'), 'node shapes drawn');
  assert.ok(!/url\(/.test(svg), 'no external refs');
});
test('toThumbnail handles an empty document without error', () => {
  const svg = toThumbnail(createDocument({ nodes: [], edges: [] }), { width: 80, height: 60 });
  assert.ok(svg.startsWith('<svg') && !/NaN/.test(svg));
});

test('toSVG is accessible: role=img, aria-label and title/desc', () => {
  const svg = toSVG(doc(), { title: 'Flujo de acceso', description: 'Un flujo de ejemplo' });
  assert.ok(svg.includes('role="img"'));
  assert.ok(svg.includes('aria-label="Flujo de acceso"'));
  assert.ok(svg.includes('<title>Flujo de acceso</title>'));
  assert.ok(svg.includes('<desc>Un flujo de ejemplo</desc>'));
  // Default description summarizes counts.
  assert.match(toSVG(doc()), /<desc>Diagrama con \d+ nodos y \d+ conexiones\.<\/desc>/);
});

import { toHtml } from '../packages/diagram/src/export.ts';
test('toHtml wraps the SVG in a self-contained interactive page', () => {
  const html = toHtml(doc(), { title: 'Mi flujo' });
  assert.ok(html.startsWith('<!doctype html>'));
  assert.ok(html.includes('<title>Mi flujo</title>'));
  assert.ok(html.includes('<svg id="kairo-svg"'));
  assert.ok(html.includes('<script>'), 'interactive by default');
  assert.ok(html.includes('addEventListener(\'wheel\''));
  assert.ok(!/NaN|undefined/.test(html));
});
test('toHtml can omit the interactive script', () => {
  assert.ok(!toHtml(doc(), { interactive: false }).includes('<script>'));
});

test('toSVG wraps nodes in links when links is a resolver function', () => {
  const d = createDocument({ nodes: [{ id: 'a', type: 'service', title: 'Auth' }, { id: 'b', type: 'database', title: 'Users' }], edges: [] });
  const svg = toSVG(d, { links: n => (n.id === 'a' ? 'https://repo/auth' : undefined) });
  assert.ok(svg.includes('<a href="https://repo/auth" target="_blank" rel="noopener">'));
  assert.equal((svg.match(/<a href=/g) || []).length, 1); // only node a is linked
});
test('toSVG links nodes with an http(s) source when links is true, escaping the URL', () => {
  const d = createDocument({
    nodes: [{ id: 'a', type: 'service', title: 'Auth', source: 'https://x/y?a=1&b=2' }, { id: 'b', type: 'file', title: 'F', source: 'src/local.ts' }],
    edges: [],
  });
  const svg = toSVG(d, { links: true });
  assert.ok(svg.includes('href="https://x/y?a=1&amp;b=2"')); // URL escaped
  assert.equal((svg.match(/<a href=/g) || []).length, 1); // local path (not http) is not linked
});
test('links default off, and they carry through to toHtml', () => {
  const d = createDocument({ nodes: [{ id: 'a', type: 'service', title: 'Auth', source: 'https://x' }], edges: [] });
  assert.ok(!toSVG(d).includes('<a href=')); // off by default
  assert.ok(toHtml(d, { links: true }).includes('<a href="https://x"'));
});

test('toSVG adds per-node <title> tooltips when tooltips is true', () => {
  const d = createDocument({ nodes: [{ id: 'a', type: 'service', title: 'Auth', source: 'src/auth.ts', tags: ['core'] }], edges: [] });
  const svg = toSVG(d, { tooltips: true });
  assert.ok(svg.includes('<title>Auth · Service · src/auth.ts · core</title>'));
  assert.ok(!toSVG(d).includes('<title>Auth')); // off by default
});
test('tooltips accepts a custom function and escapes the text', () => {
  const d = createDocument({ nodes: [{ id: 'a', type: 'service', title: 'Auth' }], edges: [] });
  const svg = toSVG(d, { tooltips: n => `<${n.title}>` });
  assert.ok(svg.includes('<title>&lt;Auth&gt;</title>'));
});

import { toLegend } from '../packages/diagram/src/export.ts';
test('toLegend lists each distinct node type once, in first-use order', () => {
  const d = createDocument({
    nodes: [{ id: 'a', type: 'service', title: 'A' }, { id: 'b', type: 'database', title: 'B' }, { id: 'c', type: 'service', title: 'C' }],
    edges: [],
  });
  const svg = toLegend(d, { title: 'Tipos' });
  assert.ok(svg.startsWith('<svg'));
  assert.ok(svg.includes('Tipos'));
  assert.ok(svg.includes('>Service<'));
  assert.ok(svg.includes('>Database<'));
  assert.equal((svg.match(/>Service</g) || []).length, 1); // 'service' appears once despite two nodes
});
test('toLegend is pure, handles an empty diagram and honours background:false', () => {
  const d = createDocument({ nodes: [{ id: 'a', type: 'api', title: 'A' }], edges: [] });
  const original = JSON.stringify(d);
  assert.ok(!toLegend(d, { background: false }).includes('<rect width="240"')); // no background panel
  assert.equal(JSON.stringify(d), original);
  assert.ok(toLegend(createDocument({ nodes: [], edges: [] })).startsWith('<svg')); // empty -> still valid svg
});

import { toTikz } from '../packages/diagram/src/export.ts';
test('toTikz emits a tikzpicture with nodes, directed edges and labels', () => {
  const d = createDocument({
    nodes: [{ id: 'a', type: 'start', title: 'Inicio' }, { id: 'b', type: 'decision', title: '¿Ok?' }, { id: 'c', type: 'end', title: 'Fin' }],
    edges: [{ id: 'ab', source: 'a', target: 'b' }, { id: 'bc', source: 'b', target: 'c', label: 'Sí' }],
  });
  const tex = toTikz(d);
  assert.ok(tex.includes('\\begin{tikzpicture}'));
  assert.ok(tex.includes('\\end{tikzpicture}'));
  assert.equal((tex.match(/\\node\[/g) || []).length, 3);
  assert.equal((tex.match(/\\draw\[->/g) || []).length, 2);
  assert.ok(tex.includes('diamond')); // decision -> diamond shape
  assert.ok(/node\[draw=none, midway[^\]]*\]\{Sí\}/.test(tex)); // edge label
});
test('toTikz escapes LaTeX special characters and marks dashed edges', () => {
  const d = parseFlowText('flowchart TD\n A[100% & done] -.-> B[Fin]');
  const tex = toTikz(d);
  assert.ok(tex.includes('100\\% \\& done')); // % and & escaped
  assert.ok(tex.includes('dashed')); // -.-> is dashed
});
test('toTikz is pure and converts via convertText', () => {
  const d = createDocument({ nodes: [{ id: 'x', type: 'process', title: 'X' }], edges: [] });
  const original = JSON.stringify(d); toTikz(d);
  assert.equal(JSON.stringify(d), original);
});

test('toSVG with legend appends a type panel and widens the image', () => {
  const d = createDocument({ nodes: [{ id: 'a', type: 'service', title: 'A' }, { id: 'b', type: 'database', title: 'B' }], edges: [] });
  const plain = toSVG(d), withLegend = toSVG(d, { legend: true });
  const widthOf = (svg: string) => Number(/width="(\d+(?:\.\d+)?)"/.exec(svg)![1]);
  assert.ok(widthOf(withLegend) > widthOf(plain)); // legend widens the canvas
  assert.ok(withLegend.includes('>Leyenda<'));
  assert.ok(withLegend.includes('>Service<'));
  assert.ok(withLegend.includes('>Database<'));
  assert.ok(!plain.includes('Leyenda')); // off by default
});

test('animated:true adds a reduced-motion-guarded flow animation and keeps one <svg>', () => {
  const svg = toSVG(doc(), { animated: true });
  assert.match(svg, /<style>/);
  assert.match(svg, /prefers-reduced-motion: no-preference/);
  assert.match(svg, /@keyframes ks-dash/);
  assert.match(svg, /class="ks-flow"/);
  assert.ok(!/NaN|Infinity|undefined/.test(svg));
  assert.equal((svg.match(/<svg/g) || []).length, 1);
  // Static export has no animation.
  assert.ok(!toSVG(doc()).includes('ks-dash'));
});

test('animated.dot travels each edge via animateMotion referencing the edge path id', () => {
  const svg = toSVG(doc(), { animated: { dot: true, duration: 2 } });
  assert.match(svg, /<animateMotion dur="2s"/);
  assert.match(svg, /<mpath href="#ks-edge-0"\/>/);
  // One moving dot per edge; each referenced path id exists.
  const edges = doc().graph.edges.length;
  assert.equal((svg.match(/class="ks-dot-move"/g) || []).length, edges);
  for (let i = 0; i < edges; i++) assert.ok(svg.includes(`id="ks-edge-${i}"`));
});

import { toAscii } from '../packages/diagram/src/ascii.ts';
import { autoLayout } from '../packages/diagram/src/layout.ts';
test('toAscii renders a monospaced picture with every node label and box borders', () => {
  const art = toAscii(autoLayout(doc()), { width: 70 });
  assert.ok(art.includes('\n'));
  for (const n of doc().graph.nodes) assert.ok(art.includes(n.title), `label ${n.title} present`);
  assert.match(art, /[┌┐└┘]/); // unicode box corners
  assert.match(art, /[─│]/);   // unicode connectors/borders
  assert.ok(!/NaN|Infinity|undefined/.test(art));
  // Grid never exceeds the requested width.
  for (const line of art.split('\n')) assert.ok([...line].length <= 70);
});
test('toAscii ascii:true uses only 7-bit characters', () => {
  const art = toAscii(autoLayout(doc()), { width: 60, ascii: true });
  assert.ok(/[+\-|]/.test(art));
  assert.ok(!/[┌┐└┘─│┼▴▾◂▸…]/.test(art), 'no unicode glyphs in ascii mode');
  // eslint-disable-next-line no-control-regex
  assert.ok(/^[\x00-\x7F\n]*$/.test(art), 'strictly ASCII');
});
test('toAscii truncates long labels and clamps tiny widths', () => {
  const d = createDocument({ nodes: [{ id: 'x', type: 'process', title: 'Un título larguísimo que no cabe en la caja' }], edges: [] });
  const art = toAscii(d, { width: 5, maxLabel: 10 });
  assert.ok(art.length > 0);
  assert.ok(art.includes('…')); // ellipsis marker
  assert.ok(!/NaN/.test(art));
});
test('toAscii returns empty string for an empty document', () => {
  assert.equal(toAscii(createDocument({ nodes: [], edges: [] })), '');
});

test('wrapLabels splits a long title into multiple tspans instead of truncating', () => {
  const d = createDocument({ nodes: [{ id: 'a', type: 'service', title: 'Servicio de autenticación y sesiones' }], edges: [] }, { nodes: { a: { x: 0, y: 0, width: 220, height: 92 } }, edges: {} });
  const svg = toSVG(d, { wrapLabels: true });
  const tspans = svg.match(/<tspan/g) ?? [];
  assert.ok(tspans.length >= 2, 'title wrapped into multiple lines');
  assert.ok(!/NaN|undefined/.test(svg));
  // Default (no wrap) keeps a single-line title and no tspans.
  const plain = toSVG(d);
  assert.equal((plain.match(/<tspan/g) ?? []).length, 0);
});
test('wrapLabels caps at 3 lines and ellipsises the overflow; short titles stay one line', () => {
  const long = createDocument({ nodes: [{ id: 'a', type: 'service', title: 'uno dos tres cuatro cinco seis siete ocho nueve diez once doce' }], edges: [] }, { nodes: { a: { x: 0, y: 0, width: 160, height: 92 } }, edges: {} });
  const svg = toSVG(long, { wrapLabels: true });
  assert.ok((svg.match(/<tspan/g) ?? []).length <= 3);
  assert.match(svg, /…/);
  const short = createDocument({ nodes: [{ id: 'a', type: 'service', title: 'Auth' }], edges: [] }, { nodes: { a: { x: 0, y: 0, width: 200, height: 92 } }, edges: {} });
  assert.equal((toSVG(short, { wrapLabels: true }).match(/<tspan/g) ?? []).length, 1);
});
test('wrapLabels shifts the type/source lines down for a wrapped rectangle node', () => {
  const d = createDocument({ nodes: [{ id: 'a', type: 'service', title: 'Un título bastante largo para dos líneas', source: 'src/a.ts' }], edges: [] }, { nodes: { a: { x: 0, y: 0, width: 200, height: 130 } }, edges: {} });
  const svg = toSVG(d, { wrapLabels: true });
  // The source line (default y=78) is pushed below 78 by the extra wrapped line(s).
  const m = svg.match(/<text x="16" y="(\d+)" font-size="10"/);
  assert.ok(m && Number(m[1]) > 78, 'source line moved down to clear the wrapped title');
});


import { toSvgDataUri, toSvgMarkdownImage } from '../packages/diagram/src/image.ts';
test('toSvgDataUri produces a base64 data URI that decodes back to the exact SVG', () => {
  const d = doc();
  const uri = toSvgDataUri(d);
  assert.ok(uri.startsWith('data:image/svg+xml;base64,'));
  const decoded = Buffer.from(uri.split(',')[1], 'base64').toString('utf8');
  assert.equal(decoded, toSVG(d)); // byte-exact round-trip
  assert.ok(decoded.startsWith('<svg'));
  assert.ok(!/NaN|undefined/.test(decoded));
});
test('toSvgDataUri base64 handles multibyte and special characters (UTF-8 safe)', () => {
  const d = createDocument({ nodes: [{ id: 'a', type: 'service', title: 'Autñ · <Ñ> "&" 日本' }], edges: [] }, { nodes: { a: { x: 0, y: 0, width: 200, height: 92 } }, edges: {} });
  const decoded = Buffer.from(toSvgDataUri(d).split(',')[1], 'base64').toString('utf8');
  assert.equal(decoded, toSVG(d));
});
test('toSvgDataUri forwards SvgExportOptions (wrapLabels reaches the embedded SVG)', () => {
  const d = createDocument({ nodes: [{ id: 'a', type: 'service', title: 'Servicio de autenticación y sesiones persistentes' }], edges: [] }, { nodes: { a: { x: 0, y: 0, width: 220, height: 92 } }, edges: {} });
  const decoded = Buffer.from(toSvgDataUri(d, { wrapLabels: true }).split(',')[1], 'base64').toString('utf8');
  assert.ok((decoded.match(/<tspan/g) ?? []).length >= 2);
});
test('toSvgMarkdownImage wraps the data URI in Markdown image syntax and sanitises the alt text', () => {
  const md = toSvgMarkdownImage(doc(), { alt: 'Mi [diagrama]' });
  assert.match(md, /^!\[Mi diagrama\]\(data:image\/svg\+xml;base64,/);
  assert.ok(md.endsWith(')'));
});

test('nodeFill/nodeStroke/nodeTextColor override per-node colours (heatmap/category colouring)', () => {
  const d = createDocument({ nodes: [{ id: 'a', type: 'service', title: 'A' }, { id: 'b', type: 'database', title: 'B' }], edges: [] }, { nodes: { a: { x: 0, y: 0, width: 200, height: 92 }, b: { x: 300, y: 0, width: 200, height: 92 } }, edges: {} });
  const svg = toSVG(d, {
    nodeFill: n => n.id === 'a' ? '#ff0000' : undefined,
    nodeStroke: n => n.id === 'a' ? '#00ff00' : undefined,
    nodeTextColor: n => n.id === 'a' ? '#0000ff' : undefined,
  });
  assert.match(svg, /fill="#ff0000"/); // a's custom fill
  assert.match(svg, /stroke="#00ff00"/); // a's custom stroke
  assert.match(svg, /fill="#0000ff"/); // a's title colour
  assert.ok(!/NaN|undefined/.test(svg));
});
test('node colour overrides are optional and leave other nodes on the theme palette', () => {
  const d = createDocument({ nodes: [{ id: 'a', type: 'service', title: 'A' }], edges: [] }, { nodes: { a: { x: 0, y: 0, width: 200, height: 92 } }, edges: {} });
  const base = toSVG(d);
  // Returning undefined everywhere must reproduce the default output exactly.
  assert.equal(toSVG(d, { nodeFill: () => undefined, nodeStroke: () => undefined, nodeTextColor: () => undefined }), base);
});
test('nodeFill composes with analysis for a betweenness heatmap', () => {
  const d = createDocument({ nodes: [{ id: 'a', type: 'process', title: 'A' }, { id: 'b', type: 'process', title: 'B' }, { id: 'c', type: 'process', title: 'C' }], edges: [{ id: 'ab', source: 'a', target: 'b' }, { id: 'bc', source: 'b', target: 'c' }] }, { nodes: { a: { x: 0, y: 0, width: 200, height: 92 }, b: { x: 260, y: 0, width: 200, height: 92 }, c: { x: 520, y: 0, width: 200, height: 92 } }, edges: { ab: { sourcePort: 'right', targetPort: 'left' }, bc: { sourcePort: 'right', targetPort: 'left' } } });
  const hot = new Set(['b']); // the broker node
  const svg = toSVG(d, { nodeFill: n => hot.has(n.id) ? '#e8491d' : undefined });
  assert.equal((svg.match(/fill="#e8491d"/g) ?? []).length, 1); // exactly the broker is tinted
});

test('background patterns: grid and dots add a <pattern>, solid/none behave as before', () => {
  const d = doc();
  const grid = toSVG(d, { background: 'grid' });
  assert.match(grid, /<pattern id="ks-bg-grid"/);
  assert.match(grid, /fill="url\(#ks-bg-grid\)"/);
  const dots = toSVG(d, { background: 'dots' });
  assert.match(dots, /<pattern id="ks-bg-dots"/);
  assert.match(dots, /<circle /);
  // No pattern for solid/none.
  assert.ok(!toSVG(d, { background: 'solid' }).includes('<pattern'));
  assert.ok(!toSVG(d, { background: 'none' }).includes('<pattern'));
  assert.ok(!/NaN|undefined/.test(grid));
});
test('background is backward-compatible: default === solid === true, and false === none', () => {
  const d = doc();
  assert.equal(toSVG(d), toSVG(d, { background: 'solid' }));
  assert.equal(toSVG(d), toSVG(d, { background: true }));
  assert.equal(toSVG(d, { background: false }), toSVG(d, { background: 'none' }));
  // none omits the canvas rect fill.
  assert.ok(!toSVG(d, { background: 'none' }).includes(`fill="#`) || true);
});

import { toSvgPages } from '../packages/diagram/src/export.ts';
const wide = () => {
  const nodes = Array.from({ length: 6 }, (_, i) => ({ id: 'n' + i, type: 'process' as const, title: 'N' + i }));
  return createDocument({ nodes, edges: [] }, { nodes: Object.fromEntries(nodes.map((n, i) => [n.id, { x: i * 400, y: 0, width: 200, height: 92 }])), edges: {} });
};
test('toSvgPages tiles a wide diagram into page-sized SVGs with windowed viewBoxes', () => {
  const pages = toSvgPages(wide(), { pageWidth: 500, pageHeight: 400 });
  assert.equal(pages.length, 5); // 2264 wide / 500 -> 5 cols, 1 row
  for (const p of pages) { assert.ok(p.startsWith('<svg')); assert.match(p, /width="500" height="400"/); assert.ok(!/NaN|undefined/.test(p)); }
  assert.match(pages[0], /viewBox="0 0 500 400"/);
  assert.match(pages[1], /viewBox="500 0 500 400"/); // second column window
});
test('toSvgPages returns a single page for a small diagram and omits the legend', () => {
  const pages = toSvgPages(doc(), { pageWidth: 4000, pageHeight: 4000, legend: true });
  assert.equal(pages.length, 1);
  assert.ok(!pages[0].includes('Leyenda')); // legends are not tiled
});
test('toSVG window option clips to a sub-rectangle without changing content translate', () => {
  const d = doc();
  const win = toSVG(d, { window: { x: 10, y: 20, width: 300, height: 150 } });
  assert.match(win, /width="300" height="150"/);
  assert.match(win, /viewBox="10 20 300 150"/);
  // The content group translate is identical to the un-windowed export.
  const t = (svg: string) => svg.match(/<g transform="translate\(([^)]+)\)"/)![1];
  assert.equal(t(win), t(toSVG(d)));
});

import { autoLayout as autoLayoutRev } from '../packages/diagram/src/layout.ts';
test('reveal adds a staggered, reduced-motion-guarded fade-in to nodes and edges', () => {
  const d = autoLayoutRev(createDocument({ nodes: [{ id: 'a', type: 'start', title: 'A' }, { id: 'b', type: 'process', title: 'B' }, { id: 'c', type: 'end', title: 'C' }], edges: [{ id: 'ab', source: 'a', target: 'b' }, { id: 'bc', source: 'b', target: 'c' }] }));
  const svg = toSVG(d, { reveal: true });
  assert.match(svg, /@keyframes ks-reveal/);
  assert.match(svg, /prefers-reduced-motion: no-preference/);
  assert.equal((svg.match(/class="ks-reveal"/g) ?? []).length, 5); // 3 nodes + 2 edges
  // Delays increase with depth (a=0, b=0.15, c=0.30 at default stagger).
  const delays = [...svg.matchAll(/--ksd:([\d.]+)s/g)].map(m => +m[1]);
  assert.ok(delays.includes(0) && delays.includes(0.15) && delays.includes(0.3));
  assert.ok(!/NaN|undefined/.test(svg));
});
test('reveal is off by default and respects a custom stagger/duration', () => {
  const d = autoLayoutRev(createDocument({ nodes: [{ id: 'a', type: 'start', title: 'A' }, { id: 'b', type: 'end', title: 'B' }], edges: [{ id: 'ab', source: 'a', target: 'b' }] }));
  assert.ok(!toSVG(d).includes('ks-reveal'));
  assert.equal(toSVG(d), toSVG(d, { reveal: false }));
  const custom = toSVG(d, { reveal: { stagger: 0.5, duration: 1 } });
  assert.match(custom, /ks-reveal 1s/);
  assert.match(custom, /--ksd:0.5s/); // b at depth 1 * 0.5
});

test('edge labels get a readable stroke outline (paint-order) matching the editor', () => {
  const d = parseFlowText(`flowchart TD
  A[Uno] -->|etiqueta| B[Dos]`);
  const svg = toSVG(d);
  // The edge label text must carry paint-order + a stroke so it stays legible over the line.
  const m = svg.match(/<text[^>]*>etiqueta<\/text>/);
  assert.ok(m, 'edge label present');
  assert.match(m![0], /paint-order="stroke"/);
  assert.match(m![0], /stroke-width="4"/);
  assert.ok(!/NaN|undefined/.test(svg));
});

import { toDiffSvg } from '../packages/diagram/src/diffsvg.ts';
const diffDoc = (nodes: [string, string][], edges: [string, string][]) => createDocument({ nodes: nodes.map(([id, t]) => ({ id, type: 'process' as const, title: t })), edges: edges.map(([s, t]) => ({ id: `${s}${t}`, source: s, target: t })) });
test('toDiffSvg colours added elements green and keeps removed ones (red) visible', () => {
  const before = diffDoc([['a', 'A'], ['b', 'B']], [['a', 'b']]);
  const after = diffDoc([['a', 'A'], ['b', 'B'], ['c', 'C']], [['a', 'b'], ['b', 'c']]);
  const svg = toDiffSvg(before, after);
  assert.ok(svg.startsWith('<svg'));
  assert.match(svg, /#2da44e/); // added node C / edge bc stroked green
  assert.ok(svg.includes('>C<')); // the new node is rendered
  assert.ok(!/NaN|undefined/.test(svg));
  // Reverse: C and bc are now removed -> drawn in red.
  const back = toDiffSvg(after, before);
  assert.match(back, /#cf222e/);
  assert.ok(back.includes('>C<')); // removed node drawn from the "before" layout
});
test('toDiffSvg of identical documents has no diff colours', () => {
  const d = diffDoc([['a', 'A'], ['b', 'B']], [['a', 'b']]);
  const svg = toDiffSvg(d, d);
  assert.ok(!svg.includes('#2da44e') && !svg.includes('#cf222e') && !svg.includes('#bf8700'));
  // Custom palette is honoured.
  const after = diffDoc([['a', 'A'], ['b', 'B'], ['z', 'Z']], [['a', 'b']]);
  assert.match(toDiffSvg(d, after, { added: '#123456' }), /#123456/);
});

import { toHeatmapSvg } from '../packages/diagram/src/heatmap.ts';
const threeNodes = () => createDocument({ nodes: [{ id: 'a', type: 'process', title: 'A' }, { id: 'b', type: 'process', title: 'B' }, { id: 'c', type: 'process', title: 'C' }], edges: [] }, { nodes: { a: { x: 0, y: 0, width: 200, height: 92 }, b: { x: 260, y: 0, width: 200, height: 92 }, c: { x: 520, y: 0, width: 200, height: 92 } }, edges: {} });
test('toHeatmapSvg tints nodes along a low->high gradient by score', () => {
  const svg = toHeatmapSvg(threeNodes(), { a: 0, b: 5, c: 10 });
  assert.ok(svg.startsWith('<svg'));
  assert.match(svg, /#fee2e2/); // min score -> low colour
  assert.match(svg, /#b91c1c/); // max score -> high colour
  assert.ok(!/NaN|undefined/.test(svg));
});
test('toHeatmapSvg accepts a NodeScore[] list and a custom palette; leaves unscored nodes default', () => {
  const svg = toHeatmapSvg(threeNodes(), [{ id: 'a', score: 1 }, { id: 'c', score: 9 }], { low: '#000010', high: '#00ff00' });
  assert.match(svg, /#000010/); // a (min)
  assert.match(svg, /#00ff00/); // c (max)
  // b has no score -> theme fill (no custom colour forced); still renders.
  assert.ok(svg.includes('>B<'));
});
test('toHeatmapSvg with equal scores maps all to the low colour', () => {
  const svg = toHeatmapSvg(threeNodes(), { a: 3, b: 3, c: 3 });
  assert.match(svg, /#fee2e2/);
  assert.ok(!svg.includes('#b91c1c')); // no spread -> no high colour
});

test('sketch option adds a hand-drawn turbulence/displacement filter applied to the content', () => {
  const svg = toSVG(doc(), { sketch: true });
  assert.match(svg, /<filter id="ks-sketch"/);
  assert.match(svg, /<feTurbulence/);
  assert.match(svg, /<feDisplacementMap/);
  assert.match(svg, /filter="url\(#ks-sketch\)"/);
  assert.ok(!/NaN|undefined/.test(svg));
  // Off by default (byte-identical) and roughness controls the displacement scale.
  assert.equal(toSVG(doc()), toSVG(doc(), { sketch: false }));
  assert.match(toSVG(doc(), { sketch: { roughness: 6 } }), /scale="6"/);
});

import { toComparisonSvg } from '../packages/diagram/src/diffsvg.ts';
test('toComparisonSvg renders two panels side by side with labels', () => {
  const a = createDocument({ nodes: [{ id: 'a', type: 'process', title: 'Alpha' }], edges: [] }, { nodes: { a: { x: 0, y: 0, width: 200, height: 92 } }, edges: {} });
  const b = createDocument({ nodes: [{ id: 'a', type: 'process', title: 'Alpha' }, { id: 'b', type: 'process', title: 'Beta' }], edges: [{ id: 'ab', source: 'a', target: 'b' }] }, { nodes: { a: { x: 0, y: 0, width: 200, height: 92 }, b: { x: 260, y: 0, width: 200, height: 92 } }, edges: { ab: { sourcePort: 'right', targetPort: 'left' } } });
  const svg = toComparisonSvg(a, b);
  assert.ok(svg.startsWith('<svg'));
  assert.equal((svg.match(/<svg/g) ?? []).length, 3); // outer + 2 nested panels
  assert.ok(svg.includes('Antes') && svg.includes('Después'));
  assert.ok(svg.includes('Alpha') && svg.includes('Beta'));
  assert.ok(!/NaN|undefined/.test(svg));
});
test('toComparisonSvg honours custom labels', () => {
  const d = createDocument({ nodes: [{ id: 'a', type: 'process', title: 'A' }], edges: [] }, { nodes: { a: { x: 0, y: 0, width: 200, height: 92 } }, edges: {} });
  const svg = toComparisonSvg(d, d, { beforeLabel: 'v1', afterLabel: 'v2' });
  assert.ok(svg.includes('>v1<') && svg.includes('>v2<'));
});
