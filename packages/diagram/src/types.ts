/** Semantic data only. No positions, colors, SVG paths or selection state. */
export const nodeTypes = ['screen', 'service', 'database', 'api', 'external', 'class', 'module', 'file', 'folder', 'component', 'generic', 'start', 'process', 'decision', 'end'] as const;
export type NodeType = typeof nodeTypes[number];
export interface DiagramNode { id: string; type: NodeType; title: string; source?: string; tags?: string[]; group?: string; lane?: string }
export interface GroupBox { x: number; y: number; width: number; height: number; label: string }
export type LaneOrientation = 'columns' | 'rows';
export interface LaneBand { lane: string; x: number; y: number; width: number; height: number }
export interface DiagramEdge { id: string; source: string; target: string; label?: string; relation?: string; condition?: string; tags?: string[] }
export interface SemanticGraph { nodes: DiagramNode[]; edges: DiagramEdge[] }
export type Port = 'top' | 'right' | 'bottom' | 'left';
export type EdgeStyle = 'smooth' | 'rounded' | 'orthogonal';
export interface Point { x: number; y: number }
export const nodeShapes = ['rectangle', 'diamond', 'ellipse', 'pill', 'cylinder', 'document', 'parallelogram', 'hexagon', 'trapezoid', 'triangle', 'note', 'subprocess'] as const;
export type NodeShape = typeof nodeShapes[number];
export const arrowMarkers = ['none', 'arrow', 'dot'] as const;
export type ArrowMarker = typeof arrowMarkers[number];
export const labelPositions = ['start', 'middle', 'end'] as const;
export type LabelPosition = typeof labelPositions[number];
export interface NodeLayout extends Point { width: number; height: number; shape?: NodeShape }
export interface EdgeLayout { sourcePort: Port; targetPort: Port; startMarker?: ArrowMarker; endMarker?: ArrowMarker; dashed?: boolean; labelPosition?: LabelPosition; labelOffset?: number }
export interface DiagramLayout { nodes: Record<string, NodeLayout>; edges: Record<string, EdgeLayout> }
/** `profile` names the notation family (for example `flow`, `mindmap` or `hierarchy`); hosts map it to a connection policy and validators. */
export interface DiagramDocument { version: 2; graph: SemanticGraph; layout: DiagramLayout; profile?: string }
/** Editing rules of the active profile. Documents are never rejected by this policy; only new connections are. Defaults: no self-loops, one edge per direction, cycles allowed. */
export interface ConnectionPolicy { allowSelfLoops?: boolean; allowMultipleEdges?: boolean; allowCycles?: boolean }
export type ConnectionIssue = 'missing-node' | 'missing-edge' | 'self-loop' | 'duplicate' | 'cycle' | 'rejected';
export interface EdgeEndpoints { source?: string; target?: string; sourcePort?: Port; targetPort?: Port }
export interface Viewport extends Point { zoom: number }
export type DetailLevel = 'low' | 'medium' | 'high';
export type Selection = { kind: 'node' | 'edge'; id: string } | null;
export type Tool = 'select' | 'connect' | 'pan';
export interface DiagramTheme {
  nodeBackground: string; nodeBorder: string; nodeText: string; nodeSecondaryText: string;
  nodeHoverBorder: string; selectedBorder: string; selectedBackground: string;
  edge: string; edgeSelected: string; edgeHover: string; canvasBackground: string; grid: string;
  iconBackground: string; icon: string; radius: number; borderWidth: number;
  fontFamily: string;
}
export interface DiagramOptions {
  document: DiagramDocument;
  theme?: Partial<DiagramTheme>;
  edgeStyle?: EdgeStyle;
  grid?: boolean;
  /** Render swimlane bands for nodes that have a `lane`. Default: 'columns'. */
  lanes?: LaneOrientation;
  /** Start as a read-only viewer: pan/zoom/selection work, editing interactions are disabled. */
  readOnly?: boolean;
  /** Snap dragged/resized nodes to a grid of this many world units (0 = off). */
  gridSnap?: number;
  /** Screen pixels, independent of zoom. Default: 24. */
  snapRadius?: number;
  connections?: ConnectionPolicy;
  canConnect?: (source: DiagramNode, target: DiagramNode) => boolean;
  onChange?: (document: DiagramDocument) => void;
  /** Called after each node renders, including live resize, with a cleared node-local `<g>` and current layout. Do not mutate node/layout. */
  onNodeRender?: (node: DiagramNode, layer: SVGGElement, layout: Readonly<NodeLayout>) => void;
  /** Re-fit the diagram to the viewport whenever the container resizes (for responsive/embedded views). */
  autoFit?: boolean;
  onSelectionChange?: (selection: Selection) => void;
  onViewportChange?: (viewport: Viewport) => void;
  onHistoryChange?: (history: { canUndo: boolean; canRedo: boolean }) => void;
}
export interface NodeDefault { shape?: NodeShape; width: number; height: number }
/** Starting layout per node type when a node is created from scratch. Pure presentation; hosts may override via addNode. */
export const nodeDefaults: Record<NodeType, NodeDefault> = {
  screen: { width: 210, height: 92 }, service: { width: 210, height: 92 }, database: { shape: 'cylinder', width: 210, height: 110 },
  api: { width: 210, height: 92 }, external: { width: 210, height: 92 }, class: { width: 210, height: 92 },
  module: { width: 210, height: 92 }, file: { shape: 'document', width: 200, height: 110 }, folder: { width: 200, height: 92 },
  component: { width: 210, height: 92 }, generic: { width: 200, height: 92 },
  start: { shape: 'pill', width: 200, height: 80 }, end: { shape: 'pill', width: 200, height: 80 },
  process: { shape: 'rectangle', width: 210, height: 92 }, decision: { shape: 'diamond', width: 230, height: 140 },
};
export const ports: readonly Port[] = ['top', 'right', 'bottom', 'left'];
