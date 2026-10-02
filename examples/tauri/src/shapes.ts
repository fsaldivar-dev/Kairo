import { createDocument, nodeShapes, type DiagramDocument, type NodeShape, type NodeType } from '@fsaldivar.dev/diagram';

export const shapeLabels: Record<NodeShape, string> = {
  rectangle: 'Rectángulo', diamond: 'Rombo', ellipse: 'Elipse', pill: 'Cápsula',
  cylinder: 'Cilindro', document: 'Documento', parallelogram: 'Paralelogramo', hexagon: 'Hexágono',
  trapezoid: 'Trapecio', triangle: 'Triángulo', note: 'Nota', subprocess: 'Subproceso',
};
export function shapePreset(shape: NodeShape) {
  const type: NodeType = shape === 'cylinder' ? 'database' : shape === 'document' || shape === 'note' ? 'file' : shape === 'diamond' ? 'decision' : shape === 'subprocess' ? 'module' : 'generic';
  return { type, width: 220, height: shape === 'diamond' || shape === 'triangle' ? 140 : 110, shape };
}
export function shapesDocument(): DiagramDocument {
  const doc = createDocument({ nodes: nodeShapes.map(shape => ({ id: shape, type: shapePreset(shape).type, title: shapeLabels[shape] })),
    edges: nodeShapes.flatMap((shape, i) => i % 4 === 3 ? [] : [{ id: `shape-${i}`, source: shape, target: nodeShapes[i + 1] }]) }, undefined, 'architecture');
  nodeShapes.forEach((shape, i) => {
    const { type: _, ...box } = shapePreset(shape);
    doc.layout.nodes[shape] = { ...box, x: 40 + i % 4 * 310, y: 40 + Math.floor(i / 4) * 230 + (140 - box.height) / 2 };
  });
  for (const edge of doc.graph.edges) doc.layout.edges[edge.id] = { sourcePort: 'right', targetPort: 'left' };
  return doc;
}
