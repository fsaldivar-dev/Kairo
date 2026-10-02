import type { DiagramDocument, DiagramNode, DiagramEdge, DiagramTheme, EdgeStyle, NodeLayout } from './types';
import { pathMetrics } from './path-metrics';
import { anchor, connectionPath, groupBounds, laneBands } from './geometry';
import { lightTheme } from './theme';
import { nodeIcons, nodeLabels } from './icons';
import { layers } from './layout';
import { shapePath, shapeText } from './shapes';
import { layoutNodeLabel } from './label-layout';

/** Serializes a document to a standalone, theme-inlined SVG string. Pure: no DOM, no external assets or fonts. */
export interface SvgExportOptions { theme?: Partial<DiagramTheme>; padding?: number; edgeStyle?: EdgeStyle; includeTags?: boolean; /** Canvas background: false/'none' = transparent, true/'solid' (default) = filled, 'grid' or 'dots' = a patterned canvas (as React Flow's Background). */ background?: boolean | 'none' | 'solid' | 'grid' | 'dots'; /** Clip the SVG to a sub-rectangle of the diagram's coordinate space (used by toSvgPages to tile large diagrams). */ window?: { x: number; y: number; width: number; height: number }; /** Staggered fade-in "build" animation: nodes/edges appear in dependency order, for presentations. Honours prefers-reduced-motion. */ reveal?: boolean | { stagger?: number; duration?: number }; /** Hand-drawn "sketch" look (Excalidraw-ish) via an SVG turbulence+displacement filter. `roughness` sets the wobble (default 2.5). */ sketch?: boolean | { roughness?: number }; title?: string; description?: string;
  /** Make nodes clickable links. A function returns an href per node; `true` links nodes whose `source` is an http(s) URL. */
  links?: boolean | ((node: DiagramNode) => string | undefined);
  /** Add a hover/screen-reader `<title>` per node. `true` shows title · type · reference · tags; a function returns custom text. */
  tooltips?: boolean | ((node: DiagramNode) => string | undefined);
  /** Wrap long node titles within the available height (up to 3 lines), sharing layout with @fsaldivar.dev/diagram/labels. */
  wrapLabels?: boolean;
  /** Per-node fill override (for heatmaps, category or community colouring). Return undefined to keep the theme colour. Export-only; nothing is written to the graph. */
  nodeFill?: (node: DiagramNode) => string | undefined;
  /** Per-node border colour override. Return undefined to keep the theme colour. */
  nodeStroke?: (node: DiagramNode) => string | undefined;
  /** Per-node title colour override. Return undefined to keep the theme colour. */
  nodeTextColor?: (node: DiagramNode) => string | undefined;
  /** Per-edge stroke colour override (for diffs/heatmaps). Return undefined to keep the theme colour. */
  edgeStroke?: (edge: DiagramEdge) => string | undefined;
  /** Append a legend panel of the node types to the right of the diagram. */
  legend?: boolean;
  /** Animate the edges (presentation-ready): a flowing marching-ants dash, and optionally a dot travelling each edge.
   * Honours `prefers-reduced-motion` (static for users who opt out). `duration` is seconds per cycle (default 1.2). */
  animated?: boolean | { duration?: number; dot?: boolean } }

const esc = (s: string): string => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const num = (n: number): number => +n.toFixed(2);
const trunc = (text: string, width: number, size: number): string => {
  const chars = [...text], max = Math.max(1, Math.floor(width / (size * 0.61)));
  return chars.length <= max ? text : chars.slice(0, max - 1).join('') + '…';
};
function shapeMarkup(box: NodeLayout, fill: string, stroke: string, strokeWidth: number, radius: number): string {
  const shape = box.shape ?? 'rectangle', w = num(box.width), h = num(box.height), common = `fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"`;
  const path = shapePath(box);
  if (path) return `<path d="${path}" ${common} stroke-linejoin="round"/>`;
  if (shape === 'ellipse') return `<ellipse cx="${w / 2}" cy="${h / 2}" rx="${w / 2}" ry="${h / 2}" ${common}/>`;
  const rx = shape === 'pill' ? h / 2 : radius;
  return `<rect width="${w}" height="${h}" rx="${rx}" ${common}/>`;
}
export function toSVG(document: DiagramDocument, options: SvgExportOptions = {}): string {
  const theme = { ...lightTheme, ...options.theme }, pad = options.padding ?? 32, style: EdgeStyle = options.edgeStyle ?? 'rounded';
  const anim = options.animated ? (typeof options.animated === 'object' ? options.animated : {}) : undefined;
  const animDur = Math.max(0.2, anim?.duration ?? 1.2);
  const reveal = options.reveal ? (typeof options.reveal === 'object' ? options.reveal : {}) : undefined;
  const revStagger = Math.max(0, reveal?.stagger ?? 0.15), revDur = Math.max(0.1, reveal?.duration ?? 0.45);
  const rank = reveal ? layers(document.graph.nodes.map(n => n.id), document.graph.edges) : null;
  const revDelay = (id: string): number => (rank?.get(id) ?? 0) * revStagger;
  const sketch = options.sketch ? (typeof options.sketch === 'object' ? options.sketch : {}) : undefined;
  const sketchScale = Math.max(0, sketch?.roughness ?? 2.5);
  const boxes = Object.entries(document.layout.nodes);
  let minX = boxes.length ? Math.min(...boxes.map(([, b]) => b.x)) : 0;
  let minY = boxes.length ? Math.min(...boxes.map(([, b]) => b.y)) : 0;
  let maxX = boxes.length ? Math.max(...boxes.map(([, b]) => b.x + b.width)) : 200;
  let maxY = boxes.length ? Math.max(...boxes.map(([, b]) => b.y + b.height + (options.includeTags ? 26 : 0))) : 120;
  const include = (x0: number, y0: number, x1: number, y1: number) => {
    minX = Math.min(minX, x0); minY = Math.min(minY, y0); maxX = Math.max(maxX, x1); maxY = Math.max(maxY, y1);
  };
  const routes = new Map<string, { d: string; label: { x: number; y: number } }>();
  for (const edge of document.graph.edges) {
    const route = document.layout.edges[edge.id], src = document.layout.nodes[edge.source], tgt = document.layout.nodes[edge.target];
    if (!route || !src || !tgt) continue;
    const d = connectionPath(anchor(src, route.sourcePort), anchor(tgt, route.targetPort), route.sourcePort, route.targetPort, style);
    const metrics = pathMetrics(d), b = metrics.bounds;
    include(b.minX - 8, b.minY - 8, b.maxX + 8, b.maxY + 8);
    const label = metrics.label(route.labelPosition === 'start' ? 0.2 : route.labelPosition === 'end' ? 0.8 : 0.5, route.labelOffset ?? 11);
    if (edge.label) { const w = [...edge.label].length * 6.5 / 2; include(label.x - w - 3, label.y - 12, label.x + w + 3, label.y + 5); }
    routes.set(edge.id, { d, label });
  }
  const groups = Object.values(groupBounds(document)), lanes = laneBands(document);
  for (const b of [...groups, ...lanes]) include(b.x, b.y - 20, b.x + b.width, b.y + b.height);
  const width = num(maxX - minX + pad * 2), height = num(maxY - minY + pad * 2), ox = num(pad - minX), oy = num(pad - minY);
  const containers = lanes.map(b => `<g><rect x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" fill="${theme.iconBackground}" fill-opacity=".3" stroke="${theme.grid}"/><text x="${b.x + 12}" y="${b.y - 5}" font-size="11" fill="${theme.nodeSecondaryText}">${esc(b.lane)}</text></g>`).join('')
    + groups.map(b => `<g><rect x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" rx="14" fill="none" stroke="${theme.nodeBorder}" stroke-dasharray="5 4"/><text x="${b.x + 15}" y="${b.y - 5}" font-size="11" fill="${theme.nodeSecondaryText}">${esc(b.label)}</text></g>`).join('');
  const defs = `<defs>`
    + `<marker id="ks-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse" markerUnits="userSpaceOnUse"><path d="M 2 1 L 8 5 L 2 9" fill="none" stroke="${theme.edge}" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"/></marker>`
    + `<marker id="ks-dot" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" markerUnits="userSpaceOnUse"><circle cx="5" cy="5" r="3" fill="${theme.edge}"/></marker>`
    + `</defs>`;
  const edgeMarkup = document.graph.edges.map((edge, i) => {
    const route = document.layout.edges[edge.id], src = document.layout.nodes[edge.source], tgt = document.layout.nodes[edge.target];
    if (!route || !src || !tgt) return '';
    const { d, label: position } = routes.get(edge.id)!;
    const start = (route.startMarker ?? 'none'), end = (route.endMarker ?? 'arrow');
    const pathId = `ks-edge-${i}`;
    const edgeColor = options.edgeStroke?.(edge) ?? theme.edge;
    const attrs = [`d="${d}"`, `fill="none"`, `stroke="${edgeColor}"`, `stroke-width="1.35"`, `stroke-linejoin="round"`, `stroke-linecap="round"`];
    const classes: string[] = [];
    if (anim) { attrs.push(`id="${pathId}"`); classes.push('ks-flow'); }
    if (reveal) { classes.push('ks-reveal'); attrs.push(`style="--ksd:${num(revDelay(edge.target))}s"`); }
    if (classes.length) attrs.push(`class="${classes.join(' ')}"`);
    if (start !== 'none') attrs.push(`marker-start="url(#ks-${start === 'dot' ? 'dot' : 'arrow'})"`);
    if (end !== 'none') attrs.push(`marker-end="url(#ks-${end === 'dot' ? 'dot' : 'arrow'})"`);
    if (route.dashed && !anim) attrs.push(`stroke-dasharray="6 4"`);
    let label = '';
    if (edge.label) {
      label = `<text x="${num(position.x)}" y="${num(position.y)}" text-anchor="middle" font-size="10" paint-order="stroke" stroke="${theme.canvasBackground}" stroke-width="4" stroke-linejoin="round" fill="${theme.nodeSecondaryText}" font-family="${esc(theme.fontFamily)}">${esc(edge.label)}</text>`;
    }
    const dot = anim && anim.dot ? `<circle class="ks-dot-move" r="3.2" fill="${theme.edge}"><animateMotion dur="${animDur}s" repeatCount="indefinite"><mpath href="#${pathId}"/></animateMotion></circle>` : '';
    return `<path ${attrs.join(' ')}/>${dot}${label}`;
  }).join('');
  const tipFor = (node: DiagramNode): string | undefined => {
    if (!options.tooltips) return undefined;
    if (typeof options.tooltips === 'function') return options.tooltips(node);
    const bits = [node.title, nodeLabels[node.type]];
    if (node.source) bits.push(node.source);
    if (node.tags?.length) bits.push(node.tags.join(', '));
    return bits.join(' · ');
  };
  const linkFor = (node: DiagramNode): string | undefined => {
    if (!options.links) return undefined;
    if (typeof options.links === 'function') return options.links(node);
    return node.source && /^https?:\/\//i.test(node.source) ? node.source : undefined;
  };
  const nodeMarkup = document.graph.nodes.map(node => {
    const box = document.layout.nodes[node.id]; if (!box) return '';
    const shape = box.shape ?? 'rectangle', compact = shape !== 'rectangle';
    const fill = options.nodeFill?.(node) ?? theme.nodeBackground, stroke = options.nodeStroke?.(node) ?? theme.nodeBorder, textColor = options.nodeTextColor?.(node) ?? theme.nodeText;
    const parts = [shapeMarkup(box, fill, stroke, theme.borderWidth, theme.radius)];
    if (!compact) {
      parts.push(`<rect x="16" y="16" width="28" height="28" rx="8" fill="${theme.iconBackground}"/>`);
      parts.push(`<path transform="translate(20 20)" d="${nodeIcons[node.type]}" fill="none" stroke="${theme.icon}" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>`);
    }
    const text = shapeText(box);
    const titleX = compact ? box.width / 2 : 56, titleY = compact ? text.y - 3 : 35;
    const typeX = compact ? box.width / 2 : 56, typeY = compact ? text.y + 15 : 57;
    const anchorAttr = compact ? ' text-anchor="middle"' : '';
    const titleW = compact ? text.width : box.width - 72;
    const label = options.wrapLabels ? layoutNodeLabel(node, box) : null;
    if (label) {
      const tspans = label.lines.map((ln, i) => `<tspan x="${num(label.x)}" y="${num(label.y + i * label.lineHeight)}">${esc(ln)}</tspan>`).join('');
      parts.push(`<text${anchorAttr} font-size="13" font-weight="550" fill="${textColor}" font-family="${esc(theme.fontFamily)}">${tspans}</text>`);
    } else {
      parts.push(`<text x="${num(titleX)}" y="${titleY}"${anchorAttr} font-size="13" font-weight="550" fill="${textColor}" font-family="${esc(theme.fontFamily)}">${esc(trunc(node.title, titleW, 13))}</text>`);
    }
    parts.push(`<text x="${num(typeX)}" y="${num(label?.typeY ?? typeY)}"${anchorAttr} font-size="11" fill="${theme.nodeSecondaryText}" font-family="${esc(theme.fontFamily)}">${esc(nodeLabels[node.type])}</text>`);
    if (!compact && node.source) parts.push(`<text x="16" y="${num(label?.sourceY ?? 78)}" font-size="10" fill="${theme.nodeSecondaryText}" font-family="${esc(theme.fontFamily)}">${esc(trunc(node.source, box.width - 32, 10))}</text>`);
    if (options.includeTags && node.tags?.length) parts.push(`<text x="16" y="${num(box.height + 18)}" font-size="9" font-weight="500" fill="${theme.nodeSecondaryText}" font-family="${esc(theme.fontFamily)}">${esc(node.tags.join('  ·  '))}</text>`);
    const tip = tipFor(node);
    const revAttr = reveal ? ` class="ks-reveal" style="--ksd:${num(revDelay(node.id))}s"` : '';
    const group = `<g${revAttr} transform="translate(${num(box.x)} ${num(box.y)})">${tip ? `<title>${esc(tip)}</title>` : ''}${parts.join('')}</g>`;
    const href = linkFor(node);
    return href ? `<a href="${esc(href)}" target="_blank" rel="noopener">${group}</a>` : group;
  }).join('');
  const bgMode = options.background === false ? 'none' : options.background === true || options.background === undefined ? 'solid' : options.background;
  let bgDefs = '', bg = '';
  if (bgMode !== 'none') {
    const bx = num(minX - pad), by = num(minY - pad);
    bg = `<rect x="${bx}" y="${by}" width="${width}" height="${height}" fill="${theme.canvasBackground}"/>`;
    if (bgMode === 'grid') { bgDefs = `<pattern id="ks-bg-grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0 H0 V24" fill="none" stroke="${theme.grid}" stroke-width="1"/></pattern>`; bg += `<rect x="${bx}" y="${by}" width="${width}" height="${height}" fill="url(#ks-bg-grid)"/>`; }
    else if (bgMode === 'dots') { bgDefs = `<pattern id="ks-bg-dots" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.3" fill="${theme.grid}"/></pattern>`; bg += `<rect x="${bx}" y="${by}" width="${width}" height="${height}" fill="url(#ks-bg-dots)"/>`; }
  }
  const n = document.graph.nodes.length, e = document.graph.edges.length;
  const title = options.title ?? 'Diagrama Kairo';
  const desc = options.description ?? `Diagrama con ${n} ${n === 1 ? 'nodo' : 'nodos'} y ${e} ${e === 1 ? 'conexión' : 'conexiones'}.`;
  const a11y = `<title>${esc(title)}</title><desc>${esc(desc)}</desc>`;
  let legendMarkup = '', extraW = 0, totalH = height;
  if (options.legend) {
    const seen = new Set<string>(), types: DiagramNode['type'][] = [];
    for (const nd of document.graph.nodes) if (!seen.has(nd.type)) { seen.add(nd.type); types.push(nd.type); }
    const rowH = 28, lw = 210, iconBox = 22, lh = 46 + types.length * rowH;
    extraW = lw; totalH = Math.max(height, lh);
    const rows = types.map((type, i) => `<g transform="translate(16 ${num(40 + i * rowH)})"><rect width="${iconBox}" height="${iconBox}" rx="6" fill="${theme.iconBackground}"/><path transform="translate(3 3)" d="${nodeIcons[type]}" fill="none" stroke="${theme.icon}" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/><text x="${iconBox + 10}" y="${iconBox - 6}" font-size="12" fill="${theme.nodeText}" font-family="${esc(theme.fontFamily)}">${esc(nodeLabels[type])}</text></g>`).join('');
    legendMarkup = `<g transform="translate(${width} 0)"><rect width="${lw}" height="${num(totalH)}" fill="${theme.canvasBackground}"/><line x1="0" y1="0" x2="0" y2="${num(totalH)}" stroke="${theme.grid}"/><text x="16" y="26" font-size="13" font-weight="600" fill="${theme.nodeText}" font-family="${esc(theme.fontFamily)}">Leyenda</text>${rows}</g>`;
  }
  const animStyle = anim ? `<style>@media (prefers-reduced-motion: reduce){.ks-dot-move{display:none}}@media (prefers-reduced-motion: no-preference){.ks-flow{stroke-dasharray:9 6;animation:ks-dash ${animDur}s linear infinite}@keyframes ks-dash{to{stroke-dashoffset:-15}}}</style>` : '';
  const revealStyle = reveal ? `<style>@media (prefers-reduced-motion: no-preference){.ks-reveal{animation:ks-reveal ${num(revDur)}s ease-out backwards;animation-delay:var(--ksd,0s)}@keyframes ks-reveal{from{opacity:0}to{opacity:1}}}</style>` : '';
  const totalW = num(width + extraW);
  const sketchDefs = sketch ? `<filter id="ks-sketch" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="2" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="${num(sketchScale)}" xChannelSelector="R" yChannelSelector="G"/></filter>` : '';
  const sketchAttr = sketch ? ' filter="url(#ks-sketch)"' : '';
  const vb = options.window ? `${num(options.window.x)} ${num(options.window.y)} ${num(options.window.width)} ${num(options.window.height)}` : `0 0 ${totalW} ${num(totalH)}`;
  const outW = options.window ? num(options.window.width) : totalW, outH = options.window ? num(options.window.height) : num(totalH);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${outW}" height="${outH}" viewBox="${vb}" role="img" aria-label="${esc(title)}" font-family="${esc(theme.fontFamily)}">${a11y}${animStyle}${revealStyle}${defs}${bgDefs || sketchDefs ? `<defs>${bgDefs}${sketchDefs}</defs>` : ''}<g${sketchAttr} transform="translate(${ox} ${oy})">${bg}${containers}${edgeMarkup}${nodeMarkup}</g>${legendMarkup}</svg>`;
}

/** Marks the `<metadata>` element that carries the round-trippable document inside an editable SVG. */
export const KAIRO_SVG_MARKER = 'kairo-document';
/** Renders an SVG that also embeds the full source document in a `<metadata id="kairo-document">` element — like
 * draw.io's "editable SVG". The picture renders everywhere, and {@link fromSvg} re-imports it with full fidelity
 * (shapes, tags, groups, ports), so you can round-trip through Illustrator/Inkscape or a doc. The embedded JSON is
 * XML-escaped (ignored by renderers). Pure, export only. */
export function toEditableSvg(document: DiagramDocument, options: SvgExportOptions = {}): string {
  const meta = `<metadata id="${KAIRO_SVG_MARKER}" data-format="kairo-v2">${esc(JSON.stringify(document))}</metadata>`;
  return toSVG(document, options).replace('>', '>' + meta); // first '>' closes the opening <svg …> tag
}


export interface SvgPagesOptions extends SvgExportOptions { pageWidth?: number; pageHeight?: number }
/** Tiles the diagram into page-sized SVGs (as draw.io's page view) for printing or PDF assembly. Each page is
 * a self-contained SVG showing its slice of the same coordinate space, in row-major order (top-left first).
 * Pure. Legends are not tiled; omit `legend` when paginating. */
export function toSvgPages(document: DiagramDocument, options: SvgPagesOptions = {}): string[] {
  const pw = Math.max(50, options.pageWidth ?? 1123), ph = Math.max(50, options.pageHeight ?? 794);
  const full = toSVG(document, { ...options, window: undefined, legend: false });
  const m = full.match(/width="([\d.]+)" height="([\d.]+)"/);
  if (!m) return [full];
  const W = +m[1], H = +m[2];
  const cols = Math.max(1, Math.ceil(W / pw)), rows = Math.max(1, Math.ceil(H / ph));
  const pages: string[] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) pages.push(toSVG(document, { ...options, legend: false, window: { x: c * pw, y: r * ph, width: pw, height: ph } }));
  return pages;
}

export interface PngExportOptions extends SvgExportOptions { scale?: number }
/** Rasterizes the self-contained SVG to a PNG Blob via a canvas. Browser-only and async; the SVG has no external refs, so the canvas is not tainted. */
export async function toPNG(diagram: DiagramDocument, options: PngExportOptions = {}): Promise<Blob> {
  const svg = toSVG(diagram, options), scale = Math.max(0.1, options.scale ?? 2);
  const size = svg.match(/width="([\d.]+)" height="([\d.]+)"/);
  if (!size) throw new Error('No se pudo determinar el tamaño del SVG.');
  const width = +size[1], height = +size[2];
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(new Error('No se pudo cargar el SVG para rasterizar.')); img.src = url;
    });
    const canvas = globalThis.document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale)); canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D no disponible.');
    ctx.scale(scale, scale); ctx.drawImage(image, 0, 0, width, height);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('No se pudo generar el PNG.')), 'image/png'));
  } finally { URL.revokeObjectURL(url); }
}


export interface ThumbnailOptions { width?: number; height?: number; theme?: Partial<DiagramTheme>; padding?: number }
/** A simplified, fitted mini-SVG: node shapes and straight edges, no text or icons. For galleries and pickers. Pure. */
export function toThumbnail(document: DiagramDocument, options: ThumbnailOptions = {}): string {
  const theme = { ...lightTheme, ...options.theme }, W = Math.max(16, options.width ?? 160), H = Math.max(16, options.height ?? 120), pad = options.padding ?? 8;
  const boxes = Object.values(document.layout.nodes);
  const minX = boxes.length ? Math.min(...boxes.map(b => b.x)) : 0, minY = boxes.length ? Math.min(...boxes.map(b => b.y)) : 0;
  const maxX = boxes.length ? Math.max(...boxes.map(b => b.x + b.width)) : 1, maxY = boxes.length ? Math.max(...boxes.map(b => b.y + b.height)) : 1;
  const cw = Math.max(1, maxX - minX), ch = Math.max(1, maxY - minY);
  const scale = Math.min((W - pad * 2) / cw, (H - pad * 2) / ch);
  const ox = (W - cw * scale) / 2 - minX * scale, oy = (H - ch * scale) / 2 - minY * scale;
  const sw = num(Math.max(0.5, 1 / scale));
  const edges = document.graph.edges.map(edge => {
    const a = document.layout.nodes[edge.source], b = document.layout.nodes[edge.target];
    if (!a || !b) return '';
    return `<line x1="${num(a.x + a.width / 2)}" y1="${num(a.y + a.height / 2)}" x2="${num(b.x + b.width / 2)}" y2="${num(b.y + b.height / 2)}" stroke="${theme.edge}" stroke-width="${sw}"/>`;
  }).join('');
  const nodes = document.graph.nodes.map(node => {
    const box = document.layout.nodes[node.id]; if (!box) return '';
    return `<g transform="translate(${num(box.x)} ${num(box.y)})">${shapeMarkup(box, theme.iconBackground, theme.nodeBorder, Math.max(0.5, 1 / scale), 6)}</g>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="${theme.canvasBackground}"/><g transform="translate(${num(ox)} ${num(oy)}) scale(${num(scale)})">${edges}${nodes}</g></svg>`;
}
export interface HtmlExportOptions extends SvgExportOptions { interactive?: boolean }
const PANZOOM = `<script>(function(){var s=document.getElementById('kairo-svg');if(!s)return;var vb=(s.getAttribute('viewBox')||'0 0 100 100').split(' ').map(Number);var W=vb[2],H=vb[3],x=0,y=0,z=1,drag=false,px=0,py=0;function apply(){s.setAttribute('viewBox',x+' '+y+' '+(W*z)+' '+(H*z));}s.style.cursor='grab';s.addEventListener('wheel',function(e){e.preventDefault();z=Math.min(5,Math.max(0.2,z*(e.deltaY<0?0.9:1.1)));apply();},{passive:false});s.addEventListener('pointerdown',function(e){drag=true;px=e.clientX;py=e.clientY;s.setPointerCapture(e.pointerId);s.style.cursor='grabbing';});s.addEventListener('pointermove',function(e){if(!drag)return;var r=s.getBoundingClientRect();x-=(e.clientX-px)*(W*z)/r.width;y-=(e.clientY-py)*(H*z)/r.height;px=e.clientX;py=e.clientY;apply();});s.addEventListener('pointerup',function(){drag=false;s.style.cursor='grab';});})();</script>`;
/** Wraps the diagram in a self-contained, shareable HTML page (SVG + optional pan/zoom). Pure; no external assets. */
export function toHtml(document: DiagramDocument, options: HtmlExportOptions = {}): string {
  const svg = toSVG(document, options).replace('<svg ', '<svg id="kairo-svg" ');
  const title = esc(options.title ?? 'Diagrama Kairo');
  const script = options.interactive === false ? '' : PANZOOM;
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title><style>html,body{margin:0;height:100%}#kairo-svg{width:100%;height:100%;display:block}</style></head><body>${svg}${script}</body></html>`;
}

export interface LegendExportOptions { theme?: Partial<DiagramTheme>; title?: string; background?: boolean }
/** A compact SVG legend of the node types present in the document (icon + label), for embedding next to
 * a diagram in docs. Types appear in order of first use. Pure: no DOM, theme inlined. */
export function toLegend(document: DiagramDocument, options: LegendExportOptions = {}): string {
  const theme = { ...lightTheme, ...options.theme };
  const seen = new Set<string>(), types: DiagramDocument['graph']['nodes'][number]['type'][] = [];
  for (const node of document.graph.nodes) if (!seen.has(node.type)) { seen.add(node.type); types.push(node.type); }
  const rowH = 30, padX = 16, padTop = options.title ? 40 : 14, iconBox = 22;
  const width = 240, height = padTop + types.length * rowH + 10;
  const bg = options.background === false ? '' : `<rect width="${width}" height="${height}" rx="10" fill="${theme.canvasBackground}"/>`;
  const titleMarkup = options.title ? `<text x="${padX}" y="24" font-size="13" font-weight="600" fill="${theme.nodeText}" font-family="${esc(theme.fontFamily)}">${esc(options.title)}</text>` : '';
  const rows = types.map((type, i) => {
    const y = padTop + i * rowH;
    return `<g transform="translate(${padX} ${num(y)})">`
      + `<rect width="${iconBox}" height="${iconBox}" rx="6" fill="${theme.iconBackground}"/>`
      + `<path transform="translate(3 3)" d="${nodeIcons[type]}" fill="none" stroke="${theme.icon}" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>`
      + `<text x="${iconBox + 10}" y="${iconBox - 6}" font-size="12" fill="${theme.nodeText}" font-family="${esc(theme.fontFamily)}">${esc(nodeLabels[type])}</text>`
      + `</g>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${num(height)}" viewBox="0 0 ${width} ${num(height)}" role="img" aria-label="${esc(options.title ?? 'Leyenda')}" font-family="${esc(theme.fontFamily)}">${bg}${titleMarkup}${rows}</svg>`;
}

export interface TikzExportOptions { scale?: number }
const TIKZ_SHAPE: Record<string, string> = { diamond: 'diamond', ellipse: 'ellipse', pill: 'rounded rectangle', rectangle: 'rectangle' };
const tikzEsc = (s: string): string => s.replace(/\\/g, '\\textbackslash{}').replace(/[#$%&_{}]/g, c => `\\${c}`).replace(/~/g, '\\textasciitilde{}').replace(/\^/g, '\\textasciicircum{}');
/** Exports a document to LaTeX/TikZ (for papers and Overleaf). Needs `\usetikzlibrary{shapes.geometric}`
 * for diamond/ellipse shapes. Positions come from the layout (Y flipped for TikZ). Pure. Export only. */
export function toTikz(document: DiagramDocument, options: TikzExportOptions = {}): string {
  const scale = options.scale ?? 120;
  const name = new Map<string, string>();
  document.graph.nodes.forEach((n, i) => name.set(n.id, `n${i}_${n.id.replace(/[^A-Za-z0-9]/g, '')}`.slice(0, 40)));
  const lines = ['% Requiere: \\usetikzlibrary{shapes.geometric}', '\\begin{tikzpicture}[>=stealth, every node/.style={draw, align=center, font=\\small}]'];
  for (const node of document.graph.nodes) {
    const box = document.layout.nodes[node.id]; if (!box) continue;
    const x = num((box.x + box.width / 2) / scale), y = num(-(box.y + box.height / 2) / scale);
    const shape = TIKZ_SHAPE[box.shape ?? (node.type === 'decision' ? 'diamond' : 'rectangle')] ?? 'rectangle';
    lines.push(`  \\node[${shape}] (${name.get(node.id)}) at (${x}, ${y}) {${tikzEsc(node.title)}};`);
  }
  for (const edge of document.graph.edges) {
    const s = name.get(edge.source), t = name.get(edge.target); if (!s || !t) continue;
    const dashed = document.layout.edges[edge.id]?.dashed ? ', dashed' : '';
    const label = edge.label ? ` node[draw=none, midway, fill=white, font=\\scriptsize]{${tikzEsc(edge.label)}}` : '';
    lines.push(`  \\draw[->${dashed}] (${s}) --${label} (${t});`);
  }
  lines.push('\\end{tikzpicture}');
  return lines.join('\n');
}
