import type { DiagramTheme } from './types';
import { lightTheme, darkTheme } from './theme';

/** Curated theme presets, each a full DiagramTheme ready for `createDiagram({ theme })` or `editor.setTheme()`.
 * Pure data; pass to the editor, to export helpers (toSVG/toPNG/toHtml) or apply with applyTheme. */

export const blueprint: DiagramTheme = {
  ...darkTheme, canvasBackground: '#0e2439', grid: '#1c3b57',
  nodeBackground: '#12304a', nodeBorder: '#2f5f86', nodeText: '#e7f1fb', nodeSecondaryText: '#9fc1dd',
  nodeHoverBorder: '#4d82b0', selectedBorder: '#59b0ff', selectedBackground: '#17395a',
  edge: '#4a7aa3', edgeSelected: '#6fc0ff', edgeHover: '#8fd0ff', iconBackground: '#16395a', icon: '#7fb6e6',
};
export const highContrast: DiagramTheme = {
  ...lightTheme, canvasBackground: '#ffffff', grid: '#c9c9c9',
  nodeBackground: '#ffffff', nodeBorder: '#000000', nodeText: '#000000', nodeSecondaryText: '#1f1f1f',
  nodeHoverBorder: '#000000', selectedBorder: '#0033cc', selectedBackground: '#e9edff',
  edge: '#000000', edgeSelected: '#0033cc', edgeHover: '#333333', iconBackground: '#eeeeee', icon: '#000000',
  borderWidth: 2, radius: 6,
};
export const forest: DiagramTheme = {
  ...lightTheme, canvasBackground: '#f3f7f0', grid: '#d7e4cf',
  nodeBackground: '#ffffff', nodeBorder: '#c2d6b4', nodeText: '#243123', nodeSecondaryText: '#5e7154',
  nodeHoverBorder: '#9bbd86', selectedBorder: '#4f9d57', selectedBackground: '#eef6ea',
  edge: '#9fb892', edgeSelected: '#4f9d57', edgeHover: '#6f8a62', iconBackground: '#e9f1e3', icon: '#5a8a4e',
};
export const solarized: DiagramTheme = {
  ...lightTheme, canvasBackground: '#fdf6e3', grid: '#eee8d5',
  nodeBackground: '#fefbf0', nodeBorder: '#e0dabf', nodeText: '#586e75', nodeSecondaryText: '#93a1a1',
  nodeHoverBorder: '#c9c196', selectedBorder: '#268bd2', selectedBackground: '#f5efdc',
  edge: '#b9b48f', edgeSelected: '#268bd2', edgeHover: '#2aa198', iconBackground: '#f3edd7', icon: '#b58900',
};
export const mono: DiagramTheme = {
  ...lightTheme, canvasBackground: '#fafafa', grid: '#e4e4e4',
  nodeBackground: '#ffffff', nodeBorder: '#d0d0d0', nodeText: '#1a1a1a', nodeSecondaryText: '#6b6b6b',
  nodeHoverBorder: '#a0a0a0', selectedBorder: '#555555', selectedBackground: '#f0f0f0',
  edge: '#b0b0b0', edgeSelected: '#555555', edgeHover: '#808080', iconBackground: '#f0f0f0', icon: '#555555',
};

/** All presets by name, including the core `light` and `dark`. */
export const themes = { light: lightTheme, dark: darkTheme, blueprint, highContrast, forest, solarized, mono } as const;
export type ThemeName = keyof typeof themes;
export const themeNames = Object.keys(themes) as ThemeName[];
/** Returns a preset by name, falling back to `light` for an unknown name. */
export function getTheme(name: string): DiagramTheme { return (themes as Record<string, DiagramTheme>)[name] ?? lightTheme; }
/** True when the environment prefers a dark color scheme. Safe to call outside the browser (returns false). */
export function prefersDark(): boolean {
  try { return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches; } catch { return false; }
}

const parseHex = (hex: string): [number, number, number] => {
  let h = hex.trim().replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const mix = (a: [number, number, number], b: [number, number, number], t: number): string => {
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * t));
  return '#' + c.map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');
};
export interface ThemeFromOptions { dark?: boolean; base?: DiagramTheme }
/** Derives a complete theme from a single brand/accent color. Neutral surfaces come from the light or
 * dark base; selection, edges and icons take the accent and tinted shades of it. Invalid hex falls back
 * to the default accent. Pure. */
export function themeFrom(accent: string, options: ThemeFromOptions = {}): DiagramTheme {
  const base = options.base ?? (options.dark ? darkTheme : lightTheme);
  const valid = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test((accent ?? '').trim());
  const a = valid ? accent.trim() : '#8474c1';
  const rgb = parseHex(a), bg = parseHex(base.nodeBackground), edge = parseHex(base.edge);
  return {
    ...base,
    selectedBorder: a,
    edgeSelected: a,
    icon: a,
    selectedBackground: mix(rgb, bg, options.dark ? 0.78 : 0.88),
    iconBackground: mix(rgb, bg, options.dark ? 0.82 : 0.9),
    edgeHover: mix(rgb, edge, 0.45),
  };
}

/** WCAG 2.x relative-luminance contrast ratio between two colours (1:1 … 21:1). Accepts #rgb/#rrggbb. Pure. */
export function contrastRatio(a: string, b: string): number {
  const lum = (hex: string): number => {
    const chan = parseHex(hex).map(v => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * chan[0] + 0.7152 * chan[1] + 0.0722 * chan[2];
  };
  const l1 = lum(a), l2 = lum(b), hi = Math.max(l1, l2), lo = Math.min(l1, l2);
  return +((hi + 0.05) / (lo + 0.05)).toFixed(2);
}

export interface ContrastPair { name: string; ratio: number; threshold: number; pass: boolean; graphical: boolean }
export interface ThemeAudit { pairs: ContrastPair[]; minRatio: number; passes: boolean }
/** Audits a theme's readability against WCAG: text pairs need 4.5:1 (AA), graphical pairs (borders, edges)
 * need 3:1. Returns each checked pair with its ratio and pass flag, the worst ratio, and whether all pass.
 * Pure — handy to validate a custom or brand-derived theme (see {@link themeFrom}) before shipping it. */
export function auditTheme(theme: DiagramTheme): ThemeAudit {
  const text = (name: string, fg: string, bg: string): ContrastPair => { const ratio = contrastRatio(fg, bg); return { name, ratio, threshold: 4.5, pass: ratio >= 4.5, graphical: false }; };
  const gfx = (name: string, fg: string, bg: string): ContrastPair => { const ratio = contrastRatio(fg, bg); return { name, ratio, threshold: 3, pass: ratio >= 3, graphical: true }; };
  const pairs: ContrastPair[] = [
    text('título / fondo de nodo', theme.nodeText, theme.nodeBackground),
    text('texto secundario / fondo de nodo', theme.nodeSecondaryText, theme.nodeBackground),
    text('icono / fondo de icono', theme.icon, theme.iconBackground),
    gfx('borde de nodo / lienzo', theme.nodeBorder, theme.canvasBackground),
    gfx('arista / lienzo', theme.edge, theme.canvasBackground),
  ];
  const minRatio = Math.min(...pairs.map(p => p.ratio));
  return { pairs, minRatio, passes: pairs.every(p => p.pass) };
}

export interface ThemeToCssOptions { selector?: string }
/** Emits a theme as a CSS rule of `--cd-*` custom properties (numbers become px). The static/SSR counterpart
 * to `applyTheme`: drop the string into a stylesheet or a design system instead of setting properties at
 * runtime. Default selector `:root`. Pure. */
export function themeToCss(theme: DiagramTheme, options: ThemeToCssOptions = {}): string {
  const lines = Object.entries(theme).map(([key, value]) => {
    const name = key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
    return `  --cd-${name}: ${typeof value === 'number' ? `${value}px` : value};`;
  });
  return `${options.selector ?? ':root'} {\n${lines.join('\n')}\n}`;
}
