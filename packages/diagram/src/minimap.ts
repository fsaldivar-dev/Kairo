import type { DiagramDocument, Viewport } from './types';

/** The small slice of the editor the minimap needs; DiagramEditor satisfies it. */
export interface MinimapEditor {
  element: HTMLElement;
  getDocument(): DiagramDocument;
  getViewport(): Viewport;
  setViewport(viewport: Viewport): void;
}
export interface MinimapOptions {
  width?: number; height?: number; padding?: number;
  /** Add a keyboard-accessible disclosure button. Default: false (bare SVG, as before). */
  collapsible?: boolean;
  /** Initial view state, never written to the diagram. Default: false. */
  collapsed?: boolean;
  showLabel?: string; hideLabel?: string;
  /** Fires on an actual state change, not on mount. Hosts may persist the preference. */
  onCollapsedChange?: (collapsed: boolean) => void;
}
export interface MinimapController { update(): void; setCollapsed(collapsed: boolean): void; isCollapsed(): boolean; destroy(): void }

const NS = 'http://www.w3.org/2000/svg';
let nextId = 0;
const el = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}): SVGElementTagNameMap[K] => {
  const node = globalThis.document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
};

/** Mounts an overview with click/drag navigation. Call update() on document/viewport changes;
 * collapsed maps skip rendering and refresh when reopened. The host owns styles and persistence. */
export function createMinimap(editor: MinimapEditor, host: HTMLElement, options: MinimapOptions = {}): MinimapController {
  const W = options.width ?? 180, H = options.height ?? 120, pad = options.padding ?? 6;
  const svg = el('svg', { class: 'cd-minimap', width: W, height: H, viewBox: `0 0 ${W} ${H}` });
  const edgesLayer = el('g'), nodesLayer = el('g'), viewRect = el('rect', { class: 'cd-minimap-viewport' });
  svg.append(edgesLayer, nodesLayer, viewRect); host.append(svg);
  const button = options.collapsible ? host.ownerDocument.createElement('button') : null;
  let scale = 1, ox = 0, oy = 0, collapsed = !!options.collapsed, destroyed = false;
  if (button) {
    let id: string;
    do { id = `kairo-minimap-${++nextId}`; } while (host.ownerDocument.getElementById(id));
    svg.id = id;
    button.type = 'button'; button.className = 'cd-minimap-toggle';
    button.setAttribute('aria-controls', svg.id); host.append(button);
  }
  function syncDisclosure(): void {
    svg.style.display = collapsed ? 'none' : '';
    if (button) {
      button.textContent = collapsed ? options.showLabel ?? 'Show minimap' : options.hideLabel ?? 'Hide minimap';
      button.title = button.textContent;
      button.setAttribute('aria-label', button.textContent);
      button.setAttribute('aria-expanded', String(!collapsed));
    }
  }

  function update(): void {
    if (collapsed || destroyed) return;
    const doc = editor.getDocument(), boxes = Object.values(doc.layout.nodes);
    const minX = boxes.length ? Math.min(...boxes.map(b => b.x)) : 0, minY = boxes.length ? Math.min(...boxes.map(b => b.y)) : 0;
    const maxX = boxes.length ? Math.max(...boxes.map(b => b.x + b.width)) : 1, maxY = boxes.length ? Math.max(...boxes.map(b => b.y + b.height)) : 1;
    const vp = editor.getViewport(), ew = editor.element.clientWidth || 1, eh = editor.element.clientHeight || 1;
    // Include the visible viewport in the fitted bounds so the box is always on screen.
    const vx0 = (0 - vp.x) / vp.zoom, vy0 = (0 - vp.y) / vp.zoom, vx1 = (ew - vp.x) / vp.zoom, vy1 = (eh - vp.y) / vp.zoom;
    const x0 = Math.min(minX, vx0), y0 = Math.min(minY, vy0), x1 = Math.max(maxX, vx1), y1 = Math.max(maxY, vy1);
    const cw = Math.max(1, x1 - x0), ch = Math.max(1, y1 - y0);
    scale = Math.min((W - pad * 2) / cw, (H - pad * 2) / ch);
    ox = (W - cw * scale) / 2 - x0 * scale; oy = (H - ch * scale) / 2 - y0 * scale;
    edgesLayer.replaceChildren(); nodesLayer.replaceChildren();
    for (const edge of doc.graph.edges) {
      const a = doc.layout.nodes[edge.source], c = doc.layout.nodes[edge.target]; if (!a || !c) continue;
      edgesLayer.append(el('line', { class: 'cd-minimap-edge', x1: (a.x + a.width / 2) * scale + ox, y1: (a.y + a.height / 2) * scale + oy, x2: (c.x + c.width / 2) * scale + ox, y2: (c.y + c.height / 2) * scale + oy }));
    }
    for (const b of boxes) nodesLayer.append(el('rect', { class: 'cd-minimap-node', x: b.x * scale + ox, y: b.y * scale + oy, width: Math.max(1, b.width * scale), height: Math.max(1, b.height * scale), rx: 1 }));
    for (const [k, v] of [['x', vx0 * scale + ox], ['y', vy0 * scale + oy], ['width', Math.max(2, (vx1 - vx0) * scale)], ['height', Math.max(2, (vy1 - vy0) * scale)]] as const) viewRect.setAttribute(k, String(v));
  }
  let pointer: number | null = null;
  const recenter = (clientX: number, clientY: number): void => {
    const rect = svg.getBoundingClientRect();
    const worldX = ((clientX - rect.left) - ox) / scale, worldY = ((clientY - rect.top) - oy) / scale;
    const vp = editor.getViewport(), ew = editor.element.clientWidth, eh = editor.element.clientHeight;
    editor.setViewport({ zoom: vp.zoom, x: ew / 2 - worldX * vp.zoom, y: eh / 2 - worldY * vp.zoom });
    update();
  };
  const endDrag = (): void => {
    const id = pointer; pointer = null;
    if (id !== null && svg.hasPointerCapture(id)) svg.releasePointerCapture(id);
  };
  const onDown = (e: PointerEvent): void => {
    if (collapsed || e.button !== 0 || pointer !== null) return;
    pointer = e.pointerId; svg.setPointerCapture(pointer); recenter(e.clientX, e.clientY);
  };
  const onMove = (e: PointerEvent): void => { if (pointer === e.pointerId) recenter(e.clientX, e.clientY); };
  const onUp = (e: PointerEvent): void => { if (pointer === e.pointerId) endDrag(); };
  function setCollapsed(value: boolean): void {
    if (destroyed || collapsed === value) return;
    endDrag(); collapsed = value; syncDisclosure(); update(); options.onCollapsedChange?.(collapsed);
  }
  const toggle = (): void => setCollapsed(!collapsed);
  button?.addEventListener('click', toggle);
  svg.addEventListener('pointerdown', onDown); svg.addEventListener('pointermove', onMove);
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) svg.addEventListener(event, onUp as EventListener);
  svg.style.cursor = 'pointer'; svg.style.touchAction = 'none';
  syncDisclosure(); update();
  return { update, setCollapsed, isCollapsed: () => collapsed, destroy() {
    if (destroyed) return;
    destroyed = true; endDrag();
    button?.removeEventListener('click', toggle); button?.remove();
    svg.removeEventListener('pointerdown', onDown); svg.removeEventListener('pointermove', onMove);
    for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) svg.removeEventListener(event, onUp as EventListener);
    svg.remove();
  } };
}
