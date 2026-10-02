import type { DiagramNode, NodeLayout, DiagramOptions } from './types';
import { nodeIcons, nodeLabels } from './icons';
import { ports } from './types';
import { anchor } from './geometry';
import { shapePath, shapeText } from './shapes';

export const svgNS = 'http://www.w3.org/2000/svg';
export function svg<K extends keyof SVGElementTagNameMap>(tag: K, attributes: Record<string, string | number> = {}): SVGElementTagNameMap[K] {
  const element = document.createElementNS(svgNS, tag);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
  return element;
}
export interface NodeView { group: SVGGElement; title: SVGTextElement; type: SVGTextElement; source: SVGTextElement; glyph: SVGPathElement; body: SVGElement; tags: SVGGElement; custom: SVGGElement; anchors: SVGCircleElement[] }
const truncate = (text: string, width: number, size: number) => {
  const characters = [...text], max = Math.max(1, Math.floor(width / (size * 0.61)));
  return characters.length <= max ? text : characters.slice(0, max - 1).join('') + '…';
};
const CHIP = { height: 16, padX: 6, gap: 5, size: 9, top: 6 };
/** Tags render as chips in a single clipped row below the node body. Decorative only; the semantic graph is unchanged. */
function renderTags(group: SVGGElement, tags: string[] | undefined, box: NodeLayout): void {
  group.replaceChildren();
  group.setAttribute('transform', `translate(16 ${box.height + CHIP.top})`);
  if (!tags?.length) return;
  const limit = box.width - 16, approx = (text: string) => text.length * CHIP.size * 0.6 + CHIP.padX * 2;
  let x = 0;
  for (let i = 0; i < tags.length; i++) {
    const width = approx(tags[i]);
    if (x && x + width > limit) { // No room: show a +N counter and stop.
      const more = svg('text', { class: 'cd-tag-more', x: x + 2, y: CHIP.height - 4 });
      more.textContent = `+${tags.length - i}`; group.append(more); break;
    }
    const chip = svg('g', { class: 'cd-tag', transform: `translate(${x} 0)` });
    chip.append(svg('rect', { class: 'cd-tag-bg', width, height: CHIP.height, rx: CHIP.height / 2 }));
    const text = svg('text', { class: 'cd-tag-text', x: CHIP.padX, y: CHIP.height - 5 });
    text.textContent = tags[i]; chip.append(text); group.append(chip);
    x += width + CHIP.gap;
  }
}
/** One renderer for every type. Detail levels are controlled by the root class. */
export function createNodeView(id: string): NodeView {
  const group = svg('g', { class: 'cd-node', 'data-node': id, tabindex: 0, role: 'button' });
  const body = svg('rect', { class: 'cd-node-body' });
  const tile = svg('rect', { class: 'cd-icon-tile', x: 16, y: 16, width: 28, height: 28, rx: 8 });
  const glyph = svg('path', { class: 'cd-icon', transform: 'translate(20 20)' });
  const title = svg('text', { class: 'cd-title', x: 56, y: 35 });
  const type = svg('text', { class: 'cd-type', x: 56, y: 57 });
  const source = svg('text', { class: 'cd-source', x: 16, y: 78 });
  const tags = svg('g', { class: 'cd-tags' });
  const custom = svg('g', { class: 'cd-node-custom' });
  const tooltip = svg('title');
  group.append(tooltip, body, tile, glyph, title, type, source, tags, custom);
  const anchors = ports.map(port => {
    const circle = svg('circle', { class: 'cd-anchor', r: 4, 'data-port': port });
    const hit = svg('circle', { class: 'cd-anchor-hit', r: 12, 'data-port': port });
    group.append(hit, circle);
    return circle;
  });
  return { group, body, title, type, source, glyph, tags, custom, anchors };
}
export function updateNodeView(view: NodeView, node: DiagramNode, box: NodeLayout, render?: DiagramOptions['onNodeRender']): void {
  view.group.setAttribute('transform', `translate(${box.x} ${box.y})`);
  view.group.setAttribute('aria-label', `${node.title}, ${nodeLabels[node.type]}`);
  view.group.querySelector('title')!.textContent = [node.title, node.source].filter(Boolean).join('\n');
  const shape = box.shape ?? 'rectangle';
  view.group.dataset.shape = shape;
  const path = shapePath(box), tag = path ? 'path' : shape === 'ellipse' ? 'ellipse' : 'rect';
  if (view.body.tagName.toLowerCase() !== tag) { const body = svg(tag, { class: 'cd-node-body' }); view.body.replaceWith(body); view.body = body; }
  const attributes = path ? { d: path } : shape === 'ellipse'
    ? { cx: box.width/2, cy: box.height/2, rx: box.width/2, ry: box.height/2 }
    : { width: box.width, height: box.height };
  for (const [key, value] of Object.entries(attributes)) view.body.setAttribute(key, String(value));
  if (tag === 'rect') view.body.style.rx = shape === 'pill' ? `${box.height/2}px` : 'var(--cd-radius)';
  view.type.textContent = nodeLabels[node.type];
  view.source.textContent = truncate(node.source || '', box.width - 32, 10);
  renderTags(view.tags, node.tags, box);
  view.glyph.setAttribute('d', nodeIcons[node.type]);
  const compact = shape !== 'rectangle', text = shapeText(box);
  view.title.setAttribute('x', String(compact ? box.width/2 : 56));
  view.title.setAttribute('y', String(compact ? text.y - 3 : 35));
  view.type.setAttribute('x', String(compact ? box.width/2 : 56));
  view.type.setAttribute('y', String(compact ? text.y + 15 : 57));
  view.title.setAttribute('text-anchor', compact ? 'middle' : 'start');
  view.type.setAttribute('text-anchor', compact ? 'middle' : 'start');
  view.title.textContent = truncate(node.title, compact ? text.width : box.width - 72, 13);
  ports.forEach((port, i) => {
    const p = anchor({ ...box, x: 0, y: 0 }, port);
    for (const element of [view.anchors[i], view.anchors[i].previousElementSibling!]) {
      element.setAttribute('cx', String(p.x)); element.setAttribute('cy', String(p.y));
    }
  });
  if (render) { view.custom.replaceChildren(); render(node, view.custom, box); }
}
