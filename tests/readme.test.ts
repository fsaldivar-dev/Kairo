import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../packages/diagram/package.json', import.meta.url), 'utf8')) as { name: string; exports: Record<string, unknown> };
const readme = readFileSync(new URL('../packages/diagram/README.md', import.meta.url), 'utf8');

test('the package README documents every public entry point from package.json exports', () => {
  for (const key of Object.keys(pkg.exports)) {
    if (key.endsWith('.css')) continue; // style subpaths mentioned as style.css
    const subpath = key === '.' ? pkg.name : `${pkg.name}${key.slice(1)}`; // '@fsaldivar.dev/diagram' or '@fsaldivar.dev/diagram/io'
    assert.ok(readme.includes(subpath), `README is missing a mention of ${subpath}`);
  }
});
test('the README has install and quick-start sections', () => {
  assert.match(readme, /npm install @fsaldivar\.dev\/diagram/);
  assert.ok(readme.includes('createDiagram') && readme.includes('style.css'));
});
