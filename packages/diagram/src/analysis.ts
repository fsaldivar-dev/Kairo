// Opt-in structural analysis, kept out of the core editor bundle.
export { validateFlow, describeDiagram, diffDocuments, describeDiff, analyzeGraph, lintDocument, healthCheck } from './flow';
export type { FlowDiagnostic, FlowDiagnosticCode, FlowValidationOptions, HealthResult, HealthDiagnostic } from './flow';
export { findOverlaps, countCrossings, lintArchitecture, layoutMetrics } from './flow';
export type { LayoutMetrics } from './flow';
export type { ArchitectureDiagnostic, ArchitectureDiagnosticCode } from './flow';
export type { OverlapOptions } from './flow';
export { shortestPath, longestPath, pathEdges, topologicalOrder, stronglyConnectedComponents, connectedComponents, hasCycle, degrees, centralNodes, allPaths, neighbors, redundantEdges, articulationPoints, bridges, criticalElements, betweennessCentrality, brokerNodes, communities, distanceStats, greedyColoring, pageRank, influentialNodes, findCycle, topologicalGenerations, transitiveClosure, ancestors, descendants, clusteringCoefficient, cyclomaticComplexity, feedbackArcSet, dominators, dominatorChain, coreness, graphProperties, closenessCentrality, closestNodes, eccentricity, graphCenter, endpoints, diameterPath, edgeBetweenness, bottleneckEdges, suggestLinks, harmonicCentrality, topHarmonic, criticalPathMethod, reciprocity, transitivity, minCut, modularity, eulerianTrail, fragmentation, topFragmenters, reachabilityMatrix, assortativity, matchNodes, graphFingerprint, cycles, eigenvectorCentrality, influentialByEigenvector, twoEdgeConnectedComponents, largestRobustCluster, kShortestPaths, jaccardSimilarity, similarNodes } from './algorithms';
export type { NodeDegree, NodeScore, DistanceStats, GraphColoring, PageRankOptions, ClusteringResult, AllPathsOptions, NeighborsOptions, CyclomaticResult, GraphProperties, GraphCenter, Endpoints, EdgeScore, LinkSuggestion, SuggestLinksOptions, CpmResult, CpmNode, CpmOptions, MinCutResult, EulerianResult, FragmentationScore, ReachabilityMatrix, NodeQuery, EigenvectorOptions } from './algorithms';
export { toReport, graphReport, toProcedure, toGantt, toPie, toQuadrant, toScheduleCsv, toStatsCard, toReportPage, toReachabilityCsv, toSankey, toMermaidTimeline } from './report';
export type { GraphReport } from './report';
export type { ProcedureOptions, GanttOptions, PieOptions, QuadrantOptions, QuadrantMetric, ScheduleCsvOptions, StatsCardOptions, ReportPageOptions } from './report';
export type { ReportOptions } from './report';
