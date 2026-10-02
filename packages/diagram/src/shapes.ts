import type { NodeLayout } from './types';

/** Local SVG contours shared by the interactive renderer and static exports. */
export function shapePath({ width: w, height: h, shape }: NodeLayout): string {
  const inset = w * .18, fold = Math.min(w, h) * .2, r = h * .12;
  // Retrace interior strokes: closing an open SVG subpath implicitly must not cut a hole in the fill.
  switch (shape) {
    case 'diamond': return `M ${w/2} 0 L ${w} ${h/2} L ${w/2} ${h} L 0 ${h/2} Z`;
    case 'cylinder': return `M 0 ${r} A ${w/2} ${r} 0 0 1 ${w} ${r} V ${h-r} A ${w/2} ${r} 0 0 1 0 ${h-r} Z M 0 ${r} A ${w/2} ${r} 0 0 0 ${w} ${r} A ${w/2} ${r} 0 0 1 0 ${r}`;
    case 'document': return `M 0 0 H ${w} V ${h*.85} C ${w*.75} ${h*.65} ${w*.25} ${h*1.05} 0 ${h*.85} Z`;
    case 'parallelogram': return `M ${inset} 0 H ${w} L ${w-inset} ${h} H 0 Z`;
    case 'trapezoid': return `M ${inset} 0 H ${w-inset} L ${w} ${h} H 0 Z`;
    case 'hexagon': return `M ${inset} 0 H ${w-inset} L ${w} ${h/2} L ${w-inset} ${h} H ${inset} L 0 ${h/2} Z`;
    case 'triangle': return `M ${w/2} 0 L ${w} ${h} H 0 Z`;
    case 'note': return `M 0 0 H ${w-fold} L ${w} ${fold} V ${h} H 0 Z M ${w-fold} 0 V ${fold} H ${w} H ${w-fold} V 0`;
    case 'subprocess': return `M 0 0 H ${w} V ${h} H 0 Z M ${inset/2} 0 V ${h} M ${w-inset/2} 0 V ${h}`;
    default: return '';
  }
}

/** A conservative text area inside the contour, including narrow/sloped shapes. */
export function shapeText(box: NodeLayout): { y: number; width: number } {
  const s = box.shape;
  return { y: box.height * (s === 'triangle' ? .68 : s === 'document' ? .42 : s === 'cylinder' ? .56 : .5),
    width: box.width * (s === 'triangle' ? .48 : s === 'diamond' ? .6 : ['parallelogram', 'hexagon', 'trapezoid'].includes(s!) ? .64 : .8) };
}
