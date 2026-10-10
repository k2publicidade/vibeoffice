// Verify the scoped YAML override used by Jest's Istanbul tooling.
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';

const require = createRequire(import.meta.url);
const { loadNycConfig } = require('@istanbuljs/load-nyc-config');
const toolingRequire = createRequire(require.resolve('@istanbuljs/load-nyc-config'));
assert.equal(toolingRequire('js-yaml/package.json').version, '4.3.2');
const root = resolve(tmpdir());
const directory = mkdtempSync(join(root, 'vibeoffice-coverage-audit-'));
assert.ok(resolve(directory).startsWith(root + sep));
try {
  writeFileSync(join(directory, 'package.json'), JSON.stringify({ nyc: { all: true } }));
  writeFileSync(join(directory, 'base.yaml'), 'exclude:\n  - dist/**\nreporter:\n  - text\n  - lcov\n');
  writeFileSync(join(directory, '.nycrc.yaml'), 'extends: ./base.yaml\ninclude:\n  - src/**/*.ts\ncheck-coverage: true\nbranches: 70\n');
  const yaml = await loadNycConfig({ cwd: directory });
  assert.equal(yaml.all, true);
  assert.deepEqual(yaml.include, ['src/**/*.ts']);
  assert.deepEqual(yaml.exclude, ['dist/**']);
  assert.deepEqual(yaml.reporter, ['text', 'lcov']);
  assert.equal(yaml.checkCoverage, true);
  assert.equal(yaml.branches, 70);
  writeFileSync(join(directory, 'coverage.json'), JSON.stringify({ include: ['src/**/*.tsx'], instrument: false }));
  const json = await loadNycConfig({ cwd: directory, nycrcPath: 'coverage.json' });
  assert.deepEqual(json.include, ['src/**/*.tsx']);
  assert.equal(json.instrument, false);
  console.log('PASS Istanbul configuration: YAML, inheritance, camelcase options and JSON');
} finally { rmSync(directory, { recursive: true, force: true }); }
