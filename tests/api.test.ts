import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as docMod from '../packages/diagram/src/document.ts';
import * as ops from '../packages/diagram/src/operations.ts';
import { createDiagram } from '../packages/diagram/src/editor.ts';
import * as io from '../packages/diagram/src/io.ts';
import * as layout from '../packages/diagram/src/layout-entry.ts';
import * as exporters from '../packages/diagram/src/export-entry.ts';
import * as analysis from '../packages/diagram/src/analysis.ts';
import * as themes from '../packages/diagram/src/themes-entry.ts';
import * as templates from '../packages/diagram/src/templates-entry.ts';

const hasAll = (mod: Record<string, unknown>, names: string[]) => {
  for (const n of names) assert.equal(typeof mod[n], 'function', `missing export: ${n}`);
};

test('core (@fsaldivar.dev/diagram) exposes its documented API', () => {
  assert.equal(typeof createDiagram, 'function');
  hasAll(docMod, ['createDocument', 'createLayout', 'parseDocument', 'safeParseDocument']);
  hasAll(ops, ['duplicateNode', 'alignNodes', 'distributeNodes', 'searchNodes', 'extractSelection', 'pasteClipboard']);
});
test('@fsaldivar.dev/diagram/io exposes importers/exporters for every format', () => {
  hasAll(io, [
    'parseMermaid', 'toMermaid', 'parseDotText', 'toDotText', 'parseD2', 'toD2', 'parseOutline', 'toOutline',
    'toCanvas', 'fromCanvas', 'fromCytoscape', 'toCytoscape', 'toExcalidraw', 'fromExcalidraw',
    'fromCsv', 'toCsv', 'toCsvNodes', 'fromGraphml', 'toGraphml', 'fromGexf', 'toGexf',
    'fromDrawio', 'toDrawio', 'parsePlantuml', 'toPlantuml', 'toMarkdown', 'fromMarkdown',
    'toReactFlow', 'fromReactFlow', 'toAdjacencyMatrix', 'toMatrixCsv', 'convertText', 'detectFormat', 'importAny',
    'encodeDocument', 'decodeDocument', 'toShareLink', 'fromShareLink',
  ]);
});
test('@fsaldivar.dev/diagram/layout exposes layouts and document transforms', () => {
  hasAll(layout, ['autoLayout', 'organicLayout', 'radialLayout', 'treeLayout', 'circularLayout', 'gridLayout', 'clusterLayout', 'fitNodeSizes', 'snapToGrid', 'subgraph', 'ego', 'collapseGroups', 'groupBy', 'documentBounds', 'normalizePositions', 'unionDocuments', 'mergeDocuments', 'resolveOverlaps']);
});
test('@fsaldivar.dev/diagram/export exposes renderers', () => {
  hasAll(exporters, ['toSVG', 'toPNG', 'toThumbnail', 'toHtml', 'toLegend', 'toTikz', 'toAscii', 'toSvgDataUri', 'toSvgPages', 'toDiffSvg', 'toHeatmapSvg']);
});
test('@fsaldivar.dev/diagram/analysis exposes validation, metrics and graph algorithms', () => {
  hasAll(analysis, [
    'validateFlow', 'lintDocument', 'lintArchitecture', 'describeDiagram', 'diffDocuments', 'describeDiff', 'analyzeGraph', 'toReport', 'graphReport',
    'shortestPath', 'longestPath', 'allPaths', 'topologicalOrder', 'topologicalGenerations', 'stronglyConnectedComponents', 'connectedComponents', 'hasCycle', 'findCycle',
    'degrees', 'centralNodes', 'betweennessCentrality', 'brokerNodes', 'pageRank', 'influentialNodes', 'communities', 'criticalElements', 'articulationPoints', 'bridges',
    'distanceStats', 'greedyColoring', 'transitiveClosure', 'ancestors', 'descendants', 'clusteringCoefficient',
  ]);
});
test('@fsaldivar.dev/diagram/themes and /templates expose their helpers', () => {
  hasAll(themes, ['getTheme', 'themeFrom', 'contrastRatio', 'auditTheme', 'themeToCss', 'prefersDark']);
  hasAll(templates, ['getTemplate', 'emptyFlow', 'decision', 'architecture', 'microservices', 'cicdPipeline', 'authFlow', 'stateMachine']);
});
