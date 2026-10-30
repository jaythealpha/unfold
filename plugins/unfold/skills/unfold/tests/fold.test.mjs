import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeModel, validateModel } from 'unfold/model.js';
import { foldInfo, halfOf, bendPoint, mapPoint, foldedOutline, bAffine } from 'unfold/fold.js';

const fm = () => normalizeModel(JSON.parse(readFileSync(new URL('./fixtures/fold-mini.json', import.meta.url))));
const close = (a, b, eps = 1e-6) => a.every((v, i) => Math.abs(v - b[i]) < eps);

test('open is identity', () => {
  const fi = foldInfo(fm());
  for (const [u, z] of [[10, 0], [70, 2], [69, 4], [130, 5]]) assert.ok(close(bendPoint(fi, u, z, 0), [u, z]));
});

test('closed mirrors B about the fold line, gap apart', () => {
  const m = fm(), fi = foldInfo(m);
  for (const [d, z] of [[0, 0], [10, 2], [60, 5]]) assert.ok(close(mapPoint(fi, 'b', [fi.at + d, 30, z], 180), [fi.at - d, 30, -fi.gap - z]));
  // the screen wraps round the axis, then rides with B, slid back by the wrapped length
  assert.ok(close(bendPoint(fi, fi.at + 10, 0, 180), [fi.at - 10 + Math.PI * fi.r, -fi.gap]));
});

test('bend is continuous', () => {
  const fi = foldInfo(fm()), e = 1e-7;
  for (const th of [30, 90, 150]) for (const z of [0, 3]) {
    const w = fi.at + fi.r * th * Math.PI / 180;
    assert.ok(close(bendPoint(fi, fi.at - e, z, th), bendPoint(fi, fi.at + e, z, th), 1e-5));
    assert.ok(close(bendPoint(fi, w - e, z, th), bendPoint(fi, w + e, z, th), 1e-5));
  }
});

test('B moves rigidly and matches the bend at its edge', () => {
  const m = fm(), fi = foldInfo(m), M = bAffine(fi, 120);
  const app = p => [0, 1, 2].map(r => M[r][0] * p[0] + M[r][1] * p[1] + M[r][2] * p[2] + M[r][3]);
  for (const p of [[100, 30, 2], [fi.at, 10, 0], [139, 149, 5]]) assert.ok(close(app(p), mapPoint(fi, 'b', p, 120), 1e-6));
});

test('asymmetric fold', () => {
  const m = fm(); m.product.fold.at = 60;
  const fi = foldInfo(m), o = foldedOutline(m, 180);
  // the screen (0..0.8 thick) wraps round the axis at radius z + gap/2; the spine allowance covers it here
  // (frame-a still reaches x = 68, past the moved fold line, and stays where it is)
  const expectMax = Math.max(68, 60 + Math.max(fi.spine, 0.8 + fi.r)), expectMin = 2 * 60 - m.product.dims.w;
  assert.ok(Math.abs(o.w - (expectMax - expectMin)) < 0.05, `folded width ${o.w}`);
  assert.ok(Math.abs(o.t - (2 * m.product.dims.t + fi.gap)) < 0.05, `folded thickness ${o.t}`);
});

test('half derived from the fold line', () => {
  const m = fm(), fi = foldInfo(m);
  assert.equal(halfOf(m, { bbox: [5, 5, 1, 30, 30, 2] }, fi), 'a');
  assert.equal(halfOf(m, { bbox: [90, 5, 1, 120, 30, 2] }, fi), 'b');
  assert.equal(halfOf(m, { bbox: [60, 5, 1, 80, 30, 2] }, fi), 'hinge');
  assert.equal(halfOf(m, { bbox: [90, 5, 1, 120, 30, 2], half: 'a' }, fi), 'a', 'an explicit half wins');
  m.product.fold.b = '-';
  assert.equal(halfOf(m, { bbox: [5, 5, 1, 30, 30, 2] }, foldInfo(m)), 'b', 'B can be the low side');
});

test('fold fixture validates', () => {
  const r = validateModel(fm(), { officialDims: { w: 140, l: 150, t: 5 } });
  assert.deepEqual(r.errors, []);
});
