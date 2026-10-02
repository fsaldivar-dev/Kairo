import type { ConnectionIssue, ConnectionPolicy, DiagramDocument, DiagramEdge, DiagramNode, DiagramOptions, DiagramTheme, EdgeEndpoints, LaneOrientation, NodeLayout, EdgeLayout, EdgeStyle, NodeType, Point, Port, Selection, Tool, Viewport } from './types';
import { nodeDefaults, ports } from './types';
import { parseDocument } from './document';
import { anchor, connectionPath, defaultPorts, groupBounds, laneBands, nearestPort } from './geometry';
import { applyTheme, detailLevel } from './theme';
import { createNodeView, svg, updateNodeView, type NodeView } from './renderer';
import { alignNodes, checkConnection, connectNodes, distributeNodes, duplicateNode, extractSelection, pasteClipboard, reachable, reconnectEdge, removeElement, reverseEdge, type AlignEdge, type Clipboard, type OperationResult } from './operations';

type Drop = ReturnType<typeof nearestPort>;
type DropPredicate = (id: string, port: Port) => boolean;
type Gesture =
  | { kind: 'node'; id: string; pointer: Point; origin: Point; before: DiagramDocument }
  | { kind: 'pan'; pointer: Point; origin: Point }
  | { kind: 'connect'; id: string; port: Port; point: Point; target: Drop; valid: DropPredicate }
  | { kind: 'reconnect'; edge: string; end: 'source' | 'target'; fixed: Point; fixedPort: Port; point: Point; target: Drop; valid: DropPredicate }
  | { kind: 'resize'; id: string; pointer: Point; origin: { width: number; height: number }; before: DiagramDocument }
  | { kind: 'group'; ids: string[]; pointer: Point; origins: Map<string, Point>; before: DiagramDocument }
  | { kind: 'marquee'; start: Point; current: Point; base: Set<string> };
interface EdgeView { group: SVGGElement; path: SVGPathElement; hit: SVGPathElement; label: SVGTextElement }
const clone = <T>(value: T): T => structuredClone(value);
const clampZoom = (zoom: number) => Math.min(2.5, Math.max(0.25, zoom));
const MIN_W = 140, MIN_H = 76;
const opposite: Record<Port, Port> = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };
let instanceCounter = 0;

export class DiagramEditor {
  readonly element: HTMLDivElement;
  private readonly canvas = svg('svg', { class: 'cd-canvas', 'aria-label': 'Editor de diagramas', role: 'group' });
  private readonly world = svg('g');
  private readonly laneLayer = svg('g');
  private readonly groupLayer = svg('g');
  private readonly groupControlLayer = svg('g', { class: 'cd-group-controls' });
  private readonly edgeLayer = svg('g');
  private readonly nodeLayer = svg('g');
  private readonly handleLayer = svg('g', { class: 'cd-edge-handles', visibility: 'hidden' });
  private readonly handles = { source: svg('circle', { class: 'cd-edge-handle', r: 6, 'data-handle': 'source' }), target: svg('circle', { class: 'cd-edge-handle', r: 6, 'data-handle': 'target' }) };
  private readonly resizeHandle = svg('rect', { class: 'cd-resize-handle', width: 11, height: 11, rx: 2, 'data-resize': 'se' });
  private readonly marquee = svg('rect', { class: 'cd-marquee', visibility: 'hidden' });
  private readonly guideV = svg('line', { class: 'cd-guide', visibility: 'hidden' });
  private readonly guideH = svg('line', { class: 'cd-guide', visibility: 'hidden' });
  private readonly selectedNodes = new Set<string>();
  private readonly highlighted = new Set<string>();
  private readonly preview = svg('path', { class: 'cd-connection-preview', visibility: 'hidden' });
  private readonly gridPattern = svg('pattern', { patternUnits: 'userSpaceOnUse', width: 24, height: 24 });
  private readonly gridRect = svg('rect', { width: '100%', height: '100%', class: 'cd-grid' });
  private readonly nodes = new Map<string, NodeView>();
  private readonly edges = new Map<string, EdgeView>();
  private readonly nodeData = new Map<string, DiagramNode>();
  private readonly edgeData = new Map<string, DiagramEdge>();
  private readonly groupViews = new Map<string, { box: SVGRectElement; controls: SVGGElement; header: SVGRectElement; label: SVGTextElement; caret: SVGTextElement; caretHit: SVGRectElement; count: SVGTextElement }>();
  private readonly collapsed = new Set<string>();
  private readonly collapsedBoxes = new Map<string, NodeLayout>();
  private readonly laneViews = new Map<string, { group: SVGGElement; box: SVGRectElement; label: SVGTextElement }>();
  private readonly laneOrientation: LaneOrientation;
  private readOnly = false;
  private gridSnap = 0;
  private readonly incident = new Map<string, Set<string>>();
  private readonly abort = new AbortController();
  private readonly observer: ResizeObserver;
  private readonly arrowId: string;
  private document: DiagramDocument;
  private policy: ConnectionPolicy;
  private viewport: Viewport = { x: 0, y: 0, zoom: 1 };
  private selection: Selection = null;
  private tool: Tool = 'select';
  private style: EdgeStyle;
  private gesture: Gesture | null = null;
  private space = false;
  private frame = 0;
  private pending: PointerEvent | null = null;
  private destroyed = false;
  private undoStack: DiagramDocument[] = [];
  private redoStack: DiagramDocument[] = [];
  private readonly input = document.createElement('input');
  private edit: { kind: 'node' | 'edge'; id: string } | null = null;
  private lastTap: { id: string; time: number } | null = null;
  private clipboard: Clipboard | null = null;

  constructor(host: HTMLElement, private readonly options: DiagramOptions) {
    this.document = parseDocument(options.document);
    this.policy = { ...options.connections };
    this.style = options.edgeStyle ?? 'rounded';
    this.laneOrientation = options.lanes ?? 'columns';
    this.readOnly = options.readOnly ?? false;
    this.gridSnap = Math.max(0, options.gridSnap ?? 0);
    const instance = ++instanceCounter;
    this.arrowId = `cd-arrow-${instance}`;
    this.element = document.createElement('div');
    this.element.className = 'cd-editor';
    this.element.tabIndex = 0;
    this.element.dataset.tool = this.tool;
    this.element.dataset.readonly = String(this.readOnly);
    this.element.setAttribute('aria-label', 'Diagrama. Arrastra nodos; usa Espacio para desplazar, Alt+flechas para navegar entre nodos y Suprimir para eliminar.');
    if (options.theme) applyTheme(this.element, options.theme);
    const defs = svg('defs');
    const marker = svg('marker', { id: this.arrowId, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse', markerUnits: 'userSpaceOnUse' });
    marker.append(svg('path', { d: 'M 2 1 L 8 5 L 2 9', class: 'cd-arrow' }));
    this.gridPattern.id = `cd-grid-${instance}`;
    this.gridPattern.append(svg('circle', { cx: 1, cy: 1, r: 0.8, class: 'cd-grid-dot' }));
    this.gridRect.setAttribute('fill', `url(#${this.gridPattern.id})`);
    const dot = svg('marker', { id: `${this.arrowId}-dot`, viewBox: '0 0 10 10', refX: 5, refY: 5, markerWidth: 7, markerHeight: 7, markerUnits: 'userSpaceOnUse' });
    dot.append(svg('circle', { cx: 5, cy: 5, r: 3, class: 'cd-arrow' }));
    defs.append(marker, dot, this.gridPattern);
    this.handleLayer.append(this.handles.source, this.handles.target, this.resizeHandle);
    this.world.append(this.laneLayer, this.groupLayer, this.edgeLayer, this.preview, this.nodeLayer, this.handleLayer, this.groupControlLayer, this.marquee, this.guideV, this.guideH);
    this.canvas.append(defs, this.gridRect, this.world);
    this.element.append(this.canvas);
    host.append(this.element);
    this.setGrid(options.grid ?? true);
    this.reconcile();
    this.updateViewport();
    const signal = this.abort.signal;
    this.canvas.addEventListener('pointerdown', this.pointerDown, { signal });
    this.canvas.addEventListener('pointermove', this.pointerMove, { signal });
    this.canvas.addEventListener('pointerup', this.pointerUp, { signal });
    this.canvas.addEventListener('pointercancel', this.cancelGesture, { signal });
    this.canvas.addEventListener('lostpointercapture', this.cancelGesture, { signal });
    this.canvas.addEventListener('wheel', this.wheel, { passive: false, signal });
    this.element.addEventListener('keydown', this.keyDown, { signal });
    this.input.className = 'cd-inline-input';
    this.input.type = 'text';
    this.input.maxLength = 120;
    this.input.style.display = 'none';
    this.input.setAttribute('aria-label', 'Editar texto');
    this.element.append(this.input);
    this.input.addEventListener('keydown', this.inputKey, { signal });
    this.input.addEventListener('blur', this.commitEdit, { signal });
    window.addEventListener('keyup', this.keyUp, { signal });
    window.addEventListener('blur', this.resetInteraction, { signal });
    this.observer = new ResizeObserver(() => { if (this.options.autoFit) this.fit(); else this.options.onViewportChange?.(this.getViewport()); });
    this.observer.observe(host);
    this.historyChanged();
  }

  getDocument(): DiagramDocument { return clone(this.document); }
  getViewport(): Viewport { return { ...this.viewport }; }
  getSelection(): Selection { return this.selection && { ...this.selection }; }
  setDocument(document: DiagramDocument): void {
    const parsed = parseDocument(document);
    this.cancelGesture(); this.commitEdit();
    this.document = parsed;
    this.undoStack = []; this.redoStack = [];
    this.collapsed.clear();
    this.select(null); this.reconcile(); this.historyChanged(); this.changed();
  }
  /** Replaces the whole document as one undo step, unlike setDocument which resets history. Selection is kept where ids still exist. */
  replaceDocument(document: DiagramDocument): void {
    this.cancelGesture(); this.commitEdit();
    const parsed = parseDocument(document), before = this.getDocument();
    this.document = parsed; this.reconcile(); this.commit(before);
  }
  setTheme(theme: Partial<DiagramTheme>): void { applyTheme(this.element, theme); }
  setGrid(visible: boolean): void { this.gridRect.style.display = visible ? '' : 'none'; }
  setTool(tool: Tool): void { this.cancelGesture(); this.tool = tool; this.element.dataset.tool = tool; }
  setEdgeStyle(style: EdgeStyle): void { this.style = style; for (const id of this.edges.keys()) this.renderEdge(id); }
  /** Opens the in-place editor for a node title or edge label. Returns false if the element does not exist. */
  editText(kind: 'node' | 'edge', id: string): boolean {
    const exists = (kind === 'node' ? this.nodes : this.edges).has(id);
    if (!exists) return false;
    this.beginEdit(kind, id);
    return true;
  }
  /** Rules for new or edited connections. Existing edges that break the rules stay in the document. */
  setConnectionPolicy(policy: ConnectionPolicy): void { this.cancelGesture(); this.policy = { ...policy }; }
  getConnectionPolicy(): ConnectionPolicy { return { ...this.policy }; }
  /** Read-only viewer: disables editing interactions (drag, connect, resize, delete, paste…); pan, zoom and selection still work. */
  setReadOnly(readOnly: boolean): void { this.cancelGesture(); this.commitEdit(); this.readOnly = readOnly; this.element.dataset.readonly = String(readOnly); this.updateHandles(); }
  isReadOnly(): boolean { return this.readOnly; }
  /** Snap dragged/resized nodes to a grid of `size` world units (0 disables). Alignment guides take priority. */
  setGridSnap(size: number): void { this.gridSnap = Math.max(0, size); }
  getGridSnap(): number { return this.gridSnap; }
  /** Highlights a set of nodes and/or edges, dimming the rest. Useful for active paths, search results or validation routes. */
  setHighlight(ids: Iterable<string>): void { this.highlighted.clear(); for (const id of ids) this.highlighted.add(id); this.applyHighlight(); }
  clearHighlight(): void { if (!this.highlighted.size) return; this.highlighted.clear(); this.applyHighlight(); }
  getHighlight(): string[] { return [...this.highlighted]; }
  private applyHighlight(): void {
    this.element.classList.toggle('has-highlight', this.highlighted.size > 0);
    for (const [id, v] of this.nodes) v.group.classList.toggle('is-highlighted', this.highlighted.has(id));
    for (const [id, v] of this.edges) v.group.classList.toggle('is-highlighted', this.highlighted.has(id));
  }
  select(selection: Selection): void {
    if (selection && !(selection.kind === 'node' ? this.nodes : this.edges).has(selection.id)) return;
    this.selectedNodes.clear();
    if (selection?.kind === 'node') this.selectedNodes.add(selection.id);
    this.selection = selection && { ...selection };
    this.applySelection();
  }
  /** Node ids currently selected (one for a single selection, several for a multi-selection). */
  getSelectedNodeIds(): string[] { return [...this.selectedNodes]; }
  /** Adds or removes a node from the multi-selection, keeping it as the primary for the inspector. */
  toggleNode(id: string): void {
    if (!this.nodes.has(id)) return;
    if (this.selectedNodes.has(id)) this.selectedNodes.delete(id); else this.selectedNodes.add(id);
    const primary = this.selectedNodes.has(id) ? id : [...this.selectedNodes].at(-1);
    this.selection = primary ? { kind: 'node', id: primary } : null;
    this.applySelection();
  }
  /** Replaces the selection with a set of nodes (used by marquee selection). */
  selectNodes(ids: Iterable<string>): void {
    this.selectedNodes.clear();
    for (const id of ids) if (this.nodes.has(id)) this.selectedNodes.add(id);
    const primary = [...this.selectedNodes].at(-1);
    this.selection = primary ? { kind: 'node', id: primary } : null;
    this.applySelection();
  }
  private applySelection(): void {
    for (const [id, view] of this.nodes) view.group.classList.toggle('is-selected', this.selectedNodes.has(id));
    for (const [id, view] of this.edges) view.group.classList.toggle('is-selected', this.selection?.kind === 'edge' && this.selection.id === id);
    this.updateHandles();
    this.options.onSelectionChange?.(this.getSelection());
  }
  addNode(type: NodeType = 'generic', title = 'Nuevo nodo', layout?: Partial<NodeLayout>): string {
    this.cancelGesture();
    const candidate = this.getDocument(), id = `n-${crypto.randomUUID()}`, preset = { ...nodeDefaults[type], ...layout };
    const center = this.toWorld({ x: this.element.clientWidth / 2, y: this.element.clientHeight / 2 });
    candidate.graph.nodes.push({ id, title, type });
    candidate.layout.nodes[id] = { ...preset, x: layout?.x ?? center.x - preset.width / 2, y: layout?.y ?? center.y - preset.height / 2 };
    this.apply(parseDocument(candidate)); this.select({ kind: 'node', id });
    return id;
  }
  updateNode(id: string, patch: Partial<Pick<DiagramNode, 'title' | 'type' | 'source' | 'tags'>>): void {
    this.cancelGesture();
    const candidate = this.getDocument(), node = candidate.graph.nodes.find(n => n.id === id);
    if (!node) return;
    Object.assign(node, patch);
    this.apply(parseDocument(candidate));
  }
  updateNodeLayout(id: string, patch: Partial<NodeLayout>): void {
    this.cancelGesture();
    const candidate = this.getDocument();
    if (!candidate.layout.nodes[id]) return;
    Object.assign(candidate.layout.nodes[id], patch);
    this.apply(parseDocument(candidate));
  }
  updateEdge(id: string, patch: Partial<Pick<DiagramEdge, 'label' | 'relation' | 'condition' | 'tags'>>, layout: Partial<EdgeLayout> = {}): void {
    this.cancelGesture();
    const candidate = this.getDocument(), edge = candidate.graph.edges.find(e => e.id === id);
    if (!edge) return;
    Object.assign(edge, patch); Object.assign(candidate.layout.edges[id], layout);
    this.apply(parseDocument(candidate));
  }
  /** Why `source → target` would be refused under the current policy, or `null` when allowed. */
  connectionIssue(source: string, target: string, ignoreEdge?: string): ConnectionIssue | null {
    return checkConnection(this.document, source, target, this.policy, { ignoreEdge, canConnect: this.options.canConnect });
  }
  connect(source: string, target: string, layout?: EdgeLayout): string | null {
    this.cancelGesture();
    const id = `e-${crypto.randomUUID()}`;
    return this.apply(connectNodes(this.document, id, source, target, layout, this.policy, { canConnect: this.options.canConnect })) ? id : null;
  }
  /** Moves one or both endpoints atomically with their ports. Returns false, without touching document or history, when the policy rejects it. */
  reconnectEdge(id: string, patch: EdgeEndpoints): boolean {
    this.cancelGesture();
    return this.apply(reconnectEdge(this.document, id, patch, this.policy, { canConnect: this.options.canConnect }));
  }
  reverseEdge(id: string): boolean {
    this.cancelGesture();
    return this.apply(reverseEdge(this.document, id, this.policy, { canConnect: this.options.canConnect }));
  }
  /** Duplicates the selected node (not edges) and selects the copy, as one undo step. Returns the new id or null. */
  duplicateSelected(): string | null {
    this.cancelGesture();
    if (this.selection?.kind !== 'node') return null;
    const id = `n-${crypto.randomUUID()}`;
    if (!this.apply(duplicateNode(this.document, this.selection.id, id))) return null;
    this.select({ kind: 'node', id });
    return id;
  }
  /** Copies the selected nodes and their internal edges to an in-editor clipboard. Returns false if nothing is selected. */
  copySelection(): boolean {
    if (!this.selectedNodes.size) return false;
    this.clipboard = extractSelection(this.document, this.selectedNodes);
    return true;
  }
  cut(): boolean { if (!this.copySelection()) return false; this.removeSelected(); return true; }
  /** Aligns the selected nodes (needs two or more). Returns false if it does not apply. */
  alignSelected(edge: AlignEdge): boolean { return this.applyLayout(alignNodes(this.document, this.selectedNodes, edge)); }
  /** Evenly distributes the selected nodes along an axis (needs three or more). Returns false if it does not apply. */
  distributeSelected(axis: 'horizontal' | 'vertical'): boolean { return this.applyLayout(distributeNodes(this.document, this.selectedNodes, axis)); }
  private applyLayout(next: DiagramDocument | null): boolean {
    this.cancelGesture();
    if (!next) return false;
    const before = this.getDocument();
    this.document = next; this.reconcile(); this.commit(before);
    return true;
  }
  /** Pastes the clipboard with fresh ids at an offset, selects the copies, and records one undo. Returns the new node ids. */
  paste(offset: Point = { x: 24, y: 24 }): string[] {
    this.cancelGesture();
    if (!this.clipboard) return [];
    const result = pasteClipboard(this.document, this.clipboard, prefix => `${prefix}-${crypto.randomUUID()}`, offset);
    if (result === 'empty') return [];
    const before = this.getDocument();
    this.document = result.document; this.reconcile(); this.commit(before);
    this.selectNodes(result.nodeIds);
    // Cascade subsequent pastes from the copies just placed.
    this.clipboard = extractSelection(this.document, result.nodeIds);
    return result.nodeIds;
  }
  removeSelected(): void {
    this.cancelGesture();
    const before = this.getDocument();
    if (this.selectedNodes.size) {
      const ids = new Set(this.selectedNodes);
      this.document.graph.nodes = this.document.graph.nodes.filter(n => !ids.has(n.id));
      for (const id of ids) delete this.document.layout.nodes[id];
      this.document.graph.edges = this.document.graph.edges.filter(e => {
        const drop = ids.has(e.source) || ids.has(e.target);
        if (drop) delete this.document.layout.edges[e.id];
        return !drop;
      });
    } else if (this.selection?.kind === 'edge') {
      this.document = removeElement(this.document, this.selection);
    } else return;
    this.select(null); this.reconcile(); this.commit(before);
  }
  undo(): void { this.travel(this.undoStack, this.redoStack); }
  redo(): void { this.travel(this.redoStack, this.undoStack); }
  setViewport(viewport: Viewport): void {
    if (![viewport.x, viewport.y, viewport.zoom].every(Number.isFinite)) return;
    this.viewport = { ...viewport, zoom: clampZoom(viewport.zoom) }; this.updateViewport();
  }
  zoomBy(factor: number, center: Point = { x: this.element.clientWidth / 2, y: this.element.clientHeight / 2 }): void {
    if (!Number.isFinite(factor) || factor <= 0) return;
    const world = this.toWorld(center), zoom = clampZoom(this.viewport.zoom * factor);
    this.setViewport({ x: center.x - world.x * zoom, y: center.y - world.y * zoom, zoom });
  }
  /** Centers the viewport on a node, optionally selecting it. Returns false if the node does not exist. */
  focusNode(id: string, options: { zoom?: number; select?: boolean } = {}): boolean {
    const box = this.document.layout.nodes[id];
    if (!box) return false;
    const zoom = clampZoom(options.zoom ?? this.viewport.zoom);
    const w = this.element.clientWidth, h = this.element.clientHeight;
    const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
    this.setViewport({ x: w / 2 - cx * zoom, y: h / 2 - cy * zoom, zoom });
    if (options.select !== false) this.select({ kind: 'node', id });
    return true;
  }
  /** Fits all nodes, or only `ids` when given (e.g. search results or the selection), into view. */
  fit(padding = 72, ids?: Iterable<string>): void {
    const set = ids ? new Set(ids) : null;
    const boxes = Object.entries(this.document.layout.nodes).filter(([id]) => !set || set.has(id)).map(([, b]) => b);
    if (!boxes.length) { this.setViewport({ x: 0, y: 0, zoom: 1 }); return; }
    const x = Math.min(...boxes.map(n => n.x)), y = Math.min(...boxes.map(n => n.y));
    const width = Math.max(...boxes.map(n => n.x + n.width)) - x, height = Math.max(...boxes.map(n => n.y + n.height)) - y;
    const w = this.element.clientWidth, h = this.element.clientHeight;
    if (!w || !h) return;
    const zoom = Math.min(1.25, clampZoom(Math.min((w - 2 * padding) / width, (h - 2 * padding) / height)));
    this.setViewport({ x: (w - width * zoom) / 2 - x * zoom, y: (h - height * zoom) / 2 - y * zoom, zoom });
  }
  /** Fits the current multi-selection into view. No-op if nothing is selected. */
  fitSelection(padding = 72): void { if (this.selectedNodes.size) this.fit(padding, this.selectedNodes); }
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true; this.abort.abort(); this.observer.disconnect(); cancelAnimationFrame(this.frame);
    this.nodes.clear(); this.edges.clear(); this.edgeData.clear(); this.incident.clear(); this.element.remove();
  }

  private changed(): void { this.options.onChange?.(this.getDocument()); }
  private historyChanged(): void { this.options.onHistoryChange?.({ canUndo: !!this.undoStack.length, canRedo: !!this.redoStack.length }); }
  /** Installs a validated document as one history step. A rejected operation leaves document, selection and history untouched. */
  private apply(result: OperationResult): boolean {
    if (typeof result === 'string') return false;
    const before = this.getDocument();
    this.document = result; this.reconcile(); this.commit(before);
    return true;
  }
  private commit(before: DiagramDocument): void {
    if (JSON.stringify(before) === JSON.stringify(this.document)) return;
    this.undoStack.push(before); if (this.undoStack.length > 50) this.undoStack.shift();
    this.redoStack = []; this.historyChanged(); this.changed();
  }
  private travel(from: DiagramDocument[], to: DiagramDocument[]): void {
    this.cancelGesture();
    const previous = from.pop(); if (!previous) return;
    to.push(this.getDocument()); this.document = previous; this.select(null); this.reconcile(); this.historyChanged(); this.changed();
  }
  /** Compact boxes for currently-collapsed groups; computed before edges so rerouting sees them. */
  private computeCollapsedBoxes(): void {
    const bounds = groupBounds(this.document);
    for (const g of [...this.collapsed]) if (!bounds[g]) this.collapsed.delete(g);
    this.collapsedBoxes.clear();
    for (const name of this.collapsed) {
      const b = bounds[name]; if (!b) continue;
      // A collapsed group nested inside another collapsed group needs no box of its own.
      const outer = this.collapsedAncestor(name);
      if (outer && outer !== name) continue;
      this.collapsedBoxes.set(name, { x: b.x, y: b.y, width: Math.min(b.width, 240), height: 60 });
    }
  }
  private reconcile(): void {
    this.computeCollapsedBoxes();
    const nodeIds = new Set(this.document.graph.nodes.map(n => n.id));
    for (const [id, view] of this.nodes) if (!nodeIds.has(id)) { view.group.remove(); this.nodes.delete(id); }
    this.incident.clear();
    this.nodeData.clear();
    for (const node of this.document.graph.nodes) {
      this.nodeData.set(node.id, node);
      const box = this.document.layout.nodes[node.id];
      let view = this.nodes.get(node.id);
      if (!view) { view = createNodeView(node.id); this.nodes.set(node.id, view); this.nodeLayer.append(view.group); }
      updateNodeView(view, node, box, this.options.onNodeRender);
      view.group.style.display = this.collapsedAncestor(node.group) ? 'none' : '';
      this.incident.set(node.id, new Set());
    }
    const edgeIds = new Set(this.document.graph.edges.map(e => e.id));
    for (const [id, view] of this.edges) if (!edgeIds.has(id)) { view.group.remove(); this.edges.delete(id); }
    this.edgeData.clear();
    for (const edge of this.document.graph.edges) {
      this.edgeData.set(edge.id, edge);
      this.incident.get(edge.source)!.add(edge.id); this.incident.get(edge.target)!.add(edge.id);
      if (!this.edges.has(edge.id)) {
        const group = svg('g', { class: 'cd-edge', 'data-edge': edge.id, tabindex: 0, role: 'button' });
        const path = svg('path', { class: 'cd-edge-path', 'marker-end': `url(#${this.arrowId})` });
        const hit = svg('path', { class: 'cd-edge-hit' });
        const label = svg('text', { class: 'cd-edge-label', 'text-anchor': 'middle' });
        group.append(hit, path, label); this.edgeLayer.append(group); this.edges.set(edge.id, { group, path, hit, label });
      }
      this.renderEdge(edge.id);
    }
    for (const id of [...this.selectedNodes]) if (!nodeIds.has(id)) this.selectedNodes.delete(id);
    if (this.selection?.kind === 'node' && !this.selectedNodes.size) this.selection = null;
    if (this.selection?.kind === 'edge' && !edgeIds.has(this.selection.id)) this.selection = null;
    this.renderLanes();
    this.renderGroups();
    for (const id of [...this.highlighted]) if (!nodeIds.has(id) && !edgeIds.has(id)) this.highlighted.delete(id);
    this.applySelection();
    this.applyHighlight();
  }
  /** Draws a full-span band behind each swimlane. Lanes are presentation; membership lives in the graph. */
  private renderLanes(): void {
    const bands = laneBands(this.document, this.laneOrientation);
    const present = new Set(bands.map(b => b.lane));
    for (const [lane, view] of this.laneViews) if (!present.has(lane)) { view.group.remove(); this.laneViews.delete(lane); }
    for (const band of bands) {
      let view = this.laneViews.get(band.lane);
      if (!view) {
        const group = svg('g', { class: 'cd-lane' });
        const box = svg('rect', { class: 'cd-lane-box' });
        const label = svg('text', { class: 'cd-lane-label' });
        group.append(box, label); this.laneLayer.append(group); view = { group, box, label }; this.laneViews.set(band.lane, view);
      }
      view.label.textContent = band.lane;
      for (const [k, v] of [['x', band.x], ['y', band.y], ['width', band.width], ['height', band.height]] as const) view.box.setAttribute(k, String(v));
      view.label.setAttribute('x', String(band.x + 12)); view.label.setAttribute('y', String(band.y + 6));
    }
  }
  /** Assigns (or clears, with null) the swimlane of the given nodes. Validated and undoable. */
  setNodeLane(ids: Iterable<string>, lane: string | null): void {
    this.cancelGesture();
    const set = new Set(ids), candidate = this.getDocument();
    let changed = false;
    for (const n of candidate.graph.nodes) if (set.has(n.id)) {
      if (lane) { if (n.lane !== lane) { n.lane = lane; changed = true; } }
      else if (n.lane !== undefined) { delete n.lane; changed = true; }
    }
    if (changed) this.apply(parseDocument(candidate));
  }
  getLanes(): string[] { return [...new Set(this.document.graph.nodes.map(n => n.lane).filter((l): l is string => !!l))]; }
  /** On drop, reassigns a node's lane to whichever band now contains its center (excluding its own lane from the probe). Keeps the previous lane if dropped outside every band. */
  private reassignLaneOnDrop(id: string): void {
    if (!this.getLanes().length) return;
    const node = this.document.graph.nodes.find(n => n.id === id); if (!node) return;
    const box = this.document.layout.nodes[id], cx = box.x + box.width / 2, cy = box.y + box.height / 2;
    const previous = node.lane;
    delete node.lane;
    const band = laneBands(this.document, this.laneOrientation).find(b => cx >= b.x && cx <= b.x + b.width && cy >= b.y && cy <= b.y + b.height);
    node.lane = band ? band.lane : previous;
    if (node.lane !== previous) this.reconcile();
  }
  /** Draws a derived container box (with a draggable header) behind each named group of nodes. Groups are presentation only; membership lives in the graph. */
  private renderGroups(): void {
    const bounds = groupBounds(this.document);
    for (const [name, view] of this.groupViews) if (!bounds[name]) { view.box.remove(); view.controls.remove(); this.groupViews.delete(name); }
    for (const [name, b] of Object.entries(bounds)) {
      const ancestor = this.collapsedAncestor(name);
      const hiddenInside = !!ancestor && ancestor !== name;
      let view0 = this.groupViews.get(name);
      if (hiddenInside) { if (view0) { view0.box.style.display = 'none'; view0.controls.style.display = 'none'; } continue; }
      const collapsed = this.collapsed.has(name), members = this.membersOf(name).length;
      const draw = collapsed ? this.collapsedBoxes.get(name)! : b;
      let view = this.groupViews.get(name);
      if (!view) {
        const box = svg('rect', { class: 'cd-group-box', rx: 14 });
        const controls = svg('g', { class: 'cd-group' });
        const header = svg('rect', { class: 'cd-group-header', 'data-group': name, rx: 7 });
        const label = svg('text', { class: 'cd-group-label' });
        const caret = svg('text', { class: 'cd-group-caret' });
        const caretHit = svg('rect', { class: 'cd-group-caret-hit', 'data-group-toggle': name, width: 20, height: 20 });
        const count = svg('text', { class: 'cd-group-count' });
        controls.append(header, label, count, caret, caretHit); this.groupLayer.append(box); this.groupControlLayer.append(controls);
        view = { box, controls, header, label, caret, caretHit, count }; this.groupViews.set(name, view);
      }
      view.box.style.display = ''; view.controls.style.display = '';
      view.controls.classList.toggle('is-collapsed', collapsed);
      view.box.classList.toggle('is-collapsed', collapsed);
      view.label.textContent = name.split('/').at(-1)!;
      view.caret.textContent = collapsed ? '▸' : '▾';
      view.caret.setAttribute('data-group-toggle', name);
      view.count.textContent = collapsed ? `${members} nodos` : '';
      for (const [k, v] of [['x', draw.x], ['y', draw.y], ['width', draw.width], ['height', draw.height]] as const) view.box.setAttribute(k, String(v));
      for (const [k, v] of [['x', draw.x + 8], ['y', draw.y - 11], ['width', Math.max(52, Math.min(draw.width - 16, name.length * 7 + 36))], ['height', 18]] as const) view.header.setAttribute(k, String(v));
      view.label.setAttribute('x', String(draw.x + 15)); view.label.setAttribute('y', String(draw.y - 2));
      const caretX = draw.x + 8 + Math.max(52, Math.min(draw.width - 16, name.length * 7 + 36)) - 14;
      view.caret.setAttribute('x', String(caretX)); view.caret.setAttribute('y', String(draw.y - 2));
      view.caretHit.setAttribute('x', String(caretX - 8)); view.caretHit.setAttribute('y', String(draw.y - 12));
      view.count.setAttribute('x', String(draw.x + draw.width / 2)); view.count.setAttribute('y', String(draw.y + draw.height / 2 + 4));
    }
  }
  /** Collapses or expands a group (ephemeral view state): members hide and crossing edges reroute to the compact box. */
  setGroupCollapsed(name: string, collapsed: boolean): void {
    if (!this.membersOf(name).length) return;
    if (collapsed === this.collapsed.has(name)) return;
    this.cancelGesture();
    if (collapsed) this.collapsed.add(name); else this.collapsed.delete(name);
    if (this.collapsed.has(name)) for (const id of this.membersOf(name)) this.selectedNodes.delete(id);
    this.reconcile();
  }
  toggleGroupCollapsed(name: string): void { this.setGroupCollapsed(name, !this.collapsed.has(name)); }
  isGroupCollapsed(name: string): boolean { return this.collapsed.has(name); }
  private inGroup(nodeGroup: string | undefined, group: string): boolean { return nodeGroup === group || !!nodeGroup?.startsWith(group + '/'); }
  private membersOf(group: string): string[] { return this.document.graph.nodes.filter(n => this.inGroup(n.group, group)).map(n => n.id); }
  /** The outermost collapsed group a node path belongs to, or undefined. */
  private collapsedAncestor(group: string | undefined): string | undefined {
    if (!group) return undefined;
    const segs = group.split('/');
    for (let i = 1; i <= segs.length; i++) { const p = segs.slice(0, i).join('/'); if (this.collapsed.has(p)) return p; }
    return undefined;
  }
  /** Assigns (or clears, with null) the group of the given nodes. Validated and undoable. */
  setNodeGroup(ids: Iterable<string>, group: string | null): void {
    this.cancelGesture();
    const set = new Set(ids), candidate = this.getDocument();
    let changed = false;
    for (const n of candidate.graph.nodes) if (set.has(n.id)) {
      if (group) { if (n.group !== group) { n.group = group; changed = true; } }
      else if (n.group !== undefined) { delete n.group; changed = true; }
    }
    if (changed) this.apply(parseDocument(candidate));
  }
  getGroups(): string[] { return [...new Set(this.document.graph.nodes.map(n => n.group).filter((g): g is string => !!g))]; }
  /** The box an endpoint resolves to: its own node, or the collapsed container of its group. */
  private endpointBox(nodeId: string): { box: NodeLayout; collapsedGroup?: string } {
    const g = this.collapsedAncestor(this.nodeData.get(nodeId)?.group);
    if (g && this.collapsedBoxes.get(g)) return { box: this.collapsedBoxes.get(g)!, collapsedGroup: g };
    return { box: this.document.layout.nodes[nodeId] };
  }
  private renderEdge(id: string): void {
    const edge = this.edgeData.get(id), view = this.edges.get(id);
    if (!edge || !view) return;
    const route = this.document.layout.edges[id];
    const se = this.endpointBox(edge.source), te = this.endpointBox(edge.target);
    // Both ends inside the same collapsed group: the edge is internal and hidden.
    if (se.collapsedGroup && se.collapsedGroup === te.collapsedGroup) { view.group.style.display = 'none'; return; }
    view.group.style.display = '';
    let sp = route.sourcePort, tp = route.targetPort;
    if (se.collapsedGroup || te.collapsedGroup) { const dp = defaultPorts(se.box, te.box); sp = dp.sourcePort; tp = dp.targetPort; }
    const a = anchor(se.box, sp), b = anchor(te.box, tp);
    const d = connectionPath(a, b, sp, tp, this.style);
    view.path.setAttribute('d', d); view.hit.setAttribute('d', d);
    view.group.setAttribute('aria-label', `Conexión ${edge.source} a ${edge.target}`);
    for (const [position, marker] of [['start', route.startMarker ?? 'none'], ['end', route.endMarker ?? 'arrow']] as const) {
      view.path.setAttribute(`marker-${position}`, marker === 'none' ? 'none' : `url(#${this.arrowId}${marker === 'dot' ? '-dot' : ''})`);
    }
    view.path.setAttribute('stroke-dasharray', route.dashed ? '6 4' : 'none');
    view.label.textContent = edge.label ?? '';
    if (edge.label) this.placeLabel(view.label, view.path, route.labelPosition ?? 'middle', route.labelOffset ?? 11);
    if (this.selection?.kind === 'edge' && this.selection.id === id) this.updateHandles();
  }
  /** Places a label along the path at start/middle/end with a signed perpendicular offset. Geometry only; never stored in the graph. */
  private placeLabel(label: SVGTextElement, path: SVGPathElement, position: 'start' | 'middle' | 'end', offset: number): void {
    const total = path.getTotalLength();
    const at = total * (position === 'start' ? 0.2 : position === 'end' ? 0.8 : 0.5);
    const p = path.getPointAtLength(at), a = path.getPointAtLength(Math.max(0, at - 2)), b = path.getPointAtLength(Math.min(total, at + 2));
    let tx = b.x - a.x, ty = b.y - a.y; const len = Math.hypot(tx, ty) || 1; tx /= len; ty /= len;
    label.setAttribute('x', String(p.x + ty * offset)); label.setAttribute('y', String(p.y - tx * offset + 3));
  }
  /** Endpoint handles appear for a selected edge; a resize handle appears for a selected node. */
  private updateHandles(): void {
    const sel = this.readOnly ? null : this.selection;
    const edge = sel?.kind === 'edge' ? this.edgeData.get(sel.id) : undefined;
    const box = sel?.kind === 'node' && this.selectedNodes.size === 1 ? this.document.layout.nodes[sel.id] : undefined;
    this.handleLayer.setAttribute('visibility', edge || box ? 'visible' : 'hidden');
    for (const end of ['source', 'target'] as const) this.handles[end].setAttribute('visibility', edge ? 'visible' : 'hidden');
    this.resizeHandle.setAttribute('visibility', box ? 'visible' : 'hidden');
    if (edge) {
      const route = this.document.layout.edges[edge.id];
      this.placeHandle('source', anchor(this.document.layout.nodes[edge.source], route.sourcePort));
      this.placeHandle('target', anchor(this.document.layout.nodes[edge.target], route.targetPort));
    }
    if (box) { this.resizeHandle.setAttribute('x', String(box.x + box.width - 5.5)); this.resizeHandle.setAttribute('y', String(box.y + box.height - 5.5)); }
  }
  private placeHandle(end: 'source' | 'target', p: Point): void { this.handles[end].setAttribute('cx', String(p.x)); this.handles[end].setAttribute('cy', String(p.y)); }
  private updateViewport(): void {
    const { x, y, zoom } = this.viewport;
    this.world.setAttribute('transform', `translate(${x} ${y}) scale(${zoom})`);
    this.gridPattern.setAttribute('patternTransform', `translate(${x} ${y}) scale(${zoom})`);
    this.element.dataset.detail = detailLevel(zoom);
    this.options.onViewportChange?.(this.getViewport());
  }
  private local(e: PointerEvent | WheelEvent): Point { const box = this.canvas.getBoundingClientRect(); return { x: e.clientX - box.left, y: e.clientY - box.top }; }
  private toWorld(p: Point): Point { return { x: (p.x - this.viewport.x) / this.viewport.zoom, y: (p.y - this.viewport.y) / this.viewport.zoom }; }
  /** Drop validity for a gesture with one fixed end. Cycle membership is computed once per gesture, not per pointer move. */
  private dropPredicate(source: string | null, target: string | null, ignoreEdge?: string): DropPredicate {
    const policy = { ...this.policy, allowCycles: true }, context = { ignoreEdge, canConnect: this.options.canConnect };
    const fixed = (source ?? target)!;
    const cycles = this.policy.allowCycles === false ? reachable(this.document.graph, fixed, source ? 'in' : 'out', ignoreEdge) : null;
    return id => !cycles?.has(id) && checkConnection(this.document, source ?? id, target ?? id, policy, context) === null;
  }
  private pointerDown = (e: PointerEvent): void => {
    if (e.button !== 0 && e.button !== 1 || this.gesture) return;
    e.preventDefault(); this.element.focus({ preventScroll: true });
    const target = e.target as Element, nodeId = target.closest<SVGGElement>('[data-node]')?.dataset.node;
    const edgeId = target.closest<SVGGElement>('[data-edge]')?.dataset.edge;
    const handle = target.closest<SVGElement>('[data-handle]')?.dataset.handle as 'source' | 'target' | undefined;
    const resize = !!target.closest<SVGElement>('[data-resize]');
    const local = this.local(e), world = this.toWorld(local);
    // Native dblclick does not survive pointer capture, so double-clicks are detected here.
    const tapId = nodeId ?? edgeId;
    if (tapId && !handle && !resize && !this.space && !this.readOnly && e.button === 0 && this.tool !== 'pan') {
      if (this.lastTap && this.lastTap.id === tapId && e.timeStamp - this.lastTap.time < 350) {
        this.lastTap = null; if (!this.readOnly) { this.beginEdit(nodeId ? 'node' : 'edge', tapId); return; }
      }
      this.lastTap = { id: tapId, time: e.timeStamp };
    } else this.lastTap = null;
    const groupToggle = target.closest<SVGElement>('[data-group-toggle]')?.getAttribute('data-group-toggle') ?? undefined;
    const groupName = target.closest<SVGElement>('[data-group]')?.getAttribute('data-group') ?? undefined;
    if (groupToggle && e.button === 0 && !this.space) { this.toggleGroupCollapsed(groupToggle); return; }
    if (this.space || e.button === 1 || this.tool === 'pan') this.gesture = { kind: 'pan', pointer: local, origin: { ...this.viewport } };
    else if (groupName && e.button === 0 && !this.space && !this.readOnly) {
      const ids = this.membersOf(groupName);
      this.selectNodes(ids);
      const origins = new Map<string, Point>();
      for (const id of ids) { const b = this.document.layout.nodes[id]; origins.set(id, { x: b.x, y: b.y }); }
      this.gesture = { kind: 'group', ids, pointer: world, origins, before: this.getDocument() };
    }
    else if (resize && !this.readOnly && this.selection?.kind === 'node') {
      const box = this.document.layout.nodes[this.selection.id];
      this.gesture = { kind: 'resize', id: this.selection.id, pointer: world, origin: { width: box.width, height: box.height }, before: this.getDocument() };
    }
    else if (handle && !this.readOnly && this.selection?.kind === 'edge') {
      const edge = this.edgeData.get(this.selection.id)!, route = this.document.layout.edges[edge.id];
      const fixedId = handle === 'target' ? edge.source : edge.target, fixedPort = handle === 'target' ? route.sourcePort : route.targetPort;
      const valid = this.dropPredicate(handle === 'target' ? fixedId : null, handle === 'target' ? null : fixedId, edge.id);
      this.gesture = { kind: 'reconnect', edge: edge.id, end: handle, fixed: anchor(this.document.layout.nodes[fixedId], fixedPort), fixedPort, point: world, target: null, valid };
      this.edges.get(edge.id)?.group.classList.add('is-reconnecting');
      this.element.classList.add('is-connecting'); this.drawPreview();
    } else if (nodeId) {
      let port = target.getAttribute('data-port') as Port | null;
      if (this.tool === 'connect' && !port) port = ports.reduce((best, candidate) => {
        const a = anchor(this.document.layout.nodes[nodeId], best), b = anchor(this.document.layout.nodes[nodeId], candidate);
        return Math.hypot(world.x - a.x, world.y - a.y) < Math.hypot(world.x - b.x, world.y - b.y) ? best : candidate;
      });
      if (port && !this.readOnly) {
        this.select({ kind: 'node', id: nodeId });
        const valid = this.dropPredicate(nodeId, null), origin = port;
        this.gesture = { kind: 'connect', id: nodeId, port, point: world, target: null, valid: (id, candidate) => !(id === nodeId && candidate === origin) && valid(id, candidate) };
        this.element.classList.add('is-connecting'); this.drawPreview();
      } else if (e.shiftKey) {
        this.toggleNode(nodeId); // extend the multi-selection; no drag
      } else {
        const inGroup = this.selectedNodes.has(nodeId) && this.selectedNodes.size > 1;
        if (!inGroup) this.select({ kind: 'node', id: nodeId });
        if (this.readOnly) { /* selection only */ }
        else if (this.selectedNodes.size > 1) {
          const origins = new Map<string, Point>();
          for (const id of this.selectedNodes) { const b = this.document.layout.nodes[id]; origins.set(id, { x: b.x, y: b.y }); }
          this.gesture = { kind: 'group', ids: [...this.selectedNodes], pointer: world, origins, before: this.getDocument() };
        } else this.gesture = { kind: 'node', id: nodeId, pointer: world, origin: { ...this.document.layout.nodes[nodeId] }, before: this.getDocument() };
      }
    } else if (edgeId) this.select({ kind: 'edge', id: edgeId });
    else if (e.shiftKey && e.button === 0) {
      this.gesture = { kind: 'marquee', start: world, current: world, base: new Set(this.selectedNodes) };
      this.marquee.setAttribute('visibility', 'visible'); this.drawMarquee();
    }
    else { this.select(null); this.gesture = { kind: 'pan', pointer: local, origin: { ...this.viewport } }; }
    if (this.gesture) this.canvas.setPointerCapture(e.pointerId);
  };
  private pointerMove = (e: PointerEvent): void => {
    if (!this.gesture) return;
    this.pending = e;
    if (!this.frame) this.frame = requestAnimationFrame(this.flushMove);
  };
  private flushMove = (): void => {
    this.frame = 0;
    const e = this.pending, gesture = this.gesture; this.pending = null;
    if (!e || !gesture) return;
    const p = this.local(e), world = this.toWorld(p);
    if (gesture.kind === 'pan') this.setViewport({ ...this.viewport, x: gesture.origin.x + p.x - gesture.pointer.x, y: gesture.origin.y + p.y - gesture.pointer.y });
    if (gesture.kind === 'node') {
      const box = this.document.layout.nodes[gesture.id];
      box.x = gesture.origin.x + (world.x - gesture.pointer.x); box.y = gesture.origin.y + (world.y - gesture.pointer.y);
      const guide = this.snapNode(gesture.id, box);
      if (this.gridSnap > 0) { if (guide.vx === undefined) box.x = Math.round(box.x / this.gridSnap) * this.gridSnap; if (guide.hy === undefined) box.y = Math.round(box.y / this.gridSnap) * this.gridSnap; }
      this.drawGuides(guide);
      this.nodes.get(gesture.id)!.group.setAttribute('transform', `translate(${box.x} ${box.y})`);
      for (const id of this.incident.get(gesture.id)!) this.renderEdge(id);
      this.renderGroups(); this.renderLanes();
    }
    if (gesture.kind === 'resize') {
      const box = this.document.layout.nodes[gesture.id];
      box.width = Math.max(MIN_W, gesture.origin.width + (world.x - gesture.pointer.x));
      box.height = Math.max(MIN_H, gesture.origin.height + (world.y - gesture.pointer.y));
      if (this.gridSnap > 0) { box.width = Math.max(MIN_W, Math.round(box.width / this.gridSnap) * this.gridSnap); box.height = Math.max(MIN_H, Math.round(box.height / this.gridSnap) * this.gridSnap); }
      const node = this.nodeData.get(gesture.id)!;
      updateNodeView(this.nodes.get(gesture.id)!, node, box, this.options.onNodeRender);
      for (const id of this.incident.get(gesture.id)!) this.renderEdge(id);
      this.renderGroups(); this.renderLanes();
      this.updateHandles();
    }
    if (gesture.kind === 'group') {
      const dx = world.x - gesture.pointer.x, dy = world.y - gesture.pointer.y;
      for (const id of gesture.ids) {
        const box = this.document.layout.nodes[id], o = gesture.origins.get(id)!;
        box.x = o.x + dx; box.y = o.y + dy;
        if (this.gridSnap > 0) { box.x = Math.round(box.x / this.gridSnap) * this.gridSnap; box.y = Math.round(box.y / this.gridSnap) * this.gridSnap; }
        this.nodes.get(id)!.group.setAttribute('transform', `translate(${box.x} ${box.y})`);
      }
      this.computeCollapsedBoxes();
      const moved = new Set(gesture.ids);
      for (const [eid, edge] of this.edgeData) if (moved.has(edge.source) || moved.has(edge.target)) this.renderEdge(eid);
      this.renderGroups(); this.renderLanes();
      this.updateHandles();
    }
    if (gesture.kind === 'marquee') { gesture.current = world; this.drawMarquee(); }
    if (gesture.kind === 'connect' || gesture.kind === 'reconnect') {
      this.clearTarget();
      gesture.point = world;
      gesture.target = nearestPort(this.document, world, null, (this.options.snapRadius ?? 24) / this.viewport.zoom, gesture.valid);
      this.drawPreview();
    }
  };
  private clearTarget(): void {
    const gesture = this.gesture;
    if ((gesture?.kind !== 'connect' && gesture?.kind !== 'reconnect') || !gesture.target) return;
    const view = this.nodes.get(gesture.target.id);
    view?.group.classList.remove('is-target');
    view?.anchors.forEach(a => a.classList.remove('is-snap'));
  }
  private drawPreview(): void {
    const gesture = this.gesture; if (gesture?.kind !== 'connect' && gesture?.kind !== 'reconnect') return;
    const cursor = gesture.target?.point ?? gesture.point, cursorPort = gesture.target?.port;
    let d: string;
    if (gesture.kind === 'connect') d = connectionPath(anchor(this.document.layout.nodes[gesture.id], gesture.port), cursor, gesture.port, cursorPort ?? opposite[gesture.port], this.style);
    else if (gesture.end === 'target') d = connectionPath(gesture.fixed, cursor, gesture.fixedPort, cursorPort ?? opposite[gesture.fixedPort], this.style);
    else d = connectionPath(cursor, gesture.fixed, cursorPort ?? opposite[gesture.fixedPort], gesture.fixedPort, this.style);
    if (gesture.kind === 'reconnect') this.placeHandle(gesture.end, cursor);
    this.preview.setAttribute('visibility', 'visible');
    this.preview.setAttribute('d', d);
    if (gesture.target) {
      const view = this.nodes.get(gesture.target.id)!;
      view.group.classList.add('is-target'); view.anchors[ports.indexOf(gesture.target.port)].classList.add('is-snap');
    }
  }
  /** Snaps the moving box to other nodes' edges/centers within a screen-space threshold, returning guide spans to draw. */
  private snapNode(id: string, box: NodeLayout): { vx?: number; vy0?: number; vy1?: number; hy?: number; hx0?: number; hx1?: number } {
    const thr = 6 / this.viewport.zoom;
    const mx = [box.x, box.x + box.width / 2, box.x + box.width], my = [box.y, box.y + box.height / 2, box.y + box.height];
    let bx: { d: number; pos: number; o: NodeLayout } | null = null, by: { d: number; pos: number; o: NodeLayout } | null = null;
    for (const node of this.document.graph.nodes) {
      if (node.id === id) continue;
      const o = this.document.layout.nodes[node.id];
      const sx = [o.x, o.x + o.width / 2, o.x + o.width], sy = [o.y, o.y + o.height / 2, o.y + o.height];
      for (const m of mx) for (const t of sx) { const d = t - m; if (Math.abs(d) <= thr && (!bx || Math.abs(d) < Math.abs(bx.d))) bx = { d, pos: t, o }; }
      for (const m of my) for (const t of sy) { const d = t - m; if (Math.abs(d) <= thr && (!by || Math.abs(d) < Math.abs(by.d))) by = { d, pos: t, o }; }
    }
    if (bx) box.x += bx.d;
    if (by) box.y += by.d;
    const guide: { vx?: number; vy0?: number; vy1?: number; hy?: number; hx0?: number; hx1?: number } = {};
    if (bx) { guide.vx = bx.pos; guide.vy0 = Math.min(box.y, bx.o.y); guide.vy1 = Math.max(box.y + box.height, bx.o.y + bx.o.height); }
    if (by) { guide.hy = by.pos; guide.hx0 = Math.min(box.x, by.o.x); guide.hx1 = Math.max(box.x + box.width, by.o.x + by.o.width); }
    return guide;
  }
  private drawGuides(g: { vx?: number; vy0?: number; vy1?: number; hy?: number; hx0?: number; hx1?: number }): void {
    if (g.vx !== undefined) { for (const [k, v] of [['x1', g.vx], ['x2', g.vx], ['y1', g.vy0!], ['y2', g.vy1!]] as const) this.guideV.setAttribute(k, String(v)); this.guideV.setAttribute('visibility', 'visible'); }
    else this.guideV.setAttribute('visibility', 'hidden');
    if (g.hy !== undefined) { for (const [k, v] of [['x1', g.hx0!], ['x2', g.hx1!], ['y1', g.hy], ['y2', g.hy]] as const) this.guideH.setAttribute(k, String(v)); this.guideH.setAttribute('visibility', 'visible'); }
    else this.guideH.setAttribute('visibility', 'hidden');
  }
  private hideGuides(): void { this.guideV.setAttribute('visibility', 'hidden'); this.guideH.setAttribute('visibility', 'hidden'); }
  private drawMarquee(): void {
    const g = this.gesture; if (g?.kind !== 'marquee') return;
    const x = Math.min(g.start.x, g.current.x), y = Math.min(g.start.y, g.current.y);
    this.marquee.setAttribute('x', String(x)); this.marquee.setAttribute('y', String(y));
    this.marquee.setAttribute('width', String(Math.abs(g.current.x - g.start.x))); this.marquee.setAttribute('height', String(Math.abs(g.current.y - g.start.y)));
  }
  private enclosedNodes(a: Point, b: Point): string[] {
    const x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x), y0 = Math.min(a.y, b.y), y1 = Math.max(a.y, b.y);
    return this.document.graph.nodes.filter(n => { const box = this.document.layout.nodes[n.id]; return box.x < x1 && box.x + box.width > x0 && box.y < y1 && box.y + box.height > y0; }).map(n => n.id);
  }
  private endGesture(): Gesture | null {
    cancelAnimationFrame(this.frame); this.frame = 0; this.pending = null;
    this.clearTarget();
    const gesture = this.gesture; this.gesture = null;
    if (gesture?.kind === 'reconnect') this.edges.get(gesture.edge)?.group.classList.remove('is-reconnecting');
    if (gesture?.kind === 'marquee') this.marquee.setAttribute('visibility', 'hidden');
    this.hideGuides();
    this.preview.setAttribute('visibility', 'hidden'); this.element.classList.remove('is-connecting');
    return gesture;
  }
  private pointerUp = (e: PointerEvent): void => {
    if (!this.gesture) return;
    this.pending = e; cancelAnimationFrame(this.frame); this.flushMove();
    const gesture = this.endGesture()!;
    if (this.canvas.hasPointerCapture(e.pointerId)) this.canvas.releasePointerCapture(e.pointerId);
    if (gesture.kind === 'node') this.reassignLaneOnDrop(gesture.id);
    if (gesture.kind === 'node' || gesture.kind === 'resize' || gesture.kind === 'group') this.commit(gesture.before);
    if (gesture.kind === 'marquee') this.selectNodes(new Set([...gesture.base, ...this.enclosedNodes(gesture.start, gesture.current)]));
    if (gesture.kind === 'connect' && gesture.target) {
      const id = this.connect(gesture.id, gesture.target.id, { sourcePort: gesture.port, targetPort: gesture.target.port });
      if (id) this.select({ kind: 'edge', id });
    }
    if (gesture.kind === 'reconnect') {
      const drop = gesture.target;
      if (drop) this.reconnectEdge(gesture.edge, gesture.end === 'target' ? { target: drop.id, targetPort: drop.port } : { source: drop.id, sourcePort: drop.port });
      this.updateHandles();
    }
  };
  private cancelGesture = (): void => {
    const gesture = this.endGesture();
    if (gesture?.kind === 'node' || gesture?.kind === 'resize' || gesture?.kind === 'group') { this.document = gesture.before; this.reconcile(); }
    if (gesture?.kind === 'reconnect') this.updateHandles();
  };
  private resetInteraction = (): void => { this.space = false; this.element.classList.remove('is-panning'); this.cancelGesture(); };
  private wheel = (e: WheelEvent): void => {
    e.preventDefault(); if (this.gesture) return;
    const scale = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? this.element.clientHeight : 1;
    if (e.ctrlKey || e.metaKey) this.zoomBy(Math.exp(-e.deltaY * scale * 0.006), this.local(e));
    else this.setViewport({ ...this.viewport, x: this.viewport.x - e.deltaX * scale, y: this.viewport.y - e.deltaY * scale });
  };
  private keyDown = (e: KeyboardEvent): void => {
    if (e.code === 'Space') { e.preventDefault(); this.space = true; this.element.classList.add('is-panning'); return; }
    if (e.key === 'Escape') { this.cancelGesture(); this.select(null); return; }
    if (e.altKey && e.key.startsWith('Arrow')) {
      e.preventDefault();
      const from = this.selection?.kind === 'node' ? this.selection.id : null;
      const next = this.nearestNodeInDirection(from, e.key.slice(5).toLowerCase());
      if (next) this.focusNode(next);
      return;
    }
    if (this.readOnly) {
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); return; }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'c' && this.selectedNodes.size) { e.preventDefault(); this.copySelection(); return; }
      if (e.key === 'Enter' || e.key === ' ') {
        const t = e.target as Element, n = t.closest<SVGGElement>('[data-node]')?.dataset.node, ed = t.closest<SVGGElement>('[data-edge]')?.dataset.edge;
        if (n || ed) { e.preventDefault(); this.select({ kind: n ? 'node' : 'edge', id: (n ?? ed)! }); }
      }
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? this.redo() : this.undo(); return; }
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey) {
      const key = e.key.toLowerCase();
      if (key === 'a') { e.preventDefault(); this.selectNodes(this.document.graph.nodes.map(n => n.id)); return; }
      if (key === 'c' && this.selectedNodes.size) { e.preventDefault(); this.copySelection(); return; }
      if (key === 'x' && this.selectedNodes.size) { e.preventDefault(); this.cut(); return; }
      if (key === 'v' && this.clipboard) { e.preventDefault(); this.paste(); return; }
    }
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); this.removeSelected(); return; }
    if (e.key === 'Enter' || e.key === ' ') {
      const target = e.target as Element, node = target.closest<SVGGElement>('[data-node]')?.dataset.node, edge = target.closest<SVGGElement>('[data-edge]')?.dataset.edge;
      if (node || edge) { e.preventDefault(); this.select({ kind: node ? 'node' : 'edge', id: (node ?? edge)! }); }
    }
    if (e.key.startsWith('Arrow') && this.selection?.kind === 'node') {
      e.preventDefault(); this.cancelGesture(); const before = this.getDocument(), box = this.document.layout.nodes[this.selection.id], step = e.shiftKey ? 1 : 8;
      if (e.key === 'ArrowLeft') box.x -= step; if (e.key === 'ArrowRight') box.x += step;
      if (e.key === 'ArrowUp') box.y -= step; if (e.key === 'ArrowDown') box.y += step;
      this.reconcile(); this.commit(before);
    }
  };
  /** Nearest node to `fromId` in a cardinal direction (keyboard navigation). With no origin, picks the
   * top-left node. Scores by distance along the direction plus a penalty for perpendicular offset. */
  private nearestNodeInDirection(fromId: string | null, dir: string): string | null {
    const ids = this.document.graph.nodes.map(n => n.id).filter(id => this.document.layout.nodes[id]);
    if (!ids.length) return null;
    const center = (id: string) => { const b = this.document.layout.nodes[id]; return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
    if (!fromId || !this.document.layout.nodes[fromId]) return ids.reduce((best, id) => { const c = center(id), b = center(best); return c.y < b.y || (c.y === b.y && c.x < b.x) ? id : best; }, ids[0]);
    const from = center(fromId), dx = dir === 'left' ? -1 : dir === 'right' ? 1 : 0, dy = dir === 'up' ? -1 : dir === 'down' ? 1 : 0;
    let best: string | null = null, bestScore = Infinity;
    for (const id of ids) {
      if (id === fromId) continue;
      const c = center(id), along = (c.x - from.x) * dx + (c.y - from.y) * dy;
      if (along <= 0) continue;
      const score = along + Math.abs(dx ? c.y - from.y : c.x - from.x) * 2;
      if (score < bestScore) { bestScore = score; best = id; }
    }
    return best;
  }
  /** Positions the shared HTML input over the element in screen space. Editing is modal: other gestures are cancelled first. */
  private beginEdit(kind: 'node' | 'edge', id: string): void {
    this.cancelGesture();
    this.commitEdit();
    this.select({ kind, id });
    const { zoom, x: vx, y: vy } = this.viewport;
    if (kind === 'node') {
      const node = this.document.graph.nodes.find(n => n.id === id)!, box = this.document.layout.nodes[id];
      const compact = (box.shape ?? 'rectangle') !== 'rectangle';
      const worldX = box.x + (compact ? box.width * 0.12 : 50), worldW = compact ? box.width * 0.76 : box.width - 62;
      const worldY = box.y + (compact ? box.height / 2 - 13 : 20);
      this.placeInput(worldX * zoom + vx, worldY * zoom + vy, worldW * zoom, zoom, compact);
      this.input.value = node.title;
    } else {
      const edge = this.edgeData.get(id)!, view = this.edges.get(id)!;
      const mid = view.path.getPointAtLength(view.path.getTotalLength() / 2);
      const worldW = Math.max(90, this.document.layout.nodes[edge.source].width * 0.7);
      this.placeInput((mid.x - worldW / 2) * zoom + vx, (mid.y - 16) * zoom + vy, worldW * zoom, zoom, true);
      this.input.value = edge.label ?? '';
      this.input.placeholder = 'Etiqueta';
    }
    this.edit = { kind, id };
    this.input.style.display = 'block';
    this.input.focus(); this.input.select();
  }
  private placeInput(left: number, top: number, width: number, zoom: number, centered: boolean): void {
    const style = this.input.style;
    style.left = `${left}px`; style.top = `${top}px`; style.width = `${Math.max(60, width)}px`;
    style.fontSize = `${Math.max(9, 13 * zoom)}px`; style.textAlign = centered ? 'center' : 'left';
  }
  private commitEdit = (): void => {
    const edit = this.edit; this.edit = null;
    this.input.style.display = 'none';
    if (!edit) return;
    const value = this.input.value;
    if (edit.kind === 'node') this.updateNode(edit.id, { title: value.trim() || 'Sin título' });
    else this.updateEdge(edit.id, { label: value.trim() });
  };
  private inputKey = (e: KeyboardEvent): void => {
    e.stopPropagation();
    if (e.key === 'Enter') { e.preventDefault(); this.input.blur(); }
    else if (e.key === 'Escape') { e.preventDefault(); this.edit = null; this.input.style.display = 'none'; this.element.focus({ preventScroll: true }); }
  };
  private keyUp = (e: KeyboardEvent): void => { if (e.code === 'Space') { this.space = false; this.element.classList.remove('is-panning'); } };
}
export function createDiagram(host: HTMLElement, options: DiagramOptions): DiagramEditor { return new DiagramEditor(host, options); }
