import type { DiagramDocument, SemanticGraph } from './types';
import { createDocument } from './document';
import { autoLayout } from './layout';
import { defaultPorts } from './geometry';

/** Ready-made starter diagrams. Each is a function returning a fresh, validated document, so callers
 * can mutate the result freely. Scaffold a diagram in one call instead of starting from a blank canvas. */

const laidOut = (graph: SemanticGraph, direction: 'TB' | 'LR', profile?: string): DiagramDocument =>
  autoLayout(createDocument(graph, undefined, profile), { direction });

/** A minimal linear flow: start → step → end. */
export function emptyFlow(): DiagramDocument {
  return laidOut({
    nodes: [{ id: 'start', type: 'start', title: 'Inicio' }, { id: 'step', type: 'process', title: 'Paso' }, { id: 'end', type: 'end', title: 'Fin' }],
    edges: [{ id: 'e1', source: 'start', target: 'step' }, { id: 'e2', source: 'step', target: 'end' }],
  }, 'TB', 'flow');
}
/** A decision flow with two labelled branches that rejoin at the end. */
export function decision(): DiagramDocument {
  return laidOut({
    nodes: [
      { id: 'start', type: 'start', title: 'Inicio' }, { id: 'check', type: 'decision', title: '¿Decisión?' },
      { id: 'yes', type: 'process', title: 'Opción A' }, { id: 'no', type: 'process', title: 'Opción B' }, { id: 'done', type: 'end', title: 'Fin' },
    ],
    edges: [
      { id: 'e1', source: 'start', target: 'check' }, { id: 'e2', source: 'check', target: 'yes', label: 'Sí' },
      { id: 'e3', source: 'check', target: 'no', label: 'No' }, { id: 'e4', source: 'yes', target: 'done' }, { id: 'e5', source: 'no', target: 'done' },
    ],
  }, 'TB', 'flow');
}
/** A layered software architecture: client → API → service → database. */
export function architecture(): DiagramDocument {
  return laidOut({
    nodes: [
      { id: 'ui', type: 'screen', title: 'Cliente' }, { id: 'api', type: 'api', title: 'API' },
      { id: 'svc', type: 'service', title: 'Servicio' }, { id: 'db', type: 'database', title: 'Base de datos' },
    ],
    edges: [{ id: 'e1', source: 'ui', target: 'api' }, { id: 'e2', source: 'api', target: 'svc' }, { id: 'e3', source: 'svc', target: 'db' }],
  }, 'LR');
}
/** A central idea with four branches (mind-map style). */
export function mindmap(): DiagramDocument {
  return laidOut({
    nodes: [
      { id: 'root', type: 'process', title: 'Tema central' },
      { id: 'a', type: 'process', title: 'Rama 1' }, { id: 'b', type: 'process', title: 'Rama 2' },
      { id: 'c', type: 'process', title: 'Rama 3' }, { id: 'd', type: 'process', title: 'Rama 4' },
    ],
    edges: ['a', 'b', 'c', 'd'].map((t, i) => ({ id: 'e' + i, source: 'root', target: t })),
  }, 'TB');
}
/** A two-lane swimlane process (Cliente / Servidor), nodes tagged with their lane. */
export function swimlane(): DiagramDocument {
  const graph: SemanticGraph = {
    nodes: [
      { id: 'req', type: 'process', title: 'Solicitud', lane: 'Cliente' },
      { id: 'handle', type: 'process', title: 'Procesar', lane: 'Servidor' },
      { id: 'resp', type: 'process', title: 'Respuesta', lane: 'Cliente' },
    ],
    edges: [{ id: 'e1', source: 'req', target: 'handle' }, { id: 'e2', source: 'handle', target: 'resp' }],
  };
  // Columns per lane, rows following the flow, so the two lanes read side by side.
  const place: Record<string, { x: number; y: number }> = { req: { x: 80, y: 80 }, handle: { x: 420, y: 260 }, resp: { x: 80, y: 440 } };
  const layout: DiagramDocument['layout'] = { nodes: Object.create(null), edges: Object.create(null) };
  for (const n of graph.nodes) layout.nodes[n.id] = { ...place[n.id], width: 200, height: 92 };
  for (const e of graph.edges) layout.edges[e.id] = defaultPorts(layout.nodes[e.source], layout.nodes[e.target]);
  return createDocument(graph, layout);
}

/** Microservices behind a gateway, backed by their own stores and a message bus. */
export function microservices(): DiagramDocument {
  return laidOut({
    nodes: [
      { id: 'client', type: 'screen', title: 'Cliente' }, { id: 'gw', type: 'api', title: 'API Gateway' },
      { id: 'auth', type: 'service', title: 'Auth' }, { id: 'orders', type: 'service', title: 'Pedidos' }, { id: 'pay', type: 'service', title: 'Pagos' },
      { id: 'authdb', type: 'database', title: 'Auth DB' }, { id: 'ordersdb', type: 'database', title: 'Pedidos DB' }, { id: 'bus', type: 'module', title: 'Bus de eventos' },
    ],
    edges: [
      { id: 'e1', source: 'client', target: 'gw' }, { id: 'e2', source: 'gw', target: 'auth' }, { id: 'e3', source: 'gw', target: 'orders' }, { id: 'e4', source: 'gw', target: 'pay' },
      { id: 'e5', source: 'auth', target: 'authdb' }, { id: 'e6', source: 'orders', target: 'ordersdb' },
      { id: 'e7', source: 'orders', target: 'bus' }, { id: 'e8', source: 'pay', target: 'bus' },
    ],
  }, 'LR');
}
/** A CI/CD pipeline from commit to production, with a manual approval gate. */
export function cicdPipeline(): DiagramDocument {
  return laidOut({
    nodes: [
      { id: 'commit', type: 'start', title: 'Commit' }, { id: 'build', type: 'process', title: 'Build' }, { id: 'test', type: 'process', title: 'Pruebas' },
      { id: 'gate', type: 'decision', title: '¿Aprobar?' }, { id: 'staging', type: 'process', title: 'Staging' }, { id: 'prod', type: 'end', title: 'Producción' },
    ],
    edges: [
      { id: 'e1', source: 'commit', target: 'build' }, { id: 'e2', source: 'build', target: 'test' }, { id: 'e3', source: 'test', target: 'gate' },
      { id: 'e4', source: 'gate', target: 'staging', label: 'Sí' }, { id: 'e5', source: 'staging', target: 'prod' }, { id: 'e6', source: 'gate', target: 'build', label: 'No' },
    ],
  }, 'LR', 'flow');
}
/** A classic login/authentication flow with a retry loop. */
export function authFlow(): DiagramDocument {
  return laidOut({
    nodes: [
      { id: 'start', type: 'start', title: 'Inicio' }, { id: 'form', type: 'screen', title: 'Formulario' }, { id: 'verify', type: 'decision', title: '¿Credenciales válidas?' },
      { id: 'token', type: 'service', title: 'Emitir token' }, { id: 'home', type: 'end', title: 'Panel' }, { id: 'error', type: 'process', title: 'Mostrar error' },
    ],
    edges: [
      { id: 'e1', source: 'start', target: 'form' }, { id: 'e2', source: 'form', target: 'verify' },
      { id: 'e3', source: 'verify', target: 'token', label: 'Sí' }, { id: 'e4', source: 'token', target: 'home' },
      { id: 'e5', source: 'verify', target: 'error', label: 'No' }, { id: 'e6', source: 'error', target: 'form', label: 'Reintentar' },
    ],
  }, 'TB', 'flow');
}
/** A finite state machine (traffic-light style) with a cyclic transition. */
export function stateMachine(): DiagramDocument {
  return laidOut({
    nodes: [
      { id: 'idle', type: 'start', title: 'Inactivo' }, { id: 'loading', type: 'process', title: 'Cargando' },
      { id: 'ready', type: 'process', title: 'Listo' }, { id: 'error', type: 'process', title: 'Error' },
    ],
    edges: [
      { id: 'e1', source: 'idle', target: 'loading', label: 'fetch' }, { id: 'e2', source: 'loading', target: 'ready', label: 'ok' },
      { id: 'e3', source: 'loading', target: 'error', label: 'fallo' }, { id: 'e4', source: 'error', target: 'loading', label: 'reintentar' }, { id: 'e5', source: 'ready', target: 'idle', label: 'reiniciar' },
    ],
  }, 'LR', 'flow');
}

/** A Kubernetes request path: Ingress → Service → Deployment → Pods, with a database and config/secret. */
export function kubernetes(): DiagramDocument {
  return laidOut({
    nodes: [
      { id: 'ingress', type: 'api', title: 'Ingress' }, { id: 'svc', type: 'service', title: 'Service' }, { id: 'deploy', type: 'module', title: 'Deployment' },
      { id: 'pod1', type: 'component', title: 'Pod 1' }, { id: 'pod2', type: 'component', title: 'Pod 2' },
      { id: 'cfg', type: 'file', title: 'ConfigMap / Secret' }, { id: 'db', type: 'database', title: 'Base de datos' },
    ],
    edges: [
      { id: 'e1', source: 'ingress', target: 'svc' }, { id: 'e2', source: 'svc', target: 'deploy' },
      { id: 'e3', source: 'deploy', target: 'pod1' }, { id: 'e4', source: 'deploy', target: 'pod2' },
      { id: 'e5', source: 'pod1', target: 'db' }, { id: 'e6', source: 'pod2', target: 'db' },
      { id: 'e7', source: 'cfg', target: 'deploy', label: 'monta' },
    ],
  }, 'LR');
}
/** A data/ETL pipeline: sources → ingest → transform → warehouse → dashboard. */
export function dataPipeline(): DiagramDocument {
  return laidOut({
    nodes: [
      { id: 'src', type: 'external', title: 'Fuentes' }, { id: 'ingest', type: 'service', title: 'Ingesta' }, { id: 'lake', type: 'database', title: 'Data lake' },
      { id: 'transform', type: 'process', title: 'Transformar (ETL)' }, { id: 'warehouse', type: 'database', title: 'Almacén' }, { id: 'bi', type: 'screen', title: 'Dashboard BI' },
    ],
    edges: [
      { id: 'e1', source: 'src', target: 'ingest' }, { id: 'e2', source: 'ingest', target: 'lake' }, { id: 'e3', source: 'lake', target: 'transform' },
      { id: 'e4', source: 'transform', target: 'warehouse' }, { id: 'e5', source: 'warehouse', target: 'bi' },
    ],
  }, 'LR');
}
/** An incident-response runbook: alert → triage → severity branch → mitigate/monitor → postmortem. */
export function incidentResponse(): DiagramDocument {
  return laidOut({
    nodes: [
      { id: 'alert', type: 'start', title: 'Alerta' }, { id: 'triage', type: 'process', title: 'Triaje' }, { id: 'sev', type: 'decision', title: '¿Severidad alta?' },
      { id: 'page', type: 'process', title: 'Avisar de guardia' }, { id: 'mitigate', type: 'process', title: 'Mitigar' }, { id: 'monitor', type: 'process', title: 'Vigilar' },
      { id: 'postmortem', type: 'end', title: 'Postmortem' },
    ],
    edges: [
      { id: 'e1', source: 'alert', target: 'triage' }, { id: 'e2', source: 'triage', target: 'sev' },
      { id: 'e3', source: 'sev', target: 'page', label: 'Sí' }, { id: 'e4', source: 'page', target: 'mitigate' },
      { id: 'e5', source: 'sev', target: 'monitor', label: 'No' }, { id: 'e6', source: 'mitigate', target: 'postmortem' }, { id: 'e7', source: 'monitor', target: 'postmortem' },
    ],
  }, 'TB', 'flow');
}

/** All templates by name. */
export const templates = { emptyFlow, decision, architecture, mindmap, swimlane, microservices, cicdPipeline, authFlow, stateMachine, kubernetes, dataPipeline, incidentResponse } as const;
export type TemplateName = keyof typeof templates;
export const templateNames = Object.keys(templates) as TemplateName[];
/** Returns a fresh document for a template name, falling back to an empty flow for an unknown name. */
export function getTemplate(name: string): DiagramDocument { return (templates as Record<string, () => DiagramDocument>)[name]?.() ?? emptyFlow(); }
