import { createDocument, type DiagramDocument } from '@fsaldivar.dev/diagram';

export function labelsDocument(): DiagramDocument {
  return createDocument({ nodes: [
    { id: 'request', type: 'service', title: 'Recibir solicitud y verificar los datos del cliente', source: 'src/solicitudes.ts', tags: ['título largo', 'redimensionable'] },
    { id: 'review', type: 'decision', title: '¿Cumple todos los requisitos?', tags: ['decisión'] },
    { id: 'report', type: 'file', title: 'Preparar informe\npara el equipo', tags: ['salto explícito'] },
    { id: 'archive', type: 'database', title: 'Almacenar historial de solicitudes' },
    { id: 'notify', type: 'process', title: 'Notificar al cliente cuando su solicitud esté lista para revisión', source: 'src/notificaciones.ts', tags: ['referencia'] },
    { id: 'international', type: 'generic', title: 'Equipo internacional 👩🏽‍💻\n日本語 · Español', tags: ['Unicode'] },
  ], edges: [
    { id: 'check', source: 'request', target: 'review', label: 'validar' },
    { id: 'yes', source: 'review', target: 'report', label: 'Sí' },
    { id: 'save', source: 'report', target: 'archive', label: 'guardar' },
    { id: 'message', source: 'archive', target: 'notify', label: 'confirmar' },
  ] }, { nodes: {
    request: { x: 60, y: 60, width: 270, height: 150 },
    review: { x: 435, y: 45, width: 280, height: 180, shape: 'diamond' },
    report: { x: 815, y: 60, width: 260, height: 155, shape: 'document' },
    archive: { x: 815, y: 340, width: 260, height: 150, shape: 'cylinder' },
    notify: { x: 435, y: 340, width: 280, height: 150 },
    international: { x: 60, y: 340, width: 280, height: 160, shape: 'note' },
  }, edges: {
    check: { sourcePort: 'right', targetPort: 'left' }, yes: { sourcePort: 'right', targetPort: 'left' },
    save: { sourcePort: 'bottom', targetPort: 'top' }, message: { sourcePort: 'left', targetPort: 'right' },
  } }, 'architecture');
}
