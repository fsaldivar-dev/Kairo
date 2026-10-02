import type { SemanticGraph } from './types';

/** One step of a path animation: the nodes and edges highlighted so far (cumulative). */
export interface PathStep { nodes: string[]; edges: string[] }
export interface PathPlayerOptions { intervalMs?: number; loop?: boolean; onStep?: (index: number, step: PathStep | undefined) => void }
/** Minimal editor surface the player needs; `DiagramEditor` satisfies it. */
export interface HighlightTarget { setHighlight(ids: Iterable<string>): void; clearHighlight(): void }

/** Builds cumulative highlight steps by breadth-first traversal from start nodes (or the first node). Pure. */
export function flowSteps(graph: SemanticGraph): PathStep[] {
  const outgoing = new Map<string, string[]>();
  for (const e of graph.edges) (outgoing.get(e.source) ?? outgoing.set(e.source, []).get(e.source)!).push(e.target);
  const starts = graph.nodes.filter(n => n.type === 'start').map(n => n.id);
  const roots = starts.length ? starts : graph.nodes[0] ? [graph.nodes[0].id] : [];
  const order: string[] = [], seen = new Set(roots), queue = [...roots];
  while (queue.length) { const id = queue.shift()!; order.push(id); for (const t of outgoing.get(id) ?? []) if (!seen.has(t)) { seen.add(t); queue.push(t); } }
  for (const n of graph.nodes) if (!seen.has(n.id)) { seen.add(n.id); order.push(n.id); }
  const steps: PathStep[] = [], live = new Set<string>();
  for (const id of order) {
    live.add(id);
    const nodes = [...live], edges = graph.edges.filter(e => live.has(e.source) && live.has(e.target)).map(e => e.id);
    steps.push({ nodes, edges });
  }
  return steps;
}

/** Drives a cumulative path animation over a HighlightTarget. Timers only run while playing; stop clears the highlight. */
export class PathPlayer {
  private i = -1;
  private timer: ReturnType<typeof setInterval> | 0 = 0;
  constructor(private readonly target: HighlightTarget, private readonly steps: PathStep[], private readonly options: PathPlayerOptions = {}) {}
  get length(): number { return this.steps.length; }
  get index(): number { return this.i; }
  get playing(): boolean { return this.timer !== 0; }
  goTo(index: number): void {
    if (!this.steps.length) return;
    this.i = Math.max(0, Math.min(this.steps.length - 1, index));
    const step = this.steps[this.i];
    this.target.setHighlight([...step.nodes, ...step.edges]);
    this.options.onStep?.(this.i, step);
  }
  next(): void { if (this.i < this.steps.length - 1) this.goTo(this.i + 1); else if (this.options.loop) this.goTo(0); else this.pause(); }
  prev(): void { this.goTo(this.i - 1); }
  play(): void {
    if (this.timer || !this.steps.length) return;
    if (this.i < 0) this.goTo(0);
    this.timer = setInterval(() => this.next(), Math.max(50, this.options.intervalMs ?? 900));
  }
  pause(): void { if (this.timer) { clearInterval(this.timer); this.timer = 0; } }
  toggle(): void { this.playing ? this.pause() : this.play(); }
  stop(): void { this.pause(); this.i = -1; this.target.clearHighlight(); }
}
