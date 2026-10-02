import type { DiagramOptions } from './types';
import { layoutNodeLabel } from './label-layout';
export { wrapLabel, layoutNodeLabel, type NodeLabelLayout } from './label-layout';

/** Opt-in SVG title renderer. Pass as `onNodeRender`, or call first in a host's own renderer.
 * Uses the core's title/type/source elements; custom badges may still be appended to `layer` afterwards.
 * Keeps the complete title in the graph, tooltip and accessible name. */
export const wrapNodeLabels: NonNullable<DiagramOptions['onNodeRender']> = (node, layer, box) => {
  const group = layer.parentElement!, title = group.querySelector<SVGTextElement>('.cd-title')!;
  const layout = layoutNodeLabel(node, box);
  title.replaceChildren();
  title.setAttribute('y', String(layout.y));
  // Low-zoom core styles otherwise enlarge/translate text outside the measured area.
  title.style.fontSize = '13px'; title.style.transform = 'none';
  for (const [i, line] of layout.lines.entries()) {
    const span = layer.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'tspan');
    span.setAttribute('x', String(layout.x)); span.setAttribute('y', String(layout.y + i * layout.lineHeight));
    span.textContent = line; title.append(span);
  }
  group.querySelector('.cd-type')!.setAttribute('y', String(layout.typeY));
  group.querySelector('.cd-source')!.setAttribute('y', String(layout.sourceY));
};
