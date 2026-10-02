import { createDocument, type DiagramDocument } from '@fsaldivar.dev/diagram';
export function sampleDocument(): DiagramDocument {
  return createDocument({
    nodes: [
      { id: 'login', type: 'screen', title: 'LoginView', source: 'Sources/Views/LoginView.swift' },
      { id: 'auth', type: 'service', title: 'AuthService', source: 'Sources/Auth/AuthService.swift' },
      { id: 'users', type: 'database', title: 'UserDatabase', source: 'Storage/Users.sqlite' },
      { id: 'dashboard', type: 'screen', title: 'DashboardView', source: 'Sources/Views/Dashboard.swift' },
      { id: 'session', type: 'module', title: 'SessionStore', source: 'Sources/Session/Store.swift' },
      { id: 'gateway', type: 'api', title: 'Gateway API', source: 'api.codaru.dev/v1' },
      { id: 'firebase', type: 'external', title: 'Firebase', source: 'Firebase Authentication' },
    ],
    edges: [
      { id: 'login-auth', source: 'login', target: 'auth', label: 'autentica' },
      { id: 'auth-users', source: 'auth', target: 'users', label: 'verifica' },
      { id: 'auth-session', source: 'auth', target: 'session', label: 'sesión' },
      { id: 'dashboard-session', source: 'dashboard', target: 'session', label: 'observa' },
      { id: 'session-gateway', source: 'session', target: 'gateway', label: 'solicita' },
      { id: 'gateway-firebase', source: 'gateway', target: 'firebase', label: 'OAuth 2.0' },
    ],
  }, {
    nodes: {
      login: { x: 60, y: 90, width: 210, height: 92 },
      auth: { x: 385, y: 90, width: 210, height: 92 },
      users: { x: 710, y: 150, width: 210, height: 92 },
      dashboard: { x: 60, y: 330, width: 210, height: 92 },
      session: { x: 385, y: 365, width: 210, height: 92 },
      gateway: { x: 710, y: 350, width: 210, height: 92 },
      firebase: { x: 710, y: 535, width: 210, height: 92 },
    },
    edges: {
      'login-auth': { sourcePort: 'right', targetPort: 'left' },
      'auth-users': { sourcePort: 'right', targetPort: 'left' },
      'auth-session': { sourcePort: 'bottom', targetPort: 'top' },
      'dashboard-session': { sourcePort: 'right', targetPort: 'left' },
      'session-gateway': { sourcePort: 'right', targetPort: 'left' },
      'gateway-firebase': { sourcePort: 'bottom', targetPort: 'top' },
    },
  }, 'architecture');
}

export function decisionDocument(): DiagramDocument {
  return createDocument({
    nodes: [
      { id: 'start', type: 'start', title: 'Solicitud', tags: ['acceso'] },
      { id: 'check', type: 'decision', title: '¿Autorizado?', tags: ['seguridad'] },
      { id: 'allow', type: 'process', title: 'Conceder acceso' },
      { id: 'deny', type: 'end', title: 'Rechazar acceso' },
      { id: 'done', type: 'end', title: 'Sesión iniciada' },
    ],
    edges: [
      { id: 'begin', source: 'start', target: 'check', relation: 'transición' },
      { id: 'yes', source: 'check', target: 'allow', label: 'Sí', relation: 'condición', condition: 'authorized', tags: ['permitido'] },
      { id: 'no', source: 'check', target: 'deny', label: 'No', relation: 'condición', condition: '!authorized' },
      { id: 'finish', source: 'allow', target: 'done', relation: 'transición' },
    ],
  }, {
    nodes: {
      start: { x: 320, y: 40, width: 220, height: 80, shape: 'pill' },
      check: { x: 310, y: 200, width: 240, height: 150, shape: 'diamond' },
      allow: { x: 80, y: 440, width: 220, height: 92, shape: 'rectangle' },
      deny: { x: 590, y: 430, width: 220, height: 100, shape: 'ellipse' },
      done: { x: 80, y: 630, width: 220, height: 80, shape: 'pill' },
    },
    edges: {
      begin: { sourcePort: 'bottom', targetPort: 'top' },
      yes: { sourcePort: 'left', targetPort: 'top' },
      no: { sourcePort: 'right', targetPort: 'top', dashed: true },
      finish: { sourcePort: 'bottom', targetPort: 'top', startMarker: 'dot' },
    },
  }, 'flow');
}
