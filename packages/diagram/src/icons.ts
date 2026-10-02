import type { NodeType } from './types';
/** All glyphs share a 20 × 20 viewBox. No icon runtime or external assets. */
export const nodeIcons: Record<NodeType, string> = {
  start: 'M6 3l10 7-10 7z', process: 'M3 4h14v12H3z', decision: 'M10 2l8 8-8 8-8-8z', end: 'M5 5h10v10H5z',
  screen: 'M3 4h14v11H3z M7 18h6 M10 15v3 M3 7h14',
  service: 'M10 2l7 8-7 8-7-8z M7 10h6',
  database: 'M4 5c0-4 12-4 12 0s-12 4-12 0v10c0 4 12 4 12 0V5 M4 10c0 4 12 4 12 0',
  api: 'M6 5l-4 5 4 5 M14 5l4 5-4 5 M12 3L8 17',
  external: 'M11 3h6v6 M17 3l-9 9 M8 4H3v13h13v-5',
  class: 'M7 3H5v5l-2 2 2 2v5h2 M13 3h2v5l2 2-2 2v5h-2',
  module: 'M3 3h6v6H3z M11 3h6v6h-6z M3 11h6v6H3z M11 11h6v6h-6z',
  file: 'M4 2h8l4 4v12H4z M12 2v5h4 M7 11h6 M7 14h4',
  folder: 'M2 5h6l2 2h8v10H2z M2 5V3h6l2 2h7v2',
  component: 'M10 2l4 4-4 4-4-4z M4 8l4 4-4 4-3-4z M16 8l3 4-3 4-4-4z M10 12l4 4-4 3-4-3z',
  generic: 'M4 4h12v12H4z',
};
export const nodeLabels: Record<NodeType, string> = {
  start: 'Inicio', process: 'Proceso', decision: 'Decisión', end: 'Fin',
  screen: 'Screen', service: 'Service', database: 'Database', api: 'API', external: 'External',
  class: 'Class', module: 'Module', file: 'File', folder: 'Folder', component: 'Component', generic: 'Node',
};
