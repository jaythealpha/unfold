import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeModel, validateModel, verifiedShare, WARN_SHARE } from 'unfold/model.js';

const load = name => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url)));
const fields = r => r.errors.map(e => e.field).sort();

test('normalize fills defaults', () => {
  const m = normalizeModel({ product: { name: 'X', dims: { w: 1, l: 1, t: 1 } }, sources: [],
    parts: [{ id: 'a', name_en: 'A', name_ko: '가', bbox: [0, 0, 0, 1, 1, 1], step: 1 }],
    steps: [{ n: 1, title_en: 'S', title_ko: '스', parts: ['a'] }] });
  const p = m.parts[0];
  assert.equal(p.count, 1);
  assert.equal(p.name.ko, '가');
  assert.equal(p.name.en, 'A');
  assert.equal(p.shape.template, 'box');
  assert.equal(p.confidence, 'estimated');
  assert.equal(m.steps[0].path, 'drop');
  assert.equal(m.steps[0].title.ko, '스');
  assert.deepEqual(m.meta.limitations, []);
});

test('validate mini is clean', () => {
  const r = validateModel(normalizeModel(load('mini.json')));
  assert.deepEqual(r.errors, []);
});

test('broken refs', () => {
  const r = validateModel(normalizeModel(load('broken.json')));
  assert.deepEqual(fields(r), ['attachedTo', 'sourceIds', 'step', 'steps.parts']);
  for (const e of r.errors) assert.ok(e.part && e.msg, 'every error names the part and says why');
});

test('dims tolerance', () => {
  const m = normalizeModel(load('mini.json'));
  m.product.dims = { w: 71.2, l: 147, t: 7.6 };
  assert.ok(validateModel(m, { officialDims: { w: 70.6, l: 147, t: 7.6 } }).errors.some(e => e.field === 'product.dims'));
  m.product.dims = { w: 70.9, l: 147, t: 7.6 };
  assert.ok(!validateModel(m, { officialDims: { w: 70.6, l: 147, t: 7.6 } }).errors.some(e => e.field === 'product.dims'));
});

test('bbox outside product', () => {
  const m = normalizeModel(load('mini.json'));
  m.parts[1].bbox = [8, 92, 1.2, 70.6, 138, 2.4];
  assert.ok(validateModel(m).errors.some(e => e.field === 'bbox' && e.part === 'board'));
  m.parts[1].bbox = [8, 92, 1.2, 62, 138, 2.4];
  m.parts[3].bbox = [42, 118, 2.4, 60, 140, 9.5];   // a camera bump may stand proud of the back
  assert.ok(!validateModel(m).errors.some(e => e.field === 'bbox'));
});

test('verifiedShare + warn flag', () => {
  const m = normalizeModel(load('mini.json'));
  m.parts = [...m.parts, ...m.parts.slice(0, 2).map((p, i) => ({ ...p, id: p.id + i, confidence: 'estimated' }))];
  m.parts.forEach((p, i) => { p.confidence = i < 2 ? 'verified' : 'estimated'; });
  assert.equal(verifiedShare(m), 0.2);
  assert.ok(verifiedShare(m) < WARN_SHARE);
});

test('part count warning', () => {
  const r = validateModel(normalizeModel(load('mini.json')));
  assert.ok(r.warnings.some(w => /40–80/.test(w.msg)));
});

test('structure rules: steps, one base, fastening, key parts, dims', () => {
  const base = () => normalizeModel(load('mini.json'));
  let m = base(); m.steps = [{ ...m.steps[0], parts: m.parts.map(p => p.id) }]; m.parts.forEach(p => { p.step = 1; });
  assert.ok(validateModel(m).errors.some(e => e.field === 'steps'), 'one step is not enough');
  m = base(); m.parts[1].attachedTo = null;
  assert.ok(validateModel(m).errors.some(e => e.field === 'attachedTo' && /exactly one/.test(e.msg)), 'two bases');
  m = base(); m.parts[1].fastening = { type: 'glue' };
  assert.ok(validateModel(m).errors.some(e => e.field === 'fastening' && e.part === 'board'), 'unknown fastening');
  m = base(); m.parts[1].fastening = { type: 'screw+clip' };
  assert.ok(!validateModel(m).errors.some(e => e.field === 'fastening'), 'combined fastening is fine');
  m = base(); m.parts[2].fastening = null;
  assert.ok(validateModel(m).errors.some(e => e.field === 'fastening' && e.part === 'battery'), 'missing fastening');
  m = base(); m.parts.forEach(p => { p.key = false; });
  assert.ok(validateModel(m).errors.some(e => e.field === 'key'), 'no key parts');
  m = base(); delete m.product.dims;
  assert.deepEqual(validateModel(m).errors.map(e => e.field), ['product.dims']);
});

test('access and bumps', () => {
  const m = normalizeModel(load('mini.json'));
  m.product.access = 'sideways';
  assert.ok(validateModel(m).errors.some(e => e.field === 'product.access'));
  m.product.access = 'front'; m.parts[3].bbox = [42, 118, -4, 60, 140, 2.4];
  assert.ok(!validateModel(m).errors.some(e => e.field === 'bbox'), 'a camera bump may stand out below the body');
  m.parts[3].bbox = [42, 118, -7, 60, 140, 2.4];
  assert.ok(validateModel(m).errors.some(e => e.field === 'bbox' && e.part === 'camera'));
});
