import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const run = (...args) => spawnSync(process.execPath, ['scripts/check_model.mjs', ...args], { cwd: root, encoding: 'utf8' });

test('check_model passes mini', () => {
  const r = run('tests/fixtures/mini.json');
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /GATE1 PASS errors=0 warnings=\d+ verified=38%/);
});

test('check_model fails broken with named fields', () => {
  const r = run('tests/fixtures/broken.json');
  assert.equal(r.status, 1);
  for (const f of ['attachedTo', 'steps.parts', 'step', 'sourceIds']) assert.match(r.stdout, new RegExp(`\\b${f.replace('.', '\\.')}\\b`));
  assert.match(r.stdout, /GATE1 FAIL errors=4/);
});

test('collision detected', () => {
  const r = run('tests/fixtures/collide.json');
  assert.equal(r.status, 1);
  assert.match(r.stdout, /collision.*(plate2.*battery|battery.*plate2)/);
});

test('official dims are checked', () => {
  const r = run('tests/fixtures/mini.json', '--official', '70,146,9');
  assert.equal(r.status, 1);
  assert.match(r.stdout, /product\.dims/);
});

test('json output', () => {
  const r = run('tests/fixtures/mini.json', '--json');
  const j = JSON.parse(r.stdout);
  assert.equal(j.pass, true);
  assert.equal(j.verifiedShare, 0.375);
});

test('bad input fails cleanly instead of crashing', () => {
  const r = run('tests/fixtures/mini.json', '--official', '70,146');
  assert.equal(r.status, 1); assert.match(r.stdout, /GATE1 FAIL .*\n.*--official/s);
  const r2 = run('tests/fixtures/no-dims.json');
  assert.equal(r2.status, 1); assert.match(r2.stdout, /product\.dims/); assert.doesNotMatch(r2.stderr, /TypeError/);
});

test('folded collision detected', () => {
  const r = run('tests/fixtures/fold-collide.json');
  assert.equal(r.status, 1);
  assert.match(r.stdout, /fold: shut, bump-b \(half B\) runs into bump-a/);
});

test('folded dims checked', () => {
  assert.equal(run('tests/fixtures/fold-mini.json', '--official-folded', '72,150,12.4').status, 0);
  const r = run('tests/fixtures/fold-mini.json', '--official-folded', '75,150,12.4');
  assert.equal(r.status, 1);
  assert.match(r.stdout, /product\.foldedDims: folded w = 72\.\d\d mm, official 75 mm/);
});
