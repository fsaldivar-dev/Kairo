import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contrastRatio, auditTheme } from '../packages/diagram/src/themes.ts';
import { lightTheme } from '../packages/diagram/src/theme.ts';
import { highContrast } from '../packages/diagram/src/themes.ts';

test('contrastRatio matches WCAG anchors', () => {
  assert.equal(contrastRatio('#000000', '#ffffff'), 21);
  assert.equal(contrastRatio('#fff', '#fff'), 1);
  assert.equal(contrastRatio('#ffffff', '#000000'), 21); // symmetric
});
test('auditTheme reports five pairs with correct thresholds and graphical flags', () => {
  const a = auditTheme(lightTheme);
  assert.equal(a.pairs.length, 5);
  const text = a.pairs.filter(p => !p.graphical), gfx = a.pairs.filter(p => p.graphical);
  assert.ok(text.every(p => p.threshold === 4.5));
  assert.ok(gfx.every(p => p.threshold === 3));
  assert.equal(a.minRatio, Math.min(...a.pairs.map(p => p.ratio)));
});
test('highContrast passes the full audit; lightTheme title passes but its soft borders do not', () => {
  const hc = auditTheme(highContrast);
  assert.equal(hc.passes, true);
  assert.ok(hc.minRatio >= 3);
  const light = auditTheme(lightTheme);
  assert.equal(light.pairs.find(p => p.name.startsWith('título'))!.pass, true); // labels are readable
  assert.equal(light.passes, false); // muted secondary text / subtle borders flagged
});
test('a theme with unreadable text fails and pass flags track the threshold', () => {
  const bad = { ...lightTheme, nodeText: '#cccccc', nodeBackground: '#ffffff' };
  const pair = auditTheme(bad).pairs.find(p => p.name.startsWith('título'))!;
  assert.ok(pair.ratio < 4.5);
  assert.equal(pair.pass, false);
});

import { themeToCss } from '../packages/diagram/src/themes.ts';
import { lightTheme as lt2 } from '../packages/diagram/src/theme.ts';
test('themeToCss emits --cd-* custom properties with a :root selector by default', () => {
  const css = themeToCss(lt2);
  assert.ok(css.startsWith(':root {'));
  assert.match(css, /--cd-node-background: #ffffff;/);
  assert.match(css, /--cd-node-secondary-text: /); // camelCase -> kebab
  assert.match(css, /--cd-radius: 12px;/); // number -> px
  assert.match(css, /--cd-border-width: 1px;/);
  assert.ok(css.trimEnd().endsWith('}'));
});
test('themeToCss honours a custom selector', () => {
  assert.ok(themeToCss(lt2, { selector: '.kairo-dark' }).startsWith('.kairo-dark {'));
});
