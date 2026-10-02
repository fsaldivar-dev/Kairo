import type { DetailLevel, DiagramTheme } from './types';

export const lightTheme: DiagramTheme = {
  nodeBackground: '#ffffff', nodeBorder: '#dfe2e8', nodeText: '#262937', nodeSecondaryText: '#858997',
  nodeHoverBorder: '#b2b4c4', selectedBorder: '#8474c1', selectedBackground: '#fcfaff',
  edge: '#b4b7c5', edgeSelected: '#8976c4', edgeHover: '#7b718f',
  canvasBackground: '#f8f9fb', grid: '#dedfe8', iconBackground: '#f3f1f8', icon: '#8a7d9f',
  radius: 12, borderWidth: 1, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};
export const darkTheme: DiagramTheme = {
  ...lightTheme, nodeBackground: '#24252e', nodeBorder: '#3b3d49', nodeText: '#eae9f2', nodeSecondaryText: '#a4a3b5',
  nodeHoverBorder: '#6d6981', selectedBorder: '#ad97e1', selectedBackground: '#2d293a',
  edge: '#67667d', edgeSelected: '#b69de9', edgeHover: '#a49cbe', canvasBackground: '#1b1c23',
  grid: '#373743', iconBackground: '#34303f', icon: '#b6a4d1',
};
export function detailLevel(zoom: number): DetailLevel { return zoom < 0.55 ? 'low' : zoom < 1.15 ? 'medium' : 'high'; }
/** CSS variables can also be inherited directly from the host application. */
export function applyTheme(element: HTMLElement, theme: Partial<DiagramTheme>): void {
  for (const [key, value] of Object.entries(theme)) {
    if (value === undefined) continue;
    const name = key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
    element.style.setProperty(`--cd-${name}`, typeof value === 'number' ? `${value}px` : value);
  }
}
