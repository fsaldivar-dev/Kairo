import { test } from 'node:test';
import assert from 'node:assert/strict';
import { themes, themeNames, getTheme, blueprint, highContrast } from '../packages/diagram/src/themes.ts';
import { lightTheme } from '../packages/diagram/src/theme.ts';
import type { DiagramTheme } from '../packages/diagram/src/types.ts';

const REQUIRED: (keyof DiagramTheme)[] = [
  'nodeBackground', 'nodeBorder', 'nodeText', 'nodeSecondaryText', 'nodeHoverBorder', 'selectedBorder',
  'selectedBackground', 'edge', 'edgeSelected', 'edgeHover', 'canvasBackground', 'grid', 'iconBackground',
  'icon', 'radius', 'borderWidth', 'fontFamily',
];

test('every preset is a complete, well-typed DiagramTheme', () => {
  for (const name of themeNames) {
    const theme = themes[name];
    for (const key of REQUIRED) assert.ok(theme[key] !== undefined, `${name} missing ${key}`);
    for (const key of ['nodeBackground', 'edge', 'canvasBackground'] as const) assert.match(theme[key], /^#[0-9a-fA-F]{3,8}$/, `${name}.${key} not a hex color`);
    assert.equal(typeof theme.radius, 'number');
    assert.equal(typeof theme.borderWidth, 'number');
  }
});
test('themeNames includes the core and curated presets', () => {
  assert.ok(themeNames.includes('light'));
  assert.ok(themeNames.includes('dark'));
  assert.ok(themeNames.includes('blueprint'));
  assert.ok(themeNames.includes('highContrast'));
});
test('getTheme resolves by name and falls back to light for unknown', () => {
  assert.equal(getTheme('blueprint'), blueprint);
  assert.equal(getTheme('does-not-exist'), lightTheme);
});
test('high contrast uses a thicker border than the default', () => {
  assert.ok(highContrast.borderWidth > lightTheme.borderWidth);
});
test('presets are distinct from one another (no accidental duplicates)', () => {
  const backgrounds = themeNames.map(n => themes[n].canvasBackground);
  assert.equal(new Set(backgrounds).size, backgrounds.length);
});

import { themeFrom } from '../packages/diagram/src/themes.ts';
import { darkTheme } from '../packages/diagram/src/theme.ts';
test('themeFrom applies the accent to selection/edge/icon and keeps neutral surfaces from the base', () => {
  const t = themeFrom('#ff0000');
  assert.equal(t.selectedBorder, '#ff0000');
  assert.equal(t.edgeSelected, '#ff0000');
  assert.equal(t.icon, '#ff0000');
  assert.equal(t.nodeText, lightTheme.nodeText); // neutral text unchanged
  assert.equal(t.canvasBackground, lightTheme.canvasBackground);
  assert.match(t.selectedBackground, /^#[0-9a-f]{6}$/); // derived tint
});
test('themeFrom honours the dark base and expands #rgb shorthand', () => {
  const light = themeFrom('#0a0'), dark = themeFrom('#0a0', { dark: true });
  assert.equal(dark.nodeBackground, darkTheme.nodeBackground);
  assert.notEqual(light.selectedBackground, dark.selectedBackground); // tinted against different base
  assert.equal(light.icon, '#0a0'); // shorthand accepted as-is for the accent fields
});
test('themeFrom falls back to the default accent for invalid hex', () => {
  const t = themeFrom('not-a-color');
  assert.equal(t.selectedBorder, '#8474c1');
  assert.match(t.iconBackground, /^#[0-9a-f]{6}$/);
});
